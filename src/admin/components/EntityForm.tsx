import { useMemo } from 'react';
import type { EntityName } from '@shared/entities';
import { ENTITIES } from '@shared/entities';
import type { CustomField, FieldSpec, Hours, ModifierGroup } from '@shared/fields';
import { ICON_MAP } from '../../lib/icons';
import { Field, Select, TextArea, TextInput, Toggle, cx } from '../../components/ui';
import { useDepartmentOptions, useEntities } from '../data';
import { MediaInput } from './MediaInput';
import { CustomFieldsEditor, HoursEditor, ModifiersEditor } from './StructuredEditors';

type Values = Record<string, unknown>;

const control = 'h-10 rounded-lg text-sm';

function isVisible(f: FieldSpec, v: Values) {
  return !f.showIf || f.showIf.in.includes(v[f.showIf.field] as never);
}

/** Renders any entity's FieldSpec[] as an accessible bilingual form. */
export function EntityForm({ hid, entity, values, onChange, errors }: { hid: string; entity: EntityName; values: Values; onChange: (v: Values) => void; errors: Record<string, string> }) {
  const fields = ENTITIES[entity].fields;
  const set = (k: string, v: unknown) => onChange({ ...values, [k]: v });
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fields.filter((f) => isVisible(f, values)).map((f) => (
        <div key={f.key} className={cx((f.wide || f.type === 'i18n' || f.type === 'i18nText' || ['hours', 'modifiers', 'customFields', 'media', 'video', 'tags'].includes(f.type)) && 'sm:col-span-2')}>
          <FieldInput hid={hid} f={f} values={values} set={set} errors={errors} />
        </div>
      ))}
    </div>
  );
}

