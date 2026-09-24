import { BedDouble } from 'lucide-react';
import { useMemo } from 'react';
import { useI18n } from '../../lib/i18n';
import { EmptyState } from '../../components/ui';
import { useQuickAction } from '../actions';
import { SectionHeader, ServiceTile } from '../components/cards';
import { usePageTitle } from '../components/usePageTitle';
import { useHotel } from '../hotel';
import { useGuestSession } from '../session';
import { ENTITIES } from '@shared/entities';
import type { ServiceRec } from '../types';

/** Services for the guest's own room (not room sales). */
export function RoomServices() {
  const { bundle } = useHotel();
  return <ServiceCatalog title={usePageTitle('room_services')} entity="room_services" services={bundle.catalog.room_services} />;
}

export function ServiceCatalog({ title, entity, services, lead }: { title: string; entity: 'room_services' | 'hotel_services'; services: ServiceRec[]; lead?: string }) {
  const { t, lang } = useI18n();
  const { identity } = useGuestSession();
  const { openService } = useQuickAction();
  const catField = ENTITIES[entity].fields.find((f) => f.key === 'category');
  const groups = useMemo(() => {
    const order = (catField?.options ?? []).map((o) => o.value);
    const map = new Map<string, ServiceRec[]>();
    for (const s of services) map.set(s.category, [...(map.get(s.category) ?? []), s]);
    return [...map.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [services, catField]);

  return (
    <div className="mx-auto max-w-6xl pt-8 pb-10">
      <SectionHeader as="h1" title={title} subtitle={entity === 'room_services' && identity?.type === 'IN_HOUSE' ? `${t('room')} ${identity.room}` : lead} />
      {entity === 'room_services' && identity?.type !== 'IN_HOUSE' && (
        <p className="mx-5 mb-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:mx-8">{t('inHouseOnly')}</p>
      )}
      {!services.length ? (
        <EmptyState icon={<BedDouble className="h-6 w-6" />} title={t('noResults')} description={t('comingSoon')} />
      ) : (
        <div className="space-y-10">
          {groups.map(([cat, list]) => (
            <section key={cat} aria-labelledby={`grp-${cat}`} className="px-5 sm:px-8">
              {groups.length > 1 && (
                <h2 id={`grp-${cat}`} className="eyebrow mb-3 text-muted">
                  {catField?.options?.find((o) => o.value === cat)?.[lang] ?? cat}
                </h2>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((s) => (
                  <ServiceTile key={s.id} service={s} onClick={() => openService(entity, s)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
