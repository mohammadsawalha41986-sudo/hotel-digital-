/**
 * Brand engine: derives a complete, contrast-safe design-token set from a few
 * brand colours (usually taken from the logo), with per-token manual
 * overrides. Pure functions shared by the server (logo analysis), the admin
 * (editor + preview) and the guest site (runtime theme).
 */

export const TOKEN_KEYS = [
  'primary',
  'secondary',
  'accent',
  'dark_surface',
  'light_surface',
  'page_background',
  'card_background',
  'border',
  'text_primary',
  'text_secondary',
  'cta',
  'cta_hover',
  'success',
  'warning',
  'error',
] as const;
export type TokenKey = (typeof TOKEN_KEYS)[number];
export type ThemeTokens = Record<TokenKey, string>;

export const TOKEN_LABELS: Record<TokenKey, { en: string; ar: string; hint: string }> = {
  primary: { en: 'Primary', ar: 'اللون الأساسي', hint: 'Brand colour: headers, highlights, icons' },
  secondary: { en: 'Secondary', ar: 'اللون الثانوي', hint: 'Deep brand tone for dark sections' },
  accent: { en: 'Accent', ar: 'لون التمييز', hint: 'Details, badges, focus rings' },
  dark_surface: { en: 'Dark surface', ar: 'السطح الداكن', hint: 'Footer and dark bands' },
  light_surface: { en: 'Light surface', ar: 'السطح الفاتح', hint: 'Muted panels and chips' },
  page_background: { en: 'Page background', ar: 'خلفية الصفحة', hint: 'Behind all content' },
  card_background: { en: 'Card background', ar: 'خلفية البطاقات', hint: 'Cards, sheets, forms' },
  border: { en: 'Border', ar: 'الحدود', hint: 'Dividers and outlines' },
  text_primary: { en: 'Primary text', ar: 'النص الأساسي', hint: 'Headings and body text' },
  text_secondary: { en: 'Secondary text', ar: 'النص الثانوي', hint: 'Descriptions and hints' },
  cta: { en: 'Call to action', ar: 'زر الإجراء', hint: 'Order / book / send buttons' },
  cta_hover: { en: 'CTA hover', ar: 'زر الإجراء عند المرور', hint: 'Button hover and pressed' },
  success: { en: 'Success', ar: 'النجاح', hint: 'Confirmations' },
  warning: { en: 'Warning', ar: 'التحذير', hint: 'Attention states' },
  error: { en: 'Error', ar: 'الخطأ', hint: 'Errors and destructive actions' },
};

export const DEFAULT_SEED = { primary: '#7A2434', secondary: '#1F1A17', accent: '#B8955A' };

// ---------------------------------------------------------------------------
// Colour maths (sRGB ⇄ OKLab/OKLCH, WCAG contrast)
// ---------------------------------------------------------------------------
export interface Oklch {
  l: number;
  c: number;
  h: number;
}

export const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

export function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

export function rgbToOklch(r: number, g: number, b: number): Oklch {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.sqrt(A * A + B * B);
  const h = (Math.atan2(B, A) * 180) / Math.PI;
  return { l: L, c, h: h < 0 ? h + 360 : h };
}

