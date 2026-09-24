import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, Monitor, Plus, RotateCcw, Smartphone, Trash2, UploadCloud } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { GUEST_PAGES, GUEST_PAGE_LABELS, SECTION_BACKGROUNDS, SECTION_LAYOUTS, SECTION_TYPES, type GuestPage, type SectionType } from '@shared/domain';
import { siteConfigSchema, type HeroSlide, type NavItem, type Section, type SiteConfig } from '@shared/hotel';
import { ApiError, errorMessage } from '../../lib/api';
import { Badge, Button, Field, IconButton, Segmented, Select, Skeleton, TextArea, TextInput, Toggle, cx } from '../../components/ui';
import { useAdminHotel, useHotelMutation, type AdminHotel } from '../data';
import { useFeedback } from '../feedback';
import { MediaInput } from '../components/MediaInput';
import { PageHeader } from '../layout/AdminLayout';

const SECTION_LABEL: Record<SectionType, string> = {
  offers: 'Offers slider',
  quick_actions: 'Quick actions',
  dining: 'Dining outlets',
  room_services: 'Room services',
  wellness: 'Wellness & spa',
  laundry: 'Laundry feature',
  hotel_services: 'Hotel services',
  info: 'Hotel information',
  gallery: 'Photo gallery',
  reviews: 'Guest reviews',
  contact: 'Contact & location',
  custom: 'Custom content block',
};
const SOURCE: Partial<Record<SectionType, string>> = {
  offers: 'Offers',
  quick_actions: 'Quick actions',
  dining: 'Dining & menus',
  room_services: 'Room services',
  wellness: 'Wellness & spa',
  laundry: 'Laundry',
  hotel_services: 'Hotel services',
  info: 'Guest information',
  gallery: 'Branding → gallery',
  reviews: 'Guest reviews',
  contact: 'Hotel profile',
};

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;
function move<T>(list: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const c = [...list];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
}
const small = 'h-10 rounded-lg text-sm';

export function Website({ hid }: { hid: string }) {
  const hotel = useAdminHotel(hid);
  if (hotel.isLoading || !hotel.data) return <Skeleton className="h-96" />;
  return <WebsiteEditor hid={hid} hotel={hotel.data} />;
}

