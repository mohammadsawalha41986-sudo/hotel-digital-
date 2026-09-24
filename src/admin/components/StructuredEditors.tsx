import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import { CUSTOM_FIELD_TYPES, MODIFIER_KINDS, WEEKDAYS, type CustomField, type Hours, type ModifierGroup, type Weekday } from '@shared/fields';
import { Button, IconButton, Select, TextInput, Toggle, cx } from '../../components/ui';

const small = 'h-9 rounded-lg text-sm px-3';
const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 8)}`;
const DAY_LABEL: Record<Weekday, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

function move<T>(list: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const c = [...list];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
}

// ---------------------------------------------------------------------------
export function HoursEditor({ value, onChange, id }: { value: Hours; onChange: (v: Hours) => void; id: string }) {
  const v: Hours = value ?? { mode: 'always', days: {}, note_en: '', note_ar: '' };
  const setDay = (d: Weekday, ranges: { open: string; close: string }[]) => onChange({ ...v, days: { ...v.days, [d]: ranges } });
  return (
    <div className="space-y-3 rounded-xl border border-black/10 p-3" id={id}>
      <div className="flex gap-2" role="radiogroup" aria-label="Availability">
        {(['always', 'schedule'] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={v.mode === m} onClick={() => onChange({ ...v, mode: m })} className={cx('h-9 rounded-lg px-3 text-sm font-medium', v.mode === m ? 'bg-zinc-900 text-white' : 'bg-zinc-100')}>
            {m === 'always' ? 'Always available' : 'Weekly schedule'}
          </button>
        ))}
      </div>
      {v.mode === 'schedule' && (
        <>
          <ul className="space-y-2">
            {WEEKDAYS.map((d) => {
              const ranges = v.days?.[d] ?? [];
              return (
                <li key={d} className="flex flex-wrap items-center gap-2">
                  <span className="w-10 text-sm font-medium">{DAY_LABEL[d]}</span>
                  {ranges.length === 0 && <span className="text-sm text-zinc-400">Closed</span>}
                  {ranges.map((r, i) => (
                    <span key={i} className="inline-flex items-center gap-1">
                      <input type="time" aria-label={`${DAY_LABEL[d]} opens`} value={r.open} onChange={(e) => setDay(d, ranges.map((x, j) => (j === i ? { ...x, open: e.target.value } : x)))} className={cx(small, 'border border-black/15')} />
                      <span aria-hidden="true">–</span>
                      <input type="time" aria-label={`${DAY_LABEL[d]} closes`} value={r.close} onChange={(e) => setDay(d, ranges.map((x, j) => (j === i ? { ...x, close: e.target.value } : x)))} className={cx(small, 'border border-black/15')} />
                      <IconButton label={`Remove ${DAY_LABEL[d]} range`} size="sm" onClick={() => setDay(d, ranges.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </IconButton>
                    </span>
                  ))}
                  {ranges.length < 4 && (
                    <button type="button" className="text-xs font-medium text-zinc-600 underline" onClick={() => setDay(d, [...ranges, { open: '09:00', close: '17:00' }])}>
                      + hours
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600"
            onClick={() => onChange({ ...v, days: Object.fromEntries(WEEKDAYS.map((d) => [d, v.days?.mon ?? []])) })}
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy Monday to all days
          </button>
          <p className="text-xs text-zinc-500">Ranges ending after midnight (e.g. 18:00–02:00) are supported.</p>
        </>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <TextInput aria-label="Hours note (English)" placeholder="Note (EN), e.g. Breakfast 6:30–10:30" value={v.note_en ?? ''} onChange={(e) => onChange({ ...v, note_en: e.target.value })} className={small} />
        <TextInput aria-label="Hours note (Arabic)" dir="rtl" placeholder="ملاحظة (AR)" value={v.note_ar ?? ''} onChange={(e) => onChange({ ...v, note_ar: e.target.value })} className={small} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function ModifiersEditor({ value, onChange }: { value: ModifierGroup[]; onChange: (v: ModifierGroup[]) => void }) {
  const groups = value ?? [];
  const setGroup = (i: number, g: ModifierGroup) => onChange(groups.map((x, j) => (j === i ? g : x)));
  return (
    <div className="space-y-3">
      {groups.map((g, i) => (
        <fieldset key={g.id} className="rounded-xl border border-black/10 p-3">
          <legend className="sr-only">Option group {i + 1}</legend>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_8rem]">
            <TextInput aria-label="Group name (English)" placeholder="Group name, e.g. Size" value={g.name_en} onChange={(e) => setGroup(i, { ...g, name_en: e.target.value })} className={small} />
            <TextInput aria-label="Group name (Arabic)" dir="rtl" placeholder="اسم المجموعة" value={g.name_ar} onChange={(e) => setGroup(i, { ...g, name_ar: e.target.value })} className={small} />
            <Select aria-label="Group type" value={g.kind} onChange={(e) => setGroup(i, { ...g, kind: e.target.value as ModifierGroup['kind'] })} className={small}>
              {MODIFIER_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <label className="inline-flex items-center gap-1.5">
              Min
              <input type="number" min={0} max={20} value={g.min} onChange={(e) => setGroup(i, { ...g, min: Math.max(0, Number(e.target.value)) })} className={cx(small, 'w-16 border border-black/15')} />
            </label>
            <label className="inline-flex items-center gap-1.5">
              Max
              <input type="number" min={1} max={20} value={g.max} onChange={(e) => setGroup(i, { ...g, max: Math.max(1, Number(e.target.value)) })} className={cx(small, 'w-16 border border-black/15')} />
            </label>
            <span className="text-xs text-zinc-500">{g.min > 0 ? 'Required' : 'Optional'} · {g.max === 1 ? 'single choice' : `up to ${g.max}`}</span>
            <span className="ms-auto flex gap-1">
              <IconButton label="Move group up" size="sm" onClick={() => onChange(move(groups, i, -1))}>
                <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
              </IconButton>
              <IconButton label="Move group down" size="sm" onClick={() => onChange(move(groups, i, 1))}>
                <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
              </IconButton>
              <IconButton label="Delete group" size="sm" className="text-red-600" onClick={() => onChange(groups.filter((_, j) => j !== i))}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </IconButton>
            </span>
          </div>
          <ul className="mt-3 space-y-2">
            {g.options.map((o, k) => (
              <li key={o.id} className="grid grid-cols-[1fr_1fr_5.5rem_auto_auto] items-center gap-2">
                <TextInput aria-label="Option (English)" placeholder="Option" value={o.name_en} onChange={(e) => setGroup(i, { ...g, options: g.options.map((x, j) => (j === k ? { ...x, name_en: e.target.value } : x)) })} className={small} />
                <TextInput aria-label="Option (Arabic)" dir="rtl" placeholder="الخيار" value={o.name_ar} onChange={(e) => setGroup(i, { ...g, options: g.options.map((x, j) => (j === k ? { ...x, name_ar: e.target.value } : x)) })} className={small} />
                <input type="number" step="0.5" min={0} aria-label="Extra price" value={o.price} onChange={(e) => setGroup(i, { ...g, options: g.options.map((x, j) => (j === k ? { ...x, price: Math.max(0, Number(e.target.value)) } : x)) })} className={cx(small, 'w-full border border-black/15')} />
                <label className="inline-flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={o.available} onChange={(e) => setGroup(i, { ...g, options: g.options.map((x, j) => (j === k ? { ...x, available: e.target.checked } : x)) })} />
                  On
                </label>
                <IconButton label="Delete option" size="sm" onClick={() => setGroup(i, { ...g, options: g.options.filter((_, j) => j !== k) })} disabled={g.options.length === 1}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </IconButton>
              </li>
            ))}
          </ul>
          <button type="button" className="mt-2 text-xs font-medium text-zinc-700 underline" onClick={() => setGroup(i, { ...g, options: [...g.options, { id: uid('opt'), name_en: '', name_ar: '', price: 0, available: true }] })}>
            + Add option
          </button>
        </fieldset>
      ))}
      <Button
        variant="secondary"
        size="sm"
        className="rounded-lg"
        onClick={() => onChange([...groups, { id: uid('grp'), kind: 'choice', name_en: '', name_ar: '', min: 0, max: 1, options: [{ id: uid('opt'), name_en: '', name_ar: '', price: 0, available: true }] }])}
      >
        <Plus className="h-4 w-4" aria-hidden="true" /> Add option group
      </Button>
      <p className="text-xs text-zinc-500">Examples: Size (min 1, max 1), Add-ons (min 0, max 3), Cooking preference (min 1, max 1), Remove ingredient (price 0).</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function CustomFieldsEditor({ value, onChange }: { value: CustomField[]; onChange: (v: CustomField[]) => void }) {
  const fields = value ?? [];
  const set = (i: number, f: CustomField) => onChange(fields.map((x, j) => (j === i ? f : x)));
  return (
    <div className="space-y-3">
      {fields.map((f, i) => (
        <div key={i} className="rounded-xl border border-black/10 p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_9rem]">
            <TextInput aria-label="Question (English)" placeholder="Question" value={f.label_en} onChange={(e) => set(i, { ...f, label_en: e.target.value, id: f.id || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40) })} className={small} />
            <TextInput aria-label="Question (Arabic)" dir="rtl" placeholder="السؤال" value={f.label_ar} onChange={(e) => set(i, { ...f, label_ar: e.target.value })} className={small} />
            <Select aria-label="Answer type" value={f.type} onChange={(e) => set(i, { ...f, type: e.target.value as CustomField['type'] })} className={small}>
              {CUSTOM_FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-1.5 text-sm">
              Key
              <input value={f.id} onChange={(e) => set(i, { ...f, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} className={cx(small, 'w-40 border border-black/15 font-mono')} aria-label="Answer key" />
            </label>
            <Toggle label="Required" checked={f.required} onChange={(v) => set(i, { ...f, required: v })} />
            <IconButton label="Delete question" size="sm" className="ms-auto text-red-600" onClick={() => onChange(fields.filter((_, j) => j !== i))}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </IconButton>
          </div>
          {f.type === 'select' && (
            <div className="mt-2 space-y-2">
              {f.options.map((o, k) => (
                <div key={k} className="grid grid-cols-[8rem_1fr_1fr_auto] gap-2">
                  <input aria-label="Value" value={o.value} onChange={(e) => set(i, { ...f, options: f.options.map((x, j) => (j === k ? { ...x, value: e.target.value.replace(/\s/g, '_') } : x)) })} className={cx(small, 'border border-black/15 font-mono')} placeholder="value" />
                  <TextInput aria-label="Label (English)" value={o.en} onChange={(e) => set(i, { ...f, options: f.options.map((x, j) => (j === k ? { ...x, en: e.target.value } : x)) })} className={small} placeholder="Label" />
                  <TextInput aria-label="Label (Arabic)" dir="rtl" value={o.ar} onChange={(e) => set(i, { ...f, options: f.options.map((x, j) => (j === k ? { ...x, ar: e.target.value } : x)) })} className={small} placeholder="التسمية" />
                  <IconButton label="Delete choice" size="sm" onClick={() => set(i, { ...f, options: f.options.filter((_, j) => j !== k) })}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                </div>
              ))}
              <button type="button" className="text-xs font-medium underline" onClick={() => set(i, { ...f, options: [...f.options, { value: `option_${f.options.length + 1}`, en: '', ar: '' }] })}>
                + Add choice
              </button>
            </div>
          )}
        </div>
      ))}
      <Button variant="secondary" size="sm" className="rounded-lg" onClick={() => onChange([...fields, { id: `question_${fields.length + 1}`, type: 'text', label_en: '', label_ar: '', required: false, options: [] }])}>
        <Plus className="h-4 w-4" aria-hidden="true" /> Add question
      </Button>
    </div>
  );
}
