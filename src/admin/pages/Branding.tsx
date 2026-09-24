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
        <input type="color" aria-label={`${label} picker`} value={isHex(value) ? value : isHex(placeholder) ? placeholder : '#000000'} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-black/10 bg-white p-1" />
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
    if (!b.logo && !b.mark) return fb.error('Add a logo first.');
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
    fb.success('Theme generated from the logo — review the preview, then save.');
  };

  const onSave = async () => {
    setErrors({});
    try {
      await save.mutateAsync(b);
      setHistory([]);
      fb.success('Branding saved as a draft — publish to show it to guests');
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fields);
      fb.error(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Brand & theme"
        description="Logos, brand colours, the full colour system and typography of the guest site. Saved changes stay in draft until you publish."
        actions={
          <>
            {!saved && <Badge tone="warning">Unsaved changes</Badge>}
            <Button variant="ghost" size="sm" className="rounded-lg" onClick={undo} disabled={!history.length}>
              <Undo2 className="h-4 w-4" aria-hidden="true" /> Undo
            </Button>
            {hotel.data && (
              <a href={`/h/${hotel.data.profile.slug}?preview=1`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-zinc-700 ring-1 ring-black/10 hover:bg-zinc-50">
                <ExternalLink className="h-4 w-4" aria-hidden="true" /> Full preview
              </a>
            )}
            <Button size="sm" className="rounded-lg" onClick={onSave} loading={save.isPending} disabled={saved}>
              Save branding
            </Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)]">
        <div className="min-w-0 space-y-6">
          <Card title="Logos" description="Upload or link each variant. SVG is accepted for logos after a safety check.">
            <div className="grid gap-5 2xl:grid-cols-2">
              {LOGOS.map((l) => (
                <Field key={l.key} label={l.label} htmlFor={`b-${l.key === 'logo' ? 'logo' : l.key}`} hint={l.hint} error={errors[l.key]}>
                  <div className={cx('rounded-xl p-2', l.key === 'logo_inverse' && 'bg-zinc-800')}>
                    <MediaInput hid={hid} id={`b-${l.key === 'logo' ? 'logo' : l.key}`} spec={l.spec} value={b[l.key]} onChange={(v) => setB({ ...b, [l.key]: v })} />
                  </div>
                </Field>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-dashed border-black/15 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Generate the theme from the logo</p>
                  <p className="text-sm text-zinc-500">Finds the brand colours in the logo (ignoring white, black and transparent areas) and derives a complete, readable colour system.</p>
                </div>
                <Button size="sm" variant="secondary" onClick={analyze} loading={analyzing} disabled={!b.logo && !b.mark}>
                  <Wand2 className="h-4 w-4" aria-hidden="true" /> Analyse logo
                </Button>
              </div>
              {analysis && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2" aria-label="Colours found in the logo">
                    {analysis.palette.swatches.map((s) => (
                      <span key={s.hex} className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 py-1 ps-1 pe-2.5 text-xs">
                        <span className="h-5 w-5 rounded-full ring-1 ring-black/10" style={{ background: s.hex }} />
                        <span className="font-mono">{s.hex}</span> {Math.round(s.weight * 100)}%
                      </span>
                    ))}
                    {analysis.palette.monochrome && <Badge tone="info">Monochrome logo — a neutral primary is used</Badge>}
                  </div>
                  <p className="text-sm">
                    Suggested: primary <span className="font-mono">{analysis.palette.primary}</span>, secondary <span className="font-mono">{analysis.palette.secondary}</span>, accent <span className="font-mono">{analysis.palette.accent}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => applyAnalysis(false)}>
                      <Sparkles className="h-4 w-4" aria-hidden="true" /> Apply theme
                    </Button>
                    {overridden.length > 0 && (
                      <Button size="sm" variant="secondary" onClick={() => applyAnalysis(true)}>
                        Apply, keep my {overridden.length} manual colour(s)
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setAnalysis(null)}>Dismiss</Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card
            title="Brand colours"
            description={`The three colours the whole theme is derived from. Source: ${b.theme.source === 'logo' ? 'generated from the logo' : b.theme.source === 'manual' ? 'set manually' : 'default'}.`}
            actions={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setB({ ...b, theme: { ...b.theme, overrides: {} } })} disabled={!overridden.length}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Regenerate
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setB({ ...b, colors: { ...DEFAULT_SEED }, theme: { overrides: {}, source: 'default' } })}>
                  Reset
                </Button>
              </div>
            }
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <ColorField id="b-c-primary" label="Primary" value={b.colors.primary} onChange={(v) => setSeed('primary', v)} />
              <ColorField id="b-c-secondary" label="Secondary" value={b.colors.secondary} onChange={(v) => setSeed('secondary', v)} />
              <ColorField id="b-c-accent" label="Accent" value={b.colors.accent} onChange={(v) => setSeed('accent', v)} />
            </div>
            <p className="mt-3 text-xs text-zinc-500">“Regenerate” removes manual colours so every token is derived again; “Reset” returns to the default palette.</p>
          </Card>

          <Card title="Colour system" description="Derived automatically and kept readable. Override any token; “Auto” tokens follow the brand colours.">
            <ul className="grid gap-3 md:grid-cols-2">
              {TOKEN_KEYS.map((k) => {
                const manual = isHex(b.theme.overrides[k]);
                return (
                  <li key={k} className="flex items-start gap-3 rounded-xl border border-black/[0.07] p-3">
                    <span className="mt-1 h-9 w-9 shrink-0 rounded-lg ring-1 ring-black/10" style={{ background: tokens[k] }} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{TOKEN_LABELS[k].en}</p>
                        {manual ? <Badge tone="warning">Manual</Badge> : <Badge tone="neutral">Auto</Badge>}
                      </div>
                      <p className="text-xs text-zinc-500">{TOKEN_LABELS[k].hint}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <input type="color" aria-label={`${TOKEN_LABELS[k].en} colour`} value={tokens[k]} onChange={(e) => setOverride(k, e.target.value.toUpperCase())} className="h-8 w-10 cursor-pointer rounded-md border border-black/10 bg-white p-0.5" />
                        <span className="font-mono text-xs">{tokens[k]}</span>
                        {manual && (
                          <button type="button" className="ms-auto text-xs font-medium text-zinc-600 underline-offset-2 hover:underline" onClick={() => setOverride(k, undefined)}>
                            Use auto ({derived[k]})
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title="Readability" description="WCAG contrast of the combinations guests read. Derived themes always pass; manual colours may not.">
            <ul className="grid gap-2 sm:grid-cols-2">
              {report.map((r) => (
                <li key={r.label} className={cx('flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm', r.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800')}>
                  <span className="flex items-center gap-2">
                    {r.ok ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
                    {r.label}
                  </span>
                  <span className="font-mono text-xs">
                    {r.ratio.toFixed(2)}:1 {r.ok ? '' : `(needs ${r.min}:1)`}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Typography" description="Arabic, English and display typefaces are set independently.">
            <div className="grid gap-4 sm:grid-cols-3">
              {(['en', 'ar', 'display'] as const).map((k) => (
                <Field key={k} label={k === 'en' ? 'English text' : k === 'ar' ? 'Arabic text' : 'Display headings'} htmlFor={`b-font-${k}`}>
                  <Select id={`b-font-${k}`} value={b.fonts[k]} onChange={(e) => setB({ ...b, fonts: { ...b.fonts, [k]: e.target.value } })}>
                    {FONT_CHOICES[k].map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </Select>
                </Field>
              ))}
              <Field label="Text size" htmlFor="b-scale">
                <Select id="b-scale" value={b.fonts.scale} onChange={(e) => setB({ ...b, fonts: { ...b.fonts, scale: e.target.value as (typeof TYPE_SCALES)[number] } })}>
                  <option value="compact">Compact</option>
                  <option value="default">Standard</option>
                  <option value="large">Large (easier to read)</option>
                </Select>
              </Field>
              <Field label="Heading weight" htmlFor="b-weight">
                <Select id="b-weight" value={b.fonts.heading_weight} onChange={(e) => setB({ ...b, fonts: { ...b.fonts, heading_weight: e.target.value as (typeof HEADING_WEIGHTS)[number] } })}>
                  <option value="500">Medium</option>
                  <option value="600">Semibold</option>
                  <option value="700">Bold</option>
                </Select>
              </Field>
            </div>
          </Card>

          <Card title="Gallery" description="Photos for the homepage gallery and fallbacks.">
            <ul className="space-y-3">
              {b.gallery.map((g, i) => (
                <li key={i} className="grid items-start gap-2 rounded-xl border border-black/[0.07] p-3 md:grid-cols-[1fr_12rem_12rem_auto]">
                  <MediaInput hid={hid} id={`b-g-${i}`} spec="gallery" value={g.url} onChange={(v) => setB({ ...b, gallery: b.gallery.map((x, j) => (j === i ? { ...x, url: v } : x)) })} />
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

        <aside aria-label="Theme preview" className="space-y-3 xl:sticky xl:top-20 xl:self-start">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Live preview</p>
            <div className="w-56">
              <Segmented label="Device" value={device} onChange={setDevice} options={[{ value: 'mobile', label: 'Mobile' }, { value: 'desktop', label: 'Desktop' }]} />
            </div>
          </div>
          <ThemePreview branding={b} nameEn={hotel.data?.profile.name_en ?? ''} nameAr={hotel.data?.profile.name_ar ?? ''} device={device} />
        </aside>
      </div>
    </>
  );
}
