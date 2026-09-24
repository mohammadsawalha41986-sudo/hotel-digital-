import { Hono } from 'hono';
import { z } from 'zod';
import { GUEST_TYPES } from '../../../shared/domain';
import { guestRequestSchema } from '../../../shared/hotel';
import { audit, diff } from '../../audit';
import { requireHotelAccess } from '../../auth';
import { clientIp, type AppEnv, type Ctx } from '../../context';
import { one, q, tx } from '../../db';
import { badRequest, notFound, validationError } from '../../errors';
import { getHotelRow, hydrate } from '../../repos/hotels';
import { canSeePii, departmentScope, financeAccess, requireFinance } from '../../services/access';
import { settlementDetail } from '../../services/finance';
import { anonymizeGuest, findDuplicates, getGuest, guestProfile, identifyGuest, mergeGuests, publicGuest, searchGuests } from '../../services/guests';
import { REPORTS, exportFormat, orderDashboard, redact, reportFilterSchema, runReport, searchOrders, toCsv, toXlsx, type ReportKey, type Scope } from '../../services/reports';
import { createGuestRequest } from '../../services/requests';
import { nameKey, normalizePhone } from '../../../shared/commerce';

/**
 * Hotel-scoped commerce API: guest CRM, order records, this hotel's finance
 * (subject to its finance access setting) and reports.
 */
export const commerceRoutes = new Hono<AppEnv>();

const json = async (c: Ctx) =>
  c.req.json().catch(() => {
    throw badRequest('Invalid JSON body');
  });

async function hotelOf(hid: string) {
  const row = await getHotelRow(hid);
  if (!row) throw notFound('Hotel not found');
  return hydrate(row);
}

// ------------------------------------------------------------------ Guests
commerceRoutes.get('/:hid/guests', async (c) => {
  const hid = c.req.param('hid');
  requireHotelAccess(c, hid, 'guests');
  const f = z
    .object({
      search: z.string().trim().max(80).default(''),
      type: z.enum(['ALL', ...GUEST_TYPES]).default('ALL'),
      limit: z.coerce.number().int().min(1).max(200).default(50),
      offset: z.coerce.number().int().min(0).default(0),
      include_merged: z.enum(['0', '1']).default('0'),
    })
    .parse(c.req.query());
  c.header('Cache-Control', 'no-store');
  return c.json(await searchGuests(hid, { ...f, includeMerged: f.include_merged === '1' }));
});

commerceRoutes.get('/:hid/guests/duplicates', async (c) => {
  const hid = c.req.param('hid');
  requireHotelAccess(c, hid, 'guests');
  return c.json({ pairs: await findDuplicates(hid) });
});

const guestCreate = z.object({
  type: z.enum(GUEST_TYPES),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(24).default(''),
  email: z.union([z.literal(''), z.string().trim().email()]).default(''),
  lang: z.enum(['en', 'ar']).default('en'),
  room: z.string().trim().max(12).default(''),
  stay_reference: z.string().trim().max(60).default(''),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
});

commerceRoutes.post('/:hid/guests', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'guests');
  const parsed = guestCreate.safeParse(await json(c));
  if (!parsed.success) throw validationError(parsed.error);
  const v = parsed.data;
  if (v.type === 'IN_HOUSE' && !/^[A-Za-z0-9-]{1,12}$/.test(v.room)) throw validationError(new z.ZodError([{ code: 'custom', path: ['room'], message: 'Room number is required for in-house guests', input: v.room }]));
  const hotel = await hotelOf(hid);
  const res = await tx(async (client) => {
    const r = await identifyGuest(client, hotel, v, null, 'ADMIN');
    await audit({ hotelId: hid, user: u, action: r.created ? 'create' : 'update', entity: 'guest', entityId: r.guest.id, summary: `${r.created ? 'Created' : 'Matched'} guest ${r.guest.guest_no} (${r.matchedBy})`, ip: clientIp(c) }, client);
    return r;
  });
  return c.json({ guest: publicGuest(res.guest), created: res.created, matched_by: res.matchedBy }, res.created ? 201 : 200);
});

