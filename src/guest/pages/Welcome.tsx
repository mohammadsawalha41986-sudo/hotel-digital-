import { motion } from 'motion/react';
import { Star } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { Img } from '../../components/ui';
import { MediaBackground } from '../components/MediaBackground';
import { IdentityForm } from '../components/IdentityForm';
import { useHotel } from '../hotel';
import { useGuestSession } from '../session';

/** QR landing: brand moment, language choice, then one-time identification. */
export function Welcome() {
  const { bundle } = useHotel();
  const { t, lang } = useI18n();
  const { langChosen, setLang } = useGuestSession();
  const p = bundle.hotel.profile;
  const b = bundle.hotel.branding;
  const w = bundle.site.welcome;
  const image = w.image || bundle.site.hero.slides.find((s) => s.image)?.image || b.gallery[0]?.url || '';
  const name = lang === 'ar' ? p.name_ar : p.name_en;
  const both = p.language_mode === 'both';
  const title = (lang === 'ar' ? w.title_ar : w.title_en) || `${t('welcomeTo')} ${name}`;
  const message = lang === 'ar' ? w.message_ar : w.message_en;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-ink text-white lg:grid lg:grid-cols-[1.15fr_1fr]">
      <div className="absolute inset-0 lg:relative">
        <MediaBackground image={image} video={w.video} alt="" eager />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/25 to-black/85 lg:bg-gradient-to-t lg:from-black/70 lg:via-black/10 lg:to-black/30" />
      </div>

      <div className="relative flex min-h-dvh flex-col px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:min-h-0 lg:bg-canvas lg:px-14 lg:py-14 lg:text-fg">
        <div className="flex items-center justify-between">
          {b.logo_inverse || b.logo ? (
            <Img src={b.logo_inverse || b.logo} alt={name} eager className="h-12 w-40 bg-transparent [&_img]:object-contain [&_img]:object-left rtl:[&_img]:object-right lg:hidden" />
          ) : (
            <span />
          )}
          {b.logo && <Img src={b.logo} alt={name} eager className="hidden h-12 w-40 bg-transparent lg:block [&_img]:object-contain [&_img]:object-left rtl:[&_img]:object-right" />}
          {langChosen && both && (
            <button type="button" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="rounded-full px-3 py-2 text-sm font-semibold ring-1 ring-white/40 lg:ring-line" lang={lang === 'ar' ? 'en' : 'ar'}>
              {lang === 'ar' ? 'English' : 'العربية'}
            </button>
          )}
        </div>

        <div className="mt-auto lg:mt-16">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex items-center gap-1 text-accent" aria-label={`${p.stars} stars`}>
              {Array.from({ length: p.stars }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              ))}
            </div>
            <p className="eyebrow mt-4 opacity-80">{name}</p>
            <h1 className="display mt-2 text-[2.6rem] leading-[1.05] sm:text-5xl">{title}</h1>
            {message && <p className="mt-4 max-w-md text-[1.02rem] leading-relaxed opacity-85 lg:text-muted lg:opacity-100">{message}</p>}
          </motion.div>

          {!langChosen ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }} className="mt-10">
              <p className="mb-3 text-sm font-medium opacity-80">
                <span lang="en">Choose your language</span> · <span lang="ar">اختر لغتك</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setLang('ar')} lang="ar" className="h-14 rounded-full bg-white text-lg font-bold text-neutral-900 transition active:scale-[0.98] lg:bg-ink lg:text-white">
                  العربية
                </button>
                <button type="button" onClick={() => setLang('en')} lang="en" className="h-14 rounded-full bg-white/10 text-lg font-semibold ring-1 ring-white/50 backdrop-blur transition active:scale-[0.98] lg:bg-transparent lg:ring-line">
                  English
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              aria-labelledby="identify-title"
              className="mt-8 rounded-[1.75rem] bg-surface p-5 text-fg shadow-2xl sm:p-6 lg:mt-10 lg:bg-transparent lg:p-0 lg:shadow-none"
            >
              <h2 id="identify-title" className="text-xl font-semibold">
                {t('identifyTitle')}
              </h2>
              <p className="mt-1 mb-5 text-sm text-muted">{t('identifyLead')}</p>
              <IdentityForm submitLabel={t('startExploring')} />
            </motion.section>
          )}
        </div>
      </div>
    </div>
  );
}
