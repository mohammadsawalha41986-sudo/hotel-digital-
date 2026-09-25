import { Hono } from 'hono';
import { DEPARTMENTS, type DepartmentCode } from '../../shared/domain';
import { guestEventBatchSchema } from '../../shared/engagement';
import { guestSessionSchema, reviewInputSchema } from '../../shared/hotel';
import { waLink } from '../../shared/whatsapp';
import { canAccessHotel } from '../auth';
import { config } from '../config';
import { clientIp, type AppEnv, type Ctx } from '../context';
import { one, q, tx } from '../db';
import { HttpError, badRequest, notFound, validationError } from '../errors';
import { minutes, rateLimit } from '../rateLimit';
import { cachedBundle, cachedHotelRow } from '../services/bundleCache';
import { getHotelRowBySlug, hydrate, type HotelRow } from '../repos/hotels';
import { sha256 } from '../security';
import { buildOutletMenu, buildPublicBundle } from '../services/catalog';
import { storeUpload } from '../services/media';
import { recordEvents } from '../services/engagement';
import { identifyGuest } from '../services/guests';
import { changeStatus } from '../services/orders';
import { createGuestRequest, resolveWhatsApp } from '../services/requests';

export const publicRoutes = new Hono<AppEnv>();

/**
 * Resolves a hotel for guests. Unpublished hotels are visible only to staff of
 * that hotel, and only with ?preview=1 (draft website + preview banner).
 */
async function resolveHotel(c: Ctx): Promise<{ row: HotelRow; preview: boolean }> {
  const slug = c.req.param('slug') ?? '';
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) throw notFound('Hotel not found');
  const row = await cachedHotelRow(slug, () => getHotelRowBySlug(slug));
  if (!row) throw notFound('Hotel not found');
  const user = c.get('user');
  const wantsPreview = c.req.query('preview') === '1';
  const staff = !!user && canAccessHotel(user, row.id);
  if (wantsPreview && staff) return { row, preview: true };
  if (!row.is_published) {
    if (staff) return { row, preview: true };
    throw notFound('Hotel not found');
  }
  return { row, preview: false };
}

/** Hash of this guest device's token when present (for per-device limits). */
function deviceKey(c: Ctx): string {
  const token = c.req.header('x-guest-token') ?? '';
  return /^[A-Za-z0-9_-]{24,128}$/.test(token) ? sha256(token) : `ip:${clientIp(c)}`;
}

function guestTokenHash(c: Ctx): string {
  const token = c.req.header('x-guest-token') ?? '';
  if (!/^[A-Za-z0-9_-]{24,128}$/.test(token)) throw badRequest('Missing guest session. Please reload the page.');
  return sha256(token);
}

publicRoutes.get('/default-hotel', async (c) => {
  const preferred = process.env.DEFAULT_HOTEL_SLUG;
  const row =
    (preferred ? await one<{ slug: string }>('SELECT slug FROM hotels WHERE slug = $1 AND is_published', [preferred]) : null) ??
    (await one<{ slug: string }>('SELECT slug FROM hotels WHERE is_published ORDER BY created_at LIMIT 1'));
  return c.json({ slug: row?.slug ?? null });
});

