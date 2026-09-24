import ExcelJS from 'exceljs';
import { z } from 'zod';
import { ORDER_SOURCES, ORDER_TYPES, maskPhone } from '../../shared/commerce';
import { REQUEST_STATUSES } from '../../shared/domain';
import { one, q } from '../db';
import { badRequest } from '../errors';

/** One filter model for dashboards, order search, reports and exports. */
export const reportFilterSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hotel_id: z.string().uuid().optional(),
  department: z.string().regex(/^[A-Z][A-Z0-9_]{1,31}$/).optional(),
  order_type: z.enum(ORDER_TYPES).optional(),
  status: z.enum([...REQUEST_STATUSES, 'OPEN']).optional(),
  source: z.enum(ORDER_SOURCES).optional(),
  guest_type: z.enum(['IN_HOUSE', 'EXTERNAL']).optional(),
  financial_status: z.string().regex(/^[A-Z_]{3,40}$/).optional(),
  settlement: z.string().trim().max(40).optional(),
  service: z.string().trim().max(80).optional(),
  search: z.string().trim().max(80).optional(),
  commercial_only: z.enum(['1', '0']).optional(),
});
export type ReportFilter = z.infer<typeof reportFilterSchema>;

export interface Scope {
  /** null = every hotel (platform roles). */
  hotelIds: string[] | null;
  /** Departments the viewer may see. */
  departments: readonly string[];
}

const TZ = `COALESCE(h.profile->>'timezone', 'Asia/Riyadh')`;

/** WHERE clause over `requests r JOIN hotels h`. */
export function orderWhere(scope: Scope, f: ReportFilter, dateCol = 'r.created_at') {
  const params: unknown[] = [];
  const where: string[] = [];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  if (scope.hotelIds) where.push(`r.hotel_id = ANY(${p(scope.hotelIds)}::uuid[])`);
  if (f.hotel_id) where.push(`r.hotel_id = ${p(f.hotel_id)}`);
  where.push(`r.department = ANY(${p(scope.departments)}::text[])`);
  if (f.from) where.push(`(${dateCol} AT TIME ZONE ${TZ})::date >= ${p(f.from)}::date`);
  if (f.to) where.push(`(${dateCol} AT TIME ZONE ${TZ})::date <= ${p(f.to)}::date`);
  if (f.department) where.push(`r.department = ${p(f.department)}`);
  if (f.order_type) where.push(`r.order_type = ${p(f.order_type)}`);
  if (f.status === 'OPEN') where.push(`r.status IN ('NEW','ACCEPTED','IN_PROGRESS','READY')`);
  else if (f.status) where.push(`r.status = ${p(f.status)}`);
  if (f.source) where.push(`r.source = ${p(f.source)}`);
  if (f.guest_type) where.push(`r.guest_type = ${p(f.guest_type)}`);
  if (f.financial_status) where.push(`r.financial_status = ${p(f.financial_status)}`);
  if (f.commercial_only !== '0') where.push(`r.is_commercial`);
  if (f.service) {
    const v = p(`%${f.service.replace(/[%_\\]/g, '\\$&')}%`);
    where.push(`(r.title_en ILIKE ${v} OR r.title_ar ILIKE ${v} OR EXISTS (SELECT 1 FROM order_lines ol WHERE ol.request_id = r.id AND (ol.item_code ILIKE ${v} OR ol.name_en ILIKE ${v} OR ol.name_ar ILIKE ${v})))`);
  }
  if (f.settlement) {
    const v = p(f.settlement.toUpperCase());
    where.push(`EXISTS (SELECT 1 FROM commission_ledger l JOIN settlements s ON s.id = l.settlement_id WHERE l.request_id = r.id AND s.settlement_no = ${v})`);
  }
  if (f.search) {
    const like = p(`%${f.search.replace(/[%_\\]/g, '\\$&')}%`);
    const digits = f.search.replace(/\D/g, '').replace(/^0+/, ''); // local form 05… matches +9665…
    const phone = `${p(digits.length >= 4 ? `%${digits}%` : null)}::text`;
    where.push(`(r.reference ILIKE ${like} OR r.room ILIKE ${like} OR r.guest_name ILIKE ${like} OR (${phone} IS NOT NULL AND regexp_replace(r.guest_phone, '\\D', '', 'g') LIKE ${phone})
      OR r.hotel_name ILIKE ${like} OR EXISTS (SELECT 1 FROM guests g WHERE g.id = r.guest_id AND g.guest_no ILIKE ${like}))`);
  }
  return { sql: where.join(' AND ') || 'true', params };
}

