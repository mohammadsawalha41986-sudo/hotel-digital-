import { Hono } from 'hono';
import { z } from 'zod';
import {
  DEPARTMENTS,
  REQUEST_STATUSES,
  REQUEST_TYPES,
  ROLE_DEPARTMENTS,
  STATUS_TRANSITIONS,
  type RequestStatus,
} from '../../../shared/domain';
import { waLink } from '../../../shared/whatsapp';
import { audit } from '../../audit';
import { requireHotelAccess } from '../../auth';
import { clientIp, type AppEnv } from '../../context';
import { one, q, tx } from '../../db';
import { HttpError, notFound, validationError } from '../../errors';

export const requestRoutes = new Hono<AppEnv>();

const listQuery = z.object({
  status: z.enum(['OPEN', 'ALL', ...REQUEST_STATUSES]).default('OPEN'),
  department: z.enum(['ALL', ...DEPARTMENTS]).default('ALL'),
  type: z.enum(['ALL', ...REQUEST_TYPES]).default('ALL'),
  search: z.string().trim().max(80).default(''),
  since: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

requestRoutes.get('/:hid/requests', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'requests');
  const parsed = listQuery.safeParse(c.req.query());
  if (!parsed.success) throw validationError(parsed.error);
  const f = parsed.data;
  const visible = ROLE_DEPARTMENTS[u.role];
  const params: unknown[] = [hid, visible];
  const where = ['hotel_id = $1', 'department = ANY($2::text[])'];
  if (f.status === 'OPEN') where.push(`status IN ('NEW','ACCEPTED','IN_PROGRESS')`);
  else if (f.status !== 'ALL') {
    params.push(f.status);
    where.push(`status = $${params.length}`);
  }
  if (f.department !== 'ALL') {
    params.push(f.department);
    where.push(`department = $${params.length}`);
  }
  if (f.type !== 'ALL') {
    params.push(f.type);
    where.push(`type = $${params.length}`);
  }
  if (f.search) {
    params.push(`%${f.search.replace(/[%_\\]/g, '\\$&')}%`);
    where.push(`(reference ILIKE $${params.length} OR room ILIKE $${params.length} OR guest_name ILIKE $${params.length} OR guest_phone ILIKE $${params.length} OR title_en ILIKE $${params.length})`);
  }
  if (f.since) {
    params.push(f.since);
    where.push(`updated_at > $${params.length}`);
  }
  params.push(f.limit);
  const rows = await q(
    `SELECT id, reference, type, department, status, priority, title_en, title_ar, guest_type, guest_name, guest_phone, room, lang,
            total, currency, created_at, updated_at, accepted_at, started_at, completed_at,
            jsonb_array_length(lines) AS line_count
       FROM requests WHERE ${where.join(' AND ')}
      ORDER BY CASE status WHEN 'NEW' THEN 0 WHEN 'ACCEPTED' THEN 1 WHEN 'IN_PROGRESS' THEN 2 ELSE 3 END,
               CASE priority WHEN 'HIGH' THEN 0 ELSE 1 END, created_at DESC
      LIMIT $${params.length}`,
    params
  );
  const counts = await q<{ status: string; n: number }>(
    `SELECT status, COUNT(*) AS n FROM requests WHERE hotel_id = $1 AND department = ANY($2::text[]) AND status IN ('NEW','ACCEPTED','IN_PROGRESS') GROUP BY status`,
    [hid, visible]
  );
  c.header('Cache-Control', 'no-store');
  return c.json({ requests: rows, open_counts: Object.fromEntries(counts.map((r) => [r.status, r.n])) });
});

async function loadVisible(hid: string, id: string, departments: readonly string[]) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound('Request not found');
  const r = await one('SELECT * FROM requests WHERE hotel_id = $1 AND id = $2', [hid, id]);
  // Other departments' requests are indistinguishable from missing ones.
  if (!r || !departments.includes(r.department)) throw notFound('Request not found');
  return r;
}

