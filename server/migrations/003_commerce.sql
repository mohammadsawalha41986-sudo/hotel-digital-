-- Commerce: guest CRM, structured orders, commission engine, ledger,
-- adjustments and settlements.
--
-- Operational state (requests = orders, order_lines, request_events) is kept
-- separate from financial state (financial_snapshots, commission_ledger,
-- financial_adjustments, settlements). Money in financial tables is stored in
-- integer minor units (halalas); rates in basis points (500 = 5.00%).
-- Financial rows are append-only: triggers refuse UPDATE/DELETE of amounts.

-- ---------------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------------
-- Hotel deletion (super admin, rare) must still cascade. Everything else is
-- refused unless the session explicitly opts into maintenance mode.
CREATE FUNCTION hub_refuse_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('hub.maintenance', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION '% on % is not allowed: financial and history records are immutable', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'integrity_constraint_violation';
END $$;

-- ---------------------------------------------------------------------------
-- Guests
-- ---------------------------------------------------------------------------
CREATE TABLE guests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id         uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  guest_no         text NOT NULL,                 -- human id, e.g. G-000123
  guest_type       text NOT NULL,                 -- IN_HOUSE | EXTERNAL (latest context)
  name             text NOT NULL,
  name_key         text NOT NULL DEFAULT '',      -- normalised name for duplicate detection
  phone            text NOT NULL DEFAULT '',      -- E.164, '' when not given
  country_code     text NOT NULL DEFAULT '',      -- dialling code, e.g. 966
  email            text NOT NULL DEFAULT '',
  preferred_lang   text NOT NULL DEFAULT 'en',
  consent_marketing boolean NOT NULL DEFAULT false,
  consent_updated_at timestamptz,
  notes            text NOT NULL DEFAULT '',      -- staff notes
  merged_into      uuid REFERENCES guests(id) ON DELETE SET NULL,
  anonymized_at    timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, guest_no)
);
-- Not unique: family members often share one phone. Matching also requires a compatible name.
CREATE INDEX guests_phone_idx ON guests (hotel_id, phone) WHERE phone <> '';
CREATE INDEX guests_email_idx ON guests (hotel_id, lower(email)) WHERE email <> '';
CREATE INDEX guests_name_idx ON guests (hotel_id, name_key);
CREATE INDEX guests_activity_idx ON guests (hotel_id, last_activity_at DESC);

-- A stay (in-house) or visit (external) — the context of the guest's orders.
CREATE TABLE guest_stays (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id       uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  guest_id       uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  guest_type     text NOT NULL,
  room           text NOT NULL DEFAULT '',
  check_in       date,
  check_out      date,
  stay_reference text NOT NULL DEFAULT '',        -- PMS / booking reference when known
  source         text NOT NULL DEFAULT 'QR',      -- QR | GUEST_PORTAL | ADMIN | PMS
  started_at     timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  ended_at       timestamptz,
  CHECK (check_out IS NULL OR check_in IS NULL OR check_out >= check_in)
);
CREATE INDEX guest_stays_guest_idx ON guest_stays (guest_id, last_seen_at DESC);
CREATE INDEX guest_stays_room_idx ON guest_stays (hotel_id, room) WHERE room <> '';
CREATE INDEX guest_stays_ref_idx ON guest_stays (hotel_id, stay_reference) WHERE stay_reference <> '';

-- A device session (hashed guest token) — "QR session started" on the timeline.
CREATE TABLE guest_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id     uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  token_hash   text NOT NULL,
  guest_id     uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  stay_id      uuid REFERENCES guest_stays(id) ON DELETE SET NULL,
  entry        text NOT NULL DEFAULT 'GUEST_PORTAL', -- QR | GUEST_PORTAL
  qr_room      text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, token_hash, guest_id)
);
CREATE INDEX guest_sessions_token_idx ON guest_sessions (hotel_id, token_hash, last_seen_at DESC);