export async function searchOrders(scope: Scope, f: ReportFilter, opts: { limit: number; offset: number; showPii: boolean; showFinance: boolean }) {
  const { sql, params } = orderWhere(scope, f);
  const n = params.length;
  const rows = await q(
    `SELECT r.id, r.hotel_id, r.hotel_name, r.reference, r.type, r.order_type, r.department, r.source, r.status, r.title_en, r.title_ar,
            r.guest_type, r.guest_name, r.guest_phone, r.room, r.total, r.currency, r.financial_status, r.is_commercial,
            r.created_at, r.accepted_at, r.completed_at, r.cancelled_at, g.guest_no, g.id AS guest_id,
            ${opts.showFinance ? `l.commission_minor, l.rate_bps, l.status AS ledger_status, s.settlement_no` : 'NULL AS commission_minor, NULL AS rate_bps, NULL AS ledger_status, NULL AS settlement_no'}
       FROM requests r JOIN hotels h ON h.id = r.hotel_id
       LEFT JOIN guests g ON g.id = r.guest_id
       LEFT JOIN commission_ledger l ON l.request_id = r.id AND l.entry_type = 'COMMISSION'
       LEFT JOIN settlements s ON s.id = l.settlement_id
      WHERE ${sql}
      ORDER BY r.created_at DESC LIMIT $${n + 1} OFFSET $${n + 2}`,
    [...params, opts.limit, opts.offset]
  );
  const total = await one<{ n: number; value: number }>(
    `SELECT COUNT(*) AS n, COALESCE(SUM(r.total) FILTER (WHERE r.status = 'COMPLETED'), 0)::float AS value FROM requests r JOIN hotels h ON h.id = r.hotel_id WHERE ${sql}`,
    params
  );
  return { orders: rows.map((r) => redact(r, opts.showPii)), total: total?.n ?? 0, completed_value: total?.value ?? 0 };
}

export function redact<T extends Record<string, any>>(r: T, showPii: boolean): T {
  if (showPii) return r;
  return { ...r, guest_name: r.guest_name ? `${String(r.guest_name).split(' ')[0].slice(0, 1)}•••` : '', guest_phone: maskPhone(r.guest_phone ?? '') };
}