commerceRoutes.get('/:hid/guests/:gid', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'guests');
  const access = await financeAccess(u, hid);
  const profile = await guestProfile(hid, c.req.param('gid'), { showCommission: access === 'FULL' });
  await audit({ hotelId: hid, user: u, action: 'view', entity: 'guest', entityId: profile.guest.id, summary: `Viewed guest profile ${profile.guest.guest_no}`, ip: clientIp(c) });
  c.header('Cache-Control', 'no-store');
  return c.json(profile);
});

const guestPatch = z
  .object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().max(24),
    email: z.union([z.literal(''), z.string().trim().email()]),
    preferred_lang: z.enum(['en', 'ar']),
    consent_marketing: z.boolean(),
    notes: z.string().trim().max(4000),
  })
  .partial()
  .strict();

commerceRoutes.patch('/:hid/guests/:gid', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'guests');
  const body = await json(c);
  const parsed = guestPatch.safeParse(body);
  if (!parsed.success) throw validationError(parsed.error);
  if (!Object.keys(parsed.data).length) throw validationError(new z.ZodError([{ code: 'custom', path: [], message: 'Nothing to update', input: body }]));
  const hotel = await hotelOf(hid);
  const g = await getGuest(hid, c.req.param('gid'));
  if (g.anonymized_at || g.merged_into) throw badRequest('This profile can no longer be edited');
  const v = parsed.data;
  const phone = v.phone === undefined ? null : normalizePhone(v.phone, hotel.settings.default_country_code);
  if (v.phone && !phone?.e164) throw validationError(new z.ZodError([{ code: 'custom', path: ['phone'], message: 'Enter a valid phone number', input: v.phone }]));
  const after = await one(
    `UPDATE guests SET name = COALESCE($3, name), name_key = COALESCE($4, name_key), phone = COALESCE($5, phone), country_code = COALESCE($6, country_code),
            email = COALESCE($7, email), preferred_lang = COALESCE($8, preferred_lang), notes = COALESCE($9, notes),
            consent_marketing = COALESCE($10, consent_marketing),
            consent_updated_at = CASE WHEN $10::boolean IS NOT NULL AND $10::boolean IS DISTINCT FROM consent_marketing THEN now() ELSE consent_updated_at END,
            updated_at = now()
      WHERE hotel_id = $1 AND id = $2 RETURNING *`,
    [hid, g.id, v.name ?? null, v.name ? nameKey(v.name) : null, phone?.e164 ?? null, phone?.countryCode ?? null, v.email?.toLowerCase() ?? null, v.preferred_lang ?? null, v.notes ?? null, v.consent_marketing ?? null]
  );
  const d = diff(publicGuest(g) as never, publicGuest(after) as never);
  const changed = Object.keys(d.after ?? {}).filter((k) => k !== 'updated_at' && k !== 'consent_updated_at');
  if (changed.length) await audit({ hotelId: hid, user: u, action: 'update', entity: 'guest', entityId: g.id, summary: `Guest ${g.guest_no}: ${changed.join(', ')}`, ...d, ip: clientIp(c) });
  return c.json({ guest: publicGuest(after), changed: changed.length > 0 });
});

const stayInput = z.object({
  room: z.string().trim().max(12).default(''),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  stay_reference: z.string().trim().max(60).optional(),
  ended: z.boolean().optional(),
});