function WebsiteEditor({ hid, hotel }: { hid: string; hotel: AdminHotel }) {
  const fb = useFeedback();
  const [draft, setDraft] = useState<SiteConfig>(hotel.site_draft);
  const [tab, setTab] = useState<'sections' | 'hero' | 'navigation' | 'welcome'>('sections');
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [previewKey, setPreviewKey] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const saveDraft = useHotelMutation<SiteConfig>(hid, '/site/draft');
  const publish = useHotelMutation<Record<string, never>>(hid, '/site/publish', 'POST');
  const discard = useHotelMutation<Record<string, never>>(hid, '/site/discard', 'POST');
  const serverDraft = useRef(JSON.stringify(hotel.site_draft));

  useEffect(() => {
    serverDraft.current = JSON.stringify(hotel.site_draft);
  }, [hotel.site_draft]);

  const dirty = JSON.stringify(draft) !== serverDraft.current;
  const unpublished = hotel.has_unpublished_changes || dirty;

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const doSave = async () => {
    const parsed = siteConfigSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message])));
      fb.error('Some fields are invalid — check the highlighted entries.');
      return false;
    }
    try {
      const res = await saveDraft.mutateAsync(parsed.data);
      setDraft(res.site_draft);
      serverDraft.current = JSON.stringify(res.site_draft);
      setErrors({});
      setPreviewKey((k) => k + 1);
      fb.success('Draft saved — preview updated');
      return true;
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fields);
      fb.error(errorMessage(e));
      return false;
    }
  };

  const doPublish = async () => {
    if (dirty && !(await doSave())) return;
    const ok = await fb.confirm({ title: 'Publish website changes?', message: 'Guests will see the new homepage, hero and navigation immediately.', confirmLabel: 'Publish' });
    if (!ok) return;
    try {
      await publish.mutateAsync({});
      fb.success('Published — the guest site is updated');
      setPreviewKey((k) => k + 1);
    } catch (e) {
      fb.error(errorMessage(e));
    }
  };

  const doDiscard = async () => {
    const ok = await fb.confirm({ title: 'Discard unpublished changes?', message: 'The draft will be reset to what guests currently see.', confirmLabel: 'Discard', danger: true });
    if (!ok) return;
    const res = await discard.mutateAsync({});
    setDraft(res.site_draft);
    serverDraft.current = JSON.stringify(res.site_draft);
    setPreviewKey((k) => k + 1);
    fb.success('Draft discarded');
  };

  const previewUrl = `/h/${hotel.profile.slug}?preview=1&lang=${hotel.profile.default_language}&_=${previewKey}`;

  return (
    <>
      <PageHeader
        title="Website manager"
        description={
          <>
            Edit the guest homepage, hero, navigation and welcome screen. Changes are saved as a <strong>draft</strong>, previewed on the right, then published.{' '}
            {hotel.site_published_at && <span>Last published {new Date(hotel.site_published_at).toLocaleString()}.</span>}
          </>
        }
        actions={
          <>
            {unpublished ? <Badge tone="warning">{dirty ? 'Unsaved changes' : 'Draft not published'}</Badge> : <Badge tone="success">Live = draft</Badge>}
            <Button variant="ghost" size="sm" className="rounded-lg" onClick={doDiscard} disabled={!hotel.has_unpublished_changes || discard.isPending}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Discard
            </Button>
            <Button variant="secondary" size="sm" className="rounded-lg" onClick={doSave} loading={saveDraft.isPending} disabled={!dirty}>
              Save draft
            </Button>
            <Button size="sm" className="rounded-lg" onClick={doPublish} loading={publish.isPending} disabled={!unpublished}>
              <UploadCloud className="h-4 w-4" aria-hidden="true" /> Publish
            </Button>
          </>
        }
      />
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="min-w-0">
          <div className="mb-4 max-w-xl">
            <Segmented
              label="Editor section"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'sections', label: 'Homepage sections' },
                { value: 'hero', label: 'Hero' },
                { value: 'navigation', label: 'Navigation' },
                { value: 'welcome', label: 'Welcome' },
              ]}
            />
          </div>
          {Object.keys(errors).length > 0 && (
            <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {Object.entries(errors).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ')}
            </p>
          )}
          {tab === 'sections' && <SectionsEditor hid={hid} sections={draft.sections} onChange={(sections) => setDraft({ ...draft, sections })} />}
          {tab === 'hero' && <HeroEditor hid={hid} hero={draft.hero} onChange={(hero) => setDraft({ ...draft, hero })} />}
          {tab === 'navigation' && <NavEditor nav={draft.navigation} onChange={(navigation) => setDraft({ ...draft, navigation })} />}
          {tab === 'welcome' && <WelcomeEditor hid={hid} welcome={draft.welcome} onChange={(welcome) => setDraft({ ...draft, welcome })} />}
        </div>
        <aside aria-label="Live preview" className="2xl:sticky 2xl:top-6 2xl:self-start">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">
              Preview {dirty && <span className="font-normal text-amber-600">(save draft to refresh)</span>}
            </p>
            <div className="flex gap-1">
              <IconButton label="Mobile preview" onClick={() => setDevice('mobile')} className={cx('h-8 w-8', device === 'mobile' && 'bg-zinc-200')}>
                <Smartphone className="h-4 w-4" aria-hidden="true" />
              </IconButton>
              <IconButton label="Desktop preview" onClick={() => setDevice('desktop')} className={cx('h-8 w-8', device === 'desktop' && 'bg-zinc-200')}>
                <Monitor className="h-4 w-4" aria-hidden="true" />
              </IconButton>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center rounded-lg px-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100">
                Open ↗
              </a>
            </div>
          </div>
          <div className={cx('mx-auto overflow-hidden rounded-[2rem] border-8 border-zinc-900 bg-white shadow-xl', device === 'mobile' ? 'h-[760px] w-[390px] max-w-full' : 'h-[640px] w-full')}>
            <iframe key={previewKey} src={previewUrl} title="Guest site preview (draft)" className="h-full w-full border-0" />
          </div>
          <p className="mt-2 text-center text-xs text-zinc-500">The preview shows the saved draft, including hidden catalog changes already saved.</p>
        </aside>
      </div>
    </>
  );
}

