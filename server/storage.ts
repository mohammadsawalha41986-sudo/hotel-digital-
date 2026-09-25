import fs from 'node:fs/promises';
import path from 'node:path';
import { AwsClient } from 'aws4fetch';
import { config } from './config';
import { log } from './log';

/**
 * Media object storage. Keys look like `<hotelId>/<file>` and are always
 * served by the API at `/media/<key>`, so stored URLs never depend on where
 * the bytes live.
 *
 *  - `local` (default): files under UPLOAD_DIR. Single instance only (or a
 *    shared volume); fine for development and tests.
 *  - `s3`: any S3-compatible bucket (Railway Buckets, R2, S3). Required for
 *    more than one API replica, because every replica must see every file.
 *
 * The S3 driver is selected when STORAGE_DRIVER=s3, or automatically when a
 * bucket is configured (BUCKET + ENDPOINT, as Railway provides them).
 */
export interface StoredObject {
  body: Buffer;
  contentType: string;
}

export interface ObjectStorage {
  readonly driver: 'local' | 's3';
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  remove(keys: string[]): Promise<void>;
  /** Cheap connectivity probe for readiness checks. */
  ping(): Promise<void>;
}

const SAFE_KEY = /^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,120}$/;
export const isSafeKey = (key: string) => SAFE_KEY.test(key) && !key.includes('..');

const TYPES: Record<string, string> = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
  pdf: 'application/pdf',
};
export const typeOf = (key: string) => TYPES[key.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';

class LocalStorage implements ObjectStorage {
  readonly driver = 'local' as const;
  constructor(private root: string) {}
  private file(key: string) {
    if (!isSafeKey(key)) throw new Error('unsafe storage key');
    return path.join(this.root, key);
  }
  async put(key: string, body: Buffer) {
    const f = this.file(key);
    await fs.mkdir(path.dirname(f), { recursive: true });
    await fs.writeFile(f, body, { flag: 'wx' });
  }
  async get(key: string) {
    if (!isSafeKey(key)) return null;
    try {
      return { body: await fs.readFile(this.file(key)), contentType: typeOf(key) };
    } catch {
      return null;
    }
  }
  async remove(keys: string[]) {
    await Promise.all(keys.filter(isSafeKey).map((k) => fs.rm(this.file(k), { force: true })));
  }
  async ping() {
    await fs.mkdir(this.root, { recursive: true });
  }
}

class S3Storage implements ObjectStorage {
  readonly driver = 's3' as const;
  private client: AwsClient;
  constructor(
    private endpoint: string,
    private bucket: string,
    accessKeyId: string,
    secretAccessKey: string,
    region: string,
    private pathStyle: boolean
  ) {
    this.client = new AwsClient({ accessKeyId, secretAccessKey, region, service: 's3', retries: 2 });
  }
  private url(key = '') {
    const base = new URL(this.endpoint);
    if (this.pathStyle) return `${base.origin}/${this.bucket}/${key}`;
    return `${base.protocol}//${this.bucket}.${base.host}/${key}`;
  }
  private async send(method: string, key: string, init: RequestInit = {}) {
    return this.client.fetch(this.url(key), { method, ...init, signal: AbortSignal.timeout(15_000) });
  }
  async put(key: string, body: Buffer, contentType: string) {
    if (!isSafeKey(key)) throw new Error('unsafe storage key');
    const r = await this.send('PUT', key, { body: new Uint8Array(body), headers: { 'content-type': contentType, 'cache-control': 'public, max-age=31536000, immutable' } });
    if (!r.ok) throw new Error(`storage put failed: ${r.status}`);
  }
  async get(key: string) {
    if (!isSafeKey(key)) return null;
    const r = await this.send('GET', key);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`storage get failed: ${r.status}`);
    return { body: Buffer.from(await r.arrayBuffer()), contentType: r.headers.get('content-type') || typeOf(key) };
  }
  async remove(keys: string[]) {
    await Promise.all(
      keys.filter(isSafeKey).map(async (k) => {
        const r = await this.send('DELETE', k);
        if (!r.ok && r.status !== 404) log.warn('storage.delete_failed', { status: r.status });
      })
    );
  }
  async ping() {
    const r = await this.send('GET', '?list-type=2&max-keys=1').catch((e) => {
      throw new Error(`storage unreachable: ${(e as Error).message}`);
    });
    // Listing needs no object; 200 means the credentials and bucket are valid.
    if (!r.ok) throw new Error(`storage ping failed: ${r.status}`);
    await r.arrayBuffer();
  }
}

export function createStorage(env: NodeJS.ProcessEnv = process.env): ObjectStorage {
  const bucket = env.S3_BUCKET ?? env.BUCKET;
  const endpoint = env.S3_ENDPOINT ?? env.ENDPOINT;
  const wantS3 = env.STORAGE_DRIVER === 's3' || (env.STORAGE_DRIVER !== 'local' && !!bucket && !!endpoint);
  if (!wantS3) return new LocalStorage(config.uploadDir);
  const key = env.S3_ACCESS_KEY_ID ?? env.ACCESS_KEY_ID;
  const secret = env.S3_SECRET_ACCESS_KEY ?? env.SECRET_ACCESS_KEY;
  if (!bucket || !endpoint || !key || !secret) throw new Error('STORAGE_DRIVER=s3 needs BUCKET, ENDPOINT, ACCESS_KEY_ID and SECRET_ACCESS_KEY');
  return new S3Storage(endpoint, bucket, key, secret, env.S3_REGION ?? env.REGION ?? 'auto', env.S3_PATH_STYLE === '1');
}

export const storage: ObjectStorage = createStorage();

/**
 * Small in-process LRU of hot media so repeated guest page loads do not refetch
 * the same thumbnails from the bucket. Objects are immutable (content-unique
 * names), so a cached copy can never be stale — only evicted.
 */
const LRU_BYTES = Number(process.env.MEDIA_CACHE_MB ?? 64) * 1024 * 1024;
const lru = new Map<string, StoredObject>();
let lruSize = 0;

export async function readMedia(key: string): Promise<StoredObject | null> {
  const hit = lru.get(key);
  if (hit) {
    lru.delete(key);
    lru.set(key, hit);
    return hit;
  }
  const obj = await storage.get(key);
  if (obj && obj.body.length <= LRU_BYTES / 16) {
    lru.set(key, obj);
    lruSize += obj.body.length;
    for (const [k, v] of lru) {
      if (lruSize <= LRU_BYTES) break;
      lru.delete(k);
      lruSize -= v.body.length;
    }
  }
  return obj;
}

export function forgetMedia(keys: string[]) {
  for (const k of keys) {
    const v = lru.get(k);
    if (v) {
      lru.delete(k);
      lruSize -= v.body.length;
    }
  }
}
