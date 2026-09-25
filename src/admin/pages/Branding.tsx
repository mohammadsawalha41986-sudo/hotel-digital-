import { ArrowDown, ArrowUp, CheckCircle2, ExternalLink, Plus, RotateCcw, Sparkles, Trash2, Undo2, Wand2, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FONT_CHOICES, HEADING_WEIGHTS, TYPE_SCALES, type Branding } from '@shared/hotel';
import { DEFAULT_SEED, TOKEN_KEYS, TOKEN_LABELS, contrastReport, deriveTheme, isHex, resolveTheme, type PaletteResult, type ThemeTokens, type TokenKey } from '@shared/theme';
import { ApiError, api, errorMessage } from '../../lib/api';
import { Badge, Button, Field, IconButton, Segmented, Select, Skeleton, TextInput, cx } from '../../components/ui';
import { useAdminHotel, useHotelMutation } from '../data';
import { useFeedback } from '../feedback';
import { Card, PageHeader } from '../layout/AdminLayout';
import { MediaInput } from '../components/MediaInput';
import { ThemePreview } from '../components/ThemePreview';
import { tr, L } from '../i18n';

const LOGOS: { key: 'logo' | 'logo_inverse' | 'logo_dark' | 'mark' | 'favicon'; label: string; spec: string; hint: string }[] = [
  { key: 'logo', label: 'Primary logo', spec: 'logo', hint: 'Header on light backgrounds. PNG/WebP with transparency, or SVG.' },
  { key: 'logo_inverse', label: 'Inverse logo', spec: 'logo', hint: 'White/light version for dark heroes and the footer.' },
  { key: 'logo_dark', label: 'Dark logo', spec: 'logo', hint: 'Only if the primary logo is light: used on light backgrounds.' },
  { key: 'mark', label: 'Square mark', spec: 'mark', hint: 'Icon-only mark for small spaces and the app icon.' },
  { key: 'favicon', label: 'Favicon', spec: 'favicon', hint: 'Browser tab icon.' },
];

/** Colour input: native picker + hex field, both accessible. */
function ColorField({ id, label, value, onChange, hint, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; hint?: string; placeholder?: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={tr('{0} picker', { 0: label })} value={isHex(value) ? value : isHex(placeholder) ? placeholder : '#000000'} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-black/10 bg-white p-1" />
        <TextInput
          id={id}
          value={text}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value);
            if (isHex(e.target.value)) onChange(e.target.value.toUpperCase());
          }}
          onBlur={() => setText(value)}
          className="h-10 rounded-lg font-mono text-sm uppercase"
          maxLength={7}
        />
      </div>
    </Field>
  );
}

