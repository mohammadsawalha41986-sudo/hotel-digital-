import { BedDouble, MapPin } from 'lucide-react';
import { useState } from 'react';
import type { GuestType } from '@shared/domain';
import { guestIdentitySchema, type GuestIdentity } from '@shared/hotel';
import { useI18n } from '../../lib/i18n';
import { Button, Field, TextInput, cx } from '../../components/ui';
import { useHotel } from '../hotel';
import { useGuestSession } from '../session';

/** Collects guest type, name, room and phone once; reused when editing later. */
export function IdentityForm({ onDone, submitLabel, forceInHouse }: { onDone?: (g: GuestIdentity) => void; submitLabel?: string; forceInHouse?: boolean }) {
  const { t } = useI18n();
  const { bundle } = useHotel();
  const { identity, setIdentity, qrRoom } = useGuestSession();
  const allowExternal = bundle.hotel.settings.external_guests_enabled && !forceInHouse;
  const requirePhone = bundle.hotel.settings.require_phone;
  const [type, setType] = useState<GuestType>(forceInHouse || qrRoom || !allowExternal ? 'IN_HOUSE' : identity?.type ?? 'IN_HOUSE');
  const [name, setName] = useState(identity?.name ?? '');
  const [phone, setPhone] = useState(identity?.phone ?? '');
  const [room, setRoom] = useState(qrRoom || identity?.room || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const candidate = { type, name, phone, room: type === 'IN_HOUSE' ? room : '' };
    const parsed = guestIdentitySchema.safeParse(candidate);
    const errs: Record<string, string> = {};
    if (!parsed.success) {
      for (const i of parsed.error.issues) {
        const k = String(i.path[0]);
        if (k === 'name') errs.name = t('fullName') + ' — ' + t('required');
        else if (k === 'room') errs.room = t('roomNumber') + ' — ' + t('required');
        else if (k === 'phone') errs.phone = i.message;
      }
    }
    if (requirePhone && !phone.trim()) errs.phone = t('phone') + ' — ' + t('required');
    setErrors(errs);
    if (Object.keys(errs).length || !parsed.success) {
      document.getElementById(`guest-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setIdentity(parsed.data);
    onDone?.(parsed.data);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {allowExternal && (
        <fieldset>
          <legend className="sr-only">{t('yourDetails')}</legend>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ['IN_HOUSE', t('inHouse'), t('inHouseHint'), BedDouble],
                ['EXTERNAL', t('external'), t('externalHint'), MapPin],
              ] as const
            ).map(([value, label, hint, Icon]) => (
              <label
                key={value}
                className={cx(
                  'relative flex cursor-pointer flex-col gap-2 rounded-2xl border p-4 transition',
                  type === value ? 'border-brand bg-[color-mix(in_oklab,var(--c-primary)_6%,transparent)] ring-1 ring-brand' : 'border-line hover:border-black/20'
                )}
              >
                <input type="radio" name="guest-type" value={value} checked={type === value} onChange={() => setType(value)} className="sr-only" />
                <Icon className={cx('h-5 w-5', type === value ? 'text-brand' : 'text-muted')} aria-hidden="true" />
                <span className="font-semibold leading-tight">{label}</span>
                <span className="text-xs leading-snug text-muted">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {type === 'IN_HOUSE' && (
        <Field label={t('roomNumber')} required htmlFor="guest-room" error={errors.room} hint={qrRoom ? t('qrRoomDetected', { room: qrRoom }) : undefined}>
          <TextInput id="guest-room" inputMode="text" autoComplete="off" maxLength={12} value={room} onChange={(e) => setRoom(e.target.value.toUpperCase())} invalid={!!errors.room} className="ltr-nums text-lg font-semibold tracking-wider" />
        </Field>
      )}
      <Field label={t('fullName')} required htmlFor="guest-name" error={errors.name}>
        <TextInput id="guest-name" autoComplete="name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} invalid={!!errors.name} />
      </Field>
      <Field label={t('phone')} required={requirePhone} optionalLabel={t('optional')} htmlFor="guest-phone" error={errors.phone} hint={t('phoneHint')}>
        <TextInput id="guest-phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="+966 5x xxx xxxx" maxLength={24} value={phone} onChange={(e) => setPhone(e.target.value)} invalid={!!errors.phone} className="text-start" />
      </Field>
      <Button type="submit" size="lg" block>
        {submitLabel ?? t('continue')}
      </Button>
    </form>
  );
}
