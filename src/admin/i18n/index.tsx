import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { setApiMessageTranslator } from '../../lib/api';
import { SERVER_MESSAGES } from './serverMessages';

/**
 * Admin localisation. English source strings are the keys (readable code, no
 * key invention); `ar.ts` holds the Arabic dictionary. `tr()` is a plain
 * function so it works in components, helpers and callbacks alike; switching
 * language re-renders the whole admin tree (see AdminI18n).
 *
 * Placeholders: tr('Delete {0}?', { 0: name }) or tr('{n} rows', { n }).
 *
 * The Arabic dictionary is a separate chunk, loaded only when Arabic is chosen,
 * so English sessions never download it. The admin tree is held back until it
 * arrives (AdminI18n), so Arabic users never see an English flash.
 */
export type AdminLang = 'en' | 'ar';
const KEY = 'hub-admin-lang';

function initial(): AdminLang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'ar' || v === 'en') return v;
  } catch {
    /* storage unavailable */
  }
  return 'en';
}

let current: AdminLang = initial();
let AR: Record<string, string> = {};
let arLoad: Promise<void> | null = null;
let arReady = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());

function loadArabic(): Promise<void> {
  arLoad ??= import('./ar').then(
    (m) => {
      AR = m.AR;
      arReady = true;
      notify();
    },
    (err) => {
      arLoad = null; // allow a retry (e.g. after a network blip)
      throw err;
    }
  );
  return arLoad;
}
if (current === 'ar') void loadArabic().catch(() => setAdminLang('en'));

export function adminLang(): AdminLang {
  return current;
}

/** Switches language; Arabic applies once its dictionary has loaded. */
export async function setAdminLang(l: AdminLang): Promise<void> {
  if (l === 'ar') await loadArabic();
  if (l === current) return;
  current = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* storage unavailable */
  }
  notify();
}

const missing = new Set<string>();

export function tr(source: string, vars?: Record<string | number, unknown>): string;
export function tr(source: string | null | undefined, vars?: Record<string | number, unknown>): string | undefined;
export function tr(source: string | null | undefined, vars?: Record<string | number, unknown>): string | undefined {
  if (source == null || source === '') return source ?? undefined;
  let s = source;
  if (current === 'ar') {
    const hit = AR[source];
    if (hit !== undefined) s = hit;
    else if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV && !missing.has(source)) {
      missing.add(source);
      console.warn('[i18n] missing Arabic:', source);
    }
  }
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k] ?? '') : m));
  return s;
}

/** Picks the Arabic or English variant of bilingual content (e.g. name_en / name_ar). */
export function pickLang(r: object | null | undefined, key: string): string {
  if (!r) return '';
  const rec = r as Record<string, unknown>;
  const en = String(rec[`${key}_en`] ?? '');
  const ar = String(rec[`${key}_ar`] ?? '');
  return current === 'ar' ? ar || en : en || ar;
}

export const locale = () => (current === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB');

export function fmtDate(v: string | number | Date | null | undefined, o: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }) {
  if (v == null || v === '') return '—';
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(locale(), o);
}

export function fmtNumber(n: number | null | undefined, o?: Intl.NumberFormatOptions) {
  return n == null ? '—' : n.toLocaleString(locale(), o);
}

function subscribe(f: () => void) {
  listeners.add(f);
  return () => listeners.delete(f);
}

/** Current language as React state (re-renders on switch). */
export function useAdminLang(): AdminLang {
  return useSyncExternalStore(subscribe, adminLang, adminLang);
}

const isReady = () => current !== 'ar' || arReady;

/** Applies dir/lang to the document and remounts the admin on language change. */
export function AdminI18n({ children }: { children: ReactNode }) {
  const lang = useAdminLang();
  const ready = useSyncExternalStore(subscribe, isReady, isReady);
  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  if (!ready) return <div className="min-h-dvh bg-zinc-50" role="status" aria-busy="true" aria-label="جارٍ التحميل" />;
  return <div key={lang} className="contents">{children}</div>;
}

/** Localises a bilingual label record ({ en, ar }) or an English label string. */
export function L(v: { en: string; ar: string } | string | null | undefined): string {
  if (v == null) return '';
  if (typeof v === 'string') return tr(v);
  return current === 'ar' ? v.ar || v.en : v.en;
}

/** Entity label in the admin language (singular/plural). */
export function entLabel(def: { label: { singular: string; plural: string; singular_ar: string; plural_ar: string } }, form: 'singular' | 'plural' = 'singular'): string {
  return current === 'ar' ? (form === 'singular' ? def.label.singular_ar : def.label.plural_ar) : def.label[form];
}

// ---------------------------------------------------------------------------
// API messages: exact catalogue hits, then templated messages ("Code {0} is
// already used") matched with their values carried into the translation.
// ---------------------------------------------------------------------------
const reEscape = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TEMPLATES = SERVER_MESSAGES.filter((m) => /\{\d+\}/.test(m)).map((m) => ({
  m,
  re: new RegExp(`^${reEscape(m).replace(/\\\{(\d+)\\\}/g, '([\\s\\S]+?)')}$`),
}));

export function trMessage(message: string): string {
  if (current !== 'ar' || !message) return message;
  if (AR[message] !== undefined) return AR[message];
  for (const t of TEMPLATES) {
    const hit = t.re.exec(message);
    if (hit && AR[t.m] !== undefined) return tr(t.m, Object.fromEntries(hit.slice(1).map((v, i) => [i, v])));
  }
  return message;
}

setApiMessageTranslator((m) => trMessage(m));
