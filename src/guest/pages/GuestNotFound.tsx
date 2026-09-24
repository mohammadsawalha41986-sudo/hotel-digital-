import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../lib/i18n';
import { EmptyState } from '../../components/ui';
import { useHotel } from '../hotel';

export function GuestNotFound() {
  const { t } = useI18n();
  const { path } = useHotel();
  return (
    <div className="mx-auto max-w-xl pt-16">
      <EmptyState
        icon={<Compass className="h-6 w-6" />}
        title={t('notFoundTitle')}
        description={t('notFoundLead')}
        action={
          <Link to={path('home')} className="inline-flex h-11 items-center rounded-full bg-brand px-6 font-semibold text-brand-ink">
            {t('home')}
          </Link>
        }
      />
    </div>
  );
}
