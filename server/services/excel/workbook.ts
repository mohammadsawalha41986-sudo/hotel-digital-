import ExcelJS from 'exceljs';
import { HttpError } from '../../errors';
import { isBlank } from './cells';
import { norm, templateForSheet } from './templates';
import type { Cell, ColumnDef, HotelScope, ParsedSheet, TemplateAdapter } from './types';

export const MAX_ROWS_PER_SHEET = 5000;
export const MAX_FILE_BYTES = 8 * 1024 * 1024;
const RESERVED_SHEETS = new Set(['instructions', 'lists', 'تعليمات']);

const COLOR = { ink: 'FF1F2937', head: 'FF1F2937', required: 'FF7A1F2B', muted: 'FF6B7280', band: 'FFF3F4F6', white: 'FFFFFFFF' };

function colLetter(n: number): string {
  let s = '';
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
}

const INSTRUCTIONS_EN = [
  'How to use this workbook',
  '1. Fill one row per record in the data sheet(s). Row 1 holds the column headers — do not rename or delete it.',
  '2. Columns marked * are required. Hover a header to see what it expects; dropdowns show the allowed values.',
  '3. Codes (e.g. OUTLET-FLORA, CAT-COFFEE, ITEM-LATTE) identify records. Keep the code of an existing record to update it; leave the code empty on a new row to generate one from the English name. Never reuse a code for a different record.',
  '4. Relationships use codes: an item names its category by Category Code, a category its menu by Menu Code, and so on. Records created earlier in the same workbook can be referenced.',
  '5. Images: paste a full https:// link in the Image URL column. Several gallery images go in one cell separated by | (URL1|URL2|URL3). Images are optional — you can add or replace them later in Admin.',
  '6. Dates are hotel local time: YYYY-MM-DD or YYYY-MM-DD HH:MM. Yes/no columns accept yes / no.',
  '7. In an update, an empty cell clears that field. To leave a field unchanged, delete its whole column.',
  '8. Upload the file in Admin → Data Import & Export. Nothing is saved until you have reviewed the preview (with the exact row number of every error or warning) and confirmed.',
  '9. CREATE ONLY adds new records and skips existing ones. CREATE + UPDATE also updates existing records matched by code.',
  '10. Every import is recorded in Import History and can be rolled back while the records have not been edited since. Imported content goes live after you publish.',
];
const INSTRUCTIONS_AR = [
  'طريقة استخدام الملف',
  '١. املأ صفاً واحداً لكل سجل. الصف الأول يحتوي عناوين الأعمدة — لا تغيّرها ولا تحذفها.',
  '٢. الأعمدة المعلّمة بـ * إلزامية. القوائم المنسدلة تعرض القيم المسموحة.',
  '٣. الرموز (مثل OUTLET-FLORA و ITEM-LATTE) تحدد السجلات. احتفظ برمز السجل الموجود لتحديثه، واترك الرمز فارغاً للسجل الجديد ليتم إنشاؤه تلقائياً.',
  '٤. العلاقات تتم بالرموز: الصنف يشير إلى فئته برمز الفئة، والفئة إلى قائمتها برمز القائمة.',
  '٥. الصور: ضع رابط https كاملاً. صور المعرض في خلية واحدة يفصل بينها | . الصور اختيارية ويمكن إضافتها لاحقاً من لوحة التحكم.',
  '٦. التواريخ بتوقيت الفندق: YYYY-MM-DD أو YYYY-MM-DD HH:MM. أعمدة نعم/لا تقبل yes أو no.',
  '٧. عند التحديث، الخلية الفارغة تمسح القيمة. لإبقاء الحقل كما هو احذف العمود بالكامل.',
  '٨. ارفع الملف من لوحة التحكم ← استيراد وتصدير البيانات. لن يُحفظ شيء قبل مراجعة المعاينة (مع رقم الصف لكل خطأ أو تنبيه) والتأكيد.',
  '٩. «إنشاء فقط» يضيف السجلات الجديدة ويتجاوز الموجودة. «إنشاء وتحديث» يحدّث أيضاً السجلات الموجودة حسب الرمز.',
  '١٠. كل عملية استيراد تُسجّل في سجل الاستيراد ويمكن التراجع عنها ما لم تُعدَّل السجلات بعدها. يظهر المحتوى للنزلاء بعد النشر.',
];

