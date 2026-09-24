import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const SLUG = 'swiss-flora-royal';
export const PASSWORD = 'Demo-pass-2026';

export async function apiLogin(request: APIRequestContext, baseURL: string, email: string) {
  const r = await request.post('/api/auth/login', { headers: { 'x-requested-with': 'hub', origin: baseURL }, data: { email, password: PASSWORD } });
  expect(r.ok(), `login ${email}`).toBeTruthy();
}

export async function uiLogin(page: Page, email: string) {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

/** Fails if the page scrolls horizontally (layout overflow). */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(1);
}

/** Every button/link has an accessible name; every <img> has an alt attribute. */
export async function expectAccessibleNames(page: Page) {
  const problems = await page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll('button, a[href], [role="button"], input:not([type="hidden"]), select, textarea').forEach((el) => {
      const h = el as HTMLElement;
      if (h.closest('[aria-hidden="true"]') || h.offsetParent === null) return;
      const labelled = h.getAttribute('aria-label') || h.getAttribute('aria-labelledby') || h.getAttribute('title');
      const text = (h.textContent ?? '').trim();
      const id = h.id;
      const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
      const wrapped = h.closest('label');
      if (!labelled && !text && !label && !wrapped && !(h as HTMLInputElement).placeholder) out.push(h.outerHTML.slice(0, 120));
    });
    document.querySelectorAll('img').forEach((img) => {
      if (!img.hasAttribute('alt')) out.push(img.outerHTML.slice(0, 120));
    });
    return out;
  });
  expect(problems, problems.join('\n')).toEqual([]);
}

export async function enterAsGuest(page: Page, opts: { lang: 'ar' | 'en'; room?: string; name?: string; phone?: string; external?: boolean }) {
  await page.goto(`/h/${SLUG}${opts.room ? `?room=${opts.room}` : ''}`);
  await page.getByRole('button', { name: opts.lang === 'ar' ? 'العربية' : 'English', exact: true }).click();
  const ar = opts.lang === 'ar';
  if (opts.external) await page.getByText(ar ? 'زائر' : 'Visiting', { exact: true }).click();
  if (!opts.room && !opts.external) await page.getByLabel(ar ? 'رقم الغرفة' : 'Room number').fill('1204');
  await page.getByLabel(ar ? 'الاسم الكامل' : 'Full name').fill(opts.name ?? 'Sara Ahmed');
  await page.getByLabel(ar ? 'رقم الجوال' : 'Mobile number').fill(opts.phone ?? '+966555000111');
  await page.getByRole('button', { name: ar ? 'ابدأ الاستكشاف' : 'Start exploring' }).click();
  await expect(page.locator('main#main')).toBeVisible();
}

/** Reads the success sheet, returns reference + WhatsApp link, then closes it. */
export async function readSuccess(page: Page, lang: 'ar' | 'en') {
  const ref = page.getByTestId('request-reference');
  await expect(ref).toBeVisible();
  const reference = (await ref.textContent())!.trim();
  const wa = page.getByTestId('whatsapp-link');
  const whatsapp = (await wa.count()) ? await wa.getAttribute('href') : null;
  await page.getByRole('button', { name: lang === 'ar' ? 'تم' : 'Done', exact: true }).click();
  await expect(ref).toBeHidden();
  return { reference, whatsapp: whatsapp ? decodeURIComponent(whatsapp) : null };
}
