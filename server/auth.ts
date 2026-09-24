import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { MiddlewareHandler } from 'hono';
import { ROLES, roleCan, type Module, type Role } from '../shared/domain';
import { config } from './config';
import type { AppEnv, Ctx, SessionUser } from './context';
import { one, q } from './db';
import { forbidden, notFound, unauthorized } from './errors';
import { randomToken, sha256 } from './security';

export async function createSession(c: Ctx, userId: string, ip: string): Promise<void> {
  const token = randomToken();
  const expires = new Date(Date.now() + config.sessionDays * 86400_000);
  await q('INSERT INTO sessions (id, user_id, expires_at, ip, user_agent) VALUES ($1,$2,$3,$4,$5)', [
    sha256(token),
    userId,
    expires,
    ip,
    (c.req.header('user-agent') ?? '').slice(0, 300),
  ]);
  setCookie(c, config.cookieName, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'Lax',
    path: '/',
    expires,
  });
}

export async function destroySession(c: Ctx): Promise<void> {
  const token = getCookie(c, config.cookieName);
  if (token) await q('DELETE FROM sessions WHERE id = $1', [sha256(token)]);
  deleteCookie(c, config.cookieName, { path: '/' });
}

export async function loadUser(userId: string): Promise<SessionUser | null> {
  const u = await one<{ id: string; email: string; name: string; role: string; is_active: boolean }>(
    'SELECT id, email, name, role, is_active FROM users WHERE id = $1',
    [userId]
  );
  if (!u || !u.is_active || !(ROLES as readonly string[]).includes(u.role)) return null;
  const hotels = await q<{ hotel_id: string }>('SELECT hotel_id FROM user_hotels WHERE user_id = $1', [u.id]);
  const role = u.role as Role;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role,
    hotelIds: hotels.map((h) => h.hotel_id),
    global: role === 'SUPER_ADMIN',
  };
}

/** Resolves the session cookie into c.var.user (null when anonymous). */
export const sessionMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set('user', null);
  c.set('sessionId', null);
  const token = getCookie(c, config.cookieName);
  if (token) {
    const id = sha256(token);
    const s = await one<{ user_id: string; expires_at: Date }>('SELECT user_id, expires_at FROM sessions WHERE id = $1', [id]);
    if (s && s.expires_at.getTime() > Date.now()) {
      const user = await loadUser(s.user_id);
      if (user) {
        c.set('user', user);
        c.set('sessionId', id);
      }
    } else if (s) {
      await q('DELETE FROM sessions WHERE id = $1', [id]);
    }
  }
  await next();
};

/**
 * Cross-site request forgery guard for cookie-authenticated mutations:
 * require same-origin (Origin header) and a custom header that browsers never
 * attach to cross-site form posts.
 */
export const csrfGuard: MiddlewareHandler<AppEnv> = async (c, next) => {
  const m = c.req.method;
  if (m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS') {
    if (c.req.header('x-requested-with') !== 'hub') throw forbidden('Missing request header');
    const origin = c.req.header('origin');
    if (origin) {
      const host = c.req.header('x-forwarded-host') ?? c.req.header('host');
      const allowed = new Set([config.publicOrigin, host ? `https://${host}` : '', host ? `http://${host}` : ''].filter(Boolean));
      if (!allowed.has(origin)) throw forbidden('Cross-origin request blocked');
    }
  }
  await next();
};

export function requireUser(c: Ctx): SessionUser {
  const u = c.get('user');
  if (!u) throw unauthorized();
  return u;
}

export function canAccessHotel(u: SessionUser, hotelId: string): boolean {
  return u.global || u.hotelIds.includes(hotelId);
}

/**
 * Hotel + module guard used by every admin route. Returns 404 (not 403) for
 * hotels outside the user's scope so hotel ids cannot be probed.
 */
export function requireHotelAccess(c: Ctx, hotelId: string, module: Module): SessionUser {
  const u = requireUser(c);
  if (!/^[0-9a-f-]{36}$/i.test(hotelId) || !canAccessHotel(u, hotelId)) throw notFound('Hotel not found');
  if (!roleCan(u.role, module)) throw forbidden();
  return u;
}
