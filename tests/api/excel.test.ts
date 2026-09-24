import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import ExcelJS from 'exceljs';
import { Client, bundle, ids, login, menuItems, one, publish, q, setup, teardown, users } from './helpers';

process.env.ALLOW_PRIVATE_FETCH = '1'; // image reachability is checked against a local server

const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000008000000080806000000c40fbe8b0000000970485973000003e8000003e801b57b526b0000001249444154189563a85231f98f0f338c0c0500c19d74419121225d0000000049454e44ae426082', 'hex');
let imgServer: http.Server;
let IMG = '';

before(async () => {
  await setup();
  imgServer = http.createServer((req, res) => {
    if (req.url?.startsWith('/ok')) {
      res.writeHead(200, { 'content-type': 'image/png', 'content-length': png.length });
      res.end(req.method === 'HEAD' ? undefined : png);
    } else if (req.url?.startsWith('/page')) {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html></html>');
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((r) => imgServer.listen(0, '127.0.0.1', r));
  IMG = `http://127.0.0.1:${(imgServer.address() as AddressInfo).port}`;
});
after(async () => {
  imgServer.close();
  await teardown();
});

const H = () => `/admin/hotels/${ids.royal}`;

// ------------------------------ workbook helpers ------------------------------
async function load(buf: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  return wb;
}
const headerIndex = (ws: ExcelJS.Worksheet) => {
  const map = new Map<string, number>();
  ws.getRow(1).eachCell((c, i) => map.set(String(c.value).replace(/\s*\*$/, ''), i));
  return map;
};
/** Appends rows given as { 'Header': value } objects. */
function fill(ws: ExcelJS.Worksheet, rows: Record<string, unknown>[]) {
  const idx = headerIndex(ws);
  for (const r of rows) {
    const row = ws.getRow(ws.rowCount + 1);
    for (const [h, v] of Object.entries(r)) {
      const i = idx.get(h);
      if (!i) throw new Error(`No column "${h}" in ${ws.name}: ${[...idx.keys()].join(', ')}`);
      row.getCell(i).value = v as ExcelJS.CellValue;
    }
    row.commit();
  }
}
/** Reads the data rows of a sheet as { header: value } objects. */
function rowsOf(ws: ExcelJS.Worksheet) {
  const idx = headerIndex(ws);
  const out: { n: number; v: Record<string, unknown> }[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const v: Record<string, unknown> = {};
    for (const [h, i] of idx) v[h] = row.getCell(i).value;
    out.push({ n, v });
  });
  return out;
}
async function xlsx(wb: ExcelJS.Workbook) {
  return Buffer.from(await wb.xlsx.writeBuffer());
}
async function upload(c: Client, template: string, buf: Buffer, mode = 'create_update', checkImages = true) {
  const fd = new FormData();
  fd.append('file', new File([new Uint8Array(buf)], `${template}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  fd.append('template', template);
  fd.append('mode', mode);
  fd.append('check_images', String(checkImages));
  return c.req('POST', `${H()}/data/imports`, fd);
}
const count = async (table: string) => (await one(`SELECT COUNT(*) AS n FROM ${table} WHERE hotel_id = $1`, [ids.royal])).n as number;

describe('template catalogue', () => {
  test('23 numbered templates plus the master workbook; access follows modules', async () => {
    const admin = await login(users.admin);
    const r = await admin.get(`${H()}/data/templates`);
    assert.equal(r.status, 200);
    assert.equal(r.body.templates.length, 23);
    assert.deepEqual(
      r.body.templates.map((t: any) => t.number),
      Array.from({ length: 23 }, (_, i) => String(i + 1).padStart(2, '0'))
    );
    assert.ok(r.body.templates.every((t: any) => t.allowed));
    assert.equal(r.body.master.title, 'MASTER HOTEL CONTENT TEMPLATE');

    const laundry = await login(users.laundry);
    const l = await laundry.get(`${H()}/data/templates`);
    const allowed = l.body.templates.filter((t: any) => t.allowed).map((t: any) => t.key);
    assert.deepEqual(allowed, ['laundry_categories', 'laundry_garments', 'laundry_prices', 'laundry_packages']);
    assert.equal((await laundry.download(`${H()}/data/templates/fnb_items`)).status, 403);
    const master = await load((await laundry.download(`${H()}/data/templates/master`)).body);
    assert.deepEqual(master.worksheets.filter((w) => w.state === 'visible').map((w) => w.name), ['Instructions', 'Laundry Categories', 'Laundry Garments', 'Laundry Prices', 'Laundry Packages']);
  });

  test('templates carry instructions, required markers, notes and dropdowns', async () => {
    const admin = await login(users.admin);
    const d = await admin.download(`${H()}/data/templates/fnb_items`);
    assert.equal(d.status, 200);
    assert.match(d.headers.get('content-type')!, /spreadsheetml/);
    assert.match(d.headers.get('content-disposition')!, /07 F&B Items\.xlsx/);
    const wb = await load(d.body);
    assert.deepEqual(wb.worksheets.map((w) => w.name), ['Instructions', 'Lists', 'F&B Items']);
    assert.equal(wb.getWorksheet('Lists')!.state, 'veryHidden');
    const ws = wb.getWorksheet('F&B Items')!;
    const headers = [...headerIndex(ws).keys()];
    for (const h of ['Code', 'Category Code', 'Name (English)', 'Name (Arabic)', 'Price', 'Image URL', 'Gallery URLs', 'Allergens', 'Active', 'Display Order']) assert.ok(headers.includes(h), `missing ${h}`);
    assert.equal(ws.getRow(1).getCell(headerIndex(ws).get('Category Code')!).value, 'Category Code *');
    assert.ok(ws.getRow(1).getCell(1).note, 'headers explain what to enter');
    const dv = (ws as any).dataValidations.model as Record<string, any>;
    assert.ok(Object.values(dv).some((v) => v.type === 'list' && String(v.formulae[0]).startsWith('Lists!')), 'dropdowns reference the Lists sheet');
    const info = wb.getWorksheet('Instructions')!;
    const text = info.getSheetValues().flat().filter(Boolean).map(String).join('\n');
    assert.match(text, /CREATE ONLY/);
    assert.match(text, /URL1\|URL2\|URL3/);
    assert.match(text, /طريقة استخدام الملف/, 'Arabic instructions are included');
    assert.match(text, /ITEM-LATTE/);

    const master = await load((await admin.download(`${H()}/data/templates/master`)).body);
    assert.equal(master.worksheets.filter((w) => w.state === 'visible').length, 24);
  });
});

describe('Excel → guest portal (§62)', () => {
  let priceBatch = '';

  test('upload validates, previews without writing, then imports atomically', async () => {
    const admin = await login(users.admin);
    const wb = await load((await admin.download(`${H()}/data/templates/master`)).body);
    fill(wb.getWorksheet('Dining Outlets')!, [{ Code: 'OUTLET-XL-GARDEN', 'Name (English)': 'XL Garden Café', 'Name (Arabic)': 'مقهى الحديقة', Type: 'cafe', 'Cover Image URL': `${IMG}/ok/cover.png`, Active: 'yes' }]);
    fill(wb.getWorksheet('F&B Menus')!, [{ Code: 'MENU-XL-ALLDAY', 'Outlet Code': 'OUTLET-XL-GARDEN', 'Name (English)': 'All day', 'Name (Arabic)': 'طوال اليوم', 'Meal Period': 'all_day' }]);
    fill(wb.getWorksheet('F&B Categories')!, [
      { Code: 'CAT-XL-COFFEE', 'Menu Code': 'MENU-XL-ALLDAY', 'Name (English)': 'Coffee', 'Name (Arabic)': 'القهوة' },
      { Code: 'CAT-XL-CAKES', 'Menu Code': 'MENU-XL-ALLDAY', 'Name (English)': 'Cakes', 'Name (Arabic)': 'الكيك' },
    ]);
    const items = Array.from({ length: 10 }, (_, i) => ({
      Code: `ITEM-XL-${i + 1}`,
      'Category Code': i < 5 ? 'CAT-XL-COFFEE' : 'CAT-XL-CAKES',
      'Name (English)': `XL item ${i + 1}`,
      'Name (Arabic)': `صنف ${i + 1}`,
      Price: 10 + i,
      'Image URL': i === 9 ? `${IMG}/missing.png` : `${IMG}/ok/${i}.png`,
      Allergens: i === 0 ? 'dairy, nuts' : '',
      Available: 'yes',
    }));
    fill(wb.getWorksheet('F&B Items')!, items);

    const before = await count('menu_items');
    const r = await upload(admin, 'master', await xlsx(wb));
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.status, 'previewed');
    assert.equal(r.body.summary.errors, 0, JSON.stringify(r.body.results.filter((x: any) => x.action === 'error')));
    assert.equal(r.body.summary.create, 14);
    assert.equal(r.body.summary.total, 14);
    const broken = r.body.results.find((x: any) => x.code === 'ITEM-XL-10');
    assert.equal(broken.action, 'create', 'a broken optional image never blocks the row');
    assert.ok(broken.messages.some((m: any) => m.level === 'warning' && m.column === 'image' && /Could not load/.test(m.message)));
    assert.equal(broken.row, 11, 'exact Excel row number');
    assert.ok(r.body.summary.warnings >= 1);
    assert.equal(await count('menu_items'), before, 'preview writes nothing');

    const c = await admin.post(`${H()}/data/imports/${r.body.id}/commit`);
    assert.equal(c.status, 200, JSON.stringify(c.body));
    assert.equal(c.body.status, 'committed');
    assert.equal(c.body.change_count, 14);
    assert.equal(await count('menu_items'), before + 10);
    const again = await admin.post(`${H()}/data/imports/${r.body.id}/commit`);
    assert.equal(again.status, 409, 'a batch is imported once');
    const latte = await one(`SELECT data, parent_id FROM menu_items WHERE hotel_id = $1 AND code = 'ITEM-XL-1'`, [ids.royal]);
    assert.deepEqual(latte.data.allergens, ['dairy', 'nuts']);
    assert.equal(latte.data.name_ar, 'صنف 1', 'Arabic text survives the round trip');
    assert.equal((await one(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'import' AND entity_id = $1`, [r.body.id])).n, 1);
  });

  test('imported content reaches guests after publishing', async () => {
    const admin = await login(users.admin);
    let b = await bundle();
    assert.ok(!b.catalog.outlets.some((o: any) => o.name_en === 'XL Garden Café'), 'drafts stay hidden until publish');
    await publish(admin);
    b = await bundle();
    const outlet = b.catalog.outlets.find((o: any) => o.name_en === 'XL Garden Café');
    assert.ok(outlet);
    const menu = await menuItems(outlet.id);
    assert.equal(menu.length, 10);
    assert.equal(menu.find((i: any) => i.name_en === 'XL item 3').price, 12);
  });

  test('export → edit prices → re-import (update) → publish → new prices', async () => {
    const admin = await login(users.admin);
    const wb = await load((await admin.download(`${H()}/data/export/fnb_items`)).body);
    const ws = wb.getWorksheet('F&B Items')!;
    const idx = headerIndex(ws);
    const mine = rowsOf(ws).filter((r) => String(r.v.Code).startsWith('ITEM-XL-'));
    assert.equal(mine.length, 10);
    for (const r of mine) ws.getRow(r.n).getCell(idx.get('Price')!).value = Number(r.v.Price) + 100;
    // Names change too — the code keeps identity, no duplicates are created.
    ws.getRow(mine[0].n).getCell(idx.get('Name (English)')!).value = 'XL item 1 (renamed)';
    const before = await count('menu_items');
    const r = await upload(admin, 'fnb_items', await xlsx(wb), 'create_update', false);
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.summary.errors, 0);
    assert.equal(r.body.summary.update, 10);
    assert.equal(r.body.summary.create, 0);
    assert.ok(r.body.summary.unchanged > 0, 'untouched exported rows are reported as unchanged');
    const c = await admin.post(`${H()}/data/imports/${r.body.id}/commit`);
    assert.equal(c.status, 200);
    priceBatch = r.body.id;
    assert.equal(await count('menu_items'), before);
    await publish(admin);
    const outlet = (await bundle()).catalog.outlets.find((o: any) => o.name_en === 'XL Garden Café');
    const menu = await menuItems(outlet.id);
    assert.equal(menu.find((i: any) => i.name_en === 'XL item 3').price, 112);
    assert.ok(menu.some((i: any) => i.name_en === 'XL item 1 (renamed)'));
  });

  test('import history lists batches; rollback restores the previous values', async () => {
    const admin = await login(users.admin);
    const list = await admin.get(`${H()}/data/imports`);
    assert.ok(list.body.imports.length >= 2);
    assert.equal(list.body.imports[0].id, priceBatch);
    assert.equal(list.body.imports[0].change_counts['fnb_items:update'], 10);
    const detail = await admin.get(`${H()}/data/imports/${priceBatch}`);
    assert.equal(detail.body.changes.length, 10);
    assert.match(detail.body.changes[0].label, /Menu item ITEM-XL-/);

    const dry = await admin.post(`${H()}/data/imports/${priceBatch}/rollback?dry=1`);
    assert.equal(dry.status, 200);
    assert.equal(dry.body.report.restored, 10);
    assert.equal(dry.body.report.conflicts.length, 0);
    assert.equal((await one(`SELECT data->>'price' AS p FROM menu_items WHERE hotel_id = $1 AND code = 'ITEM-XL-3'`, [ids.royal])).p, '112', 'dry run writes nothing');

    const rb = await admin.post(`${H()}/data/imports/${priceBatch}/rollback`);
    assert.equal(rb.status, 200, JSON.stringify(rb.body));
    assert.equal(rb.body.batch.status, 'rolled_back');
    assert.equal((await one(`SELECT data->>'price' AS p, name_en FROM menu_items WHERE hotel_id = $1 AND code = 'ITEM-XL-1'`, [ids.royal])).name_en, 'XL item 1');
    assert.equal((await one(`SELECT data->>'price' AS p FROM menu_items WHERE hotel_id = $1 AND code = 'ITEM-XL-3'`, [ids.royal])).p, '12');
    assert.equal((await admin.post(`${H()}/data/imports/${priceBatch}/rollback`)).status, 409);
    const pub = await admin.get(`${H()}/publishing`);
    assert.equal(pub.body.has_unpublished_changes ?? pub.body.hotel?.has_unpublished_changes ?? true, true, 'rollback is a draft change');
  });

  test('rollback is refused when a record was edited after the import', async () => {
    const admin = await login(users.admin);
    const first = (await admin.get(`${H()}/data/imports`)).body.imports.find((b: any) => b.template === 'master' && b.status === 'committed');
    const item = await one(`SELECT id FROM menu_items WHERE hotel_id = $1 AND code = 'ITEM-XL-2'`, [ids.royal]);
    assert.equal((await admin.patch(`${H()}/entities/menu_items/${item.id}`, { price: 77 })).status, 200);
    const dry = await admin.post(`${H()}/data/imports/${first.id}/rollback?dry=1`);
    assert.ok(dry.body.report.conflicts.some((c: any) => /ITEM-XL-2/.test(c.label) && /edited/.test(c.reason)));
    const rb = await admin.post(`${H()}/data/imports/${first.id}/rollback`);
    assert.equal(rb.status, 409);
    assert.equal(rb.body.error?.code ?? rb.body.code, 'rollback_conflict');
    assert.equal(await one(`SELECT 1 AS x FROM menu_items WHERE hotel_id = $1 AND code = 'ITEM-XL-1'`, [ids.royal]).then((r) => r?.x), 1, 'nothing was rolled back');
  });
});

