import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Mail, MapPin, Phone, Star } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { GUEST_PAGE_LABELS, type GuestPage } from '@shared/domain';
import type { Section } from '@shared/hotel';
import { api } from '../../lib/api';
import { Icon } from '../../lib/icons';
import { useI18n } from '../../lib/i18n';
import { Button, Img, cx } from '../../components/ui';
import { useQuickAction } from '../actions';
import { Hero } from '../components/Hero';
import { OfferCard, OutletCard, SectionHeader, ServiceTile, ViewAll } from '../components/cards';
import { OfferSheet } from '../sheets/OfferSheet';
import { ReviewSheet } from '../sheets/ReviewSheet';
import { useHotel } from '../hotel';
import type { Rec } from '../types';

const BG: Record<string, string> = {
  default: 'bg-canvas',
  muted: 'bg-[color-mix(in_oklab,var(--c-text)_4%,var(--c-bg))]',
  dark: 'bg-ink text-white',
  brand: 'bg-brand text-brand-ink',
};

export function Home() {
  const { bundle } = useHotel();
  const sections = bundle.site.sections.filter((s) => s.visible);
  return (
    <>
      <Hero />
      {sections.map((s) => (
        <SectionSwitch key={s.id} section={s} />
      ))}
    </>
  );
}

function SectionSwitch({ section }: { section: Section }) {
  switch (section.type) {
    case 'offers':
      return <OffersSection s={section} />;
    case 'quick_actions':
      return <QuickActionsSection s={section} />;
    case 'dining':
      return <DiningSection s={section} />;
    case 'room_services':
      return <RoomServicesSection s={section} />;
    case 'wellness':
      return <WellnessSection s={section} />;
    case 'laundry':
      return <LaundrySection s={section} />;
    case 'hotel_services':
      return <HotelServicesSection s={section} />;
    case 'info':
      return <InfoSection s={section} />;
    case 'gallery':
      return <GallerySection s={section} />;
    case 'reviews':
      return <ReviewsSection s={section} />;
    case 'contact':
      return <ContactSection s={section} />;
    case 'custom':
      return <CustomSection s={section} />;
    default:
      return null;
  }
}

function useSectionText(s: Section) {
  const { lang } = useI18n();
  return {
    title: lang === 'ar' ? s.title_ar || s.title_en : s.title_en || s.title_ar,
    subtitle: lang === 'ar' ? s.subtitle_ar : s.subtitle_en,
    cta: lang === 'ar' ? s.cta_label_ar : s.cta_label_en,
    body: lang === 'ar' ? s.body_ar : s.body_en,
  };
}

