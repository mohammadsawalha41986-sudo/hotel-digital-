import type pg from 'pg';
import type { Module } from '../../../shared/domain';
import type { Queryable } from '../../db';

/**
 * Shared Excel import/export framework. One engine owns parsing, header
 * validation, row results, duplicate detection, image checks, create/update
 * modes, the transaction, change tracking and rollback. Module adapters only
 * describe their columns and how one validated row is applied.
 */

/** Normalised spreadsheet cell. */
export type Cell = string | number | boolean | Date | null;

export type ImportMode = 'create_only' | 'create_update';

export interface ColumnDef {
  /** Stable machine key (also accepted as a header). */
  key: string;
  /** Staff-facing header. */
  header: string;
  required?: boolean;
  /** One-line guidance shown in the header note and the Instructions sheet. */
  hint: string;
  example?: string;
  /** Dropdown values. `strict` rejects other values in Excel; otherwise Excel only warns. */
  list?: { values: readonly string[]; strict: boolean };
  /** Column holds image/video URLs (checked during preview). */
  media?: 'image' | 'video' | 'gallery';
  width?: number;
}

export type RowAction = 'create' | 'update' | 'unchanged' | 'skipped' | 'error';

export interface RowMessage {
  level: 'error' | 'warning';
  column?: string;
  message: string;
}

export interface RowResult {
  sheet: string;
  /** Exact Excel row number (header = row 1). */
  row: number;
  code: string;
  name: string;
  action: RowAction;
  duplicate?: boolean;
  messages: RowMessage[];
}

export interface ParsedRow {
  row: number;
  values: Record<string, Cell>;
}

export interface ParsedSheet {
  template: string;
  sheetName: string;
  /** Column keys present in the file (in file order). */
  columns: string[];
  rows: ParsedRow[];
}

/** One reversible change, recorded while a batch commits. */
export interface Change {
  sheet: string;
  /** State store kind, e.g. entity:menu_items, department, hotel_profile, site. */
  kind: string;
  ref: string;
  label: string;
  op: 'create' | 'update';
  before: unknown;
  after: unknown;
}

/** The hotel a template is generated or exported for. */
export interface HotelScope {
  hotelId: string;
  /** IANA zone; dates in sheets are hotel-local wall-clock time. */
  timezone: string;
  db: Queryable;
}

export interface ApplyContext {
  client: pg.PoolClient;
  hotelId: string;
  timezone: string;
  mode: ImportMode;
  /** Changes are pushed here by adapters (through `record`). */
  changes: Change[];
  /** Adapter-private cache for the duration of one batch run. */
  cache: Map<string, unknown>;
}

export interface TemplateAdapter {
  key: string;
  /** Two-digit catalogue number (01…22). */
  number: string;
  title: string;
  title_ar: string;
  /** Excel sheet name (≤ 31 characters). */
  sheet: string;
  description: string;
  modules: readonly Module[];
  /** Admin screens that open this template from their Import/Export buttons. */
  entities?: readonly string[];
  /** Records are only updated (never created) — e.g. prices, routing. */
  updateOnly?: boolean;
  columns(h: HotelScope): Promise<ColumnDef[]>;
  exportRows(h: HotelScope): Promise<Record<string, Cell>[]>;
  /** Applies every row inside the batch transaction; returns one result per row. */
  apply(sheet: ParsedSheet, ctx: ApplyContext): Promise<RowResult[]>;
}
