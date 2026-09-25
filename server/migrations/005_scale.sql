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

-- Shared fixed-window rate limiting for every API replica. UNLOGGED: counters
-- are disposable (a crash just resets windows) and skip WAL for speed. Keys are
-- SHA-256 hashes, so no client IP or token is stored.
CREATE UNLOGGED TABLE IF NOT EXISTS rate_limits (
  key          text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  window_ms    integer NOT NULL,
  hits         integer NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limits_window_idx ON rate_limits (window_start);

-- Background job runs (maintenance, retention): one row per run, for
-- "at most once per interval across all replicas" and for monitoring.
CREATE TABLE IF NOT EXISTS job_runs (
  id          bigserial PRIMARY KEY,
  job         text NOT NULL,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status      text NOT NULL DEFAULT 'RUNNING',   -- RUNNING | OK | FAILED
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  error       text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS job_runs_job_idx ON job_runs (job, started_at DESC);