// ---------------------------------------------------------------------------
// Dashboards
// ---------------------------------------------------------------------------
export async function orderDashboard(scope: Scope, f: ReportFilter, showFinance: boolean) {
  const { sql, params } = orderWhere(scope, { ...f, commercial_only: '0' });
  const base = `FROM requests r JOIN hotels h ON h.id = r.hotel_id WHERE ${sql}`;
  const today = `(r.created_at AT TIME ZONE ${TZ})::date = (now() AT TIME ZONE ${TZ})::date`;
  const [summary, byDept, byType, bySource, byService, recent] = await Promise.all([
    one(
      `SELECT COUNT(*) FILTER (WHERE r.is_commercial AND ${today}) AS orders_today,
              COUNT(*) FILTER (WHERE r.is_commercial) AS orders,
              COUNT(*) FILTER (WHERE r.is_commercial AND r.status = 'NEW') AS new,
              COUNT(*) FILTER (WHERE r.is_commercial AND r.status IN ('NEW','ACCEPTED','IN_PROGRESS','READY')) AS pending,
              COUNT(*) FILTER (WHERE r.is_commercial AND r.status IN ('IN_PROGRESS','READY')) AS in_progress,
              COUNT(*) FILTER (WHERE r.is_commercial AND r.status = 'COMPLETED') AS completed,
              COUNT(*) FILTER (WHERE r.is_commercial AND r.status IN ('CANCELLED','REJECTED')) AS cancelled,
              COALESCE(SUM(r.total) FILTER (WHERE r.is_commercial AND r.status = 'COMPLETED'), 0)::float AS order_value,
              ROUND(AVG(r.total) FILTER (WHERE r.is_commercial AND r.status = 'COMPLETED')::numeric, 2)::float AS average_order_value,
              COUNT(*) FILTER (WHERE NOT r.is_commercial) AS service_requests,
              COUNT(*) FILTER (WHERE r.financial_status IN ('RULE_UNAVAILABLE','HISTORICAL_RULE_UNAVAILABLE')) AS rule_unavailable
         ${base}`,
      params
    ),
    q(`SELECT r.department, COUNT(*) AS n, COALESCE(SUM(r.total) FILTER (WHERE r.status = 'COMPLETED'), 0)::float AS value ${base} AND r.is_commercial GROUP BY 1 ORDER BY n DESC`, params),
    q(`SELECT r.order_type, COUNT(*) AS n, COALESCE(SUM(r.total) FILTER (WHERE r.status = 'COMPLETED'), 0)::float AS value ${base} AND r.is_commercial GROUP BY 1 ORDER BY n DESC`, params),
    q(`SELECT r.source, COUNT(*) AS n ${base} AND r.is_commercial GROUP BY 1 ORDER BY n DESC`, params),
    q(
      `SELECT ol.name_en, ol.name_ar, ol.item_code, SUM(ol.quantity)::int AS qty, COUNT(DISTINCT r.id)::int AS orders, SUM(ol.gross_minor)::bigint AS value_minor
         FROM order_lines ol JOIN requests r ON r.id = ol.request_id JOIN hotels h ON h.id = r.hotel_id
        WHERE ${sql} AND r.is_commercial AND r.status NOT IN ('CANCELLED','REJECTED')
        GROUP BY 1, 2, 3 ORDER BY orders DESC, qty DESC LIMIT 10`,
      params
    ),
    q(
      `SELECT r.id, r.hotel_id, r.hotel_name, r.reference, r.order_type, r.status, r.title_en, r.title_ar, r.room, r.total, r.currency, r.created_at, r.financial_status
         ${base} AND r.is_commercial ORDER BY r.created_at DESC LIMIT 10`,
      params
    ),
  ]);
  let finance = null;
  if (showFinance) {
    const { sql: lsql, params: lp } = orderWhere(scope, { ...f, commercial_only: '0' }, 'l.earned_at');
    finance = await one(
      `SELECT COUNT(DISTINCT l.request_id) FILTER (WHERE l.entry_type = 'COMMISSION') AS eligible_orders,
              COALESCE(SUM(l.gross_minor) FILTER (WHERE l.entry_type = 'COMMISSION'), 0) AS gross_minor,
              COALESCE(SUM(l.base_minor), 0) AS base_minor,
              COALESCE(SUM(l.commission_minor), 0) AS commission_minor,
              COALESCE(SUM(l.commission_tax_minor), 0) AS commission_tax_minor,
              COALESCE(SUM(l.platform_revenue_minor), 0) AS platform_revenue_minor,
              COALESCE(SUM(l.commission_minor) FILTER (WHERE l.entry_type = 'ADJUSTMENT'), 0) AS adjustments_minor,
              COALESCE(SUM(l.gross_minor - l.hotel_amount_minor) FILTER (WHERE l.settlement_id IS NULL AND l.status <> 'DISPUTED'), 0) AS unsettled_due_minor
         FROM commission_ledger l JOIN requests r ON r.id = l.request_id JOIN hotels h ON h.id = r.hotel_id WHERE ${lsql}`,
      lp
    );
  }
  return { summary, by_department: byDept, by_order_type: byType, by_source: bySource, by_service: byService, recent, finance };
}

