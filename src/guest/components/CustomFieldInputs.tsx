import type { CustomField } from '@shared/fields';
import { useI18n } from '../../lib/i18n';
import { Field, Select, TextArea, TextInput, Toggle } from '../../components/ui';

export type Answers = Record<string, string | number | boolean>;

/** Renders admin-defined questions for a service or booking. */
export function CustomFieldInputs({ fields, value, onChange, errors, idPrefix }: { fields: CustomField[]; value: Answers; onChange: (v: Answers) => void; errors: Record<string, string>; idPrefix: string }) {
  const { lang, t } = useI18n();
  const label = (f: CustomField) => (lang === 'ar' ? f.label_ar || f.label_en : f.label_en);
  const set = (id: string, v: string | number | boolean) => onChange({ ...value, [id]: v });
  return (
    <>
      {fields.map((f) => {
        const id = `${idPrefix}-${f.id}`;
        const err = errors[`answers.${f.id}`];
        if (f.type === 'boolean') {
          return <Toggle key={f.id} id={id} label={label(f)} checked={Boolean(value[f.id])} onChange={(v) => set(f.id, v)} />;
        }
        return (
          <Field key={f.id} label={label(f)} required={f.required} optionalLabel={t('optional')} htmlFor={id} error={err}>
            {f.type === 'select' ? (
              <Select id={id} value={String(value[f.id] ?? '')} onChange={(e) => set(f.id, e.target.value)} invalid={!!err}>
                <option value="">{t('choose')}…</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {lang === 'ar' ? o.ar || o.en : o.en}
                  </option>
                ))}
              </Select>
            ) : f.type === 'textarea' ? (
              <TextArea id={id} value={String(value[f.id] ?? '')} onChange={(e) => set(f.id, e.target.value)} invalid={!!err} maxLength={1000} />
            ) : (
              <TextInput
                id={id}
                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : 'text'}
                inputMode={f.type === 'number' ? 'numeric' : undefined}
                value={String(value[f.id] ?? '')}
                onChange={(e) => set(f.id, f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
                invalid={!!err}
                maxLength={f.type === 'text' ? 300 : undefined}
              />
            )}
          </Field>
        );
      })}
    </>
  );
}

/** Client-side required check mirroring the server rule (server remains authoritative). */
export function missingAnswers(fields: CustomField[], answers: Answers, requiredMsg: string): Record<string, string> {
  const errs: Record<string, string> = {};
  for (const f of fields) {
    const v = answers[f.id];
    if (f.required && f.type !== 'boolean' && (v === undefined || v === '')) errs[`answers.${f.id}`] = requiredMsg;
  }
  return errs;
}
