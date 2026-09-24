import { Hono } from 'hono';
import { z } from 'zod';
import { DEPARTMENTS } from '../../../shared/domain';
import { defaultSiteConfig } from '../../../shared/defaults';
import { phoneSchema } from '../../../shared/fields';
import { brandingSchema, hotelProfileSchema, settingsSchema, siteConfigSchema } from '../../../shared/hotel';
import { audit, diff } from '../../audit';
import { requireHotelAccess, requireUser } from '../../auth';
import { clientIp, type AppEnv, type Ctx } from '../../context';
import { one, q, tx } from '../../db';
import { HttpError, badRequest, conflict, forbidden, notFound, validationError } from '../../errors';
import { ENTITIES, ENTITY_NAMES } from '../../../shared/entities';
import { ensureDepartments, getHotelRow, hydrate, parseSite, splitProfile } from '../../repos/hotels';
import { changesSincePublish, publishHotel, republish } from '../../services/publish';

export const hotelRoutes = new Hono<AppEnv>();

async function body(c: Ctx) {
  return c.req.json().catch(() => {
    throw badRequest('Invalid JSON body');
  });
}

async function loadHotel(id: string) {
  const row = await getHotelRow(id);
  if (!row) throw notFound('Hotel not found');
  return row;
}

function adminView(row: NonNullable<Awaited<ReturnType<typeof getHotelRow>>>) {
  const h = hydrate(row);
  return {
    ...h,
    site_draft: parseSite(row.site_draft),
    site_published: parseSite(row.site_published),
    // Any guest-facing edit (content, prices, branding, website) touches draft_updated_at.
    has_unpublished_changes: !row.site_published_at || (row.draft_updated_at ?? new Date(0)) > row.site_published_at,
  };
}

hotelRoutes.get('/', async (c) => {
  const u = requireUser(c);
  const rows = u.global
    ? await q('SELECT id, slug, name_en, name_ar, is_published, branding->>\'logo\' AS logo, updated_at FROM hotels ORDER BY name_en')
    : await q("SELECT id, slug, name_en, name_ar, is_published, branding->>'logo' AS logo, updated_at FROM hotels WHERE id = ANY($1::uuid[]) ORDER BY name_en", [u.hotelIds]);
  return c.json({ hotels: rows });
});

hotelRoutes.post('/', async (c) => {
  const u = requireUser(c);
  if (!u.global) throw forbidden('Only super admins can create hotels');
  const parsed = hotelProfileSchema.safeParse(await body(c));
  if (!parsed.success) throw validationError(parsed.error);
  const { slug, name_en, name_ar, profile } = splitProfile(parsed.data);
  if (await one('SELECT 1 FROM hotels WHERE slug = $1', [slug])) throw conflict(`The address "${slug}" is already used by another hotel`);
  const site = defaultSiteConfig();
  const row = await tx(async (client) => {
    const r = await one<{ id: string }>(
      `INSERT INTO hotels (slug, name_en, name_ar, profile, branding, settings, site_draft, site_published, site_published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7, now()) RETURNING id`,
      [slug, name_en, name_ar, JSON.stringify(profile), JSON.stringify(brandingSchema.parse({})), JSON.stringify(settingsSchema.parse({})), JSON.stringify(site)],
      client
    );
    await ensureDepartments(r!.id, client);
    await audit({ hotelId: r!.id, user: u, action: 'create', entity: 'hotel', entityId: r!.id, summary: `Created hotel ${name_en}`, after: parsed.data, ip: clientIp(c) }, client);
    await publishHotel(client, r!.id, u, 'Initial publication', clientIp(c));
    return r!;
  });
  return c.json({ id: row.id }, 201);
});

hotelRoutes.get('/:hid', async (c) => {
  const hid = c.req.param('hid');
  requireHotelAccess(c, hid, 'dashboard');
  return c.json(adminView(await loadHotel(hid)));
});

/**
 * Partial update of a JSON settings object: merges recognised keys over the
 * stored value. An empty body or one without any known key is rejected
 * (never a silent success), and an unchanged value reports changed=false.
 */
