#!/usr/bin/env node
/**
 * Multi-hotel load test (staging only — never against production guest data).
 *
 *   node scripts/loadtest.mjs --base http://127.0.0.1:8095 --hotels 20 --guests 40 --staff 4 --duration 120 \
 *        [--prefix load-hotel] [--order-share 0.15] [--burst 0] [--pid <server pid>] [--db postgres://…] [--out result.json]
 *
 * Guests (per hotel, all behind one hotel NAT IP like real hotel Wi-Fi):
 *   first visit: HTML + JS/CSS + published bundle + identification (room, name, phone)
 *   then loops with 3–8 s think time: menu views, analytics batches, orders
 *   (with Idempotency-Key), "my requests".
 * Staff (per hotel): poll the live queue (10 s), the new-request bell (30 s),
 *   and process orders NEW → ACCEPTED → IN_PROGRESS → READY → COMPLETED, which
 *   runs the commission engine on completion.
 * --burst N: N guests scan QR codes within the first 60 s (event / check-in rush).
 *
 * Reports requests/s, p50/p95/p99 per endpoint, error rate, server CPU/RSS
 * (from /proc when --pid is given) and database connections (when --db is given).
 */
import fs from 'node:fs';
import { parseArgs } from 'node:util';

const { values: a } = parseArgs({
  options: {
    base: { type: 'string', default: 'http://127.0.0.1:8095' },
    hotels: { type: 'string', default: '20' },
    guests: { type: 'string', default: '20' },
    staff: { type: 'string', default: '3' },
    duration: { type: 'string', default: '60' },
    prefix: { type: 'string', default: 'load-hotel' },
    'order-share': { type: 'string', default: '0.15' },
    burst: { type: 'string', default: '0' },
    'think-min': { type: 'string', default: '3' },
    'think-max': { type: 'string', default: '8' },
    pid: { type: 'string' },
    db: { type: 'string' },
    out: { type: 'string' },
    label: { type: 'string', default: 'run' },
    ramp: { type: 'string', default: '10' },
    // 'hotel': every guest of a hotel shares one NAT IP (real hotel Wi-Fi; exercises the
    // per-hotel ceiling). 'guest': one address per guest (mobile data; pure capacity runs).
    'ip-mode': { type: 'string', default: 'hotel' },
  },
});
const BASE = a.base;
const HOTELS = Number(a.hotels);
const DURATION = Number(a.duration) * 1000;
const END = Date.now() + DURATION;
const PASSWORD = 'Demo-pass-2026';
const THINK = [Number(a['think-min']) * 1000, Number(a['think-max']) * 1000];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const think = () => sleep(THINK[0] + Math.random() * (THINK[1] - THINK[0]));
const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const token = () => `lt-${crypto.randomUUID().replaceAll('-', '')}`;

// ------------------------------------------------------------------ metrics
const stats = new Map(); // name -> { lat: number[], errors: Map<status, n> }
let total = 0;
let failed = 0;
function rec(name, ms, status) {
  let s = stats.get(name);
  if (!s) stats.set(name, (s = { lat: [], errors: new Map() }));
  s.lat.push(ms);
  if (Date.now() - T0 > STEADY_AFTER) steady.push(ms);
  total++;
  if (status === 0 || status >= 500 || (status >= 400 && status !== 409 && status !== 404)) {
    failed++;
    s.errors.set(status, (s.errors.get(status) ?? 0) + 1);
  }
}
let T0 = Date.now();
const STEADY_AFTER = Number(a.ramp) * 1000 + 15_000; // after arrivals settle
const steady = [];
const pct = (xs, p) => (xs.length ? xs[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))] : null);

