-- CMS v2: stable codes, archive, publish snapshots, import batches,
-- media variants, laundry categories/packages, custom departments,
-- guest-relations resolution.

-- New catalog tables (same generic shape as 001).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['laundry_categories','laundry_packages']
  LOOP
    EXECUTE format($f$
      CREATE TABLE %I (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        hotel_id    uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
        parent_id   uuid,
        sort_order  int NOT NULL DEFAULT 0,
        is_active   boolean NOT NULL DEFAULT true,
        name_en     text NOT NULL DEFAULT '',
        name_ar     text NOT NULL DEFAULT '',
        data        jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at  timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now()
      )$f$, t);
    EXECUTE format('CREATE INDEX %I ON %I (hotel_id, parent_id, sort_order)', t || '_scope_idx', t);
  END LOOP;
END $$;

-- Stable human-readable codes + archive on every catalog table.
DO $$
DECLARE t text; prefix text;
BEGIN
  FOREACH t IN ARRAY ARRAY['offers','quick_actions','outlets','menus','menu_categories','menu_items','room_services',
                           'hotel_services','spa_categories','spa_services','laundry_items','info_items',
                           'laundry_categories','laundry_packages']
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN code text, ADD COLUMN archived_at timestamptz', t);
    prefix := CASE t
      WHEN 'offers' THEN 'OFFER' WHEN 'quick_actions' THEN 'QA' WHEN 'outlets' THEN 'OUTLET' WHEN 'menus' THEN 'MENU'
      WHEN 'menu_categories' THEN 'CAT' WHEN 'menu_items' THEN 'ITEM' WHEN 'room_services' THEN 'RS'
      WHEN 'hotel_services' THEN 'GS' WHEN 'spa_categories' THEN 'SPACAT' WHEN 'spa_services' THEN 'SPA'
      WHEN 'laundry_items' THEN 'LAUNDRY' WHEN 'info_items' THEN 'INFO' WHEN 'laundry_categories' THEN 'LCAT'
      ELSE 'LPKG' END;
    -- Backfill: PREFIX-SLUG, de-duplicated with a numeric suffix.
    EXECUTE format($f$
      WITH base AS (
        SELECT id, hotel_id,
               %L || '-' || COALESCE(NULLIF(trim(both '-' from upper(regexp_replace(
                 regexp_replace(name_en, '\[demo\]', '', 'gi'), '[^A-Za-z0-9]+', '-', 'g'))), ''), 'X') AS c,
               created_at
          FROM %I),
      ranked AS (SELECT id, c, row_number() OVER (PARTITION BY hotel_id, c ORDER BY created_at, id) AS n FROM base)
      UPDATE %I t SET code = left(CASE WHEN r.n = 1 THEN r.c ELSE r.c || '-' || r.n END, 64)
        FROM ranked r WHERE r.id = t.id$f$, prefix, t, t);
    EXECUTE format('CREATE UNIQUE INDEX %I ON %I (hotel_id, code)', t || '_code_uq', t);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN code SET NOT NULL', t);
  END LOOP;
END $$;

-- Laundry: category becomes a real entity (garments are its children).
INSERT INTO laundry_categories (hotel_id, sort_order, name_en, name_ar, code, data)
SELECT DISTINCT ON (i.hotel_id, i.data->>'category')
       i.hotel_id,
       CASE i.data->>'category' WHEN 'gentlemen' THEN 0 WHEN 'ladies' THEN 1 WHEN 'children' THEN 2 WHEN 'traditional' THEN 3 WHEN 'household' THEN 4 ELSE 5 END,
       CASE i.data->>'category' WHEN 'gentlemen' THEN 'Gentlemen' WHEN 'ladies' THEN 'Ladies' WHEN 'children' THEN 'Children'
            WHEN 'traditional' THEN 'Traditional wear' WHEN 'household' THEN 'Household' ELSE 'Other items' END,
       CASE i.data->>'category' WHEN 'gentlemen' THEN 'الرجال' WHEN 'ladies' THEN 'السيدات' WHEN 'children' THEN 'الأطفال'
            WHEN 'traditional' THEN 'الملابس التقليدية' WHEN 'household' THEN 'المنزلية' ELSE 'أخرى' END,
       'LCAT-' || upper(COALESCE(i.data->>'category', 'OTHER')),
       jsonb_build_object('name_en', CASE i.data->>'category' WHEN 'gentlemen' THEN 'Gentlemen' WHEN 'ladies' THEN 'Ladies' WHEN 'children' THEN 'Children'
            WHEN 'traditional' THEN 'Traditional wear' WHEN 'household' THEN 'Household' ELSE 'Other items' END,
                          'name_ar', CASE i.data->>'category' WHEN 'gentlemen' THEN 'الرجال' WHEN 'ladies' THEN 'السيدات' WHEN 'children' THEN 'الأطفال'
            WHEN 'traditional' THEN 'الملابس التقليدية' WHEN 'household' THEN 'المنزلية' ELSE 'أخرى' END)
  FROM laundry_items i
 ORDER BY i.hotel_id, i.data->>'category';