function Row({ title, subtitle, visible, onToggle, onUp, onDown, onDelete, children, badge }: { title: string; subtitle?: string; visible?: boolean; onToggle?: () => void; onUp: () => void; onDown: () => void; onDelete?: () => void; children: ReactNode; badge?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <li className={cx('rounded-xl border border-black/[0.08] bg-white', visible === false && 'bg-zinc-50')}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex flex-col">
          <IconButton label={`Move ${title} up`} className="h-6 w-6" onClick={onUp}>
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
          </IconButton>
          <IconButton label={`Move ${title} down`} className="h-6 w-6" onClick={onDown}>
            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
          </IconButton>
        </div>
        <button type="button" className="min-w-0 flex-1 text-start" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="flex items-center gap-2">
            <span className={cx('truncate font-medium', visible === false && 'text-zinc-400')}>{title}</span>
            {badge}
            {visible === false && <Badge>Hidden</Badge>}
          </span>
          {subtitle && <span className="block truncate text-xs text-zinc-500">{subtitle}</span>}
        </button>
        {onToggle && (
          <IconButton label={visible ? `Hide ${title}` : `Show ${title}`} onClick={onToggle} className="h-9 w-9">
            {visible ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4 text-zinc-400" aria-hidden="true" />}
          </IconButton>
        )}
        {onDelete && (
          <IconButton label={`Delete ${title}`} onClick={onDelete} className="h-9 w-9 text-red-600">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        )}
        <IconButton label={open ? `Collapse ${title}` : `Customize ${title}`} onClick={() => setOpen(!open)} className="h-9 w-9">
          <ChevronDown className={cx('h-4 w-4 transition', open && 'rotate-180')} aria-hidden="true" />
        </IconButton>
      </div>
      {open && <div className="border-t border-black/[0.06] p-4">{children}</div>}
    </li>
  );
}

function Bilingual({ label, en, ar, onEn, onAr, textarea, id }: { label: string; en: string; ar: string; onEn: (v: string) => void; onAr: (v: string) => void; textarea?: boolean; id: string }) {
  const I = textarea ? TextArea : TextInput;
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <I id={`${id}-en`} aria-label={`${label} (English)`} placeholder="English" value={en} onChange={(e) => onEn(e.target.value)} className={textarea ? 'rounded-lg text-sm' : small} />
        <I id={`${id}-ar`} aria-label={`${label} (Arabic)`} placeholder="العربية" dir="rtl" value={ar} onChange={(e) => onAr(e.target.value)} className={textarea ? 'rounded-lg text-sm' : small} />
      </div>
    </fieldset>
  );
}

function PageSelect({ id, value, onChange, label }: { id: string; value: string; onChange: (v: GuestPage | 'none') => void; label: string }) {
  return (
    <Field label={label} htmlFor={id}>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value as GuestPage | 'none')} className={small}>
        <option value="none">No button</option>
        {GUEST_PAGES.map((p) => (
          <option key={p} value={p}>
            {GUEST_PAGE_LABELS[p].en}
          </option>
        ))}
      </Select>
    </Field>
  );
}

