import { Globe2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DEPARTMENTS, DEPARTMENT_LABELS } from '@shared/domain';
import type { HotelProfile, HotelSettings } from '@shared/hotel';
import { ApiError, errorMessage } from '../../lib/api';
import { Badge, Button, Field, Select, Skeleton, TextArea, TextInput, Toggle } from '../../components/ui';
import { useAdminHotel, useHotelMutation, useMe } from '../data';
import { useFeedback } from '../feedback';
import { Card, PageHeader } from '../layout/AdminLayout';

const c = 'h-10 rounded-lg text-sm';
const SOCIALS = ['instagram', 'x', 'facebook', 'snapchat', 'tiktok', 'youtube', 'linkedin'] as const;

export function HotelProfilePage({ hid }: { hid: string }) {
  const hotel = useAdminHotel(hid);
  const me = useMe();
  const fb = useFeedback();
  const [p, setP] = useState<HotelProfile | null>(null);
  const [s, setS] = useState<HotelSettings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const saveProfile = useHotelMutation<HotelProfile>(hid, '/profile');
  const saveSettings = useHotelMutation<HotelSettings>(hid, '/settings');
  const publication = useHotelMutation<{ published: boolean }>(hid, '/publication', 'POST');

  useEffect(() => {
    if (hotel.data) {
      setP(hotel.data.profile);
      setS(hotel.data.settings);
    }
  }, [hotel.data]);

  if (!p || !s || !hotel.data) return <Skeleton className="h-96" />;
  const set = <K extends keyof HotelProfile>(k: K, v: HotelProfile[K]) => setP({ ...p, [k]: v });
  const err = (k: string) => errors[k];

  const save = async () => {
    setErrors({});
    try {
      await saveProfile.mutateAsync(p);
      await saveSettings.mutateAsync(s);
      fb.success('Hotel profile saved');
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fields);
      fb.error(errorMessage(e));
    }
  };

  const togglePublish = async () => {
    const next = !hotel.data!.is_published;
    const ok = await fb.confirm({
      title: next ? 'Publish the guest site?' : 'Take the guest site offline?',
      message: next ? 'Guests scanning QR codes will be able to use the site.' : 'Guests will see “hotel not available”. Staff can still preview.',
      confirmLabel: next ? 'Publish' : 'Unpublish',
      danger: !next,
    });
    if (!ok) return;
    try {
      await publication.mutateAsync({ published: next });
      await hotel.refetch();
      fb.success(next ? 'Guest site is live' : 'Guest site is offline');
    } catch (e) {
      fb.error(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Hotel profile"
        description="Names, contact details, languages, currency and VAT used across the guest site and requests."
        actions={
          <>
            <Badge tone={hotel.data.is_published ? 'success' : 'warning'}>{hotel.data.is_published ? 'Guest site live' : 'Guest site offline'}</Badge>
            <Button variant="secondary" size="sm" className="rounded-lg" onClick={togglePublish} loading={publication.isPending}>
              <Globe2 className="h-4 w-4" aria-hidden="true" /> {hotel.data.is_published ? 'Unpublish' : 'Publish'}
            </Button>
            <Button size="sm" className="rounded-lg" onClick={save} loading={saveProfile.isPending || saveSettings.isPending}>
              Save changes
            </Button>
          </>
        }
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Identity">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name (English)" htmlFor="p-name-en" required error={err('name_en')}>
              <TextInput id="p-name-en" value={p.name_en} onChange={(e) => set('name_en', e.target.value)} className={c} />
            </Field>
            <Field label="Name (Arabic)" htmlFor="p-name-ar" required error={err('name_ar')}>
              <TextInput id="p-name-ar" dir="rtl" value={p.name_ar} onChange={(e) => set('name_ar', e.target.value)} className={c} />
            </Field>
            <Field label="Web address (slug)" htmlFor="p-slug" error={err('slug')} hint={me.data?.user?.global ? 'Changing it breaks printed QR codes.' : 'Only a super admin can change this.'}>
              <TextInput id="p-slug" value={p.slug} disabled={!me.data?.user?.global} onChange={(e) => set('slug', e.target.value.toLowerCase())} className={c} />
            </Field>
            <Field label="Star rating" htmlFor="p-stars">
              <Select id="p-stars" value={p.stars} onChange={(e) => set('stars', Number(e.target.value))} className={c}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {n} stars
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tagline (English)" htmlFor="p-tag-en">
              <TextInput id="p-tag-en" value={p.tagline_en} onChange={(e) => set('tagline_en', e.target.value)} className={c} />
            </Field>
            <Field label="Tagline (Arabic)" htmlFor="p-tag-ar">
              <TextInput id="p-tag-ar" dir="rtl" value={p.tagline_ar} onChange={(e) => set('tagline_ar', e.target.value)} className={c} />
            </Field>
            <Field label="Description (English)" htmlFor="p-desc-en">
              <TextArea id="p-desc-en" rows={4} value={p.description_en} onChange={(e) => set('description_en', e.target.value)} className="rounded-lg text-sm" />
            </Field>
            <Field label="Description (Arabic)" htmlFor="p-desc-ar">
              <TextArea id="p-desc-ar" rows={4} dir="rtl" value={p.description_ar} onChange={(e) => set('description_ar', e.target.value)} className="rounded-lg text-sm" />
            </Field>
          </div>
        </Card>
        <Card title="Contact & location">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Address (English)" htmlFor="p-addr-en">
              <TextArea id="p-addr-en" rows={2} value={p.address_en} onChange={(e) => set('address_en', e.target.value)} className="rounded-lg text-sm" />
            </Field>
            <Field label="Address (Arabic)" htmlFor="p-addr-ar">
              <TextArea id="p-addr-ar" rows={2} dir="rtl" value={p.address_ar} onChange={(e) => set('address_ar', e.target.value)} className="rounded-lg text-sm" />
            </Field>
            <Field label="City (English)" htmlFor="p-city-en">
              <TextInput id="p-city-en" value={p.city_en} onChange={(e) => set('city_en', e.target.value)} className={c} />
            </Field>
            <Field label="City (Arabic)" htmlFor="p-city-ar">
              <TextInput id="p-city-ar" dir="rtl" value={p.city_ar} onChange={(e) => set('city_ar', e.target.value)} className={c} />
            </Field>
            <Field label="Main phone" htmlFor="p-phone" error={err('phone')}>
              <TextInput id="p-phone" type="tel" dir="ltr" value={p.phone} onChange={(e) => set('phone', e.target.value)} className={c} />
            </Field>
            <Field label="Email" htmlFor="p-email" error={err('email')}>
              <TextInput id="p-email" type="email" value={p.email} onChange={(e) => set('email', e.target.value)} className={c} />
            </Field>
            <Field label="Website" htmlFor="p-web" error={err('website')}>
              <TextInput id="p-web" type="url" dir="ltr" value={p.website} onChange={(e) => set('website', e.target.value)} className={c} />
            </Field>
            <Field label="Map link" htmlFor="p-map" error={err('map_url')} hint="Google Maps share link used for “Directions”.">
              <TextInput id="p-map" type="url" dir="ltr" value={p.map_url} onChange={(e) => set('map_url', e.target.value)} className={c} />
            </Field>
            {SOCIALS.map((k) => (
              <Field key={k} label={k === 'x' ? 'X (Twitter)' : k[0].toUpperCase() + k.slice(1)} htmlFor={`p-soc-${k}`} error={err(`social.${k}`)}>
                <TextInput id={`p-soc-${k}`} type="url" dir="ltr" placeholder="https://" value={p.social?.[k] ?? ''} onChange={(e) => set('social', { ...p.social, [k]: e.target.value })} className={c} />
              </Field>
            ))}
          </div>
        </Card>
        <Card title="Languages, currency & VAT">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Guest languages" htmlFor="p-langs">
              <Select id="p-langs" value={p.language_mode} onChange={(e) => set('language_mode', e.target.value as HotelProfile['language_mode'])} className={c}>
                <option value="both">Arabic + English</option>
                <option value="ar">Arabic only</option>
                <option value="en">English only</option>
              </Select>
            </Field>
            <Field label="Default language" htmlFor="p-deflang">
              <Select id="p-deflang" value={p.default_language} onChange={(e) => set('default_language', e.target.value as 'ar' | 'en')} className={c}>
                <option value="ar">Arabic</option>
                <option value="en">English</option>
              </Select>
            </Field>
            <Field label="Currency (ISO code)" htmlFor="p-cur" error={err('currency')}>
              <TextInput id="p-cur" maxLength={3} value={p.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} className={c} />
            </Field>
            <Field label="Time zone" htmlFor="p-tz" error={err('timezone')} hint="Used for opening hours and daily figures.">
              <TextInput id="p-tz" value={p.timezone} onChange={(e) => set('timezone', e.target.value)} className={c} />
            </Field>
            <Field label="VAT rate (%)" htmlFor="p-vat" error={err('vat_rate')}>
              <TextInput id="p-vat" type="number" min={0} max={50} step="0.5" value={p.vat_rate} onChange={(e) => set('vat_rate', Number(e.target.value))} className={c} />
            </Field>
            <div className="pt-6">
              <Toggle label="Menu prices include VAT" description="Items can override this individually." checked={p.prices_include_vat} onChange={(v) => set('prices_include_vat', v)} />
            </div>
          </div>
        </Card>
        <Card title="Guest settings">
          <div className="space-y-4">
            <Toggle label="External visitors can use the site" description="Off = only in-house guests (room number required)." checked={s.external_guests_enabled} onChange={(v) => setS({ ...s, external_guests_enabled: v })} />
            <Toggle label="Phone number required" checked={s.require_phone} onChange={(v) => setS({ ...s, require_phone: v })} />
            <Toggle label="Guest reviews enabled" description="Reviews are published only after approval." checked={s.reviews_enabled} onChange={(v) => setS({ ...s, reviews_enabled: v })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="WhatsApp fallback department" htmlFor="s-fallback" hint="Used when a department has no WhatsApp number.">
                <Select id="s-fallback" value={s.fallback_department ?? ''} onChange={(e) => setS({ ...s, fallback_department: (e.target.value || null) as HotelSettings['fallback_department'] })} className={c}>
                  <option value="">None (admin queue only)</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {DEPARTMENT_LABELS[d].en}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Emergency phone" htmlFor="s-emerg" error={errors.emergency_phone} hint="Used by the Emergency quick action.">
                <TextInput id="s-emerg" type="tel" dir="ltr" value={s.emergency_phone} onChange={(e) => setS({ ...s, emergency_phone: e.target.value })} className={c} />
              </Field>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
