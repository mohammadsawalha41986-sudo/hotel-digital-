import { q } from '../../db';
import { log } from '../../log';
import { isBlank, text } from './cells';
import { FetchError, safeFetch } from '../net';
import type { ColumnDef, ParsedSheet, RowMessage } from './types';

const MAX_CHECKS = 200;
const CONCURRENCY = 8;
const TIMEOUT_MS = 5000;

type Outcome = { ok: true; contentType: string } | { ok: false; reason: string };

/** Staff-readable reason for a failed probe (no socket error codes). */
function reasonOf(e: unknown): string {
  if (!(e instanceof FetchError)) return 'unreachable';
  if (e.code === 'blocked_address') return 'private or local address';
  if (e.code === 'timeout') return 'no answer within 5 seconds';
  if (e.code === 'http_error') return e.status ? `the website answered ${e.status}` : e.message;
  if (e.code === 'invalid_url') return e.message;
  if (/ENOTFOUND|EAI_AGAIN/.test(e.message)) return 'website not found';
  if (/ECONNREFUSED|ECONNRESET|EHOSTUNREACH/.test(e.message)) return 'the website refused the connection';
  if (/certificate|SSL|TLS/i.test(e.message)) return 'the website has an invalid security certificate';
  return 'unreachable';
}

async function probe(url: string): Promise<Outcome> {
  try {
    const head = await safeFetch(url, { method: 'HEAD', timeoutMs: TIMEOUT_MS, maxBytes: 200 * 1024 * 1024 });
    return { ok: true, contentType: head.contentType };
  } catch (e) {
    // Some servers refuse HEAD; confirm with a small GET before calling the link broken.
    if (e instanceof FetchError && e.code === 'http_error' && [403, 405, 501].includes(e.status ?? 0)) {
      try {
        const got = await safeFetch(url, { timeoutMs: TIMEOUT_MS, maxBytes: 15 * 1024 * 1024 });
        return { ok: true, contentType: got.contentType };
      } catch (e2) {
        if (e2 instanceof FetchError && e2.code === 'too_large') return { ok: true, contentType: '' };
        return { ok: false, reason: reasonOf(e2) };
      }
    }
    return { ok: false, reason: reasonOf(e) };
  }
}

/**
 * Image validation stage of the preview: links to this hotel's media library
 * must exist; external links are probed (SSRF-safe) for reachability and
 * type. Problems are warnings — a broken optional image never blocks content.
 */
export async function checkImages(hotelId: string, sheets: ParsedSheet[], columns: Map<string, ColumnDef[]>): Promise<{ byRow: Map<string, RowMessage[]>; notice?: string }> {
  const byRow = new Map<string, RowMessage[]>();
  const uses: { key: string; column: string; url: string; kind: 'image' | 'video' }[] = [];
  for (const s of sheets) {
    const media = (columns.get(s.template) ?? []).filter((c) => c.media);
    for (const r of s.rows) {
      for (const c of media) {
        if (isBlank(r.values[c.key])) continue;
        const urls = c.media === 'gallery' ? text(r.values[c.key]).split(/[|\n]/).map((u) => u.trim()).filter(Boolean) : [text(r.values[c.key])];
        for (const url of urls) uses.push({ key: `${s.template}|${r.row}`, column: c.key, url, kind: c.media === 'video' ? 'video' : 'image' });
      }
    }
  }
  if (!uses.length) return { byRow };
  const add = (key: string, m: RowMessage) => byRow.set(key, [...(byRow.get(key) ?? []), m]);

  const local = [...new Set(uses.filter((u) => u.url.startsWith('/media/')).map((u) => u.url))];
  if (local.length) {
    const found = new Set((await q<{ url: string }>('SELECT url FROM media WHERE hotel_id = $1 AND url = ANY($2::text[])', [hotelId, local])).map((r) => r.url));
    for (const u of uses) if (u.url.startsWith('/media/') && !found.has(u.url)) add(u.key, { level: 'warning', column: u.column, message: `${u.url} is not in this hotel's media library` });
  }

  const external = [...new Set(uses.filter((u) => /^https?:\/\//i.test(u.url)).map((u) => u.url))];
  const toCheck = external.slice(0, MAX_CHECKS);
  const results = new Map<string, Outcome>();
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, toCheck.length) }, async () => {
      while (next < toCheck.length) {
        const url = toCheck[next++];
        results.set(url, await probe(url));
      }
    })
  );
  const broken = [...results.values()].filter((r) => !r.ok).length;
  if (broken) log.info('import_image_check', { hotelId, checked: results.size, broken });
  for (const u of uses) {
    const res = results.get(u.url);
    if (!res) continue;
    if (!res.ok) add(u.key, { level: 'warning', column: u.column, message: `Could not load ${u.url.slice(0, 90)} (${res.reason}). The row is still imported — fix the link or upload the image later.` });
    else if (u.kind === 'image' && res.contentType && !/^image\//i.test(res.contentType)) add(u.key, { level: 'warning', column: u.column, message: `${u.url.slice(0, 90)} is not an image (${res.contentType.split(';')[0]})` });
  }
  return { byRow, notice: external.length > MAX_CHECKS ? `Only the first ${MAX_CHECKS} image links were checked` : undefined };
}
