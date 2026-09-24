import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { HeroSlide } from '@shared/hotel';
import { useI18n } from '../../lib/i18n';
import { cx } from '../../components/ui';
import { useHotel } from '../hotel';
import { MediaBackground } from './MediaBackground';

export function Hero() {
  const { bundle, path } = useHotel();
  const { t, lang } = useI18n();
  const slides = bundle.site.hero.slides;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const interval = bundle.site.hero.autoplay_seconds;
  const p = bundle.hotel.profile;

  useEffect(() => {
    if (slides.length < 2 || !interval || paused) return;
    const id = window.setInterval(() => setI((x) => (x + 1) % slides.length), interval * 1000);
    return () => window.clearInterval(id);
  }, [slides.length, interval, paused]);

  const fallback: HeroSlide = {
    id: 'fallback', media_type: 'image', image: bundle.hotel.branding.gallery[0]?.url ?? '', video: '', overlay: 45,
    headline_en: p.name_en, headline_ar: p.name_ar, subtitle_en: p.tagline_en, subtitle_ar: p.tagline_ar,
    cta_label_en: '', cta_label_ar: '', cta_page: 'none', starts_at: null, ends_at: null, visible: true,
  };
  const s = slides[i] ?? fallback;
  const headline = (lang === 'ar' ? s.headline_ar : s.headline_en) || (i === 0 ? (lang === 'ar' ? p.name_ar : p.name_en) : '');
  const subtitle = lang === 'ar' ? s.subtitle_ar : s.subtitle_en;
  const cta = lang === 'ar' ? s.cta_label_ar : s.cta_label_en;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={lang === 'ar' ? p.name_ar : p.name_en}
      className="relative h-[82svh] min-h-[520px] overflow-hidden bg-ink text-white lg:h-[88vh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <AnimatePresence initial={false}>
        <motion.div key={s.id} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.1 }}>
          <MediaBackground image={s.image} video={s.media_type === 'video' ? s.video : ''} alt="" eager={i === 0} kenBurns />
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgb(0 0 0 / ${s.overlay / 250}) 0%, rgb(0 0 0 / ${s.overlay / 180}) 45%, rgb(0 0 0 / ${Math.min(0.92, s.overlay / 70)}) 100%)` }} />
        </motion.div>
      </AnimatePresence>

      <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-5 pb-16 sm:px-8 lg:pb-24">
        <AnimatePresence mode="wait">
          <motion.div key={s.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.6, delay: 0.15 }} className="max-w-2xl">
            <p className="eyebrow text-accent">{lang === 'ar' ? p.city_ar : p.city_en}</p>
            {headline && <h1 className="display mt-3 text-[2.75rem] leading-[1.02] sm:text-6xl lg:text-7xl">{headline}</h1>}
            {subtitle && <p className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-white/85 sm:text-lg">{subtitle}</p>}
            {cta && s.cta_page !== 'none' && (
              <Link to={path(s.cta_page)} className="mt-7 inline-flex h-13 items-center rounded-full bg-white px-7 font-semibold text-neutral-900 shadow-lg transition hover:bg-white/90 active:scale-[0.98]">
                {cta}
              </Link>
            )}
          </motion.div>
        </AnimatePresence>

        {slides.length > 1 && (
          <div className="mt-8 flex items-center gap-2" role="tablist" aria-label="Slides">
            {slides.map((sl, idx) => (
              <button
                key={sl.id}
                type="button"
                role="tab"
                aria-selected={idx === i}
                aria-label={t('slide', { n: idx + 1 })}
                onClick={() => setI(idx)}
                className="group flex h-8 items-center"
              >
                <span className={cx('block h-[3px] rounded-full transition-all duration-500', idx === i ? 'w-10 bg-white' : 'w-5 bg-white/40 group-hover:bg-white/70')} />
              </button>
            ))}
          </div>
        )}
      </div>
      <ChevronDown className="absolute bottom-4 left-1/2 h-5 w-5 -translate-x-1/2 animate-bounce text-white/60" aria-hidden="true" />
    </section>
  );
}
