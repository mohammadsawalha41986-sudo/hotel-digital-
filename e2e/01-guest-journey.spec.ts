import { expect, test } from '@playwright/test';
import { SLUG, apiLogin, enterAsGuest, expectAccessibleNames, expectNoHorizontalOverflow, readSuccess } from './helpers';

/**
 * Real-hotel simulation (Swiss Flora Royal): QR → Arabic → in-house guest →
 * food order with modifiers → housekeeping → A/C → laundry → spa → complaint,
 * then verification that each request reached the right department with the
 * right hotel/room/guest context. The critical order flow is repeated in English.
 */
test.describe.configure({ mode: 'serial' });
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

const refs: Record<string, string> = {};

test('Arabic in-house guest journey across every department', async ({ page }) => {
  // 1. QR with room context → Arabic → identification (room prefilled)
  await page.goto(`/h/${SLUG}?room=1204`);
  await page.getByRole('button', { name: 'العربية', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByLabel('رقم الغرفة')).toHaveValue('1204');
  await page.getByLabel('الاسم الكامل').fill('سارة أحمد');
  await page.getByLabel('رقم الجوال').fill('+966555000111');
  await page.getByRole('button', { name: 'ابدأ الاستكشاف' }).click();

  // 2. Homepage
  await expect(page.getByRole('heading', { level: 1 })).toContainText('سويس فلورا رويال');
  await expectNoHorizontalOverflow(page);
  await expectAccessibleNames(page);

  // 3. Dining → In-room dining menu → modifiers → basket → note → submit
  await page.getByRole('navigation', { name: 'Quick navigation' }).getByRole('link', { name: 'المطاعم' }).click();
  await page.getByRole('link', { name: /خدمة الطعام في الغرف/ }).first().click();
  await expect(page.getByRole('heading', { name: 'خدمة الطعام في الغرف', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: /برجر لحم/ }).click();
  await page.getByText('مطهو جيداً', { exact: true }).click();
  await page.getByText('جبنة إضافية', { exact: true }).click();
  await page.getByRole('group', { name: 'الكمية' }).getByRole('button', { name: 'زيادة' }).click();
  await expect(page.getByTestId('add-to-order')).toContainText('154');
  await page.getByTestId('add-to-order').click();
  await page.getByRole('button', { name: /عصير برتقال/ }).click();
  await page.getByTestId('add-to-order').click();
  await page.getByRole('button', { name: /عرض الطلب/ }).click();
  await page.getByLabel('ملاحظات للمطبخ').fill('يرجى رن الجرس');
  await expect(page.getByRole('dialog')).toContainText('178'); // 154 + 24
  await page.getByRole('button', { name: /^أرسل الطلب/ }).click();
  const order = await readSuccess(page, 'ar');
  expect(order.reference).toMatch(/^ORD-\d{6}-\d{3}$/);
  expect(order.whatsapp).toContain('wa.me/966500000101');
  expect(order.whatsapp).toContain('الغرفة: *1204*');
  expect(order.whatsapp).toContain('يرجى رن الجرس');
  refs.order = order.reference;

  // 4. Housekeeping (room cleaning) with a required question
  await page.getByRole('navigation', { name: 'Quick navigation' }).getByRole('link', { name: 'خدمات الغرفة' }).click();
  await page.getByRole('button', { name: /تنظيف الغرفة/ }).click();
  await page.getByRole('button', { name: 'أرسل الطلب' }).click();
  await expect(page.getByRole('dialog').getByText('مطلوب').first()).toBeVisible();
  await page.getByLabel('متى').selectOption('now');
  await page.getByRole('button', { name: 'أرسل الطلب' }).click();
  const hk = await readSuccess(page, 'ar');
  expect(hk.reference).toMatch(/^RS-/);
  expect(hk.whatsapp).toContain('wa.me/966500000102');
  refs.housekeeping = hk.reference;

  // 5. A/C maintenance
  await page.getByRole('button', { name: /مشكلة في التكييف/ }).click();
  await page.getByLabel('ما المشكلة؟').selectOption('too_warm');
  await page.getByLabel('ملاحظات').fill('الغرفة حارة منذ الليلة');
  await page.getByRole('button', { name: 'أرسل الطلب' }).click();
  const ac = await readSuccess(page, 'ar');
  expect(ac.whatsapp).toContain('wa.me/966500000103');
  refs.maintenance = ac.reference;

  // 6. Laundry pickup with quantities and total
  await page.goto(`/h/${SLUG}/laundry`);
  const shirtWash = page.getByRole('group', { name: /قميص — غسيل وكي/ });
  await shirtWash.getByRole('button', { name: 'زيادة' }).click();
  await shirtWash.getByRole('button', { name: 'زيادة' }).click();
  await shirtWash.getByRole('button', { name: 'زيادة' }).click();
  await page.getByRole('group', { name: /ثوب — تنظيف جاف/ }).getByRole('button', { name: 'زيادة' }).click();
  await page.getByRole('button', { name: /اطلب الاستلام/ }).click();
  await expect(page.getByRole('dialog')).toContainText('56'); // 3×12 + 20
  await page.getByLabel('وقت الاستلام').selectOption({ index: 1 });
  await page.getByRole('dialog').getByRole('button', { name: 'اطلب الاستلام' }).click();
  const laundry = await readSuccess(page, 'ar');
  expect(laundry.reference).toMatch(/^LDY-/);
  expect(laundry.whatsapp).toContain('wa.me/966500000106');
  refs.laundry = laundry.reference;

  // 7. Spa booking request
  await page.goto(`/h/${SLUG}/spa`);
  await page.getByRole('listitem').filter({ hasText: 'المساج السويدي' }).getByRole('button', { name: 'اطلب الحجز' }).click();
  await page.getByLabel('الوقت المفضل').fill('17:30');
  await page.getByRole('dialog').getByRole('button', { name: 'اطلب الحجز' }).click();
  const spa = await readSuccess(page, 'ar');
  expect(spa.whatsapp).toContain('wa.me/966500000107');
  refs.spa = spa.reference;

  // 8. Complaint → management
  await page.goto(`/h/${SLUG}/feedback`);
  await page.getByLabel('الموضوع').fill('إزعاج ليلي');
  await page.getByLabel('الرسالة').fill('صوت مرتفع في الممر بعد منتصف الليل.');
  await page.getByRole('radio', { name: 'عاجلة' }).click();
  await page.getByRole('button', { name: 'أرسل الملاحظات' }).click();
  const complaint = await readSuccess(page, 'ar');
  expect(complaint.reference).toMatch(/^FBK-/);
  expect(complaint.whatsapp).toContain('wa.me/966500000108');
  refs.complaint = complaint.reference;

  // 9. My requests shows all six with live status
  await page.goto(`/h/${SLUG}/requests`);
  for (const r of Object.values(refs)) await expect(page.getByText(r)).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('each request reached the right department with hotel, room and guest context', async ({ playwright, baseURL }) => {
  const expectations: [string, string, string][] = [
    ['fnb@demo.hotelhub.local', refs.order, 'FNB'],
    ['housekeeping@demo.hotelhub.local', refs.housekeeping, 'HOUSEKEEPING'],
    ['maintenance@demo.hotelhub.local', refs.maintenance, 'MAINTENANCE'],
    ['laundry@demo.hotelhub.local', refs.laundry, 'LAUNDRY'],
    ['spa@demo.hotelhub.local', refs.spa, 'SPA'],
    ['management@demo.hotelhub.local', refs.complaint, 'MANAGEMENT'],
  ];
  for (const [email, reference, dept] of expectations) {
    const ctx = await playwright.request.newContext({ baseURL });
    await apiLogin(ctx, baseURL!, email);
    const me = await (await ctx.get('/api/auth/me')).json();
    const hid = me.hotels[0].id;
    const list = await (await ctx.get(`/api/admin/hotels/${hid}/requests?status=ALL&search=${reference}`)).json();
    expect(list.requests, `${email} sees ${reference}`).toHaveLength(1);
    const r = list.requests[0];
    expect(r.department).toBe(dept);
    expect(r.room).toBe('1204');
    expect(r.guest_name).toBe('سارة أحمد');
    expect(r.lang).toBe('ar');
    // …and staff of other departments cannot see it
    if (dept !== 'MANAGEMENT') {
      const other = await playwright.request.newContext({ baseURL });
      await apiLogin(other, baseURL!, dept === 'FNB' ? 'housekeeping@demo.hotelhub.local' : 'fnb@demo.hotelhub.local');
      const hidden = await (await other.get(`/api/admin/hotels/${hid}/requests?status=ALL&search=${reference}`)).json();
      expect(hidden.requests).toHaveLength(0);
      await other.dispose();
    }
    await ctx.dispose();
  }
});

test('staff accept and complete a request; the guest sees the live status and message', async ({ browser, page, baseURL }) => {
  // Guest device: place a request and open its tracking page.
  await enterAsGuest(page, { lang: 'ar', room: '1204', name: 'سارة أحمد' });
  await page.goto(`/h/${SLUG}/room-services`);
  await page.getByRole('button', { name: /مناشف إضافية/ }).click();
  await page.getByRole('button', { name: 'أرسل الطلب' }).click();
  const { reference } = await readSuccess(page, 'ar');
  await page.goto(`/h/${SLUG}/requests/${reference}`);
  await expect(page.getByText('تم الاستلام').first()).toBeVisible();

  // Staff console (housekeeping) accepts with a guest-visible message, then completes.
  const staff = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const admin = await staff.newPage();
  await admin.goto(`${baseURL}/admin/login`);
  await admin.getByLabel('Email').fill('housekeeping@demo.hotelhub.local');
  await admin.getByLabel('Password').fill('Demo-pass-2026');
  await admin.getByRole('button', { name: 'Sign in' }).click();
  await admin.getByRole('link', { name: 'Requests' }).click();
  await admin.getByRole('button', { name: new RegExp(reference) }).click();
  const drawer = admin.getByRole('dialog');
  await expect(drawer).toContainText('1204');
  await expect(drawer).toContainText('Extra towels');
  await drawer.getByLabel('Message to guest (shown on their request page)').fill('Towels on the way');
  await drawer.getByRole('button', { name: 'Accept' }).click();
  await expect(drawer.getByText('Accepted', { exact: true }).first()).toBeVisible();

  await page.reload();
  await expect(page.getByText('Towels on the way')).toBeVisible();
  await expect(page.getByText('تم القبول').first()).toBeVisible();

  await drawer.getByRole('button', { name: 'Complete' }).click();
  await expect(drawer.getByText('Completed', { exact: true }).first()).toBeVisible();
  await staff.close();
  await page.reload();
  await expect(page.getByText('مكتمل').first()).toBeVisible();

  // Another device never sees this guest's requests.
  const other = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const otherPage = await other.newPage();
  await enterAsGuest(otherPage, { lang: 'ar', room: '1204', name: 'زائر آخر' });
  await otherPage.goto(`/h/${SLUG}/requests`);
  await expect(otherPage.getByText('لا توجد طلبات بعد')).toBeVisible();
  await other.close();
});

test('English in-house order (critical flow repeated in English)', async ({ page }) => {
  await enterAsGuest(page, { lang: 'en', room: '707', name: 'John Smith' });
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await page.goto(`/h/${SLUG}/dining`);
  await page.getByRole('link', { name: /In-Room Dining/ }).first().click();
  await page.getByRole('button', { name: /Club sandwich/ }).click();
  await page.getByText('Avocado', { exact: true }).click();
  await page.getByTestId('add-to-order').click();
  await page.getByRole('button', { name: /View order/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Deliver to room 707');
  await page.getByRole('button', { name: /^Place order/ }).click();
  const { reference, whatsapp } = await readSuccess(page, 'en');
  expect(reference).toMatch(/^ORD-/);
  expect(whatsapp).toContain('Room: *707*');
  expect(whatsapp).toContain('1 × [Demo] Club sandwich');
  expect(whatsapp).toContain('Avocado');
  await page.getByRole('link', { name: /My requests/ }).first().click();
  await page.getByText(reference).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('In-Room Dining');
});

test('external visitor cannot use in-room services and is prompted for a room', async ({ page }) => {
  await enterAsGuest(page, { lang: 'en', external: true, name: 'Visitor One' });
  await page.goto(`/h/${SLUG}/room-services`);
  await expect(page.getByText('Available to in-house guests')).toBeVisible();
  await page.getByRole('button', { name: /Extra towels/ }).click();
  await expect(page.getByRole('dialog', { name: 'Your details' })).toBeVisible();
});
