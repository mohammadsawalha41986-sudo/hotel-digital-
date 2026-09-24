import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { SLUG, enterAsGuest, expectAccessibleNames, expectNoHorizontalOverflow, uiLogin } from './helpers';

/**
 * Layout checks at real device widths in both directions, plus the
 * screenshots referenced in the delivery report (docs/screenshots).
 */
const SHOTS = 'docs/screenshots';
fs.mkdirSync(SHOTS, { recursive: true });

const WIDTHS = [320, 360, 390, 430, 768, 1280];
const PAGES = ['', 'dining', 'room-services', 'spa', 'laundry', 'services', 'info', 'feedback', 'requests'];

async function checkPage(page: Page, path: string) {
  await page.goto(`/h/${SLUG}${path ? `/${path}` : ''}`);
  await expect(page.locator('main#main')).toBeVisible();
  await page.waitForTimeout(150);
  await expectNoHorizontalOverflow(page);
}

for (const lang of ['ar', 'en'] as const) {
  for (const width of WIDTHS) {
    test(`guest pages fit ${width}px (${lang})`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 768 ? 800 : 900 });
      await enterAsGuest(page, { lang, room: '1204' });
      for (const p of PAGES) await checkPage(page, p);

      // Menu page + item sheet + basket: sticky actions stay inside the viewport.
      await page.goto(`/h/${SLUG}/dining`);
      await page.getByRole('link', { name: lang === 'ar' ? /خدمة الطعام في الغرف/ : /In-Room Dining/ }).first().click();
      await page.getByRole('button', { name: lang === 'ar' ? /كابتشينو/ : /Cappuccino/ }).click();
      const add = page.getByTestId('add-to-order');
      await expect(add).toBeInViewport();
      await expectNoHorizontalOverflow(page);
      await add.click();
      await page.getByRole('button', { name: lang === 'ar' ? /عرض الطلب/ : /View order/ }).click();
      const submit = page.getByRole('button', { name: lang === 'ar' ? /^أرسل الطلب/ : /^Place order/ });
      await expect(submit).toBeInViewport();
      const box = await submit.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      await expectNoHorizontalOverflow(page);
    });
  }
}

test('keyboard: dialogs trap focus, close on Escape and return focus', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await enterAsGuest(page, { lang: 'en', room: '1204' });
  await page.goto(`/h/${SLUG}/room-services`);
  const trigger = page.getByRole('button', { name: /Extra towels/ });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('accessible names on key guest and admin screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterAsGuest(page, { lang: 'ar', room: '1204' });
  for (const p of ['', 'dining', 'laundry', 'feedback']) {
    await page.goto(`/h/${SLUG}${p ? `/${p}` : ''}`);
    await expect(page.locator('main#main')).toBeVisible();
    await expectAccessibleNames(page);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await uiLogin(page, 'admin@demo.hotelhub.local');
  await expectAccessibleNames(page);
  await page.getByRole('link', { name: 'Requests' }).click();
  await expectAccessibleNames(page);
});

test('screenshots for the delivery report', async ({ page, browser }) => {
  test.setTimeout(120_000);
  // Guest — mobile (Arabic + English)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/h/${SLUG}?room=1204`);
  await page.screenshot({ path: `${SHOTS}/guest-welcome-mobile.png` });
  await enterAsGuest(page, { lang: 'ar', room: '1204' });
  await page.waitForTimeout(1800); // let the hero and section animations settle
  await page.screenshot({ path: `${SHOTS}/guest-home-mobile-ar.png` });
  await page.screenshot({ path: `${SHOTS}/guest-home-mobile-ar-full.png`, fullPage: true });
  await page.goto(`/h/${SLUG}/dining`);
  await page.getByRole('link', { name: /خدمة الطعام في الغرف/ }).first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/guest-menu-mobile-ar.png` });
  await page.getByRole('button', { name: /برجر لحم/ }).first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/guest-item-sheet-mobile-ar.png` });

  const en = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await en.newPage();
  await enterAsGuest(p2, { lang: 'en', room: '1204' });
  await p2.waitForTimeout(1800);
  await p2.screenshot({ path: `${SHOTS}/guest-home-mobile-en.png` });
  await p2.goto(`/h/${SLUG}/laundry`);
  await p2.screenshot({ path: `${SHOTS}/guest-laundry-mobile-en.png` });
  await p2.goto(`/h/${SLUG}/spa`);
  await p2.screenshot({ path: `${SHOTS}/guest-spa-mobile-en.png` });
  await p2.goto(`/h/${SLUG}/requests`);
  await p2.screenshot({ path: `${SHOTS}/guest-requests-mobile-en.png` });

  // Guest — desktop
  await p2.setViewportSize({ width: 1440, height: 900 });
  await p2.goto(`/h/${SLUG}`);
  await p2.waitForTimeout(1800);
  await p2.screenshot({ path: `${SHOTS}/guest-home-desktop-en.png` });
  await en.close();

  // Admin
  await page.setViewportSize({ width: 1440, height: 900 });
  await uiLogin(page, 'admin@demo.hotelhub.local');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/admin-dashboard.png` });
  await page.getByRole('link', { name: 'Requests' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/admin-requests.png` });
  await page.getByRole('button', { name: /ORD-/ }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/admin-request-detail.png` });
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Website manager' }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS}/admin-website-manager.png` });
  await page.getByRole('link', { name: 'Dining & menus' }).click();
  await page.getByRole('button', { name: 'Open In-Room Dining' }).click();
  await page.getByRole('button', { name: /^Mains/ }).click();
  await page.getByRole('button', { name: 'Edit [Demo] Beef burger' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/admin-menu-item-editor.png` });
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Departments & WhatsApp' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/admin-whatsapp-routing.png` });
  await page.getByRole('link', { name: 'QR codes' }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/admin-qr-codes.png` });
  await page.getByRole('link', { name: 'Branding' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/admin-branding.png` });
});
