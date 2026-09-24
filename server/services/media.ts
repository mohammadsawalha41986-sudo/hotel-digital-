import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config';
import { one } from '../db';
import { HttpError } from '../errors';

/** Detects type from file content (magic bytes) — never trust the client's declared type. */
export function sniff(buf: Buffer): { mime: string; ext: string; kind: 'image' | 'video' | 'file' } | null {
  const hex = buf.subarray(0, 16).toString('hex');
  if (hex.startsWith('ffd8ff')) return { mime: 'image/jpeg', ext: 'jpg', kind: 'image' };
  if (hex.startsWith('89504e470d0a1a0a')) return { mime: 'image/png', ext: 'png', kind: 'image' };
  if (hex.startsWith('47494638')) return { mime: 'image/gif', ext: 'gif', kind: 'image' };
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return { mime: 'image/webp', ext: 'webp', kind: 'image' };
  if (buf.subarray(4, 12).toString() === 'ftypavif') return { mime: 'image/avif', ext: 'avif', kind: 'image' };
  if (buf.subarray(4, 8).toString() === 'ftyp') return { mime: 'video/mp4', ext: 'mp4', kind: 'video' };
  if (hex.startsWith('1a45dfa3')) return { mime: 'video/webm', ext: 'webm', kind: 'video' };
  if (hex.startsWith('25504446')) return { mime: 'application/pdf', ext: 'pdf', kind: 'file' };
  return null; // SVG deliberately rejected: it can carry script.
}

export interface StoredMedia {
  id: string;
  url: string;
  kind: string;
  mime: string;
  size_bytes: number;
  filename: string;
}

export async function storeUpload(
  hotelId: string,
  file: File,
  opts: { maxBytes: number; allow: ('image' | 'video' | 'file')[]; source: 'upload' | 'guest_upload'; userId?: string | null; label?: string }
): Promise<StoredMedia> {
  if (file.size === 0) throw new HttpError(422, 'validation_failed', 'The file is empty');
  if (file.size > opts.maxBytes) throw new HttpError(413, 'too_large', `File is too large (max ${Math.round(opts.maxBytes / 1024 / 1024)} MB)`);
  const buf = Buffer.from(await file.arrayBuffer());
  const t = sniff(buf);
  if (!t || !opts.allow.includes(t.kind)) {
    throw new HttpError(415, 'unsupported_type', `Unsupported file type. Allowed: ${opts.allow.includes('video') ? 'JPG, PNG, WEBP, AVIF, GIF, MP4, WEBM' : 'JPG, PNG, WEBP, AVIF, GIF'}${opts.allow.includes('file') ? ', PDF' : ''}`);
  }
  const name = `${crypto.randomUUID()}.${t.ext}`;
  const dir = path.join(config.uploadDir, hotelId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buf, { flag: 'wx' });
  const url = `/media/${hotelId}/${name}`;
  const row = await one<StoredMedia>(
    `INSERT INTO media (hotel_id, url, kind, source, mime, size_bytes, filename, label, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, url, kind, mime, size_bytes, filename`,
    [hotelId, url, t.kind, opts.source, t.mime, file.size, file.name.slice(0, 200), (opts.label ?? '').slice(0, 200), opts.userId ?? null]
  );
  return row!;
}

export async function removeStoredFile(url: string) {
  const m = /^\/media\/([0-9a-f-]{36})\/([0-9a-f-]{36}\.[a-z0-9]+)$/.exec(url);
  if (!m) return;
  await fs.rm(path.join(config.uploadDir, m[1], m[2]), { force: true });
}
