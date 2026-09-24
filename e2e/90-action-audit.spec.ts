import { expect, test, type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import { PASSWORD, SLUG, enterAsGuest } from './helpers';

/**
 * Functional action audit. For every role, every screen it can reach is
 * opened and every visible interactive control in the main area is actually
 * triggered. A control "works" when it produces an observable effect: a
 * navigation, an API call, a dialog/drawer, a download or a DOM change.
 * Results are written to test-results/action-audit.json (docs/UX-AUDIT.md is
 * generated from it) and the run fails on dead, broken or forbidden controls.
 *
 * Runs last: it really clicks (toggles, reorders), on the disposable E2E DB.
 */
test.describe.configure({ mode: 'serial' });
test.use({ viewport: { width: 1440, height: 900 } });

type Status = 'WORKING' | 'NO_EFFECT' | 'BROKEN' | 'WRONG_PERMISSION' | 'UNREACHABLE' | 'DISABLED' | 'SKIPPED';
interface ActionResult {
  role: string;
  route: string;
  control: string;
  kind: string;
  status: Status;
  effect?: string;
  detail?: string;
}
interface RouteResult {
  role: string;
  route: string;
  heading: string;
  loadErrors: string[];
  actions: number;
}

const OUT = 'test-results/action-audit.json';
const results: ActionResult[] = [];
const routes: RouteResult[] = [];
/** Never triggered by the crawler (ends the session or leaves the app). */
const SKIP = /^(sign out|log out|skip to content|open guest site)/i;

const ROLES: { role: string; email: string; deep: boolean }[] = [
  { role: 'SUPER_ADMIN', email: 'super@demo.hotelhub.local', deep: false },
  { role: 'HOTEL_ADMIN', email: 'admin@demo.hotelhub.local', deep: true },
  { role: 'PLATFORM_FINANCE', email: 'finance@demo.hotelhub.local', deep: true },
  { role: 'HOTEL_FINANCE', email: 'hotelfinance@demo.hotelhub.local', deep: true },
  { role: 'MANAGEMENT', email: 'management@demo.hotelhub.local', deep: false },
  { role: 'FNB', email: 'fnb@demo.hotelhub.local', deep: false },
  { role: 'HOUSEKEEPING', email: 'housekeeping@demo.hotelhub.local', deep: false },
  { role: 'MAINTENANCE', email: 'maintenance@demo.hotelhub.local', deep: false },
  { role: 'FRONT_OFFICE', email: 'frontoffice@demo.hotelhub.local', deep: false },
  { role: 'LAUNDRY', email: 'laundry@demo.hotelhub.local', deep: false },
  { role: 'SPA', email: 'spa@demo.hotelhub.local', deep: false },
];

function save() {
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), routes, results }, null, 2));
}

/** Watches API responses: forbidden/failed calls during a load or a click. */
function watch(page: Page) {
  const bad: string[] = [];
  let api = 0;
  const onReq = (r: { url(): string }) => {
    if (r.url().includes('/api/')) api++;
  };
  const onRes = (r: { url(): string; status(): number; request(): { method(): string } }) => {
    if (r.url().includes('/api/') && r.status() >= 400 && r.status() !== 401) bad.push(`${r.request().method()} ${new URL(r.url()).pathname} → ${r.status()}`);
  };
  const onErr = (e: Error) => bad.push(`pageerror: ${e.message}`);
  page.on('request', onReq);
  page.on('response', onRes);
  page.on('pageerror', onErr);
  return {
    bad,
    get api() {
      return api;
    },
    stop() {
      page.off('request', onReq);
      page.off('response', onRes);
      page.off('pageerror', onErr);
    },
  };
}

async function login(page: Page, email: string) {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /Sign in|تسجيل الدخول/ }).click();
  await page.waitForURL((u) => !u.pathname.endsWith('/login'));
  await page.locator('h1').first().waitFor();
}

/** In-flight API calls per page (networkidle never settles: the admin polls). */
const inflight = new WeakMap<Page, number>();
function track(page: Page) {
  inflight.set(page, 0);
  const done = (r: { url(): string }) => r.url().includes('/api/') && inflight.set(page, Math.max(0, (inflight.get(page) ?? 1) - 1));
  page.on('request', (r) => r.url().includes('/api/') && inflight.set(page, (inflight.get(page) ?? 0) + 1));
  page.on('requestfinished', done);
  page.on('requestfailed', done);
}
async function settle(page: Page) {
  await page.waitForTimeout(200);
  for (let i = 0; i < 30 && (inflight.get(page) ?? 0) > 0; i++) await page.waitForTimeout(100);
  await page.waitForTimeout(100);
}

/** Record-specific labels ("Edit Lobby Café") collapse to one family ("Edit …"). */
function family(name: string) {
  const words = name.split(' ');
  return words.length > 2 ? `${words[0]} ${words[1] ?? ''}`.trim() : name;
}