-- ---------------------------------------------------------------------------
-- Orders (the existing requests table is the canonical operational order)
-- ---------------------------------------------------------------------------
ALTER TABLE requests
  ADD COLUMN guest_id        uuid REFERENCES guests(id) ON DELETE SET NULL,
  ADD COLUMN stay_id         uuid REFERENCES guest_stays(id) ON DELETE SET NULL,
  ADD COLUMN hotel_name      text NOT NULL DEFAULT '',
  ADD COLUMN source          text NOT NULL DEFAULT 'GUEST_PORTAL', -- QR | GUEST_PORTAL | WHATSAPP | ADMIN | MANUAL
  ADD COLUMN order_type      text NOT NULL DEFAULT 'OTHER',        -- FNB | ROOM_SERVICE | LAUNDRY | SPA | GUEST_SERVICE | OFFER_PACKAGE | OTHER
  ADD COLUMN is_commercial   boolean NOT NULL DEFAULT false,
  ADD COLUMN discount        numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN service_charge  numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN other_fees      numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN ready_at        timestamptz,
  ADD COLUMN created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  -- NOT_APPLICABLE | AWAITING_ELIGIBILITY | ELIGIBLE | NOT_ELIGIBLE | RULE_UNAVAILABLE | HISTORICAL_RULE_UNAVAILABLE
  ADD COLUMN financial_status text NOT NULL DEFAULT 'NOT_APPLICABLE',
  ADD COLUMN financial_note  text NOT NULL DEFAULT '';

-- Backfill the new classification for requests created before this migration.
UPDATE requests SET order_type = CASE type
    WHEN 'ORDER' THEN 'FNB' WHEN 'ROOM_SERVICE' THEN 'ROOM_SERVICE' WHEN 'HOTEL_SERVICE' THEN 'GUEST_SERVICE'
    WHEN 'LAUNDRY' THEN 'LAUNDRY' WHEN 'SPA' THEN 'SPA' ELSE 'OTHER' END,
  is_commercial = COALESCE(total, 0) > 0,
  hotel_name = (SELECT name_en FROM hotels h WHERE h.id = requests.hotel_id),
  financial_status = CASE WHEN COALESCE(total, 0) > 0 THEN 'AWAITING_ELIGIBILITY' ELSE 'NOT_APPLICABLE' END;

CREATE INDEX requests_guest_id_idx ON requests (hotel_id, guest_id, created_at DESC);
CREATE INDEX requests_created_idx  ON requests (hotel_id, created_at DESC);
CREATE INDEX requests_fin_idx      ON requests (hotel_id, financial_status);

-- Structured, immutable order lines (names and prices as they were at order time).
CREATE TABLE order_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  request_id      uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  line_no         int NOT NULL,
  item_entity     text NOT NULL DEFAULT '',   -- menu_items | room_services | hotel_services | spa_services | laundry_items
  item_id         uuid,
  item_code       text NOT NULL DEFAULT '',
  category_code   text NOT NULL DEFAULT '',   -- menu category / spa category / laundry category code
  name_en         text NOT NULL,
  name_ar         text NOT NULL,
  quantity        int NOT NULL CHECK (quantity > 0),
  unit_price_minor bigint NOT NULL CHECK (unit_price_minor >= 0),  -- as listed, incl. modifiers
  modifiers       jsonb NOT NULL DEFAULT '[]'::jsonb,
  service         text NOT NULL DEFAULT '',   -- laundry service etc.
  vat_mode        text NOT NULL,              -- inclusive | exclusive | exempt (resolved)
  vat_rate_bps    int NOT NULL DEFAULT 0,
  discount_minor  bigint NOT NULL DEFAULT 0 CHECK (discount_minor >= 0),
  net_minor       bigint NOT NULL,            -- excl. VAT, after discount
  vat_minor       bigint NOT NULL,
  gross_minor     bigint NOT NULL,            -- line total incl. VAT
  note            text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, line_no)
);
CREATE INDEX order_lines_item_idx ON order_lines (hotel_id, item_code);
-- Requests created before this migration: rebuild their lines from the stored
-- display lines so a later completion is priced from what the guest ordered.
-- VAT is split pro rata from the request totals; vat_mode records the origin.
INSERT INTO order_lines (hotel_id, request_id, line_no, item_entity, item_id, item_code, name_en, name_ar, quantity, unit_price_minor,
                         modifiers, service, vat_mode, net_minor, vat_minor, gross_minor, note)
