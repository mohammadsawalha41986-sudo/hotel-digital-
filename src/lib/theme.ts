import type { Branding } from '@shared/hotel';
import { inkOn, resolveTheme, type ThemeTokens } from '@shared/theme';

const loadedFonts = new Set<string>();
function ensureFont(family: string) {
  const bundled = ['Plus Jakarta Sans', 'Cormorant Garamond', 'Tajawal', 'Inter'];
  if (!family || bundled.includes(family) || loadedFonts.has(family)) return;
  loadedFonts.add(family);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

export const tokensOf = (b: Branding): ThemeTokens => resolveTheme(b.colors, b.theme?.overrides ?? {});

const SCALE: Record<string, string> = { compact: '15px', default: '16px', large: '17px' };

/** CSS variables for a hotel's theme (applied on the guest root and in the admin preview). */
export function themeVars(b: Branding, loadFonts = true): Record<string, string> {
  if (loadFonts) {
    ensureFont(b.fonts.en);
    ensureFont(b.fonts.ar);
    ensureFont(b.fonts.display);
  }
  const t = tokensOf(b);
  return {
    '--c-primary': t.primary,
    '--c-primary-ink': inkOn(t.primary),
    '--c-secondary': t.secondary,
    '--c-secondary-ink': inkOn(t.secondary),
    '--c-accent': t.accent,
    '--c-accent-ink': inkOn(t.accent),
    '--c-bg': t.page_background,
    '--c-surface': t.card_background,
    '--c-light': t.light_surface,
    '--c-dark': t.dark_surface,
    '--c-dark-ink': inkOn(t.dark_surface),
    '--c-text': t.text_primary,
    '--c-muted': t.text_secondary,
    '--c-line': t.border,
    '--c-cta': t.cta,
    '--c-cta-hover': t.cta_hover,
    '--c-cta-ink': inkOn(t.cta),
    '--c-success': t.success,
    '--c-warning': t.warning,
    '--c-error': t.error,
    '--font-body': `'${b.fonts.en}', system-ui, sans-serif`,
    '--font-display': `'${b.fonts.display}', Georgia, serif`,
    '--font-ar': `'${b.fonts.ar}', system-ui, sans-serif`,
    '--font-size-base': SCALE[b.fonts.scale ?? 'default'] ?? '16px',
    '--heading-weight': b.fonts.heading_weight ?? '600',
  };
}
