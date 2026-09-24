import type { GuestEventInput } from '../../shared/engagement';
import { q } from '../db';

/** Adds events to today's aggregate counters (hotel-local day). */
export async function recordEvents(hotelId: string, timezone: string, events: GuestEventInput[]) {
  // Collapse duplicates in the batch so each counter is written once.
  const counts = new Map<string, { e: GuestEventInput; n: number }>();
  for (const e of events) {
    const k = `${e.event}|${e.target_type}|${e.target_code}`;
    const c = counts.get(k);
    if (c) c.n++;
    else counts.set(k, { e, n: 1 });
  }
  for (const { e, n } of counts.values()) {
    await q(
      `INSERT INTO guest_event_counts (hotel_id, day, event, target_type, target_code, n)
       VALUES ($1, (now() AT TIME ZONE $2)::date, $3, $4, $5, $6)
       ON CONFLICT (hotel_id, day, event, target_type, target_code) DO UPDATE SET n = guest_event_counts.n + EXCLUDED.n`,
      [hotelId, timezone, e.event, e.target_type, e.target_code, n]
    );
  }
}

/** Engagement summary for the admin dashboard: totals, top targets, funnel. */
export async function engagementSummary(hotelId: string, timezone: string, days: number) {
  const since = `(now() AT TIME ZONE $2)::date - ($3::int - 1)`;
  const [totals, top] = await Promise.all([
    q<{ event: string; n: number }>(`SELECT event, SUM(n)::int AS n FROM guest_event_counts WHERE hotel_id = $1 AND day >= ${since} GROUP BY event`, [hotelId, timezone, days]),
    q<{ event: string; target_type: string; target_code: string; n: number }>(
      `SELECT event, target_type, target_code, SUM(n)::int AS n FROM guest_event_counts
        WHERE hotel_id = $1 AND day >= ${since} AND target_code <> '' AND event IN ('offer_click','experience_click','menu_item_view','service_view','offer_impression')
        GROUP BY 1,2,3 ORDER BY n DESC LIMIT 30`,
      [hotelId, timezone, days]
    ),
  ]);
  const t = Object.fromEntries(totals.map((r) => [r.event, r.n])) as Record<string, number>;
  const rate = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
  return {
    totals: t,
    offer_ctr: rate(t.offer_click ?? 0, t.offer_impression ?? 0),
    request_completion: rate(t.request_completed ?? 0, t.request_started ?? 0),
    top,
  };
}
