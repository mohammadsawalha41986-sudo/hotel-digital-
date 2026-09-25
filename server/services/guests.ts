import type pg from 'pg';
import { namesCompatible, nameKey, normalizePhone, type OrderSource } from '../../shared/commerce';
import type { GuestType } from '../../shared/domain';
import { one, q, type Queryable } from '../db';
import { HttpError, conflict, notFound } from '../errors';
import type { Hotel } from '../repos/hotels';

export interface GuestRow {
  id: string;
  hotel_id: string;
  guest_no: string;
  guest_type: GuestType;
  name: string;
  name_key: string;
  phone: string;
  country_code: string;
  email: string;
  preferred_lang: string;
  consent_marketing: boolean;
  consent_updated_at: Date | null;
  notes: string;
  merged_into: string | null;
  anonymized_at: Date | null;
  created_at: Date;
  updated_at: Date;
  last_activity_at: Date;
}

export interface IdentifyInput {
  type: GuestType;
  name: string;
  phone: string;
  room: string;
  email?: string;
  lang?: string;
  stay_reference?: string;
  check_in?: string | null;
  check_out?: string | null;
}

export interface Identified {
  guest: GuestRow;
  stayId: string;
  created: boolean;
  matchedBy: 'phone' | 'device' | 'room' | 'new';
}

const LIVE = 'merged_into IS NULL AND anonymized_at IS NULL';

async function nextNumber(client: Queryable, hotelId: string, key: string): Promise<number> {
  const r = await one<{ value: number }>(
    `INSERT INTO counters (hotel_id, key, value) VALUES ($1, $2, 1)
     ON CONFLICT (hotel_id, key) DO UPDATE SET value = counters.value + 1 RETURNING value`,
    [hotelId, key],
    client
  );
  return r!.value;
}

export async function nextGuestNo(client: Queryable, hotelId: string) {
  return `G-${String(await nextNumber(client, hotelId, 'GUEST')).padStart(6, '0')}`;
}

/**
 * Finds the guest profile for this person in this hotel, or creates one.
 *
 * Matching is deliberately conservative:
 *  1. same normalised phone AND a compatible name → same guest
 *  2. same device (guest token) AND a compatible name → same guest
 *  3. in-house, no phone: an open stay in the same room with a compatible name
 * Otherwise a new profile is created. Similar names alone never link two
 * people; possible duplicates are surfaced for a controlled merge instead.
 */
