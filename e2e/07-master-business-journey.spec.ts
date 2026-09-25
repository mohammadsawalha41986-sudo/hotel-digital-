import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import sharp from 'sharp';
import { PASSWORD } from './helpers';

/**
 * Master business journey, end to end on one brand-new hotel:
 *
 *   create hotel → logo → auto theme → departments → dining with modifiers →
 *   room service → publish → QR → guest by room QR → identification → item →
 *   modifiers → cart → notes → checkout → reference → department receives →
 *   accept → in progress → ready → complete → financial snapshot + ledger →
 *   platform commission → settlement → review → approval (another person) →
 *   hotel acknowledgement.
 *
 * The decisive steps run through the real UI; catalogue rows and the
 * commission rule are created through the same admin API the UI uses (their
 * screens are covered by 02-admin-simulation and 04-commerce). A second hotel
 * checks isolation at the end.
 */
test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

const SLUG = 'oasis-grand-e2e';
const ORIGIN = 'http://localhost:8090';
const ADMIN = { email: 'admin@oasis-grand.test', password: 'Oasis-Admin-2026!' };
const FNB = { email: 'fnb@oasis-grand.test', password: 'Oasis-Fnb-2026!' };
const FIN = { email: 'finance@oasis-grand.test', password: 'Oasis-Finance-2026!' };
const PLATFORM_FINANCE = 'finance@demo.hotelhub.local';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date());

let hid = '';
let reference = '';
let orderId = '';
let settlementId = '';
let themePrimary = '';

async function uiLogin(browser: Browser, email: string, password = PASSWORD): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/admin/login'));
  return page;
}

/** Same-origin JSON call with the page's session (as the admin UI does). */
async function api(req: APIRequestContext, method: string, path: string, data?: unknown) {
  const r = await req.fetch(`/api${path}`, { method, headers: { 'x-requested-with': 'hub', origin: ORIGIN, 'content-type': 'application/json' }, data: data === undefined ? undefined : JSON.stringify(data) });
  const body = await r.json().catch(() => null);
  expect(r.status(), `${method} ${path}: ${JSON.stringify(body)}`).toBeLessThan(300);
  return body;
}

