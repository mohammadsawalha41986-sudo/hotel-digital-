import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

/**
 * Server-side fetching of staff-supplied URLs (logo analysis, import image
 * checks) without SSRF exposure:
 *  - http(s) only, default ports only
 *  - every resolved address is checked at connect time (no DNS-rebinding
 *    window): loopback, private, link-local (incl. cloud metadata), CGNAT,
 *    multicast and unique-local IPv6 are refused
 *  - redirects are followed manually (max 3) and re-validated
 *  - size and time limits
 */
export class FetchError extends Error {
  constructor(
    public code: 'invalid_url' | 'blocked_address' | 'timeout' | 'too_large' | 'http_error' | 'network',
    message: string,
    public status?: number
  ) {
    super(message);
  }
}

function blockedV4(ip: string) {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

export function isBlockedAddress(ip: string): boolean {
  if (process.env.ALLOW_PRIVATE_FETCH === '1') return false; // local test servers only
  if (net.isIPv4(ip)) return blockedV4(ip);
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return blockedV4(v.slice(7));
  return v === '::' || v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('ff');
}

const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, '', 0);
    const list = addresses as dns.LookupAddress[];
    const bad = list.find((a) => isBlockedAddress(a.address));
    if (bad || !list.length) return callback(Object.assign(new Error('blocked address'), { code: 'EBLOCKED' }), '', 0);
    if ((options as dns.LookupOptions).all) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

export interface FetchedResource {
  status: number;
  contentType: string;
  body: Buffer;
  finalUrl: string;
}

export async function safeFetch(rawUrl: string, opts: { maxBytes?: number; timeoutMs?: number; method?: 'GET' | 'HEAD' } = {}): Promise<FetchedResource> {
  const maxBytes = opts.maxBytes ?? 8 * 1024 * 1024;
  const timeoutMs = opts.timeoutMs ?? 8000;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new FetchError('invalid_url', 'Not a valid URL');
  }
  for (let hop = 0; hop < 4; hop++) {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new FetchError('invalid_url', 'Only http and https URLs are allowed');
    if (url.port && !['80', '443'].includes(url.port) && process.env.ALLOW_PRIVATE_FETCH !== '1') throw new FetchError('invalid_url', 'Only standard ports are allowed');
    if (url.username || url.password) throw new FetchError('invalid_url', 'URLs with credentials are not allowed');
    if (net.isIP(url.hostname.replace(/^\[|\]$/g, '')) && isBlockedAddress(url.hostname.replace(/^\[|\]$/g, ''))) throw new FetchError('blocked_address', 'This address is not reachable from the server');
    const res = await request(url, opts.method ?? 'GET', maxBytes, timeoutMs);
    if (res.status >= 300 && res.status < 400 && res.location) {
      url = new URL(res.location, url);
      continue;
    }
    if (res.status >= 400) throw new FetchError('http_error', `The server answered ${res.status}`, res.status);
    return { status: res.status, contentType: res.contentType, body: res.body, finalUrl: url.toString() };
  }
  throw new FetchError('http_error', 'Too many redirects');
}

function request(url: URL, method: string, maxBytes: number, timeoutMs: number): Promise<{ status: number; contentType: string; body: Buffer; location?: string }> {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(url, { method, lookup: safeLookup, timeout: timeoutMs, headers: { 'user-agent': 'GuestHub/1.0 (+media check)', accept: 'image/*,*/*;q=0.5' } }, (res) => {
      const status = res.statusCode ?? 0;
      const contentType = String(res.headers['content-type'] ?? '');
      const declared = Number(res.headers['content-length'] ?? 0);
      if (declared > maxBytes) {
        req.destroy();
        return reject(new FetchError('too_large', `File is larger than ${Math.round(maxBytes / 1024 / 1024)} MB`));
      }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on('data', (c: Buffer) => {
        size += c.length;
        if (size > maxBytes) {
          req.destroy();
          reject(new FetchError('too_large', `File is larger than ${Math.round(maxBytes / 1024 / 1024)} MB`));
        } else chunks.push(c);
      });
      res.on('end', () => resolve({ status, contentType, body: Buffer.concat(chunks), location: res.headers.location }));
      res.on('error', (e) => reject(new FetchError('network', e.message)));
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new FetchError('timeout', 'The server did not answer in time'));
    });
    req.on('error', (e: NodeJS.ErrnoException) => {
      if (e instanceof FetchError) return reject(e);
      reject(e.code === 'EBLOCKED' ? new FetchError('blocked_address', 'This address is not reachable from the server') : new FetchError('network', e.message));
    });
    req.end();
  });
}
