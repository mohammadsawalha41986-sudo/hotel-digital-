import { expect, test, type Browser, type Page } from '@playwright/test';
import { PASSWORD, SLUG, enterAsGuest, expectAccessibleNames, expectNoHorizontalOverflow, readSuccess } from './helpers';

/**
 * Commercial flow through the real UI: QR guest → order → hotel completes →
 * Guest 360 → order record with locked commission → platform agreements,
 * settlement and statement. Uses the [Demo] 5% agreement from seed-demo.
 */
const SHOTS = 'docs/screenshots';
test.describe.configure({ mode: 'serial' });

async function login(browser: Browser, email: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/admin/login'));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  return page;
}

let reference = '';

test('guest arrives by room QR and places an order; staff complete it', async ({ page, browser }) => {
  await enterAsGuest(page, { lang: 'en', room: '812', name: 'Layla Haddad', phone: '0551234567' });
  await page.goto(`/h/${SLUG}/dining`);
  await page.getByRole('link', { name: /In-Room Dining/ }).first().click();
  await page.getByRole('button', { name: /Club sandwich/ }).click();
  await page.getByText('Avocado', { exact: true }).click();
  await page.getByTestId('add-to-order').click();
  await page.getByRole('button', { name: /View order/ }).click();
  await page.getByRole('button', { name: /^Place order/ }).click();
  ({ reference } = await readSuccess(page, 'en'));

  const admin = await login(browser, 'admin@demo.hotelhub.local');
  await admin.getByRole('link', { name: 'Requests' }).click();
  await admin.getByRole('button', { name: new RegExp(reference) }).click();
  const drawer = admin.getByRole('dialog');
  await drawer.getByRole('button', { name: 'Accept' }).click();
  await expect(drawer.getByText('Accepted', { exact: true }).first()).toBeVisible();
  await drawer.getByRole('button', { name: 'Mark ready' }).click();
  await expect(drawer.getByText('Ready', { exact: true }).first()).toBeVisible();
  await drawer.getByRole('button', { name: 'Complete' }).click();
  await expect(drawer.getByText('Completed', { exact: true }).first()).toBeVisible();
  await admin.context().close();
});

