import { privateKeys, type EntityName } from '../../shared/entities';
import { q } from '../db';
import { listByParents, listEntities, type EntityRecord } from '../repos/entities';
import { parseSite, type Hotel, type HotelRow, hydrate } from '../repos/hotels';

const inWindow = (r: { starts_at?: unknown; ends_at?: unknown }, now: number) => {
  const s = r.starts_at ? Date.parse(String(r.starts_at)) : NaN;
  const e = r.ends_at ? Date.parse(String(r.ends_at)) : NaN;
  return (Number.isNaN(s) || s <= now) && (Number.isNaN(e) || e >= now);
};

const PUBLIC_ENTITIES: EntityName[] = [
  'offers',
  'quick_actions',
  'outlets',
  'room_services',
  'hotel_services',
  'spa_categories',
  'spa_services',
  'laundry_categories',
  'laundry_items',
  'laundry_packages',
  'info_items',
];

export interface PublicBundle {
  hotel: {
    id: string;
    slug: string;
    is_published: boolean;
    profile: Hotel['profile'];
    branding: Hotel['branding'];
    settings: Pick<Hotel['settings'], 'reviews_enabled' | 'external_guests_enabled' | 'require_phone' | 'emergency_phone'>;
  };
  site: ReturnType<typeof parseSite>;
  departments: { code: string; name_en: string; name_ar: string; phone: string; has_whatsapp: boolean }[];
  catalog: Record<string, EntityRecord[]>;
  preview: boolean;
  generated_at: string;
}

/**
 * Everything the guest app needs for a hotel in one cached payload
 * (menus are fetched per outlet to keep this small).
 */
export async function buildPublicBundle(row: HotelRow, preview: boolean): Promise<PublicBundle> {
  const hotel = hydrate(row);
  const now = Date.now();
  const site = parseSite(preview ? row.site_draft : row.site_published);
  site.hero.slides = site.hero.slides.filter((s) => s.visible && (preview || inWindow(s, now)));

  const catalog: Record<string, EntityRecord[]> = {};
  const lists = await Promise.all(PUBLIC_ENTITIES.map((e) => listEntities(e, hotel.id, { activeOnly: true })));
  PUBLIC_ENTITIES.forEach((e, i) => (catalog[e] = lists[i]));
  catalog.offers = catalog.offers.filter((o) => inWindow(o as { starts_at?: unknown; ends_at?: unknown }, now));
  // Services of hidden categories must not leak through.
  const activeCats = new Set(catalog.spa_categories.map((c) => c.id));
  catalog.spa_services = catalog.spa_services.filter((s) => s.parent_id && activeCats.has(s.parent_id));
  const activeLaundryCats = new Set(catalog.laundry_categories.map((c) => c.id));
  catalog.laundry_items = catalog.laundry_items.filter((i) => i.parent_id && activeLaundryCats.has(i.parent_id));
  catalog.laundry_packages = catalog.laundry_packages.filter((p) => inWindow(p as { starts_at?: unknown; ends_at?: unknown }, now));
  // Internal notes and other private fields never reach guests.
  for (const e of PUBLIC_ENTITIES) {
    const hidden = privateKeys(e).filter((k) => k !== 'whatsapp');
    if (hidden.length) catalog[e] = catalog[e].map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !hidden.includes(k))) as EntityRecord);
  }
  // Outlets expose their WhatsApp only as a flag; numbers stay server-side.
  catalog.outlets = catalog.outlets.map(({ whatsapp, ...o }) => ({ ...o, has_whatsapp: Boolean(whatsapp) }) as EntityRecord);

  const departments = (
    await q<{ code: string; name_en: string; name_ar: string; phone: string; whatsapp: string }>(
      'SELECT code, name_en, name_ar, phone, whatsapp FROM departments WHERE hotel_id = $1 AND is_active ORDER BY code',
      [hotel.id]
    )
  ).map((d) => ({ code: d.code, name_en: d.name_en, name_ar: d.name_ar, phone: d.phone, has_whatsapp: d.whatsapp.replace(/\D/g, '').length >= 7 }));

  return {
    hotel: {
      id: hotel.id,
      slug: hotel.profile.slug,
      is_published: hotel.is_published,
      profile: hotel.profile,
      branding: hotel.branding,
      settings: {
        reviews_enabled: hotel.settings.reviews_enabled,
        external_guests_enabled: hotel.settings.external_guests_enabled,
        require_phone: hotel.settings.require_phone,
        emergency_phone: hotel.settings.emergency_phone,
      },
    },
    site,
    departments,
    catalog,
    preview,
    generated_at: new Date().toISOString(),
  };
}

const stripPrivate = (e: EntityName) => (r: EntityRecord) => {
  const hidden = privateKeys(e);
  return Object.fromEntries(Object.entries(r).filter(([k]) => !hidden.includes(k))) as EntityRecord;
};

export async function buildOutletMenu(hotelId: string, outletId: string) {
  const menus = await listEntities('menus', hotelId, { parentId: outletId, activeOnly: true });
  if (!menus.length) return { menus: [] };
  const menuIds = menus.map((m) => m.id);
  const cats = await listByParents('menu_categories', hotelId, menuIds);
  const items = await listByParents('menu_items', hotelId, cats.map((c) => c.id));
  return {
    menus: menus.map((m) => ({
      ...m,
      categories: cats.filter((c) => c.parent_id === m.id).map((c) => ({ ...c, items: items.filter((i) => i.parent_id === c.id).map(stripPrivate('menu_items')) })),
    })),
  };
}