publicRoutes.get('/hotels/:slug', async (c) => {
  const { row, preview } = await resolveHotel(c);
  if (preview) {
    c.header('Cache-Control', 'no-store');
    return c.json(await buildPublicBundle(row, true));
  }
  const b = await cachedBundle(row.id, () => buildPublicBundle(row, false));
  c.header('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
  c.header('ETag', b.etag);
  c.header('Vary', 'Accept-Encoding');
  if (c.req.header('if-none-match') === b.etag) return c.body(null, 304);
  c.header('Content-Type', 'application/json; charset=UTF-8');
  if (/\bgzip\b/.test(c.req.header('accept-encoding') ?? '')) {
    c.header('Content-Encoding', 'gzip');
    return c.body(new Uint8Array(b.gzip));
  }
  return c.body(b.json);
});

/**
 * Anonymous engagement counters (offer impressions/clicks, views, request
 * funnel, WhatsApp clicks). Staff previews are not counted.
 */
publicRoutes.post('/hotels/:slug/events', async (c) => {
  const { row, preview } = await resolveHotel(c);
  await rateLimit({ key: `events:${deviceKey(c)}`, limit: 300, windowMs: minutes(10) }, { key: `events:${row.id}:${clientIp(c)}`, limit: 5000, windowMs: minutes(10) });
  const parsed = guestEventBatchSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw validationError(parsed.error);
  if (preview) return c.json({ recorded: 0, preview: true });
  await recordEvents(row.id, hydrate(row).profile.timezone || 'UTC', parsed.data.events);
  return c.json({ recorded: parsed.data.events.length });
});

publicRoutes.get('/hotels/:slug/outlets/:outletId/menu', async (c) => {
  const { row, preview } = await resolveHotel(c);
  const outletId = c.req.param('outletId');
  if (!/^[0-9a-f-]{36}$/i.test(outletId)) throw notFound('Outlet not found');
  const menu = await buildOutletMenu(row.id, outletId, preview);
  if (!menu) throw notFound('Outlet not found');
  c.header('Cache-Control', preview ? 'no-store' : 'public, max-age=30, stale-while-revalidate=120');
  return c.json(menu);
});

publicRoutes.post('/hotels/:slug/session', async (c) => {
  const { row } = await resolveHotel(c);
  await rateLimit({ key: `session:${deviceKey(c)}`, limit: 20, windowMs: minutes(10) }, { key: `session:${row.id}:${clientIp(c)}`, limit: 1000, windowMs: minutes(10) });
  const tokenHash = guestTokenHash(c);
  const parsed = guestSessionSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw validationError(parsed.error);
  const hotel = hydrate(row);
  const { guest, lang, entry } = parsed.data;
  if (guest.type === 'EXTERNAL' && !hotel.settings.external_guests_enabled) {
    throw new HttpError(422, 'validation_failed', 'This hotel serves in-house guests only.', { fields: { 'guest.type': 'In-house guests only' } });
  }
  await tx((client) => identifyGuest(client, hotel, { ...guest, lang }, tokenHash, entry));
  return c.json({ ok: true }, 201);
});

publicRoutes.post('/hotels/:slug/requests', async (c) => {
  const { row } = await resolveHotel(c);
  const ip = clientIp(c);
  const tokenHash = guestTokenHash(c);
  // Per device: a guest ordering normally never gets near this. Per hotel+IP: a
  // ceiling sized for a full hotel behind one Wi-Fi NAT at breakfast peak.
  await rateLimit({ key: `req-token:${tokenHash}`, limit: 15, windowMs: minutes(10) }, { key: `req:${row.id}:${ip}`, limit: 600, windowMs: minutes(10) });
  const body = await c.req.json().catch(() => {
    throw badRequest('Invalid JSON body');
  });
  // One key per checkout attempt; retries and double taps return the original order.
  const key = c.req.header('idempotency-key') ?? null;
  if (key !== null && !/^[A-Za-z0-9_-]{8,80}$/.test(key)) throw badRequest('Invalid Idempotency-Key');
  const created = await createGuestRequest(hydrate(row), body, tokenHash, { idempotencyKey: key });
  return c.json(created, 201);
});

const publicRequestColumns = `id, reference, type, department, status, title_en, title_ar, room, lines, details, notes,
  subtotal, vat, total, currency, created_at, updated_at, accepted_at, started_at, completed_at, rejected_at, cancelled_at`;

publicRoutes.get('/hotels/:slug/requests', async (c) => {
  const { row } = await resolveHotel(c);
  const rows = await q(
    `SELECT ${publicRequestColumns} FROM requests WHERE hotel_id = $1 AND guest_token_hash = $2 ORDER BY created_at DESC LIMIT 50`,
    [row.id, guestTokenHash(c)]
  );
  c.header('Cache-Control', 'no-store');
  return c.json({ requests: rows });
});

publicRoutes.get('/hotels/:slug/requests/:reference', async (c) => {
  const { row } = await resolveHotel(c);
  const r = await one(
    `SELECT ${publicRequestColumns} FROM requests WHERE hotel_id = $1 AND reference = $2 AND guest_token_hash = $3`,
    [row.id, c.req.param('reference'), guestTokenHash(c)]
  );
  if (!r) throw notFound('Request not found');
  const events = await q(
    `SELECT to_status, note, created_at FROM request_events WHERE request_id = $1 AND NOT is_internal ORDER BY created_at`,
    [r.id]
  );
  c.header('Cache-Control', 'no-store');
  return c.json({ request: r, events });
});

publicRoutes.post('/hotels/:slug/requests/:reference/cancel', async (c) => {
  const { row } = await resolveHotel(c);
  const r = await one<{ id: string; guest_name: string }>(
    `SELECT id, guest_name FROM requests WHERE hotel_id = $1 AND reference = $2 AND guest_token_hash = $3`,
    [row.id, c.req.param('reference'), guestTokenHash(c)]
  );
  if (!r) throw notFound('Request not found');
  await tx((client) =>
    changeStatus(client, { hotelId: row.id, requestId: r.id, to: 'CANCELLED', note: 'Cancelled by guest', reason: 'Cancelled by guest', user: null, guestName: r.guest_name, onlyFrom: ['NEW'], ip: clientIp(c) })
  );
  return c.json({ status: 'CANCELLED' });
});

publicRoutes.get('/hotels/:slug/reviews', async (c) => {
  const { row } = await resolveHotel(c);
  const hotel = hydrate(row);
  if (!hotel.settings.reviews_enabled) return c.json({ enabled: false, reviews: [], average: null, count: 0 });
  const reviews = await q(
    `SELECT id, guest_name, rating, title, body, lang, created_at FROM reviews WHERE hotel_id = $1 AND status = 'APPROVED' ORDER BY created_at DESC LIMIT 30`,
    [row.id]
  );
  const agg = await one<{ avg: number | null; n: number }>(`SELECT AVG(rating)::float AS avg, COUNT(*) AS n FROM reviews WHERE hotel_id = $1 AND status = 'APPROVED'`, [row.id]);
  return c.json({ enabled: true, reviews, average: agg?.avg ?? null, count: agg?.n ?? 0 });
});

publicRoutes.post('/hotels/:slug/reviews', async (c) => {
  const { row } = await resolveHotel(c);
  const hotel = hydrate(row);
  if (!hotel.settings.reviews_enabled) throw new HttpError(409, 'disabled', 'Guest reviews are not enabled for this hotel');
  await rateLimit({ key: `review:${deviceKey(c)}`, limit: 3, windowMs: minutes(60) }, { key: `review:${row.id}:${clientIp(c)}`, limit: 60, windowMs: minutes(60) });
  const parsed = reviewInputSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw validationError(parsed.error);
  const v = parsed.data;
  // Linked to the guest profile of this device when there is one (for the CRM history).
  const token = c.req.header('x-guest-token') ?? '';
  const session = /^[A-Za-z0-9_-]{24,128}$/.test(token)
    ? await one<{ guest_id: string }>(`SELECT guest_id FROM guest_sessions WHERE hotel_id = $1 AND token_hash = $2 ORDER BY last_seen_at DESC LIMIT 1`, [row.id, sha256(token)])
    : null;
  // Always stored as PENDING: nothing is published without moderation.
  await q(`INSERT INTO reviews (hotel_id, guest_name, room, rating, title, body, lang, guest_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [
    row.id,
    v.guest_name,
    v.room,
    v.rating,
    v.title,
    v.body,
    v.lang,
    session?.guest_id ?? null,
  ]);
  return c.json({ status: 'PENDING' }, 201);
});

publicRoutes.post('/hotels/:slug/uploads', async (c) => {
  const { row } = await resolveHotel(c);
  await rateLimit({ key: `guest-upload:${deviceKey(c)}`, limit: 5, windowMs: minutes(60) }, { key: `guest-upload:${row.id}:${clientIp(c)}`, limit: 100, windowMs: minutes(60) });
  guestTokenHash(c);
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) throw badRequest('No file received');
  const media = await storeUpload(row.id, file, { maxBytes: config.maxGuestUploadBytes, allow: ['image'], source: 'guest_upload' });
  return c.json({ url: media.url }, 201);
});

/** Direct department chat (no request record) — used by "WhatsApp reception"-style quick actions. */
publicRoutes.get('/hotels/:slug/whatsapp/:dept', async (c) => {
  const { row } = await resolveHotel(c);
  const dept = c.req.param('dept') as DepartmentCode;
  if (!(DEPARTMENTS as readonly string[]).includes(dept) || dept === 'MANAGEMENT' || dept === 'FEEDBACK') throw notFound();
  const hotel = hydrate(row);
  const number = await resolveWhatsApp(hotel, dept);
  if (!number) throw notFound('This department is not reachable on WhatsApp');
  const lang = c.req.query('lang') === 'ar' ? 'ar' : 'en';
  const room = (c.req.query('room') ?? '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 12);
  const greeting =
    lang === 'ar'
      ? `مرحباً، أتواصل معكم من ${hotel.profile.name_ar}${room ? ` — الغرفة ${room}` : ''}.`
      : `Hello, I'm contacting you from ${hotel.profile.name_en}${room ? ` — Room ${room}` : ''}.`;
  return c.redirect(waLink(number, greeting), 302);
});