test('Guest 360 shows the order, the QR session and the commission event', async ({ browser }) => {
  const admin = await login(browser, 'admin@demo.hotelhub.local');
  await admin.getByRole('link', { name: 'Guests', exact: true }).click();
  await admin.getByLabel('Search guests').fill('0551234567');
  await admin.getByRole('link', { name: 'Layla Haddad' }).click();
  await expect(admin.getByRole('heading', { name: 'Layla Haddad' })).toBeVisible();
  await expect(admin.getByText('Room 812').first()).toBeVisible();
  await expect(admin.getByRole('button', { name: reference })).toBeVisible();
  await expect(admin.getByText('QR session started')).toBeVisible();
  await expect(admin.getByText(/Commission eligible: 5\.00%/)).toBeVisible();
  await expectAccessibleNames(admin);
  await admin.screenshot({ path: `${SHOTS}/admin-guest-360.png`, fullPage: true });

  // Order record with lines, history and the locked snapshot.
  await admin.getByRole('button', { name: reference }).click();
  const sheet = admin.getByRole('dialog');
  await expect(sheet).toContainText('[Demo] Club sandwich');
  await expect(sheet).toContainText('Locked');
  await expect(sheet).toContainText('5.00%');
  await expect(sheet).toContainText(/accepted\s*ready/);
  await admin.waitForTimeout(500); // let the drawer finish sliding in
  await admin.screenshot({ path: `${SHOTS}/admin-order-record.png` });
  await admin.keyboard.press('Escape');

  // Orders workspace and the dashboard overview.
  await admin.getByRole('link', { name: 'Orders', exact: true }).click();
  await admin.getByLabel('Search', { exact: true }).fill(reference);
  await expect(admin.getByRole('button', { name: reference })).toBeVisible();
  await admin.getByRole('link', { name: 'Dashboard' }).click();
  await expect(admin.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();
  await admin.screenshot({ path: `${SHOTS}/admin-dashboard-orders.png` });
  await admin.context().close();
});

test('platform finance: new rule version, settlement lifecycle and statement', async ({ browser }) => {
  const fin = await login(browser, 'finance@demo.hotelhub.local');
  await expect(fin.getByRole('heading', { name: 'Commercial dashboard' })).toBeVisible();
  await expect(fin.getByRole('cell', { name: /Swiss Flora Royal/ })).toBeVisible();
  await fin.screenshot({ path: `${SHOTS}/platform-dashboard.png`, fullPage: true });

  // Agreements: the demo hotel rule is live; add a 7% version effective in the future.
  await fin.getByRole('link', { name: 'Agreements & rules' }).click();
  await fin.getByRole('button', { name: /Swiss Flora Royal/ }).click();
  await expect(fin.getByText('[Demo] Standard commission agreement', { exact: false })).toBeVisible();
  await expect(fin.getByText('Live')).toBeVisible();
  await fin.getByRole('button', { name: 'New version' }).click();
  const editor = fin.getByRole('dialog');
  await editor.getByLabel('Rate (%)').fill('7');
  const later = new Date(Date.now() + 7 * 86_400_000);
  const local = new Date(later.getTime() - later.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  await editor.getByLabel('Effective from').fill(local);
  await editor.getByRole('button', { name: 'Create version' }).click();
  await expect(editor).toBeHidden();
  await expect(fin.getByText('v2', { exact: true })).toBeVisible();
  await expect(fin.getByText('Live')).toBeVisible(); // v1 still applies until v2 starts
  await fin.screenshot({ path: `${SHOTS}/platform-agreements.png`, fullPage: true });

  // Settlement for today containing the order.
  await fin.getByRole('link', { name: 'Settlements' }).click();
  await fin.getByRole('button', { name: 'New settlement' }).click();
  const form = fin.getByRole('dialog');
  await form.getByLabel('Hotel').selectOption({ label: 'Swiss Flora Royal Hotel Riyadh' });
  await form.getByLabel('Period').selectOption('CUSTOM');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date());
  await form.getByLabel('Start').fill(today);
  await form.getByLabel('End (inclusive)').fill(today);
  await form.getByRole('button', { name: 'Create draft' }).click();
  const statement = fin.getByRole('dialog', { name: /^Settlement STL-/ });
  await expect(statement).toContainText(reference);
  await expect(statement).toContainText('Due to platform');
  await statement.getByRole('button', { name: 'Mark reviewed' }).click();
  // Maker–checker: whoever prepared or reviewed it cannot approve.
  await expect(statement.getByRole('button', { name: 'Approve' })).toBeDisabled();
  await expect(statement.getByText(/another finance user must approve/i)).toBeVisible();
  const settlementNo = ((await statement.getByRole('heading').first().innerText()).match(/STL-[\w-]+/) ?? [''])[0];
  await fin.keyboard.press('Escape');

  const checker = await login(browser, 'super@demo.hotelhub.local');
  await checker.goto('/admin/platform/settlements');
  await checker.getByRole('button', { name: new RegExp(settlementNo) }).first().click();
  const approve = checker.getByRole('dialog', { name: /^Settlement STL-/ });
  await approve.getByRole('button', { name: 'Approve' }).click();
  await approve.getByLabel('Payment reference').fill('TRX-2026-0001');
  await approve.getByRole('button', { name: 'Mark settled' }).click();
  await expect(approve.getByText('Settled', { exact: true })).toBeVisible();
  await checker.screenshot({ path: `${SHOTS}/platform-settlement.png` });
  await checker.close();

  // Ledger and reports.
  await fin.getByRole('link', { name: 'Commission ledger' }).click();
  await expect(fin.getByRole('button', { name: reference })).toBeVisible();
  await fin.getByRole('link', { name: 'Reports' }).click();
  await fin.getByLabel('Report', { exact: true }).selectOption('commission_revenue');
  await expect(fin.getByRole('cell', { name: /Swiss Flora Royal/ }).first()).toBeVisible();
  await expectNoHorizontalOverflow(fin);
  await fin.context().close();
});

test('hotel finance sees its own statement; department staff see no finance', async ({ browser }) => {
  const hf = await login(browser, 'hotelfinance@demo.hotelhub.local');
  await hf.getByRole('link', { name: 'Finance' }).click();
  await expect(hf.getByRole('heading', { name: 'Finance' })).toBeVisible();
  await expect(hf.getByText(/STL-/).first()).toBeVisible();
  await hf.screenshot({ path: `${SHOTS}/admin-hotel-finance.png`, fullPage: true });
  await expect(hf.getByRole('link', { name: 'Agreements & rules' })).toHaveCount(0);
  await hf.context().close();

  const fnb = await login(browser, 'fnb@demo.hotelhub.local');
  await expect(fnb.getByRole('link', { name: 'Finance' })).toHaveCount(0);
  await expect(fnb.getByRole('link', { name: 'Guests', exact: true })).toHaveCount(0);
  await fnb.goto(`/admin/platform/dashboard`);
  await expect(fnb.getByText('Access restricted')).toBeVisible();
  await fnb.context().close();
});
