import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import sharp from 'sharp';
import { brandingSchema } from '../../shared/hotel';
import { TOKEN_KEYS, contrast, contrastReport, deriveTheme, extractPalette, hexToOklch, inkOn, resolveTheme } from '../../shared/theme';
import { isBlockedAddress } from '../../server/services/net';
import { bundle, ids, login, publish, setup, teardown, users } from './helpers';

before(setup);
after(teardown);
const H = () => `/admin/hotels/${ids.royal}`;

describe('brand engine (pure)', () => {
  test('derived themes are contrast-safe for any brand colour', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 60; i++) {
      const hex = '#' + [rnd(), rnd(), rnd()].map((v) => Math.floor(v * 256).toString(16).padStart(2, '0')).join('');
      const t = deriveTheme({ primary: hex });
      for (const k of TOKEN_KEYS) assert.match(t[k], /^#[0-9A-Fa-f]{6}$/, `${k} for ${hex}`);
      const failing = contrastReport(t).filter((c) => !c.ok);
      assert.deepEqual(failing, [], `seed ${hex}: ${JSON.stringify(failing)}`);
    }
  });

  test('overrides win; invalid overrides are ignored', () => {
    const t = resolveTheme({ primary: '#1D4E89' }, { cta: '#AA0000', border: 'nope' as never });
    assert.equal(t.cta, '#AA0000');
    assert.equal(t.border, deriveTheme({ primary: '#1D4E89' }).border);
  });

  test('earlier branding colours become token overrides (look preserved)', () => {
    const b = brandingSchema.parse({ colors: { primary: '#233B33', secondary: '#15201C', accent: '#A68633', background: '#F7F4EE', surface: '#FFFFFF', text: '#1B211E', muted: '#66706A' } });
    assert.deepEqual(b.colors, { primary: '#233B33', secondary: '#15201C', accent: '#A68633' });
    assert.equal(b.theme.overrides.page_background, '#F7F4EE');
    assert.equal(b.theme.overrides.text_secondary, '#66706A');
    assert.equal(resolveTheme(b.colors, b.theme.overrides).page_background, '#F7F4EE');
  });

  test('palette extraction: coloured logo on white, and a monochrome logo', () => {
    const px = (r: number, g: number, b: number, a = 255) => [r, g, b, a];
    const logo: number[] = [];
    for (let i = 0; i < 600; i++) logo.push(...px(255, 255, 255)); // background
    for (let i = 0; i < 300; i++) logo.push(...px(170, 30, 45)); // wine red mark
    for (let i = 0; i < 80; i++) logo.push(...px(200, 160, 60)); // gold detail
    for (let i = 0; i < 100; i++) logo.push(...px(0, 0, 0, 0)); // transparent
    const p = extractPalette(logo)!;
    const o = hexToOklch(p.primary);
    assert.ok(o.h < 40 || o.h > 340, `primary hue should be red, got ${p.primary}`);
    assert.ok(Math.abs(hexToOklch(p.accent).h - 80) < 40, `accent should be gold, got ${p.accent}`);
    assert.equal(p.monochrome, false);
    const mono: number[] = [];
    for (let i = 0; i < 400; i++) mono.push(...px(255, 255, 255));
    for (let i = 0; i < 200; i++) mono.push(...px(30, 30, 30));
    const m = extractPalette(mono)!;
    assert.equal(m.monochrome, true);
    assert.ok(contrast(m.primary, '#FFFFFF') > 10);
    assert.equal(inkOn(deriveTheme(m).cta), '#FFFFFF');
  });

  test('SSRF guard refuses internal addresses', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.9', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) assert.ok(isBlockedAddress(ip), ip);
    for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) assert.ok(!isBlockedAddress(ip), ip);
  });
});

async function upload(admin: Awaited<ReturnType<typeof login>>, buf: Buffer, name: string, type: string, spec?: string) {
  const fd = new FormData();
  fd.append('file', new File([new Uint8Array(buf)], name, { type }));
  if (spec) fd.append('spec', spec);
  return admin.req('POST', `${H()}/media/upload`, fd);
}

