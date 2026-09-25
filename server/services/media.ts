import crypto from 'node:crypto';
import sharp, { type Metadata, type OutputInfo } from 'sharp';
import { checkImage } from '../../shared/mediaSpecs';
import { one } from '../db';
import { HttpError } from '../errors';
import { forgetMedia, storage } from '../storage';

export type MediaKind = 'image' | 'video' | 'file' | 'svg';

/** Detects type from file content (magic bytes) — never trust the client's declared type. */
export function sniff(buf: Buffer): { mime: string; ext: string; kind: MediaKind } | null {
  const hex = buf.subarray(0, 16).toString('hex');
  if (hex.startsWith('ffd8ff')) return { mime: 'image/jpeg', ext: 'jpg', kind: 'image' };
  if (hex.startsWith('89504e470d0a1a0a')) return { mime: 'image/png', ext: 'png', kind: 'image' };
  if (hex.startsWith('47494638')) return { mime: 'image/gif', ext: 'gif', kind: 'image' };
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return { mime: 'image/webp', ext: 'webp', kind: 'image' };
  if (buf.subarray(4, 12).toString() === 'ftypavif') return { mime: 'image/avif', ext: 'avif', kind: 'image' };
  if (buf.subarray(4, 8).toString() === 'ftyp') return { mime: 'video/mp4', ext: 'mp4', kind: 'video' };
  if (hex.startsWith('1a45dfa3')) return { mime: 'video/webm', ext: 'webm', kind: 'video' };
  if (hex.startsWith('25504446')) return { mime: 'application/pdf', ext: 'pdf', kind: 'file' };
  const head = buf.subarray(0, 2048).toString('utf8').replace(/^﻿/, '').trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(head)) return { mime: 'image/svg+xml', ext: 'svg', kind: 'svg' };
  return null;
}

/**
 * SVG is accepted for logos only, and only when it contains nothing that can
 * execute or load external content. Served with a sandboxing CSP as well.
 */
