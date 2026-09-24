import { Hono } from 'hono';
import { z } from 'zod';
import {
  REQUEST_STATUSES,
  REQUEST_TYPES,
  STATUS_TRANSITIONS,
  type RequestStatus,
} from '../../../shared/domain';
import { waLink } from '../../../shared/whatsapp';
import { audit } from '../../audit';
import { requireHotelAccess } from '../../auth';
import { clientIp, type AppEnv } from '../../context';
import { one, q, tx } from '../../db';
import { HttpError, notFound, validationError } from '../../errors';
import { changeStatus } from '../../services/orders';
import { departmentScope } from '../../services/access';

export const requestRoutes = new Hono<AppEnv>();

const listQuery = z.object({
  status: z.enum(['OPEN', 'ALL', ...REQUEST_STATUSES]).default('OPEN'),
  department: z.union([z.literal('ALL'), z.string().regex(/^[A-Z][A-Z0-9_]{1,31}$/)]).default('ALL'),
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
  const visible = await departmentScope(u, hid);
  const params: unknown[] = [hid, visible];
  const where = ['hotel_id = $1', 'department = ANY($2::text[])'];
  if (f.status === 'OPEN') where.push(`status IN ('NEW','ACCEPTED','IN_PROGRESS','READY')`);
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
      ORDER BY CASE status WHEN 'NEW' THEN 0 WHEN 'ACCEPTED' THEN 1 WHEN 'IN_PROGRESS' THEN 2 WHEN 'READY' THEN 3 ELSE 4 END,
               CASE priority WHEN 'HIGH' THEN 0 ELSE 1 END, created_at DESC
      LIMIT $${params.length}`,
    params
  );
  const counts = await q<{ status: string; n: number }>(
    `SELECT status, COUNT(*) AS n FROM requests WHERE hotel_id = $1 AND department = ANY($2::text[]) AND status IN ('NEW','ACCEPTED','IN_PROGRESS','READY') GROUP BY status`,
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
  const r = await loadVisible(hid, c.req.param('id'), await departmentScope(u, hid));
  const events = await q(
    `SELECT e.id, e.from_status, e.to_status, e.note, e.is_internal, e.created_at, e.event_type, e.actor_type, e.reason,
            COALESCE(u.name, NULLIF(e.actor_name, '')) AS user_name
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

requestRoutes.post('/:hid/requests/:id/status', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'requests');
  const parsed = z
    .object({
      status: z.enum(REQUEST_STATUSES),
      note: z.string().trim().max(1000).default(''),
      reason: z.string().trim().max(500).default(''),
      guest_message: z.string().trim().max(500).default(''),
    })
    .safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw validationError(parsed.error);
  const { status, note, reason, guest_message } = parsed.data;
  if ((status === 'REJECTED' || status === 'CANCELLED') && !note && !guest_message && !reason) {
    throw new HttpError(422, 'validation_failed', `Please give a reason when ${status === 'REJECTED' ? 'declining' : 'cancelling'} a request`, { fields: { note: 'Reason required' } });
  }
  const departments = await departmentScope(u, hid);
  const result = await tx((client) =>
    changeStatus(client, {
      hotelId: hid,
      requestId: c.req.param('id'),
      to: status,
      note,
      reason: reason || (status === 'REJECTED' || status === 'CANCELLED' ? note || guest_message : ''),
      guestMessage: guest_message,
      user: u,
      departments,
      ip: clientIp(c),
    })
  );
  return c.json({ status: result.status });
});

requestRoutes.post('/:hid/requests/:id/notes', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'requests');
  const parsed = z.object({ note: z.string().trim().min(1).max(1000), internal: z.boolean().default(true) }).safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw validationError(parsed.error);
  const r = await loadVisible(hid, c.req.param('id'), await departmentScope(u, hid));
  await q(
    `INSERT INTO request_events (request_id, hotel_id, user_id, note, is_internal, event_type, actor_type, actor_name) VALUES ($1,$2,$3,$4,$5,$6,'staff',$7)`,
    [r.id, hid, u.id, parsed.data.note, parsed.data.internal, parsed.data.internal ? 'NOTE' : 'GUEST_MESSAGE', u.name]
  );
  await q('UPDATE requests SET updated_at = now() WHERE id = $1', [r.id]);
  return c.json({ ok: true }, 201);
});

/**
 * Guest relations: record how a complaint or feedback case was resolved.
 * Optionally completes the case in the same step.
 */
requestRoutes.post('/:hid/requests/:id/resolution', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'requests');
  const parsed = z.object({ resolution: z.string().trim().min(3, 'Describe how the case was resolved').max(2000), complete: z.boolean().default(false) }).safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw validationError(parsed.error);
  const r = await loadVisible(hid, c.req.param('id'), await departmentScope(u, hid));
  if (r.type !== 'FEEDBACK') throw new HttpError(422, 'validation_failed', 'Resolutions are recorded on guest feedback and complaints');
  await tx(async (client) => {
    await q(`UPDATE requests SET resolution = $3, resolved_at = now(), updated_at = now() WHERE hotel_id = $1 AND id = $2`, [hid, r.id, parsed.data.resolution], client);
    await q(
      `INSERT INTO request_events (request_id, hotel_id, user_id, note, is_internal, event_type, actor_type, actor_name) VALUES ($1,$2,$3,$4,true,'NOTE','staff',$5)`,
      [r.id, hid, u.id, `Resolution: ${parsed.data.resolution}`, u.name],
      client
    );
    await audit({ hotelId: hid, user: u, action: 'resolve', entity: 'request', entityId: r.id, summary: `${r.reference}: resolution recorded`, before: { resolution: r.resolution }, after: { resolution: parsed.data.resolution }, ip: clientIp(c) }, client);
    if (parsed.data.complete && STATUS_TRANSITIONS[r.status as RequestStatus].includes('COMPLETED')) {
      await changeStatus(client, { hotelId: hid, requestId: r.id, to: 'COMPLETED', note: 'Case resolved', user: u, departments: await departmentScope(u, hid), ip: clientIp(c) });
    }
  });
  return c.json({ ok: true });
});
