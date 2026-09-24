import assert from 'node:assert/strict';
import fs from 'node:fs';
import { after, before, describe, test } from 'node:test';
import { Client, ids, login, one, q, setup, teardown, users } from './helpers';

before(setup);
after(async () => {
  fs.rmSync('./.test-uploads', { recursive: true, force: true });
  await teardown();
});

const H = () => `/admin/hotels/${ids.royal}`;

describe('spreadsheet import', () => {
  test('preview reports row-level errors and writes nothing', async () => {
    const admin = await login(users.admin);
    const before = await one(`SELECT COUNT(*) AS n FROM menu_items WHERE hotel_id = $1`, [ids.royal]);
    const r = await admin.post(`${H()}/import/menu`, {
      mode: 'upsert',
      commit: false,
      sheets: {
        menus: [{ outlet: 'Pool Bar', name_en: 'Pool menu', name_ar: 'قائمة المسبح' }],
        menu_categories: [{ outlet: 'Pool Bar', menu: 'Pool menu', name_en: 'Mocktails' }],
        menu_items: [
          { outlet: 'Pool Bar', menu: 'Pool menu', category: 'Mocktails', name_en: 'Virgin mojito', price: 28, dietary: 'vegan', available: 'yes' },
          { outlet: 'Pool Bar', menu: 'Pool menu', category: 'Mocktails', name_en: 'Bad price', price: 'abc' },
          { outlet: 'Pool Bar', menu: 'Pool menu', category: 'Nope', name_en: 'Orphan', price: 10 },
          { outlet: 'Pool Bar', menu: 'Pool menu', category: 'Mocktails', name_en: 'Virgin mojito', price: 30 },
          { outlet: 'Pool Bar', menu: 'Pool menu', category: 'Mocktails', name_en: 'Unknown tag', price: 12, allergens: 'kryptonite' },
        ],
      },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.committed, false);
    assert.equal(r.body.summary.create, 3);
    assert.equal(r.body.summary.errors, 4);
    const rows = r.body.results.filter((x: any) => x.action === 'error').map((x: any) => x.row);
    assert.deepEqual(rows, [3, 4, 5, 6]);
    const after = await one(`SELECT COUNT(*) AS n FROM menu_items WHERE hotel_id = $1`, [ids.royal]);
    assert.equal(after.n, before.n, 'preview must not write');
  });

  test('commit is refused while errors remain (no partial import)', async () => {
    const admin = await login(users.admin);
    const r = await admin.post(`${H()}/import/laundry`, { commit: true, sheets: { laundry_items: [{ name_en: 'Scarf', wash_price: 5 }, { name_en: '', wash_price: 5 }] } });
    assert.equal(r.status, 422);
    assert.equal(r.body.committed, false);
    assert.equal((await one(`SELECT COUNT(*) AS n FROM laundry_items WHERE name_en = 'Scarf'`)).n, 0);
  });

  test('valid import commits atomically, then upserts; duplicates can be rejected', async () => {
    const admin = await login(users.admin);
    const sheets = { laundry_items: [{ name_en: 'Scarf', name_ar: 'وشاح', category: 'ladies', wash_price: 5, express_pct: 50 }, { name_en: 'Tie', category: 'Gentlemen', dry_clean_price: 9 }] };
    const r = await admin.post(`${H()}/import/laundry`, { commit: true, sheets });
    assert.equal(r.status, 200);
    assert.equal(r.body.summary.create, 2);
    const tie = await one(`SELECT data FROM laundry_items WHERE hotel_id = $1 AND name_en = 'Tie'`, [ids.royal]);
    assert.equal(tie.data.category, 'gentlemen', 'labels are mapped to option values');

    const again = await admin.post(`${H()}/import/laundry`, { commit: true, sheets: { laundry_items: [{ name_en: 'scarf', wash_price: 6 }] } });
    assert.equal(again.body.summary.update, 1);
    assert.equal((await one(`SELECT data FROM laundry_items WHERE lower(name_en) = 'scarf'`)).data.wash_price, 6);

    const strict = await admin.post(`${H()}/import/laundry`, { commit: false, mode: 'create_only', sheets: { laundry_items: [{ name_en: 'Tie', wash_price: 1 }] } });
    assert.equal(strict.body.summary.errors, 1);
    const audit = await one(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'import' AND hotel_id = $1`, [ids.royal]);
    assert.equal(audit.n, 2);
  });

  test('export returns parent names so the file can be re-imported', async () => {
    const admin = await login(users.admin);
    const r = await admin.get(`${H()}/export/menu`);
    const items = r.body.sheets.find((s: any) => s.entity === 'menu_items');
    const burger = items.rows.find((x: any) => x.name_en.includes('Beef burger'));
    assert.equal(burger.outlet, 'In-Room Dining');
    assert.equal(burger.menu, 'All-day menu');
    assert.equal(burger.category, 'Mains');
    const round = await admin.post(`${H()}/import/menu`, { commit: false, sheets: { menu_items: items.rows } });
    assert.equal(round.body.summary.errors, 0);
    assert.equal(round.body.summary.create, 0);
  });

  test('department roles can only import their own catalogs', async () => {
    const laundry = await login(users.laundry);
    assert.equal((await laundry.post(`${H()}/import/menu`, { sheets: {} })).status, 403);
  });
});

describe('media uploads', () => {
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6364f8ffbf1e000502027f3d0f4b0000000049454e44ae426082', 'hex');

  test('valid images are stored, served and recorded', async () => {
    const admin = await login(users.admin);
    const fd = new FormData();
    fd.append('file', new File([png], 'dot.png', { type: 'image/png' }));
    const r = await admin.req('POST', `${H()}/media/upload`, fd);
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.match(r.body.url, new RegExp(`^/media/${ids.royal}/[0-9a-f-]+\\.png$`));
    const list = (await admin.get(`${H()}/media`)).body.media;
    assert.ok(list.some((m: any) => m.url === r.body.url));
  });

  test('SVG, disguised and oversized files are rejected', async () => {
    const admin = await login(users.admin);
    const svg = new FormData();
    svg.append('file', new File(['<svg onload="alert(1)"/>'], 'x.svg', { type: 'image/svg+xml' }));
    assert.equal((await admin.req('POST', `${H()}/media/upload`, svg)).status, 415);
    const fake = new FormData();
    fake.append('file', new File(['#!/bin/sh\necho pwned'], 'photo.jpg', { type: 'image/jpeg' }));
    assert.equal((await admin.req('POST', `${H()}/media/upload`, fake)).status, 415);
    const big = new FormData();
    big.append('file', new File([Buffer.concat([png, Buffer.alloc(9 * 1024 * 1024)])], 'big.png', { type: 'image/png' }));
    assert.equal((await admin.req('POST', `${H()}/media/upload`, big)).status, 413);
  });

  test('guest attachments are image-only and need a guest session', async () => {
    const g = new Client();
    const fd = new FormData();
    fd.append('file', new File([png], 'issue.png', { type: 'image/png' }));
    const r = await g.req('POST', '/public/hotels/swiss-flora-royal/uploads', fd);
    assert.equal(r.status, 201);
    const pdf = new FormData();
    pdf.append('file', new File([Buffer.from('%PDF-1.4 test')], 'x.pdf', { type: 'application/pdf' }));
    assert.equal((await g.req('POST', '/public/hotels/swiss-flora-royal/uploads', pdf)).status, 415);
    await q('SELECT 1');
  });
});
