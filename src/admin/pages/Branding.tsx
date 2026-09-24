import { ArrowDown, ArrowUp, Plus, Trash2, Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FONT_CHOICES, type Branding } from '@shared/hotel';
import { ApiError, errorMessage } from '../../lib/api';
import { contrastRatio, paletteFromImage } from '../../lib/theme';
import { Badge, Button, Field, IconButton, Select, Skeleton, TextInput } from '../../components/ui';
import { useAdminHotel, useHotelMutation } from '../data';
import { useFeedback } from '../feedback';
import { MediaInput } from '../components/MediaInput';
import { Card, PageHeader } from '../layout/AdminLayout';

const COLORS: { key: keyof Branding['colors']; label: string; hint: string }[] = [
  { key: 'primary', label: 'Primary', hint: 'Buttons, active states' },
  { key: 'secondary', label: 'Secondary', hint: 'Dark sections, footer' },
  { key: 'accent', label: 'Accent', hint: 'Highlights, stars, eyebrows' },
  { key: 'background', label: 'Background', hint: 'Page background' },
  { key: 'surface', label: 'Surface', hint: 'Cards and sheets' },
  { key: 'text', label: 'Text', hint: 'Body text' },
  { key: 'muted', label: 'Muted text', hint: 'Secondary text' },
];