async function closeOverlays(page: Page) {
  for (let i = 0; i < 3; i++) {
    if (!(await page.locator('[role="dialog"], [role="menu"]').count())) return;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
}

/**
 * Clicks every control of the current screen (outside dialogs), one by one,
 * restoring the screen between clicks.
 */
async function crawl(page: Page, role: string, route: string, scope: string) {
  const perFamily = new Map<string, number>();
  const done = new Set<string>();
  for (let guard = 0; guard < 90; guard++) {
    await closeOverlays(page);
    if (new URL(page.url()).pathname + new URL(page.url()).search !== route) {
      await page.goto(route);
      await settle(page);
    }
    const SEL = `${scope} :is(button, a[href], [role="button"], [role="tab"], [role="radio"], summary)`;
    // One round-trip: describe every visible control outside dialogs.
    const list = await page.evaluate((sel) => {
      const out: { i: number; name: string; tag: string }[] = [];
      document.querySelectorAll(sel).forEach((el, i) => {
        const h = el as HTMLElement;
        if (h.closest('[role="dialog"]') || !(h.offsetWidth || h.offsetHeight || h.getClientRects().length)) return;
        const name = (h.getAttribute('aria-label') || h.innerText || h.getAttribute('title') || h.getAttribute('href') || '').replace(/\s+/g, ' ').trim().slice(0, 80);
        out.push({ i, name, tag: h.getAttribute('role') || h.tagName.toLowerCase() });
      });
      return out;
    }, SEL);
    let target: Locator | null = null;
    let label = '';
    let kind = '';
    for (const c of list) {
      const key = `${c.tag}|${c.name}`;
      if (done.has(key)) continue;
      done.add(key);
      const fam = `${c.tag}|${family(c.name)}`;
      if ((perFamily.get(fam) ?? 0) >= 2) continue;
      perFamily.set(fam, (perFamily.get(fam) ?? 0) + 1);
      target = page.locator(SEL).nth(c.i);
      label = c.name;
      kind = c.tag;
      break;
    }
    if (!target) return;
    const rec: ActionResult = { role, route, control: label || '(no accessible name)', kind, status: 'WORKING' };
    results.push(rec);
    if (!label) {
      rec.status = 'NO_EFFECT';
      rec.detail = 'control has no accessible name';
    }
    if (SKIP.test(label)) {
      rec.status = 'SKIPPED';
      continue;
    }
    if (kind === 'a') {
      const href = (await target.getAttribute('href')) ?? '';
      if (!href || href === '#' || href.startsWith('javascript:')) {
        rec.status = 'NO_EFFECT';
        rec.detail = `dead link href="${href}"`;
        continue;
      }
      if (/^(https?:|tel:|mailto:|whatsapp:)/.test(href) && !href.startsWith(new URL(page.url()).origin)) {
        rec.effect = `external ${href.slice(0, 60)}`;
        continue;
      }
    }
    if (await target.isDisabled().catch(() => false)) {
      rec.status = 'DISABLED';
      continue;
    }
    // Already-selected tabs, filters and segments legitimately do nothing when clicked again.
    const selected = await target.evaluate((el) =>
      ['aria-pressed', 'aria-checked', 'aria-selected', 'aria-current'].some((a) => {
        const v = el.getAttribute(a);
        return v === 'true' || v === 'page';
      })
    );
    const w = watch(page);
    await page.evaluate(() => {
      const g = window as unknown as { __mut: number; __obs?: MutationObserver };
      g.__mut = 0;
      g.__obs?.disconnect();
      g.__obs = new MutationObserver((list) => {
        for (const m of list) if (!(m.type === 'attributes' && (m.attributeName === 'style' || m.attributeName === 'data-focus-visible'))) g.__mut++;
      });
      g.__obs.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    });
    const before = page.url();
    let download = false;
    const onDl = () => (download = true);
    page.on('download', onDl);
    let chooser = false;
    const onChooser = () => (chooser = true);
    page.on('filechooser', onChooser);
    const popup = page.context().waitForEvent('page', { timeout: 800 }).catch(() => null);
    try {
      await target.click({ timeout: 2500 });
    } catch (e) {
      rec.status = 'UNREACHABLE';
      rec.detail = String((e as Error).message).split('\n')[0].slice(0, 160);
      w.stop();
      page.off('download', onDl);
      page.off('filechooser', onChooser);
      continue;
    }
    await settle(page);
    const newPage = await popup;
    const mut = await page.evaluate(() => (window as unknown as { __mut: number }).__mut);
    const dialog = await page.locator('[role="dialog"]:visible, [role="menu"]:visible').count();
    w.stop();
    page.off('download', onDl);
    page.off('filechooser', onChooser);
    if (newPage) await newPage.close();
    const effects = [page.url() !== before && 'navigation', w.api > 0 && `api×${w.api}`, dialog > 0 && 'dialog', download && 'download', chooser && 'file chooser', newPage && 'new tab', mut > 0 && `dom×${mut}`, !mut && selected && 'already selected'].filter(Boolean);
    rec.effect = effects.join(', ');
    const forbidden = w.bad.filter((b) => / → 403$/.test(b));
    const failed = w.bad.filter((b) => !/ → (403|404|409|422)$/.test(b));
    if (forbidden.length) (rec.status = 'WRONG_PERMISSION'), (rec.detail = forbidden.join('; '));
    else if (failed.length) (rec.status = 'BROKEN'), (rec.detail = failed.join('; '));
    else if (!effects.length) rec.status = 'NO_EFFECT';
    else if (w.bad.length) rec.detail = w.bad.join('; ');
  }
}

async function visit(page: Page, role: string, route: string, deep: boolean, scope = '#admin-main') {
  const w = watch(page);
  await page.goto(route);
  await settle(page);
  const heading = (await page.locator('h1').first().innerText().catch(() => '')).trim();
  w.stop();
  const notFound = /Page not found|not found|غير موجود/i.test(heading);
  routes.push({ role, route, heading, loadErrors: [...w.bad, ...(notFound ? ['page not found'] : [])], actions: 0 });
  if (deep && !notFound) {
    const start = results.length;
    await crawl(page, role, new URL(page.url()).pathname + new URL(page.url()).search, scope);
    routes[routes.length - 1].actions = results.length - start;
  }
  save();
}

for (const r of ROLES) {
  test(`action audit · ${r.role}`, async ({ page }) => {
    test.setTimeout(20 * 60_000);
    track(page);
    await login(page, r.email);
    const landing = page.url();
    const hid = /\/admin\/h\/([0-9a-f-]{36})/.exec(landing)?.[1] ?? /\/admin\/h\/([0-9a-f-]{36})/.exec((await page.locator('a[href*="/admin/h/"]').first().getAttribute('href').catch(() => '')) ?? '')?.[1];
    let paths: string[] = [];
    if (r.role === 'PLATFORM_FINANCE' || landing.includes('/admin/platform')) {
      paths = await page.locator('nav[aria-label="Admin"] a[href^="/admin/platform"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
      if (!paths.length) paths = ['/admin/platform/dashboard'];
    }
    if (hid || r.role === 'SUPER_ADMIN') {
      const target = hid ?? (await page.evaluate(() => fetch('/api/auth/me').then((x) => x.json()).then((m) => m.hotels?.[0]?.id)));
      await page.goto(`/admin/h/${target}/dashboard`);
      await settle(page);
      paths.push(...(await page.locator('nav[aria-label="Admin"] a').evaluateAll((as) => as.map((a) => a.getAttribute('href')!).filter((h) => h.startsWith('/admin/')))));
    }
    paths = [...new Set(paths)];
    expect(paths.length, 'the role reaches at least one screen').toBeGreaterThan(0);
    for (const p of paths) await visit(page, r.role, p, r.deep);
  });
}

test('action audit · GUEST', async ({ page }) => {
  test.setTimeout(20 * 60_000);
  track(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await enterAsGuest(page, { lang: 'en' });
  const base = `/h/${SLUG}`;
  const bundle = await (await page.request.get(`/api/public/hotels/${SLUG}`)).json();
  const outlet = bundle.catalog.outlets[0]?.id;
  for (const p of ['', '/dining', outlet && `/dining/${outlet}`, '/room-services', '/spa', '/laundry', '/services', '/info', '/offers', '/feedback', '/requests'].filter(Boolean) as string[]) {
    await visit(page, 'GUEST', `${base}${p}`, true, 'main#main');
  }
});

test.afterAll(() => {
  save();
  const bad = results.filter((r) => ['NO_EFFECT', 'BROKEN', 'WRONG_PERMISSION'].includes(r.status));
  const loadBad = routes.filter((r) => r.loadErrors.length);
  console.log(`action audit: ${results.length} controls on ${routes.length} screens; ${bad.length} problems; ${loadBad.length} screens with load errors`);
});

test('action audit · no dead, broken or forbidden controls', () => {
  const bad = results.filter((r) => ['NO_EFFECT', 'BROKEN', 'WRONG_PERMISSION'].includes(r.status));
  const loadBad = routes.filter((r) => r.loadErrors.length);
  expect(bad.map((b) => `${b.role} ${b.route} · ${b.control} · ${b.status} ${b.detail ?? ''}`)).toEqual([]);
  expect(loadBad.map((r) => `${r.role} ${r.route} · ${r.loadErrors.join('; ')}`)).toEqual([]);
});
