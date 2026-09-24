import { ArrowUpRight, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { OUTLET_TYPES } from '@shared/fields';
import { isAvailableNow, summarizeHours } from '@shared/hours';
import { Icon } from '../../lib/icons';
import { useI18n } from '../../lib/i18n';
import { Img, cx } from '../../components/ui';
import { useHotel } from '../hotel';
import type { Outlet, Rec, ServiceRec } from '../types';

export function useOpenState(rec: { status_override?: unknown; hours?: unknown }) {
  const { bundle } = useHotel();
  return isAvailableNow(rec.status_override as string | undefined, rec.hours as never, bundle.hotel.profile.timezone);
}

export function OpenPill({ rec, dark }: { rec: { status_override?: unknown; hours?: unknown }; dark?: boolean }) {
  const { t } = useI18n();
  const s = useOpenState(rec);
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur',
        dark ? 'bg-black/35 text-white' : s.open ? 'bg-emerald-50 text-emerald-800' : 'bg-black/[0.05] text-muted'
      )}
    >
      <span className={cx('h-1.5 w-1.5 rounded-full', s.open ? 'bg-emerald-400' : 'bg-neutral-400')} aria-hidden="true" />
      {s.open ? (s.until ? `${t('openNow')} · ${t('until', { time: s.until })}` : t('openNow')) : s.opensAt ? t('opensAt', { time: s.opensAt }) : t('closedNow')}
    </span>
  );
}

export function SectionHeader({ eyebrow, title, subtitle, action, dark, as: H = 'h2', id }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode; dark?: boolean; as?: 'h1' | 'h2'; id?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 px-5 sm:px-8">
      <div className="min-w-0">
        {eyebrow && <p className={cx('eyebrow mb-2', dark ? 'text-accent' : 'text-accent')}>{eyebrow}</p>}
        <H id={id} className={cx('display text-[2rem] leading-tight sm:text-4xl', dark ? 'text-white' : 'text-fg')}>
          {title}
        </H>
        {subtitle && <p className={cx('mt-2 max-w-xl text-[0.98rem] leading-relaxed', dark ? 'text-white/70' : 'text-muted')}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ViewAll({ to, dark }: { to: string; dark?: boolean }) {
  const { t } = useI18n();
  return (
    <Link to={to} className={cx('inline-flex shrink-0 items-center gap-1 text-sm font-semibold', dark ? 'text-white' : 'text-brand')}>
      {t('viewAll')}
      <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
    </Link>
  );
}

export function OutletCard({ outlet, wide }: { outlet: Outlet; wide?: boolean }) {
  const { pick, lang } = useI18n();
  const { path } = useHotel();
  const typeLabel = OUTLET_TYPES.find((o) => o.value === outlet.type)?.[lang] ?? '';
  const name = pick(outlet, 'name');
  return (
    <Link to={path(`dining/${outlet.id}`)} className={cx('group relative block overflow-hidden rounded-[1.6rem] bg-ink text-white shadow-sm', wide ? 'aspect-[4/5] sm:aspect-[16/10]' : 'aspect-[4/5]')}>
      <Img src={outlet.cover} alt="" className="absolute inset-0 h-full w-full transition duration-700 group-hover:scale-[1.04] [&_img]:transition" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <OpenPill rec={outlet} dark />
        {outlet.logo && <Img src={outlet.logo} alt="" className="h-10 w-10 rounded-full bg-white/90 p-1 [&_img]:object-contain" />}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="eyebrow text-white/70">{typeLabel}</p>
        <h3 className="display mt-1 text-[1.75rem] leading-tight">{name}</h3>
        {pick(outlet, 'tagline') && <p className="mt-1 line-clamp-2 text-sm text-white/75">{pick(outlet, 'tagline')}</p>}
      </div>
    </Link>
  );
}

export function ServiceTile({ service, onClick, compact }: { service: ServiceRec; onClick: () => void; compact?: boolean }) {
  const { pick, t } = useI18n();
  const off = service.available === false;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={off}
      className={cx(
        'group flex w-full items-center gap-4 rounded-[1.35rem] bg-surface p-4 text-start ring-1 ring-line transition hover:ring-black/15 hover:shadow-md active:scale-[0.99] disabled:opacity-55',
        compact && 'flex-col items-start gap-3'
      )}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--c-primary)_9%,transparent)] text-brand">
        <Icon name={service.icon} className="h-[1.35rem] w-[1.35rem]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug">{pick(service, 'name')}</span>
        <span className="mt-0.5 block text-xs text-muted">
          {off ? t('unavailable') : service.response_minutes ? t('expectedIn', { n: service.response_minutes }) : pick(service, 'description').slice(0, 60)}
        </span>
      </span>
      {!compact && <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition group-hover:text-fg rtl:-scale-x-100" aria-hidden="true" />}
    </button>
  );
}

export function OfferCard({ offer, onOpen }: { offer: Rec; onOpen: () => void }) {
  const { pick } = useI18n();
  const title = pick(offer, 'title');
  return (
    <button type="button" onClick={onOpen} className="group relative block aspect-[16/11] w-full overflow-hidden rounded-[1.6rem] bg-ink text-start text-white sm:aspect-[21/9]">
      <Img src={offer.image as string} alt="" className="absolute inset-0 h-full w-full transition duration-700 group-hover:scale-[1.03]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/5 sm:bg-gradient-to-r rtl:sm:bg-gradient-to-l" />
      <div className="absolute inset-0 flex flex-col justify-end p-5 sm:max-w-[60%] sm:justify-center sm:p-10">
        {pick(offer, 'badge') && <span className="mb-3 inline-flex w-fit rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">{pick(offer, 'badge')}</span>}
        <h3 className="display text-[1.8rem] leading-tight sm:text-5xl">{title}</h3>
        {pick(offer, 'subtitle') && <p className="mt-2 line-clamp-2 text-sm text-white/80 sm:text-base">{pick(offer, 'subtitle')}</p>}
        {pick(offer, 'price_label') && <p className="mt-3 text-lg font-semibold text-accent">{pick(offer, 'price_label')}</p>}
      </div>
    </button>
  );
}

export function HoursLine({ rec }: { rec: { hours?: unknown } }) {
  const { lang } = useI18n();
  return <span>{summarizeHours(rec.hours as never, lang)}</span>;
}