commerceRoutes.patch('/:hid/guests/:gid/stays/:sid', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'guests');
  const parsed = stayInput.partial().strict().safeParse(await json(c));
  if (!parsed.success) throw validationError(parsed.error);
  const v = parsed.data;
  if (!Object.keys(v).length) throw validationError(new z.ZodError([{ code: 'custom', path: [], message: 'Nothing to update', input: v }]));
  const g = await getGuest(hid, c.req.param('gid'));
  const sid = c.req.param('sid');
  if (!/^[0-9a-f-]{36}$/i.test(sid)) throw notFound('Stay not found');
  const before = await one(`SELECT * FROM guest_stays WHERE hotel_id = $1 AND guest_id = $2 AND id = $3`, [hid, g.id, sid]);
  if (!before) throw notFound('Stay not found');
  const checkIn = v.check_in !== undefined ? v.check_in : before.check_in;
  const checkOut = v.check_out !== undefined ? v.check_out : before.check_out;
  if (checkIn && checkOut && checkOut < checkIn) throw validationError(new z.ZodError([{ code: 'custom', path: ['check_out'], message: 'Check-out must be on or after check-in', input: checkOut }]));
  const after = await one(
    `UPDATE guest_stays SET room = COALESCE($3, room), check_in = CASE WHEN $4::boolean THEN $5::date ELSE check_in END,
            check_out = CASE WHEN $6::boolean THEN $7::date ELSE check_out END, stay_reference = COALESCE($8, stay_reference),
            ended_at = CASE WHEN $9::boolean IS TRUE THEN COALESCE(ended_at, now()) WHEN $9::boolean IS FALSE THEN NULL ELSE ended_at END
      WHERE hotel_id = $1 AND id = $2 RETURNING *`,
    [hid, sid, v.room?.toUpperCase() ?? null, v.check_in !== undefined, v.check_in ?? null, v.check_out !== undefined, v.check_out ?? null, v.stay_reference ?? null, v.ended ?? null]
  );
  await audit({ hotelId: hid, user: u, action: 'update', entity: 'guest_stay', entityId: sid, summary: `Stay of ${g.guest_no} updated`, ...diff(before, after), ip: clientIp(c) });
  return c.json({ stay: after });
});

commerceRoutes.post('/:hid/guests/merge', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'guests');
  const parsed = z
    .object({ primary_id: z.string().uuid(), secondary_id: z.string().uuid(), reason: z.string().trim().min(3, 'Explain why these are the same person').max(500), confirm: z.literal(true) })
    .safeParse(await json(c));
  if (!parsed.success) throw validationError(parsed.error);
  const v = parsed.data;
  const result = await tx(async (client) => {
    const r = await mergeGuests(client, hid, v.primary_id, v.secondary_id);
    await audit({ hotelId: hid, user: u, action: 'merge', entity: 'guest', entityId: v.primary_id, summary: `Merged ${r.before.secondary.guest_no} into ${r.before.primary.guest_no}: ${v.reason}`, before: r.before, after: { ...r.after, moved: r.moved }, ip: clientIp(c) }, client);
    return r;
  });
  return c.json({ guest: result.after, moved: result.moved });
});

commerceRoutes.post('/:hid/guests/:gid/anonymize', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'guests');
  if (!['SUPER_ADMIN', 'HOTEL_ADMIN'].includes(u.role)) throw notFound();
  const parsed = z.object({ reason: z.string().trim().min(3).max(500), confirm: z.literal(true) }).safeParse(await json(c));
  if (!parsed.success) throw validationError(parsed.error);
  const r = await tx(async (client) => {
    const res = await anonymizeGuest(client, hid, c.req.param('gid'));
    await audit({ hotelId: hid, user: u, action: 'anonymize', entity: 'guest', entityId: c.req.param('gid'), summary: `Anonymised ${res.guest_no} (${res.profiles} profile(s)): ${parsed.data.reason}`, ip: clientIp(c) }, client);
    return res;
  });
  return c.json(r);
});

/** Data-subject export (everything the hotel holds about this guest). */
commerceRoutes.get('/:hid/guests/:gid/export', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'guests');
  const profile = await guestProfile(hid, c.req.param('gid'), { showCommission: false });
  await audit({ hotelId: hid, user: u, action: 'export', entity: 'guest', entityId: profile.guest.id, summary: `Exported personal data of ${profile.guest.guest_no}`, ip: clientIp(c) });
  c.header('Content-Disposition', `attachment; filename="${profile.guest.guest_no}.json"`);
  return c.json(profile);
});

