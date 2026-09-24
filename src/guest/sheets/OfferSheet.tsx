import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../lib/i18n';
import { Button, Sheet } from '../../components/ui';
import { MediaBackground } from '../components/MediaBackground';
import { MerchBadges, PriceBlock } from '../components/sell';
import { useHotel } from '../hotel';
import type { Rec } from '../types';
import type { GuestPage } from '@shared/domain';

export function OfferSheet({ offer, onClose }: { offer: Rec | null; onClose: () => void }) {
  const { t, pick, date } = useI18n();
  const { path } = useHotel();
  const navigate = useNavigate();
  if (!offer) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;
  const cta = pick(offer, 'cta_label');
  const page = offer.cta_page as GuestPage | 'none';
  const go = () => {
    onClose();
    if (page === 'dining' && offer.cta_outlet_id) navigate(path(`dining/${offer.cta_outlet_id}`));
    else if (page === 'spa' && offer.cta_spa_category_id) navigate(`${path('spa')}${path('spa').includes('?') ? '&' : '?'}category=${offer.cta_spa_category_id}`);
    else if (page !== 'none') navigate(path(page));
  };
  return (
    <Sheet
      open={!!offer}
      onClose={onClose}
      title={pick(offer, 'title')}
      description={pick(offer, 'subtitle')}
      closeLabel={t('close')}
      footer={
        cta && page !== 'none' ? (
          <Button size="lg" block onClick={go}>
            {cta}
          </Button>
        ) : undefined
      }
    >
      <div className="relative mb-5 aspect-[16/10] overflow-hidden rounded-2xl">
        <MediaBackground image={offer.image as string} video={offer.video as string} alt="" />
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <PriceBlock original={offer.original_price as number | null} price={offer.offer_price as number | null} label={pick(offer, 'price_label')} size="lg" />
        <MerchBadges rec={offer} />
      </div>
      {pick(offer, 'description') && <p className="whitespace-pre-line leading-relaxed text-muted">{pick(offer, 'description')}</p>}
      {pick(offer, 'terms') && <p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed whitespace-pre-line text-muted">{pick(offer, 'terms')}</p>}
      {typeof offer.ends_at === 'string' && offer.ends_at && <p className="mt-3 text-sm font-medium text-muted">{t('validUntil', { date: date(offer.ends_at, { dateStyle: 'medium' }) })}</p>}
    </Sheet>
  );
}