describe('media pipeline', () => {
  test('raster uploads get an optimised original, 3 WebP variants, dimensions and size warnings', async () => {
    const admin = await login(users.admin);
    const jpg = await sharp({ create: { width: 3000, height: 1000, channels: 3, background: '#335577' } }).jpeg().toBuffer();
    const r = await upload(admin, jpg, 'hero.jpg', 'image/jpeg', 'hero_desktop');
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.mime, 'image/webp');
    assert.equal(r.body.width, 2400, 'capped at 2400 px');
    assert.equal(r.body.height, 800);
    assert.deepEqual(Object.keys(r.body.variants).sort(), ['1600', '400', '800']);
    const dir = process.env.UPLOAD_DIR ?? './.test-uploads';
    for (const u of Object.values<string>(r.body.variants)) {
      const meta = await sharp(fs.readFileSync(path.join(dir, u.replace('/media/', '')))).metadata();
      assert.equal(meta.format, 'webp');
    }
    assert.ok(r.body.warnings.some((w: any) => /Aspect ratio/.test(w.en)), 'wide image for a 16:9 slot is flagged, not refused');

    const small = await sharp({ create: { width: 300, height: 300, channels: 4, background: '#ffffff00' } }).png().toBuffer();
    const s = await upload(admin, small, 'logo.png', 'image/png', 'logo');
    assert.equal(s.status, 201);
    assert.ok(s.body.warnings.some((w: any) => /small/.test(w.en)));
    // Deleting removes the variants too.
    const del = await admin.req('DELETE', `${H()}/media/${r.body.id}`);
    assert.equal(del.status, 200);
    assert.ok(!fs.existsSync(path.join(dir, r.body.variants['400'].replace('/media/', ''))));
  });

  test('clean SVG logos are accepted and served sandboxed; unsafe SVG is refused', async () => {
    const admin = await login(users.admin);
    const ok = await upload(admin, Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#7a2434"/></svg>'), 'logo.svg', 'image/svg+xml');
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    assert.match(ok.body.url, /\.svg$/);
    const { createApp } = await import('../../server/app');
    const res = await createApp().request(ok.body.url);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-security-policy') ?? '', /sandbox/);
    for (const bad of ['<svg><script>alert(1)</script></svg>', '<svg><image href="https://evil.example/x.png"/></svg>', '<svg><foreignObject/></svg>', '<svg><a xlink:href="javascript:alert(1)"/></svg>']) {
      assert.equal((await upload(admin, Buffer.from(bad), 'x.svg', 'image/svg+xml')).status, 422, bad);
    }
  });

  test('logo analysis suggests brand colours; external private addresses are refused', async () => {
    const admin = await login(users.admin);
    const logo = await sharp({ create: { width: 400, height: 200, channels: 4, background: '#ffffff' } })
      .composite([{ input: await sharp({ create: { width: 200, height: 100, channels: 4, background: '#0E6B5C' } }).png().toBuffer(), left: 100, top: 50 }])
      .png()
      .toBuffer();
    const up = await upload(admin, logo, 'logo.png', 'image/png', 'logo');
    const a = await admin.post(`${H()}/branding/analyze`, { url: up.body.url });
    assert.equal(a.status, 200, JSON.stringify(a.body));
    const h = hexToOklch(a.body.palette.primary).h;
    assert.ok(h > 150 && h < 200, `teal expected, got ${a.body.palette.primary}`);
    assert.equal(a.body.tokens.primary, a.body.palette.primary);
    const ssrf = await admin.post(`${H()}/branding/analyze`, { url: 'http://169.254.169.254/latest/meta-data' });
    assert.equal(ssrf.status, 422);
    assert.match(ssrf.body.error.message, /not reachable/);
    const other = await login(users.harbourAdmin);
    assert.equal((await other.post(`${H()}/branding/analyze`, { url: up.body.url })).status, 404);
  });
});

describe('per-hotel branding', () => {
  test('each hotel has its own theme; edits publish per hotel only', async () => {
    const admin = await login(users.admin);
    const harbourBefore = (await bundle('demo-harbour-hotel')).hotel.branding;
    await admin.req('PATCH', `${H()}/branding`, { colors: { primary: '#5B2A86', secondary: '#1B1030', accent: '#E0A458' }, theme: { overrides: { cta: '#3D1A5C' }, source: 'manual' } });
    await publish(admin);
    const royal = (await bundle()).hotel.branding;
    assert.equal(royal.colors.primary, '#5B2A86');
    assert.equal(resolveTheme(royal.colors, royal.theme.overrides).cta, '#3D1A5C');
    assert.deepEqual((await bundle('demo-harbour-hotel')).hotel.branding, harbourBefore);
    assert.equal((await (await login(users.harbourAdmin)).req('PATCH', `${H()}/branding`, { colors: { primary: '#000000', secondary: '#000000', accent: '#000000' } })).status, 404);
  });
});
