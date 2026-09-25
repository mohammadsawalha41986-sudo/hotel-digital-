import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { Lang } from '@shared/domain';
import type { GuestIdentity } from '@shared/hotel';

/**
 * Guest session lives on the device only (no account). Identity expires after
 * a week so the next occupant of a room is asked again. The device token lets
 * the guest see the status of their own requests.
 */
const TTL_MS = 7 * 24 * 3600_000;

interface Stored {
  identity: GuestIdentity;
  savedAt: number;
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — session stays in memory */
  }
}

let memoryToken: string | null = null;
export function guestToken(): string {
  const key = 'hub.guest.token';
  let token: string | null = null;
  try {
    token = localStorage.getItem(key);
  } catch {
    token = memoryToken;
  }
  if (!token || !/^[A-Za-z0-9_-]{24,128}$/.test(token)) {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    try {
      localStorage.setItem(key, token);
    } catch {
      memoryToken = token;
    }
  }
  return token;
}

export interface GuestSession {
  identity: GuestIdentity | null;
  setIdentity: (g: GuestIdentity) => void;
  clearIdentity: () => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  langChosen: boolean;
  /** Room carried by a room QR code (?room=1204). */
  qrRoom: string;
}

const Ctx = createContext<GuestSession | null>(null);

const PREVIEW_IDENTITY: GuestIdentity = { type: 'IN_HOUSE', name: 'Preview', phone: '', room: '101' };

export function GuestSessionProvider({ slug, defaultLang, allowed, preview, children }: { slug: string; defaultLang: Lang; allowed: Lang[]; preview?: boolean; children: ReactNode }) {
  const idKey = `hub.guest.${slug}`;
  const langKey = `hub.lang.${slug}`;
  const params = new URLSearchParams(window.location.search);
  const qrRoom = (params.get('room') ?? '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 12);
  const urlLang = params.get('lang');

  const [identity, setIdentityState] = useState<GuestIdentity | null>(() => {
    const s = readJSON<Stored>(idKey);
    if (!s || Date.now() - s.savedAt > TTL_MS) return null;
    // A different room QR means a different stay: ask again, prefilled.
    if (qrRoom && s.identity.type === 'IN_HOUSE' && s.identity.room.toUpperCase() !== qrRoom.toUpperCase()) return null;
    return s.identity;
  });

  const [langState, setLangState] = useState<{ lang: Lang; chosen: boolean }>(() => {
    const pick = (l: string | null) => (l === 'ar' || l === 'en') && allowed.includes(l) ? (l as Lang) : null;
    const fromUrl = pick(urlLang);
    if (fromUrl) return { lang: fromUrl, chosen: true };
    const stored = pick(readJSON<string>(langKey));
    if (stored) return { lang: stored, chosen: true };
    return { lang: allowed.includes(defaultLang) ? defaultLang : allowed[0], chosen: allowed.length === 1 };
  });

  // How the guest arrived: a printed QR code carries ?room= (room codes) or ?qr=1 (hotel/outlet codes).
  const [entry] = useState<'QR' | 'GUEST_PORTAL'>(() => (qrRoom || params.get('qr') === '1' ? 'QR' : 'GUEST_PORTAL'));
  const setIdentity = useCallback(
    (g: GuestIdentity) => {
      setIdentityState(g);
      writeJSON(idKey, { identity: g, savedAt: Date.now() } satisfies Stored);
      if (preview) return;
      // Links this device to the guest profile (CRM timeline). Orders re-identify the guest too,
      // so a failure here loses nothing and must not interrupt the guest.
      void api(`/public/hotels/${slug}/session`, { method: 'POST', body: { guest: g, lang: langRef.current, entry }, headers: { 'x-guest-token': guestToken() } }).catch(() => undefined);
    },
    [idKey, preview, slug, entry]
  );
  const clearIdentity = useCallback(() => {
    setIdentityState(null);
    try {
      localStorage.removeItem(idKey);
    } catch {
      /* ignore */
    }
  }, [idKey]);
  const setLang = useCallback(
    (l: Lang) => {
      setLangState({ lang: l, chosen: true });
      writeJSON(langKey, l);
    },
    [langKey]
  );

  const langRef = useRef(langState.lang);
  langRef.current = langState.lang;

  useEffect(() => {
    document.documentElement.lang = langState.lang;
    document.documentElement.dir = langState.lang === 'ar' ? 'rtl' : 'ltr';
  }, [langState.lang]);

  const value = useMemo<GuestSession>(
    () => ({ identity: identity ?? (preview ? PREVIEW_IDENTITY : null), setIdentity, clearIdentity, lang: langState.lang, setLang, langChosen: langState.chosen, qrRoom }),
    [identity, preview, setIdentity, clearIdentity, langState, setLang, qrRoom]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGuestSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGuestSession outside provider');
  return v;
}
