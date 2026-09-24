import type { Branding } from '@shared/hotel';

/** WCAG relative luminance of a #rrggbb color. */
export function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Readable text color on top of a background. */
export const inkOn = (bg: string) => (contrastRatio(bg, '#ffffff') >= contrastRatio(bg, '#111111') ? '#ffffff' : '#111111');

const loadedFonts = new Set<string>();
function ensureFont(family: string) {
  const base = ['Plus Jakarta Sans', 'Cormorant Garamond', 'Tajawal', 'Inter'];
  if (!family || base.includes(family) || loadedFonts.has(family)) return;
  loadedFonts.add(family);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

export function themeVars(b: Branding): Record<string, string> {
  ensureFont(b.fonts.en);
  ensureFont(b.fonts.ar);
  ensureFont(b.fonts.display);
  return {
    '--c-primary': b.colors.primary,
    '--c-primary-ink': inkOn(b.colors.primary),
    '--c-secondary': b.colors.secondary,
    '--c-accent': b.colors.accent,
    '--c-bg': b.colors.background,
    '--c-surface': b.colors.surface,
    '--c-text': b.colors.text,
    '--c-muted': b.colors.muted,
    '--font-body': `'${b.fonts.en}', system-ui, sans-serif`,
    '--font-display': `'${b.fonts.display}', Georgia, serif`,
    '--font-ar': `'${b.fonts.ar}', system-ui, sans-serif`,
  };
}

/**
 * Suggests a palette from an image (logo): the most frequent saturated color
 * becomes primary, a lighter complementary tone the accent. Staff can override.
 */
export async function paletteFromImage(url: string): Promise<{ primary: string; accent: string; secondary: string } | null> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  try {
    await img.decode();
  } catch {
    return null;
  }
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, size, size);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, size, size).data;
  } catch {
    return null; // tainted canvas (remote image without CORS)
  }
  const buckets = new Map<string, { n: number; r: number; g: number; b: number; sat: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 200) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (max > 240 && min > 230) continue; // near white background
    const k = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const e = buckets.get(k) ?? { n: 0, r: 0, g: 0, b: 0, sat };
    e.n++;
    e.r += r;
    e.g += g;
    e.b += b;
    buckets.set(k, e);
  }
  const ranked = [...buckets.values()].map((e) => ({ ...e, r: e.r / e.n, g: e.g / e.n, b: e.b / e.n })).sort((a, b) => b.n * (0.4 + b.sat) - a.n * (0.4 + a.sat));
  if (!ranked.length) return null;
  const hex = (c: { r: number; g: number; b: number }) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const primary = ranked.find((c) => luminance(hex(c)) < 0.25) ?? ranked[0];
  const accent = ranked.find((c) => c !== primary && c.sat > 0.3 && luminance(hex(c)) > 0.15) ?? { r: 184, g: 149, b: 90 };
  const darken = (c: { r: number; g: number; b: number }, f: number) => ({ r: c.r * f, g: c.g * f, b: c.b * f });
  return { primary: hex(primary), accent: hex(accent), secondary: hex(darken(primary, 0.55)) };
}
