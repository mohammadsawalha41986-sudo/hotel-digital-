import { Hono } from 'hono';
import { z } from 'zod';
import { REVIEW_STATUSES, ROLES, type Role } from '../../../shared/domain';
import { IMAGE_URL_PATTERN, VIDEO_URL_PATTERN, mediaUrlSchema } from '../../../shared/fields';
import { audit } from '../../audit';
import { requireHotelAccess, requireUser } from '../../auth';
import { config } from '../../config';
import { clientIp, type AppEnv } from '../../context';
import { one, q, tx } from '../../db';
import { HttpError, badRequest, conflict, forbidden, notFound, validationError } from '../../errors';
import { hashPassword, validatePasswordStrength } from '../../security';
import { removeStoredFile, storeUpload } from '../../services/media';

export const miscRoutes = new Hono<AppEnv>();

// ------------------------------------ Reviews ------------------------------------
miscRoutes.get('/:hid/reviews', async (c) => {
  const hid = c.req.param('hid');
  requireHotelAccess(c, hid, 'reviews');
  const status = z.enum(['ALL', ...REVIEW_STATUSES]).catch('ALL').parse(c.req.query('status'));
  const rows = await q(
    `SELECT r.*, u.name AS moderated_by_name FROM reviews r LEFT JOIN users u ON u.id = r.moderated_by
      WHERE r.hotel_id = $1 ${status === 'ALL' ? '' : 'AND r.status = $2'} ORDER BY r.created_at DESC LIMIT 300`,
    status === 'ALL' ? [hid] : [hid, status]
  );
  return c.json({ reviews: rows });
});

miscRoutes.post('/:hid/reviews/:id/status', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'reviews');
  const parsed = z.object({ status: z.enum(REVIEW_STATUSES) }).safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw validationError(parsed.error);
  const id = c.req.param('id');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound();
  const before = await one('SELECT status FROM reviews WHERE hotel_id = $1 AND id = $2', [hid, id]);
  if (!before) throw notFound('Review not found');
  await q('UPDATE reviews SET status = $3, moderated_by = $4, moderated_at = now() WHERE hotel_id = $1 AND id = $2', [hid, id, parsed.data.status, u.id]);
  await audit({ hotelId: hid, user: u, action: 'moderate', entity: 'review', entityId: id, before, after: parsed.data, summary: `Review ${before.status} → ${parsed.data.status}`, ip: clientIp(c) });
  return c.json({ ok: true });
});

// ------------------------------------ Media ------------------------------------
miscRoutes.get('/:hid/media', async (c) => {
  const hid = c.req.param('hid');
  requireHotelAccess(c, hid, 'hotel');
  const rows = await q(`SELECT id, url, kind, source, mime, size_bytes, filename, label, created_at FROM media WHERE hotel_id = $1 ORDER BY created_at DESC LIMIT 500`, [hid]);
  return c.json({ media: rows });
});

/** Any content editor may upload media for the modules they manage. */
function requireAnyContentModule(c: Parameters<typeof requireUser>[0], hid: string) {
  for (const m of ['hotel', 'dining', 'offers', 'room_services', 'hotel_services', 'spa', 'laundry'] as const) {
    try {
      return requireHotelAccess(c, hid, m);
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) throw e;
    }
  }
  throw forbidden();
}

miscRoutes.post('/:hid/media/upload', async (c) => {
  const hid = c.req.param('hid');
  const u = requireAnyContentModule(c, hid);
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) throw badRequest('No file received');
  const media = await storeUpload(hid, file, { maxBytes: config.maxUploadBytes, allow: ['image', 'video'], source: 'upload', userId: u.id, label: String(form?.get('label') ?? '') });
  await audit({ hotelId: hid, user: u, action: 'upload', entity: 'media', entityId: media.id, summary: `Uploaded ${media.filename}`, ip: clientIp(c) });
  return c.json(media, 201);
});

