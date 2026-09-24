import { ENTITIES, type EntityName } from '@shared/entities';
import { useAdminHotel } from '../data';
import { EntityManager } from '../components/EntityManager';
import { PageHeader } from '../layout/AdminLayout';

export function EntityPage({ hid, entity, description }: { hid: string; entity: EntityName; description: string }) {
  const hotel = useAdminHotel(hid);
  return (
    <>
      <PageHeader title={ENTITIES[entity].label.plural} description={description} />
      <EntityManager hid={hid} entity={entity} currency={hotel.data?.profile.currency} />
    </>
  );
}
