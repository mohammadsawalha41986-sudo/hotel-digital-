import { useMutation } from '@tanstack/react-query';
import { Camera, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { DEPARTMENTS, DEPARTMENT_LABELS, FEEDBACK_TYPES, FEEDBACK_TYPE_LABELS, type FeedbackType, type Urgency } from '@shared/domain';
import { ApiError, api, errorMessage } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { Button, Field, Segmented, Select, TextArea, TextInput, cx } from '../../components/ui';
import { SectionHeader } from '../components/cards';
import { usePageTitle } from '../components/usePageTitle';
import { useFlow } from '../flow';
import { useHotel } from '../hotel';
import { guestToken, useGuestSession } from '../session';

const ABOUT = DEPARTMENTS.filter((d) => d !== 'MANAGEMENT' && d !== 'FEEDBACK');

export function Feedback() {
  const { t, lang } = useI18n();
  const title = usePageTitle('feedback');
  const flow = useFlow();
  const { slug } = useHotel();
  const { identity } = useGuestSession();
  const [type, setType] = useState<FeedbackType>('COMPLAINT');
  const [about, setAbout] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('NORMAL');
  const [attachment, setAttachment] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api<{ url: string }>(`/public/hotels/${slug}/uploads`, { method: 'POST', body: fd, headers: { 'x-guest-token': guestToken() } });
    },
    onSuccess: (r) => setAttachment(r.url),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (subject.trim().length < 3) errs.subject = t('required');
    if (message.trim().length < 5) errs.message = t('required');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setError(null);
    try {
      await flow.submit({ kind: 'FEEDBACK', feedback_type: type, about_department: (about || null) as never, subject, message, urgency, attachment });
      setSubject('');
      setMessage('');
      setAttachment('');
      setAbout('');
    } catch (err) {
      if ((err as Error).message === 'identity required') return;
      const f = err instanceof ApiError ? err.fields : {};
      setErrors(Object.fromEntries(Object.entries(f).map(([k, v]) => [k.replace('payload.', ''), v])));
      setError(err);
    }
  };

  const isComplaint = type === 'COMPLAINT' || type === 'SERVICE_RECOVERY';

  return (
    <div className="mx-auto max-w-2xl pt-8 pb-12">
      <SectionHeader as="h1" title={title} subtitle={t('feedbackLead')} />
      <form onSubmit={submit} noValidate className="space-y-6 px-5 sm:px-8">
        {identity && (
          <p className="rounded-2xl bg-black/[0.035] px-4 py-3 text-sm">
            <span className="font-semibold">{identity.name}</span>
            <span className="text-muted"> · {identity.type === 'IN_HOUSE' ? `${t('room')} ${identity.room}` : t('visitor')}</span>
          </p>
        )}
        {error ? (
          <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage(error)}
          </p>
        ) : null}
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t('feedbackType')}</legend>
          <div className="grid grid-cols-2 gap-2">
            {FEEDBACK_TYPES.map((ft) => (
              <label key={ft} className={cx('flex h-12 cursor-pointer items-center justify-center rounded-2xl text-sm font-semibold ring-1 transition', type === ft ? 'bg-ink text-white ring-ink' : 'ring-line hover:ring-black/20')}>
                <input type="radio" name="fb-type" value={ft} checked={type === ft} onChange={() => setType(ft)} className="sr-only" />
                {FEEDBACK_TYPE_LABELS[ft][lang]}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label={t('department')} optionalLabel={t('optional')} htmlFor="fb-about">
          <Select id="fb-about" value={about} onChange={(e) => setAbout(e.target.value)}>
            <option value="">{t('anyDepartment')}</option>
            {ABOUT.map((d) => (
              <option key={d} value={d}>
                {DEPARTMENT_LABELS[d][lang]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('subject')} required htmlFor="fb-subject" error={errors.subject}>
          <TextInput id="fb-subject" value={subject} maxLength={160} onChange={(e) => setSubject(e.target.value)} invalid={!!errors.subject} />
        </Field>
        <Field label={t('message')} required htmlFor="fb-message" error={errors.message}>
          <TextArea id="fb-message" rows={6} value={message} maxLength={3000} onChange={(e) => setMessage(e.target.value)} invalid={!!errors.message} />
        </Field>
        {isComplaint && (
          <div>
            <p className="mb-2 text-sm font-medium" id="fb-urgency">
              {t('urgency')}
            </p>
            <Segmented
              label={t('urgency')}
              value={urgency}
              onChange={setUrgency}
              options={[
                { value: 'LOW', label: t('low') },
                { value: 'NORMAL', label: t('normal') },
                { value: 'HIGH', label: t('high') },
              ]}
            />
          </div>
        )}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            id="fb-file"
            tabIndex={-1}
            aria-label={t('attachPhoto')}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload.mutate(f);
              e.target.value = '';
            }}
          />
          {attachment ? (
            <div className="flex items-center gap-3 rounded-2xl bg-black/[0.035] p-3">
              <img src={attachment} alt="" className="h-14 w-14 rounded-xl object-cover" />
              <span className="flex-1 text-sm font-medium">{t('attached')}</span>
              <button type="button" onClick={() => setAttachment('')} className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm hover:bg-black/5">
                <X className="h-4 w-4" aria-hidden="true" />
                {t('remove')}
              </button>
            </div>
          ) : (
            <Button variant="secondary" loading={upload.isPending} onClick={() => fileRef.current?.click()}>
              <Camera className="h-4 w-4" aria-hidden="true" />
              {t('attachPhoto')}
            </Button>
          )}
          {upload.error && <p className="mt-2 text-sm text-red-600">{errorMessage(upload.error)}</p>}
        </div>
        <Button type="submit" size="lg" block loading={flow.submitting}>
          {t('sendFeedback')}
        </Button>
      </form>
    </div>
  );
}