function Shell({ s, children, labelledBy }: { s: Section; children: ReactNode; labelledBy: string }) {
  return (
    <section aria-labelledby={labelledBy} className={cx('py-12 sm:py-16', BG[s.background] ?? BG.default)}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

const Row = ({ children }: { children: ReactNode }) => <div className="snap-row no-scrollbar gap-4 px-5 pb-2 sm:px-8">{children}</div>;

// --------------------------------------------------------------------------------------
function OffersSection({ s }: { s: Section }) {
  const { bundle } = useHotel();
  const text = useSectionText(s);
  const [open, setOpen] = useState<Rec | null>(null);
  const offers = bundle.catalog.offers.filter((o) => (o.placement as string[] | undefined)?.includes('home') ?? true);
  if (!offers.length) return null;
  const id = `sec-${s.id}`;
  return (
    <Shell s={s} labelledBy={id}>
      <SectionHeader id={id} title={text.title} subtitle={text.subtitle} dark={s.background === 'dark'} />
      {offers.length === 1 || s.layout === 'feature' ? (
        <div className="px-5 sm:px-8">
          <OfferCard offer={offers[0]} onOpen={() => setOpen(offers[0])} />
        </div>
      ) : (
        <Row>
          {offers.map((o) => (
            <div key={o.id} className="w-[86%] shrink-0 sm:w-[70%] lg:w-[48%]">
              <OfferCard offer={o} onOpen={() => setOpen(o)} />
            </div>
          ))}
        </Row>
      )}
      <OfferSheet offer={open} onClose={() => setOpen(null)} />
    </Shell>
  );
}

function QuickActionsSection({ s }: { s: Section }) {
  const { bundle } = useHotel();
  const { pick } = useI18n();
  const text = useSectionText(s);
  const { resolve } = useQuickAction();
  const actions = bundle.catalog.quick_actions.map((a) => ({ a, r: resolve(a) })).filter((x) => x.r.available);
  if (!actions.length) return null;
  const id = `sec-${s.id}`;
  return (
    <Shell s={s} labelledBy={id}>
      <SectionHeader id={id} title={text.title} subtitle={text.subtitle} dark={s.background === 'dark'} />
      <ul className="grid grid-cols-3 gap-x-2 gap-y-5 px-4 sm:grid-cols-4 sm:px-8 lg:grid-cols-6">
        {actions.map(({ a, r }) => {
          const label = pick(a, 'label');
          const content = (
            <>
              <span className={cx('flex h-16 w-16 items-center justify-center rounded-[1.4rem] shadow-sm ring-1 transition group-active:scale-95 sm:h-[4.5rem] sm:w-[4.5rem]', a.emphasis ? 'bg-red-600 text-white ring-red-700/20' : 'bg-surface text-brand ring-line group-hover:shadow-md')}>
                <Icon name={a.icon as string} className="h-7 w-7" />
              </span>
              <span className="mt-2 line-clamp-2 text-center text-[0.8rem] leading-tight font-medium">{label}</span>
            </>
          );
          return (
            <li key={a.id} className="flex justify-center">
              {r.href && a.action === 'call' ? (
                <a href={r.href} className="group flex w-full flex-col items-center">
                  {content}
                </a>
              ) : (
                <button type="button" onClick={r.run} className="group flex w-full flex-col items-center">
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}

function DiningSection({ s }: { s: Section }) {
  const { bundle, path } = useHotel();
  const text = useSectionText(s);
  const outlets = bundle.catalog.outlets;
  if (!outlets.length) return null;
  const id = `sec-${s.id}`;
  const dark = s.background === 'dark';
  return (
    <Shell s={s} labelledBy={id}>
      <SectionHeader id={id} title={text.title} subtitle={text.subtitle} dark={dark} action={<ViewAll to={path('dining')} dark={dark} />} />
      {s.layout === 'grid' ? (
        <div className="grid gap-4 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
          {outlets.map((o) => (
            <OutletCard key={o.id} outlet={o} />
          ))}
        </div>
      ) : (
        <Row>
          {outlets.map((o) => (
            <div key={o.id} className="w-[72%] shrink-0 sm:w-[42%] lg:w-[31%]">
              <OutletCard outlet={o} />
            </div>
          ))}
        </Row>
      )}
    </Shell>
  );
}

function RoomServicesSection({ s }: { s: Section }) {
  const { bundle, path } = useHotel();
  const text = useSectionText(s);
  const { openService } = useQuickAction();
  const services = bundle.catalog.room_services.slice(0, 6);
  if (!services.length) return null;
  const id = `sec-${s.id}`;
  return (
    <Shell s={s} labelledBy={id}>
      <SectionHeader id={id} title={text.title} subtitle={text.subtitle} dark={s.background === 'dark'} action={<ViewAll to={path('room_services')} dark={s.background === 'dark'} />} />
      <div className="grid gap-3 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
        {services.map((sv) => (
          <ServiceTile key={sv.id} service={sv} onClick={() => openService('room_services', sv)} />
        ))}
      </div>
    </Shell>
  );
}

function WellnessSection({ s }: { s: Section }) {
  const { bundle, path } = useHotel();
  const { pick } = useI18n();
  const text = useSectionText(s);
  const cats = bundle.catalog.spa_categories;
  if (!cats.length) return null;
  const id = `sec-${s.id}`;
  const dark = s.background === 'dark' || s.background === 'brand';
  return (
    <Shell s={s} labelledBy={id}>
      <SectionHeader id={id} title={text.title} subtitle={text.subtitle} dark={dark} action={<ViewAll to={path('spa')} dark={dark} />} />
      <Row>
        {cats.map((c) => (
          <Link key={c.id} to={`${path('spa')}${path('spa').includes('?') ? '&' : '?'}category=${c.id}`} className="group relative block aspect-[3/4] w-[58%] shrink-0 overflow-hidden rounded-[1.5rem] sm:w-[34%] lg:w-[23%]">
            <Img src={c.image} alt="" className="absolute inset-0 h-full w-full transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-4 text-white">
              <span className="display text-2xl leading-tight">{pick(c, 'name')}</span>
              <ArrowUpRight className="h-5 w-5 shrink-0 opacity-70 rtl:-scale-x-100" aria-hidden="true" />
            </div>
          </Link>
        ))}
      </Row>
    </Shell>
  );
}

function LaundrySection({ s }: { s: Section }) {
  const { bundle } = useHotel();
  return <FeatureSection s={s} page="laundry" icon="shirt" hasContent={bundle.catalog.laundry_items.length > 0} />;
}

function FeatureSection({ s, page, icon, hasContent }: { s: Section; page: GuestPage; icon: string; hasContent: boolean }) {
  const { path } = useHotel();
  const { lang } = useI18n();
  const text = useSectionText(s);
  if (!hasContent) return null;
  const id = `sec-${s.id}`;
  const dark = s.background === 'dark' || s.background === 'brand';
  return (
    <Shell s={s} labelledBy={id}>
      <div className="grid items-center gap-8 px-5 sm:px-8 md:grid-cols-2">
        <Img src={s.image} alt="" className="aspect-[4/3] w-full rounded-[1.6rem]" />
        <div>
          <span className={cx('flex h-12 w-12 items-center justify-center rounded-2xl', dark ? 'bg-white/10' : 'bg-[color-mix(in_oklab,var(--c-primary)_9%,transparent)] text-brand')}>
            <Icon name={icon} className="h-6 w-6" />
          </span>
          <h2 id={id} className="display mt-5 text-[2rem] leading-tight sm:text-4xl">
            {text.title}
          </h2>
          {text.subtitle && <p className={cx('mt-3 text-[1.02rem] leading-relaxed', dark ? 'text-white/75' : 'text-muted')}>{text.subtitle}</p>}
          {text.body && <p className={cx('mt-3 leading-relaxed', dark ? 'text-white/75' : 'text-muted')}>{text.body}</p>}
          <Link to={path(page)} className={cx('mt-6 inline-flex h-12 items-center gap-2 rounded-full px-6 font-semibold transition active:scale-[0.98]', dark ? 'bg-white text-neutral-900' : 'bg-brand text-brand-ink')}>
            {text.cta || GUEST_PAGE_LABELS[page][lang]}
            <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </Shell>
  );
}

function HotelServicesSection({ s }: { s: Section }) {
  const { bundle, path } = useHotel();
  const text = useSectionText(s);
  const { openService } = useQuickAction();
  const services = bundle.catalog.hotel_services.slice(0, 6);
  if (!services.length) return null;
  const id = `sec-${s.id}`;
  return (
    <Shell s={s} labelledBy={id}>
      <SectionHeader id={id} title={text.title} subtitle={text.subtitle} dark={s.background === 'dark'} action={<ViewAll to={path('services')} dark={s.background === 'dark'} />} />
      <div className="grid gap-3 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
        {services.map((sv) => (
          <ServiceTile key={sv.id} service={sv} onClick={() => openService('hotel_services', sv)} />
        ))}
      </div>
    </Shell>
  );
}

function InfoSection({ s }: { s: Section }) {
  const { bundle, path } = useHotel();
  const { pick } = useI18n();
  const text = useSectionText(s);
  const items = bundle.catalog.info_items.filter((i) => i.category !== 'nearby').slice(0, 6);
  if (!items.length) return null;
  const id = `sec-${s.id}`;
  return (
    <Shell s={s} labelledBy={id}>
      <SectionHeader id={id} title={text.title} subtitle={text.subtitle} dark={s.background === 'dark'} action={<ViewAll to={path('info')} dark={s.background === 'dark'} />} />
      <ul className="grid gap-px overflow-hidden px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
        {items.map((i) => (
          <li key={i.id} className="flex min-w-0 items-center gap-4 border-b border-line py-4">
            <Icon name={i.icon as string} className="h-5 w-5 shrink-0 text-accent" />
            <InfoValue title={pick(i, 'title')} value={pick(i, 'highlight') || pick(i, 'body').split('\n')[0]} />
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function InfoValue({ title, value }: { title: string; value: string }) {
  if (!value) return <p className="min-w-0 flex-1 truncate font-semibold">{title}</p>;
  return (
    <div className="min-w-0 flex-1">
      <p className="text-sm text-muted">{title}</p>
      <p className="truncate font-semibold">{value}</p>
    </div>
  );
}

function GallerySection({ s }: { s: Section }) {
  const { bundle } = useHotel();
  const { lang } = useI18n();
  const text = useSectionText(s);
  const images = bundle.hotel.branding.gallery;
  if (!images.length) return null;
  const id = `sec-${s.id}`;
  return (
    <Shell s={s} labelledBy={id}>
      <SectionHeader id={id} title={text.title} subtitle={text.subtitle} dark={s.background === 'dark'} />
      <Row>
        {images.slice(0, 16).map((g, idx) => (
          <figure key={g.url + idx} className={cx('shrink-0 overflow-hidden rounded-[1.4rem]', idx % 3 === 0 ? 'w-[78%] sm:w-[46%]' : 'w-[56%] sm:w-[30%]')}>
            <Img src={g.url} alt={(lang === 'ar' ? g.caption_ar : g.caption_en) || ''} className="aspect-[4/5] w-full" />
          </figure>
        ))}
      </Row>
    </Shell>
  );
}

function ReviewsSection({ s }: { s: Section }) {
  const { bundle, slug } = useHotel();
  const { t, date } = useI18n();
  const text = useSectionText(s);
  const [writing, setWriting] = useState(false);
  const q = useQuery({
    queryKey: ['reviews', slug],
    queryFn: () => api<{ enabled: boolean; reviews: { id: string; guest_name: string; rating: number; title: string; body: string; created_at: string; lang: string }[]; average: number | null; count: number }>(`/public/hotels/${slug}/reviews`),
    enabled: bundle.hotel.settings.reviews_enabled,
  });
  if (!bundle.hotel.settings.reviews_enabled || !q.data?.enabled) return null;
  const id = `sec-${s.id}`;
  const dark = s.background === 'dark';
  return (
    <Shell s={s} labelledBy={id}>
      <SectionHeader
        id={id}
        title={text.title}
        subtitle={q.data.count ? `${q.data.average?.toFixed(1)} ★ · ${t('basedOn', { n: q.data.count })}` : text.subtitle}
        dark={dark}
        action={
          <Button size="sm" variant={dark ? 'light' : 'secondary'} onClick={() => setWriting(true)}>
            {t('writeReview')}
          </Button>
        }
      />
      {q.data.reviews.length === 0 && <p className={cx('px-5 sm:px-8', dark ? 'text-white/70' : 'text-muted')}>{t('firstReview')}</p>}
      {q.data.reviews.length > 0 && (
        <Row>
          {q.data.reviews.map((r) => (
            <figure key={r.id} className={cx('w-[82%] shrink-0 rounded-[1.4rem] p-6 sm:w-[44%] lg:w-[31%]', dark ? 'bg-white/5 ring-1 ring-white/10' : 'bg-surface ring-1 ring-line')}>
              <div className="flex gap-0.5 text-accent" aria-label={`${r.rating} / 5`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cx('h-4 w-4', i < r.rating ? 'fill-current' : 'opacity-25')} aria-hidden="true" />
                ))}
              </div>
              {r.title && <p className="mt-3 font-semibold">{r.title}</p>}
              <blockquote className={cx('mt-2 line-clamp-5 leading-relaxed', dark ? 'text-white/80' : 'text-muted')} lang={r.lang} dir="auto">
                {r.body}
              </blockquote>
              <figcaption className="mt-4 text-sm font-medium">
                {r.guest_name} · <span className="opacity-60">{date(r.created_at, { month: 'short', year: 'numeric' })}</span>
              </figcaption>
            </figure>
          ))}
        </Row>
      )}
      <ReviewSheet open={writing} onClose={() => setWriting(false)} />
    </Shell>
  );
}

function ContactSection({ s }: { s: Section }) {
  const { bundle } = useHotel();
  const { t, lang } = useI18n();
  const text = useSectionText(s);
  const p = bundle.hotel.profile;
  const id = `sec-${s.id}`;
  const dark = s.background === 'dark';
  const socials = Object.entries(p.social ?? {}).filter(([, v]) => v);
  return (
    <Shell s={s} labelledBy={id}>
      <SectionHeader id={id} title={text.title} subtitle={text.subtitle} dark={dark} />
      <div className="grid gap-3 px-5 sm:grid-cols-3 sm:px-8">
        {(lang === 'ar' ? p.address_ar : p.address_en) && (
          <a href={p.map_url || undefined} target="_blank" rel="noopener noreferrer" className={cx('flex items-start gap-3 rounded-[1.35rem] p-5 ring-1', dark ? 'ring-white/15' : 'bg-surface ring-line')}>
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <span>
              <span className="block font-semibold">{t('directions')}</span>
              <span className={cx('mt-1 block text-sm leading-relaxed', dark ? 'text-white/70' : 'text-muted')}>{lang === 'ar' ? p.address_ar : p.address_en}</span>
            </span>
          </a>
        )}
        {p.phone && (
          <a href={`tel:${p.phone.replace(/\s/g, '')}`} className={cx('flex items-start gap-3 rounded-[1.35rem] p-5 ring-1', dark ? 'ring-white/15' : 'bg-surface ring-line')}>
            <Phone className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <span>
              <span className="block font-semibold">{t('call')}</span>
              <span className="ltr-nums mt-1 block text-sm">{p.phone}</span>
            </span>
          </a>
        )}
        {p.email && (
          <a href={`mailto:${p.email}`} className={cx('flex items-start gap-3 rounded-[1.35rem] p-5 ring-1', dark ? 'ring-white/15' : 'bg-surface ring-line')}>
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block font-semibold">{t('email')}</span>
              <span className="mt-1 block truncate text-sm">{p.email}</span>
            </span>
          </a>
        )}
      </div>
      {socials.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-2 px-5 sm:px-8">
          {socials.map(([k, v]) => (
            <li key={k}>
              <a href={v as string} target="_blank" rel="noopener noreferrer" className={cx('inline-flex h-10 items-center rounded-full px-4 text-sm font-medium capitalize ring-1', dark ? 'ring-white/20' : 'ring-line')}>
                {k === 'x' ? 'X' : k}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

function CustomSection({ s }: { s: Section }) {
  const { path } = useHotel();
  const text = useSectionText(s);
  const id = `sec-${s.id}`;
  const dark = s.background === 'dark' || s.background === 'brand';
  if (!text.title && !text.body) return null;
  return (
    <Shell s={s} labelledBy={id}>
      <div className={cx('grid items-center gap-8 px-5 sm:px-8', s.image && 'md:grid-cols-2')}>
        {s.image && <Img src={s.image} alt="" className="aspect-[4/3] w-full rounded-[1.6rem]" />}
        <div>
          <h2 id={id} className="display text-[2rem] leading-tight sm:text-4xl">
            {text.title}
          </h2>
          {text.subtitle && <p className={cx('mt-3 text-lg', dark ? 'text-white/80' : 'text-muted')}>{text.subtitle}</p>}
          {text.body && <p className={cx('mt-4 whitespace-pre-line leading-relaxed', dark ? 'text-white/75' : 'text-muted')}>{text.body}</p>}
          {text.cta && s.cta_page !== 'none' && (
            <Link to={path(s.cta_page)} className={cx('mt-6 inline-flex h-12 items-center rounded-full px-6 font-semibold', dark ? 'bg-white text-neutral-900' : 'bg-brand text-brand-ink')}>
              {text.cta}
            </Link>
          )}
        </div>
      </div>
    </Shell>
  );
}