test('super admin creates a hotel; logo drives an automatic theme', async ({ browser }) => {
  const sa = await uiLogin(browser, 'super@demo.hotelhub.local');
  await sa.goto('/admin/hotels');
  await sa.getByRole('button', { name: 'New hotel' }).click();
  await sa.getByLabel('Name (English)').fill('Oasis Grand');
  await sa.getByLabel('Name (Arabic)').fill('واحة جراند');
  await sa.getByLabel('Web address').fill(SLUG);
  await sa.getByRole('button', { name: 'Create hotel' }).click();
  await expect(sa.getByText('Hotel created (offline until you publish it)')).toBeVisible();
  hid = (await api(sa.request, 'GET', '/admin/platform/hotels')).hotels.find((h: { slug: string }) => h.slug === SLUG).id;

  // Users for this hotel (admin, F&B department, hotel finance).
  await api(sa.request, 'POST', `/admin/hotels/${hid}/users`, { email: ADMIN.email, name: 'Oasis Admin', role: 'HOTEL_ADMIN', password: ADMIN.password });
  await api(sa.request, 'POST', `/admin/hotels/${hid}/users`, { email: FNB.email, name: 'Oasis Kitchen', role: 'FNB', password: FNB.password });
  await api(sa.request, 'POST', `/admin/hotels/${hid}/users`, { email: FIN.email, name: 'Oasis Finance', role: 'HOTEL_FINANCE', password: FIN.password });
  await sa.context().close();

  // The hotel's own admin uploads the logo and applies the generated theme.
  const admin = await uiLogin(browser, ADMIN.email, ADMIN.password);
  await admin.goto(`/admin/h/${hid}/branding`);
  const logo = await sharp({ create: { width: 320, height: 120, channels: 3, background: '#0E6B5C' } })
    .composite([{ input: await sharp({ create: { width: 120, height: 120, channels: 3, background: '#D4A017' } }).png().toBuffer(), left: 200, top: 0 }])
    .png()
    .toBuffer();
  const chooser = admin.waitForEvent('filechooser');
  await admin.getByRole('button', { name: 'Upload image', exact: true }).first().click();
  await (await chooser).setFiles({ name: 'oasis-logo.png', mimeType: 'image/png', buffer: logo });
  await expect(admin.locator('#b-logo')).toHaveValue(/^\/media\//);
  await admin.getByRole('button', { name: 'Analyse logo' }).click();
  await admin.getByRole('button', { name: 'Apply theme' }).click();
  await admin.getByRole('button', { name: 'Save branding' }).click();
  await expect(admin.getByText('Branding saved')).toBeVisible();
  const branding = (await api(admin.request, 'GET', `/admin/hotels/${hid}`)).branding;
  expect(branding.theme.source).toBe('logo');
  themePrimary = String(branding.colors.primary).toLowerCase();
  await admin.context().close();
});

test('hotel admin configures departments, dining with modifiers, a room service, and publishes', async ({ browser }) => {
  const admin = await uiLogin(browser, ADMIN.email, ADMIN.password);
  const r = admin.request;
  const depts = (await api(r, 'GET', `/admin/hotels/${hid}/departments`)).departments;
  await api(r, 'PUT', `/admin/hotels/${hid}/departments`, {
    departments: depts.map((d: Record<string, unknown>) => ({ ...d, whatsapp: d.code === 'FNB' ? '+966500000777' : d.whatsapp })),
  });
  const outlet = await api(r, 'POST', `/admin/hotels/${hid}/entities/outlets`, { name_en: 'Oasis Room Dining', name_ar: 'الطعام في الغرف', type: 'room_service', status_override: 'open' });
  const menu = await api(r, 'POST', `/admin/hotels/${hid}/entities/menus`, { name_en: 'All day', name_ar: 'طوال اليوم', parent_id: outlet.id });
  const cat = await api(r, 'POST', `/admin/hotels/${hid}/entities/menu_categories`, { name_en: 'Coffee', name_ar: 'القهوة', parent_id: menu.id });
  await api(r, 'POST', `/admin/hotels/${hid}/entities/menu_items`, {
    name_en: 'Signature latte',
    name_ar: 'لاتيه مميز',
    price: 30,
    parent_id: cat.id,
    badges: ['best_seller'],
    modifiers: [
      { id: 'size', kind: 'size', name_en: 'Size', name_ar: 'الحجم', min: 1, max: 1, options: [{ id: 'regular', name_en: 'Regular', price: 0 }, { id: 'large', name_en: 'Large', price: 6 }] },
      { id: 'extras', kind: 'addon', name_en: 'Extras', name_ar: 'إضافات', min: 0, max: 2, options: [{ id: 'shot', name_en: 'Extra shot', price: 4 }, { id: 'oat', name_en: 'Oat milk', price: 3 }] },
    ],
  });
  await api(r, 'POST', `/admin/hotels/${hid}/entities/room_services`, { name_en: 'Extra towels', name_ar: 'مناشف إضافية', category: 'housekeeping' });

  // Publish through the UI (draft → live) and take the hotel online.
  await admin.goto(`/admin/h/${hid}/dashboard`);
  await admin.getByRole('button', { name: /^Publish updates/ }).click();
  await admin.getByRole('dialog').getByRole('button', { name: 'Publish now' }).click();
  await expect(admin.getByText(/^Published version \d+ — guests now see these changes/)).toBeVisible();
  await api(r, 'POST', `/admin/hotels/${hid}/publication`, { published: true });

  // QR: a room-specific link carries only the hotel slug and room number.
  await admin.goto(`/admin/h/${hid}/qr`);
  await expect(admin.getByRole('heading', { level: 1, name: 'QR codes' })).toBeVisible();
  await admin.getByRole('radio', { name: 'Room' }).click();
  await admin.getByLabel('Room number').fill('1203');
  const qrUrl = (await admin.getByTestId('qr-url').textContent())!.trim();
  // Only the hotel slug and the room: no ids, tokens or personal data in the code.
  expect(new URL(qrUrl).pathname).toBe(`/h/${SLUG}`);
  expect([...new URL(qrUrl).searchParams.keys()]).toEqual(['room']);
  expect(new URL(qrUrl).searchParams.get('room')).toBe('1203');
  await admin.context().close();
});

test('platform finance sets a 7.5% commission rule for the new hotel', async ({ browser }) => {
  const pf = await uiLogin(browser, PLATFORM_FINANCE);
  const ag = await api(pf.request, 'POST', '/admin/platform/agreements', { hotel_id: hid, name: 'Oasis Grand — standard' });
  await api(pf.request, 'POST', `/admin/platform/agreements/${ag.id}/rules`, {
    scope_level: 'HOTEL', commission_type: 'PERCENTAGE', rate_bps: 750, basis: 'GROSS_INCL_VAT', tax_treatment: 'NOT_APPLICABLE', effective_from: new Date(Date.now() - 60_000).toISOString(),
  });
  await api(pf.request, 'PUT', `/admin/platform/hotels/${hid}/commercial`, { hotel_finance_access: 'SETTLEMENTS' });
  await pf.context().close();
});

test('guest scans the room QR, customises an item, checks out with notes and gets a reference', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`/h/${SLUG}?room=1203`);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  // The room comes from the QR code; only name and phone are asked.
  await page.getByLabel('Full name').fill('Omar Khalid');
  await page.getByLabel('Mobile number').fill('0551112233');
  await page.getByRole('button', { name: 'Start exploring' }).click();
  await expect(page.locator('main#main')).toBeVisible();
  // The generated theme reached the guest site.
  const primary = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--c-primary').trim().toLowerCase());
  expect(primary).toBe(themePrimary);

  await page.goto(`/h/${SLUG}/dining`);
  await page.getByRole('link', { name: /Oasis Room Dining/ }).first().click();
  await page.getByRole('button', { name: /Signature latte/ }).first().click();
  await page.getByText('Large', { exact: true }).click();
  await page.getByText('Extra shot', { exact: true }).click();
  await page.getByTestId('add-to-order').click();
  await page.getByRole('button', { name: /View order/ }).click();
  await page.getByLabel(/Notes for the kitchen/).fill('Please knock gently');
  await page.getByRole('button', { name: /^Place order/ }).click();
  const ref = page.getByTestId('request-reference');
  await expect(ref).toBeVisible();
  reference = (await ref.textContent())!.trim();
  expect(reference).toMatch(/^ORD-/);
  await ctx.close();
});

