import { Tag } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../lib/i18n';
import { EmptyState } from '../../components/ui';
import { OfferCard, SectionHeader } from '../components/cards';
import { usePageTitle } from '../components/usePageTitle';
import { OfferSheet } from '../sheets/OfferSheet';
import { useHotel } from '../hotel';
import type { Rec } from '../types';

export function Offers() {
  const { bundle } = useHotel();
  const { t } = useI18n();
  const [open, setOpen] = useState<Rec | null>(null);
  const offers = bundle.catalog.offers;
  return (
    <div className="mx-auto max-w-6xl pt-8 pb-10">
      <SectionHeader as="h1" title={usePageTitle('offers')} />
      {!offers.length ? (
        <EmptyState icon={<Tag className="h-6 w-6" />} title={t('noResults')} description={t('comingSoon')} />
      ) : (
        <div className="grid gap-4 px-5 sm:px-8 lg:grid-cols-2">
          {offers.map((o) => (
            <OfferCard key={o.id} offer={o} onOpen={() => setOpen(o)} />
          ))}
        </div>
      )}
      <OfferSheet offer={open} onClose={() => setOpen(null)} />
    </div>
  );
}
