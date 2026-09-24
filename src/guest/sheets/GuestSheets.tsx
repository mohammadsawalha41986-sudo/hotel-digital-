import { CheckCircle2, MessageCircle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DEPARTMENT_LABELS, type DepartmentCode } from '@shared/domain';
import { ApiError, errorMessage } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { Badge, Button, EmptyState, Field, Img, Sheet, Stepper, TextArea, TextInput } from '../../components/ui';
import { unitPrice, useBasket } from '../basket';
import { CustomFieldInputs, missingAnswers, type Answers } from '../components/CustomFieldInputs';
import { IdentityForm } from '../components/IdentityForm';
import { useFlow } from '../flow';
import { useHotel } from '../hotel';
import { useGuestSession } from '../session';
import type { ServiceRec, SpaService } from '../types';
import { useOpenState } from '../components/cards';

export function GuestSheets() {
  const { sheet, close } = useFlow();
  return (
    <>
      <ServiceSheet open={sheet?.kind === 'service'} service={sheet?.kind === 'service' ? sheet.service : null} entity={sheet?.kind === 'service' ? sheet.entity : 'room_services'} onClose={close} />
      <SpaSheet open={sheet?.kind === 'spa'} service={sheet?.kind === 'spa' ? sheet.service : null} onClose={close} />
      <IdentitySheet open={sheet?.kind === 'identity'} reason={sheet?.kind === 'identity' ? sheet.reason : undefined} onClose={close} />
      <BasketSheet open={sheet?.kind === 'basket'} onClose={close} />
      <SuccessSheet />
    </>
  );
}

function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="mb-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
      {errorMessage(error)}
    </p>
  );
}

function fieldErrors(e: unknown): Record<string, string> {
  return e instanceof ApiError ? e.fields : {};
}

function GuestContextLine() {
  const { identity } = useGuestSession();
  const { t } = useI18n();
  const flow = useFlow();
  if (!identity) return null;
  return (
    <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-black/[0.035] px-4 py-3 text-sm">
      <span className="min-w-0 truncate">
        <span className="font-semibold">{identity.name}</span>
        <span className="text-muted"> · {identity.type === 'IN_HOUSE' ? `${t('room')} ${identity.room}` : t('visitor')}</span>
      </span>
      <button type="button" className="shrink-0 font-semibold text-brand" onClick={() => flow.open({ kind: 'identity' })}>
        {t('changeDetails')}
      </button>
    </div>
  );
}

// ------------------------------------------------------------------------------------------
function ServiceSheet({ open, service, entity, onClose }: { open: boolean; service: ServiceRec | null; entity: 'room_services' | 'hotel_services'; onClose: () => void }) {
  const { t, pick, money } = useI18n();
  const flow = useFlow();
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const state = useOpenState(service ?? {});

  useEffect(() => {
    if (open) {
      setQty(1);
      setNotes('');
      setAnswers({});
      setErrors({});
      setError(null);
    }
  }, [open, service?.id]);

  if (!service) return null;
  const fields = service.custom_fields ?? [];
  const requestable = entity === 'room_services' || service.requestable !== false;
  const submit = async () => {
    const miss = missingAnswers(fields, answers, t('required'));
    setErrors(miss);
    if (Object.keys(miss).length) return;
    setError(null);
    try {
      await flow.submit({ kind: entity === 'room_services' ? 'ROOM_SERVICE' : 'HOTEL_SERVICE', service_id: service.id, quantity: qty, answers, notes });
    } catch (e) {
      setErrors(fieldErrors(e));
      if ((e as Error).message !== 'identity required') setError(e);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={pick(service, 'name')}
      description={service.response_minutes ? t('expectedIn', { n: service.response_minutes }) : undefined}
      closeLabel={t('close')}
      footer={
        requestable ? (
          <Button size="lg" block loading={flow.submitting} disabled={!state.open} onClick={submit}>
            {state.open ? t('submitRequest') : t('unavailableClosed')}
          </Button>
        ) : undefined
      }
    >
      {service.image && <Img src={service.image} alt="" className="mb-5 aspect-[16/9] w-full rounded-2xl" />}
      {pick(service, 'description') && <p className="mb-5 whitespace-pre-line leading-relaxed text-muted">{pick(service, 'description')}</p>}
      {service.price ? (
        <p className="mb-5 font-semibold">
          {money(service.price)} {pick(service, 'price_note') && <span className="font-normal text-muted">· {pick(service, 'price_note')}</span>}
        </p>
      ) : null}
      {requestable ? (
        <div className="space-y-5">
          <GuestContextLine />
          <FormError error={error} />
          {service.allow_quantity && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t('quantity')}</span>
              <Stepper value={qty} onChange={setQty} max={service.max_quantity ?? 10} label={t('quantity')} />
            </div>
          )}
          <CustomFieldInputs fields={fields} value={answers} onChange={setAnswers} errors={errors} idPrefix={`svc-${service.id}`} />
          <Field label={t('notes')} optionalLabel={t('optional')} htmlFor="svc-notes" error={errors.notes}>
            <TextArea id="svc-notes" value={notes} maxLength={1000} placeholder={pick(service, 'note_prompt') || t('notesPlaceholder')} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      ) : (
        <Badge>{t('requestNotBookable')}</Badge>
      )}
    </Sheet>
  );
}