async function call(name, path, { method = 'GET', body, headers = {}, ip, cookie } = {}) {
  const h = { 'x-requested-with': 'hub', origin: BASE, ...headers };
  if (ip) h['x-forwarded-for'] = ip;
  if (cookie) h.cookie = cookie;
  if (body !== undefined) h['content-type'] = 'application/json';
  const t0 = performance.now();
  let status = 0;
  let res;
  try {
    res = await fetch(BASE + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30_000) });
    status = res.status;
    const text = await res.text();
    rec(name, performance.now() - t0, status);
    let json = null;
    try {
      json = text && text[0] === '{' ? JSON.parse(text) : text;
    } catch {
      json = text;
    }
    return { status, body: json, headers: res.headers };
  } catch (e) {
    rec(name, performance.now() - t0, 0);
    return { status: 0, body: null, headers: new Headers() };
  }
}

// ------------------------------------------------------------------ setup
const hotels = [];
async function setup() {
  const html = await call('page_html', `/h/${a.prefix}-01`);
  const assets = [...String(html.body).matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  for (let n = 1; n <= HOTELS; n++) {
    const slug = `${a.prefix}-${String(n).padStart(2, '0')}`;
    const b = await call('bundle', `/api/public/hotels/${slug}`);
    if (b.status !== 200) throw new Error(`hotel ${slug}: ${b.status}`);
    const outlets = b.body.catalog.outlets;
    const menus = {};
    for (const o of outlets) {
      const m = await call('menu', `/api/public/hotels/${slug}/outlets/${o.id}/menu`);
      menus[o.id] = m.body.menus.flatMap((x) => x.categories.flatMap((c) => c.items)).filter((i) => !(i.modifiers ?? []).some((g) => g.required));
    }
    hotels.push({ n, slug, id: b.body.hotel.id, outlets: outlets.map((o) => o.id), menus, assets, guestIp: `10.0.${n}.1`, staffIp: `10.1.${n}.1` });
  }
}

// ------------------------------------------------------------------ guests
async function guestSession(h, { firstVisit = true } = {}) {
  const t = token();
  const hdr = { 'x-guest-token': t };
  if (firstVisit) {
    await call('page_html', `/h/${h.slug}?room=${100 + Math.floor(Math.random() * 400)}`, { ip: h.guestIp });
    await Promise.all(h.assets.map((p) => call('static_asset', p, { ip: h.guestIp })));
    await call('bundle', `/api/public/hotels/${h.slug}`, { ip: h.guestIp });
  }
  const room = String(100 + Math.floor(Math.random() * 400));
  const guest = { type: 'IN_HOUSE', name: `Load Guest ${Math.floor(Math.random() * 1e6)}`, phone: `+9665${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`, room };
  await call('identify', `/api/public/hotels/${h.slug}/session`, { method: 'POST', body: { guest, lang: rnd(['ar', 'en']), entry: 'QR' }, headers: hdr, ip: h.guestIp });
  return { t, hdr, guest };
}

async function guestLoop(hotel) {
  const h = a['ip-mode'] === 'guest' ? { ...hotel, guestIp: `10.2.${hotel.n}.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250)}`.split('.').slice(0, 4).join('.') } : hotel;
  const s = await guestSession(h);
  while (Date.now() < END) {
    await think();
    if (Date.now() >= END) break;
    const r = Math.random();
    const share = Number(a['order-share']);
    if (r < share) {
      const outlet = rnd(h.outlets);
      const items = h.menus[outlet];
      if (!items?.length) continue;
      const lines = Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => ({ item_id: rnd(items).id, quantity: 1 + Math.floor(Math.random() * 2) }));
      const key = crypto.randomUUID();
      const body = { guest: s.guest, lang: 'en', payload: { kind: 'ORDER', outlet_id: outlet, lines, notes: '' } };
      const res = await call('order_submit', `/api/public/hotels/${h.slug}/requests`, { method: 'POST', body, headers: { ...s.hdr, 'idempotency-key': key }, ip: h.guestIp });
      // 5 % of checkouts are retried as if the network dropped the response.
      if (res.status === 201 && Math.random() < 0.05) await call('order_retry', `/api/public/hotels/${h.slug}/requests`, { method: 'POST', body, headers: { ...s.hdr, 'idempotency-key': key }, ip: h.guestIp });
    } else if (r < share + 0.35) {
      await call('menu', `/api/public/hotels/${h.slug}/outlets/${rnd(h.outlets)}/menu`, { ip: h.guestIp });
    } else if (r < share + 0.6) {
      const events = Array.from({ length: 5 }, () => ({ event: rnd(['offer_impression', 'service_view', 'menu_item_view']), target_type: 'offer', target_code: 'X1' }));
      await call('events', `/api/public/hotels/${h.slug}/events`, { method: 'POST', body: { events }, headers: s.hdr, ip: h.guestIp });
    } else if (r < share + 0.75) {
      await call('my_requests', `/api/public/hotels/${h.slug}/requests`, { headers: s.hdr, ip: h.guestIp });
    } else {
      await call('bundle', `/api/public/hotels/${h.slug}`, { ip: h.guestIp });
    }
  }
}