// ------------------------------------------------------------------ Orders
async function hotelScope(c: Ctx, hid: string): Promise<Scope> {
  const u = c.get('user')!;
  return { hotelIds: [hid], departments: await departmentScope(u, hid) };
}

commerceRoutes.get('/:hid/orders', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'orders');
  const f = reportFilterSchema.safeParse(c.req.query());
  if (!f.success) throw validationError(f.error);
  const page = z.object({ limit: z.coerce.number().int().min(1).max(500).default(50), offset: z.coerce.number().int().min(0).default(0) }).parse(c.req.query());
  const access = await financeAccess(u, hid);
  const format = exportFormat(c.req.query('format'));
  const result = await searchOrders(await hotelScope(c, hid), { ...f.data, hotel_id: undefined }, { ...page, limit: format === 'json' ? page.limit : 5000, showPii: canSeePii(u), showFinance: access === 'FULL' });
  c.header('Cache-Control', 'no-store');
  if (format === 'json') return c.json(result);
  const report = {
    title: 'Orders',
    columns: [
      { key: 'reference', label: 'Reference' }, { key: 'created_at', label: 'Created' }, { key: 'order_type', label: 'Type' },
      { key: 'department', label: 'Department' }, { key: 'source', label: 'Source' }, { key: 'status', label: 'Status' },
      { key: 'guest_no', label: 'Guest ID' }, { key: 'guest_name', label: 'Guest' }, { key: 'guest_phone', label: 'Phone' }, { key: 'room', label: 'Room' },
      { key: 'title_en', label: 'Service' }, { key: 'total', label: 'Total' }, { key: 'currency', label: 'Currency' }, { key: 'financial_status', label: 'Financial status' },
      ...(access === 'FULL' ? [{ key: 'commission_minor', label: 'Commission', money: true }, { key: 'settlement_no', label: 'Settlement' }] : []),
    ],
    rows: result.orders,
  };
  await audit({ hotelId: hid, user: u, action: 'export', entity: 'orders', summary: `Exported ${result.orders.length} orders (${format})`, ip: clientIp(c) });
  return sendReport(c, report, format, `orders-${new Date().toISOString().slice(0, 10)}`);
});

commerceRoutes.get('/:hid/orders/dashboard', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'dashboard');
  const f = reportFilterSchema.safeParse(c.req.query());
  if (!f.success) throw validationError(f.error);
  const access = await financeAccess(u, hid);
  c.header('Cache-Control', 'no-store');
  return c.json({ ...(await orderDashboard(await hotelScope(c, hid), { ...f.data, hotel_id: undefined }, access === 'FULL')), finance_access: access });
});