export function BrandingPage({ hid }: { hid: string }) {
  const hotel = useAdminHotel(hid);
  const fb = useFeedback();
  const [b, setB] = useState<Branding | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useHotelMutation<Branding>(hid, '/branding');
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    if (hotel.data) setB(hotel.data.branding);
  }, [hotel.data]);
  if (!b) return <Skeleton className="h-96" />;

  const setColor = (k: keyof Branding['colors'], v: string) => setB({ ...b, colors: { ...b.colors, [k]: v } });
  const textContrast = contrastRatio(b.colors.text, b.colors.background);
  const mutedContrast = contrastRatio(b.colors.muted, b.colors.background);

  const suggest = async () => {
    if (!b.logo) return fb.error('Add a logo first.');
    setSuggesting(true);
    const p = await paletteFromImage(b.logo);
    setSuggesting(false);
    if (!p) return fb.error('Could not read colors from this logo (the image host may block it). Upload the logo to use this feature.');
    setB({ ...b, colors: { ...b.colors, primary: p.primary, accent: p.accent, secondary: p.secondary } });
    fb.success('Suggested colors applied — review and save.');
  };

  const onSave = async () => {
    setErrors({});
    try {
      await save.mutateAsync(b);
      fb.success('Branding saved — guest site updated');
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fields);
      fb.error(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Branding"
        description="Logo, colors, typography and gallery used by the guest site. Changes go live when saved."
        actions={
          <Button size="sm" className="rounded-lg" onClick={onSave} loading={save.isPending}>
            Save branding
          </Button>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Card title="Logos">
            <div className="grid gap-5 md:grid-cols-3">
              <Field label="Logo (on light backgrounds)" htmlFor="b-logo" error={errors.logo}>
                <MediaInput hid={hid} id="b-logo" value={b.logo} onChange={(v) => setB({ ...b, logo: v })} />
              </Field>
              <Field label="Inverse logo (on photos / dark)" htmlFor="b-logo-inv" error={errors.logo_inverse}>
                <MediaInput hid={hid} id="b-logo-inv" value={b.logo_inverse} onChange={(v) => setB({ ...b, logo_inverse: v })} />
              </Field>
              <Field label="Favicon" htmlFor="b-fav" error={errors.favicon}>
                <MediaInput hid={hid} id="b-fav" value={b.favicon} onChange={(v) => setB({ ...b, favicon: v })} />
              </Field>
            </div>
          </Card>
          <Card
            title="Colors"
            actions={
              <Button variant="secondary" size="sm" className="rounded-lg" onClick={suggest} loading={suggesting}>
                <Wand2 className="h-4 w-4" aria-hidden="true" /> Suggest from logo
              </Button>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {COLORS.map((c) => (
                <Field key={c.key} label={c.label} htmlFor={`b-c-${c.key}`} hint={c.hint} error={errors[`colors.${c.key}`]}>
                  <div className="flex items-center gap-2">
                    <input type="color" aria-label={`${c.label} color picker`} value={b.colors[c.key]} onChange={(e) => setColor(c.key, e.target.value.toUpperCase())} className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-black/10" />
                    <TextInput id={`b-c-${c.key}`} value={b.colors[c.key]} onChange={(e) => setColor(c.key, e.target.value)} className="h-10 rounded-lg font-mono text-sm" />
                  </div>
                </Field>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <Badge tone={textContrast >= 4.5 ? 'success' : 'danger'}>Text contrast {textContrast.toFixed(1)}:1</Badge>
              <Badge tone={mutedContrast >= 4.5 ? 'success' : mutedContrast >= 3 ? 'warning' : 'danger'}>Muted contrast {mutedContrast.toFixed(1)}:1</Badge>
              <span className="text-xs text-zinc-500">WCAG AA needs 4.5:1 for body text.</span>
            </div>
          </Card>
          <Card title="Typography">
            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  ['display', 'Headings (Latin)'],
                  ['en', 'Body (Latin)'],
                  ['ar', 'Arabic'],
                ] as const
              ).map(([k, label]) => (
                <Field key={k} label={label} htmlFor={`b-f-${k}`}>
                  <Select id={`b-f-${k}`} value={b.fonts[k]} onChange={(e) => setB({ ...b, fonts: { ...b.fonts, [k]: e.target.value } })} className="h-10 rounded-lg text-sm">
                    {FONT_CHOICES[k].map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
            </div>
          </Card>
          <Card title="Gallery" description="Photos for the homepage gallery and fallbacks.">
            <ul className="space-y-3">
              {b.gallery.map((g, i) => (
                <li key={i} className="grid items-start gap-2 rounded-xl border border-black/[0.07] p-3 md:grid-cols-[1fr_12rem_12rem_auto]">
                  <MediaInput hid={hid} id={`b-g-${i}`} value={g.url} onChange={(v) => setB({ ...b, gallery: b.gallery.map((x, j) => (j === i ? { ...x, url: v } : x)) })} />
                  <TextInput aria-label="Caption (English)" placeholder="Caption" value={g.caption_en} onChange={(e) => setB({ ...b, gallery: b.gallery.map((x, j) => (j === i ? { ...x, caption_en: e.target.value } : x)) })} className="h-10 rounded-lg text-sm" />
                  <TextInput aria-label="Caption (Arabic)" dir="rtl" placeholder="الوصف" value={g.caption_ar} onChange={(e) => setB({ ...b, gallery: b.gallery.map((x, j) => (j === i ? { ...x, caption_ar: e.target.value } : x)) })} className="h-10 rounded-lg text-sm" />
                  <div className="flex">
                    <IconButton label="Move up" size="sm" onClick={() => i > 0 && setB({ ...b, gallery: b.gallery.map((x, j) => (j === i - 1 ? b.gallery[i] : j === i ? b.gallery[i - 1] : x)) })}>
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                    <IconButton label="Move down" size="sm" onClick={() => i < b.gallery.length - 1 && setB({ ...b, gallery: b.gallery.map((x, j) => (j === i + 1 ? b.gallery[i] : j === i ? b.gallery[i + 1] : x)) })}>
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                    <IconButton label="Remove photo" size="sm" className="text-red-600" onClick={() => setB({ ...b, gallery: b.gallery.filter((_, j) => j !== i) })}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
            <Button variant="secondary" size="sm" className="mt-3 rounded-lg" onClick={() => setB({ ...b, gallery: [...b.gallery, { url: '', caption_en: '', caption_ar: '' }] })}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add photo
            </Button>
          </Card>
        </div>
        <aside aria-label="Brand preview" className="xl:sticky xl:top-6 xl:self-start">
          <div className="overflow-hidden rounded-2xl border border-black/[0.07]" style={{ background: b.colors.background, color: b.colors.text }}>
            <div className="p-6" style={{ background: b.colors.secondary, color: '#fff' }}>
              {b.logo_inverse || b.logo ? <img src={b.logo_inverse || b.logo} alt="Logo preview" className="h-10 w-auto object-contain" /> : <p className="text-xs opacity-60">No logo</p>}
              <p className="mt-6 text-3xl" style={{ fontFamily: `'${b.fonts.display}', serif` }}>
                {hotel.data?.profile.name_en}
              </p>
              <p className="mt-1 text-xs tracking-widest uppercase" style={{ color: b.colors.accent }}>
                Accent · eyebrow
              </p>
            </div>
            <div className="space-y-3 p-6" style={{ fontFamily: `'${b.fonts.en}', sans-serif` }}>
              <div className="rounded-xl p-4" style={{ background: b.colors.surface }}>
                <p className="font-semibold">Card title</p>
                <p className="text-sm" style={{ color: b.colors.muted }}>
                  Muted supporting text
                </p>
              </div>
              <button type="button" className="h-11 w-full rounded-full font-semibold text-white" style={{ background: b.colors.primary }} tabIndex={-1}>
                Primary button
              </button>
              <p dir="rtl" className="text-lg" style={{ fontFamily: `'${b.fonts.ar}', sans-serif` }}>
                {hotel.data?.profile.name_ar}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