test('the F&B department receives it and works it through every status', async ({ browser }) => {
  const fnb = await uiLogin(browser, FNB.email, FNB.password);
  await fnb.getByRole('link', { name: 'Requests' }).click();
  await fnb.getByRole('button', { name: new RegExp(reference) }).click();
  const drawer = fnb.getByRole('dialog');
  await expect(drawer.getByText('Room 1203').or(drawer.getByText('1203')).first()).toBeVisible();
  await expect(drawer.getByText('Please knock gently')).toBeVisible();
  for (const [action, status] of [['Accept', 'Accepted'], ['Start', 'In progress'], ['Mark ready', 'Ready'], ['Complete', 'Completed']]) {
    await drawer.getByRole('button', { name: action, exact: true }).click();
    await expect(drawer.getByText(status, { exact: true }).first()).toBeVisible();
  }
  const list = await api(fnb.request, 'GET', `/admin/hotels/${hid}/requests?status=ALL&limit=10`);
  orderId = list.requests.find((x: { reference: string }) => x.reference === reference).id;
  const detail = await api(fnb.request, 'GET', `/admin/hotels/${hid}/requests/${orderId}`);
  const statuses = detail.events.map((e: { to_status: string | null }) => e.to_status).filter(Boolean);
  expect(statuses).toEqual(expect.arrayContaining(['NEW', 'ACCEPTED', 'IN_PROGRESS', 'READY', 'COMPLETED']));
  await fnb.context().close();
});

test('completion locked a financial snapshot and a 7.5% commission ledger entry', async ({ browser }) => {
  const pf = await uiLogin(browser, PLATFORM_FINANCE);
  const d = await api(pf.request, 'GET', `/admin/platform/orders/${orderId}`);
  expect(d.order.total).toBe(40);
  expect(d.snapshot.rate_bps).toBe(750);
  expect(d.snapshot.commission_minor).toBe(300); // 7.5 % of SAR 40.00
  expect(d.ledger).toHaveLength(1);
  expect(d.ledger[0].entry_no).toMatch(/^LE-OASISGRA/);
  await pf.context().close();
});

test('settlement: created and reviewed by platform finance, approved by another person', async ({ browser }) => {
  const pf = await uiLogin(browser, PLATFORM_FINANCE);
  const s = await api(pf.request, 'POST', '/admin/platform/settlements', { hotel_id: hid, period_type: 'CUSTOM', period_start: today(), period_end: today() });
  settlementId = s.id ?? s.settlement?.id;
  const detail = await api(pf.request, 'GET', `/admin/platform/settlements/${settlementId}`);
  expect(detail.settlement.commission_minor).toBe(300);
  expect(detail.settlement.gross_minor).toBe(4000);
  await api(pf.request, 'POST', `/admin/platform/settlements/${settlementId}/status`, { status: 'REVIEWED' });
  const self = await pf.request.post(`/api/admin/platform/settlements/${settlementId}/status`, { headers: { 'x-requested-with': 'hub', origin: ORIGIN }, data: { status: 'APPROVED' } });
  expect(self.status(), 'maker–checker').toBe(409);
  await pf.context().close();
  const sa = await uiLogin(browser, 'super@demo.hotelhub.local');
  await api(sa.request, 'POST', `/admin/platform/settlements/${settlementId}/status`, { status: 'APPROVED' });
  await sa.context().close();
});

test('hotel finance reviews the statement and acknowledges it in the UI', async ({ browser }) => {
  const fin = await uiLogin(browser, FIN.email, FIN.password);
  await fin.getByRole('link', { name: 'Finance' }).click();
  await expect(fin.getByText('Needs your acknowledgement')).toBeVisible();
  await fin.getByRole('button', { name: /^STL-OASISGRA/ }).click();
  const sheet = fin.getByRole('dialog');
  await expect(sheet.getByText(reference)).toBeVisible();
  await sheet.getByLabel('Note for the platform (optional)').fill('Matches our POS');
  await sheet.getByRole('button', { name: 'Acknowledge settlement' }).click();
  await expect(sheet.getByText(/Acknowledged by the hotel: Oasis Finance/)).toBeVisible();
  await fin.screenshot({ path: 'docs/screenshots/hotel-settlement-acknowledged.png' });
  await fin.context().close();
});

test('isolation: another hotel sees none of it', async ({ browser }) => {
  const other = await uiLogin(browser, 'harbour-admin@demo.hotelhub.local');
  for (const p of [`/api/admin/hotels/${hid}/requests`, `/api/admin/hotels/${hid}/requests/${orderId}`, `/api/admin/hotels/${hid}/finance/settlements/${settlementId}`]) {
    expect((await other.request.get(p)).status(), p).toBe(404);
  }
  await other.context().close();
});
