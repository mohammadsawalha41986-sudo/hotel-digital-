import { api } from '../../lib/api';

export interface MediaRow {
  id: string;
  url: string;
  kind: string;
  source: string;
  mime: string;
  size_bytes: number | null;
  filename: string;
  label: string;
  created_at: string;
  width?: number | null;
  height?: number | null;
  variants?: Record<string, string>;
  warnings?: { en: string; ar: string }[];
}

const MAX_EDGE = 2400;

/**
 * Downscales large photos in the browser and re-encodes them as WebP before
 * upload, so guests never download multi-megabyte originals.
 */
export async function optimizeImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  // PNG logos keep transparency and exact pixels when already small.
  if (scale === 1 && file.type === 'image/png' && file.size < 400_000) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.84));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' });
}

/**
 * Uploads a file. Large photos are downscaled in the browser first (faster on
 * hotel Wi-Fi); the server then produces the optimised WebP and variants.
 * `spec` (e.g. "logo", "hero_desktop") enables recommended-size warnings.
 */
export async function uploadMedia(hid: string, file: File, label = '', spec?: string): Promise<MediaRow> {
  const optimized = /^image\/(jpeg|png|webp)$/.test(file.type) ? await optimizeImage(file) : file;
  const fd = new FormData();
  fd.append('file', optimized);
  fd.append('label', label);
  if (spec) fd.append('spec', spec);
  return api<MediaRow>(`/admin/hotels/${hid}/media/upload`, { method: 'POST', body: fd });
}