function FieldInput({ hid, f, values, set, errors }: { hid: string; f: FieldSpec; values: Values; set: (k: string, v: unknown) => void; errors: Record<string, string> }) {
  const id = `f-${f.key}`;
  const err = errors[f.key];
  switch (f.type) {
    case 'i18n':
    case 'i18nText': {
      const Input = f.type === 'i18n' ? TextInput : TextArea;
      return (
        <fieldset>
          <legend className="mb-1.5 flex gap-1 text-sm font-medium">
            {f.label} {f.required && <span className="text-red-600" aria-hidden="true">*</span>}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-en`} className="mb-1 block text-xs text-zinc-500">
                English
              </label>
              <Input id={`${id}-en`} value={String(values[`${f.key}_en`] ?? '')} onChange={(e) => set(`${f.key}_en`, e.target.value)} invalid={!!errors[`${f.key}_en`]} className={f.type === 'i18n' ? control : 'rounded-lg text-sm'} />
              {errors[`${f.key}_en`] && <p className="mt-1 text-sm text-red-600">{errors[`${f.key}_en`]}</p>}
            </div>
            <div>
              <label htmlFor={`${id}-ar`} className="mb-1 block text-xs text-zinc-500">
                العربية
              </label>
              <Input id={`${id}-ar`} dir="rtl" lang="ar" value={String(values[`${f.key}_ar`] ?? '')} onChange={(e) => set(`${f.key}_ar`, e.target.value)} invalid={!!errors[`${f.key}_ar`]} className={f.type === 'i18n' ? control : 'rounded-lg text-sm'} />
            </div>
          </div>
          {f.help && <p className="mt-1 text-xs text-zinc-500">{f.help}</p>}
        </fieldset>
      );
    }
    case 'boolean':
      return <Toggle id={id} label={f.label} description={f.help} checked={Boolean(values[f.key])} onChange={(v) => set(f.key, v)} />;
    case 'hours':
      return (
        <Field label={f.label} htmlFor={id} error={err} hint={f.help}>
          <HoursEditor id={id} value={values[f.key] as Hours} onChange={(v) => set(f.key, v)} />
        </Field>
      );
    case 'modifiers':
      return (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">{f.label}</legend>
          <ModifiersEditor value={(values[f.key] as ModifierGroup[]) ?? []} onChange={(v) => set(f.key, v)} />
          {Object.entries(errors).filter(([k]) => k.startsWith(`${f.key}.`)).slice(0, 3).map(([k, m]) => (
            <p key={k} className="mt-1 text-sm text-red-600">
              {m} ({k.replace(`${f.key}.`, 'group ')})
            </p>
          ))}
        </fieldset>
      );
    case 'customFields':
      return (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">{f.label}</legend>
          <CustomFieldsEditor value={(values[f.key] as CustomField[]) ?? []} onChange={(v) => set(f.key, v)} />
          {Object.entries(errors).filter(([k]) => k.startsWith(`${f.key}.`)).slice(0, 3).map(([k, m]) => (
            <p key={k} className="mt-1 text-sm text-red-600">
              {m}
            </p>
          ))}
        </fieldset>
      );
    case 'media':
    case 'video':
      return (
        <Field label={f.label} htmlFor={id} error={err} hint={f.help} required={f.required}>
          <MediaInput hid={hid} id={id} kind={f.type === 'video' ? 'video' : 'image'} value={String(values[f.key] ?? '')} onChange={(v) => set(f.key, v)} invalid={!!err} />
        </Field>
      );
    case 'tags': {
      const cur = (values[f.key] as string[]) ?? [];
      return (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">{f.label}</legend>
          <div className="flex flex-wrap gap-2">
            {(f.options ?? []).map((o) => {
              const on = cur.includes(o.value);
              return (
                <label key={o.value} className={cx('inline-flex h-8 cursor-pointer items-center rounded-full px-3 text-sm ring-1 transition', on ? 'bg-zinc-900 text-white ring-zinc-900' : 'ring-black/15 hover:bg-zinc-50')}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => set(f.key, on ? cur.filter((x) => x !== o.value) : [...cur, o.value])} />
                  {o.en}
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    }
    case 'department':
      return <DepartmentSelect hid={hid} id={id} f={f} value={String(values[f.key] ?? '')} onChange={(v) => set(f.key, v)} err={err} control={control} />;
    case 'select':
      return (
        <Field label={f.label} htmlFor={id} error={err} hint={f.help} required={f.required}>
          <Select id={id} value={String(values[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)} className={control} invalid={!!err}>
            {(f.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.en}
              </option>
            ))}
          </Select>
        </Field>
      );
    case 'icon': {
      const v = String(values[f.key] ?? '');
      const IconC = ICON_MAP[v];
      return (
        <Field label={f.label} htmlFor={id} error={err}>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">{IconC && <IconC className="h-5 w-5" aria-hidden="true" />}</span>
            <Select id={id} value={v} onChange={(e) => set(f.key, e.target.value)} className={control}>
              {Object.keys(ICON_MAP).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
          </div>
        </Field>
      );
    }
    case 'ref':
      return <RefSelect hid={hid} f={f} id={id} value={(values[f.key] as string) ?? ''} onChange={(v) => set(f.key, v || null)} error={err} />;
    case 'number':
    case 'money':
      return (
        <Field label={f.label} htmlFor={id} error={err} hint={f.help} required={f.required}>
          <TextInput
            id={id}
            type="number"
            inputMode="decimal"
            step={f.type === 'money' ? '0.01' : '1'}
            min={f.min ?? 0}
            max={f.max}
            value={values[f.key] == null ? '' : String(values[f.key])}
            onChange={(e) => set(f.key, e.target.value === '' ? null : Number(e.target.value))}
            className={control}
            invalid={!!err}
          />
        </Field>
      );
    case 'datetime': {
      const raw = values[f.key] as string | null;
      const local = raw ? new Date(new Date(raw).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
      return (
        <Field label={f.label} htmlFor={id} error={err} hint={f.help ?? 'Your local time'}>
          <TextInput id={id} type="datetime-local" value={local} onChange={(e) => set(f.key, e.target.value ? new Date(e.target.value).toISOString() : null)} className={control} />
        </Field>
      );
    }
    case 'textarea':
      return (
        <Field label={f.label} htmlFor={id} error={err} hint={f.help}>
          <TextArea id={id} value={String(values[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)} className="rounded-lg text-sm" />
        </Field>
      );
    default:
      return (
        <Field label={f.label} htmlFor={id} error={err} hint={f.help} required={f.required}>
          <TextInput id={id} type={f.type === 'url' ? 'url' : f.type === 'phone' ? 'tel' : 'text'} dir={f.type === 'phone' || f.type === 'url' ? 'ltr' : undefined} value={String(values[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)} className={control} invalid={!!err} />
        </Field>
      );
  }
}

function RefSelect({ hid, f, id, value, onChange, error }: { hid: string; f: FieldSpec; id: string; value: string; onChange: (v: string) => void; error?: string }) {
  const q = useEntities(hid, f.refEntity as EntityName);
  const options = useMemo(() => q.data ?? [], [q.data]);
  const title = ENTITIES[f.refEntity as EntityName]?.titleField ?? 'name';
  return (
    <Field label={f.label} htmlFor={id} error={error} hint={q.error ? 'Could not load options' : f.help}>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={control}>
        <option value="">— None —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {String(o[`${title}_en`] ?? o.id)}
            {o.is_active ? '' : ' (hidden)'}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function DepartmentSelect({ hid, id, f, value, onChange, err, control }: { hid: string; id: string; f: FieldSpec; value: string; onChange: (v: string) => void; err?: string; control: string }) {
  const q = useDepartmentOptions(hid);
  const options = q.data ?? [];
  const known = options.some((d) => d.code === value);
  return (
    <Field label={f.label} htmlFor={id} error={err ?? (q.isError ? 'Departments could not be loaded' : undefined)} hint={f.help} required={f.required}>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={control} invalid={!!err || q.isError} disabled={q.isLoading}>
        {q.isLoading && <option value={value}>Loading…</option>}
        {!q.isLoading && value && !known && <option value={value}>{value} (not configured)</option>}
        {options.map((d) => (
          <option key={d.code} value={d.code}>
            {d.name_en}
            {d.is_active ? '' : ' (inactive)'}
          </option>
        ))}
      </Select>
    </Field>
  );
}