export function assertSafeSvg(buf: Buffer) {
  const text = buf.toString('utf8');
  const bad = [
    /<script/i,
    /<foreignObject/i,
    /<iframe|<embed|<object/i,
    /\son[a-z]+\s*=/i,
    /javascript:/i,
    /<!ENTITY/i,
    /(?:xlink:)?href\s*=\s*["']\s*(?!#|data:image\/(png|jpeg|webp|gif);base64,)/i,
    /@import/i,
    /url\(\s*["']?\s*(?!#|data:)/i,
  ].find((re) => re.test(text));
  if (bad) throw new HttpError(422, 'unsafe_svg', 'This SVG contains scripts or external references. Export it again as a plain SVG, or upload a PNG/WebP.');
}

export interface StoredMedia {
  id: string;
  url: string;
  kind: string;
  mime: string;
  size_bytes: number;
  filename: string;
  width: number | null;
  height: number | null;
  variants: Record<string, string>;
  warnings: { en: string; ar: string }[];
}

/** Longest edge kept for the optimised original; responsive widths generated below it. */
const MAX_EDGE = 2400;
export const VARIANT_WIDTHS = [400, 800, 1600] as const;

/**
 * Stores an upload. Raster images are auto-rotated, stripped of metadata,
 * re-encoded as WebP (max 2400 px) and get 400/800/1600 px WebP variants
 * named `<id>-<w>.webp` next to `<id>-o.webp`, so the guest site can build a
 * srcset from the URL alone. Dimensions are recorded; images far from the
 * recommended size produce warnings (never a rejection).
 */
export async function storeUpload(
  hotelId: string,
  file: File,
  opts: { maxBytes: number; allow: MediaKind[]; source: 'upload' | 'guest_upload'; userId?: string | null; label?: string; spec?: string }
): Promise<StoredMedia> {
  if (file.size === 0) throw new HttpError(422, 'validation_failed', 'The file is empty');
  if (file.size > opts.maxBytes) throw new HttpError(413, 'too_large', `File is too large (max ${Math.round(opts.maxBytes / 1024 / 1024)} MB)`);
  const buf = Buffer.from(await file.arrayBuffer());
  const t = sniff(buf);
  if (!t || !opts.allow.includes(t.kind)) {
    const allowed = [opts.allow.includes('image') && 'JPG, PNG, WEBP, AVIF, GIF', opts.allow.includes('svg') && 'SVG', opts.allow.includes('video') && 'MP4, WEBM', opts.allow.includes('file') && 'PDF'].filter(Boolean).join(', ');
    throw new HttpError(415, 'unsupported_type', `Unsupported file type. Allowed: ${allowed}`);
  }
  const id = crypto.randomUUID();
  const put = (file: string, body: Buffer, type: string) => storage.put(`${hotelId}/${file}`, body, type);
  let name = `${id}.${t.ext}`;
  let mime = t.mime;
  let size = buf.length;
  let width: number | null = null;
  let height: number | null = null;
  const variants: Record<string, string> = {};
  let warnings: StoredMedia['warnings'] = [];

  if (t.kind === 'svg') {
    assertSafeSvg(buf);
    await put(name, buf, t.mime);
  } else if (t.kind === 'image' && t.mime !== 'image/gif') {
    let meta: Metadata;
    try {
      meta = await sharp(buf, { failOn: 'error' }).metadata();
    } catch {
      throw new HttpError(422, 'invalid_image', 'This image file is damaged or could not be read');
    }
    // Dimensions after EXIF rotation (portrait phone photos report swapped sizes).
    const rotated = (meta.orientation ?? 1) >= 5;
    const srcW = (rotated ? meta.height : meta.width) ?? 0;
    const srcH = (rotated ? meta.width : meta.height) ?? 0;
    warnings = checkImage(opts.spec, srcW, srcH).warnings;
    name = `${id}-o.webp`;
    let main: { data: Buffer; info: OutputInfo };
    const encoded: Buffer[] = [];
    try {
      main = await sharp(buf).rotate().resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
      // Every width exists so a srcset never points at a missing file; small sources are not upscaled.
      for (const w of VARIANT_WIDTHS) encoded.push(await sharp(buf).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer());
    } catch {
      throw new HttpError(422, 'invalid_image', 'This image file is damaged or could not be read');
    }
    await put(name, main.data, 'image/webp');
    mime = 'image/webp';
    size = main.data.length;
    width = main.info.width;
    height = main.info.height;
    for (const [i, w] of VARIANT_WIDTHS.entries()) {
      await put(`${id}-${w}.webp`, encoded[i], 'image/webp');
      variants[String(w)] = `/media/${hotelId}/${id}-${w}.webp`;
    }
  } else {
    if (t.kind === 'image') {
      const meta = await sharp(buf, { animated: true }).metadata().catch(() => null);
      width = meta?.width ?? null;
      height = meta?.pageHeight ?? meta?.height ?? null;
      if (width && height) warnings = checkImage(opts.spec, width, height).warnings;
    }
    await put(name, buf, t.mime);
  }

  const url = `/media/${hotelId}/${name}`;
  const row = await one<Omit<StoredMedia, 'warnings'>>(
    `INSERT INTO media (hotel_id, url, kind, source, mime, size_bytes, filename, label, created_by, width, height, variants)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id, url, kind, mime, size_bytes, filename, width, height, variants`,
    [hotelId, url, t.kind === 'svg' ? 'image' : t.kind, opts.source, mime, size, file.name.slice(0, 200), (opts.label ?? '').slice(0, 200), opts.userId ?? null, width, height, JSON.stringify(variants)]
  );
  return { ...row!, warnings };
}

/** Removes a stored file and its responsive variants. */
export async function removeStoredFile(url: string) {
  const m = /^\/media\/([0-9a-f-]{36})\/([0-9a-f-]{36})(-o)?\.([a-z0-9]+)$/.exec(url);
  if (!m) return;
  const files = [`${m[2]}${m[3] ?? ''}.${m[4]}`, ...(m[3] ? VARIANT_WIDTHS.map((w) => `${m[2]}-${w}.webp`) : [])];
  const keys = files.map((f) => `${m[1]}/${f}`);
  forgetMedia(keys);
  await storage.remove(keys);
}

/** Pixels of an image for colour analysis (small, sRGB, alpha kept). */
export async function rasterForAnalysis(buf: Buffer): Promise<{ data: Buffer; channels: number }> {
  const t = sniff(buf);
  if (t?.kind === 'svg') assertSafeSvg(buf);
  const { data, info } = await sharp(buf, { density: 96 }).resize(96, 96, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, channels: info.channels };
}