// ------------------------------------------------------------------------------------------
function SpaSheet({ open, service, onClose }: { open: boolean; service: SpaService | null; onClose: () => void }) {
  const { t, pick, money } = useI18n();
  const flow = useFlow();
  const { bundle } = useHotel();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: bundle.hotel.profile.timezone }).format(new Date());
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState(1);
  const [notes, setNotes] = useState('');
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (open) {
      setDate(today);
      setTime('');
      setGuests(1);
      setNotes('');
      setAnswers({});
      setErrors({});
      setError(null);
    }
  }, [open, service?.id, today]);

  if (!service) return null;
  const fields = service.booking_fields ?? [];
  const submit = async () => {
    const errs = missingAnswers(fields, answers, t('required'));
    if (!time) errs.time = t('required');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setError(null);
    try {
      await flow.submit({ kind: 'SPA', service_id: service.id, date, time, guests, answers, notes });
    } catch (e) {
      setErrors(fieldErrors(e));
      if ((e as Error).message !== 'identity required') setError(e);
    }
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={pick(service, 'name')}
      description={t('bookingNote')}
      closeLabel={t('close')}
      footer={
        <div className="flex items-center gap-4">
          {service.price ? <p className="text-lg font-semibold tabular-nums">{money(service.price * guests)}</p> : null}
          <Button size="lg" className="flex-1" loading={flow.submitting} onClick={submit}>
            {t('bookTreatment')}
          </Button>
        </div>
      }
    >
      {service.image && <Img src={service.image} alt="" className="mb-5 aspect-[16/9] w-full rounded-2xl" />}
      <div className="mb-5 flex flex-wrap gap-2">
        {service.duration_minutes && <Badge>{t('duration', { n: service.duration_minutes })}</Badge>}
        <Badge tone="brand">{service.price ? money(service.price) : pick(service, 'price_note') || t('priceOnRequest')}</Badge>
      </div>
      {pick(service, 'description') && <p className="mb-5 leading-relaxed text-muted">{pick(service, 'description')}</p>}
      <GuestContextLine />
      <FormError error={error} />
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('preferredDate')} required htmlFor="spa-date" error={errors.date}>
            <TextInput id="spa-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={t('preferredTime')} required htmlFor="spa-time" error={errors.time}>
            <TextInput id="spa-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} invalid={!!errors.time} />
          </Field>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t('guests')}</span>
          <Stepper value={guests} onChange={setGuests} max={service.max_guests ?? 4} label={t('guests')} />
        </div>
        <CustomFieldInputs fields={fields} value={answers} onChange={setAnswers} errors={errors} idPrefix={`spa-${service.id}`} />
        <Field label={t('notes')} optionalLabel={t('optional')} htmlFor="spa-notes">
          <TextArea id="spa-notes" value={notes} maxLength={1000} placeholder={t('notesPlaceholder')} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  );
}

// ------------------------------------------------------------------------------------------
function IdentitySheet({ open, reason, onClose }: { open: boolean; reason?: 'in_house_required'; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onClose={onClose} title={t('yourDetails')} description={reason === 'in_house_required' ? t('addRoomToContinue') : t('identifyLead')} closeLabel={t('close')}>
      <IdentityForm forceInHouse={reason === 'in_house_required'} submitLabel={t('saveDetails')} onDone={onClose} />
    </Sheet>
  );
}

