import { expect, test, type Page } from '@playwright/test';
import ExcelJS from 'exceljs';
import fs from 'node:fs/promises';
import { SLUG, enterAsGuest, uiLogin } from './helpers';

/**
 * §62 Excel → guest portal acceptance, entirely through the UI on the
 * production build: download template → fill → upload → preview → confirm →
 * publish → guest sees it; then export → change prices → re-import → publish
 * → guest sees new prices; finally roll the price import back.
 */
test.describe.configure({ mode: 'serial' });

let hid = '';

async function load(path: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await fs.readFile(path)) as unknown as ArrayBuffer);
  return wb;
}
function headerIndex(ws: ExcelJS.Worksheet) {
  const m = new Map<string, number>();
  ws.getRow(1).eachCell((c, i) => m.set(String(c.value).replace(/\s*\*$/, ''), i));
  return m;
}
function fill(ws: ExcelJS.Worksheet, rows: Record<string, unknown>[]) {
  const idx = headerIndex(ws);
  for (const r of rows) {
    const row = ws.getRow(ws.rowCount + 1);
    for (const [h, v] of Object.entries(r)) row.getCell(idx.get(h)!).value = v as ExcelJS.CellValue;
    row.commit();
  }
}
async function download(page: Page, click: () => Promise<void>) {
  const wait = page.waitForEvent('download');
  await click();
  const d = await wait;
  return { path: (await d.path())!, name: d.suggestedFilename() };
}
/** Upload payload (a buffer: test output paths contain non-ASCII characters file inputs reject). */
async function save(wb: ExcelJS.Workbook, name: string) {
  return { name, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(await wb.xlsx.writeBuffer()) };
}
async function publishAll(page: Page, note: string) {
  await page.getByRole('button', { name: /^Publish updates/ }).first().click(); // top bar
  const dialog = page.getByRole('dialog', { name: 'Publish updates' });
  await dialog.getByLabel('Note (optional)').fill(note);
  await dialog.getByRole('button', { name: 'Publish now' }).click();
  await expect(page.getByText('All changes live').first()).toBeVisible();
}
async function openCenter(page: Page) {
  await page.goto(`/admin/h/${hid}/import`);
  await expect(page.getByRole('heading', { level: 1, name: 'Data Import & Export' })).toBeVisible();
}

