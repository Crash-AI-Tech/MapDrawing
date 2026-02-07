-- Map Pins table for location-based messages
CREATE TABLE IF NOT EXISTS map_pins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  user_name TEXT NOT NULL DEFAULT 'Anonymous',
  lng REAL NOT NULL,
  lat REAL NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#E63946',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_pins_location ON map_pins(lat, lng);
CREATE INDEX IF NOT EXISTS idx_pins_user ON map_pins(user_id);
CREATE INDEX IF NOT EXISTS idx_pins_created ON map_pins(created_at);