export async function identifyGuest(
  client: pg.PoolClient,
  hotel: Hotel,
  input: IdentifyInput,
  tokenHash: string | null,
  source: OrderSource | 'PMS'
): Promise<Identified> {
  const { e164, countryCode } = normalizePhone(input.phone, hotel.settings.default_country_code);
  const room = input.type === 'IN_HOUSE' ? input.room.trim().toUpperCase() : '';
  let guest: GuestRow | null = null;
  let matchedBy: Identified['matchedBy'] = 'new';

  if (e164) {
    const byPhone = await q<GuestRow>(`SELECT * FROM guests WHERE hotel_id = $1 AND phone = $2 AND ${LIVE} ORDER BY last_activity_at DESC`, [hotel.id, e164], client);
    guest = byPhone.find((g) => namesCompatible(g.name, input.name)) ?? null;
    if (guest) matchedBy = 'phone';
  }
  if (!guest && tokenHash) {
    const byDevice = await q<GuestRow>(
      `SELECT g.* FROM guest_sessions s JOIN guests g ON g.id = s.guest_id
        WHERE s.hotel_id = $1 AND s.token_hash = $2 AND g.${LIVE.replace(' AND ', ' AND g.')} ORDER BY s.last_seen_at DESC`,
      [hotel.id, tokenHash],
      client
    );
    // A device match must not override a different phone the guest has typed.
    guest = byDevice.find((g) => namesCompatible(g.name, input.name) && (!e164 || !g.phone || g.phone === e164)) ?? null;
    if (guest) matchedBy = 'device';
  }
  if (!guest && !e164 && room) {
    const byRoom = await q<GuestRow>(
      `SELECT g.* FROM guest_stays s JOIN guests g ON g.id = s.guest_id
        WHERE s.hotel_id = $1 AND s.room = $2 AND s.ended_at IS NULL AND s.last_seen_at > now() - interval '3 days'
          AND g.phone = '' AND g.merged_into IS NULL AND g.anonymized_at IS NULL
        ORDER BY s.last_seen_at DESC`,
      [hotel.id, room],
      client
    );
    guest = byRoom.find((g) => namesCompatible(g.name, input.name)) ?? null;
    if (guest) matchedBy = 'room';
  }

  const lang = input.lang === 'ar' ? 'ar' : 'en';
  const email = (input.email ?? '').trim().toLowerCase();
  let created = false;
  if (guest) {
    // Keep the fuller spelling of a compatible name ("Sara" → "Sara Ali"); fill gaps, never overwrite contact data.
    const name = input.name.trim().length > guest.name.length ? input.name.trim() : guest.name;
    guest = (await one<GuestRow>(
      `UPDATE guests SET name = $2, name_key = $3, guest_type = $4, preferred_lang = $5,
              phone = CASE WHEN phone = '' THEN $6 ELSE phone END,
              country_code = CASE WHEN phone = '' THEN $7 ELSE country_code END,
              email = CASE WHEN email = '' THEN $8 ELSE email END,
              last_activity_at = now(), updated_at = now()
        WHERE id = $1 RETURNING *`,
      [guest.id, name, nameKey(name), input.type, lang, e164, countryCode, email],
      client
    ))!;
  } else {
    created = true;
    guest = (await one<GuestRow>(
      `INSERT INTO guests (hotel_id, guest_no, guest_type, name, name_key, phone, country_code, email, preferred_lang)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [hotel.id, await nextGuestNo(client, hotel.id), input.type, input.name.trim(), nameKey(input.name), e164, countryCode, email, lang],
      client
    ))!;
  }

  const stayId = await touchStay(client, hotel, guest.id, input, room, source);
  if (tokenHash) {
    await q(
      `INSERT INTO guest_sessions (hotel_id, token_hash, guest_id, stay_id, entry, qr_room) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (hotel_id, token_hash, guest_id) DO UPDATE SET last_seen_at = now(), stay_id = EXCLUDED.stay_id`,
      [hotel.id, tokenHash, guest.id, stayId, source === 'QR' ? 'QR' : 'GUEST_PORTAL', room],
      client
    );
  }
  return { guest, stayId, created, matchedBy };
}

/** Reuses the open stay (same room) or visit (external, same day), else starts a new one. */
async function touchStay(client: pg.PoolClient, hotel: Hotel, guestId: string, input: IdentifyInput, room: string, source: string): Promise<string> {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: hotel.profile.timezone }).format(new Date());
  const open =
    input.type === 'IN_HOUSE'
      ? await one<{ id: string }>(
          `SELECT id FROM guest_stays WHERE guest_id = $1 AND guest_type = 'IN_HOUSE' AND room = $2 AND ended_at IS NULL
              AND (check_out IS NULL OR check_out >= $3::date) AND last_seen_at > now() - interval '30 days'
            ORDER BY last_seen_at DESC LIMIT 1`,
          [guestId, room, today],
          client
        )
      : await one<{ id: string }>(
          `SELECT id FROM guest_stays WHERE guest_id = $1 AND guest_type = 'EXTERNAL' AND ended_at IS NULL AND last_seen_at > now() - interval '12 hours'
            ORDER BY last_seen_at DESC LIMIT 1`,
          [guestId],
          client
        );
  if (open) {
    await q(
      `UPDATE guest_stays SET last_seen_at = now(),
              stay_reference = CASE WHEN $2 <> '' THEN $2 ELSE stay_reference END,
              check_in = COALESCE($3::date, check_in), check_out = COALESCE($4::date, check_out)
        WHERE id = $1`,
      [open.id, input.stay_reference ?? '', input.check_in ?? null, input.check_out ?? null],
      client
    );
    return open.id;
  }
  if (input.type === 'IN_HOUSE') {
    // A new room means the previous in-house stay context is over.
    await q(`UPDATE guest_stays SET ended_at = now() WHERE guest_id = $1 AND guest_type = 'IN_HOUSE' AND ended_at IS NULL`, [guestId], client);
  }
  const r = await one<{ id: string }>(
    `INSERT INTO guest_stays (hotel_id, guest_id, guest_type, room, stay_reference, check_in, check_out, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [hotel.id, guestId, input.type, room, input.stay_reference ?? '', input.check_in ?? null, input.check_out ?? null, source],
    client
  );
  return r!.id;
}

export async function getGuest(hotelId: string, guestId: string, db?: Queryable): Promise<GuestRow> {
  if (!/^[0-9a-f-]{36}$/i.test(guestId)) throw notFound('Guest not found');
  const g = await one<GuestRow>('SELECT * FROM guests WHERE hotel_id = $1 AND id = $2', [hotelId, guestId], db);
  if (!g) throw notFound('Guest not found');
  return g;
}

// ---------------------------------------------------------------------------
// Guest 360
// ---------------------------------------------------------------------------
export async function guestProfile(hotelId: string, guestId: string, opts: { showCommission: boolean }) {
  const g = await getGuest(hotelId, guestId);
  const [stays, orders, summary, byType, topServices, reviews, sessions, events, commission] = await Promise.all([
    q(`SELECT id, guest_type, room, check_in, check_out, stay_reference, source, started_at, last_seen_at, ended_at
         FROM guest_stays WHERE guest_id = $1 ORDER BY started_at DESC`, [g.id]),
    q(
      `SELECT id, reference, type, order_type, department, source, status, title_en, title_ar, room, total, currency,
              financial_status, is_commercial, created_at, completed_at, cancelled_at, rejected_at, details->>'feedback_type' AS feedback_type,
              details->>'subject' AS subject, notes
         FROM requests WHERE hotel_id = $1 AND guest_id = $2 ORDER BY created_at DESC LIMIT 500`,
      [hotelId, g.id]
    ),
    one(
      `SELECT COUNT(*) FILTER (WHERE is_commercial) AS total_orders,
              COUNT(*) FILTER (WHERE is_commercial AND status = 'COMPLETED') AS completed_orders,
              COUNT(*) FILTER (WHERE is_commercial AND status IN ('NEW','ACCEPTED','IN_PROGRESS','READY')) AS pending_orders,
              COUNT(*) FILTER (WHERE is_commercial AND status IN ('CANCELLED','REJECTED')) AS cancelled_orders,
              COUNT(*) AS total_requests,
              COALESCE(SUM(total) FILTER (WHERE is_commercial AND status = 'COMPLETED'), 0)::float AS total_value,
              ROUND(AVG(total) FILTER (WHERE is_commercial AND status = 'COMPLETED')::numeric, 2)::float AS average_value,
              MAX(updated_at) AS last_activity
         FROM requests WHERE hotel_id = $1 AND guest_id = $2`,
      [hotelId, g.id]
    ),
    q(
      `SELECT order_type, department, COUNT(*) AS n,
              COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
              COUNT(*) FILTER (WHERE status IN ('CANCELLED','REJECTED')) AS cancelled,
              COALESCE(SUM(total) FILTER (WHERE status = 'COMPLETED'), 0)::float AS value
         FROM requests WHERE hotel_id = $1 AND guest_id = $2 AND type <> 'FEEDBACK'
        GROUP BY order_type, department ORDER BY n DESC`,
      [hotelId, g.id]
    ),
    q(
      `SELECT l.name_en, l.name_ar, SUM(l.quantity)::int AS qty, COUNT(DISTINCT l.request_id)::int AS orders
         FROM order_lines l JOIN requests r ON r.id = l.request_id
        WHERE r.hotel_id = $1 AND r.guest_id = $2 AND r.status NOT IN ('CANCELLED','REJECTED')
        GROUP BY l.name_en, l.name_ar ORDER BY orders DESC, qty DESC LIMIT 6`,
      [hotelId, g.id]
    ),
    q(`SELECT id, rating, title, body, status, created_at FROM reviews WHERE hotel_id = $1 AND guest_id = $2 ORDER BY created_at DESC`, [hotelId, g.id]),
    q(`SELECT entry, qr_room, created_at FROM guest_sessions WHERE hotel_id = $1 AND guest_id = $2 ORDER BY created_at`, [hotelId, g.id]),
    q(
      `SELECT e.request_id, r.reference, e.event_type, e.from_status, e.to_status, e.note, e.reason, e.actor_type, e.created_at
         FROM request_events e JOIN requests r ON r.id = e.request_id
        WHERE r.hotel_id = $1 AND r.guest_id = $2 AND e.event_type IN ('CREATED','STATUS','FINANCIAL','REFUNDED','ADJUSTED')
        ORDER BY e.created_at`,
      [hotelId, g.id]
    ),
    opts.showCommission
      ? q(
          `SELECT l.request_id, r.reference, l.entry_type, l.commission_minor, l.earned_at
             FROM commission_ledger l JOIN requests r ON r.id = l.request_id WHERE l.hotel_id = $1 AND r.guest_id = $2 ORDER BY l.earned_at`,
          [hotelId, g.id]
        )
      : Promise.resolve([]),
  ]);

  type T = { at: string; kind: string; title: string; reference?: string; request_id?: string; detail?: string };
  const timeline: T[] = [];
  for (const s of sessions) timeline.push({ at: s.created_at, kind: 'session', title: s.entry === 'QR' ? 'QR session started' : 'Guest portal session started', detail: s.qr_room ? `Room ${s.qr_room}` : undefined });
  for (const s of stays) timeline.push({ at: s.started_at, kind: 'stay', title: s.guest_type === 'IN_HOUSE' ? `Stay started · room ${s.room}` : 'Visit started', detail: s.stay_reference || undefined });
  const orderById = new Map(orders.map((o: any) => [o.id, o]));
  for (const e of events) {
    const o: any = orderById.get(e.request_id);
    const label = o ? o.title_en : e.reference;
    const title =
      e.event_type === 'CREATED'
        ? `${label} created`
        : e.event_type === 'STATUS'
          ? `${label}: ${String(e.to_status).toLowerCase().replace('_', ' ')}`
          : e.event_type === 'FINANCIAL'
            ? `${label}: ${e.note}`
            : `${label}: ${e.event_type.toLowerCase()} — ${e.note}`;
    timeline.push({ at: e.created_at, kind: e.event_type.toLowerCase(), title, reference: e.reference, request_id: e.request_id, detail: e.reason || undefined });
  }
  for (const r of reviews) timeline.push({ at: r.created_at, kind: 'review', title: `Review submitted (${r.rating}★)`, detail: r.title || undefined });
  timeline.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  const complaints = orders.filter((o: any) => o.type === 'FEEDBACK' && ['COMPLAINT', 'SERVICE_RECOVERY'].includes(o.feedback_type));
  const suggestions = orders.filter((o: any) => o.type === 'FEEDBACK' && !['COMPLAINT', 'SERVICE_RECOVERY'].includes(o.feedback_type));
  const currentStay = stays.find((s: any) => !s.ended_at) ?? null;
  return {
    guest: publicGuest(g),
    current_stay: currentStay,
    stays,
    summary,
    service_history: byType,
    most_used: topServices,
    orders: orders.filter((o: any) => o.type !== 'FEEDBACK'),
    relations: { complaints, suggestions, reviews, notes: g.notes },
    timeline,
    commission,
  };
}

export function publicGuest(g: GuestRow) {
  const { name_key: _k, ...rest } = g;
  return { ...rest, merged: !!g.merged_into, anonymized: !!g.anonymized_at };
}

// ---------------------------------------------------------------------------
// Search, duplicates, merge, privacy
// ---------------------------------------------------------------------------
export async function searchGuests(hotelId: string, f: { search: string; type: string; limit: number; offset: number; includeMerged: boolean }) {
  const params: unknown[] = [hotelId];
  const where = ['g.hotel_id = $1'];
  if (!f.includeMerged) where.push('g.merged_into IS NULL');
  if (f.type !== 'ALL') {
    params.push(f.type);
    where.push(`g.guest_type = $${params.length}`);
  }
  if (f.search) {
    const s = f.search.trim();
    params.push(`%${s.replace(/[%_\\]/g, '\\$&')}%`);
    const like = `$${params.length}`;
    const digits = s.replace(/\D/g, '').replace(/^0+/, ''); // local form 05… matches +9665…
    params.push(digits.length >= 4 ? `%${digits}%` : null);
    const phoneLike = `$${params.length}::text`;
    params.push(nameKey(s) ? `%${nameKey(s)}%` : null);
    const nameLike = `$${params.length}::text`;
    where.push(`(g.guest_no ILIKE ${like} OR g.name ILIKE ${like} OR (${nameLike} IS NOT NULL AND g.name_key LIKE ${nameLike}) OR g.email ILIKE ${like}
      OR (${phoneLike} IS NOT NULL AND regexp_replace(g.phone, '\\D', '', 'g') LIKE ${phoneLike})
      OR EXISTS (SELECT 1 FROM guest_stays s WHERE s.guest_id = g.id AND (s.room ILIKE ${like} OR s.stay_reference ILIKE ${like})))`);
  }
  params.push(f.limit, f.offset);
  const rows = await q(
    `SELECT g.id, g.guest_no, g.guest_type, g.name, g.phone, g.email, g.preferred_lang, g.last_activity_at, g.created_at,
            g.merged_into IS NOT NULL AS merged, g.anonymized_at IS NOT NULL AS anonymized,
            (SELECT room FROM guest_stays s WHERE s.guest_id = g.id AND s.ended_at IS NULL ORDER BY s.last_seen_at DESC LIMIT 1) AS room,
            (SELECT COUNT(*) FROM requests r WHERE r.guest_id = g.id AND r.is_commercial) AS orders,
            (SELECT COALESCE(SUM(total), 0)::float FROM requests r WHERE r.guest_id = g.id AND r.is_commercial AND r.status = 'COMPLETED') AS value
       FROM guests g WHERE ${where.join(' AND ')}
      ORDER BY g.last_activity_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const total = await one<{ n: number }>(`SELECT COUNT(*) AS n FROM guests g WHERE ${where.join(' AND ')}`, params.slice(0, -2));
  return { guests: rows, total: total?.n ?? 0 };
}

/** Candidate pairs with the evidence for each. Nothing is merged automatically. */
export async function findDuplicates(hotelId: string) {
  return q(
    `WITH live AS (SELECT * FROM guests WHERE hotel_id = $1 AND merged_into IS NULL AND anonymized_at IS NULL)
     SELECT a.id AS a_id, a.guest_no AS a_no, a.name AS a_name, a.phone AS a_phone,
            b.id AS b_id, b.guest_no AS b_no, b.name AS b_name, b.phone AS b_phone,
            array_remove(ARRAY[
              CASE WHEN a.phone <> '' AND a.phone = b.phone THEN 'same_phone' END,
              CASE WHEN a.email <> '' AND lower(a.email) = lower(b.email) THEN 'same_email' END,
              CASE WHEN a.name_key <> '' AND a.name_key = b.name_key AND EXISTS (
                     SELECT 1 FROM guest_stays sa JOIN guest_stays sb ON sa.room = sb.room AND sa.room <> ''
                      WHERE sa.guest_id = a.id AND sb.guest_id = b.id) THEN 'same_name_and_room' END
            ], NULL) AS reasons
       FROM live a JOIN live b ON a.id < b.id
      WHERE (a.phone <> '' AND a.phone = b.phone)
         OR (a.email <> '' AND lower(a.email) = lower(b.email))
         OR (a.name_key <> '' AND a.name_key = b.name_key AND EXISTS (
               SELECT 1 FROM guest_stays sa JOIN guest_stays sb ON sa.room = sb.room AND sa.room <> ''
                WHERE sa.guest_id = a.id AND sb.guest_id = b.id))
      ORDER BY a.last_activity_at DESC LIMIT 200`,
    [hotelId]
  );
}

/**
 * Controlled merge: everything linked to `secondary` moves to `primary`; the
 * secondary profile remains as a tombstone pointing at the primary.
 */
export async function mergeGuests(client: pg.PoolClient, hotelId: string, primaryId: string, secondaryId: string) {
  if (primaryId === secondaryId) throw new HttpError(422, 'validation_failed', 'Choose two different guests');
  const a = await one<GuestRow>(`SELECT * FROM guests WHERE hotel_id = $1 AND id = $2 FOR UPDATE`, [hotelId, primaryId], client);
  const b = await one<GuestRow>(`SELECT * FROM guests WHERE hotel_id = $1 AND id = $2 FOR UPDATE`, [hotelId, secondaryId], client);
  if (!a || !b) throw notFound('Guest not found');
  if (a.merged_into || b.merged_into) throw conflict('One of these profiles has already been merged');
  if (a.anonymized_at || b.anonymized_at) throw conflict('Anonymised profiles cannot be merged');
  const moved = {
    requests: (await q(`UPDATE requests SET guest_id = $2 WHERE hotel_id = $3 AND guest_id = $1 RETURNING id`, [b.id, a.id, hotelId], client)).length,
    stays: (await q(`UPDATE guest_stays SET guest_id = $2 WHERE guest_id = $1 RETURNING id`, [b.id, a.id], client)).length,
    reviews: (await q(`UPDATE reviews SET guest_id = $2 WHERE guest_id = $1 RETURNING id`, [b.id, a.id], client)).length,
  };
  await q(`DELETE FROM guest_sessions s WHERE s.guest_id = $1 AND EXISTS (SELECT 1 FROM guest_sessions t WHERE t.guest_id = $2 AND t.token_hash = s.token_hash)`, [b.id, a.id], client);
  await q(`UPDATE guest_sessions SET guest_id = $2 WHERE guest_id = $1`, [b.id, a.id], client);
  const notes = [a.notes, b.notes && `[Merged from ${b.guest_no}] ${b.notes}`].filter(Boolean).join('\n');
  const merged = await one<GuestRow>(
    `UPDATE guests SET phone = CASE WHEN phone = '' THEN $2 ELSE phone END, country_code = CASE WHEN phone = '' THEN $3 ELSE country_code END,
            email = CASE WHEN email = '' THEN $4 ELSE email END, notes = $5,
            last_activity_at = GREATEST(last_activity_at, $6), created_at = LEAST(created_at, $7), updated_at = now()
      WHERE id = $1 RETURNING *`,
    [a.id, b.phone, b.country_code, b.email, notes, b.last_activity_at, b.created_at],
    client
  );
  await q(`UPDATE guests SET merged_into = $2, updated_at = now() WHERE id = $1`, [b.id, a.id], client);
  return { before: { primary: publicGuest(a), secondary: publicGuest(b) }, after: publicGuest(merged!), moved };
}

export const ANONYMIZED_NAME = 'Anonymised guest';

/**
 * Erases personal data while keeping order and financial records intact
 * (they carry no personal data beyond the name/phone snapshot, which is
 * blanked here).
 */
export async function anonymizeGuest(client: pg.PoolClient, hotelId: string, guestId: string) {
  const g = await one<GuestRow>(`SELECT * FROM guests WHERE hotel_id = $1 AND id = $2 FOR UPDATE`, [hotelId, guestId], client);
  if (!g) throw notFound('Guest not found');
  if (g.anonymized_at) throw conflict('This profile is already anonymised');
  const open = await one<{ n: number }>(`SELECT COUNT(*) AS n FROM requests WHERE guest_id = $1 AND status IN ('NEW','ACCEPTED','IN_PROGRESS','READY')`, [g.id], client);
  if (open && open.n > 0) throw conflict(`This guest has ${open.n} open request(s). Complete or cancel them first.`);
  const ids = [g.id, ...(await q<{ id: string }>(`SELECT id FROM guests WHERE merged_into = $1`, [g.id], client)).map((r) => r.id)];
  await q(
    `UPDATE requests SET guest_name = $2, guest_phone = '', notes = '', whatsapp_text = '', details = details - 'answers'
      WHERE hotel_id = $3 AND guest_id = ANY($1::uuid[])`,
    [ids, ANONYMIZED_NAME, hotelId],
    client
  );
  await q(`UPDATE reviews SET guest_name = $2 WHERE guest_id = ANY($1::uuid[])`, [ids, ANONYMIZED_NAME], client);
  await q(`UPDATE guest_stays SET stay_reference = '' WHERE guest_id = ANY($1::uuid[])`, [ids], client);
  await q(`DELETE FROM guest_sessions WHERE guest_id = ANY($1::uuid[])`, [ids], client);
  await q(
    `UPDATE guests SET name = $2, name_key = '', phone = '', country_code = '', email = '', notes = '', consent_marketing = false,
            anonymized_at = now(), updated_at = now()
      WHERE id = ANY($1::uuid[])`,
    [ids, ANONYMIZED_NAME],
    client
  );
  return { guest_no: g.guest_no, profiles: ids.length };
}

/** Applies each hotel's retention period (anonymises inactive guests without open requests). */
export async function applyRetention(client: pg.PoolClient) {
  const due = await q<{ id: string; hotel_id: string }>(
    `SELECT g.id, g.hotel_id FROM guests g JOIN hotel_commercial_settings c ON c.hotel_id = g.hotel_id
      WHERE c.guest_retention_days IS NOT NULL AND g.anonymized_at IS NULL AND g.merged_into IS NULL
        AND g.last_activity_at < now() - make_interval(days => c.guest_retention_days)
        AND NOT EXISTS (SELECT 1 FROM requests r WHERE r.guest_id = g.id AND r.status IN ('NEW','ACCEPTED','IN_PROGRESS','READY'))`,
    [],
    client
  );
  for (const g of due) await anonymizeGuest(client, g.hotel_id, g.id);
  return due.length;
}
