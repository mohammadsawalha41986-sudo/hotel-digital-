import { useEffect, useState } from 'react';
import { useAdminHotel, useEntities, type EntityRecord } from '../data';
import { EntityManager } from '../components/EntityManager';
import { PageHeader } from '../layout/AdminLayout';
import { tr } from '../i18n';

export function LaundryAdmin({ hid }: { hid: string }) {
  const hotel = useAdminHotel(hid);
  const cats = useEntities(hid, 'laundry_categories');
  const [cat, setCat] = useState<EntityRecord | null>(null);
  useEffect(() => {
    if (cats.data && (!cat || !cats.data.some((c) => c.id === cat.id))) setCat(cats.data[0] ?? null);
  }, [cats.data, cat]);
  const currency = hotel.data?.profile.currency;
  return (
    <>
      <PageHeader
        title={tr('Laundry')}
        description={tr('Categories (gentlemen, ladies, traditional wear…) each contain garments with wash, dry-clean and press prices. Leave a price empty when that service is not offered.')}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <EntityManager hid={hid} entity="laundry_categories" compact onOpen={setCat} selectedId={cat?.id} title={tr('Categories')} />
        {cat ? (
          <EntityManager hid={hid} entity="laundry_items" parentId={cat.id} currency={currency} title={tr('Garments · {0}', { 0: String(cat.name_en) })} />
        ) : (
          <p className="rounded-2xl border border-dashed border-black/15 p-6 text-sm text-zinc-500">{tr('Add a category to start.')}</p>
        )}
      </div>
      <div className="mt-6">
        <EntityManager hid={hid} entity="laundry_packages" currency={currency} title={tr('Packages')} />
      </div>
    </>
  );
}