miscRoutes.post('/:hid/media/url', async (c) => {
  const hid = c.req.param('hid');
  const u = requireAnyContentModule(c, hid);
  const parsed = z.object({ url: mediaUrlSchema.refine((v) => v.startsWith('http'), 'Enter an http(s) URL'), label: z.string().max(200).default('') }).safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw validationError(parsed.error);
  const kind = VIDEO_URL_PATTERN.test(parsed.data.url) ? 'video' : IMAGE_URL_PATTERN.test(parsed.data.url) ? 'image' : 'image';
  const row = await one(`INSERT INTO media (hotel_id, url, kind, source, label, created_by) VALUES ($1,$2,$3,'url',$4,$5) RETURNING *`, [hid, parsed.data.url, kind, parsed.data.label, u.id]);
  return c.json(row, 201);
});

miscRoutes.delete('/:hid/media/:id', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'hotel');
  const id = c.req.param('id');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound();
  const row = await one('DELETE FROM media WHERE hotel_id = $1 AND id = $2 RETURNING url, source, filename', [hid, id]);
  if (!row) throw notFound('Media not found');
  if (row.source !== 'url') await removeStoredFile(row.url);
  await audit({ hotelId: hid, user: u, action: 'delete', entity: 'media', entityId: id, summary: `Deleted ${row.filename || row.url}`, ip: clientIp(c) });
  return c.json({ ok: true });
});

// ------------------------------------ Audit log ------------------------------------
miscRoutes.get('/:hid/audit', async (c) => {
  const hid = c.req.param('hid');
  requireHotelAccess(c, hid, 'audit');
  const entity = c.req.query('entity');
  const before = c.req.query('before');
  const params: unknown[] = [hid];
  let where = 'hotel_id = $1';
  if (entity && /^[a-z_]{2,40}$/.test(entity)) {
    params.push(entity);
    where += ` AND entity = $${params.length}`;
  }
  if (before && /^\d+$/.test(before)) {
    params.push(before);
    where += ` AND id < $${params.length}`;
  }
  const rows = await q(`SELECT id, user_email, action, entity, entity_id, summary, before, after, created_at FROM audit_log WHERE ${where} ORDER BY id DESC LIMIT 100`, params);
  return c.json({ entries: rows });
});

// ------------------------------------ Users ------------------------------------
const userInput = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(2).max(100),
  role: z.enum(ROLES),
  is_active: z.boolean().default(true),
  password: z.string().max(200).optional(),
});

miscRoutes.get('/:hid/users', async (c) => {
  const hid = c.req.param('hid');
  requireHotelAccess(c, hid, 'users');
  const rows = await q(
    `SELECT u.id, u.email, u.name, u.role, u.is_active, u.last_login_at, u.created_at
       FROM users u WHERE u.role = 'SUPER_ADMIN' OR EXISTS (SELECT 1 FROM user_hotels uh WHERE uh.user_id = u.id AND uh.hotel_id = $1)
      ORDER BY u.role = 'SUPER_ADMIN' DESC, u.name`,
    [hid]
  );
  return c.json({ users: rows });
});

function assertCanAssign(actorRole: Role, role: Role) {
  if (role === 'SUPER_ADMIN' && actorRole !== 'SUPER_ADMIN') throw forbidden('Only super admins can grant super admin access');
}

miscRoutes.post('/:hid/users', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'users');
  const parsed = userInput.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw validationError(parsed.error);
  const v = parsed.data;
  assertCanAssign(u.role, v.role);
  const weak = validatePasswordStrength(v.password ?? '');
  if (weak) throw new HttpError(422, 'validation_failed', weak, { fields: { password: weak } });
  const existing = await one<{ id: string; role: string }>('SELECT id, role FROM users WHERE email = $1', [v.email]);
  const id = await tx(async (client) => {
    let userId: string;
    if (existing) {
      // Existing account: grant access to this hotel (role/password unchanged to avoid cross-hotel takeover).
      if (existing.role === 'SUPER_ADMIN') throw conflict('This user already has access to every hotel');
      if (await one('SELECT 1 FROM user_hotels WHERE user_id = $1 AND hotel_id = $2', [existing.id, hid], client)) throw conflict('This user already has access to this hotel');
      if (!u.global) throw conflict('A user with this email already exists for another hotel. Ask a super admin to grant access.');
      userId = existing.id;
    } else {
      const row = await one<{ id: string }>(
        'INSERT INTO users (email, name, role, is_active, password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [v.email, v.name, v.role, v.is_active, await hashPassword(v.password!)],
        client
      );
      userId = row!.id;
    }
    if (v.role !== 'SUPER_ADMIN') await q('INSERT INTO user_hotels (user_id, hotel_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, hid], client);
    await audit({ hotelId: hid, user: u, action: 'create', entity: 'user', entityId: userId, summary: `Granted ${v.email} (${v.role})`, after: { email: v.email, role: v.role }, ip: clientIp(c) }, client);
    return userId;
  });
  return c.json({ id }, 201);
});

