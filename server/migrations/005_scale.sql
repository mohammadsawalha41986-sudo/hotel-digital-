-- 005: production scale and financial safety. Additive only (expand phase):
-- every statement is backward compatible with the previous release.

-- Idempotent guest checkout: a retried or double-submitted request with the same
-- key from the same guest device returns the original order instead of a new one.
ALTER TABLE requests ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS idempotency_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS requests_idempotency_uq
  ON requests (hotel_id, guest_token_hash, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Hotel acknowledgement of an approved or settled statement (the hotel side of
-- the maker–checker chain). Set once; never cleared.
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS acknowledged_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS hotel_note text NOT NULL DEFAULT '';