// ---------------------------------------------------------------------------------------------
function SectionsEditor({ hid, sections, onChange }: { hid: string; sections: Section[]; onChange: (s: Section[]) => void }) {
  const [addType, setAddType] = useState<SectionType>('custom');
  const set = (i: number, s: Section) => onChange(sections.map((x, j) => (j === i ? s : x)));
  const missing = useMemo(() => SECTION_TYPES.filter((t) => t === 'custom' || !sections.some((s) => s.type === t)), [sections]);
  useEffect(() => {
    if (!missing.includes(addType)) setAddType(missing[0]);
  }, [missing, addType]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">The hero is always first. Sections below appear in this order; content comes from the module shown under each name.</p>
      <ul className="space-y-2">
        {sections.map((s, i) => (
          <Row
            key={s.id}
            title={s.title_en || SECTION_LABEL[s.type]}
            subtitle={`${SECTION_LABEL[s.type]}${SOURCE[s.type] ? ` · content from ${SOURCE[s.type]}` : ''} · ${s.layout} · ${s.background}`}
            visible={s.visible}
            onToggle={() => set(i, { ...s, visible: !s.visible })}
            onUp={() => onChange(move(sections, i, -1))}
            onDown={() => onChange(move(sections, i, 1))}
            onDelete={s.type === 'custom' ? () => onChange(sections.filter((_, j) => j !== i)) : undefined}
          >
            <div className="grid gap-4">
              <Bilingual id={`sec-${s.id}-title`} label="Title" en={s.title_en} ar={s.title_ar} onEn={(v) => set(i, { ...s, title_en: v })} onAr={(v) => set(i, { ...s, title_ar: v })} />
              <Bilingual id={`sec-${s.id}-sub`} label="Subtitle" en={s.subtitle_en} ar={s.subtitle_ar} onEn={(v) => set(i, { ...s, subtitle_en: v })} onAr={(v) => set(i, { ...s, subtitle_ar: v })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Layout" htmlFor={`sec-${s.id}-layout`}>
                  <Select id={`sec-${s.id}-layout`} value={s.layout} onChange={(e) => set(i, { ...s, layout: e.target.value as Section['layout'] })} className={small}>
                    {SECTION_LAYOUTS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Background" htmlFor={`sec-${s.id}-bg`}>
                  <Select id={`sec-${s.id}-bg`} value={s.background} onChange={(e) => set(i, { ...s, background: e.target.value as Section['background'] })} className={small}>
                    {SECTION_BACKGROUNDS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              {(s.type === 'custom' || s.type === 'laundry') && (
                <>
                  <Field label="Image" htmlFor={`sec-${s.id}-img`}>
                    <MediaInput hid={hid} id={`sec-${s.id}-img`} value={s.image} onChange={(v) => set(i, { ...s, image: v })} />
                  </Field>
                  <Bilingual id={`sec-${s.id}-body`} label="Body text" textarea en={s.body_en} ar={s.body_ar} onEn={(v) => set(i, { ...s, body_en: v })} onAr={(v) => set(i, { ...s, body_ar: v })} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Bilingual id={`sec-${s.id}-cta`} label="Button label" en={s.cta_label_en} ar={s.cta_label_ar} onEn={(v) => set(i, { ...s, cta_label_en: v })} onAr={(v) => set(i, { ...s, cta_label_ar: v })} />
                    <PageSelect id={`sec-${s.id}-page`} label="Button opens" value={s.cta_page} onChange={(v) => set(i, { ...s, cta_page: v })} />
                  </div>
                </>
              )}
            </div>
          </Row>
        ))}
      </ul>
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-black/15 p-3">
        <Field label="Add a section" htmlFor="add-sec">
          <Select id="add-sec" value={addType} onChange={(e) => setAddType(e.target.value as SectionType)} className={cx(small, 'w-60')}>
            {missing.map((t) => (
              <option key={t} value={t}>
                {SECTION_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Button
          size="sm"
          variant="secondary"
          className="h-10 rounded-lg"
          onClick={() =>
            onChange([
              ...sections,
              { id: addType === 'custom' ? uid('custom') : addType, type: addType, visible: true, title_en: addType === 'custom' ? 'New section' : SECTION_LABEL[addType], title_ar: '', subtitle_en: '', subtitle_ar: '', layout: 'feature', background: 'default', image: '', body_en: '', body_ar: '', cta_label_en: '', cta_label_ar: '', cta_page: 'none' },
            ])
          }
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Add
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
function HeroEditor({ hid, hero, onChange }: { hid: string; hero: SiteConfig['hero']; onChange: (h: SiteConfig['hero']) => void }) {
  const slides = hero.slides;
  const set = (i: number, s: HeroSlide) => onChange({ ...hero, slides: slides.map((x, j) => (j === i ? s : x)) });
  const localDt = (v: string | null) => (v ? new Date(new Date(v).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
  return (
    <div className="space-y-3">
      <Field label="Autoplay (seconds per slide, 0 = off)" htmlFor="hero-autoplay">
        <TextInput id="hero-autoplay" type="number" min={0} max={30} value={hero.autoplay_seconds} onChange={(e) => onChange({ ...hero, autoplay_seconds: Math.max(0, Math.min(30, Number(e.target.value))) })} className={cx(small, 'w-32')} />
      </Field>
      <ul className="space-y-2">
        {slides.map((s, i) => (
          <Row
            key={s.id}
            title={s.headline_en || `Slide ${i + 1}`}
            subtitle={`${s.media_type}${s.starts_at || s.ends_at ? ' · scheduled' : ''}${s.cta_page !== 'none' ? ` · button → ${s.cta_page}` : ''}`}
            visible={s.visible}
            onToggle={() => set(i, { ...s, visible: !s.visible })}
            onUp={() => onChange({ ...hero, slides: move(slides, i, -1) })}
            onDown={() => onChange({ ...hero, slides: move(slides, i, 1) })}
            onDelete={() => onChange({ ...hero, slides: slides.filter((_, j) => j !== i) })}
          >
            <div className="grid gap-4">
              <Segmented label="Media type" value={s.media_type} onChange={(v) => set(i, { ...s, media_type: v })} options={[{ value: 'image', label: 'Image' }, { value: 'video', label: 'Video' }]} />
              <Field label={s.media_type === 'video' ? 'Poster image (shown while the video loads)' : 'Image'} htmlFor={`hero-${s.id}-img`}>
                <MediaInput hid={hid} id={`hero-${s.id}-img`} value={s.image} onChange={(v) => set(i, { ...s, image: v })} />
              </Field>
              {s.media_type === 'video' && (
                <Field label="Video" htmlFor={`hero-${s.id}-vid`}>
                  <MediaInput hid={hid} id={`hero-${s.id}-vid`} kind="video" value={s.video} onChange={(v) => set(i, { ...s, video: v })} />
                </Field>
              )}
              <Field label={`Overlay darkness: ${s.overlay}%`} htmlFor={`hero-${s.id}-ov`}>
                <input id={`hero-${s.id}-ov`} type="range" min={0} max={90} value={s.overlay} onChange={(e) => set(i, { ...s, overlay: Number(e.target.value) })} className="w-full" />
              </Field>
              <Bilingual id={`hero-${s.id}-h`} label="Headline" en={s.headline_en} ar={s.headline_ar} onEn={(v) => set(i, { ...s, headline_en: v })} onAr={(v) => set(i, { ...s, headline_ar: v })} />
              <Bilingual id={`hero-${s.id}-s`} label="Subtitle" en={s.subtitle_en} ar={s.subtitle_ar} onEn={(v) => set(i, { ...s, subtitle_en: v })} onAr={(v) => set(i, { ...s, subtitle_ar: v })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Bilingual id={`hero-${s.id}-c`} label="Button label" en={s.cta_label_en} ar={s.cta_label_ar} onEn={(v) => set(i, { ...s, cta_label_en: v })} onAr={(v) => set(i, { ...s, cta_label_ar: v })} />
                <PageSelect id={`hero-${s.id}-p`} label="Button opens" value={s.cta_page} onChange={(v) => set(i, { ...s, cta_page: v })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Show from (optional)" htmlFor={`hero-${s.id}-start`}>
                  <TextInput id={`hero-${s.id}-start`} type="datetime-local" value={localDt(s.starts_at)} onChange={(e) => set(i, { ...s, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className={small} />
                </Field>
                <Field label="Show until (optional)" htmlFor={`hero-${s.id}-end`}>
                  <TextInput id={`hero-${s.id}-end`} type="datetime-local" value={localDt(s.ends_at)} onChange={(e) => set(i, { ...s, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className={small} />
                </Field>
              </div>
            </div>
          </Row>
        ))}
      </ul>
      {slides.length < 10 && (
        <Button
          variant="secondary"
          size="sm"
          className="rounded-lg"
          onClick={() => onChange({ ...hero, slides: [...slides, { id: uid('slide'), media_type: 'image', image: '', video: '', overlay: 45, headline_en: '', headline_ar: '', subtitle_en: '', subtitle_ar: '', cta_label_en: '', cta_label_ar: '', cta_page: 'none', starts_at: null, ends_at: null, visible: true }] })}
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Add slide
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
function NavEditor({ nav, onChange }: { nav: NavItem[]; onChange: (n: NavItem[]) => void }) {
  const set = (i: number, n: NavItem) => onChange(nav.map((x, j) => (j === i ? n : x)));
  const bottomCount = nav.filter((n) => n.visible && n.in_bottom_bar).length;
  const missing = GUEST_PAGES.filter((p) => !nav.some((n) => n.page === p));
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">
        Controls the guest menu drawer and the mobile bottom bar (up to 5 items; currently {bottomCount}). Leave labels empty to use the defaults.
      </p>
      <ul className="space-y-2">
        {nav.map((n, i) => (
          <Row
            key={n.id}
            title={n.label_en || GUEST_PAGE_LABELS[n.page].en}
            subtitle={`/${n.page}${n.in_bottom_bar ? ' · bottom bar' : ''}`}
            visible={n.visible}
            onToggle={() => set(i, { ...n, visible: !n.visible })}
            onUp={() => onChange(move(nav, i, -1))}
            onDown={() => onChange(move(nav, i, 1))}
            onDelete={() => onChange(nav.filter((_, j) => j !== i))}
            badge={n.in_bottom_bar ? <Badge tone="info">Bottom bar</Badge> : undefined}
          >
            <div className="grid gap-4">
              <Bilingual id={`nav-${n.id}`} label="Label" en={n.label_en} ar={n.label_ar} onEn={(v) => set(i, { ...n, label_en: v })} onAr={(v) => set(i, { ...n, label_ar: v })} />
              <Toggle label="Show in mobile bottom bar" description={bottomCount >= 5 && !n.in_bottom_bar ? 'The bottom bar already has 5 items.' : undefined} checked={n.in_bottom_bar} onChange={(v) => (v && bottomCount >= 5 ? undefined : set(i, { ...n, in_bottom_bar: v }))} />
            </div>
          </Row>
        ))}
      </ul>
      {missing.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {missing.map((p) => (
            <Button key={p} variant="secondary" size="sm" className="rounded-lg" onClick={() => onChange([...nav, { id: p, page: p, label_en: '', label_ar: '', visible: true, in_bottom_bar: false }])}>
              <Plus className="h-4 w-4" aria-hidden="true" /> {GUEST_PAGE_LABELS[p].en}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function WelcomeEditor({ hid, welcome, onChange }: { hid: string; welcome: SiteConfig['welcome']; onChange: (w: SiteConfig['welcome']) => void }) {
  return (
    <div className="space-y-4 rounded-xl border border-black/[0.08] bg-white p-4">
      <p className="text-sm text-zinc-500">The first screen after scanning a QR code: language choice, then guest identification.</p>
      <Bilingual id="wel-title" label="Title" en={welcome.title_en} ar={welcome.title_ar} onEn={(v) => onChange({ ...welcome, title_en: v })} onAr={(v) => onChange({ ...welcome, title_ar: v })} />
      <Bilingual id="wel-msg" label="Welcome message" textarea en={welcome.message_en} ar={welcome.message_ar} onEn={(v) => onChange({ ...welcome, message_en: v })} onAr={(v) => onChange({ ...welcome, message_ar: v })} />
      <Field label="Background image" htmlFor="wel-img">
        <MediaInput hid={hid} id="wel-img" value={welcome.image} onChange={(v) => onChange({ ...welcome, image: v })} />
      </Field>
      <Field label="Background video (optional)" htmlFor="wel-vid">
        <MediaInput hid={hid} id="wel-vid" kind="video" value={welcome.video} onChange={(v) => onChange({ ...welcome, video: v })} />
      </Field>
    </div>
  );
}
