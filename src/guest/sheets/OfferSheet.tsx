import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../lib/i18n';
import { Button, Sheet } from '../../components/ui';
import { MediaBackground } from '../components/MediaBackground';
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
      {pick(offer, 'price_label') && <p className="mb-3 text-xl font-semibold text-accent">{pick(offer, 'price_label')}</p>}
      {pick(offer, 'description') && <p className="whitespace-pre-line leading-relaxed text-muted">{pick(offer, 'description')}</p>}
      {typeof offer.ends_at === 'string' && offer.ends_at && <p className="mt-4 text-sm text-muted">⏳ {date(offer.ends_at, { dateStyle: 'medium' })}</p>}
    </Sheet>
  );
}
