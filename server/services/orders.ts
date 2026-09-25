import type pg from 'pg';
import { STATUS_TRANSITIONS, type RequestStatus } from '../../shared/domain';
import { audit } from '../audit';
import type { SessionUser } from '../context';
import { one, q } from '../db';
import { HttpError, notFound } from '../errors';
import { loadOrder, onOrderStatus } from './finance';

const TIMESTAMP_COLUMN: Partial<Record<RequestStatus, string>> = {
  ACCEPTED: 'accepted_at',
  IN_PROGRESS: 'started_at',
  READY: 'ready_at',
  COMPLETED: 'completed_at',
  REJECTED: 'rejected_at',
  CANCELLED: 'cancelled_at',
};

export interface StatusChange {
  hotelId: string;
  requestId: string;
  to: RequestStatus;
  note?: string;
  reason?: string;
  guestMessage?: string;
  /** Staff member, or null when the guest acts (cancel). */
  user: SessionUser | null;
  guestName?: string;
  /** Departments the actor may act on (staff); undefined = guest path already scoped. */
  departments?: readonly string[];
  /** Only this status may be left (guest cancel: only NEW). */
  onlyFrom?: RequestStatus[];
  ip?: string;
}

/**
 * The one place an order changes status: locks the row, validates the
 * transition, stamps the lifecycle timestamp, appends immutable events and
 * runs the commission engine in the same transaction.
 */
export async function changeStatus(client: pg.PoolClient, c: StatusChange) {
  const r = await one<{ id: string; status: RequestStatus; department: string; reference: string }>(
    'SELECT id, status, department, reference FROM requests WHERE hotel_id = $1 AND id = $2 FOR UPDATE',
    [c.hotelId, c.requestId],
    client
  );
  if (!r || (c.departments && !c.departments.includes(r.department))) throw notFound('Request not found');
  const from = r.status;
  if (c.onlyFrom && !c.onlyFrom.includes(from)) {
    throw new HttpError(409, 'not_cancellable', 'This request has already been accepted by the team and can no longer be cancelled here.');
  }
  if (!STATUS_TRANSITIONS[from].includes(c.to)) {
    throw new HttpError(
      409,
      'invalid_transition',
      `A ${from.toLowerCase().replace('_', ' ')} request cannot be moved to ${c.to.toLowerCase().replace('_', ' ')}. It may have been updated by a colleague — refresh to see the latest status.`
    );
  }
  const col = TIMESTAMP_COLUMN[c.to];
  // Skipping steps still stamps accepted_at (response-time analytics, eligibility on acceptance).
  const acceptedFill = ['IN_PROGRESS', 'READY', 'COMPLETED'].includes(c.to) ? ', accepted_at = COALESCE(accepted_at, now())' : '';
  await q(
    `UPDATE requests SET status = $3, updated_at = now(), assigned_to = COALESCE(assigned_to, $4)${col ? `, ${col} = now()` : ''}${acceptedFill}
      WHERE hotel_id = $1 AND id = $2`,
    [c.hotelId, r.id, c.to, c.user?.id ?? null],
    client
  );
  await q(
    `INSERT INTO request_events (request_id, hotel_id, user_id, from_status, to_status, note, is_internal, event_type, actor_type, actor_name, reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'STATUS',$8,$9,$10)`,
    [r.id, c.hotelId, c.user?.id ?? null, from, c.to, c.note ?? '', !!c.user, c.user ? 'staff' : 'guest', c.user?.name ?? c.guestName ?? 'Guest', c.reason ?? ''],
    client
  );
  if (c.guestMessage) {
    await q(
      `INSERT INTO request_events (request_id, hotel_id, user_id, to_status, note, is_internal, event_type, actor_type, actor_name)
       VALUES ($1,$2,$3,$4,$5,false,'GUEST_MESSAGE','staff',$6)`,
      [r.id, c.hotelId, c.user?.id ?? null, c.to, c.guestMessage, c.user?.name ?? ''],
      client
    );
  }
  const order = await loadOrder(client, c.hotelId, r.id);
  await onOrderStatus(client, order, c.to, { user: c.user, ip: c.ip });
  await audit(
    {
      hotelId: c.hotelId,
      user: c.user,
      action: 'status',
      entity: 'request',
      entityId: r.id,
      summary: `${r.reference}: ${from} → ${c.to}${c.user ? '' : ' (guest)'}`,
      before: { status: from },
      after: { status: c.to, note: c.note, reason: c.reason },
      ip: c.ip,
    },
    client
  );
  return { status: c.to, from, reference: r.reference };
}