export async function platformDashboard(f: ReportFilter) {
  const scope: Scope = { hotelIds: null, departments: await allDepartments() };
  const ops = await orderDashboard(scope, f, true);
  const hotelFilter = f.hotel_id ? `WHERE s.hotel_id = $1` : '';
  const hp = f.hotel_id ? [f.hotel_id] : [];
  const [hotels, settlements, byHotel] = await Promise.all([
    one<{ n: number }>(`SELECT COUNT(*) AS n FROM hotels ${f.hotel_id ? 'WHERE id = $1' : ''}`, hp),
    one(
      `SELECT COALESCE(SUM(amount_due_minor) FILTER (WHERE status IN ('DRAFT','REVIEWED','APPROVED')), 0) AS outstanding_minor,
              COUNT(*) FILTER (WHERE status IN ('DRAFT','REVIEWED','APPROVED')) AS outstanding_count,
              COALESCE(SUM(amount_due_minor) FILTER (WHERE status = 'SETTLED'), 0) AS settled_minor,
              COUNT(*) FILTER (WHERE status = 'SETTLED') AS settled_count
         FROM settlements s ${hotelFilter}`,
      hp
    ),
    (() => {
      const { sql, params } = orderWhere(scope, { ...f, commercial_only: '0' }, 'l.earned_at');
      return q(
        `SELECT h.id AS hotel_id, h.name_en AS hotel_name,
                COUNT(DISTINCT l.request_id) FILTER (WHERE l.entry_type = 'COMMISSION') AS eligible_orders,
                COALESCE(SUM(l.gross_minor) FILTER (WHERE l.entry_type = 'COMMISSION'), 0) AS gross_minor,
                COALESCE(SUM(l.base_minor), 0) AS base_minor,
                COALESCE(SUM(l.commission_minor), 0) AS commission_minor,
                COALESCE(SUM(l.platform_revenue_minor), 0) AS platform_revenue_minor
           FROM commission_ledger l JOIN requests r ON r.id = l.request_id JOIN hotels h ON h.id = r.hotel_id
          WHERE ${sql} GROUP BY h.id, h.name_en ORDER BY commission_minor DESC`,
        params
      );
    })(),
  ]);
  return { ...ops, total_hotels: hotels?.n ?? 0, settlements, by_hotel: byHotel };
}