function mergePatch<T extends Record<string, unknown>>(current: T, patch: unknown, knownKeys: string[], what: string): T {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw badRequest('Expected a JSON object');
  const keys = Object.keys(patch).filter((k) => knownKeys.includes(k));
  if (!keys.length) {
    throw new HttpError(422, 'no_changes', `Nothing to update: none of the fields sent (${Object.keys(patch).join(', ') || 'empty body'}) belong to ${what}.`);
  }
  const merged: Record<string, unknown> = { ...current };
  for (const k of keys) merged[k] = (patch as Record<string, unknown>)[k];
  return merged as T;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

async function updateProfile(c: Ctx) {
  const hid = c.req.param('hid')!;
  const u = requireHotelAccess(c, hid, 'hotel');
  const row = await loadHotel(hid);
  const before = hydrate(row).profile;
  const parsed = hotelProfileSchema.safeParse(mergePatch(before, await body(c), Object.keys(hotelProfileSchema.shape), 'the hotel profile'));
  if (!parsed.success) throw validationError(parsed.error);
  if (same(before, parsed.data)) return c.json({ ...adminView(row), changed: false });
  const { slug, name_en, name_ar, profile } = splitProfile(parsed.data);
  if (slug !== row.slug) {
    if (!u.global) throw forbidden('Only super admins can change a hotel address (it breaks printed QR codes)');
    if (await one('SELECT 1 FROM hotels WHERE slug = $1 AND id <> $2', [slug, hid])) throw conflict(`The address "${slug}" is already used`);
  }
  await tx(async (client) => {
    await q('UPDATE hotels SET slug=$2, name_en=$3, name_ar=$4, profile=$5, updated_at=now(), draft_updated_at=now() WHERE id=$1', [hid, slug, name_en, name_ar, JSON.stringify(profile)], client);
    const d = diff(before as never, parsed.data as never);
    await audit({ hotelId: hid, user: u, action: 'update', entity: 'hotel_profile', entityId: hid, summary: `Updated ${Object.keys(d.after ?? {}).join(', ')}`, ...d, ip: clientIp(c) }, client);
  });
  return c.json({ ...adminView((await getHotelRow(hid))!), changed: true });
}

async function updateBranding(c: Ctx) {
  const hid = c.req.param('hid')!;
  const u = requireHotelAccess(c, hid, 'hotel');
  const row = await loadHotel(hid);
  const before = hydrate(row).branding;
  const parsed = brandingSchema.safeParse(mergePatch(before, await body(c), Object.keys(brandingSchema.shape), 'branding'));
  if (!parsed.success) throw validationError(parsed.error);
  if (same(before, parsed.data)) return c.json({ ...adminView(row), changed: false });
  await tx(async (client) => {
    await q('UPDATE hotels SET branding=$2, updated_at=now(), draft_updated_at=now() WHERE id=$1', [hid, JSON.stringify(parsed.data)], client);
    const d = diff(before as never, parsed.data as never);
    await audit({ hotelId: hid, user: u, action: 'update', entity: 'branding', entityId: hid, summary: `Branding: ${Object.keys(d.after ?? {}).join(', ')}`, ...d, ip: clientIp(c) }, client);
  });
  return c.json({ ...adminView((await getHotelRow(hid))!), changed: true });
}

async function updateSettings(c: Ctx) {
  const hid = c.req.param('hid')!;
  const u = requireHotelAccess(c, hid, 'hotel');
  const row = await loadHotel(hid);
  const before = hydrate(row).settings;
  const parsed = settingsSchema.safeParse(mergePatch(before, await body(c), Object.keys(settingsSchema.shape), 'hotel settings'));
  if (!parsed.success) throw validationError(parsed.error);
  if (same(before, parsed.data)) return c.json({ ...adminView(row), changed: false });
  await tx(async (client) => {
    await q('UPDATE hotels SET settings=$2, updated_at=now() WHERE id=$1', [hid, JSON.stringify(parsed.data)], client);
    await audit({ hotelId: hid, user: u, action: 'update', entity: 'hotel_settings', entityId: hid, ...diff(before as never, parsed.data as never), ip: clientIp(c) }, client);
  });
  return c.json({ ...adminView((await getHotelRow(hid))!), changed: true });
}

// PUT is kept for existing clients; both verbs merge (a partial body never resets other fields).
for (const verb of ['put', 'patch'] as const) {
  hotelRoutes[verb]('/:hid/profile', updateProfile);
  hotelRoutes[verb]('/:hid/branding', updateBranding);
  hotelRoutes[verb]('/:hid/settings', updateSettings);
}

hotelRoutes.post('/:hid/publication', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'hotel');
  const { published } = z.object({ published: z.boolean() }).parse(await body(c));
  const row = await loadHotel(hid);
  await q('UPDATE hotels SET is_published=$2, updated_at=now() WHERE id=$1', [hid, published]);
  await audit({ hotelId: hid, user: u, action: published ? 'publish' : 'unpublish', entity: 'hotel', entityId: hid, before: { is_published: row.is_published }, after: { is_published: published }, ip: clientIp(c) });
  return c.json({ is_published: published });
});

