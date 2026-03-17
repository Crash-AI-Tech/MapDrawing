-- Migration 0005: Block users table + soft-delete support
--
-- 1. Allow drawings.user_id to be NULL so we can anonymize on account deletion
--    (SQLite doesn't support ALTER COLUMN, so we recreate the table)
-- 2. Create blocked_users relation table

-- Step 1: Recreate drawings without the NOT NULL / CASCADE on user_id
PRAGMA foreign_keys=off;

CREATE TABLE drawings_new (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,   -- NULL after account deleted
  user_name TEXT NOT NULL DEFAULT 'Anonymous',
  brush_id TEXT NOT NULL DEFAULT 'pencil',
  color TEXT NOT NULL DEFAULT '#000000',
  opacity REAL NOT NULL DEFAULT 1.0,
  size REAL NOT NULL DEFAULT 1.0,
  points TEXT NOT NULL,
  min_lat REAL NOT NULL,
  max_lat REAL NOT NULL,
  min_lng REAL NOT NULL,
  max_lng REAL NOT NULL,
  center_lat REAL NOT NULL,
  center_lng REAL NOT NULL,
  created_zoom INTEGER NOT NULL DEFAULT 18,
  meta TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT INTO drawings_new SELECT * FROM drawings;
DROP TABLE drawings;
ALTER TABLE drawings_new RENAME TO drawings;

CREATE INDEX IF NOT EXISTS idx_drawings_bounds ON drawings(min_lng, max_lng, min_lat, max_lat);
CREATE INDEX IF NOT EXISTS idx_drawings_user ON drawings(user_id);
CREATE INDEX IF NOT EXISTS idx_drawings_created ON drawings(created_at DESC);

PRAGMA foreign_keys=on;

-- Step 2: Allow map_pins.user_id to be NULL similarly
PRAGMA foreign_keys=off;

CREATE TABLE map_pins_new (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL DEFAULT 'Anonymous',
  lng REAL NOT NULL,
  lat REAL NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#E63946',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT INTO map_pins_new SELECT * FROM map_pins;
DROP TABLE map_pins;
ALTER TABLE map_pins_new RENAME TO map_pins;

CREATE INDEX IF NOT EXISTS idx_pins_location ON map_pins(lat, lng);
CREATE INDEX IF NOT EXISTS idx_pins_user ON map_pins(user_id);
CREATE INDEX IF NOT EXISTS idx_pins_created ON map_pins(created_at);

PRAGMA foreign_keys=on;

-- Step 3: blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_blocked ON blocked_users(blocked_id);