export function BrandingPage({ hid }: { hid: string }) {
  const hotel = useAdminHotel(hid);
  const fb = useFeedback();
  const save = useHotelMutation<Branding>(hid, '/branding');
  const [b, setBState] = useState<Branding | null>(null);
  const [history, setHistory] = useState<Branding[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [analysis, setAnalysis] = useState<{ palette: PaletteResult; tokens: ThemeTokens } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (hotel.data) {
      setBState(hotel.data.branding);
      setHistory([]);
    }
  }, [hotel.data]);

  const tokens = useMemo(() => (b ? resolveTheme(b.colors, b.theme.overrides) : null), [b]);
  const derived = useMemo(() => (b ? deriveTheme(b.colors) : null), [b]);
  if (!b || !tokens || !derived) return <Skeleton className="h-96" />;

  const saved = JSON.stringify(hotel.data?.branding) === JSON.stringify(b);
  /** Every edit is undoable. */
  const setB = (next: Branding) => {
    setHistory((h) => [...h.slice(-49), b]);
    setBState(next);
  };
  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setBState(prev);
  };
  const setSeed = (k: keyof Branding['colors'], v: string) => setB({ ...b, colors: { ...b.colors, [k]: v }, theme: { ...b.theme, source: 'manual' } });
  const setOverride = (k: TokenKey, v: string | undefined) => {
    const overrides = { ...b.theme.overrides };
    if (v === undefined) delete overrides[k];
    else overrides[k] = v;
    setB({ ...b, theme: { ...b.theme, overrides } });
  };
  const report = contrastReport(tokens);
  const overridden = TOKEN_KEYS.filter((k) => isHex(b.theme.overrides[k]));

  const analyze = async () => {
    if (!b.logo && !b.mark) return fb.error(tr('Add a logo first.'));
    setAnalyzing(true);
    try {
      setAnalysis(await api<{ palette: PaletteResult; tokens: ThemeTokens }>(`/admin/hotels/${hid}/branding/analyze`, { method: 'POST', body: { url: b.logo || b.mark } }));
    } catch (e) {
      fb.error(errorMessage(e));
    } finally {
      setAnalyzing(false);
    }
  };
  const applyAnalysis = (keepOverrides: boolean) => {
    if (!analysis) return;
    const { primary, secondary, accent } = analysis.palette;
    setB({ ...b, colors: { primary, secondary, accent }, theme: { overrides: keepOverrides ? b.theme.overrides : {}, source: 'logo' } });
    setAnalysis(null);
    fb.success(tr('Theme generated from the logo — review the preview, then save.'));
  };

  const onSave = async () => {
    setErrors({});
    try {
      await save.mutateAsync(b);
      setHistory([]);
      fb.success(tr('Branding saved as a draft — publish to show it to guests'));
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fields);
      fb.error(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        title={tr('Brand & theme')}
        description={tr('Logos, brand colours, the full colour system and typography of the guest site. Saved changes stay in draft until you publish.')}
        actions={
          <>
            {!saved && <Badge tone="warning">{tr('Unsaved changes')}</Badge>}
            <Button variant="ghost" size="sm" className="rounded-lg" onClick={undo} disabled={!history.length}>
              <Undo2 className="h-4 w-4" aria-hidden="true" />{' '}{tr('Undo')}</Button>
            {hotel.data && (
              <a href={`/h/${hotel.data.profile.slug}?preview=1`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-zinc-700 ring-1 ring-black/10 hover:bg-zinc-50">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />{' '}{tr('Full preview')}</a>
            )}
            <Button size="sm" className="rounded-lg" onClick={onSave} loading={save.isPending} disabled={saved}>{tr('Save branding')}</Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)]">
        <div className="min-w-0 space-y-6">
          <Card title={tr('Logos')} description={tr('Upload or link each variant. SVG is accepted for logos after a safety check.')}>
            <div className="grid gap-5 2xl:grid-cols-2">
              {LOGOS.map((l) => (
                <Field key={l.key} label={tr(l.label)} htmlFor={`b-${l.key === 'logo' ? 'logo' : l.key}`} hint={tr(l.hint)} error={errors[l.key]}>
                  <div className={cx('rounded-xl p-2', l.key === 'logo_inverse' && 'bg-zinc-800')}>
                    <MediaInput hid={hid} id={`b-${l.key === 'logo' ? 'logo' : l.key}`} spec={l.spec} value={b[l.key]} onChange={(v) => setB({ ...b, [l.key]: v })} />
                  </div>
                </Field>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-dashed border-black/15 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{tr('Generate the theme from the logo')}</p>
                  <p className="text-sm text-zinc-500">{tr('Finds the brand colours in the logo (ignoring white, black and transparent areas) and derives a complete, readable colour system.')}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={analyze} loading={analyzing} disabled={!b.logo && !b.mark}>
                  <Wand2 className="h-4 w-4" aria-hidden="true" />{' '}{tr('Analyse logo')}</Button>
              </div>
              {analysis && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2" aria-label={tr('Colours found in the logo')}>
                    {analysis.palette.swatches.map((s) => (
                      <span key={s.hex} className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 py-1 ps-1 pe-2.5 text-xs">
                        <span className="h-5 w-5 rounded-full ring-1 ring-black/10" style={{ background: s.hex }} />
                        <span className="font-mono">{s.hex}</span> {Math.round(s.weight * 100)}%
                      </span>
                    ))}
                    {analysis.palette.monochrome && <Badge tone="info">{tr('Monochrome logo — a neutral primary is used')}</Badge>}
                  </div>
                  <p className="text-sm">{tr('Suggested: primary')}{' '}<span className="font-mono">{analysis.palette.primary}</span>{tr(', secondary')}{' '}<span className="font-mono">{analysis.palette.secondary}</span>{tr(', accent')}{' '}<span className="font-mono">{analysis.palette.accent}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => applyAnalysis(false)}>
                      <Sparkles className="h-4 w-4" aria-hidden="true" />{' '}{tr('Apply theme')}</Button>
                    {overridden.length > 0 && (
                      <Button size="sm" variant="secondary" onClick={() => applyAnalysis(true)}>{tr('Apply, keep my {0} manual colour(s)', { 0: overridden.length })}</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setAnalysis(null)}>{tr('Dismiss')}</Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card
            title={tr('Brand colours')}
            description={tr('The three colours the whole theme is derived from. Source: {0}.', { 0: b.theme.source === 'logo' ? tr('generated from the logo') : b.theme.source === 'manual' ? tr('set manually') : 'default' })}
            actions={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setB({ ...b, theme: { ...b.theme, overrides: {} } })} disabled={!overridden.length}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />{' '}{tr('Regenerate')}</Button>
                <Button size="sm" variant="ghost" onClick={() => setB({ ...b, colors: { ...DEFAULT_SEED }, theme: { overrides: {}, source: 'default' } })}>{tr('Reset')}</Button>
              </div>
            }
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <ColorField id="b-c-primary" label={tr('Primary')} value={b.colors.primary} onChange={(v) => setSeed('primary', v)} />
              <ColorField id="b-c-secondary" label={tr('Secondary')} value={b.colors.secondary} onChange={(v) => setSeed('secondary', v)} />
              <ColorField id="b-c-accent" label={tr('Accent')} value={b.colors.accent} onChange={(v) => setSeed('accent', v)} />
            </div>
            <p className="mt-3 text-xs text-zinc-500">{tr('“Regenerate” removes manual colours so every token is derived again; “Reset” returns to the default palette.')}</p>
          </Card>

          <Card title={tr('Colour system')} description={tr('Derived automatically and kept readable. Override any token; “Auto” tokens follow the brand colours.')}>
            <ul className="grid gap-3 md:grid-cols-2">
              {TOKEN_KEYS.map((k) => {
                const manual = isHex(b.theme.overrides[k]);
                return (
                  <li key={k} className="flex items-start gap-3 rounded-xl border border-black/[0.07] p-3">
                    <span className="mt-1 h-9 w-9 shrink-0 rounded-lg ring-1 ring-black/10" style={{ background: tokens[k] }} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{L(TOKEN_LABELS[k])}</p>
                        {manual ? <Badge tone="warning">{tr('Manual')}</Badge> : <Badge tone="neutral">{tr('Auto')}</Badge>}
                      </div>
                      <p className="text-xs text-zinc-500">{TOKEN_LABELS[k].hint}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <input type="color" aria-label={tr('{0} colour', { 0: L(TOKEN_LABELS[k]) })} value={tokens[k]} onChange={(e) => setOverride(k, e.target.value.toUpperCase())} className="h-8 w-10 cursor-pointer rounded-md border border-black/10 bg-white p-0.5" />
                        <span className="font-mono text-xs">{tokens[k]}</span>
                        {manual && (
                          <button type="button" className="ms-auto text-xs font-medium text-zinc-600 underline-offset-2 hover:underline" onClick={() => setOverride(k, undefined)}>{tr('Use auto ({0})', { 0: derived[k] })}</button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title={tr('Readability')} description={tr('WCAG contrast of the combinations guests read. Derived themes always pass; manual colours may not.')}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {report.map((r) => (
                <li key={r.label} className={cx('flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm', r.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800')}>
                  <span className="flex items-center gap-2">
                    {r.ok ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
                    {tr(r.label)}
                  </span>
                  <span className="font-mono text-xs">
                    {r.ratio.toFixed(2)}:1 {r.ok ? '' : tr('(needs {0}:1)', { 0: r.min })}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title={tr('Typography')} description={tr('Arabic, English and display typefaces are set independently.')}>
            <div className="grid gap-4 sm:grid-cols-3">
              {(['en', 'ar', 'display'] as const).map((k) => (
                <Field key={k} label={k === 'en' ? tr('English text') : k === 'ar' ? tr('Arabic text') : tr('Display headings')} htmlFor={`b-font-${k}`}>
                  <Select id={`b-font-${k}`} value={b.fonts[k]} onChange={(e) => setB({ ...b, fonts: { ...b.fonts, [k]: e.target.value } })}>
                    {FONT_CHOICES[k].map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </Select>
                </Field>
              ))}
              <Field label={tr('Text size')} htmlFor="b-scale">
                <Select id="b-scale" value={b.fonts.scale} onChange={(e) => setB({ ...b, fonts: { ...b.fonts, scale: e.target.value as (typeof TYPE_SCALES)[number] } })}>
                  <option value="compact">{tr('Compact')}</option>
                  <option value="default">{tr('Standard')}</option>
                  <option value="large">{tr('Large (easier to read)')}</option>
                </Select>
              </Field>
              <Field label={tr('Heading weight')} htmlFor="b-weight">
                <Select id="b-weight" value={b.fonts.heading_weight} onChange={(e) => setB({ ...b, fonts: { ...b.fonts, heading_weight: e.target.value as (typeof HEADING_WEIGHTS)[number] } })}>
                  <option value="500">{tr('Medium')}</option>
                  <option value="600">{tr('Semibold')}</option>
                  <option value="700">{tr('Bold')}</option>
                </Select>
              </Field>
            </div>
          </Card>

          <Card title={tr('Gallery')} description={tr('Photos for the homepage gallery and fallbacks.')}>
            <ul className="space-y-3">
              {b.gallery.map((g, i) => (
                <li key={i} className="grid items-start gap-2 rounded-xl border border-black/[0.07] p-3 md:grid-cols-[1fr_12rem_12rem_auto]">
                  <MediaInput hid={hid} id={`b-g-${i}`} spec="gallery" value={g.url} onChange={(v) => setB({ ...b, gallery: b.gallery.map((x, j) => (j === i ? { ...x, url: v } : x)) })} />
                  <TextInput aria-label={tr('Caption (English)')} placeholder={tr('Caption')} value={g.caption_en} onChange={(e) => setB({ ...b, gallery: b.gallery.map((x, j) => (j === i ? { ...x, caption_en: e.target.value } : x)) })} className="h-10 rounded-lg text-sm" />
                  <TextInput aria-label={tr('Caption (Arabic)')} dir="rtl" placeholder="الوصف" value={g.caption_ar} onChange={(e) => setB({ ...b, gallery: b.gallery.map((x, j) => (j === i ? { ...x, caption_ar: e.target.value } : x)) })} className="h-10 rounded-lg text-sm" />
                  <div className="flex">
                    <IconButton label={tr('Move up')} size="sm" disabled={i === 0} onClick={() => i > 0 && setB({ ...b, gallery: b.gallery.map((x, j) => (j === i - 1 ? b.gallery[i] : j === i ? b.gallery[i - 1] : x)) })}>
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                    <IconButton label={tr('Move down')} size="sm" disabled={i === b.gallery.length - 1} onClick={() => i < b.gallery.length - 1 && setB({ ...b, gallery: b.gallery.map((x, j) => (j === i + 1 ? b.gallery[i] : j === i ? b.gallery[i + 1] : x)) })}>
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                    <IconButton label={tr('Remove photo')} size="sm" className="text-red-600" onClick={() => setB({ ...b, gallery: b.gallery.filter((_, j) => j !== i) })}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
            <Button variant="secondary" size="sm" className="mt-3 rounded-lg" onClick={() => setB({ ...b, gallery: [...b.gallery, { url: '', caption_en: '', caption_ar: '' }] })}>
              <Plus className="h-4 w-4" aria-hidden="true" />{' '}{tr('Add photo')}</Button>
          </Card>
        </div>

        <aside aria-label={tr('Theme preview')} className="space-y-3 xl:sticky xl:top-20 xl:self-start">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">{tr('Live preview')}</p>
            <div className="w-56">
              <Segmented label={tr('Device')} value={device} onChange={setDevice} options={[{ value: 'mobile', label: tr('Mobile') }, { value: 'desktop', label: tr('Desktop') }]} />
            </div>
          </div>
          <ThemePreview branding={b} nameEn={hotel.data?.profile.name_en ?? ''} nameAr={hotel.data?.profile.name_ar ?? ''} device={device} />
        </aside>
      </div>
    </>
  );
}
