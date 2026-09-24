import { expect, test, type Page } from '@playwright/test';
import { SLUG, enterAsGuest, uiLogin } from './helpers';

test.describe.configure({ mode: 'serial' });
test.use({ viewport: { width: 1440, height: 900 } });

const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000010000000100806000000' + '1ff3ff610000001949444154789c63fccf400a60a219c3a8068c1a3060d480a10600d06d1ff1f3d8a8b70000000049454e44ae426082', 'hex');

let hid = '';
const go = async (page: Page, path: string) => {
  await page.goto(`/admin/h/${hid}/${path}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
};
const saveEditor = async (page: Page) => {
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
};

test('hotel admin edits every guest-facing module through the UI', async ({ page }) => {
  await uiLogin(page, 'admin@demo.hotelhub.local');
  hid = page.url().split('/admin/h/')[1].split('/')[0];

  // Logo upload (validated + stored server-side)
  await go(page, 'branding');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Upload image', exact: true }).first().click();
  await (await chooser).setFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('#b-logo')).toHaveValue(/^\/media\//);
  await page.getByRole('button', { name: 'Save branding' }).click();
  await expect(page.getByText('Branding saved')).toBeVisible();

  // Hero headline + hide the gallery section, via draft → publish
  await go(page, 'website');
  await page.getByRole('radio', { name: 'Hero' }).click();
  await page.getByRole('button', { name: 'Customize Welcome to Swiss Flora Royal' }).click();
  await page.getByLabel('Headline (English)').fill('Your stay, perfected');
  await page.getByRole('radio', { name: 'Homepage sections' }).click();
  await page.getByRole('button', { name: 'Hide Gallery' }).click();
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved')).toBeVisible();

  // New offer
  await go(page, 'offers');
  await page.getByRole('button', { name: 'Add offer' }).click();
  await page.locator('#f-title-en').fill('Weekend Brunch');
  await page.locator('#f-title-ar').fill('برانش نهاية الأسبوع');
  await page.locator('#f-price_label-en').fill('SAR 145 per person');
  await saveEditor(page);
  await expect(page.getByRole('button', { name: /Weekend Brunch/ }).first()).toBeVisible();

  // Outlet image
  await go(page, 'dining');
  await page.getByRole('button', { name: 'Edit Lobby Café' }).click();
  await page.locator('#f-cover').fill('https://cdn.example.com/lobby-cafe.jpg');
  await page.locator('#f-cover').blur();
  await saveEditor(page);

  // Menu item price + disable an item
  await page.getByRole('button', { name: 'Open In-Room Dining' }).click();
  await page.getByRole('button', { name: /^Mains/ }).click();
  await page.getByRole('button', { name: 'Edit [Demo] Club sandwich' }).click();
  await page.locator('#f-price').fill('64');
  await saveEditor(page);
  await page.getByRole('button', { name: 'Edit [Demo] Beef burger' }).click();
  await page.getByRole('switch', { name: /Currently available/ }).click();
  await saveEditor(page);

  // New room service
  await go(page, 'room-services');
  await page.getByRole('button', { name: 'Add in-room service' }).click();
  await page.locator('#f-name-en').fill('Baby cot');
  await page.locator('#f-name-ar').fill('سرير أطفال');
  await page.locator('#f-department').selectOption('HOUSEKEEPING');
  await saveEditor(page);

  // Spa price
  await go(page, 'spa');
  await page.getByRole('button', { name: 'Edit Swedish massage' }).click();
  await page.locator('#f-price').fill('300');
  await saveEditor(page);

  // Laundry price
  await go(page, 'laundry');
  await page.getByRole('button', { name: 'Edit [Demo] Shirt' }).click();
  await page.locator('#f-wash_price').fill('13');
  await saveEditor(page);

  // Department WhatsApp
  await go(page, 'departments');
  await page.getByLabel('Housekeeping WhatsApp').fill('+966 51 111 1111');
  await page.getByRole('button', { name: 'Save routing' }).click();
  await expect(page.getByText('Routing saved')).toBeVisible();

  // Nothing above reaches guests until it is published — then everything goes live together.
  await expect(page.getByText('Unpublished changes')).toBeVisible();
  await page.getByRole('button', { name: /^Publish updates/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Publish updates' });
  await expect(dialog).toContainText('price change');
  await dialog.getByLabel('Note (optional)').fill('E2E content refresh');
  await dialog.getByRole('button', { name: 'Publish now' }).click();
  await expect(page.getByText(/Published version \d+/)).toBeVisible();
  await expect(page.getByText('All changes live')).toBeVisible();
});

test('every change persists after a full reload', async ({ page }) => {
  await uiLogin(page, 'admin@demo.hotelhub.local');
  await go(page, 'branding');
  await expect(page.locator('#b-logo')).toHaveValue(/^\/media\//);

  await go(page, 'website');
  await expect(page.getByText('Everything published')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show Gallery' })).toBeVisible();
  await page.getByRole('radio', { name: 'Hero' }).click();
  await page.getByRole('button', { name: 'Customize Your stay, perfected' }).click();
  await expect(page.getByLabel('Headline (English)')).toHaveValue('Your stay, perfected');

  await go(page, 'dining');
  await page.getByRole('button', { name: 'Edit Lobby Café' }).click();
  await expect(page.locator('#f-cover')).toHaveValue('https://cdn.example.com/lobby-cafe.jpg');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Open In-Room Dining' }).click();
  await page.getByRole('button', { name: /^Mains/ }).click();
  await expect(page.getByText('SAR 64')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: '[Demo] Beef burger' })).toContainText('Unavailable');

  await go(page, 'spa');
  await expect(page.getByRole('listitem').filter({ hasText: 'Swedish massage' })).toContainText('SAR 300');
  await go(page, 'laundry');
  await expect(page.getByRole('listitem').filter({ hasText: '[Demo] Shirt' })).toContainText('Wash SAR 13');
  await go(page, 'room-services');
  await expect(page.getByText('Baby cot', { exact: true })).toBeVisible();
  await go(page, 'departments');
  await expect(page.getByLabel('Housekeeping WhatsApp')).toHaveValue('+966 51 111 1111');
  await go(page, 'audit');
  await expect(page.getByText(/Updated Menu item "\[Demo\] Club sandwich": price \(price change\)/)).toBeVisible();
  await expect(page.getByText(/Published version \d+ — E2E content refresh/)).toBeVisible();
});

test('the guest site reflects every published change', async ({ page, request }) => {
  const bundle = await (await request.get(`/api/public/hotels/${SLUG}`)).json();
  expect(bundle.hotel.branding.logo).toMatch(/^\/media\//);
  expect(bundle.site.hero.slides[0].headline_en).toBe('Your stay, perfected');
  expect(bundle.site.sections.find((s: { type: string }) => s.type === 'gallery').visible).toBe(false);
  expect(bundle.catalog.offers.some((o: { title_en: string }) => o.title_en === 'Weekend Brunch')).toBe(true);
  expect(bundle.catalog.room_services.some((s: { name_en: string }) => s.name_en === 'Baby cot')).toBe(true);
  expect(bundle.catalog.spa_services.find((s: { name_en: string }) => s.name_en === 'Swedish massage').price).toBe(300);
  expect(bundle.catalog.laundry_items.find((s: { name_en: string }) => s.name_en.includes('Shirt')).wash_price).toBe(13);

  await page.setViewportSize({ width: 390, height: 844 });
  await enterAsGuest(page, { lang: 'en', room: '505' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your stay, perfected');
  await expect(page.getByText('Weekend Brunch').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Gallery' })).toHaveCount(0);
  await expect(page.locator('header img[alt]').first()).toHaveAttribute('src', /^\/media\//);

  await page.goto(`/h/${SLUG}/dining`);
  await page.getByRole('link', { name: /In-Room Dining/ }).first().click();
  await expect(page.getByRole('button', { name: /Club sandwich/ })).toContainText('SAR 64');
  await expect(page.getByRole('button', { name: /Beef burger/ })).toContainText('Unavailable');

  // New WhatsApp routing is used for the next housekeeping request
  await page.goto(`/h/${SLUG}/room-services`);
  await page.getByRole('button', { name: /Baby cot/ }).click();
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByTestId('whatsapp-link')).toHaveAttribute('href', /wa\.me\/966511111111/);
});

test('role restrictions are enforced in the UI', async ({ page }) => {
  await uiLogin(page, 'fnb@demo.hotelhub.local');
  const nav = page.getByRole('navigation', { name: 'Admin' });
  await expect(nav.getByRole('link', { name: 'Dining & menus' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Branding' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Users & roles' })).toHaveCount(0);
  await page.goto(`/admin/h/${hid}/branding`);
  await expect(page.getByText('Access restricted')).toBeVisible();
});

test('error pages instead of blank screens', async ({ page }) => {
  await page.goto('/h/no-such-hotel');
  await expect(page.getByText(/This hotel is not available/)).toBeVisible();
  await page.goto('/definitely/not/here');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.goto('/admin/h/00000000-0000-0000-0000-000000000000/dashboard');
  await expect(page.getByLabel('Email')).toBeVisible(); // unauthenticated → login
});
