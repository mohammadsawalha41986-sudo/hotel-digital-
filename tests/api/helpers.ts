/**
 * Integration test harness: a real PostgreSQL database (DATABASE_URL_TEST),
 * reset and seeded once per test file, exercised through the real Hono app.
 */
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? 'postgres://hub:hub@localhost:5432/hotelhub_test';
process.env.LOG_SILENT = '1';
process.env.DISABLE_RATE_LIMIT = '1';
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR_TEST ?? './.test-uploads';
process.env.NODE_ENV = 'test';

import type { Hono } from 'hono';

const db = await import('../../server/db');
const { createApp } = await import('../../server/app');
const { seedSwissFlora } = await import('../../server/seed/swissflora');
const { seedDemoCatalog, seedDemoUsers, seedIsolationHotel, DEMO_PASSWORD } = await import('../../server/seed/demo');
const { ensurePublications } = await import('../../server/services/publish');

export const { pool, q, one, tx } = db;
export { DEMO_PASSWORD };

let app: Hono;
export const ids = { royal: '', harbour: '' };

export async function setup() {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await db.migrate();
  await tx(async (c) => {
    ids.royal = (await seedSwissFlora(c)).id;
    await seedDemoCatalog(c, ids.royal);
    ids.harbour = await seedIsolationHotel(c);
    await seedDemoUsers(c, ids.royal, ids.harbour);
    await ensurePublications(c);
  });
  app = createApp() as unknown as Hono;
}

export async function teardown() {
  await pool.end();
}

export interface Res<T = any> {
  status: number;
  body: T;
  headers: Headers;
}

/** Minimal cookie-aware client for the app (no network). */
export class Client {
  cookie = '';
  constructor(public guestToken = `test-guest-token-${Math.random().toString(36).slice(2)}-xxxxxxxx`) {}

  async req<T = any>(method: string, path: string, body?: unknown, extra: Record<string, string> = {}): Promise<Res<T>> {
    const headers: Record<string, string> = { 'x-requested-with': 'hub', 'x-guest-token': this.guestToken, host: 'localhost', ...extra };
    if (this.cookie) headers.cookie = this.cookie;
    let payload: BodyInit | undefined;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) {
      headers['content-type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const res = await app.request(`/api${path}`, { method, headers, body: payload });
    const set = res.headers.get('set-cookie');
    if (set) this.cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* non-JSON */
    }
    return { status: res.status, body: parsed as T, headers: res.headers };
  }
  get<T = any>(p: string, extra?: Record<string, string>) {
    return this.req<T>('GET', p, undefined, extra);
  }
  post<T = any>(p: string, b?: unknown, extra?: Record<string, string>) {
    return this.req<T>('POST', p, b ?? {}, extra);
  }
  put<T = any>(p: string, b?: unknown) {
    return this.req<T>('PUT', p, b ?? {});
  }
  patch<T = any>(p: string, b?: unknown) {
    return this.req<T>('PATCH', p, b ?? {});
  }
  del<T = any>(p: string) {
    return this.req<T>('DELETE', p);
  }
}

export async function login(email: string, password = DEMO_PASSWORD) {
  const c = new Client();
  const r = await c.post('/auth/login', { email, password });
  if (r.status !== 200) throw new Error(`login ${email} failed: ${r.status} ${JSON.stringify(r.body)}`);
  return c;
}

export const users = {
  superAdmin: 'super@demo.hotelhub.local',
  admin: 'admin@demo.hotelhub.local',
  management: 'management@demo.hotelhub.local',
  fnb: 'fnb@demo.hotelhub.local',
  housekeeping: 'housekeeping@demo.hotelhub.local',
  maintenance: 'maintenance@demo.hotelhub.local',
  frontOffice: 'frontoffice@demo.hotelhub.local',
  laundry: 'laundry@demo.hotelhub.local',
  spa: 'spa@demo.hotelhub.local',
  harbourAdmin: 'harbour-admin@demo.hotelhub.local',
};

export const guest = (room = '1204', type: 'IN_HOUSE' | 'EXTERNAL' = 'IN_HOUSE') => ({ type, name: 'Test Guest', phone: '+966555000111', room: type === 'IN_HOUSE' ? room : '' });

export async function bundle(slug = 'swiss-flora-royal', c = new Client()) {
  const r = await c.get(`/public/hotels/${slug}`);
  if (r.status !== 200) throw new Error(`bundle ${r.status}`);
  return r.body;
}

export async function outletByName(name: string, slug = 'swiss-flora-royal') {
  const b = await bundle(slug);
  return b.catalog.outlets.find((o: any) => o.name_en === name);
}

export async function menuItems(outletId: string, slug = 'swiss-flora-royal') {
  const r = await new Client().get(`/public/hotels/${slug}/outlets/${outletId}/menu`);
  return r.body.menus.flatMap((m: any) => m.categories.flatMap((c: any) => c.items));
}

/** Publishes the hotel's current draft (staff edits reach guests only after this). */
export async function publish(client: Client, hotelId = ids.royal) {
  const r = await client.post(`/admin/hotels/${hotelId}/publish`, { note: 'test' });
  if (r.status !== 200) throw new Error(`publish failed: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}
