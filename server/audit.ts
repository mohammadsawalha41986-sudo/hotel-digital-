import type { Queryable } from './db';
import { q } from './db';
import type { SessionUser } from './context';

export interface AuditEntry {
  hotelId: string | null;
  user: SessionUser | null;
  action: string; // create | update | delete | publish | status | login | import | reorder ...
  entity: string;
  entityId?: string | null;
  summary?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}

/** Only the keys that changed, so price/routing edits are easy to read in the log. */
export function diff(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  if (!before || !after) return { before, after };
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (k === 'updated_at' || k === 'created_at') continue;
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      b[k] = before[k];
      a[k] = after[k];
    }
  }
  return { before: b, after: a };
}

export async function audit(e: AuditEntry, db?: Queryable): Promise<void> {
  await q(
    `INSERT INTO audit_log (hotel_id, user_id, user_email, action, entity, entity_id, summary, before, after, ip)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      e.hotelId,
      e.user?.id ?? null,
      e.user?.email ?? '',
      e.action,
      e.entity,
      e.entityId ?? null,
      (e.summary ?? '').slice(0, 500),
      e.before === undefined ? null : JSON.stringify(e.before),
      e.after === undefined ? null : JSON.stringify(e.after),
      e.ip ?? null,
    ],
    db
  );
}