SELECT r.hotel_id, r.id, l.ord::int, 'legacy',
       CASE WHEN l.v->>'item_id' ~* '^[0-9a-f-]{36}$' THEN (l.v->>'item_id')::uuid END, '',
       COALESCE(l.v->>'name_en', r.title_en), COALESCE(l.v->>'name_ar', r.title_ar), GREATEST(COALESCE((l.v->>'quantity')::int, 1), 1),
       ROUND(COALESCE((l.v->>'unit_price')::numeric, 0) * 100),
       COALESCE(l.v->'modifiers', '[]'::jsonb), COALESCE(l.v->>'service', ''), 'legacy',
       ROUND((l.v->>'amount')::numeric * 100) - ROUND((l.v->>'amount')::numeric * 100 * COALESCE(r.vat, 0) / NULLIF(r.total, 0)),
       ROUND((l.v->>'amount')::numeric * 100 * COALESCE(r.vat, 0) / NULLIF(r.total, 0)),
       ROUND((l.v->>'amount')::numeric * 100), COALESCE(l.v->>'note', '')
  FROM requests r, jsonb_array_elements(r.lines) WITH ORDINALITY AS l(v, ord)
 WHERE COALESCE(r.total, 0) > 0 AND (l.v->>'amount') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM order_lines x WHERE x.request_id = r.id);
CREATE TRIGGER order_lines_immutable BEFORE UPDATE OR DELETE ON order_lines FOR EACH ROW EXECUTE FUNCTION hub_refuse_change();

-- Status history: typed, attributable and immutable.
ALTER TABLE request_events
  ADD COLUMN event_type text NOT NULL DEFAULT 'STATUS', -- CREATED | STATUS | NOTE | GUEST_MESSAGE | FINANCIAL | REFUNDED | ADJUSTED
  ADD COLUMN actor_type text NOT NULL DEFAULT 'staff',  -- guest | staff | system
  ADD COLUMN actor_name text NOT NULL DEFAULT '',
  ADD COLUMN reason     text NOT NULL DEFAULT '';
UPDATE request_events SET event_type = CASE
    WHEN from_status IS NULL AND to_status = 'NEW' THEN 'CREATED'
    WHEN to_status IS NULL OR (from_status IS NULL AND to_status <> 'NEW') THEN CASE WHEN is_internal THEN 'NOTE' ELSE 'GUEST_MESSAGE' END
    ELSE 'STATUS' END,
  actor_type = CASE WHEN user_id IS NULL THEN 'guest' ELSE 'staff' END;
CREATE TRIGGER request_events_immutable BEFORE UPDATE OR DELETE ON request_events FOR EACH ROW EXECUTE FUNCTION hub_refuse_change();

