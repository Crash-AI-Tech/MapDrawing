-- Migration 0008: exact geographic tile membership for scalable reads.

CREATE TABLE IF NOT EXISTS drawing_tiles (
  z INTEGER NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  drawing_id TEXT NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
  created_at_ms INTEGER NOT NULL,
  PRIMARY KEY (z, x, y, drawing_id)
);

CREATE INDEX IF NOT EXISTS idx_drawing_tiles_page
  ON drawing_tiles(z, x, y, created_at_ms DESC, drawing_id DESC);

-- Backfill every z14 tile intersected by an existing drawing's server-stored
-- bounds. SQLite's ln() is the natural logarithm used by Web Mercator.
WITH RECURSIVE
bounds AS (
  SELECT
    id,
    COALESCE(created_at_ms, created_at * 1000) AS ordered_at,
    MAX(0, MIN(16383, CAST(((min_lng + 180.0) / 360.0) * 16384 AS INTEGER))) AS min_x,
    MAX(0, MIN(16383, CAST(((max_lng + 180.0) / 360.0) * 16384 AS INTEGER))) AS max_x,
    MAX(0, MIN(16383, CAST(
      (1.0 - ln(
        tan(max_lat * 3.141592653589793 / 180.0) +
        1.0 / cos(max_lat * 3.141592653589793 / 180.0)
      ) / 3.141592653589793) / 2.0 * 16384
      AS INTEGER
    ))) AS min_y,
    MAX(0, MIN(16383, CAST(
      (1.0 - ln(
        tan(min_lat * 3.141592653589793 / 180.0) +
        1.0 / cos(min_lat * 3.141592653589793 / 180.0)
      ) / 3.141592653589793) / 2.0 * 16384
      AS INTEGER
    ))) AS max_y
  FROM drawings
),
tiles(drawing_id, ordered_at, min_x, max_x, min_y, max_y, x, y) AS (
  SELECT id, ordered_at, min_x, max_x, min_y, max_y, min_x, min_y
  FROM bounds
  WHERE (max_x - min_x + 1) * (max_y - min_y + 1) <= 64
  UNION ALL
  SELECT
    drawing_id, ordered_at, min_x, max_x, min_y, max_y,
    CASE WHEN x < max_x THEN x + 1 ELSE min_x END,
    CASE WHEN x < max_x THEN y ELSE y + 1 END
  FROM tiles
  WHERE y < max_y
)
INSERT OR IGNORE INTO drawing_tiles (z, x, y, drawing_id, created_at_ms)
SELECT 14, x, y, drawing_id, ordered_at FROM tiles;

-- Defensive fallback for legacy/corrupt giant bounds: keep the drawing
-- discoverable without allowing one row to explode into thousands of entries.
INSERT OR IGNORE INTO drawing_tiles (z, x, y, drawing_id, created_at_ms)
SELECT
  14,
  MAX(0, MIN(16383, CAST(((center_lng + 180.0) / 360.0) * 16384 AS INTEGER))),
  MAX(0, MIN(16383, CAST(
    (1.0 - ln(
      tan(center_lat * 3.141592653589793 / 180.0) +
      1.0 / cos(center_lat * 3.141592653589793 / 180.0)
    ) / 3.141592653589793) / 2.0 * 16384
    AS INTEGER
  ))),
  id,
  COALESCE(created_at_ms, created_at * 1000)
FROM drawings
WHERE id NOT IN (SELECT drawing_id FROM drawing_tiles);

PRAGMA optimize;