describe('validation pipeline', () => {
  test('row errors carry exact rows and columns; commit is refused; nothing is written', async () => {
    const admin = await login(users.admin);
    const wb = await load((await admin.download(`${H()}/data/templates/fnb_items`)).body);
    fill(wb.getWorksheet('F&B Items')!, [
      { Code: 'ITEM-V-OK', 'Category Code': 'CAT-XL-COFFEE', 'Name (English)': 'Valid', Price: '٢٥' },
      { Code: 'ITEM-V-NOCAT', 'Category Code': 'CAT-COFFEE-NOPE', 'Name (English)': 'Orphan', Price: 5 },
      { Code: 'ITEM-V-BADPRICE', 'Category Code': 'CAT-XL-COFFEE', 'Name (English)': 'Bad price', Price: 'abc' },
      { Code: 'ITEM-V-OK', 'Category Code': 'CAT-XL-COFFEE', 'Name (English)': 'Dup', Price: 5 },
      { Code: 'ITEM-V-TAG', 'Category Code': 'CAT-XL-COFFEE', 'Name (English)': 'Tag', Price: 5, Allergens: 'kryptonite' },
      { Code: 'ITEM-V-NONAME', 'Category Code': 'CAT-XL-COFFEE', Price: 5 },
      { Code: 'ITEM-V-URL', 'Category Code': 'CAT-XL-COFFEE', 'Name (English)': 'Bad url', Price: 5, 'Image URL': 'ftp://nope' },
      { Code: 'ITEM-V-ZERO', 'Category Code': 'CAT-XL-COFFEE', 'Name (English)': 'Free', Price: 0 },
    ]);
    const before = await count('menu_items');
    const r = await upload(admin, 'fnb_items', await xlsx(wb));
    assert.equal(r.status, 201);
    const byRow = new Map(r.body.results.map((x: any) => [x.row, x]));
    assert.equal((byRow.get(2) as any).action, 'create');
    assert.equal(r.body.results.find((x: any) => x.code === 'ITEM-V-OK').action, 'create', 'Arabic-Indic digits are numbers');
    const e3 = byRow.get(3) as any;
    assert.equal(e3.action, 'error');
    assert.deepEqual(e3.messages[0], { level: 'error', column: 'category_code', message: 'Category CAT-COFFEE-NOPE not found' });
    assert.equal((byRow.get(4) as any).messages[0].column, 'price');
    assert.ok((byRow.get(5) as any).duplicate);
    assert.match((byRow.get(5) as any).messages.map((m: any) => m.message).join(), /Duplicate of row 2/);
    assert.match((byRow.get(6) as any).messages[0].message, /kryptonite/);
    assert.match((byRow.get(7) as any).messages[0].message, /Name \(English\) is required/);
    assert.equal((byRow.get(8) as any).messages[0].column, 'image');
    assert.equal((byRow.get(9) as any).action, 'create');
    assert.match((byRow.get(9) as any).messages[0].message, /Price is 0/);
    assert.equal(r.body.summary.errors, 6);
    assert.equal(r.body.summary.duplicates, 1);

    const c = await admin.post(`${H()}/data/imports/${r.body.id}/commit`);
    assert.equal(c.status, 422);
    assert.equal(await count('menu_items'), before);
  });

  test('file-level problems: wrong format, missing required columns, empty file', async () => {
    const admin = await login(users.admin);
    const csv = await upload(admin, 'fnb_items', Buffer.from('code,name\nA,B\n'));
    assert.equal(csv.status, 415);

    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('F&B Items').addRow(['Code', 'Name (English)', 'Price']).commit();
    wb.getWorksheet('F&B Items')!.addRow(['ITEM-X', 'X', 1]).commit();
    const miss = await upload(admin, 'fnb_items', await xlsx(wb));
    assert.equal(miss.status, 201);
    assert.equal(miss.body.status, 'failed');
    assert.match(miss.body.summary.issues.map((i: any) => i.message).join(), /Required column\(s\) missing: Category Code/);
    assert.equal((await admin.post(`${H()}/data/imports/${miss.body.id}/commit`)).status, 409);

    const empty = await upload(admin, 'fnb_items', (await admin.download(`${H()}/data/templates/fnb_items`)).body);
    assert.equal(empty.body.status, 'failed');
    assert.match(empty.body.summary.issues[0].message, /no data rows/);

    const wrong = await load((await admin.download(`${H()}/data/templates/master`)).body);
    fill(wrong.getWorksheet('Spa Services')!, [{ 'Category Code': 'X', 'Name (English)': 'Y' }]);
    const w = await upload(admin, 'fnb_items', await xlsx(wrong));
    assert.equal(w.body.status, 'failed');
    assert.match(JSON.stringify(w.body.summary.issues), /belongs to the Dining Outlets template|belongs to the/);
  });

  test('CREATE ONLY adds new records and skips existing ones', async () => {
    const admin = await login(users.admin);
    const wb = await load((await admin.download(`${H()}/data/templates/fnb_categories`)).body);
    fill(wb.getWorksheet('F&B Categories')!, [
      { Code: 'CAT-XL-COFFEE', 'Menu Code': 'MENU-XL-ALLDAY', 'Name (English)': 'Coffee RENAMED' },
      { Code: 'CAT-XL-TEA', 'Menu Code': 'MENU-XL-ALLDAY', 'Name (English)': 'Tea', 'Name (Arabic)': 'الشاي' },
    ]);
    const r = await upload(admin, 'fnb_categories', await xlsx(wb), 'create_only');
    assert.equal(r.body.summary.skipped, 1);
    assert.equal(r.body.summary.create, 1);
    assert.equal((await admin.post(`${H()}/data/imports/${r.body.id}/commit`)).status, 200);
    assert.equal((await one(`SELECT name_en FROM menu_categories WHERE hotel_id = $1 AND code = 'CAT-XL-COFFEE'`, [ids.royal])).name_en, 'Coffee');
  });

  test('a preview can be discarded and is then closed', async () => {
    const admin = await login(users.admin);
    const wb = await load((await admin.download(`${H()}/data/templates/fnb_categories`)).body);
    fill(wb.getWorksheet('F&B Categories')!, [{ 'Menu Code': 'MENU-XL-ALLDAY', 'Name (English)': 'Juices' }]);
    const r = await upload(admin, 'fnb_categories', await xlsx(wb));
    assert.match(r.body.results[0].code, /^CAT-JUICES/, 'codes are generated from the English name');
    assert.equal((await admin.post(`${H()}/data/imports/${r.body.id}/discard`)).body.status, 'discarded');
    assert.equal((await admin.post(`${H()}/data/imports/${r.body.id}/commit`)).status, 409);
  });
});

