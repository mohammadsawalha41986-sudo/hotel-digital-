import type { EntityName } from '../../shared/entities';
import { q } from '../db';
import type { EntityRecord } from '../repos/entities';
import { hydrate, type Hotel, type HotelRow } from '../repos/hotels';
import { BUNDLE_ENTITIES, buildDraftContent, latestPublication, overlay, type ContentSnapshot } from './publish';

const inWindow = (r: { starts_at?: unknown; ends_at?: unknown }, now: number) => {
  const s = r.starts_at ? Date.parse(String(r.starts_at)) : NaN;
  const e = r.ends_at ? Date.parse(String(r.ends_at)) : NaN;
  return (Number.isNaN(s) || s <= now) && (Number.isNaN(e) || e >= now);
};

export interface PublicBundle {
  hotel: {
    id: string;
    slug: string;
    is_published: boolean;
    profile: Hotel['profile'];
    branding: Hotel['branding'];
    settings: Pick<Hotel['settings'], 'reviews_enabled' | 'external_guests_enabled' | 'require_phone' | 'emergency_phone'>;
  };
  site: ContentSnapshot['site'];
  departments: { code: string; name_en: string; name_ar: string; phone: string; has_whatsapp: boolean }[];
  catalog: Record<string, EntityRecord[]>;
  preview: boolean;
  /** Published version shown (null in preview = unpublished draft). */
  version: number | null;
  generated_at: string;
}

/** Published content for guests; the live draft for staff preview. */
async function contentFor(hotelId: string, preview: boolean): Promise<{ content: ContentSnapshot; version: number | null }> {
  if (!preview) {
    const p = await latestPublication(hotelId);
    if (p) return { content: p.snapshot, version: p.version };
  }
  return { content: await buildDraftContent(hotelId), version: null };
}

/**
 * Everything the guest app needs for a hotel in one cached payload
 * (menus are fetched per outlet to keep this small).
 */
export async function buildPublicBundle(row: HotelRow, preview: boolean): Promise<PublicBundle> {
  const hotel = hydrate(row);
  const now = Date.now();
  const { content, version } = await contentFor(hotel.id, preview);
  const site = structuredClone(content.site);
  site.hero.slides = site.hero.slides.filter((s) => s.visible && (preview || inWindow(s, now)));

  const catalog: Record<string, EntityRecord[]> = {};
  for (const e of BUNDLE_ENTITIES) catalog[e] = await overlay(hotel.id, e, content.catalog[e] ?? []);
  catalog.offers = catalog.offers.filter((o) => inWindow(o as { starts_at?: unknown; ends_at?: unknown }, now));
  catalog.laundry_packages = catalog.laundry_packages.filter((p) => inWindow(p as { starts_at?: unknown; ends_at?: unknown }, now));
  // Outlets expose their WhatsApp only as a flag; numbers stay server-side.
  catalog.outlets = catalog.outlets.map(({ whatsapp, ...o }) => ({ ...o, has_whatsapp: Boolean(whatsapp) }) as EntityRecord);

  const departments = (
    await q<{ code: string; name_en: string; name_ar: string; phone: string; whatsapp: string }>(
      'SELECT code, name_en, name_ar, phone, whatsapp FROM departments WHERE hotel_id = $1 AND is_active ORDER BY sort_order, code',
      [hotel.id]
    )
  ).map((d) => ({ code: d.code, name_en: d.name_en, name_ar: d.name_ar, phone: d.phone, has_whatsapp: d.whatsapp.replace(/\D/g, '').length >= 7 }));

  return {
    hotel: {
      id: hotel.id,
      slug: hotel.profile.slug,
      is_published: hotel.is_published,
      // Name and address are published content; the slug (routing) is live.
      profile: { ...content.profile, slug: hotel.profile.slug },
      branding: content.branding,
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
    version,
    generated_at: new Date().toISOString(),
  };
}

/** Menus of one outlet, from the same content the bundle came from. Null when the outlet is not in it. */
export async function buildOutletMenu(hotelId: string, outletId: string, preview: boolean) {
  const { content } = await contentFor(hotelId, preview);
  if (!(content.catalog.outlets ?? []).some((o) => o.id === outletId)) return null;
  const menus = (content.catalog.menus ?? []).filter((m) => m.parent_id === outletId);
  const menuIds = new Set(menus.map((m) => m.id));
  const cats = (content.catalog.menu_categories ?? []).filter((c) => c.parent_id && menuIds.has(c.parent_id));
  const catIds = new Set(cats.map((c) => c.id));
  const items = await overlay(hotelId, 'menu_items' as EntityName, (content.catalog.menu_items ?? []).filter((i) => i.parent_id && catIds.has(i.parent_id)));
  return {
    menus: menus.map((m) => ({
      ...m,
      categories: cats.filter((c) => c.parent_id === m.id).map((c) => ({ ...c, items: items.filter((i) => i.parent_id === c.id) })),
    })),
  };
}