UPDATE laundry_items i SET parent_id = c.id, data = i.data - 'category'
  FROM laundry_categories c
 WHERE c.hotel_id = i.hotel_id AND c.code = 'LCAT-' || upper(COALESCE(i.data->>'category', 'OTHER'));

ALTER TABLE laundry_items ADD CONSTRAINT laundry_items_parent_fk FOREIGN KEY (parent_id) REFERENCES laundry_categories(id) ON DELETE RESTRICT;

-- Deleting a parent that still has children is refused by the API; the DB enforces it too.
ALTER TABLE menus           DROP CONSTRAINT menus_parent_fk,           ADD CONSTRAINT menus_parent_fk           FOREIGN KEY (parent_id) REFERENCES outlets(id)         ON DELETE RESTRICT;
ALTER TABLE menu_categories DROP CONSTRAINT menu_categories_parent_fk, ADD CONSTRAINT menu_categories_parent_fk FOREIGN KEY (parent_id) REFERENCES menus(id)           ON DELETE RESTRICT;
ALTER TABLE menu_items      DROP CONSTRAINT menu_items_parent_fk,      ADD CONSTRAINT menu_items_parent_fk      FOREIGN KEY (parent_id) REFERENCES menu_categories(id) ON DELETE RESTRICT;
ALTER TABLE spa_services    DROP CONSTRAINT spa_services_parent_fk,    ADD CONSTRAINT spa_services_parent_fk    FOREIGN KEY (parent_id) REFERENCES spa_categories(id)  ON DELETE RESTRICT;

-- Publishing: guests read an immutable snapshot of the published content.
ALTER TABLE hotels ADD COLUMN draft_updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE publications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id     uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  version      int NOT NULL,
  snapshot     jsonb NOT NULL,
  summary      jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_by uuid REFERENCES users(id) ON DELETE SET NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, version)
);
CREATE INDEX publications_latest_idx ON publications (hotel_id, version DESC);

-- Excel import batches (staged preview → commit → optional rollback).
CREATE TABLE import_batches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  user_email    text NOT NULL DEFAULT '',
  template      text NOT NULL,
  filename      text NOT NULL DEFAULT '',
  mode          text NOT NULL,
  status        text NOT NULL,           -- previewed | committed | failed | rolled_back
  summary       jsonb NOT NULL DEFAULT '{}'::jsonb,
  results       jsonb NOT NULL DEFAULT '[]'::jsonb,
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  changes       jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  committed_at  timestamptz,
  rolled_back_at timestamptz
);
CREATE INDEX import_batches_hotel_idx ON import_batches (hotel_id, created_at DESC);

-- Media: dimensions and responsive variants.
ALTER TABLE media ADD COLUMN width int, ADD COLUMN height int, ADD COLUMN variants jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Hotel-defined departments.
ALTER TABLE departments ADD COLUMN is_custom boolean NOT NULL DEFAULT false, ADD COLUMN sort_order int NOT NULL DEFAULT 0;

-- Guest relations.
ALTER TABLE requests ADD COLUMN resolution text NOT NULL DEFAULT '', ADD COLUMN resolved_at timestamptz;