export interface BuildOptions {
  title: string;
  hotelName: string;
  /** Include the hotel's current records (export) or leave the sheets empty (template). */
  withData: boolean;
}

/** Builds a template or export workbook from one or more adapters. */
export async function buildWorkbook(adapters: readonly TemplateAdapter[], h: HotelScope, o: BuildOptions): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hotel Guest Hub';
  wb.created = new Date();
  wb.title = o.title;

  const info = wb.addWorksheet('Instructions', { properties: { tabColor: { argb: COLOR.required } } });
  const lists = wb.addWorksheet('Lists', { state: 'veryHidden' });
  let listCol = 0;
  /** Writes a dropdown list to the hidden Lists sheet and returns its range. */
  const listRange = (values: readonly string[]) => {
    listCol++;
    const L = colLetter(listCol);
    values.forEach((v, i) => (lists.getCell(`${L}${i + 1}`).value = v));
    return `Lists!$${L}$1:$${L}$${Math.max(values.length, 1)}`;
  };

  // ------------------------------ Instructions ------------------------------
  info.columns = [{ width: 30 }, { width: 11 }, { width: 70 }, { width: 44 }, { width: 30 }];
  info.getCell('A1').value = o.title;
  info.getCell('A1').font = { size: 16, bold: true, color: { argb: COLOR.ink } };
  info.getCell('A2').value = `${o.hotelName} · ${o.withData ? 'Data export' : 'Blank template'} · ${new Date().toISOString().slice(0, 10)}`;
  info.getCell('A2').font = { color: { argb: COLOR.muted } };
  let r = 4;
  for (const [i, line] of INSTRUCTIONS_EN.entries()) {
    const c = info.getCell(`A${r}`);
    c.value = line;
    c.font = i === 0 ? { bold: true, size: 12 } : {};
    info.mergeCells(`A${r}:E${r}`);
    c.alignment = { wrapText: true, vertical: 'top' };
    info.getRow(r).height = i === 0 ? 18 : Math.max(15, Math.ceil(line.length / 150) * 15);
    r++;
  }
  r++;
  for (const [i, line] of INSTRUCTIONS_AR.entries()) {
    const c = info.getCell(`A${r}`);
    c.value = line;
    c.font = i === 0 ? { bold: true, size: 12 } : {};
    info.mergeCells(`A${r}:E${r}`);
    c.alignment = { wrapText: true, vertical: 'top', horizontal: 'right', readingOrder: 'rtl' };
    info.getRow(r).height = i === 0 ? 18 : Math.max(15, Math.ceil(line.length / 130) * 15);
    r++;
  }

  const sheetsWithColumns: { a: TemplateAdapter; cols: ColumnDef[] }[] = [];
  for (const a of adapters) sheetsWithColumns.push({ a, cols: await a.columns(h) });

  for (const { a, cols } of sheetsWithColumns) {
    r += 2;
    const head = info.getCell(`A${r}`);
    head.value = `${a.number} ${a.title} — sheet “${a.sheet}”${a.updateOnly ? ' (updates existing records only)' : ''}`;
    head.font = { bold: true, size: 12, color: { argb: COLOR.required } };
    info.mergeCells(`A${r}:E${r}`);
    r++;
    info.getCell(`A${r}`).value = `${a.description}  ·  ${a.title_ar}`;
    info.mergeCells(`A${r}:E${r}`);
    r++;
    ['Column', 'Required', 'What to enter', 'Allowed values', 'Example'].forEach((t, i) => {
      const c = info.getCell(r, i + 1);
      c.value = t;
      c.font = { bold: true, color: { argb: COLOR.white } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.head } };
    });
    r++;
    for (const col of cols) {
      const allowed = col.list ? (col.list.values.length > 12 ? `${col.list.values.slice(0, 12).join(', ')}, … (dropdown)` : col.list.values.join(', ')) : '';
      const row = info.getRow(r);
      row.values = [col.header, col.required ? 'Required' : 'Optional', col.hint, allowed, col.example ?? ''];
      row.getCell(3).alignment = { wrapText: true, vertical: 'top' };
      row.getCell(4).alignment = { wrapText: true, vertical: 'top' };
      if (col.required) row.getCell(2).font = { bold: true, color: { argb: COLOR.required } };
      r++;
    }
  }

  // ------------------------------ Data sheets ------------------------------
  for (const { a, cols } of sheetsWithColumns) {
    const ws = wb.addWorksheet(a.sheet, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = cols.map((c) => ({ key: c.key, width: c.width ?? Math.max(12, Math.min(40, c.header.length + 4)) }));
    const header = ws.getRow(1);
    cols.forEach((c, i) => {
      const cell = header.getCell(i + 1);
      cell.value = c.required ? `${c.header} *` : c.header;
      cell.font = { bold: true, color: { argb: COLOR.white } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.required ? COLOR.required : COLOR.head } };
      cell.alignment = { vertical: 'middle', wrapText: true };
      if (c.hint) cell.note = { texts: [{ text: `${c.hint}${c.example ? `\nExample: ${c.example}` : ''}` }] };
    });
    header.height = 30;
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };

    const rows = o.withData ? await a.exportRows(h) : [];
    for (const data of rows) ws.addRow(cols.map((c) => (data[c.key] === undefined ? null : data[c.key])));
    cols.forEach((c, i) => {
      if (c.key.endsWith('_ar')) ws.getColumn(i + 1).alignment = { horizontal: 'right', readingOrder: 'rtl' };
    });

    const last = Math.max(rows.length + 300, 500);
    cols.forEach((c, i) => {
      if (!c.list || !c.list.values.length) return;
      const L = colLetter(i + 1);
      // exceljs supports range validations at runtime; its typings only expose per-cell ones.
      (ws as unknown as { dataValidations: { add(range: string, v: ExcelJS.DataValidation): void } }).dataValidations.add(`${L}2:${L}${last}`, {
        type: 'list',
        allowBlank: true,
        formulae: [listRange(c.list.values)],
        showErrorMessage: true,
        errorStyle: c.list.strict ? 'stop' : 'warning',
        errorTitle: c.header,
        error: c.list.strict ? `Choose one of the listed values for ${c.header}.` : `${c.header} is not in the current list. It must exist in this hotel (or earlier in this workbook).`,
      });
    });
  }
  info.views = [{ state: 'normal', activeCell: 'A1' }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ------------------------------ Parsing ------------------------------
/** Flattens exceljs cell values; dates become hotel wall-clock strings. */
function cellValue(v: ExcelJS.CellValue): Cell {
  if (v == null) return null;
  if (v instanceof Date) {
    const iso = v.toISOString();
    if (v.getUTCFullYear() < 1901) return iso.slice(11, 16); // time-only cell
    return iso.slice(11, 16) === '00:00' ? iso.slice(0, 10) : `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
  }
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map((t) => t.text).join('');
    if ('hyperlink' in v) {
      const t = (v as { text?: unknown }).text;
      if (typeof t === 'string') return t;
      if (t && typeof t === 'object' && 'richText' in (t as object)) return (t as { richText: { text: string }[] }).richText.map((x) => x.text).join('');
      return v.hyperlink;
    }
    if ('formula' in v || 'sharedFormula' in v) return cellValue((v as { result?: ExcelJS.CellValue }).result ?? null);
    if ('error' in v) return null;
    return null;
  }
  if (typeof v === 'string') return v.replace(/\u0000/g, '');
  return v as Cell;
}

export interface ParseOutcome {
  sheets: ParsedSheet[];
  /** File/sheet level problems; any error blocks the import. */
  issues: { level: 'error' | 'warning'; sheet?: string; message: string }[];
}

/**
 * Reads an uploaded workbook. `expected` is the single template the upload is
 * for, or null for the master workbook (sheets matched by name).
 */
export async function parseWorkbook(buf: Buffer, expected: TemplateAdapter | null, allowed: readonly TemplateAdapter[], h: HotelScope): Promise<ParseOutcome> {
  const out: ParseOutcome = { sheets: [], issues: [] };
  if (buf.length > MAX_FILE_BYTES) throw new HttpError(413, 'file_too_large', `The file is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB`);
  if (buf.subarray(0, 4).toString('hex') !== '504b0304') {
    throw new HttpError(415, 'unsupported_file', 'Upload an Excel .xlsx file (older .xls and .csv files are not supported — use “Save as .xlsx”)');
  }
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
  } catch {
    throw new HttpError(422, 'invalid_file', 'The file could not be read as an Excel workbook');
  }
  const dataSheets = wb.worksheets.filter((ws) => ws.state === 'visible' && !RESERVED_SHEETS.has(ws.name.trim().toLowerCase()));
  const used = new Set<string>();
  for (const ws of dataSheets) {
    let a: TemplateAdapter | undefined;
    if (expected) {
      const byName = templateForSheet(ws.name);
      if (byName && byName.key !== expected.key) {
        out.issues.push({ level: 'error', sheet: ws.name, message: `Sheet “${ws.name}” belongs to the ${byName.title} template, not ${expected.title}. Upload it there or use the master workbook.` });
        continue;
      }
      if (used.has(expected.key)) {
        out.issues.push({ level: 'warning', sheet: ws.name, message: `Sheet “${ws.name}” was ignored — only the first data sheet is imported for this template` });
        continue;
      }
      a = expected;
    } else {
      a = templateForSheet(ws.name);
      if (!a) {
        out.issues.push({ level: 'warning', sheet: ws.name, message: `Sheet “${ws.name}” is not a known template and was ignored` });
        continue;
      }
      if (used.has(a.key)) {
        out.issues.push({ level: 'error', sheet: ws.name, message: `Two sheets are for ${a.title}; keep one` });
        continue;
      }
    }
    if (!allowed.some((x) => x.key === a!.key)) {
      out.issues.push({ level: 'error', sheet: ws.name, message: `You do not have access to import ${a.title}` });
      continue;
    }
    used.add(a.key);

    const cols = await a.columns(h);
    const byHeader = new Map<string, ColumnDef>();
    for (const c of cols) {
      byHeader.set(norm(c.header), c);
      byHeader.set(norm(c.key), c);
    }
    const header = ws.getRow(1);
    const mapping = new Map<number, string>();
    const seenKeys = new Map<string, string>();
    header.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const raw = String(cellValue(cell.value) ?? '').trim();
      if (!raw) return;
      const c = byHeader.get(norm(raw));
      if (!c) {
        out.issues.push({ level: 'warning', sheet: ws.name, message: `Column “${raw}” is not recognised and was ignored` });
        return;
      }
      if (seenKeys.has(c.key)) {
        out.issues.push({ level: 'error', sheet: ws.name, message: `Column “${raw}” appears twice (also “${seenKeys.get(c.key)}”)` });
        return;
      }
      seenKeys.set(c.key, raw);
      mapping.set(colNumber, c.key);
    });
    if (!mapping.size) {
      out.issues.push({ level: 'error', sheet: ws.name, message: 'Row 1 must contain the column headers of the template' });
      continue;
    }
    const missing = cols.filter((c) => c.required && !seenKeys.has(c.key));
    if (missing.length) {
      out.issues.push({ level: 'error', sheet: ws.name, message: `Required column(s) missing: ${missing.map((m) => m.header).join(', ')}` });
      continue;
    }
    if (!seenKeys.has('code') && cols.some((c) => c.key === 'code')) {
      out.issues.push({ level: 'warning', sheet: ws.name, message: 'No Code column — records are matched by English name and new codes are generated. Export first to get the codes.' });
    }

    const rows: ParsedSheet['rows'] = [];
    let tooMany = false;
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1 || tooMany) return;
      const values: Record<string, Cell> = {};
      for (const [col, key] of mapping) values[key] = cellValue(row.getCell(col).value);
      if (Object.values(values).every(isBlank)) return;
      if (rows.length >= MAX_ROWS_PER_SHEET) {
        tooMany = true;
        return;
      }
      rows.push({ row: rowNumber, values });
    });
    if (tooMany) {
      out.issues.push({ level: 'error', sheet: ws.name, message: `More than ${MAX_ROWS_PER_SHEET} rows — split the file` });
      continue;
    }
    out.sheets.push({ template: a.key, sheetName: ws.name, columns: [...mapping.values()], rows });
  }
  if (!out.sheets.length && !out.issues.some((i) => i.level === 'error')) {
    out.issues.push({ level: 'error', message: expected ? `No data sheet found for ${expected.title}` : 'No template sheets found in the workbook' });
  }
  if (out.sheets.length && out.sheets.every((s) => !s.rows.length)) out.issues.push({ level: 'error', message: 'The file has no data rows' });
  return out;
}