test('template → fill → upload → preview → confirm → publish → guest portal', async ({ page }) => {
  await uiLogin(page, 'admin@demo.hotelhub.local');
  hid = /\/admin\/h\/([0-9a-f-]{36})\//.exec(page.url())![1];
  await openCenter(page);
  await expect(page.getByText('01', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Operating Hours' })).toBeVisible();

  const tpl = await download(page, () => page.getByRole('button', { name: 'Download master template' }).click());
  expect(tpl.name).toBe('MASTER HOTEL CONTENT TEMPLATE.xlsx');
  const wb = await load(tpl.path);
  fill(wb.getWorksheet('Dining Outlets')!, [{ Code: 'OUTLET-E2E-TERRACE', 'Name (English)': 'E2E Terrace', 'Name (Arabic)': 'تراس الاختبار', Type: 'cafe' }]);
  fill(wb.getWorksheet('F&B Menus')!, [{ Code: 'MENU-E2E', 'Outlet Code': 'OUTLET-E2E-TERRACE', 'Name (English)': 'Terrace menu', 'Name (Arabic)': 'قائمة التراس' }]);
  fill(wb.getWorksheet('F&B Categories')!, [
    { Code: 'CAT-E2E-DRINKS', 'Menu Code': 'MENU-E2E', 'Name (English)': 'Terrace drinks', 'Name (Arabic)': 'مشروبات' },
    { Code: 'CAT-E2E-SWEETS', 'Menu Code': 'MENU-E2E', 'Name (English)': 'Terrace sweets', 'Name (Arabic)': 'حلويات' },
  ]);
  fill(
    wb.getWorksheet('F&B Items')!,
    Array.from({ length: 10 }, (_, i) => ({
      Code: `ITEM-E2E-${i + 1}`,
      'Category Code': i < 5 ? 'CAT-E2E-DRINKS' : 'CAT-E2E-SWEETS',
      'Name (English)': `Terrace item ${i + 1}`,
      'Name (Arabic)': `صنف التراس ${i + 1}`,
      Price: 20 + i,
      'Image URL': i === 0 ? 'https://images.invalid/e2e-latte.jpg' : '',
    }))
  );
  const file = await save(wb, 'master-filled.xlsx');

  await page.getByRole('button', { name: 'Import master workbook' }).click();
  const dialog = page.getByRole('dialog', { name: 'Import from Excel' });
  await dialog.locator('input[type="file"]').setInputFiles(file);
  await expect(dialog.getByText('master-filled.xlsx')).toBeVisible();
  await dialog.getByRole('button', { name: 'Upload & validate' }).click();

  const review = page.getByRole('dialog', { name: 'Review the import' });
  await expect(review.getByText(/Validation passed/)).toBeVisible({ timeout: 30_000 });
  await expect(review.getByRole('definition').nth(2)).toHaveText('14'); // New
  // The unreachable optional image is a warning on its exact row, not an error.
  await review.getByRole('button', { name: /^Warnings \(/ }).click();
  const row = review.getByRole('row').filter({ hasText: 'ITEM-E2E-1' });
  await expect(row).toContainText('Could not load');
  await expect(row.getByRole('cell').nth(1)).toHaveText('2');
  await review.getByRole('button', { name: 'Import 14 records' }).click();

  const done = page.getByRole('dialog', { name: 'Import complete' });
  await expect(done.getByText(/14 new and 0 updated records saved as a draft/)).toBeVisible();
  await done.getByRole('link', { name: 'Review & publish' }).click();
  await expect(page).toHaveURL(/\/publishing$/);
  await expect(page.getByText('Unpublished changes').first()).toBeVisible();
  await publishAll(page, 'E2E Excel import');

  await enterAsGuest(page, { lang: 'en' });
  await page.goto(`/h/${SLUG}/dining`);
  await page.getByRole('link', { name: /E2E Terrace/ }).first().click();
  await expect(page.getByText('Terrace item 3')).toBeVisible();
  await expect(page.getByText('SAR 22').first()).toBeVisible();
});

test('export → change prices → re-import as update → publish → new prices', async ({ page }) => {
  await uiLogin(page, 'admin@demo.hotelhub.local');
  await openCenter(page);
  const exp = await download(page, () => page.getByRole('button', { name: 'Export F&B Items data' }).click());
  const wb = await load(exp.path);
  const ws = wb.getWorksheet('F&B Items')!;
  const idx = headerIndex(ws);
  ws.eachRow((r, n) => {
    if (n > 1 && String(r.getCell(idx.get('Code')!).value).startsWith('ITEM-E2E-')) r.getCell(idx.get('Price')!).value = Number(r.getCell(idx.get('Price')!).value) + 100;
  });
  const file = await save(wb, 'items-prices.xlsx');

  await page.getByRole('button', { name: 'Import F&B Items' }).click();
  const dialog = page.getByRole('dialog', { name: 'Import from Excel' });
  await dialog.locator('input[type="file"]').setInputFiles(file);
  await expect(dialog.getByRole('radio', { name: 'Create + update' })).toBeChecked();
  await dialog.getByRole('button', { name: 'Upload & validate' }).click();
  const review = page.getByRole('dialog', { name: 'Review the import' });
  await expect(review.getByRole('definition').nth(3)).toHaveText('10', { timeout: 30_000 }); // Updates
  await expect(review.getByRole('definition').nth(2)).toHaveText('0'); // New
  await review.getByRole('button', { name: 'Import 10 records' }).click();
  await expect(page.getByRole('dialog', { name: 'Import complete' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Import complete' }).getByRole('button', { name: 'Close', exact: true }).last().click();
  await publishAll(page, 'E2E price update');

  await enterAsGuest(page, { lang: 'ar' });
  await page.goto(`/h/${SLUG}/dining`);
  await page.getByRole('link', { name: /تراس الاختبار/ }).first().click();
  await expect(page.getByText('صنف التراس 3')).toBeVisible();
  await expect(page.getByText(/122/).first()).toBeVisible();
});

test('import history shows every batch and rolls back the price update', async ({ page }) => {
  await uiLogin(page, 'admin@demo.hotelhub.local');
  await openCenter(page);
  await page.getByRole('radio', { name: 'Import history' }).click();
  const latest = page.getByRole('row').filter({ hasText: '07 F&B Items' }).first();
  await expect(latest).toContainText('Imported');
  await latest.getByRole('button', { name: 'Details' }).click();
  const detail = page.getByRole('dialog', { name: '07 F&B Items' });
  await expect(detail.getByText('Records changed (10)')).toBeVisible();
  await detail.getByRole('button', { name: 'Close' }).first().click();
  await expect(detail).toBeHidden();

  await latest.getByRole('button', { name: 'Roll back' }).click();
  const confirm = page.getByRole('dialog', { name: 'Roll back this import?' });
  await expect(confirm).toContainText('10 record(s) return');
  await confirm.getByRole('button', { name: 'Roll back' }).click();
  await expect(page.getByText('Rolled back: 10 record(s) restored')).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: '07 F&B Items' }).first()).toContainText('Rolled back');
  await expect(page.getByText('Unpublished changes').first()).toBeVisible();

  // Module-level buttons sit next to "Add" in the content screens.
  await page.goto(`/admin/h/${hid}/spa`);
  await expect(page.getByRole('button', { name: 'Import Excel' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export Excel' }).first()).toBeVisible();
});