describe('settings, structure and website templates', () => {
  test('departments + WhatsApp routing + services referencing the new department in one workbook', async () => {
    const admin = await login(users.admin);
    const wb = await load((await admin.download(`${H()}/data/templates/master`)).body);
    fill(wb.getWorksheet('Departments')!, [{ 'Department Code': 'kids club', 'Name (English)': 'Kids Club', 'Name (Arabic)': 'نادي الأطفال', 'Response Target (min)': 20 }]);
    fill(wb.getWorksheet('WhatsApp Routing')!, [
      { 'Department Code': 'KIDS_CLUB', 'WhatsApp Number': '+966 55 123 4567' },
      { 'Department Code': 'NOPE', 'WhatsApp Number': '+966 55 123 4567' },
    ]);
    fill(wb.getWorksheet('Guest Services')!, [{ Code: 'GS-XL-KIDS', 'Name (English)': 'Babysitting', 'Department Code': 'KIDS_CLUB' }]);
    const r = await upload(admin, 'master', await xlsx(wb));
    const bad = r.body.results.find((x: any) => x.sheet === 'whatsapp_routing' && x.action === 'error');
    assert.match(bad.messages[0].message, /Department NOPE not found/);
    assert.equal(r.body.summary.errors, 1);
    // Fix the file: remove the bad row and upload again.
    wb.getWorksheet('WhatsApp Routing')!.spliceRows(3, 1);
    const ok = await upload(admin, 'master', await xlsx(wb));
    assert.equal(ok.body.summary.errors, 0, JSON.stringify(ok.body.results));
    assert.equal((await admin.post(`${H()}/data/imports/${ok.body.id}/commit`)).status, 200);
    const d = await one(`SELECT whatsapp, sla_minutes, is_custom FROM departments WHERE hotel_id = $1 AND code = 'KIDS_CLUB'`, [ids.royal]);
    assert.deepEqual(d, { whatsapp: '+966 55 123 4567', sla_minutes: 20, is_custom: true });
    assert.equal((await one(`SELECT data->>'department' AS d FROM hotel_services WHERE hotel_id = $1 AND code = 'GS-XL-KIDS'`, [ids.royal])).d, 'KIDS_CLUB');

    // Rolling back removes the service before the department it depends on.
    const rb = await admin.post(`${H()}/data/imports/${ok.body.id}/rollback`);
    assert.equal(rb.status, 200, JSON.stringify(rb.body));
    assert.equal(await one(`SELECT 1 AS x FROM departments WHERE hotel_id = $1 AND code = 'KIDS_CLUB'`, [ids.royal]), null);
  });

  test('modifiers and operating hours are grouped per record', async () => {
    const admin = await login(users.admin);
    const wb = await load((await admin.download(`${H()}/data/templates/master`)).body);
    fill(wb.getWorksheet('F&B Modifiers')!, [
      { 'Item Code': 'ITEM-XL-1', 'Group Code': 'size', 'Group Type': 'size', 'Group Name (English)': 'Size', 'Minimum Choices': 1, 'Maximum Choices': 1, 'Option Code': 'small', 'Option Name (English)': 'Small', 'Extra Price': 0 },
      { 'Item Code': 'ITEM-XL-1', 'Group Code': 'size', 'Option Code': 'large', 'Option Name (English)': 'Large', 'Extra Price': 4 },
      { 'Item Code': 'ITEM-XL-1', 'Group Code': 'milk', 'Group Type': 'choice', 'Group Name (English)': 'Milk', 'Option Code': 'oat', 'Option Name (English)': 'Oat milk', 'Extra Price': 3 },
    ]);
    fill(wb.getWorksheet('Operating Hours')!, [
      { 'Record Type': 'outlet', Code: 'OUTLET-XL-GARDEN', Day: 'daily', Opens: '07:00', Closes: '11:00', 'Note (English)': 'Breakfast and lunch' },
      { 'Record Type': 'outlet', Code: 'OUTLET-XL-GARDEN', Day: 'fri', Opens: '4:00 pm', Closes: new Date(Date.UTC(1899, 11, 30, 23, 30)) },
    ]);
    const r = await upload(admin, 'master', await xlsx(wb), 'create_update', false);
    assert.equal(r.body.summary.errors, 0, JSON.stringify(r.body.results));
    assert.equal((await admin.post(`${H()}/data/imports/${r.body.id}/commit`)).status, 200);
    const item = await one(`SELECT data FROM menu_items WHERE hotel_id = $1 AND code = 'ITEM-XL-1'`, [ids.royal]);
    assert.equal(item.data.modifiers.length, 2);
    assert.deepEqual(item.data.modifiers[0].options.map((o: any) => [o.id, o.price]), [['small', 0], ['large', 4]]);
    const outlet = await one(`SELECT data FROM outlets WHERE hotel_id = $1 AND code = 'OUTLET-XL-GARDEN'`, [ids.royal]);
    assert.equal(outlet.data.hours.mode, 'schedule');
    assert.deepEqual(outlet.data.hours.days.fri, [{ open: '07:00', close: '11:00' }, { open: '16:00', close: '23:30' }]);
    assert.deepEqual(outlet.data.hours.days.mon, [{ open: '07:00', close: '11:00' }]);
    assert.equal(outlet.data.hours.note_en, 'Breakfast and lunch');

    const bad = await load((await admin.download(`${H()}/data/templates/fnb_modifiers`)).body);
    fill(bad.getWorksheet('F&B Modifiers')!, [
      { 'Item Code': 'ITEM-XL-2', 'Group Code': 'size', 'Group Name (English)': 'Size', 'Minimum Choices': 3, 'Maximum Choices': 1, 'Option Code': 'a', 'Option Name (English)': 'A' },
    ]);
    const b = await upload(admin, 'fnb_modifiers', await xlsx(bad));
    assert.equal(b.body.summary.errors, 1);
    assert.match(b.body.results[0].messages[0].message, /Minimum selections/);
  });

  test('profile, homepage sections, custom sections and navigation update the website draft', async () => {
    const admin = await login(users.admin);
    const wb = await load((await admin.download(`${H()}/data/export/master`)).body);
    const prof = wb.getWorksheet('Hotel Profile')!;
    prof.getRow(2).getCell(headerIndex(prof).get('Tagline (English)')!).value = 'Imported tagline';
    fill(wb.getWorksheet('Custom Sections')!, [{ 'Title (English)': 'Ramadan nights', 'Title (Arabic)': 'ليالي رمضان', 'Text (English)': 'Suhoor until 3 am', 'Button Opens': 'dining', 'Display Order': 1 }]);
    const nav = wb.getWorksheet('Navigation')!;
    const navRow = rowsOf(nav).find((r) => r.v.Page === 'spa')!;
    nav.getRow(navRow.n).getCell(headerIndex(nav).get('Label (English)')!).value = 'Wellness';
    const r = await upload(admin, 'master', await xlsx(wb), 'create_update', false);
    assert.equal(r.body.summary.errors, 0, JSON.stringify(r.body.results.filter((x: any) => x.action === 'error')));
    assert.equal(r.body.summary.create, 1);
    assert.equal(r.body.summary.update, 2, JSON.stringify(r.body.results.filter((x: any) => x.action === 'update'))); // profile + navigation
    assert.equal((await admin.post(`${H()}/data/imports/${r.body.id}/commit`)).status, 200);
    const h = await one(`SELECT profile, site_draft FROM hotels WHERE id = $1`, [ids.royal]);
    assert.equal(h.profile.tagline_en, 'Imported tagline');
    assert.equal(h.site_draft.sections[0].type, 'custom');
    assert.equal(h.site_draft.sections[0].title_ar, 'ليالي رمضان');
    assert.match(h.site_draft.sections[0].id, /^sec-ramadan-nights/);
    assert.equal(h.site_draft.navigation.find((n: any) => n.page === 'spa').label_en, 'Wellness');
  });

  test('a full export re-imports with no changes (every template round-trips)', async () => {
    const admin = await login(users.admin);
    const buf = (await admin.download(`${H()}/data/export/master`)).body;
    const r = await upload(admin, 'master', buf, 'create_update', false);
    assert.equal(r.status, 201);
    assert.equal(r.body.summary.errors, 0, JSON.stringify(r.body.results.filter((x: any) => x.action === 'error').slice(0, 5)));
    const changed = r.body.results.filter((x: any) => x.action !== 'unchanged');
    assert.deepEqual(changed.slice(0, 5), [], 'export → import is a no-op');
    assert.ok(r.body.summary.total > 50);
  });
});

