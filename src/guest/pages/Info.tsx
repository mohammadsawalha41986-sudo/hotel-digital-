import { ExternalLink, Info as InfoIcon } from 'lucide-react';
import { useMemo } from 'react';
import { ENTITIES } from '@shared/entities';
import { Icon } from '../../lib/icons';
import { useI18n } from '../../lib/i18n';
import { EmptyState, cx } from '../../components/ui';
import { SectionHeader } from '../components/cards';
import { usePageTitle } from '../components/usePageTitle';
import { useHotel } from '../hotel';

export function Info() {
  const { bundle } = useHotel();
  const { t, pick, lang } = useI18n();
  const title = usePageTitle('info');
  const catField = ENTITIES.info_items.fields.find((f) => f.key === 'category')!;
  const groups = useMemo(() => {
    const order = (catField.options ?? []).map((o) => o.value);
    const map = new Map<string, typeof bundle.catalog.info_items>();
    for (const i of bundle.catalog.info_items) map.set(String(i.category), [...(map.get(String(i.category)) ?? []), i]);
    return [...map.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [bundle, catField]);

  if (!groups.length) return <EmptyState icon={<InfoIcon className="h-6 w-6" />} title={t('noResults')} description={t('comingSoon')} />;

  return (
    <div className="mx-auto max-w-6xl pt-8 pb-10">
      <SectionHeader as="h1" title={title} subtitle={pick(bundle.hotel.profile as unknown as Record<string, unknown>, 'description').split('\n')[0]} />
      <nav aria-label={title} className="no-scrollbar mb-6 flex gap-2 overflow-x-auto px-5 sm:px-8">
        {groups.map(([cat]) => (
          <a key={cat} href={`#info-${cat}`} className="h-10 shrink-0 rounded-full bg-black/[0.05] px-4 text-sm leading-10 font-medium">
            {catField.options?.find((o) => o.value === cat)?.[lang] ?? cat}
          </a>
        ))}
      </nav>
      <div className="space-y-10 px-5 sm:px-8">
        {groups.map(([cat, items]) => (
          <section key={cat} id={`info-${cat}`} aria-labelledby={`info-h-${cat}`} className="scroll-mt-24">
            <h2 id={`info-h-${cat}`} className="display mb-4 text-[1.75rem]">
              {catField.options?.find((o) => o.value === cat)?.[lang] ?? cat}
            </h2>
            <ul className={cx('grid gap-3', cat === 'nearby' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2')}>
              {items.map((i) => {
                const body = pick(i, 'body');
                const content = (
                  <>
                    <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', cat === 'emergency' ? 'bg-red-50 text-red-600' : 'bg-[color-mix(in_oklab,var(--c-accent)_14%,transparent)] text-accent')}>
                      <Icon name={i.icon as string} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold">{pick(i, 'title')}</span>
                        {pick(i, 'highlight') && <span className="ltr-nums shrink-0 text-sm font-semibold text-brand">{pick(i, 'highlight')}</span>}
                      </span>
                      {body && <span className="mt-1 block text-sm leading-relaxed whitespace-pre-line text-muted">{body}</span>}
                    </span>
                    {i.link ? <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted" aria-hidden="true" /> : null}
                  </>
                );
                return (
                  <li key={i.id}>
                    {i.link ? (
                      <a href={i.link as string} target="_blank" rel="noopener noreferrer" className="flex gap-4 rounded-[1.35rem] bg-surface p-4 ring-1 ring-line transition hover:shadow-md">
                        {content}
                      </a>
                    ) : (
                      <div className="flex gap-4 rounded-[1.35rem] bg-surface p-4 ring-1 ring-line">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