function oklchToRgbRaw({ l, c, h }: Oklch): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    fromLinear(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    fromLinear(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    fromLinear(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  ];
}

const inGamut = (rgb: number[]) => rgb.every((v) => v >= -0.5 && v <= 255.5);

/** OKLCH → hex, reducing chroma until the colour fits sRGB (keeps hue and lightness). */
export function oklchToHex(o: Oklch): string {
  let c = o.c;
  let rgb = oklchToRgbRaw({ ...o, l: clamp01(o.l), c });
  while (!inGamut(rgb) && c > 0) {
    c = Math.max(0, c - 0.005);
    rgb = oklchToRgbRaw({ ...o, l: clamp01(o.l), c });
  }
  return rgbToHex(rgb[0], rgb[1], rgb[2]);
}

export const hexToOklch = (hex: string) => rgbToOklch(...hexToRgb(hex));
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
/** Best readable text colour (near-white or near-black) on a background. */
export const inkOn = (bg: string) => (contrast(bg, '#FFFFFF') >= contrast(bg, '#141414') ? '#FFFFFF' : '#141414');

/**
 * Moves `fg` lighter or darker (same hue) until it reaches `min` contrast
 * against `bg`. Returns the closest passing colour to the original.
 */
export function ensureContrast(fg: string, bg: string, min: number): string {
  if (contrast(fg, bg) >= min) return fg;
  const o = hexToOklch(fg);
  const bgDark = luminance(bg) < 0.4;
  const candidates: string[] = [];
  for (let step = 1; step <= 100; step++) {
    const l = bgDark ? o.l + step * 0.01 : o.l - step * 0.01;
    if (l < 0 || l > 1) break;
    const hex = oklchToHex({ ...o, l });
    if (contrast(hex, bg) >= min) {
      candidates.push(hex);
      break;
    }
  }
  return candidates[0] ?? (bgDark ? '#FFFFFF' : '#000000');
}

// ---------------------------------------------------------------------------
// Theme derivation
// ---------------------------------------------------------------------------
export interface ThemeSeed {
  primary: string;
  secondary?: string;
  accent?: string;
}

/**
 * Derives all tokens from the brand colours. Guarantees (WCAG 2.1):
 *  - primary and secondary text ≥ 4.5:1 on page and card backgrounds
 *  - CTA label ≥ 4.5:1 on CTA and CTA hover
 *  - status colours ≥ 4.5:1 on cards
 *  - primary ≥ 3:1 on the page (the seed keeps the exact logo colour)
 */
export function deriveTheme(seed: ThemeSeed): ThemeTokens {
  const brand = isHex(seed.primary) ? seed.primary.toUpperCase() : DEFAULT_SEED.primary;
  const p = hexToOklch(brand);
  const neutralHue = p.c < 0.02 ? 70 : p.h; // monochrome logos get a warm neutral
  const tint = (l: number, c: number) => oklchToHex({ l, c, h: neutralHue });
  const secondary = isHex(seed.secondary) ? seed.secondary.toUpperCase() : oklchToHex({ l: Math.min(p.l, 0.3) * 0.75, c: Math.min(p.c, 0.06), h: p.h });
  const accent = isHex(seed.accent) ? seed.accent.toUpperCase() : oklchToHex({ l: 0.68, c: Math.max(0.08, Math.min(p.c, 0.12)), h: (p.h + 50) % 360 });

  const page_background = tint(0.975, 0.008);
  // Icons and links in the brand colour must stay visible on the page (3:1); very light brand colours are deepened.
  const primary = ensureContrast(brand, page_background, 3).toUpperCase();
  const card_background = '#FFFFFF';
  const light_surface = tint(0.945, 0.014);
  const border = tint(0.89, 0.012);
  const dark_surface = oklchToHex({ l: 0.2, c: Math.min(p.c, 0.035), h: neutralHue });
  const text_primary = ensureContrast(tint(0.22, 0.012), page_background, 7);
  const text_secondary = ensureContrast(tint(0.48, 0.014), light_surface, 4.5);

  // CTA: the brand colour when it can carry a readable label, else a deeper tone of it.
  const ctaBase = ensureContrast(primary, '#FFFFFF', 4.5);
  const cta = contrast(primary, inkOn(primary)) >= 4.5 ? primary : ctaBase;
  const c = hexToOklch(cta);
  const hover = oklchToHex({ ...c, l: c.l > 0.5 ? c.l - 0.07 : Math.max(0.05, c.l - 0.06) });
  const cta_hover = contrast(hover, inkOn(cta)) >= 4.5 ? hover : ensureContrast(hover, inkOn(cta), 4.5);

  return {
    primary,
    secondary,
    accent,
    dark_surface,
    light_surface,
    page_background,
    card_background,
    border,
    text_primary,
    text_secondary,
    cta,
    cta_hover,
    success: ensureContrast('#1F7A4D', card_background, 4.5),
    warning: ensureContrast('#A15C07', card_background, 4.5),
    error: ensureContrast('#B42318', card_background, 4.5),
  };
}

export type ThemeOverrides = Partial<ThemeTokens>;

/** Final tokens: derived from the seed, then the staff's manual overrides. */
export function resolveTheme(seed: ThemeSeed, overrides: ThemeOverrides = {}): ThemeTokens {
  const base = deriveTheme(seed);
  for (const k of TOKEN_KEYS) if (isHex(overrides[k])) base[k] = overrides[k]!.toUpperCase();
  return base;
}

export interface ContrastCheck {
  label: string;
  fg: TokenKey | 'cta_ink';
  bg: TokenKey;
  ratio: number;
  min: number;
  ok: boolean;
}

/** The pairs that must stay readable, for the editor's warnings. */
export function contrastReport(t: ThemeTokens): ContrastCheck[] {
  const ink = inkOn(t.cta);
  const pairs: [string, TokenKey | 'cta_ink', TokenKey, number][] = [
    ['Text on page', 'text_primary', 'page_background', 4.5],
    ['Text on cards', 'text_primary', 'card_background', 4.5],
    ['Secondary text on page', 'text_secondary', 'page_background', 4.5],
    ['Secondary text on light surface', 'text_secondary', 'light_surface', 4.5],
    ['Button label on CTA', 'cta_ink', 'cta', 4.5],
    ['Button label on CTA hover', 'cta_ink', 'cta_hover', 4.5],
    ['Primary on page (icons, links)', 'primary', 'page_background', 3],
    ['Error on cards', 'error', 'card_background', 4.5],
  ];
  return pairs.map(([label, fg, bg, min]) => {
    const f = fg === 'cta_ink' ? ink : t[fg];
    const ratio = Math.round(contrast(f, t[bg]) * 100) / 100;
    return { label, fg, bg, ratio, min, ok: ratio >= min };
  });
}

// ---------------------------------------------------------------------------
// Logo analysis
// ---------------------------------------------------------------------------
export interface PaletteResult {
  primary: string;
  secondary: string;
  accent: string;
  /** True when the logo has no real colour (black/white/grey): primary is a neutral. */
  monochrome: boolean;
  swatches: { hex: string; weight: number }[];
}

/**
 * Extracts brand colours from RGBA pixels. Transparent pixels and the
 * near-white / near-black / grey pixels typical of backgrounds and outlines
 * are ignored; the remaining colours are clustered (k-means in OKLab) and
 * ranked by coverage × chroma. Monochrome logos fall back to their darkest
 * tone.
 */
export function extractPalette(data: ArrayLike<number>, channels = 4): PaletteResult | null {
  type P = { L: number; a: number; b: number; w: number };
  const colourful: P[] = [];
  const neutrals: { hex: string; l: number }[] = [];
  for (let i = 0; i + 3 < data.length; i += channels) {
    const alpha = channels === 4 ? data[i + 3] : 255;
    if (alpha < 128) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const o = rgbToOklch(r, g, b);
    if (o.l > 0.96 || o.l < 0.08 || o.c < 0.035) {
      if (o.l <= 0.96) neutrals.push({ hex: rgbToHex(r, g, b), l: o.l });
      continue;
    }
    const rad = (o.h * Math.PI) / 180;
    colourful.push({ L: o.l, a: o.c * Math.cos(rad), b: o.c * Math.sin(rad), w: 0.5 + o.c * 4 });
  }
  if (!colourful.length) {
    if (!neutrals.length) return null;
    neutrals.sort((x, y) => x.l - y.l);
    const dark = neutrals[0].hex.toUpperCase();
    return { primary: dark, secondary: dark, accent: DEFAULT_SEED.accent, monochrome: true, swatches: [{ hex: dark, weight: 1 }] };
  }
  // k-means (k ≤ 5), deterministic seeding by spread.
  const k = Math.min(5, colourful.length);
  const centers = [colourful[0]];
  while (centers.length < k) {
    let best = colourful[0];
    let bestD = -1;
    for (const p of colourful) {
      const d = Math.min(...centers.map((c) => (p.L - c.L) ** 2 + (p.a - c.a) ** 2 + (p.b - c.b) ** 2));
      if (d > bestD) {
        bestD = d;
        best = p;
      }
    }
    centers.push({ ...best });
  }
  let groups: P[][] = [];
  for (let iter = 0; iter < 12; iter++) {
    groups = centers.map(() => []);
    for (const p of colourful) {
      let bi = 0;
      let bd = Infinity;
      centers.forEach((c, i) => {
        const d = (p.L - c.L) ** 2 + (p.a - c.a) ** 2 + (p.b - c.b) ** 2;
        if (d < bd) {
          bd = d;
          bi = i;
        }
      });
      groups[bi].push(p);
    }
    groups.forEach((g, i) => {
      if (!g.length) return;
      const w = g.reduce((s, p) => s + p.w, 0);
      centers[i] = { L: g.reduce((s, p) => s + p.L * p.w, 0) / w, a: g.reduce((s, p) => s + p.a * p.w, 0) / w, b: g.reduce((s, p) => s + p.b * p.w, 0) / w, w };
    });
  }
  const total = colourful.reduce((s, p) => s + p.w, 0);
  const clusters = centers
    .map((c, i) => {
      const chroma = Math.sqrt(c.a * c.a + c.b * c.b);
      const h = ((Math.atan2(c.b, c.a) * 180) / Math.PI + 360) % 360;
      return { hex: oklchToHex({ l: c.L, c: chroma, h }), o: { l: c.L, c: chroma, h }, weight: groups[i].reduce((s, p) => s + p.w, 0) / total };
    })
    .filter((c) => c.weight > 0.02)
    .sort((x, y) => y.weight - x.weight);
  const primary = clusters[0];
  const hueGap = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  const distinct = clusters.find((c) => c !== primary && (hueGap(c.o.h, primary.o.h) > 25 || Math.abs(c.o.l - primary.o.l) > 0.2));
  const accent = distinct?.hex ?? oklchToHex({ l: 0.7, c: Math.max(0.08, primary.o.c * 0.8), h: (primary.o.h + 40) % 360 });
  const secondary = oklchToHex({ l: Math.min(primary.o.l, 0.32) * 0.72, c: Math.min(primary.o.c, 0.06), h: primary.o.h });
  return {
    primary: primary.hex.toUpperCase(),
    secondary: secondary.toUpperCase(),
    accent: accent.toUpperCase(),
    monochrome: false,
    swatches: clusters.map((c) => ({ hex: c.hex.toUpperCase(), weight: Math.round(c.weight * 100) / 100 })),
  };
}