// ------------------------------------------------------------------ staff
async function login(email, ip) {
  const r = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'hub', origin: BASE, 'x-forwarded-for': ip }, body: JSON.stringify({ email, password: PASSWORD }) });
  const cookie = (r.headers.get('set-cookie') ?? '').split(';')[0];
  await r.text();
  if (!cookie) throw new Error(`login failed for ${email}: ${r.status}`);
  return cookie;
}

const NEXT = { NEW: 'ACCEPTED', ACCEPTED: 'IN_PROGRESS', IN_PROGRESS: 'READY', READY: 'COMPLETED' };
async function staffLoop(h, idx) {
  const cookie = await login(idx % 2 ? `fnb@${h.slug}.load` : `admin@${h.slug}.load`, h.staffIp);
  let lastBell = 0;
  let lastDash = 0;
  while (Date.now() < END) {
    const q = await call('staff_queue', `/api/admin/hotels/${h.id}/requests?status=OPEN&limit=50`, { cookie, ip: h.staffIp });
    if (Date.now() - lastBell > 30_000) {
      lastBell = Date.now();
      await call('staff_bell', `/api/admin/hotels/${h.id}/requests?status=NEW&limit=5`, { cookie, ip: h.staffIp });
    }
    if (idx === 0 && Date.now() - lastDash > 60_000) {
      lastDash = Date.now();
      await call('staff_dashboard', `/api/admin/hotels/${h.id}/analytics?days=30`, { cookie, ip: h.staffIp });
    }
    // Work the queue like a department: finish what is furthest along first
    // (READY → COMPLETED runs the commission engine), then pick up new orders.
    const open = [];
    for (const st of ['READY', 'IN_PROGRESS', 'ACCEPTED', 'NEW']) {
      if (open.length >= 4) break;
      const r = await call('staff_queue', `/api/admin/hotels/${h.id}/requests?status=${st}&limit=10`, { cookie, ip: h.staffIp });
      open.push(...(r.body?.requests ?? []).filter((x) => !String(x.reference).startsWith('SYN-')).slice(0, 4 - open.length));
    }
    for (const r of open) {
      if (Date.now() >= END) break;
      await call('staff_status', `/api/admin/hotels/${h.id}/requests/${r.id}/status`, { method: 'POST', body: { status: NEXT[r.status] }, cookie, ip: h.staffIp });
    }
    await sleep(10_000);
  }
}

