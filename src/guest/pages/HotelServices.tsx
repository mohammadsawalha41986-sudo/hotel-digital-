import { useHotel } from '../hotel';
import { usePageTitle } from '../components/usePageTitle';
import { ServiceCatalog } from './RoomServices';

export function HotelServices() {
  const { bundle } = useHotel();
  return <ServiceCatalog title={usePageTitle('services')} entity="hotel_services" services={bundle.catalog.hotel_services} />;
}
