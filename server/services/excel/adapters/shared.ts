import { HttpError } from '../../../errors';
import { q, type Queryable } from '../../../db';
import type { ApplyContext, ParsedRow, RowMessage, RowResult } from '../types';

/** Helpers every adapter uses to build results and run one row safely. */
export function newResult(sheet: string, r: ParsedRow, code: string, name: string): RowResult & { err: (m: string, column?: string) => void; warn: (m: string, column?: string) => void; hasErrors: () => boolean } {
  const res: RowResult = { sheet, row: r.row, code, name, action: 'create', messages: [] };
  return Object.assign(res, {
    err: (message: string, column?: string) => void res.messages.push({ level: 'error', column, message } satisfies RowMessage),
    warn: (message: string, column?: string) => void res.messages.push({ level: 'warning', column, message } satisfies RowMessage),
    hasErrors: () => res.messages.some((m) => m.level === 'error'),
  });
}

/** Strips helper methods before results are stored. */
export function plain(r: RowResult): RowResult {
  const { sheet, row, code, name, action, duplicate, messages } = r;
  return { sheet, row, code, name, action, ...(duplicate ? { duplicate } : {}), messages };
}

/**
 * Runs one row's write inside a savepoint so a failing row never poisons the
 * rest of the batch; validation failures become row errors.
 */
export async function inSavepoint(ctx: ApplyContext, res: ReturnType<typeof newResult>, fn: () => Promise<void>, columnFor: (field: string) => string = (f) => f) {
  await ctx.client.query('SAVEPOINT import_row');
  try {
    await fn();
    await ctx.client.query('RELEASE SAVEPOINT import_row');
  } catch (e) {
    await ctx.client.query('ROLLBACK TO SAVEPOINT import_row');
    res.action = 'error';
    if (!(e instanceof HttpError)) throw e; // unexpected: abort the batch, never hide it
    const fields = (e.details as { fields?: Record<string, string> } | undefined)?.fields;
    if (fields && Object.keys(fields).length) for (const [k, m] of Object.entries(fields)) res.err(m, columnFor(k));
    else res.err(e.message);
  }
}

export async function departmentCodes(hotelId: string, db: Queryable): Promise<string[]> {
  const rows = await q<{ code: string }>('SELECT code FROM departments WHERE hotel_id = $1 ORDER BY sort_order, code', [hotelId], db);
  return rows.map((r) => r.code);
}

/** Tracks duplicate keys within one sheet and reports the first row that used them. */
export class SeenKeys {
  private seen = new Map<string, number>();
  check(key: string, row: number): number | null {
    const first = this.seen.get(key);
    if (first !== undefined) return first;
    this.seen.set(key, row);
    return null;
  }
}