ALTER TABLE reviews ADD COLUMN guest_id uuid REFERENCES guests(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Commercial agreements & commission rule versions
-- ---------------------------------------------------------------------------
-- Per-hotel commercial settings (who at the hotel may see commission data).
CREATE TABLE hotel_commercial_settings (
  hotel_id             uuid PRIMARY KEY REFERENCES hotels(id) ON DELETE CASCADE,
  hotel_finance_access text NOT NULL DEFAULT 'NONE',  -- NONE | SETTLEMENTS | FULL
  settlement_frequency text NOT NULL DEFAULT 'MONTHLY', -- WEEKLY | BIWEEKLY | MONTHLY | CUSTOM
  guest_retention_days int,                            -- NULL = keep until deleted on request
  updated_by           uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE commission_agreement_seq;
CREATE TABLE commission_agreements (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id           uuid REFERENCES hotels(id) ON DELETE CASCADE,   -- NULL = platform default agreement
  agreement_no       text NOT NULL UNIQUE,
  name               text NOT NULL,
  contract_reference text NOT NULL DEFAULT '',
  currency           text NOT NULL DEFAULT 'SAR',
  notes              text NOT NULL DEFAULT '',
  is_active          boolean NOT NULL DEFAULT true,
  created_by         uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX commission_agreements_hotel_idx ON commission_agreements (hotel_id);

-- Each row is one immutable version. A rate change is a new version; the
-- previous version is closed by setting effective_to (the only permitted edit
-- besides notes/deactivation).
CREATE TABLE commission_rules (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id       uuid NOT NULL REFERENCES commission_agreements(id) ON DELETE RESTRICT,
  hotel_id           uuid REFERENCES hotels(id) ON DELETE CASCADE,  -- copy of agreement.hotel_id for scoping
  rule_key           uuid NOT NULL,          -- stable identity across versions
  version            int NOT NULL,
  scope_level        text NOT NULL,          -- PLATFORM | HOTEL | ORDER_TYPE | DEPARTMENT | OUTLET | CATEGORY | SERVICE
  scope_value        text NOT NULL DEFAULT '',
  commission_type    text NOT NULL,          -- PERCENTAGE | FIXED | PERCENTAGE_PLUS_FIXED
  rate_bps           int NOT NULL DEFAULT 0 CHECK (rate_bps BETWEEN 0 AND 10000),
  fixed_fee_minor    bigint NOT NULL DEFAULT 0 CHECK (fixed_fee_minor >= 0),
  basis              text NOT NULL,          -- GROSS_INCL_VAT | NET_EXCL_VAT | SUBTOTAL_BEFORE_DISCOUNT
  eligible_status    text NOT NULL DEFAULT 'COMPLETED', -- COMPLETED | ACCEPTED
  cancellation_policy text NOT NULL DEFAULT 'NO_COMMISSION', -- NO_COMMISSION | CHARGE_IF_ACCEPTED
  included_codes     text[] NOT NULL DEFAULT '{}',  -- empty = every line
  excluded_codes     text[] NOT NULL DEFAULT '{}',
  tax_treatment      text NOT NULL,          -- NOT_APPLICABLE | EXCLUSIVE | INCLUSIVE
  tax_rate_bps       int NOT NULL DEFAULT 0 CHECK (tax_rate_bps BETWEEN 0 AND 10000),
  effective_from     timestamptz NOT NULL,
  effective_to       timestamptz,            -- exclusive; NULL = open-ended
  is_active          boolean NOT NULL DEFAULT true,
  notes              text NOT NULL DEFAULT '',
  created_by         uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rule_key, version),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE INDEX commission_rules_lookup_idx ON commission_rules (hotel_id, scope_level, scope_value, effective_from);

CREATE FUNCTION commission_rules_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('hub.maintenance', true) = 'on' THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Commission rule versions cannot be deleted; deactivate or close them instead' USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF (NEW.agreement_id, NEW.hotel_id, NEW.rule_key, NEW.version, NEW.scope_level, NEW.scope_value, NEW.commission_type, NEW.rate_bps,
      NEW.fixed_fee_minor, NEW.basis, NEW.eligible_status, NEW.cancellation_policy, NEW.included_codes, NEW.excluded_codes,
      NEW.tax_treatment, NEW.tax_rate_bps, NEW.effective_from, NEW.created_at)
     IS DISTINCT FROM
     (OLD.agreement_id, OLD.hotel_id, OLD.rule_key, OLD.version, OLD.scope_level, OLD.scope_value, OLD.commission_type, OLD.rate_bps,
      OLD.fixed_fee_minor, OLD.basis, OLD.eligible_status, OLD.cancellation_policy, OLD.included_codes, OLD.excluded_codes,
      OLD.tax_treatment, OLD.tax_rate_bps, OLD.effective_from, OLD.created_at) THEN
    RAISE EXCEPTION 'Commission rule terms are immutable; create a new version instead' USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER commission_rules_immutable BEFORE UPDATE OR DELETE ON commission_rules FOR EACH ROW EXECUTE FUNCTION commission_rules_guard();

-- ---------------------------------------------------------------------------
-- Financial snapshot (one per order, locked when the order becomes eligible)
-- ---------------------------------------------------------------------------
CREATE TABLE financial_snapshots (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id                uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  request_id              uuid NOT NULL UNIQUE REFERENCES requests(id) ON DELETE CASCADE,
  currency                text NOT NULL,
  locked_at               timestamptz NOT NULL DEFAULT now(),
  trigger_status          text NOT NULL,     -- the order status that made it eligible
  subtotal_before_discount_minor bigint NOT NULL,
  discount_minor          bigint NOT NULL,
  net_minor               bigint NOT NULL,   -- excl. VAT, after discount
  vat_minor               bigint NOT NULL,
  service_charge_minor    bigint NOT NULL DEFAULT 0,
  other_fees_minor        bigint NOT NULL DEFAULT 0,
  gross_minor             bigint NOT NULL,   -- grand total paid by the guest
  eligible_lines          jsonb NOT NULL,    -- [{line_id, line_no, code, base_minor}]
  basis                   text NOT NULL,
  eligible_base_minor     bigint NOT NULL,
  commission_type         text NOT NULL,
  rate_bps                int NOT NULL,
  fixed_fee_minor         bigint NOT NULL,
  commission_minor        bigint NOT NULL,
  tax_treatment           text NOT NULL,
  tax_rate_bps            int NOT NULL,
  commission_tax_minor    bigint NOT NULL,
  platform_revenue_minor  bigint NOT NULL,
  hotel_amount_minor      bigint NOT NULL,
  rule_id                 uuid NOT NULL REFERENCES commission_rules(id) ON DELETE RESTRICT,
  rule_key                uuid NOT NULL,
  rule_version            int NOT NULL,
  rule_level              text NOT NULL,
  agreement_id            uuid NOT NULL REFERENCES commission_agreements(id) ON DELETE RESTRICT,
  rule_terms              jsonb NOT NULL,    -- full copy of the rule as applied
  order_context           jsonb NOT NULL,    -- keys used for rule resolution
  formula                 text NOT NULL      -- human-readable calculation
);
CREATE TRIGGER financial_snapshots_immutable BEFORE UPDATE OR DELETE ON financial_snapshots FOR EACH ROW EXECUTE FUNCTION hub_refuse_change();

-- ---------------------------------------------------------------------------
-- Settlements (declared before the ledger so the ledger can reference them)
-- ---------------------------------------------------------------------------
CREATE TABLE settlements (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id                uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  settlement_no           text NOT NULL UNIQUE,
  period_type             text NOT NULL,     -- WEEKLY | BIWEEKLY | MONTHLY | CUSTOM
  period_start            date NOT NULL,
  period_end              date NOT NULL,     -- inclusive, hotel local dates
  currency                text NOT NULL,
  status                  text NOT NULL DEFAULT 'DRAFT', -- DRAFT | REVIEWED | APPROVED | SETTLED | VOID
  entry_count             int NOT NULL DEFAULT 0,
  order_count             int NOT NULL DEFAULT 0,
  gross_minor             bigint NOT NULL DEFAULT 0,
  refunds_minor           bigint NOT NULL DEFAULT 0,
  adjustments_minor       bigint NOT NULL DEFAULT 0,
  base_minor              bigint NOT NULL DEFAULT 0,
  commission_minor        bigint NOT NULL DEFAULT 0,
  commission_tax_minor    bigint NOT NULL DEFAULT 0,
  platform_revenue_minor  bigint NOT NULL DEFAULT 0,
  hotel_amount_minor      bigint NOT NULL DEFAULT 0,
  amount_due_minor        bigint NOT NULL DEFAULT 0, -- owed by the hotel to the platform
  notes                   text NOT NULL DEFAULT '',
  payment_reference       text NOT NULL DEFAULT '',
  created_by              uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL, reviewed_at timestamptz,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL, approved_at timestamptz,
  settled_by  uuid REFERENCES users(id) ON DELETE SET NULL, settled_at  timestamptz,
  voided_by   uuid REFERENCES users(id) ON DELETE SET NULL, voided_at   timestamptz,
  CHECK (period_end >= period_start)
);
CREATE INDEX settlements_hotel_idx ON settlements (hotel_id, period_start DESC);

-- ---------------------------------------------------------------------------
-- Commission ledger
-- ---------------------------------------------------------------------------
CREATE TABLE commission_ledger (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id                uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  entry_no                text NOT NULL UNIQUE,
  entry_type              text NOT NULL,     -- COMMISSION | ADJUSTMENT
  request_id              uuid NOT NULL REFERENCES requests(id) ON DELETE RESTRICT,
  snapshot_id             uuid NOT NULL REFERENCES financial_snapshots(id) ON DELETE RESTRICT,
  adjustment_id           uuid,              -- set for ADJUSTMENT entries
  original_entry_id       uuid REFERENCES commission_ledger(id) ON DELETE RESTRICT,
  earned_at               timestamptz NOT NULL,  -- completion / adjustment time
  currency                text NOT NULL,
  gross_minor             bigint NOT NULL,   -- order value (negative for refunds)
  base_minor              bigint NOT NULL,
  rule_id                 uuid NOT NULL REFERENCES commission_rules(id) ON DELETE RESTRICT,
  rate_bps                int NOT NULL,
  commission_minor        bigint NOT NULL,
  commission_tax_minor    bigint NOT NULL,
  platform_revenue_minor  bigint NOT NULL,
  hotel_amount_minor      bigint NOT NULL,
  status                  text NOT NULL DEFAULT 'EARNED', -- PENDING | EARNED | ADJUSTED | SETTLED | DISPUTED | VOIDED
  settlement_id           uuid REFERENCES settlements(id) ON DELETE RESTRICT,
  dispute_reason          text NOT NULL DEFAULT '',
  created_at              timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX commission_ledger_order_uq ON commission_ledger (request_id) WHERE entry_type = 'COMMISSION';
CREATE INDEX commission_ledger_hotel_idx ON commission_ledger (hotel_id, earned_at);
CREATE INDEX commission_ledger_settlement_idx ON commission_ledger (settlement_id);

-- Amounts are immutable; only status / settlement link / dispute reason may change.
CREATE FUNCTION commission_ledger_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('hub.maintenance', true) = 'on' THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Ledger entries cannot be deleted; post an adjustment instead' USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF (NEW.hotel_id, NEW.entry_no, NEW.entry_type, NEW.request_id, NEW.snapshot_id, NEW.adjustment_id, NEW.original_entry_id, NEW.earned_at,
      NEW.currency, NEW.gross_minor, NEW.base_minor, NEW.rule_id, NEW.rate_bps, NEW.commission_minor, NEW.commission_tax_minor,
      NEW.platform_revenue_minor, NEW.hotel_amount_minor, NEW.created_at)
     IS DISTINCT FROM
     (OLD.hotel_id, OLD.entry_no, OLD.entry_type, OLD.request_id, OLD.snapshot_id, OLD.adjustment_id, OLD.original_entry_id, OLD.earned_at,
      OLD.currency, OLD.gross_minor, OLD.base_minor, OLD.rule_id, OLD.rate_bps, OLD.commission_minor, OLD.commission_tax_minor,
      OLD.platform_revenue_minor, OLD.hotel_amount_minor, OLD.created_at) THEN
    RAISE EXCEPTION 'Ledger amounts are immutable; post an adjustment instead' USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER commission_ledger_immutable BEFORE UPDATE OR DELETE ON commission_ledger FOR EACH ROW EXECUTE FUNCTION commission_ledger_guard();

-- ---------------------------------------------------------------------------
-- Financial adjustments (refunds, corrections, credits/debits)
-- ---------------------------------------------------------------------------
CREATE TABLE financial_adjustments (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id                uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  adjustment_no           text NOT NULL UNIQUE,
  adjustment_type         text NOT NULL,     -- FULL_REFUND | PARTIAL_REFUND | COMMISSION_CORRECTION | HOTEL_CREDIT | HOTEL_DEBIT | PLATFORM_CREDIT | PLATFORM_DEBIT | CANCELLATION_REVERSAL
  request_id              uuid NOT NULL REFERENCES requests(id) ON DELETE RESTRICT,
  original_entry_id       uuid NOT NULL REFERENCES commission_ledger(id) ON DELETE RESTRICT,
  ledger_entry_id         uuid REFERENCES commission_ledger(id) ON DELETE RESTRICT,
  amount_minor            bigint NOT NULL,   -- as entered (refund value or commission amount)
  gross_delta_minor       bigint NOT NULL,
  base_delta_minor        bigint NOT NULL,
  commission_delta_minor  bigint NOT NULL,
  tax_delta_minor         bigint NOT NULL,
  platform_revenue_delta_minor bigint NOT NULL,
  hotel_amount_delta_minor bigint NOT NULL,
  currency                text NOT NULL,
  reason                  text NOT NULL CHECK (length(trim(reason)) >= 3),
  reference               text NOT NULL DEFAULT '',
  calculation             text NOT NULL,
  created_by              uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by_name         text NOT NULL DEFAULT '',
  created_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX financial_adjustments_order_idx ON financial_adjustments (request_id);
ALTER TABLE commission_ledger ADD CONSTRAINT commission_ledger_adjustment_fk FOREIGN KEY (adjustment_id) REFERENCES financial_adjustments(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
-- ledger_entry_id is filled right after the ADJUSTMENT ledger entry is posted.
CREATE FUNCTION financial_adjustments_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('hub.maintenance', true) = 'on' THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Adjustments cannot be deleted; post a reversing adjustment instead' USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF OLD.ledger_entry_id IS NULL AND NEW.ledger_entry_id IS NOT NULL
     AND (to_jsonb(NEW) - 'ledger_entry_id') = (to_jsonb(OLD) - 'ledger_entry_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Adjustments are immutable' USING ERRCODE = 'integrity_constraint_violation';
END $$;
CREATE TRIGGER financial_adjustments_immutable BEFORE UPDATE OR DELETE ON financial_adjustments FOR EACH ROW EXECUTE FUNCTION financial_adjustments_guard();

-- Settlement lines: the exact ledger entries (and amounts) a settlement totals.
CREATE TABLE settlement_lines (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id           uuid NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  hotel_id                uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  ledger_entry_id         uuid NOT NULL REFERENCES commission_ledger(id) ON DELETE RESTRICT,
  request_id              uuid NOT NULL REFERENCES requests(id) ON DELETE RESTRICT,
  entry_type              text NOT NULL,
  gross_minor             bigint NOT NULL,
  base_minor              bigint NOT NULL,
  commission_minor        bigint NOT NULL,
  commission_tax_minor    bigint NOT NULL,
  platform_revenue_minor  bigint NOT NULL,
  hotel_amount_minor      bigint NOT NULL,
  UNIQUE (settlement_id, ledger_entry_id)
);
CREATE INDEX settlement_lines_entry_idx ON settlement_lines (ledger_entry_id);
