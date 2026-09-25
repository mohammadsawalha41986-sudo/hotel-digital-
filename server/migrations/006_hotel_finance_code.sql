-- 006: unique per-hotel code for financial document numbers.
--
-- Ledger entries, adjustments and settlements are numbered <PREFIX>-<CODE>-<n>
-- with a per-hotel counter, and those numbers are unique platform-wide. The
-- code used to be derived on the fly from the first 8 letters of the slug, so
-- two hotels such as "swiss-flora-royal" and "swiss-flora-jeddah" shared
-- "SWISSFLO": the second hotel's first ledger entry collided with the first
-- hotel's, its counter rolled back, and none of its orders could complete.
--
-- Each hotel now stores its own code. Numbers already issued never change; a
-- colliding hotel gets a numeric suffix, and number generation skips any number
-- that already exists (server/services/finance.ts, nextNo), so a legacy overlap
-- cannot block a hotel. Suffixed codes are ≥ 9 characters and plain codes ≤ 8,
-- so a suffixed code can never equal another hotel's plain code.

ALTER TABLE hotels ADD COLUMN IF NOT EXISTS finance_code text;

-- Within a group of colliding hotels, the plain code goes to the hotel that has
-- issued the most documents with it (its numbers stay meaningful); ties and
-- groups with no documents fall back to the oldest hotel.
WITH base AS (
  SELECT id, created_at, COALESCE(NULLIF(upper(left(regexp_replace(slug, '[^A-Za-z0-9]', '', 'g'), 8)), ''), 'HOTEL') AS base FROM hotels
), issued AS (
  SELECT b.id,
         (SELECT COUNT(*) FROM commission_ledger l WHERE l.hotel_id = b.id AND l.entry_no LIKE '%-' || b.base || '-%')
       + (SELECT COUNT(*) FROM settlements s WHERE s.hotel_id = b.id AND s.settlement_no LIKE '%-' || b.base || '-%') AS n
    FROM base b
), derived AS (
  SELECT b.id, b.base,
         row_number() OVER (PARTITION BY b.base ORDER BY i.n DESC, b.created_at, b.id) AS rank
    FROM base b JOIN issued i ON i.id = b.id
)
UPDATE hotels h SET finance_code = CASE WHEN d.rank = 1 THEN d.base ELSE d.base || d.rank END
  FROM derived d WHERE d.id = h.id AND h.finance_code IS NULL;

ALTER TABLE hotels ALTER COLUMN finance_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS hotels_finance_code_uq ON hotels (finance_code);

-- New hotels get a free code whatever path creates them (admin UI, seeds, imports).
CREATE OR REPLACE FUNCTION hotels_assign_finance_code() RETURNS trigger AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
BEGIN
  IF NEW.finance_code IS NOT NULL THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('hotels.finance_code'));
  base := COALESCE(NULLIF(upper(left(regexp_replace(NEW.slug, '[^A-Za-z0-9]', '', 'g'), 8)), ''), 'HOTEL');
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM hotels WHERE finance_code = candidate) LOOP
    n := n + 1;
    candidate := base || n;
  END LOOP;
  NEW.finance_code := candidate;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hotels_finance_code_trg ON hotels;
CREATE TRIGGER hotels_finance_code_trg BEFORE INSERT ON hotels FOR EACH ROW EXECUTE FUNCTION hotels_assign_finance_code();
