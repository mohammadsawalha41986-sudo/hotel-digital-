import { createContext, useContext } from 'react';
import type { GuestPage } from '@shared/domain';
import type { PublicBundle } from './types';

export interface HotelCtx {
  bundle: PublicBundle;
  slug: string;
  base: string;
  /** Path for a guest page, preserving the preview flag. */
  path: (page: GuestPage | string) => string;
}

export const HotelContext = createContext<HotelCtx | null>(null);

export function useHotel() {
  const v = useContext(HotelContext);
  if (!v) throw new Error('useHotel outside provider');
  return v;
}

export const PAGE_SEGMENT: Record<GuestPage, string> = {
  home: '',
  dining: 'dining',
  room_services: 'room-services',
  spa: 'spa',
  laundry: 'laundry',
  services: 'services',
  info: 'info',
  feedback: 'feedback',
  requests: 'requests',
  offers: 'offers',
};
