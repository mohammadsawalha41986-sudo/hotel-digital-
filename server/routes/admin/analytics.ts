import { Hono } from 'hono';
import { z } from 'zod';
import { roleCan } from '../../../shared/domain';
import { departmentScope } from '../../services/access';
import { requireHotelAccess } from '../../auth';
import type { AppEnv } from '../../context';
import { one, q } from '../../db';
import { getHotelRow, hydrate } from '../../repos/hotels';
import { notFound } from '../../errors';
import { engagementSummary } from '../../services/engagement';

export const analyticsRoutes = new Hono<AppEnv>();

/**
 * Operational analytics computed from real request rows only. All figures are
 * scoped to the departments the signed-in role can see.
 */
analyticsRoutes.get('/:hid/analytics', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'dashboard');
  const days = z.coerce.number().int().min(1).max(365).catch(30).parse(c.req.query('days'));
  const row = await getHotelRow(hid);
  if (!row) throw notFound('Hotel not found');
  const tz = hydrate(row).profile.timezone;
  const depts = await departmentScope(u, hid);
  const base = [hid, depts, days];
  const withTz = [...base, tz];
  const scope = `hotel_id = $1 AND department = ANY($2::text[]) AND created_at >= now() - make_interval(days => $3)`;

  const [summary, byDept, byStatus, byType, topServices, popularItems, trend, feedback, reviews, engagement] = await Promise.all([
    one(
      `SELECT
         COUNT(*) FILTER (WHERE (created_at AT TIME ZONE $4)::date = (now() AT TIME ZONE $4)::date) AS today,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status IN ('NEW','ACCEPTED','IN_PROGRESS','READY')) AS open,
         COUNT(*) FILTER (WHERE status = 'NEW') AS awaiting,
         ROUND(AVG(EXTRACT(EPOCH FROM (accepted_at - created_at)) / 60)::numeric, 1)::float AS avg_response_min,
         ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60)::numeric, 1)::float AS avg_completion_min,
         COUNT(*) FILTER (WHERE type = 'ORDER') AS food_orders,
         COALESCE(SUM(total) FILTER (WHERE type = 'ORDER' AND status = 'COMPLETED'), 0)::float AS food_completed_value,
         COUNT(*) FILTER (WHERE type = 'LAUNDRY') AS laundry,
         COUNT(*) FILTER (WHERE type = 'SPA') AS spa,
         COUNT(*) FILTER (WHERE type = 'FEEDBACK' AND details->>'feedback_type' IN ('COMPLAINT','SERVICE_RECOVERY')) AS complaints
       FROM requests WHERE ${scope}`,
      withTz
    ),
    q(`SELECT department, COUNT(*) AS n FROM requests WHERE ${scope} GROUP BY department ORDER BY n DESC`, base),
    q(`SELECT status, COUNT(*) AS n FROM requests WHERE ${scope} GROUP BY status`, base),
    q(`SELECT type, COUNT(*) AS n FROM requests WHERE ${scope} GROUP BY type ORDER BY n DESC`, base),
    q(
      `SELECT title_en, title_ar, type, COUNT(*) AS n FROM requests
        WHERE ${scope} AND type IN ('ROOM_SERVICE','HOTEL_SERVICE','SPA')
        GROUP BY title_en, title_ar, type ORDER BY n DESC LIMIT 8`,
      base
    ),
    q(
      `SELECT l->>'name_en' AS name_en, l->>'name_ar' AS name_ar, SUM((l->>'quantity')::int) AS qty, COUNT(DISTINCT r.id) AS orders
         FROM requests r, jsonb_array_elements(r.lines) l
        WHERE ${scope.replace(/\b(hotel_id|department|created_at)\b/g, 'r.$1')} AND r.type = 'ORDER' AND r.status <> 'CANCELLED'
        GROUP BY 1, 2 ORDER BY qty DESC LIMIT 8`,
      base
    ),
    q(
      `SELECT to_char((created_at AT TIME ZONE $4)::date, 'YYYY-MM-DD') AS day, COUNT(*) AS n
         FROM requests WHERE ${scope} GROUP BY 1 ORDER BY 1`,
      withTz
    ),
    q(`SELECT details->>'feedback_type' AS feedback_type, COUNT(*) AS n FROM requests WHERE ${scope} AND type = 'FEEDBACK' GROUP BY 1`, base),
    roleCan(u.role, 'reviews')
      ? one(
          `SELECT ROUND(AVG(rating) FILTER (WHERE status = 'APPROVED')::numeric, 2)::float AS average,
                  COUNT(*) FILTER (WHERE status = 'APPROVED') AS approved,
                  COUNT(*) FILTER (WHERE status = 'PENDING') AS pending
             FROM reviews WHERE hotel_id = $1`,
          [hid]
        )
      : Promise.resolve(null),
    // Guest engagement is hotel-wide marketing data: only for roles managing guest-facing content.
    roleCan(u.role, 'hotel') || roleCan(u.role, 'offers') ? engagementSummary(hid, tz, days) : Promise.resolve(null),
  ]);

  c.header('Cache-Control', 'no-store');
  return c.json({ days, scope: depts, summary, by_department: byDept, by_status: byStatus, by_type: byType, top_services: topServices, popular_items: popularItems, trend, feedback, reviews, engagement });
});
