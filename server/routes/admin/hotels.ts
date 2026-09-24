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
import { badRequest, conflict, forbidden, notFound, validationError } from '../../errors';
import { ensureDepartments, getHotelRow, hydrate, parseSite, splitProfile } from '../../repos/hotels';

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
    has_unpublished_changes: JSON.stringify(row.site_draft) !== JSON.stringify(row.site_published),
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
    return r!;
  });
  return c.json({ id: row.id }, 201);
});

hotelRoutes.get('/:hid', async (c) => {
  const hid = c.req.param('hid');
  requireHotelAccess(c, hid, 'dashboard');
  return c.json(adminView(await loadHotel(hid)));
});

hotelRoutes.put('/:hid/profile', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'hotel');
  const row = await loadHotel(hid);
  const parsed = hotelProfileSchema.safeParse(await body(c));
  if (!parsed.success) throw validationError(parsed.error);
  const before = hydrate(row).profile;
  const { slug, name_en, name_ar, profile } = splitProfile(parsed.data);
  if (slug !== row.slug) {
    if (!u.global) throw forbidden('Only super admins can change a hotel address (it breaks printed QR codes)');
    if (await one('SELECT 1 FROM hotels WHERE slug = $1 AND id <> $2', [slug, hid])) throw conflict(`The address "${slug}" is already used`);
  }
  await q('UPDATE hotels SET slug=$2, name_en=$3, name_ar=$4, profile=$5, updated_at=now() WHERE id=$1', [hid, slug, name_en, name_ar, JSON.stringify(profile)]);
  const d = diff(before as never, parsed.data as never);
  await audit({ hotelId: hid, user: u, action: 'update', entity: 'hotel_profile', entityId: hid, summary: `Updated ${Object.keys(d.after ?? {}).join(', ') || 'nothing'}`, ...d, ip: clientIp(c) });
  return c.json(adminView((await getHotelRow(hid))!));
});

hotelRoutes.put('/:hid/branding', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'hotel');
  const row = await loadHotel(hid);
  const parsed = brandingSchema.safeParse(await body(c));
  if (!parsed.success) throw validationError(parsed.error);
  await q('UPDATE hotels SET branding=$2, updated_at=now() WHERE id=$1', [hid, JSON.stringify(parsed.data)]);
  const d = diff(hydrate(row).branding as never, parsed.data as never);
  await audit({ hotelId: hid, user: u, action: 'update', entity: 'branding', entityId: hid, summary: `Branding: ${Object.keys(d.after ?? {}).join(', ')}`, ...d, ip: clientIp(c) });
  return c.json(adminView((await getHotelRow(hid))!));
});

hotelRoutes.put('/:hid/settings', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'hotel');
  const row = await loadHotel(hid);
  const parsed = settingsSchema.safeParse(await body(c));
  if (!parsed.success) throw validationError(parsed.error);
  await q('UPDATE hotels SET settings=$2, updated_at=now() WHERE id=$1', [hid, JSON.stringify(parsed.data)]);
  await audit({ hotelId: hid, user: u, action: 'update', entity: 'hotel_settings', entityId: hid, ...diff(hydrate(row).settings as never, parsed.data as never), ip: clientIp(c) });
  return c.json(adminView((await getHotelRow(hid))!));
});

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
  await q('UPDATE hotels SET site_draft=$2, site_draft_updated_at=now(), updated_at=now() WHERE id=$1', [hid, JSON.stringify(parsed.data)]);
  await audit({ hotelId: hid, user: u, action: 'update', entity: 'website_draft', entityId: hid, summary: 'Saved website draft', ip: clientIp(c) });
  return c.json(adminView((await getHotelRow(hid))!));
});

hotelRoutes.post('/:hid/site/publish', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'hotel');
  const row = await loadHotel(hid);
  await q('UPDATE hotels SET site_published = site_draft, site_published_at = now(), updated_at = now() WHERE id = $1', [hid]);
  await audit({ hotelId: hid, user: u, action: 'publish', entity: 'website', entityId: hid, summary: 'Published website changes', before: row.site_published, after: row.site_draft, ip: clientIp(c) });
  return c.json(adminView((await getHotelRow(hid))!));
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
const deptSchema = z.object({
  code: z.enum(DEPARTMENTS),
  name_en: z.string().trim().min(2).max(80),
  name_ar: z.string().trim().min(2).max(80),
  whatsapp: phoneSchema,
  phone: phoneSchema,
  email: z.union([z.literal(''), z.string().trim().email()]),
  is_active: z.boolean(),
  sla_minutes: z.number().int().min(1).max(1440).nullable(),
});

hotelRoutes.get('/:hid/departments', async (c) => {
  const hid = c.req.param('hid');
  requireHotelAccess(c, hid, 'hotel');
  await ensureDepartments(hid);
  const rows = await q('SELECT code, name_en, name_ar, whatsapp, phone, email, is_active, sla_minutes, updated_at FROM departments WHERE hotel_id = $1', [hid]);
  rows.sort((a, b) => DEPARTMENTS.indexOf(a.code) - DEPARTMENTS.indexOf(b.code));
  return c.json({ departments: rows });
});

hotelRoutes.put('/:hid/departments', async (c) => {
  const hid = c.req.param('hid');
  const u = requireHotelAccess(c, hid, 'hotel');
  const parsed = z.object({ departments: z.array(deptSchema).min(1).max(DEPARTMENTS.length) }).safeParse(await body(c));
  if (!parsed.success) throw validationError(parsed.error);
  await ensureDepartments(hid);
  await tx(async (client) => {
    for (const d of parsed.data.departments) {
      const before = await one('SELECT name_en, name_ar, whatsapp, phone, email, is_active, sla_minutes FROM departments WHERE hotel_id=$1 AND code=$2', [hid, d.code], client);
      await q(
        `UPDATE departments SET name_en=$3, name_ar=$4, whatsapp=$5, phone=$6, email=$7, is_active=$8, sla_minutes=$9, updated_at=now()
         WHERE hotel_id=$1 AND code=$2`,
        [hid, d.code, d.name_en, d.name_ar, d.whatsapp, d.phone, d.email, d.is_active, d.sla_minutes],
        client
      );
      const { code, ...after } = d;
      const change = diff(before as never, after as never);
      if (Object.keys(change.after ?? {}).length) {
        await audit({ hotelId: hid, user: u, action: 'update', entity: 'department_routing', entityId: code, summary: `${code}: ${Object.keys(change.after!).join(', ')}`, ...change, ip: clientIp(c) }, client);
      }
    }
  });
  return c.json({ ok: true });
});
