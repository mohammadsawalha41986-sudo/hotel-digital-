-- Guest experience layer: admin-managed experience categories and
-- privacy-safe engagement counters.

-- Experience categories (homepage discovery tiles), same generic shape as
-- every catalog table.
CREATE TABLE experiences (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  parent_id   uuid,
  sort_order  int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  name_en     text NOT NULL DEFAULT '',
  name_ar     text NOT NULL DEFAULT '',
  code        text NOT NULL,
  archived_at timestamptz,
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX experiences_scope_idx ON experiences (hotel_id, parent_id, sort_order);
CREATE UNIQUE INDEX experiences_code_uq ON experiences (hotel_id, code);

-- Engagement is stored only as daily aggregate counts per hotel, event and
-- target. No guest identifier, device id, IP or session is recorded.
CREATE TABLE guest_event_counts (
  hotel_id    uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  day         date NOT NULL,
  event       text NOT NULL,
  target_type text NOT NULL DEFAULT '',
  target_code text NOT NULL DEFAULT '',
  n           int  NOT NULL DEFAULT 0,
  PRIMARY KEY (hotel_id, day, event, target_type, target_code)
);
CREATE INDEX guest_event_counts_day_idx ON guest_event_counts (hotel_id, day DESC);
