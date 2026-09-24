import { chromium } from '@playwright/test';
const [,, url, out, w='390', h='844', actions=''] = process.argv;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
if (process.env.GUEST) {
  const [slug, lang, room] = process.env.GUEST.split(',');
  await ctx.addInitScript(([slug, lang, room]) => {
    localStorage.setItem('hub.guest.' + slug, JSON.stringify({ identity: { type: 'IN_HOUSE', name: 'Sara Ahmed', phone: '+966555000111', room }, savedAt: Date.now() }));
    localStorage.setItem('hub.lang.' + slug, JSON.stringify(lang));
  }, [slug, lang, room]);
}
if (process.env.ADMIN) {
  const origin = new URL(url).origin;
  const r = await ctx.request.post(origin + '/api/auth/login', { headers: { 'x-requested-with': 'hub', origin }, data: { email: process.env.ADMIN, password: process.env.ADMIN_PW || 'Demo-pass-2026' } });
  if (!r.ok()) console.log('login failed', r.status(), await r.text());
}
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
await page.goto(url, { waitUntil: 'networkidle' });
for (const a of actions.split(';').filter(Boolean)) {
  const [kind, ...rest] = a.split('=');
  const arg = rest.join('=');
  if (kind === 'click') await page.getByText(arg, { exact: true }).first().click();
  if (kind === 'role') { const [r, n] = arg.split(':'); await page.getByRole(r, { name: n }).first().click(); }
  if (kind === 'fill') { const [l, v] = arg.split(':'); await page.getByLabel(l).first().fill(v); }
  if (kind === 'wait') await page.waitForTimeout(+arg);
  if (kind === 'scroll') await page.mouse.wheel(0, +arg);
}
await page.waitForTimeout(600);
await page.screenshot({ path: out, fullPage: process.env.FULL === '1' });
console.log('errors:', errors.filter(e => !/net::ERR|Failed to load resource/.test(e)).slice(0, 8));
await browser.close();
