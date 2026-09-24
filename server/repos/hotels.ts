import { DEPARTMENTS, DEPARTMENT_LABELS } from '../../shared/domain';
import {
  brandingSchema,
  hotelProfileSchema,
  settingsSchema,
  siteConfigSchema,
  type Branding,
  type HotelProfile,
  type HotelSettings,
  type SiteConfig,
} from '../../shared/hotel';
import { one, q, type Queryable } from '../db';

export interface HotelRow {
  id: string;
  slug: string;
  is_published: boolean;
  name_en: string;
  name_ar: string;
  profile: Record<string, unknown>;
  branding: Record<string, unknown>;
  settings: Record<string, unknown>;
  site_draft: Record<string, unknown>;
  site_published: Record<string, unknown>;
  site_published_at: Date | null;
  site_draft_updated_at: Date | null;
  draft_updated_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Hotel {
  id: string;
  is_published: boolean;
  profile: HotelProfile;
  branding: Branding;
  settings: HotelSettings;
  site_published_at: string | null;
  site_draft_updated_at: string | null;
}

/** Parses stored JSON through the current schemas so old rows gain new defaults. */
export function hydrate(row: HotelRow): Hotel {
  const profile = hotelProfileSchema.parse({ ...row.profile, slug: row.slug, name_en: row.name_en, name_ar: row.name_ar });
  return {
    id: row.id,
    is_published: row.is_published,
    profile,
    branding: brandingSchema.parse(row.branding ?? {}),
    settings: settingsSchema.parse(row.settings ?? {}),
    site_published_at: row.site_published_at?.toISOString() ?? null,
    site_draft_updated_at: row.site_draft_updated_at?.toISOString() ?? null,
  };
}

export function parseSite(v: unknown): SiteConfig {
  const r = siteConfigSchema.safeParse(v ?? {});
  return r.success ? r.data : siteConfigSchema.parse({});
}

export async function getHotelRow(id: string, db?: Queryable) {
  return one<HotelRow>('SELECT * FROM hotels WHERE id = $1', [id], db);
}

export async function getHotelRowBySlug(slug: string) {
  return one<HotelRow>('SELECT * FROM hotels WHERE slug = $1', [slug.toLowerCase()]);
}

export function splitProfile(p: HotelProfile) {
  const { slug, name_en, name_ar, ...rest } = p;
  return { slug, name_en, name_ar, profile: rest };
}

export async function ensureDepartments(hotelId: string, db?: Queryable) {
  for (const code of DEPARTMENTS) {
    await q(
      `INSERT INTO departments (hotel_id, code, name_en, name_ar) VALUES ($1,$2,$3,$4)
       ON CONFLICT (hotel_id, code) DO NOTHING`,
      [hotelId, code, DEPARTMENT_LABELS[code].en, DEPARTMENT_LABELS[code].ar],
      db
    );
  }
}
