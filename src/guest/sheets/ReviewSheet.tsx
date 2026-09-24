import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiError, api } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { Button, Field, Sheet, TextArea, TextInput, cx } from '../../components/ui';
import { useHotel } from '../hotel';
import { useGuestSession } from '../session';

export function ReviewSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useI18n();
  const { slug } = useHotel();
  const { identity } = useGuestSession();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () => api(`/public/hotels/${slug}/reviews`, { method: 'POST', body: { guest_name: identity?.name ?? '', room: identity?.room ?? '', rating, title, body, lang } }),
    onError: (e) => setErrors(e instanceof ApiError ? e.fields : {}),
  });
  useEffect(() => {
    if (open) {
      setRating(0);
      setTitle('');
      setBody('');
      setErrors({});
      m.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    const errs: Record<string, string> = {};
    if (!rating) errs.rating = t('required');
    if (body.trim().length < 5) errs.body = t('required');
    setErrors(errs);
    if (!Object.keys(errs).length) m.mutate();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('writeReview')}
      closeLabel={t('close')}
      footer={
        m.isSuccess ? (
          <Button block size="lg" onClick={onClose}>
            {t('done')}
          </Button>
        ) : (
          <Button block size="lg" loading={m.isPending} onClick={submit}>
            {t('submit')}
          </Button>
        )
      }
    >
      {m.isSuccess ? (
        <div className="flex flex-col items-center py-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" aria-hidden="true" />
          <p className="mt-4 font-semibold">{t('reviewThanks')}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {m.error && !(m.error instanceof ApiError && Object.keys(m.error.fields).length) && (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {(m.error as Error).message}
            </p>
          )}
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t('rating')}</legend>
            <div className="flex gap-1" role="radiogroup" aria-label={t('rating')}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} / 5`} onClick={() => setRating(n)} className="p-1">
                  <Star className={cx('h-9 w-9 transition', n <= rating ? 'fill-accent text-accent' : 'text-black/20')} aria-hidden="true" />
                </button>
              ))}
            </div>
            {errors.rating && <p className="mt-1 text-sm text-red-600">{errors.rating}</p>}
          </fieldset>
          <Field label={t('reviewTitle')} optionalLabel={t('optional')} htmlFor="rv-title">
            <TextInput id="rv-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label={t('reviewBody')} required htmlFor="rv-body" error={errors.body}>
            <TextArea id="rv-body" rows={5} value={body} maxLength={1500} onChange={(e) => setBody(e.target.value)} invalid={!!errors.body} />
          </Field>
        </div>
      )}
    </Sheet>
  );
}