export async function allDepartments(): Promise<string[]> {
  return (await q<{ code: string }>(`SELECT DISTINCT code FROM departments`)).map((r) => r.code);
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export interface ReportColumn {
  key: string;
  label: string;
  money?: boolean; // minor units → major in exports
}
export interface Report {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
}

export const REPORTS = {
  orders_by_hotel: { title: 'Orders by hotel', finance: false, platformOnly: true },
  orders_by_department: { title: 'Orders by department', finance: false, platformOnly: false },
  orders_by_service: { title: 'Orders by service', finance: false, platformOnly: false },
  orders_by_guest_type: { title: 'Orders by guest type', finance: false, platformOnly: false },
  orders_by_source: { title: 'Orders by source', finance: false, platformOnly: false },
  average_order_value: { title: 'Average order value', finance: false, platformOnly: false },
  cancellation_rate: { title: 'Cancellation rate', finance: false, platformOnly: false },
  commission_revenue: { title: 'Commission revenue', finance: true, platformOnly: false },
  settlements: { title: 'Settlements', finance: true, platformOnly: false },
  adjustments: { title: 'Adjustments', finance: true, platformOnly: false },
} as const;
export type ReportKey = keyof typeof REPORTS;

const ORDER_COLS: ReportColumn[] = [
  { key: 'orders', label: 'Orders' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled / declined' },
  { key: 'value', label: 'Completed value' },
  { key: 'average', label: 'Average order value' },
];
const orderAgg = `COUNT(*) AS orders, COUNT(*) FILTER (WHERE r.status = 'COMPLETED') AS completed,
  COUNT(*) FILTER (WHERE r.status IN ('CANCELLED','REJECTED')) AS cancelled,
  COALESCE(SUM(r.total) FILTER (WHERE r.status = 'COMPLETED'), 0)::float AS value,
  ROUND(AVG(r.total) FILTER (WHERE r.status = 'COMPLETED')::numeric, 2)::float AS average`;

export async function runReport(key: ReportKey, scope: Scope, f: ReportFilter): Promise<Report> {
  const { sql, params } = orderWhere(scope, f);
  const from = `FROM requests r JOIN hotels h ON h.id = r.hotel_id WHERE ${sql}`;
  const group = async (dimension: string, label: string, keyName: string) => ({
    title: REPORTS[key].title,
    columns: [{ key: keyName, label }, ...ORDER_COLS],
    rows: await q(`SELECT ${dimension} AS ${keyName}, ${orderAgg} ${from} GROUP BY 1 ORDER BY orders DESC`, params),
  });
  switch (key) {
    case 'orders_by_hotel':
      return group('r.hotel_name', 'Hotel', 'hotel');
    case 'orders_by_department':
      return group('r.department', 'Department', 'department');
    case 'orders_by_guest_type':
      return group('r.guest_type', 'Guest type', 'guest_type');
    case 'orders_by_source':
      return group('r.source', 'Source', 'source');
    case 'orders_by_service':
      return {
        title: REPORTS[key].title,
        columns: [{ key: 'code', label: 'Code' }, { key: 'service', label: 'Service / item' }, { key: 'orders', label: 'Orders' }, { key: 'quantity', label: 'Quantity' }, { key: 'value_minor', label: 'Value', money: true }],
        rows: await q(
          `SELECT ol.item_code AS code, ol.name_en AS service, COUNT(DISTINCT r.id) AS orders, SUM(ol.quantity)::int AS quantity, SUM(ol.gross_minor)::bigint AS value_minor
             FROM order_lines ol JOIN requests r ON r.id = ol.request_id JOIN hotels h ON h.id = r.hotel_id
            WHERE ${sql} AND r.status NOT IN ('CANCELLED','REJECTED') GROUP BY 1, 2 ORDER BY orders DESC, quantity DESC`,
          params
        ),
      };
    case 'average_order_value':
      return group('r.order_type', 'Order type', 'order_type');
    case 'cancellation_rate':
      return {
        title: REPORTS[key].title,
        columns: [{ key: 'department', label: 'Department' }, { key: 'orders', label: 'Orders' }, { key: 'cancelled', label: 'Cancelled / declined' }, { key: 'rate_pct', label: 'Cancellation rate %' }],
        rows: await q(
          `SELECT r.department, COUNT(*) AS orders, COUNT(*) FILTER (WHERE r.status IN ('CANCELLED','REJECTED')) AS cancelled,
                  ROUND(100.0 * COUNT(*) FILTER (WHERE r.status IN ('CANCELLED','REJECTED')) / NULLIF(COUNT(*), 0), 2)::float AS rate_pct
             ${from} GROUP BY 1 ORDER BY rate_pct DESC NULLS LAST`,
          params
        ),
      };
    case 'commission_revenue': {
      const l = orderWhere(scope, f, 'l.earned_at');
      return {
        title: REPORTS[key].title,
        columns: [
          { key: 'month', label: 'Month' },
          { key: 'hotel', label: 'Hotel' },
          { key: 'eligible_orders', label: 'Eligible orders' },
          { key: 'gross_minor', label: 'Gross order value', money: true },
          { key: 'base_minor', label: 'Commission base', money: true },
          { key: 'commission_minor', label: 'Commission', money: true },
          { key: 'tax_minor', label: 'Commission tax', money: true },
          { key: 'revenue_minor', label: 'Platform revenue', money: true },
          { key: 'adjustments_minor', label: 'Adjustments', money: true },
        ],
        rows: await q(
          `SELECT to_char((l.earned_at AT TIME ZONE ${TZ})::date, 'YYYY-MM') AS month, h.name_en AS hotel,
                  COUNT(DISTINCT l.request_id) FILTER (WHERE l.entry_type = 'COMMISSION') AS eligible_orders,
                  COALESCE(SUM(l.gross_minor) FILTER (WHERE l.entry_type = 'COMMISSION'), 0) AS gross_minor,
                  SUM(l.base_minor) AS base_minor, SUM(l.commission_minor) AS commission_minor, SUM(l.commission_tax_minor) AS tax_minor,
                  SUM(l.platform_revenue_minor) AS revenue_minor,
                  COALESCE(SUM(l.commission_minor) FILTER (WHERE l.entry_type = 'ADJUSTMENT'), 0) AS adjustments_minor
             FROM commission_ledger l JOIN requests r ON r.id = l.request_id JOIN hotels h ON h.id = r.hotel_id
            WHERE ${l.sql} GROUP BY 1, 2 ORDER BY 1 DESC, 2`,
          l.params
        ),
      };
    }
    case 'settlements': {
      const params2: unknown[] = [];
      const where: string[] = [];
      if (scope.hotelIds) {
        params2.push(scope.hotelIds);
        where.push(`s.hotel_id = ANY($${params2.length}::uuid[])`);
      }
      if (f.hotel_id) {
        params2.push(f.hotel_id);
        where.push(`s.hotel_id = $${params2.length}`);
      }
      if (f.from) {
        params2.push(f.from);
        where.push(`s.period_end >= $${params2.length}::date`);
      }
      if (f.to) {
        params2.push(f.to);
        where.push(`s.period_start <= $${params2.length}::date`);
      }
      return {
        title: REPORTS[key].title,
        columns: [
          { key: 'settlement_no', label: 'Settlement' },
          { key: 'hotel', label: 'Hotel' },
          { key: 'period', label: 'Period' },
          { key: 'status', label: 'Status' },
          { key: 'order_count', label: 'Orders' },
          { key: 'gross_minor', label: 'Gross order value', money: true },
          { key: 'refunds_minor', label: 'Refunds', money: true },
          { key: 'adjustments_minor', label: 'Adjustments', money: true },
          { key: 'base_minor', label: 'Commission base', money: true },
          { key: 'commission_minor', label: 'Commission', money: true },
          { key: 'commission_tax_minor', label: 'Commission tax', money: true },
          { key: 'hotel_amount_minor', label: 'Hotel amount', money: true },
          { key: 'amount_due_minor', label: 'Due to platform', money: true },
        ],
        rows: await q(
          `SELECT s.settlement_no, h.name_en AS hotel, to_char(s.period_start,'YYYY-MM-DD') || ' → ' || to_char(s.period_end,'YYYY-MM-DD') AS period,
                  s.status, s.order_count, s.gross_minor, s.refunds_minor, s.adjustments_minor, s.base_minor, s.commission_minor,
                  s.commission_tax_minor, s.hotel_amount_minor, s.amount_due_minor
             FROM settlements s JOIN hotels h ON h.id = s.hotel_id ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY s.period_start DESC`,
          params2
        ),
      };
    }
    case 'adjustments': {
      const l = orderWhere(scope, { ...f, commercial_only: '0' }, 'a.created_at');
      return {
        title: REPORTS[key].title,
        columns: [
          { key: 'adjustment_no', label: 'Adjustment' },
          { key: 'hotel', label: 'Hotel' },
          { key: 'reference', label: 'Order' },
          { key: 'adjustment_type', label: 'Type' },
          { key: 'gross_delta_minor', label: 'Order value change', money: true },
          { key: 'commission_delta_minor', label: 'Commission change', money: true },
          { key: 'reason', label: 'Reason' },
          { key: 'created_by_name', label: 'By' },
          { key: 'created_at', label: 'Date' },
        ],
        rows: await q(
          `SELECT a.adjustment_no, h.name_en AS hotel, r.reference, a.adjustment_type, a.gross_delta_minor, a.commission_delta_minor, a.reason,
                  a.created_by_name, to_char(a.created_at AT TIME ZONE ${TZ}, 'YYYY-MM-DD HH24:MI') AS created_at
             FROM financial_adjustments a JOIN requests r ON r.id = a.request_id JOIN hotels h ON h.id = r.hotel_id
            WHERE ${l.sql} ORDER BY a.created_at DESC`,
          l.params
        ),
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
const cell = (c: ReportColumn, v: unknown) => (v == null ? '' : c.money ? Number(v) / 100 : v instanceof Date ? v.toISOString() : v);

export function toCsv(r: Report): string {
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    // Neutralise spreadsheet formulas (CSV injection) and quote when needed.
    const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const lines = [r.columns.map((c) => esc(c.label)).join(','), ...r.rows.map((row) => r.columns.map((c) => esc(cell(c, row[c.key]))).join(','))];
  return '﻿' + lines.join('\r\n');
}

export async function toXlsx(r: Report, meta: Record<string, string> = {}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hotel Digital Guest Hub';
  wb.created = new Date();
  const ws = wb.addWorksheet(r.title.slice(0, 31));
  ws.addRow([r.title]).font = { bold: true, size: 14 };
  for (const [k, v] of Object.entries(meta)) ws.addRow([k, v]);
  ws.addRow([]);
  const header = ws.addRow(r.columns.map((c) => c.label));
  header.font = { bold: true };
  header.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
  });
  for (const row of r.rows) {
    const added = ws.addRow(r.columns.map((c) => cell(c, row[c.key])));
    r.columns.forEach((c, i) => {
      if (c.money) added.getCell(i + 1).numFmt = '#,##0.00';
    });
  }
  r.columns.forEach((c, i) => (ws.getColumn(i + 1).width = Math.min(40, Math.max(12, c.label.length + 4))));
  ws.views = [{ state: 'frozen', ySplit: header.number }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function exportFormat(v: string | undefined): 'json' | 'csv' | 'xlsx' {
  if (!v || v === 'json') return 'json';
  if (v === 'csv' || v === 'xlsx') return v;
  throw badRequest('Format must be json, csv or xlsx');
}
