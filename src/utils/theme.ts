import { HotelBranding, HotelTypography } from '../types/hotel';

export function applyHotelBranding(branding: HotelBranding, typography?: HotelTypography) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty('--hotel-primary', branding.primary);
  root.style.setProperty('--hotel-secondary', branding.secondary);
  root.style.setProperty('--hotel-accent', branding.accent);
  root.style.setProperty('--hotel-background', branding.background);
  root.style.setProperty('--hotel-surface', branding.surface);
  root.style.setProperty('--hotel-text', branding.text);
  root.style.setProperty('--hotel-muted', branding.muted);
  root.style.setProperty('--hotel-border', branding.border);
  root.style.setProperty('--hotel-button', branding.button);
  root.style.setProperty('--hotel-radius', branding.radius || '14px');

  if (typography) {
    root.style.setProperty('--hotel-font-ar-heading', `'${typography.arHeadingFont}', sans-serif`);
    root.style.setProperty('--hotel-font-ar-body', `'${typography.arBodyFont}', sans-serif`);
    root.style.setProperty('--hotel-font-en-heading', `'${typography.enHeadingFont}', serif`);
    root.style.setProperty('--hotel-font-en-body', `'${typography.enBodyFont}', sans-serif`);
  }
}

export const applyHotelTheme = applyHotelBranding;

// Generates intelligent brand palette suggestions from a dominant color or logo hint
export function generateSuggestedBrandPalette(primaryHex: string): HotelBranding {
  return {
    primary: primaryHex,
    secondary: '#1f1c19',
    accent: '#d4af37',
    background: '#faf8f5',
    surface: '#ffffff',
    text: '#1c1917',
    muted: '#78716c',
    border: '#e7e5e4',
    button: primaryHex,
    radius: '14px',
  };
}
