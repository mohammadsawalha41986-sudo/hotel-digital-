import { GUEST_PAGE_LABELS, type GuestPage } from '@shared/domain';
import { useI18n } from '../../lib/i18n';
import { useHotel } from '../hotel';

/** Page heading: the navigation label configured by the hotel, else the default. */
export function usePageTitle(page: GuestPage): string {
  const { bundle } = useHotel();
  const { lang } = useI18n();
  const nav = bundle.site.navigation.find((n) => n.page === page);
  return (lang === 'ar' ? nav?.label_ar : nav?.label_en) || GUEST_PAGE_LABELS[page][lang];
}
