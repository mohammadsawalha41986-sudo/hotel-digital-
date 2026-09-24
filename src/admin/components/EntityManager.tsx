import { ArrowDown, ArrowUp, ChevronRight, Eye, EyeOff, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEPARTMENT_LABELS, type DepartmentCode } from '@shared/domain';
import { ENTITIES, type EntityName } from '@shared/entities';
import { defaultValues } from '@shared/fields';
import { formatMoney } from '@shared/pricing';
import { ApiError, errorMessage } from '../../lib/api';
import { Icon } from '../../lib/icons';
import { Badge, Button, EmptyState, ErrorState, IconButton, Sheet, Skeleton, TextInput, Toggle, cx } from '../../components/ui';
import { useEntities, useEntityMutations, type EntityRecord } from '../data';
import { useFeedback } from '../feedback';
import { EntityForm } from './EntityForm';

export function recordTitle(entity: EntityName, r: Record<string, unknown>) {
  const k = ENTITIES[entity].titleField;
  return { en: String(r[`${k}_en`] ?? ''), ar: String(r[`${k}_ar`] ?? '') };
}

function facts(entity: EntityName, r: EntityRecord, currency: string): string[] {
  const out: string[] = [];
  const money = (v: unknown) => (typeof v === 'number' ? formatMoney(v, currency, 'en') : null);
  if (entity === 'laundry_items') {
    const p = [['Wash', r.wash_price], ['Dry', r.dry_clean_price], ['Press', r.press_price]].filter(([, v]) => v != null).map(([l, v]) => `${l} ${money(v)}`);
    out.push(...p);
    if (r.express_pct != null) out.push(`Express +${r.express_pct}%`);
  } else if (r.price != null && typeof r.price === 'number') out.push(money(r.price)!);
  if (typeof r.department === 'string' && entity !== 'quick_actions') out.push(`→ ${DEPARTMENT_LABELS[r.department as DepartmentCode]?.en ?? r.department}`);
  if (typeof r.duration_minutes === 'number') out.push(`${r.duration_minutes} min`);
  if (r.available === false) out.push('Unavailable');
  if (entity === 'quick_actions') out.push(String(r.action).replace('_', ' '));
  if (entity === 'offers' && (r.starts_at || r.ends_at)) out.push(`Scheduled ${r.starts_at ? new Date(String(r.starts_at)).toLocaleDateString() : '…'} – ${r.ends_at ? new Date(String(r.ends_at)).toLocaleDateString() : '…'}`);
  if (Array.isArray(r.modifiers) && r.modifiers.length) out.push(`${r.modifiers.length} option groups`);
  return out;
}

/**
 * Generic, schema-driven CRUD list for one catalog entity (optionally inside a
 * parent). Every control persists through the API; nothing is local-only.
 */
