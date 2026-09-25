import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GUEST_PAGE_LABELS } from '@shared/domain';
import type { HeroSlide } from '@shared/hotel';
import { useI18n } from '../../lib/i18n';
import { cx } from '../../components/ui';
import { useHotel } from '../hotel';
import { useGuestSession } from '../session';
import { MediaBackground } from './MediaBackground';
import { DUR, EASE } from './motion';

/** Local-time greeting in the hotel's time zone. */
function useGreeting() {
  const { bundle } = useHotel();
  const { t } = useI18n();
  return useMemo(() => {
    let h = new Date().getHours();
    try {
      h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: bundle.hotel.profile.timezone }).format(new Date()));
    } catch {
      /* browser without that zone: local hour */
    }
    return h < 12 ? t('goodMorning') : h < 18 ? t('goodAfternoon') : t('goodEvening');
  }, [bundle.hotel.profile.timezone, t]);
}

/**
 * Homepage hero: full-bleed image/video slides with the hotel's own words, the
 * guest's context (name, room) and two clear actions. Deliberately shorter on
 * phones so the services below are visible without scrolling far.
 */
export function Hero() {
  const { bundle, path } = useHotel();
  const { t, lang } = useI18n();
  const { identity } = useGuestSession();
  const greeting = useGreeting();
  const reduce = useReducedMotion();
  const slides = bundle.site.hero.slides;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const interval = bundle.site.hero.autoplay_seconds;
  const p = bundle.hotel.profile;

  useEffect(() => {
    if (slides.length < 2 || !interval || paused || reduce) return;
    const id = window.setInterval(() => setI((x) => (x + 1) % slides.length), interval * 1000);
    return () => window.clearInterval(id);
  }, [slides.length, interval, paused, reduce]);

  const fallback: HeroSlide = {
    id: 'fallback', media_type: 'image', image: bundle.hotel.branding.gallery[0]?.url ?? '', video: '', overlay: 45,
    headline_en: p.name_en, headline_ar: p.name_ar, subtitle_en: p.tagline_en, subtitle_ar: p.tagline_ar,
    cta_label_en: '', cta_label_ar: '', cta_page: 'none', starts_at: null, ends_at: null, visible: true,
  };
  const s = slides[i] ?? fallback;
  const headline = (lang === 'ar' ? s.headline_ar || s.headline_en : s.headline_en || s.headline_ar) || (lang === 'ar' ? p.name_ar : p.name_en);
  const subtitle = (lang === 'ar' ? s.subtitle_ar : s.subtitle_en) || (s.headline_en || s.headline_ar ? '' : lang === 'ar' ? p.tagline_ar : p.tagline_en);
  const cta = lang === 'ar' ? s.cta_label_ar : s.cta_label_en;
  const firstName = identity?.name?.trim().split(/\s+/)[0];
  const room = identity?.type === 'IN_HOUSE' ? identity.room : '';

  // Secondary action: in-room dining for in-house guests when an outlet delivers, otherwise Dining.
  const inRoom = bundle.catalog.outlets.find((o) => o.type === 'room_service' || (o.room_delivery && o.accepts_orders));
  const secondary = room && inRoom ? { to: path(`dining/${inRoom.id}`), label: t('orderToRoom') } : bundle.catalog.outlets.length ? { to: path('dining'), label: GUEST_PAGE_LABELS.dining[lang] } : null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={lang === 'ar' ? p.name_ar : p.name_en}
      className="relative h-[min(70svh,640px)] min-h-[460px] overflow-hidden bg-ink text-white lg:h-[min(86vh,860px)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <AnimatePresence initial={false}>
        <motion.div key={s.id} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 1.1 }}>
          <MediaBackground image={s.image} video={s.media_type === 'video' ? s.video : ''} alt="" eager={i === 0} kenBurns={!reduce} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgb(0 0 0 / ${s.overlay / 250}) 0%, rgb(0 0 0 / ${s.overlay / 180}) 40%, rgb(0 0 0 / ${Math.min(0.92, s.overlay / 65)}) 100%)` }} />
        </motion.div>
      </AnimatePresence>

      <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-5 pb-14 sm:px-8 lg:pb-20">
        {(firstName || room) && (
          <motion.p initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR.slow, ease: EASE }} className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/12 px-3.5 py-1.5 text-sm font-medium ring-1 ring-white/20 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            {greeting}
            {firstName ? `${lang === 'ar' ? '،' : ','} ${firstName}` : ''}
            {room && <span className="text-white/70">· {t('roomN', { room })}</span>}
          </motion.p>
        )}
        <AnimatePresence mode="wait">
          <motion.div key={s.id} initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -8 }} transition={{ duration: DUR.slow, ease: EASE, delay: 0.1 }} className="max-w-2xl">
            <p className="eyebrow text-accent">{lang === 'ar' ? p.city_ar : p.city_en}</p>
            {headline && <h1 className="display mt-2 text-[2.5rem] leading-[1.04] sm:text-6xl lg:text-7xl">{headline}</h1>}
            {subtitle && <p className="mt-3 max-w-xl text-[1.02rem] leading-relaxed text-white/85 sm:text-lg">{subtitle}</p>}
          </motion.div>
        </AnimatePresence>
        <div className="mt-6 flex flex-wrap gap-3">
          {cta && s.cta_page !== 'none' ? (
            <Link to={path(s.cta_page)} className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 font-semibold text-neutral-900 shadow-lg transition hover:bg-white/90 active:scale-[0.98]">
              {cta}
              <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          ) : (
            <a href="#explore" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 font-semibold text-neutral-900 shadow-lg transition hover:bg-white/90 active:scale-[0.98]">
              {t('exploreServices')}
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
          {secondary && !(cta && s.cta_page === 'dining') && secondary.label.trim().toLowerCase() !== (cta || '').trim().toLowerCase() && (
            <Link to={secondary.to} className="inline-flex h-12 items-center rounded-full bg-white/12 px-6 font-semibold text-white ring-1 ring-white/35 backdrop-blur-md transition hover:bg-white/20 active:scale-[0.98]">
              {secondary.label}
            </Link>
          )}
        </div>

        {slides.length > 1 && (
          <div className="mt-7 flex items-center gap-2" role="tablist" aria-label={t('slide', { n: '' }).trim()}>
            {slides.map((sl, idx) => (
              <button key={sl.id} type="button" role="tab" aria-selected={idx === i} aria-label={t('slide', { n: idx + 1 })} onClick={() => setI(idx)} className="group flex h-8 items-center">
                <span className={cx('block h-[3px] rounded-full transition-all duration-500', idx === i ? 'w-10 bg-white' : 'w-5 bg-white/40 group-hover:bg-white/70')} />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
