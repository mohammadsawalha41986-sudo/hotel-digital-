import { BedDouble, Flower2, Shirt, Utensils } from 'lucide-react';
import type { Branding } from '@shared/hotel';
import { cx } from '../../components/ui';
import { themeVars } from '../../lib/theme';
import { tr } from '../i18n';

/**
 * Live preview of a hotel theme: the real token variables applied to a
 * miniature of the guest site (hero, quick actions, cards, CTA, statuses,
 * footer), in a phone or desktop frame.
 */
export function ThemePreview({ branding, nameEn, nameAr, device }: { branding: Branding; nameEn: string; nameAr: string; device: 'mobile' | 'desktop' }) {
  const vars = themeVars(branding, true) as React.CSSProperties;
  const heroLogo = branding.logo_inverse || branding.logo;
  const bodyLogo = branding.logo_dark || branding.logo;
  const mobile = device === 'mobile';
  return (
    <div className={cx('mx-auto overflow-hidden rounded-[1.6rem] border border-black/10 shadow-sm', mobile ? 'w-[340px]' : 'w-full')} style={{ ...vars, background: 'var(--c-bg)', color: 'var(--c-text)', fontFamily: 'var(--font-body)', fontSize: 'var(--font-size-base)' }} aria-label={tr('{0} preview', { 0: device })}>
      <header className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--c-surface)', borderBottom: '1px solid var(--c-line)' }}>
        {bodyLogo ? <img src={bodyLogo} alt="" className="h-7 w-auto max-w-[9rem] object-contain" /> : <span className="text-sm font-semibold" style={{ color: 'var(--c-primary)' }}>{nameEn}</span>}
        <span className="rounded-full px-2.5 py-1 text-[0.7rem] font-semibold" style={{ background: 'var(--c-light)', color: 'var(--c-muted)' }}>{tr('EN · ع')}</span>
      </header>
      <section className={cx('relative px-5', mobile ? 'py-8' : 'py-12')} style={{ background: 'linear-gradient(135deg, var(--c-secondary), var(--c-dark))', color: 'var(--c-secondary-ink)' }}>
        {heroLogo && <img src={heroLogo} alt="" className="mb-4 h-8 w-auto max-w-[10rem] object-contain" />}
        <p className="text-[0.65rem] tracking-[0.2em] uppercase" style={{ color: 'var(--c-accent)' }}>{tr('Welcome')}</p>
        <h3 className={cx('mt-1 leading-tight', mobile ? 'text-2xl' : 'text-4xl')} style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--heading-weight)' as never }}>{nameEn}</h3>
        <p dir="rtl" className="mt-1 text-sm opacity-80" style={{ fontFamily: 'var(--font-ar)' }}>{nameAr}</p>
        {/* Presentational sample (not a control): shows the CTA colours. */}
        <span aria-hidden="true" className="mt-5 inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold" style={{ background: 'var(--c-cta)', color: 'var(--c-cta-ink)' }}>{tr('Order to your room')}</span>
      </section>
      <div className={cx('grid gap-2 px-4 pt-4', mobile ? 'grid-cols-4' : 'grid-cols-4 max-w-md')}>
        {[Utensils, BedDouble, Flower2, Shirt].map((I, i) => (
          <div key={i} className="flex flex-col items-center gap-1 rounded-2xl py-3" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)' }}>
            <I className="h-5 w-5" style={{ color: 'var(--c-primary)' }} aria-hidden="true" />
            <span className="text-[0.65rem]" style={{ color: 'var(--c-muted)' }}>{['Dining', 'Room', 'Spa', 'Laundry'][i]}</span>
          </div>
        ))}
      </div>
      <div className={cx('grid gap-3 p-4', mobile ? '' : 'grid-cols-2')}>
        {['Lobby Café', 'Wellness'].map((t, i) => (
          <article key={t} className="overflow-hidden rounded-2xl" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-line)' }}>
            <div className="h-20" style={{ background: i ? 'linear-gradient(135deg, var(--c-accent), var(--c-primary))' : 'linear-gradient(135deg, var(--c-primary), var(--c-secondary))' }} />
            <div className="p-3">
              <p className="font-semibold" style={{ fontWeight: 'var(--heading-weight)' as never }}>{t}</p>
              <p className="text-xs" style={{ color: 'var(--c-muted)' }}>{tr('Secondary text · open until 23:00')}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-semibold tabular-nums">{tr('SAR 45')}</span>
                <span aria-hidden="true" className="inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold" style={{ background: i ? 'var(--c-cta-hover)' : 'var(--c-cta)', color: 'var(--c-cta-ink)' }}>
                  {i ? tr('Hover state') : tr('Add')}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 px-4 pb-4 text-[0.7rem] font-semibold">
        {[['success', 'Completed'], ['warning', 'Pending'], ['error', 'Unavailable']].map(([k, l]) => (
          <span key={k} className="rounded-full px-2.5 py-1" style={{ color: `var(--c-${k})`, background: `color-mix(in oklab, var(--c-${k}) 12%, white)` }}>{l}</span>
        ))}
      </div>
      <footer className="px-5 py-4 text-xs" style={{ background: 'var(--c-dark)', color: 'var(--c-dark-ink)' }}>
        <span style={{ opacity: 0.75 }}>{tr('Reception · +966 11 000 0000')}</span>
      </footer>
    </div>
  );
}