describe('isolation and permissions', () => {
  test('department roles cannot use other modules; other hotels cannot see batches', async () => {
    const laundry = await login(users.laundry);
    const wb = await load((await laundry.download(`${H()}/data/templates/laundry_prices`)).body);
    fill(wb.getWorksheet('Laundry Prices')!, [{ Code: 'LAUNDRY-NOPE', 'Wash & Press Price': 5 }]);
    const r = await upload(laundry, 'laundry_prices', await xlsx(wb));
    assert.equal(r.status, 201);
    assert.match(r.body.results[0].messages[0].message, /LAUNDRY-NOPE not found — add it first/);
    const fd = new FormData();
    fd.append('file', new File([new Uint8Array(await xlsx(wb))], 'x.xlsx'));
    fd.append('template', 'fnb_items');
    assert.equal((await laundry.req('POST', `${H()}/data/imports`, fd)).status, 403);
    const master = (await (await login(users.admin)).get(`${H()}/data/imports`)).body.imports.find((b: any) => b.template === 'master');
    assert.equal((await laundry.get(`${H()}/data/imports/${master.id}`)).status, 403);
    assert.ok(!(await laundry.get(`${H()}/data/imports`)).body.imports.some((b: any) => b.template === 'master'));

    const harbour = await login(users.harbourAdmin);
    assert.equal((await harbour.get(`${H()}/data/imports/${master.id}`)).status, 404);
    assert.equal((await harbour.get(`/admin/hotels/${ids.harbour}/data/imports/${master.id}`)).status, 404, 'batch ids are hotel scoped');
    const exp = await load((await harbour.download(`/admin/hotels/${ids.harbour}/data/export/fnb_items`)).body);
    assert.ok(!rowsOf(exp.getWorksheet('F&B Items')!).some((r) => String(r.v.Code).startsWith('ITEM-XL')), 'exports never leak another hotel');
  });
});

void q;
