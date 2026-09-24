import { track } from './track';
import { useNavigate } from 'react-router-dom';
import type { GuestPage } from '@shared/domain';
import { useI18n } from '../lib/i18n';
import { useFlow } from './flow';
import { useHotel } from './hotel';
import { useGuestSession } from './session';
import type { Rec, ServiceRec } from './types';

/** Resolves an admin-configured quick action into a guest interaction. */
export function useQuickAction() {
  const { bundle, path, slug } = useHotel();
  const flow = useFlow();
  const navigate = useNavigate();
  const { lang } = useI18n();
  const { identity } = useGuestSession();

  const phoneFor = (dept: string, emphasis: boolean) => {
    const d = bundle.departments.find((x) => x.code === dept);
    return (emphasis && bundle.hotel.settings.emergency_phone) || d?.phone || bundle.hotel.profile.phone;
  };

  const resolve = (a: Rec): { run: () => void; available: boolean; href?: string } => {
    switch (a.action) {
      case 'room_service': {
        const s = bundle.catalog.room_services.find((x) => x.id === a.room_service_id) as ServiceRec | undefined;
        return { available: !!s && s.available !== false, run: () => s && openService('room_services', s) };
      }
      case 'hotel_service': {
        const s = bundle.catalog.hotel_services.find((x) => x.id === a.hotel_service_id) as ServiceRec | undefined;
        return { available: !!s && s.available !== false, run: () => s && openService('hotel_services', s) };
      }
      case 'page':
        return { available: true, run: () => navigate(path(a.page as GuestPage)) };
      case 'call': {
        const phone = phoneFor(String(a.department), !!a.emphasis);
        return { available: !!phone, href: phone ? `tel:${phone.replace(/\s/g, '')}` : undefined, run: () => phone && (window.location.href = `tel:${phone.replace(/\s/g, '')}`) };
      }
      case 'whatsapp': {
        const d = bundle.departments.find((x) => x.code === a.department);
        const room = identity?.type === 'IN_HOUSE' ? identity.room : '';
        const href = `/api/public/hotels/${slug}/whatsapp/${a.department}?lang=${lang}&room=${encodeURIComponent(room)}`;
        return {
          available: !!d?.has_whatsapp,
          href,
          run: () => {
            track('whatsapp_click', { target_type: 'department', target_code: String(a.department) });
            window.open(href, '_blank', 'noopener');
          },
        };
      }
      case 'feedback':
        return { available: true, run: () => navigate(path('feedback')) };
      default:
        return { available: false, run: () => undefined };
    }
  };

  const openService = (entity: 'room_services' | 'hotel_services', service: ServiceRec) => {
    if (entity === 'room_services' && identity?.type !== 'IN_HOUSE') {
      flow.open({ kind: 'identity', reason: 'in_house_required' });
      return;
    }
    track('service_view', { target_type: entity === 'room_services' ? 'room_service' : 'hotel_service', target_code: String(service.code ?? '') });
    flow.open({ kind: 'service', entity, service });
  };

  return { resolve, openService };
}