// ----------------------------- Website (draft / publish) -----------------------------
hotelRoutes.put('/:hid/site/draft', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'hotel');
  await loadHotel(hid);
  const parsed = siteConfigSchema.safeParse(await body(c));
  if (!parsed.success) throw validationError(parsed.error);
  const ids = parsed.data.sections.map((s) => s.id);
  if (new Set(ids).size !== ids.length) throw badRequest('Section ids must be unique');
  await q('UPDATE hotels SET site_draft=$2, site_draft_updated_at=now(), draft_updated_at=now(), updated_at=now() WHERE id=$1', [hid, JSON.stringify(parsed.data)]);
  await audit({ hotelId: hid, user: u, action: 'update', entity: 'website_draft', entityId: hid, summary: 'Saved website draft', ip: clientIp(c) });
  return c.json(adminView((await getHotelRow(hid))!));
});

// ----------------------------- Publishing (all guest-facing content) -----------------------------
async function doPublish(c: Ctx) {
  const hid = c.req.param('hid')!;
  const u = requireHotelAccess(c, hid, 'hotel');
  await loadHotel(hid);
  const raw = await c.req.json().catch(() => ({}));
  const note = z.object({ note: z.string().trim().max(300).default('') }).catch({ note: '' }).parse(raw ?? {}).note;
  const result = await tx((client) => publishHotel(client, hid, u, note, clientIp(c)));
  return c.json({ ...adminView((await getHotelRow(hid))!), publication: result });
}
hotelRoutes.post('/:hid/publish', doPublish);
// Kept for the website manager: publishing is always the whole guest-facing content.
hotelRoutes.post('/:hid/site/publish', doPublish);

hotelRoutes.get('/:hid/publishing', async (c) => {
  const hid = c.req.param('hid');
  requireHotelAccess(c, hid, 'dashboard');
  await loadHotel(hid);
  c.header('Cache-Control', 'no-store');
  return c.json(await changesSincePublish(hid));
});

hotelRoutes.get('/:hid/publications', async (c) => {
  const hid = c.req.param('hid');
  requireHotelAccess(c, hid, 'hotel');
  const rows = await q(
    `SELECT p.id, p.version, p.summary, p.published_at, u.name AS published_by
       FROM publications p LEFT JOIN users u ON u.id = p.published_by
      WHERE p.hotel_id = $1 ORDER BY p.version DESC LIMIT 100`,
    [hid]
  );
  return c.json({ publications: rows });
});

hotelRoutes.post('/:hid/publications/:pid/republish', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'hotel');
  const pid = c.req.param('pid');
  if (!/^[0-9a-f-]{36}$/i.test(pid)) throw notFound('Version not found');
  const r = await tx((client) => republish(client, hid, pid, u, clientIp(c)));
  return c.json(r, 201);
});

hotelRoutes.post('/:hid/site/discard', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'hotel');
  await loadHotel(hid);
  await q('UPDATE hotels SET site_draft = site_published, site_draft_updated_at = now() WHERE id = $1', [hid]);
  await audit({ hotelId: hid, user: u, action: 'discard', entity: 'website_draft', entityId: hid, summary: 'Discarded website draft', ip: clientIp(c) });
  return c.json(adminView((await getHotelRow(hid))!));
});

// ----------------------------- Departments & WhatsApp routing -----------------------------
const deptCode = z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_]{1,31}$/, 'Capital letters, digits and _ (e.g. KIDS_CLUB)');
const deptSchema = z.object({
  code: deptCode,
  name_en: z.string().trim().min(2).max(80),
  name_ar: z.string().trim().min(2).max(80),
  whatsapp: phoneSchema,
  phone: phoneSchema,
  email: z.union([z.literal(''), z.string().trim().email()]),
  is_active: z.boolean(),
  sla_minutes: z.number().int().min(1).max(1440).nullable(),
});

const deptOrder = (a: { code: string; sort_order?: number }, b: { code: string; sort_order?: number }) => {
  const ia = (DEPARTMENTS as readonly string[]).indexOf(a.code);
  const ib = (DEPARTMENTS as readonly string[]).indexOf(b.code);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.code.localeCompare(b.code);
};

hotelRoutes.get('/:hid/departments', async (c) => {
  const hid = c.req.param('hid');
  requireHotelAccess(c, hid, 'hotel');
  await ensureDepartments(hid);
  const rows = await q('SELECT code, name_en, name_ar, whatsapp, phone, email, is_active, sla_minutes, is_custom, sort_order, updated_at FROM departments WHERE hotel_id = $1', [hid]);
  rows.sort(deptOrder);
  return c.json({ departments: rows });
});

/** Routing targets for department pickers — readable by every role of the hotel (no contact numbers). */
hotelRoutes.get('/:hid/departments/options', async (c) => {
  const hid = c.req.param('hid');
  requireHotelAccess(c, hid, 'dashboard');
  await ensureDepartments(hid);
  const rows = await q<{ code: string; name_en: string; name_ar: string; is_active: boolean; is_custom: boolean; sort_order: number }>(
    'SELECT code, name_en, name_ar, is_active, is_custom, sort_order FROM departments WHERE hotel_id = $1',
    [hid]
  );
  rows.sort(deptOrder);
  return c.json({ departments: rows });
});

