import type { Context } from 'hono';
import type { Role } from '../shared/domain';
import { config } from './config';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** Hotel ids the user may access. SUPER_ADMIN is global (empty list, `global` true). */
  hotelIds: string[];
  global: boolean;
}

export type AppEnv = {
  Variables: {
    user: SessionUser | null;
    sessionId: string | null;
    requestId: string;
  };
};

export type Ctx = Context<AppEnv>;

export function clientIp(c: Ctx): string {
  // Only honour X-Forwarded-For behind a trusted reverse proxy; otherwise it is client-spoofable.
  const fwd = c.req.header('x-forwarded-for');
  if (fwd && config.trustProxy) return fwd.split(',')[0].trim();
  // @hono/node-server exposes the socket via env.incoming
  const incoming = (c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined)?.incoming;
  return incoming?.socket?.remoteAddress ?? 'unknown';
}
