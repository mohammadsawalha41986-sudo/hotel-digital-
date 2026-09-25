import { Hono } from 'hono';
import { z } from 'zod';
import { ROLE_DEPARTMENTS, ROLE_MODULES } from '../../shared/domain';
import { audit } from '../audit';
import { createSession, destroySession, loadUser, requireUser } from '../auth';
import { clientIp, type AppEnv } from '../context';
import { one, q } from '../db';
import { HttpError, validationError } from '../errors';
import { minutes, rateLimit } from '../rateLimit';
import { hashPassword, validatePasswordStrength, verifyPassword } from '../security';

export const authRoutes = new Hono<AppEnv>();

const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });
const MAX_FAILED = 8;
const LOCK_MINUTES = 15;

// A real hash so unknown-email logins take as long as known ones (no user enumeration by timing).
const dummyHash = hashPassword('timing-equaliser-not-a-real-password');

authRoutes.post('/login', async (c) => {
  const ip = clientIp(c);
  const parsed = loginSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw validationError(parsed.error);
  const { email, password } = parsed.data;
  // Per account (plus the lockout below) stops guessing; the per-IP ceiling
  // leaves room for a whole shift signing in from the hotel office.
  await rateLimit({ key: `login:${email.toLowerCase()}`, limit: 10, windowMs: minutes(15) }, { key: `login-ip:${ip}`, limit: 100, windowMs: minutes(15) });
  const invalid = new HttpError(401, 'invalid_credentials', 'Email or password is incorrect');

  const u = await one<{ id: string; password_hash: string; is_active: boolean; failed_logins: number; locked_until: Date | null }>(
    'SELECT id, password_hash, is_active, failed_logins, locked_until FROM users WHERE email = $1',
    [email]
  );
  if (!u) {
    await verifyPassword(password, await dummyHash);
    throw invalid;
  }
  if (u.locked_until && u.locked_until.getTime() > Date.now()) {
    throw new HttpError(423, 'locked', `Too many failed attempts. Try again in ${LOCK_MINUTES} minutes or ask an administrator to reset your password.`);
  }
  const ok = await verifyPassword(password, u.password_hash);
  if (!ok || !u.is_active) {
    const failed = u.failed_logins + 1;
    if (failed >= MAX_FAILED) {
      await q(`UPDATE users SET failed_logins = 0, locked_until = now() + make_interval(mins => $2) WHERE id = $1`, [u.id, LOCK_MINUTES]);
    } else {
      await q('UPDATE users SET failed_logins = $2 WHERE id = $1', [u.id, failed]);
    }
    throw invalid;
  }
  await q('UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = now() WHERE id = $1', [u.id]);
  await createSession(c, u.id, ip);
  await audit({ hotelId: null, user: await loadUser(u.id), action: 'login', entity: 'session', ip });
  return c.json({ ok: true });
});

authRoutes.post('/logout', async (c) => {
  await destroySession(c);
  return c.json({ ok: true });
});

authRoutes.get('/me', async (c) => {
  const u = c.get('user');
  c.header('Cache-Control', 'no-store');
  if (!u) return c.json({ user: null });
  const hotels = u.global
    ? await q('SELECT id, slug, name_en, name_ar, is_published FROM hotels ORDER BY name_en')
    : await q('SELECT id, slug, name_en, name_ar, is_published FROM hotels WHERE id = ANY($1::uuid[]) ORDER BY name_en', [u.hotelIds]);
  return c.json({
    user: { id: u.id, email: u.email, name: u.name, role: u.role, global: u.global },
    permissions: { modules: ROLE_MODULES[u.role], departments: ROLE_DEPARTMENTS[u.role] },
    hotels,
  });
});

authRoutes.post('/password', async (c) => {
  const u = requireUser(c);
  const body = z.object({ current: z.string().min(1), next: z.string().min(1).max(200) }).safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) throw validationError(body.error);
  const row = await one<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [u.id]);
  if (!row || !(await verifyPassword(body.data.current, row.password_hash))) {
    throw new HttpError(422, 'validation_failed', 'Current password is incorrect', { fields: { current: 'Incorrect password' } });
  }
  const weak = validatePasswordStrength(body.data.next);
  if (weak) throw new HttpError(422, 'validation_failed', weak, { fields: { next: weak } });
  await q('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [u.id, await hashPassword(body.data.next)]);
  // Sign out other devices.
  await q('DELETE FROM sessions WHERE user_id = $1 AND id <> $2', [u.id, c.get('sessionId')]);
  await audit({ hotelId: null, user: u, action: 'password_change', entity: 'user', entityId: u.id, ip: clientIp(c) });
  return c.json({ ok: true });
});
