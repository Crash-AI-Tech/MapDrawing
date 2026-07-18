-- Migration 0007: correctness and abuse-prevention primitives.
--
-- Millisecond ordering makes eraser/layer replay deterministic across clients.
-- user_ink is the authoritative server-side quota ledger.
-- api_rate_limits replaces the non-atomic KV read/modify/write limiter.

ALTER TABLE drawings ADD COLUMN created_at_ms INTEGER;
UPDATE drawings SET created_at_ms = created_at * 1000 WHERE created_at_ms IS NULL;

ALTER TABLE drawings ADD COLUMN point_count INTEGER NOT NULL DEFAULT 0;
UPDATE drawings
SET point_count = CASE
  WHEN json_valid(points) THEN json_array_length(points)
  ELSE 0
END;

CREATE INDEX IF NOT EXISTS idx_drawings_order
  ON drawings(created_at_ms DESC, id DESC);

ALTER TABLE map_pins ADD COLUMN created_at_ms INTEGER;
UPDATE map_pins SET created_at_ms = created_at * 1000 WHERE created_at_ms IS NULL;

CREATE INDEX IF NOT EXISTS idx_pins_order
  ON map_pins(created_at_ms DESC, id DESC);

CREATE TABLE IF NOT EXISTS user_ink (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  ink REAL NOT NULL DEFAULT 100 CHECK(ink >= 0 AND ink <= 100),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL CHECK(request_count >= 0),
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_expires
  ON api_rate_limits(expires_at);
