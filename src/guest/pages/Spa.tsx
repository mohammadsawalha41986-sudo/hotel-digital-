import { Clock, Flower2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../../lib/i18n';
import { Badge, Button, EmptyState, Img, cx } from '../../components/ui';
import { HoursLine, OfferCard } from '../components/cards';
import { usePageTitle } from '../components/usePageTitle';
import { OfferSheet } from '../sheets/OfferSheet';
import { useFlow } from '../flow';
import { useHotel } from '../hotel';
import type { Rec } from '../types';

export function Spa() {
  const { bundle } = useHotel();
  const { t, pick, money } = useI18n();
  const flow = useFlow();
  const title = usePageTitle('spa');
  const [params, setParams] = useSearchParams();
  const cats = bundle.catalog.spa_categories;
  const [active, setActive] = useState(params.get('category') ?? cats[0]?.id ?? '');
  const [offer, setOffer] = useState<Rec | null>(null);
  const offers = bundle.catalog.offers.filter((o) => (o.placement as string[] | undefined)?.includes('spa'));

  useEffect(() => {
    if (!cats.some((c) => c.id === active) && cats[0]) setActive(cats[0].id);
  }, [cats, active]);

  const cat = cats.find((c) => c.id === active);
  const services = bundle.catalog.spa_services.filter((s) => s.parent_id === active);

  if (!cats.length) return <EmptyState icon={<Flower2 className="h-6 w-6" />} title={t('noResults')} description={t('comingSoon')} />;

  return (
    <div className="pb-10">
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0">
          <Img src={cat?.image as string} alt="" eager className="h-full w-full opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/20" />
        </div>
        <div className="relative mx-auto max-w-6xl px-5 pt-14 pb-8 sm:px-8 sm:pt-20">
          <h1 className="display text-[2.6rem] leading-tight sm:text-6xl">{title}</h1>
          {cat && pick(cat, 'description') && <p className="mt-3 max-w-2xl leading-relaxed text-white/75">{pick(cat, 'description').split('\n')[0]}</p>}
          <div className="no-scrollbar -mx-5 mt-8 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0" role="tablist" aria-label={title}>
            {cats.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={c.id === active}
                onClick={() => {
                  setActive(c.id);
                  setParams((p) => {
                    p.set('category', c.id);
                    return p;
                  }, { replace: true });
                }}
                className={cx('h-11 shrink-0 rounded-full px-5 text-sm font-semibold transition', c.id === active ? 'bg-white text-neutral-900' : 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20')}
              >
                {pick(c, 'name')}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {offers.length > 0 && (
          <div className="mt-8">
            <OfferCard offer={offers[0]} onOpen={() => setOffer(offers[0])} />
          </div>
        )}
        {cat && (
          <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted">
            <Clock className="h-4 w-4" aria-hidden="true" />
            <HoursLine rec={cat} />
          </p>
        )}
        {!services.length ? (
          <EmptyState title={t('noResults')} description={t('comingSoon')} />
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="tabpanel">
            {services.map((s) => (
              <li key={s.id} className="flex flex-col overflow-hidden rounded-[1.5rem] bg-surface ring-1 ring-line">
                <Img src={s.image || (cat?.image as string)} alt="" className="aspect-[16/10] w-full" />
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="text-lg font-semibold">{pick(s, 'name')}</h2>
                  {pick(s, 'description') && <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted">{pick(s, 'description')}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {s.duration_minutes && <Badge>{t('duration', { n: s.duration_minutes })}</Badge>}
                    {s.available === false && <Badge>{t('unavailable')}</Badge>}
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                    <span className="font-semibold">{s.price ? money(s.price) : pick(s, 'price_note') || t('priceOnRequest')}</span>
                    {s.bookable !== false ? (
                      <Button size="sm" disabled={s.available === false} onClick={() => flow.open({ kind: 'spa', service: s })}>
                        {t('bookTreatment')}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted">{t('requestNotBookable')}</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <OfferSheet offer={offer} onClose={() => setOffer(null)} />
    </div>
  );
}