// ------------------------------------------------------------------ resources
const samples = [];
let lastCpu = null;
async function sampler() {
  let pg = null;
  if (a.db) {
    const { default: PG } = await import('pg');
    pg = new PG.Client({ connectionString: a.db });
    await pg.connect();
  }
  while (Date.now() < END + 1000) {
    const s = { t: Date.now() };
    if (a.pid) {
      // One or more processes (comma-separated, e.g. cluster workers): CPU and RSS are summed.
      let ticks = 0;
      let rss = 0;
      for (const pid of a.pid.split(',')) {
        try {
          const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' ');
          ticks += Number(stat[11]) + Number(stat[12]);
          rss += (Number(fs.readFileSync(`/proc/${pid}/statm`, 'utf8').split(' ')[1]) * 4096) / 1048576;
        } catch {
          /* process gone */
        }
      }
      const now = performance.now();
      if (lastCpu) s.cpu_pct = Math.round(((ticks - lastCpu.ticks) / 100 / ((now - lastCpu.at) / 1000)) * 100);
      lastCpu = { ticks, at: now };
      s.rss_mb = Math.round(rss);
    }
    if (pg) {
      const r = await pg.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE state = 'active')::int AS active FROM pg_stat_activity WHERE datname = current_database() AND backend_type = 'client backend'`);
      s.db_conns = r.rows[0].total;
      s.db_active = r.rows[0].active - 1; // minus this sampler
    }
    samples.push(s);
    await sleep(2000);
  }
  await pg?.end();
}

// ------------------------------------------------------------------ run
async function main() {
  await setup();
  total = 0;
  failed = 0;
  stats.clear();
  steady.length = 0;
  T0 = Date.now();
  const t0 = Date.now();
  const tasks = [sampler()];
  for (const h of hotels) {
    for (let i = 0; i < Number(a.guests); i++) tasks.push(sleep(Math.random() * Number(a.ramp) * 1000).then(() => guestLoop(h)));
    for (let i = 0; i < Number(a.staff); i++) tasks.push(sleep(Math.random() * 5_000).then(() => staffLoop(h, i)));
  }
  const burst = Number(a.burst);
  for (let i = 0; i < burst; i++) {
    const h = hotels[i % hotels.length];
    tasks.push(sleep(Math.random() * 60_000).then(() => guestSession(h)));
  }
  await Promise.all(tasks);
  const secs = (Date.now() - t0) / 1000;
  const endpoints = {};
  const all = [];
  for (const [name, s] of [...stats].sort()) {
    const xs = s.lat.sort((x, y) => x - y);
    all.push(...xs);
    endpoints[name] = { n: xs.length, rps: +(xs.length / secs).toFixed(1), p50: +pct(xs, 50).toFixed(1), p95: +pct(xs, 95).toFixed(1), p99: +pct(xs, 99).toFixed(1), max: +xs.at(-1).toFixed(1), errors: Object.fromEntries(s.errors) };
  }
  all.sort((x, y) => x - y);
  const cpu = samples.map((s) => s.cpu_pct).filter((x) => x != null);
  const rss = samples.map((s) => s.rss_mb).filter((x) => x != null);
  const conns = samples.map((s) => s.db_conns).filter((x) => x != null);
  const active = samples.map((s) => s.db_active).filter((x) => x != null);
  const result = {
    label: a.label,
    config: { ip_mode: a['ip-mode'], ramp_s: Number(a.ramp), hotels: HOTELS, guests_per_hotel: Number(a.guests), staff_per_hotel: Number(a.staff), burst, duration_s: Math.round(secs), order_share: Number(a['order-share']), think_s: THINK.map((x) => x / 1000) },
    concurrent_users: HOTELS * (Number(a.guests) + Number(a.staff)),
    requests: total,
    rps: +(total / secs).toFixed(1),
    error_rate_pct: +((failed / Math.max(1, total)) * 100).toFixed(3),
    latency_ms: { p50: +pct(all, 50).toFixed(1), p95: +pct(all, 95).toFixed(1), p99: +pct(all, 99).toFixed(1), max: +all.at(-1).toFixed(1) },
    steady_state_latency_ms: (() => {
      const xs = steady.sort((x, y) => x - y);
      return xs.length ? { n: xs.length, p50: +pct(xs, 50).toFixed(1), p95: +pct(xs, 95).toFixed(1), p99: +pct(xs, 99).toFixed(1) } : null;
    })(),
    server: cpu.length ? { cpu_avg_pct: Math.round(cpu.reduce((x, y) => x + y, 0) / cpu.length), cpu_max_pct: Math.max(...cpu), rss_max_mb: Math.max(...rss) } : null,
    db: conns.length ? { conns_max: Math.max(...conns), active_max: Math.max(...active) } : null,
    endpoints,
  };
  console.log(JSON.stringify(result, null, 2));
  if (a.out) fs.writeFileSync(a.out, JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