miscRoutes.patch('/:hid/users/:uid', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'users');
  const uid = c.req.param('uid');
  const parsed = userInput.partial().omit({ email: true }).safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw validationError(parsed.error);
  if (!/^[0-9a-f-]{36}$/i.test(uid)) throw notFound();
  const target = await one<{ id: string; role: Role; name: string; is_active: boolean; hotels: string[] }>(
    `SELECT u.id, u.role, u.name, u.is_active, COALESCE(array_agg(uh.hotel_id) FILTER (WHERE uh.hotel_id IS NOT NULL), '{}') AS hotels
       FROM users u LEFT JOIN user_hotels uh ON uh.user_id = u.id WHERE u.id = $1 GROUP BY u.id`,
    [uid]
  );
  if (!target || (!target.hotels.includes(hid) && target.role !== 'SUPER_ADMIN')) throw notFound('User not found');
  if (target.role === 'SUPER_ADMIN' && !u.global) throw forbidden('Only super admins can edit super admins');
  // Hotel admins cannot change accounts shared with hotels they do not manage.
  if (!u.global && target.hotels.some((h) => !u.hotelIds.includes(h))) throw forbidden('This user also works for another hotel; ask a super admin');
  const v = parsed.data;
  if (v.role) assertCanAssign(u.role, v.role);
  if (uid === u.id && (v.is_active === false || (v.role && v.role !== u.role))) throw badRequest('You cannot deactivate or change the role of your own account');
  let hash: string | null = null;
  if (v.password) {
    const weak = validatePasswordStrength(v.password);
    if (weak) throw new HttpError(422, 'validation_failed', weak, { fields: { password: weak } });
    hash = await hashPassword(v.password);
  }
  await tx(async (client) => {
    await q(
      `UPDATE users SET name = COALESCE($2, name), role = COALESCE($3, role), is_active = COALESCE($4, is_active),
              password_hash = COALESCE($5, password_hash), failed_logins = CASE WHEN $5 IS NULL THEN failed_logins ELSE 0 END,
              locked_until = CASE WHEN $5 IS NULL THEN locked_until ELSE NULL END, updated_at = now() WHERE id = $1`,
      [uid, v.name ?? null, v.role ?? null, v.is_active ?? null, hash],
      client
    );
    // Deactivation, role change or reset ends existing sessions immediately.
    if (v.is_active === false || v.role || hash) await q('DELETE FROM sessions WHERE user_id = $1', [uid], client);
    await audit(
      { hotelId: hid, user: u, action: 'update', entity: 'user', entityId: uid, summary: `Updated user ${target.name}${hash ? ' (password reset)' : ''}`, before: { role: target.role, is_active: target.is_active }, after: { role: v.role, is_active: v.is_active }, ip: clientIp(c) },
      client
    );
  });
  return c.json({ ok: true });
});

miscRoutes.delete('/:hid/users/:uid', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'users');
  const uid = c.req.param('uid');
  if (uid === u.id) throw badRequest('You cannot remove your own access');
  if (!/^[0-9a-f-]{36}$/i.test(uid)) throw notFound();
  const removed = await one('DELETE FROM user_hotels WHERE user_id = $1 AND hotel_id = $2 RETURNING user_id', [uid, hid]);
  if (!removed) throw notFound('User not found');
  await q('DELETE FROM sessions WHERE user_id = $1', [uid]);
  await audit({ hotelId: hid, user: u, action: 'revoke', entity: 'user', entityId: uid, summary: 'Removed hotel access', ip: clientIp(c) });
  return c.json({ ok: true });
});