// ------------------------------------------------------------------------------------------
function BasketSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang, money } = useI18n();
  const basket = useBasket();
  const flow = useFlow();
  const { bundle } = useHotel();
  const { identity } = useGuestSession();
  const [error, setError] = useState<unknown>(null);
  const outlet = bundle.catalog.outlets.find((o) => o.id === basket.outletId);
  const outletName = basket.outletName ? (lang === 'ar' ? basket.outletName.ar : basket.outletName.en) : '';

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const submit = async () => {
    if (!basket.outletId) return;
    setError(null);
    try {
      await flow.submit({
        kind: 'ORDER',
        outlet_id: basket.outletId,
        lines: basket.lines.map((l) => ({ item_id: l.item_id, quantity: l.quantity, modifiers: l.modifiers, note: l.note })),
        notes: basket.notes,
      });
      basket.clear();
    } catch (e) {
      if ((e as Error).message !== 'identity required') setError(e);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('basket')}
      description={outletName}
      closeLabel={t('close')}
      footer={
        basket.lines.length ? (
          <div className="space-y-3">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between text-muted">
                <dt>{t('subtotal')}</dt>
                <dd className="tabular-nums">{money(basket.totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-muted">
                <dt>
                  {t('vat')} ({bundle.hotel.profile.vat_rate}%)
                </dt>
                <dd className="tabular-nums">{money(basket.totals.vat)}</dd>
              </div>
              <div className="flex justify-between pt-1 text-base font-semibold">
                <dt>{t('estimatedTotal')}</dt>
                <dd className="tabular-nums">{money(basket.totals.total)}</dd>
              </div>
            </dl>
            <Button size="lg" block loading={flow.submitting} onClick={submit}>
              {t('placeOrder')} · {money(basket.totals.total)}
            </Button>
          </div>
        ) : undefined
      }
    >
      {!basket.lines.length ? (
        <EmptyState title={t('basketEmpty')} description={t('basketEmptyHint')} />
      ) : (
        <>
          <GuestContextLine />
          <FormError error={error} />
          {identity?.type === 'IN_HOUSE' && outlet?.room_delivery && <p className="mb-3 text-sm font-medium text-brand">{t('deliverTo', { room: identity.room })}</p>}
          <ul className="divide-y divide-line">
            {basket.lines.map((l) => {
              const mods = l.groups.flatMap((g) => (l.modifiers[g.id] ?? []).map((id) => g.options.find((o) => o.id === id)).filter(Boolean).map((o) => (lang === 'ar' ? o!.name_ar || o!.name_en : o!.name_en)));
              return (
                <li key={l.key} className="flex gap-3 py-4">
                  <Img src={l.image} alt="" className="h-16 w-16 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <p className="font-semibold leading-snug">{lang === 'ar' ? l.name_ar || l.name_en : l.name_en}</p>
                      <p className="shrink-0 font-semibold tabular-nums">{money(unitPrice(l) * l.quantity)}</p>
                    </div>
                    {mods.length > 0 && <p className="mt-0.5 text-sm text-muted">{mods.join(' · ')}</p>}
                    {l.note && <p className="mt-0.5 text-sm text-muted italic">“{l.note}”</p>}
                    <div className="mt-2 flex items-center justify-between">
                      <Stepper size="sm" value={l.quantity} onChange={(q) => basket.setQuantity(l.key, q)} label={t('quantity')} />
                      <button type="button" onClick={() => basket.remove(l.key)} className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm text-muted hover:bg-black/5" aria-label={`${t('remove')} ${l.name_en}`}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        {t('remove')}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <Field label={t('orderNotes')} optionalLabel={t('optional')} htmlFor="basket-notes">
            <TextArea id="basket-notes" value={basket.notes} onChange={(e) => basket.setNotes(e.target.value)} maxLength={1000} placeholder={t('specialPlaceholder')} />
          </Field>
          <p className="mt-3 text-xs text-muted">{bundle.hotel.profile.prices_include_vat ? t('pricesIncludeVat') : t('pricesExcludeVat')}</p>
        </>
      )}
    </Sheet>
  );
}

// ------------------------------------------------------------------------------------------
function SuccessSheet() {
  const { sheet, close } = useFlow();
  const { t, lang, money } = useI18n();
  const { path } = useHotel();
  const open = sheet?.kind === 'success';
  const created = open ? sheet.created : null;
  const dept = open ? (DEPARTMENT_LABELS[sheet.department as DepartmentCode]?.[lang] ?? sheet.department) : '';
  return (
    <Sheet open={open} onClose={close} title={t('sent')} closeLabel={t('close')} size="sm" hideHeader>
      {created && (
        <div className="flex flex-col items-center pt-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
          </span>
          <h2 className="display mt-5 text-3xl">{t('sent')}</h2>
          <p className="mt-2 text-muted">{t('sentLead', { dept })}</p>
          <div className="mt-6 w-full rounded-2xl bg-black/[0.035] px-5 py-4">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">{t('referenceIs')}</p>
            <p className="ltr-nums mt-1 font-mono text-2xl font-bold tracking-wider" data-testid="request-reference">
              {created.reference}
            </p>
            {created.totals && created.totals.total > 0 && (
              <p className="mt-1 text-sm text-muted">
                {t('estimatedTotal')}: <span className="font-semibold text-fg tabular-nums">{money(created.totals.total)}</span>
              </p>
            )}
          </div>
          {created.whatsapp_url && (
            <div className="mt-5 w-full">
              <a href={created.whatsapp_url} target="_blank" rel="noopener noreferrer" className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] font-semibold text-white" data-testid="whatsapp-link">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                {t('sendWhatsApp')}
              </a>
              <p className="mt-2 text-xs text-muted">{t('whatsAppHint')}</p>
            </div>
          )}
          <div className="mt-5 grid w-full grid-cols-2 gap-3 pb-2">
            <Link to={path(`requests/${created.reference}`)} onClick={close} className="inline-flex h-12 items-center justify-center rounded-full font-semibold ring-1 ring-line">
              {t('trackRequest')}
            </Link>
            <Button size="md" className="h-12" onClick={close}>
              {t('done')}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
