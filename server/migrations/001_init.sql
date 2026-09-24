-- Hotel Digital Guest Hub — initial schema.
-- Every hotel-owned row carries hotel_id; all queries filter on it.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE hotels (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  is_published  boolean NOT NULL DEFAULT false,
  name_en       text NOT NULL,
  name_ar       text NOT NULL,
  profile       jsonb NOT NULL DEFAULT '{}'::jsonb,
  branding      jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings      jsonb NOT NULL DEFAULT '{}'::jsonb,
  site_draft     jsonb NOT NULL DEFAULT '{}'::jsonb,
  site_published jsonb NOT NULL DEFAULT '{}'::jsonb,
  site_published_at timestamptz,
  site_draft_updated_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  name          text NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  failed_logins int NOT NULL DEFAULT 0,
  locked_until  timestamptz,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_hotels (
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, hotel_id)
);

CREATE TABLE sessions (
  id          text PRIMARY KEY, -- sha256 of the cookie token
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  ip          text,
  user_agent  text
);
CREATE INDEX sessions_user_idx ON sessions(user_id);

CREATE TABLE departments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  code        text NOT NULL,
  name_en     text NOT NULL,
  name_ar     text NOT NULL,
  whatsapp    text NOT NULL DEFAULT '',
  phone       text NOT NULL DEFAULT '',
  email       text NOT NULL DEFAULT '',
  is_active   boolean NOT NULL DEFAULT true,
  sla_minutes int,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, code)
);

-- Generic catalog tables share one shape: typed keys + validated JSON payload.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['offers','quick_actions','outlets','menus','menu_categories','menu_items',
                           'room_services','hotel_services','spa_categories','spa_services','laundry_items','info_items']
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

-- Parent integrity (children are removed with their parents).
ALTER TABLE menus           ADD CONSTRAINT menus_parent_fk           FOREIGN KEY (parent_id) REFERENCES outlets(id)         ON DELETE CASCADE;
ALTER TABLE menu_categories ADD CONSTRAINT menu_categories_parent_fk FOREIGN KEY (parent_id) REFERENCES menus(id)           ON DELETE CASCADE;
ALTER TABLE menu_items      ADD CONSTRAINT menu_items_parent_fk      FOREIGN KEY (parent_id) REFERENCES menu_categories(id) ON DELETE CASCADE;
ALTER TABLE spa_services    ADD CONSTRAINT spa_services_parent_fk    FOREIGN KEY (parent_id) REFERENCES spa_categories(id)  ON DELETE CASCADE;

CREATE TABLE counters (
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  key      text NOT NULL,
  value    int NOT NULL DEFAULT 0,
  PRIMARY KEY (hotel_id, key)
);

CREATE TABLE requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  reference       text NOT NULL,
  type            text NOT NULL,
  department      text NOT NULL,
  status          text NOT NULL DEFAULT 'NEW',
  priority        text NOT NULL DEFAULT 'NORMAL',
  title_en        text NOT NULL,
  title_ar        text NOT NULL,
  guest_type      text NOT NULL,
  guest_name      text NOT NULL,
  guest_phone     text NOT NULL DEFAULT '',
  room            text NOT NULL DEFAULT '',
  lang            text NOT NULL DEFAULT 'en',
  source_id       uuid,          -- outlet / service id
  lines           jsonb NOT NULL DEFAULT '[]'::jsonb,
  details         jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes           text NOT NULL DEFAULT '',
  subtotal        numeric(12,2),
  vat             numeric(12,2),
  total           numeric(12,2),
  currency        text NOT NULL DEFAULT 'SAR',
  whatsapp_to     text NOT NULL DEFAULT '',
  whatsapp_text   text NOT NULL DEFAULT '',
  guest_token_hash text NOT NULL,
  assigned_to     uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  accepted_at     timestamptz,
  started_at      timestamptz,
  completed_at    timestamptz,
  rejected_at     timestamptz,
  cancelled_at    timestamptz,
  UNIQUE (hotel_id, reference)
);
CREATE INDEX requests_queue_idx ON requests (hotel_id, status, created_at DESC);
CREATE INDEX requests_dept_idx  ON requests (hotel_id, department, created_at DESC);
CREATE INDEX requests_guest_idx ON requests (hotel_id, guest_token_hash, created_at DESC);

CREATE TABLE request_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  hotel_id    uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  from_status text,
  to_status   text,
  note        text NOT NULL DEFAULT '',
  is_internal boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX request_events_req_idx ON request_events (request_id, created_at);

CREATE TABLE reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  guest_name  text NOT NULL,
  room        text NOT NULL DEFAULT '',
  rating      int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       text NOT NULL DEFAULT '',
  body        text NOT NULL,
  lang        text NOT NULL DEFAULT 'en',
  status      text NOT NULL DEFAULT 'PENDING',
  moderated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  moderated_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reviews_hotel_idx ON reviews (hotel_id, status, created_at DESC);

CREATE TABLE media (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  url         text NOT NULL,
  kind        text NOT NULL,        -- image | video | file
  source      text NOT NULL,        -- upload | url | guest_upload
  mime        text NOT NULL DEFAULT '',
  size_bytes  int,
  filename    text NOT NULL DEFAULT '',
  label       text NOT NULL DEFAULT '',
  created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_hotel_idx ON media (hotel_id, created_at DESC);

CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  hotel_id    uuid REFERENCES hotels(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  user_email  text NOT NULL DEFAULT '',
  action      text NOT NULL,
  entity      text NOT NULL,
  entity_id   text,
  summary     text NOT NULL DEFAULT '',
  before      jsonb,
  after       jsonb,
  ip          text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_hotel_idx ON audit_log (hotel_id, created_at DESC);