hotelRoutes.put('/:hid/departments', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'hotel');
  const parsed = z.object({ departments: z.array(deptSchema).min(1).max(100) }).safeParse(await body(c));
  if (!parsed.success) throw validationError(parsed.error);
  await ensureDepartments(hid);
  let changed = 0;
  await tx(async (client) => {
    for (const d of parsed.data.departments) {
      const before = await one('SELECT name_en, name_ar, whatsapp, phone, email, is_active, sla_minutes FROM departments WHERE hotel_id=$1 AND code=$2', [hid, d.code], client);
      if (!before) throw new HttpError(422, 'validation_failed', `Department ${d.code} does not exist; add it first`, { fields: { departments: `Unknown department ${d.code}` } });
      const { code, ...after } = d;
      const change = diff(before as never, after as never);
      if (!Object.keys(change.after ?? {}).length) continue;
      changed++;
      await q(
        `UPDATE departments SET name_en=$3, name_ar=$4, whatsapp=$5, phone=$6, email=$7, is_active=$8, sla_minutes=$9, updated_at=now()
         WHERE hotel_id=$1 AND code=$2`,
        [hid, d.code, d.name_en, d.name_ar, d.whatsapp, d.phone, d.email, d.is_active, d.sla_minutes],
        client
      );
      await audit({ hotelId: hid, user: u, action: 'update', entity: 'department_routing', entityId: code, summary: `${code}: ${Object.keys(change.after!).join(', ')}`, ...change, ip: clientIp(c) }, client);
    }
  });
  return c.json({ ok: true, changed });
});

/** Hotel-defined department (e.g. Kids Club, Butler, Business Center). */
hotelRoutes.post('/:hid/departments', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'hotel');
  const parsed = deptSchema.partial({ whatsapp: true, phone: true, email: true, is_active: true, sla_minutes: true }).safeParse(await body(c));
  if (!parsed.success) throw validationError(parsed.error);
  const d = parsed.data;
  if (await one('SELECT 1 FROM departments WHERE hotel_id = $1 AND code = $2', [hid, d.code])) {
    throw new HttpError(422, 'validation_failed', `Code ${d.code} is already used`, { fields: { code: 'Already used' } });
  }
  const next = await one<{ n: number }>('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM departments WHERE hotel_id = $1', [hid]);
  const row = await one(
    `INSERT INTO departments (hotel_id, code, name_en, name_ar, whatsapp, phone, email, is_active, sla_minutes, is_custom, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10) RETURNING code, name_en, name_ar, whatsapp, phone, email, is_active, sla_minutes, is_custom, sort_order`,
    [hid, d.code, d.name_en, d.name_ar, d.whatsapp ?? '', d.phone ?? '', d.email ?? '', d.is_active ?? true, d.sla_minutes ?? null, next!.n]
  );
  await audit({ hotelId: hid, user: u, action: 'create', entity: 'department_routing', entityId: d.code, summary: `Added department ${d.code} (${d.name_en})`, after: row, ip: clientIp(c) });
  return c.json(row, 201);
});

hotelRoutes.delete('/:hid/departments/:code', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'hotel');
  const code = c.req.param('code').toUpperCase();
  const d = await one<{ is_custom: boolean; name_en: string }>('SELECT is_custom, name_en FROM departments WHERE hotel_id = $1 AND code = $2', [hid, code]);
  if (!d) throw notFound('Department not found');
  if (!d.is_custom) throw conflict('Built-in departments cannot be deleted; deactivate them instead');
  const used: string[] = [];
  for (const name of ENTITY_NAMES) {
    if (!ENTITIES[name].fields.some((f) => f.type === 'department')) continue;
    const n = await one<{ n: number }>(`SELECT COUNT(*) AS n FROM ${ENTITIES[name].table} WHERE hotel_id = $1 AND data->>'department' = $2`, [hid, code]);
    if (n && n.n > 0) used.push(`${n.n} ${ENTITIES[name].label.plural.toLowerCase()}`);
  }
  const open = await one<{ n: number }>(`SELECT COUNT(*) AS n FROM requests WHERE hotel_id = $1 AND department = $2 AND status IN ('NEW','ACCEPTED','IN_PROGRESS','READY')`, [hid, code]);
  if (open && open.n > 0) used.push(`${open.n} open request(s)`);
  if (used.length) throw conflict(`Still used by ${used.join(', ')}. Reassign them first, or deactivate the department.`);
  await q('DELETE FROM departments WHERE hotel_id = $1 AND code = $2', [hid, code]);
  await audit({ hotelId: hid, user: u, action: 'delete', entity: 'department_routing', entityId: code, summary: `Removed department ${code} (${d.name_en})`, ip: clientIp(c) });
  return c.json({ ok: true });
});
