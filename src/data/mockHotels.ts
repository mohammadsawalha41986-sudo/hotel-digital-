import { Hotel } from '../types/hotel';
import { SWISS_FLORA_ROYAL_HOTEL, SWISS_FLORA_INN_HOTEL } from './swissFloraData';

export const INITIAL_HOTELS: Hotel[] = [
  SWISS_FLORA_ROYAL_HOTEL,
  SWISS_FLORA_INN_HOTEL,
];

export const MOCK_HOTELS: Hotel[] = INITIAL_HOTELS;
export const MOCK_ROOMS = INITIAL_HOTELS.flatMap((h) => h.rooms);
export const MOCK_OFFERS = INITIAL_HOTELS.flatMap((h) => h.offers);
export const MOCK_DINING = INITIAL_HOTELS.flatMap((h) => h.diningVenues);
export const MOCK_WELLNESS = INITIAL_HOTELS.flatMap((h) => h.wellnessFacilities);
export const MOCK_SERVICES = INITIAL_HOTELS.flatMap((h) => h.services);
