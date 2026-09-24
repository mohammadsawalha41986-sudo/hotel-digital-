import type { GuestEvent } from '@shared/engagement';

/**
 * Anonymous engagement counters. Events are batched and sent at most every
 * few seconds (and when the page is hidden). Nothing identifies the guest:
 * the server only increments daily counters per hotel, event and record code.
 * Impressions are de-duplicated per page view.
 */
type Target = { target_type?: string; target_code?: string };
let queue: ({ event: GuestEvent } & Target)[] = [];
let slug = '';
let preview = false;
let timer: number | undefined;
const seen = new Set<string>();

export function initTracking(hotelSlug: string, isPreview: boolean) {
  slug = hotelSlug;
  preview = isPreview;
}

function flush() {
  if (!queue.length || !slug || preview) {
    queue = [];
    return;
  }
  const batch = queue.splice(0, 25);
  const url = `/api/public/hotels/${slug}/events`;
  const body = JSON.stringify({ events: batch });
  try {
    // keepalive lets the request finish while the page unloads (sendBeacon cannot carry the CSRF header).
    void fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'hub' }, body, keepalive: true }).catch(() => undefined);
  } catch {
    /* analytics must never affect the guest */
  }
  if (queue.length) flush();
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => flush());
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
}

export function track(event: GuestEvent, target: Target = {}) {
  const code = (target.target_code ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
  queue.push({ event, target_type: target.target_type ?? '', target_code: code });
  if (queue.length >= 20) flush();
  else if (timer === undefined) timer = window.setTimeout(() => ((timer = undefined), flush()), 4000);
}

/** Records an impression once per page view (offers in carousels). */
export function trackOnce(event: GuestEvent, target: Target) {
  const k = `${event}|${target.target_type}|${target.target_code}|${location.pathname}`;
  if (seen.has(k)) return;
  seen.add(k);
  track(event, target);
}
