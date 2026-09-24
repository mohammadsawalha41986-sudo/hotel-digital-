import { useEffect, useState } from 'react';
import { useAdminHotel, useEntities, type EntityRecord } from '../data';
import { EntityManager } from '../components/EntityManager';
import { PageHeader } from '../layout/AdminLayout';

export function SpaAdmin({ hid }: { hid: string }) {
  const hotel = useAdminHotel(hid);
  const cats = useEntities(hid, 'spa_categories');
  const [cat, setCat] = useState<EntityRecord | null>(null);
  useEffect(() => {
    if (cats.data && (!cat || !cats.data.some((c) => c.id === cat.id))) setCat(cats.data[0] ?? null);
  }, [cats.data, cat]);
  return (
    <>
      <PageHeader title="Wellness & spa" description="Categories (massage, pool, gym…) each contain services. Bookable services let guests request a preferred date and time." />
      <div className="grid gap-4 xl:grid-cols-[22rem_1fr]">
        <EntityManager hid={hid} entity="spa_categories" compact onOpen={setCat} title="Categories" />
        {cat ? (
          <EntityManager hid={hid} entity="spa_services" parentId={cat.id} currency={hotel.data?.profile.currency} title={`Services · ${String(cat.name_en)}`} />
        ) : (
          <p className="rounded-2xl border border-dashed border-black/15 p-6 text-sm text-zinc-500">Add a category to start.</p>
        )}
      </div>
    </>
  );
}