export function EntityManager({
  hid,
  entity,
  parentId,
  currency = 'SAR',
  onOpen,
  title,
  compact,
  extraActions,
  selectedId,
}: {
  hid: string;
  entity: EntityName;
  parentId?: string | null;
  currency?: string;
  onOpen?: (r: EntityRecord) => void;
  title?: string;
  compact?: boolean;
  extraActions?: ReactNode;
  /** Highlights the row currently opened in a master/detail layout. */
  selectedId?: string | null;
}) {
  const def = ENTITIES[entity];
  const q = useEntities(hid, entity, parentId);
  const m = useEntityMutations(hid, entity);
  const fb = useFeedback();
  const [editing, setEditing] = useState<EntityRecord | 'new' | null>(null);
  const [search, setSearch] = useState('');

  const items = useMemo(() => {
    const list = q.data ?? [];
    if (!search.trim()) return list;
    const s = search.toLowerCase();
    return list.filter((r) => `${recordTitle(entity, r).en} ${recordTitle(entity, r).ar}`.toLowerCase().includes(s));
  }, [q.data, search, entity]);

  const reorder = (i: number, d: -1 | 1) => {
    const list = [...(q.data ?? [])];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    m.reorder.mutate(list.map((x) => x.id), { onError: (e) => fb.error(errorMessage(e)) });
  };

  const toggle = (r: EntityRecord) =>
    m.update.mutate(
      { id: r.id, is_active: !r.is_active },
      { onSuccess: () => fb.success(`${recordTitle(entity, r).en} is now ${r.is_active ? 'hidden from guests' : 'visible to guests'}`), onError: (e) => fb.error(errorMessage(e)) }
    );

  const remove = async (r: EntityRecord) => {
    const ok = await fb.confirm({
      title: `Delete ${def.label.singular.toLowerCase()}?`,
      message: `“${recordTitle(entity, r).en}” will be removed permanently${def.name === 'outlets' || def.name === 'menus' || def.name === 'menu_categories' || def.name === 'spa_categories' ? ' together with everything inside it' : ''}. Hide it instead if you may need it again.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (ok) m.remove.mutate(r.id, { onSuccess: () => fb.success('Deleted'), onError: (e) => fb.error(errorMessage(e)) });
  };

  return (
    <section aria-label={title ?? def.label.plural} className="rounded-2xl border border-black/[0.07] bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-black/[0.06] px-4 py-3">
        <h2 className="me-auto font-semibold">
          {title ?? def.label.plural} <span className="font-normal text-zinc-400">{q.data ? `(${q.data.length})` : ''}</span>
        </h2>
        {!compact && (q.data?.length ?? 0) > 6 && (
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
            <TextInput aria-label={`Search ${def.label.plural}`} placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-48 rounded-lg ps-9 text-sm" />
          </div>
        )}
        {extraActions}
        <Button size="sm" className="rounded-lg" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add {def.label.singular.toLowerCase()}
        </Button>
      </div>
      {q.isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : q.error ? (
        <ErrorState title="Could not load" description={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : !items.length ? (
        <EmptyState title={search ? 'No matches' : `No ${def.label.plural.toLowerCase()} yet`} description={search ? undefined : 'Add the first one — it appears on the guest site as soon as it is saved and visible.'} />
      ) : (
        <ul className="divide-y divide-black/[0.06]">
          {items.map((r, i) => {
            const t = recordTitle(entity, r);
            const img = (r.image || r.cover || r.logo) as string | undefined;
            return (
              <li key={r.id} aria-current={selectedId === r.id ? 'true' : undefined} className={cx('flex items-center gap-3 px-4 py-3', compact && 'gap-2 px-3 py-2', !r.is_active && 'bg-zinc-50/70', selectedId === r.id && 'bg-amber-50/70 shadow-[inset_3px_0_0_#a68633]')}>
                {!search && (
                  <div className="flex flex-col">
                    <IconButton label={`Move ${t.en} up`} size="xs" disabled={i === 0} onClick={() => reorder(i, -1)}>
                      <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                    </IconButton>
                    <IconButton label={`Move ${t.en} down`} size="xs" disabled={i === items.length - 1} onClick={() => reorder(i, 1)}>
                      <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </IconButton>
                  </div>
                )}
                {!compact && (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 text-zinc-600">
                    {img ? <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} /> : <Icon name={(r.icon as string) || 'sparkles'} className="h-5 w-5" />}
                  </span>
                )}
                <button type="button" className="min-w-0 flex-1 text-start" onClick={() => (onOpen ? onOpen(r) : setEditing(r))}>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{t.en || <em className="text-zinc-400">Untitled</em>}</span>
                    {!r.is_active && <Badge>Hidden</Badge>}
                    {r.featured === true && <Badge tone="info">Featured</Badge>}
                  </span>
                  <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-zinc-500">
                    {t.ar && (
                      <span dir="rtl" lang="ar">
                        {t.ar}
                      </span>
                    )}
                    {facts(entity, r, currency).map((f) => (
                      <span key={f}>{f}</span>
                    ))}
                  </span>
                </button>
                <IconButton label={r.is_active ? `Hide ${t.en} from guests` : `Show ${t.en} to guests`} onClick={() => toggle(r)} className="h-9 w-9">
                  {r.is_active ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4 text-zinc-400" aria-hidden="true" />}
                </IconButton>
                <IconButton label={`Edit ${t.en}`} onClick={() => setEditing(r)} className="h-9 w-9">
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </IconButton>
                <IconButton label={`Delete ${t.en}`} onClick={() => remove(r)} className="h-9 w-9 text-red-600">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </IconButton>
                {onOpen && !compact && (
                  <IconButton label={`Open ${t.en}`} onClick={() => onOpen(r)} className="h-9 w-9">
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <EntityEditor hid={hid} entity={entity} parentId={parentId ?? null} record={editing} onClose={() => setEditing(null)} />
    </section>
  );
}

export function EntityEditor({ hid, entity, parentId, record, onClose }: { hid: string; entity: EntityName; parentId: string | null; record: EntityRecord | 'new' | null; onClose: () => void }) {
  const def = ENTITIES[entity];
  const m = useEntityMutations(hid, entity);
  const fb = useFeedback();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!record) return;
    setErrors({});
    setFormError('');
    if (record === 'new') {
      setValues(defaultValues(def.fields));
      setActive(true);
    } else {
      setValues({ ...defaultValues(def.fields), ...record });
      setActive(record.is_active);
    }
  }, [record, def.fields]);

  const saving = m.create.isPending || m.update.isPending;
  const save = async () => {
    setErrors({});
    setFormError('');
    const { id: _id, updated_at: _u, sort_order: _s, parent_id: _p, is_active: _a, ...data } = values as Record<string, unknown>;
    try {
      if (record === 'new') await m.create.mutateAsync({ ...data, is_active: active, parent_id: parentId });
      else if (record) await m.update.mutateAsync({ ...data, is_active: active, id: record.id });
      fb.success(`${def.label.singular} saved`);
      onClose();
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length) {
        setErrors(e.fields);
        setFormError(e.message);
      } else setFormError(errorMessage(e));
    }
  };

  return (
    <Sheet
      open={!!record}
      onClose={onClose}
      side="right"
      title={record === 'new' ? `New ${def.label.singular.toLowerCase()}` : `Edit ${def.label.singular.toLowerCase()}`}
      description={record && record !== 'new' ? recordTitle(entity, record).en : undefined}
      footer={
        <div className="flex items-center justify-between gap-3">
          <Toggle label="Visible to guests" checked={active} onChange={setActive} />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={saving} onClick={save}>
              Save
            </Button>
          </div>
        </div>
      }
    >
      {formError && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}
      {record && <EntityForm hid={hid} entity={entity} values={values} onChange={setValues} errors={errors} />}
    </Sheet>
  );
}
