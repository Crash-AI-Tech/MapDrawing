PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  user_name TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  apple_id TEXT UNIQUE,
  apple_refresh_token TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0, 1)),
  avatar_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE TABLE drawings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  brush_id TEXT NOT NULL CHECK (brush_id IN ('pencil', 'eraser')),
  color TEXT NOT NULL,
  opacity REAL NOT NULL CHECK (opacity >= 0 AND opacity <= 1),
  size REAL NOT NULL CHECK (size > 0),
  points TEXT NOT NULL CHECK (json_valid(points)),
  point_count INTEGER NOT NULL CHECK (point_count > 0),
  min_lat REAL NOT NULL,
  max_lat REAL NOT NULL,
  min_lng REAL NOT NULL,
  max_lng REAL NOT NULL,
  created_zoom INTEGER NOT NULL CHECK (created_zoom BETWEEN 0 AND 24),
  meta TEXT CHECK (meta IS NULL OR json_valid(meta)),
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  CHECK (min_lat <= max_lat),
  CHECK (min_lng <= max_lng)
);
CREATE INDEX idx_drawings_user ON drawings(user_id);
CREATE INDEX idx_drawings_order ON drawings(created_at_ms DESC, id DESC);
CREATE INDEX idx_drawings_bounds ON drawings(min_lng, max_lng, min_lat, max_lat);

CREATE TABLE drawing_tiles (
  z INTEGER NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  drawing_id TEXT NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
  created_at_ms INTEGER NOT NULL,
  PRIMARY KEY (z, x, y, drawing_id)
);
CREATE INDEX idx_drawing_tiles_page
  ON drawing_tiles(z, x, y, created_at_ms DESC, drawing_id DESC);

CREATE TABLE map_pins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  lng REAL NOT NULL CHECK (lng BETWEEN -180 AND 180),
  lat REAL NOT NULL CHECK (lat BETWEEN -90 AND 90),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 50),
  color TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE INDEX idx_pins_location ON map_pins(lat, lng);
CREATE INDEX idx_pins_user ON map_pins(user_id);
CREATE INDEX idx_pins_order ON map_pins(created_at_ms DESC, id DESC);

CREATE TABLE verification_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email_verification', 'password_reset', 'verify_attempt')),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_verification_email ON verification_codes(email, type);
CREATE INDEX idx_verification_expires ON verification_codes(expires_at);

CREATE TABLE blocked_users (
  blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX idx_blocked_blocked ON blocked_users(blocked_id);

CREATE TABLE user_ink (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  ink REAL NOT NULL DEFAULT 100 CHECK (ink >= 0 AND ink <= 100),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE api_rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count >= 0),
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_api_rate_limits_expires ON api_rate_limits(expires_at);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('pin', 'drawing', 'user')),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_note TEXT,
  resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  resolved_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_reports_status ON reports(status, created_at DESC);
CREATE INDEX idx_reports_content ON reports(content_type, content_id);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);

PRAGMA optimize;
