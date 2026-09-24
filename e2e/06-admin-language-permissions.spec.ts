import { expect, test, type Page } from '@playwright/test';
import { uiLogin } from './helpers';

/**
 * Bilingual admin and the per-role permission matrix.
 *
 * NAV mirrors the admin navigation contract (route → module); ROLES mirrors
 * ROLE_MODULES in shared/domain.ts. A role must see exactly its modules in the
 * navigation, be refused on a screen outside them, and get 403 from the server
 * for the same data. The UI is a convenience; the server is the boundary.
 */
const NAV: Record<string, string> = {
  dashboard: 'dashboard',
  requests: 'requests',
  reviews: 'reviews',
  guests: 'guests',
  orders: 'orders',
  finance: 'finance',
  reports: 'orders',
  website: 'hotel',
  experiences: 'hotel',
  offers: 'offers',
  'quick-actions': 'hotel',
  publishing: 'hotel',
  dining: 'dining',
  'room-services': 'room_services',
  'hotel-services': 'hotel_services',
  spa: 'spa',
  laundry: 'laundry',
  info: 'hotel',
  profile: 'hotel',
  branding: 'hotel',
  departments: 'hotel',
  media: 'hotel',
  qr: 'hotel',
  import: 'import',
  users: 'users',
  audit: 'audit',
};

const ALL = ['dashboard', 'requests', 'reviews', 'guests', 'orders', 'finance', 'hotel', 'offers', 'dining', 'room_services', 'hotel_services', 'spa', 'laundry', 'import', 'users', 'audit'];
const ROLES: { email: string; modules: string[] }[] = [
  { email: 'admin@demo.hotelhub.local', modules: ALL },
  { email: 'hotelfinance@demo.hotelhub.local', modules: ['dashboard', 'orders', 'finance'] },
  { email: 'management@demo.hotelhub.local', modules: ['dashboard', 'requests', 'reviews', 'audit', 'guests', 'orders'] },
  { email: 'fnb@demo.hotelhub.local', modules: ['dashboard', 'requests', 'dining', 'offers', 'import'] },
  { email: 'housekeeping@demo.hotelhub.local', modules: ['dashboard', 'requests', 'room_services', 'import'] },
  { email: 'maintenance@demo.hotelhub.local', modules: ['dashboard', 'requests', 'room_services'] },
  { email: 'frontoffice@demo.hotelhub.local', modules: ['dashboard', 'requests', 'hotel_services', 'reviews', 'import', 'guests'] },
  { email: 'laundry@demo.hotelhub.local', modules: ['dashboard', 'requests', 'laundry', 'import'] },
  { email: 'spa@demo.hotelhub.local', modules: ['dashboard', 'requests', 'spa', 'import'] },
];

const hotelId = (page: Page) => /\/admin\/h\/([^/]+)/.exec(page.url())![1];

async function navRoutes(page: Page) {
  const hrefs = await page.getByRole('navigation', { name: 'Admin' }).locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
  return hrefs.map((h) => /\/admin\/h\/[^/]+\/([^/?#]+)/.exec(h)?.[1]).filter((x): x is string => !!x && x in NAV);
}

for (const role of ROLES) {
  test(`permissions: ${role.email.split('@')[0]} sees exactly its modules, UI and server`, async ({ page }) => {
    await uiLogin(page, role.email);
    const hid = hotelId(page);
    const expected = Object.keys(NAV).filter((r) => role.modules.includes(NAV[r]));
    expect((await navRoutes(page)).sort()).toEqual(expected.sort());

    const denied = Object.keys(NAV).find((r) => !role.modules.includes(NAV[r]));
    if (denied) {
      await page.goto(`/admin/h/${hid}/${denied}`);
      await expect(page.getByText('Access restricted')).toBeVisible();
    }
    const users = await page.request.get(`/api/admin/hotels/${hid}/users`);
    expect(users.status(), 'users API').toBe(role.modules.includes('users') ? 200 : 403);
    const menu = await page.request.get(`/api/admin/hotels/${hid}/entities/menu_items`);
    expect(menu.status(), 'menu items API').toBe(role.modules.includes('dining') ? 200 : 403);
  });
}

test('admin switches to Arabic: RTL, translated navigation and messages, persisted', async ({ page }) => {
  await uiLogin(page, 'admin@demo.hotelhub.local');
  await page.getByRole('button', { name: 'التبديل إلى العربية' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  const nav = page.getByRole('navigation', { name: 'الإدارة' });
  await expect(nav.getByRole('link', { name: 'لوحة التحكم' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'الطلبات الواردة' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible();

  // Survives a reload (the dictionary is loaded before the admin renders).
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible();
  await expect(page.getByText('Dashboard', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'docs/screenshots/admin-dashboard-ar.png' });

  // Screens stay free of horizontal overflow in RTL.
  await nav.getByRole('link', { name: 'سجل الطلبات' }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'docs/screenshots/admin-orders-ar.png' });

  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Dashboard' })).toBeVisible();
});