requestRoutes.get('/:hid/requests/:id', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'requests');
  const r = await loadVisible(hid, c.req.param('id'), ROLE_DEPARTMENTS[u.role]);
  const events = await q(
    `SELECT e.id, e.from_status, e.to_status, e.note, e.is_internal, e.created_at, u.name AS user_name
       FROM request_events e LEFT JOIN users u ON u.id = e.user_id WHERE e.request_id = $1 ORDER BY e.created_at`,
    [r.id]
  );
  const { guest_token_hash: _omit, ...safe } = r;
  return c.json({
    request: { ...safe, whatsapp_url: r.whatsapp_to ? waLink(r.whatsapp_to, r.whatsapp_text) : null },
    events,
    transitions: STATUS_TRANSITIONS[r.status as RequestStatus],
  });
});

const TIMESTAMP_COLUMN: Partial<Record<RequestStatus, string>> = {
  ACCEPTED: 'accepted_at',
  IN_PROGRESS: 'started_at',
  COMPLETED: 'completed_at',
  REJECTED: 'rejected_at',
  CANCELLED: 'cancelled_at',
};

requestRoutes.post('/:hid/requests/:id/status', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'requests');
  const parsed = z
    .object({ status: z.enum(REQUEST_STATUSES), note: z.string().trim().max(1000).default(''), guest_message: z.string().trim().max(500).default('') })
    .safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw validationError(parsed.error);
  const { status, note, guest_message } = parsed.data;
  if (status === 'REJECTED' && !note && !guest_message) {
    throw new HttpError(422, 'validation_failed', 'Please give a reason when declining a request', { fields: { note: 'Reason required' } });
  }
  const result = await tx(async (client) => {
    // Lock the row so two staff members cannot race the same transition.
    const r = await one('SELECT id, status, department, reference FROM requests WHERE hotel_id = $1 AND id = $2 FOR UPDATE', [hid, c.req.param('id')], client);
    if (!r || !ROLE_DEPARTMENTS[u.role].includes(r.department)) throw notFound('Request not found');
    const from = r.status as RequestStatus;
    if (!STATUS_TRANSITIONS[from].includes(status)) {
      throw new HttpError(409, 'invalid_transition', `A ${from.toLowerCase().replace('_', ' ')} request cannot be moved to ${status.toLowerCase().replace('_', ' ')}. It may have been updated by a colleague — refresh to see the latest status.`);
    }
    const col = TIMESTAMP_COLUMN[status];
    // Moving straight to COMPLETED still stamps accepted_at for response-time analytics.
    const acceptedFill = status === 'IN_PROGRESS' || status === 'COMPLETED' ? ', accepted_at = COALESCE(accepted_at, now())' : '';
    await q(
      `UPDATE requests SET status = $3, updated_at = now(), assigned_to = COALESCE(assigned_to, $4)${col ? `, ${col} = now()` : ''}${acceptedFill} WHERE hotel_id = $1 AND id = $2`,
      [hid, r.id, status, u.id],
      client
    );
    await q(
      `INSERT INTO request_events (request_id, hotel_id, user_id, from_status, to_status, note, is_internal) VALUES ($1,$2,$3,$4,$5,$6,true)`,
      [r.id, hid, u.id, from, status, note],
      client
    );
    if (guest_message) {
      await q(`INSERT INTO request_events (request_id, hotel_id, user_id, to_status, note, is_internal) VALUES ($1,$2,$3,$4,$5,false)`, [r.id, hid, u.id, status, guest_message], client);
    }
    await audit({ hotelId: hid, user: u, action: 'status', entity: 'request', entityId: r.id, summary: `${r.reference}: ${from} → ${status}`, before: { status: from }, after: { status, note }, ip: clientIp(c) }, client);
    return { status };
  });
  return c.json(result);
});

requestRoutes.post('/:hid/requests/:id/notes', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'requests');
  const parsed = z.object({ note: z.string().trim().min(1).max(1000), internal: z.boolean().default(true) }).safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw validationError(parsed.error);
  const r = await loadVisible(hid, c.req.param('id'), ROLE_DEPARTMENTS[u.role]);
  await q(`INSERT INTO request_events (request_id, hotel_id, user_id, note, is_internal) VALUES ($1,$2,$3,$4,$5)`, [r.id, hid, u.id, parsed.data.note, parsed.data.internal]);
  await q('UPDATE requests SET updated_at = now() WHERE id = $1', [r.id]);
  return c.json({ ok: true }, 201);
});