commerceRoutes.get('/:hid/orders/:id', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'orders');
  const id = c.req.param('id');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound('Order not found');
  const r = await one(
    `SELECT r.*, g.guest_no, s.room AS stay_room, s.check_in, s.check_out, s.stay_reference
       FROM requests r LEFT JOIN guests g ON g.id = r.guest_id LEFT JOIN guest_stays s ON s.id = r.stay_id
      WHERE r.hotel_id = $1 AND r.id = $2`,
    [hid, id]
  );
  if (!r || !(await departmentScope(u, hid)).includes(r.department)) throw notFound('Order not found');
  const access = await financeAccess(u, hid);
  const [lines, events, snapshot, ledger, adjustments] = await Promise.all([
    q(`SELECT * FROM order_lines WHERE request_id = $1 ORDER BY line_no`, [r.id]),
    q(
      `SELECT e.id, e.event_type, e.from_status, e.to_status, e.note, e.reason, e.is_internal, e.actor_type, COALESCE(u.name, NULLIF(e.actor_name,'')) AS actor, e.created_at
         FROM request_events e LEFT JOIN users u ON u.id = e.user_id WHERE e.request_id = $1 ORDER BY e.created_at`,
      [r.id]
    ),
    access === 'FULL' ? one(`SELECT * FROM financial_snapshots WHERE request_id = $1`, [r.id]) : Promise.resolve(null),
    access === 'FULL'
      ? q(`SELECT l.*, s.settlement_no, s.status AS settlement_status FROM commission_ledger l LEFT JOIN settlements s ON s.id = l.settlement_id WHERE l.request_id = $1 ORDER BY l.created_at`, [r.id])
      : Promise.resolve([]),
    access === 'FULL' ? q(`SELECT * FROM financial_adjustments WHERE request_id = $1 ORDER BY created_at`, [r.id]) : Promise.resolve([]),
  ]);
  const { guest_token_hash: _t, whatsapp_text: _w, ...order } = r;
  return c.json({ order: redact(order, canSeePii(u)), lines, events, finance_access: access, snapshot, ledger, adjustments });
});

/** Staff enter an order on a guest's behalf (phone call, WhatsApp, walk-in). Same pricing and rules as the guest app. */
commerceRoutes.post('/:hid/orders', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'requests');
  const body = await json(c);
  const parsed = z
    .object({
      source: z.enum(['ADMIN', 'MANUAL', 'WHATSAPP']).default('MANUAL'),
      email: z.union([z.literal(''), z.string().trim().email()]).default(''),
      stay_reference: z.string().trim().max(60).default(''),
    })
    .passthrough()
    .safeParse(body);
  if (!parsed.success) throw validationError(parsed.error);
  const req = guestRequestSchema.safeParse(body);
  if (!req.success) throw validationError(req.error);
  const hotel = await hotelOf(hid);
  const created = await createGuestRequest(hotel, body, null, {
    source: parsed.data.source,
    actor: u,
    guestExtra: { email: parsed.data.email, stay_reference: parsed.data.stay_reference },
  });
  await audit({ hotelId: hid, user: u, action: 'create', entity: 'request', entityId: created.id, summary: `Entered ${created.reference} for a guest (${parsed.data.source})`, ip: clientIp(c) });
  return c.json(created, 201);
});

// ------------------------------------------------------------------ This hotel's finance
commerceRoutes.get('/:hid/finance/summary', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'finance');
  const access = await requireFinance(u, hid, 'SETTLEMENTS');
  const settlements = await q(
    `SELECT id, settlement_no, period_type, to_char(period_start,'YYYY-MM-DD') AS period_start, to_char(period_end,'YYYY-MM-DD') AS period_end,
            status, order_count, gross_minor, refunds_minor, adjustments_minor, base_minor, commission_minor, commission_tax_minor, hotel_amount_minor,
            amount_due_minor, currency, settled_at, payment_reference
       FROM settlements WHERE hotel_id = $1 AND status <> 'VOID' ORDER BY period_start DESC LIMIT 100`,
    [hid]
  );
  const agreement =
    access === 'FULL'
      ? await q(
          `SELECT r.id, r.version, r.scope_level, r.scope_value, r.commission_type, r.rate_bps, r.fixed_fee_minor, r.basis, r.eligible_status,
                  r.cancellation_policy, r.tax_treatment, r.tax_rate_bps, r.effective_from, r.effective_to, a.name AS agreement
             FROM commission_rules r JOIN commission_agreements a ON a.id = r.agreement_id
            WHERE r.hotel_id = $1 AND r.is_active AND a.is_active AND (r.effective_to IS NULL OR r.effective_to > now())
            ORDER BY r.effective_from DESC`,
          [hid]
        )
      : [];
  const ledger =
    access === 'FULL'
      ? await q(
          `SELECT l.id, l.entry_no, l.entry_type, l.earned_at, l.gross_minor, l.base_minor, l.rate_bps, l.commission_minor, l.commission_tax_minor,
                  l.hotel_amount_minor, l.status, r.reference, r.id AS request_id, s.settlement_no
             FROM commission_ledger l JOIN requests r ON r.id = l.request_id LEFT JOIN settlements s ON s.id = l.settlement_id
            WHERE l.hotel_id = $1 ORDER BY l.earned_at DESC LIMIT 200`,
          [hid]
        )
      : [];
  c.header('Cache-Control', 'no-store');
  return c.json({ access, settlements, rules: agreement, ledger });
});

commerceRoutes.get('/:hid/finance/settlements/:sid', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'finance');
  await requireFinance(u, hid, 'SETTLEMENTS');
  const detail = await settlementDetail(hid, c.req.param('sid'), { showGuest: canSeePii(u) });
  if (detail.settlement.status === 'VOID') throw notFound('Settlement not found');
  const format = exportFormat(c.req.query('format'));
  if (format === 'json') return c.json(detail);
  return sendReport(c, statementReport(detail), format, detail.settlement.settlement_no);
});

// ------------------------------------------------------------------ Reports
commerceRoutes.get('/:hid/reports/:report', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'orders');
  const key = c.req.param('report') as ReportKey;
  const def = REPORTS[key];
  if (!def || def.platformOnly) throw notFound('Unknown report');
  if (def.finance) await requireFinance(u, hid, key === 'settlements' ? 'SETTLEMENTS' : 'FULL');
  const f = reportFilterSchema.safeParse(c.req.query());
  if (!f.success) throw validationError(f.error);
  const report = await runReport(key, await hotelScope(c, hid), { ...f.data, hotel_id: undefined });
  return sendReport(c, report, exportFormat(c.req.query('format')), `${key}-${new Date().toISOString().slice(0, 10)}`);
});

// ------------------------------------------------------------------ helpers (shared with the platform routes)
export async function sendReport(c: Ctx, report: { title: string; columns: { key: string; label: string; money?: boolean }[]; rows: Record<string, unknown>[] }, format: 'json' | 'csv' | 'xlsx', filename: string) {
  c.header('Cache-Control', 'no-store');
  const safe = filename.replace(/[^A-Za-z0-9._-]/g, '_');
  if (format === 'json') return c.json(report);
  if (format === 'csv') {
    c.header('Content-Type', 'text/csv; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="${safe}.csv"`);
    return c.body(toCsv(report));
  }
  const buf = await toXlsx(report);
  c.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  c.header('Content-Disposition', `attachment; filename="${safe}.xlsx"`);
  return c.body(new Uint8Array(buf));
}

export function statementReport(d: Awaited<ReturnType<typeof settlementDetail>>) {
  const s = d.settlement;
  return {
    title: `Settlement ${s.settlement_no} · ${s.hotel_name} · ${s.period_start} → ${s.period_end}`,
    columns: [
      { key: 'entry_no', label: 'Ledger entry' },
      { key: 'entry_type', label: 'Type' },
      { key: 'reference', label: 'Order' },
      { key: 'guest_no', label: 'Guest ID' },
      { key: 'order_type', label: 'Order type' },
      { key: 'department', label: 'Department' },
      { key: 'rule_level', label: 'Rule' },
      { key: 'rule_version', label: 'Rule version' },
      { key: 'gross_minor', label: 'Order value', money: true },
      { key: 'base_minor', label: 'Commission base', money: true },
      { key: 'commission_minor', label: 'Commission', money: true },
      { key: 'commission_tax_minor', label: 'Commission tax', money: true },
      { key: 'hotel_amount_minor', label: 'Hotel amount', money: true },
      { key: 'formula', label: 'Calculation' },
      { key: 'adjustment_no', label: 'Adjustment' },
      { key: 'adjustment_reason', label: 'Adjustment reason' },
    ],
    rows: d.lines,
  };
}
