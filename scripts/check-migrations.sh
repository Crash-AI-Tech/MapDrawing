#!/bin/sh
set -eu

database_file="$(mktemp "${TMPDIR:-/tmp}/mapdrawing-migrations.XXXXXX.sqlite")"
trap 'rm -f "$database_file"' EXIT INT TERM

for migration in drizzle/migrations/[0-9][0-9][0-9][0-9]_*.sql; do
  sqlite3 "$database_file" < "$migration"
done

foreign_key_errors="$(sqlite3 "$database_file" 'PRAGMA foreign_key_check;')"
if [ -n "$foreign_key_errors" ]; then
  printf '%s\n' "$foreign_key_errors" >&2
  exit 1
fi

sqlite3 "$database_file" <<'SQL'
PRAGMA foreign_keys = ON;
INSERT INTO users (id, email, user_name, password_hash, email_verified)
VALUES ('user-1', 'test@example.com', 'Tester', 'pbkdf2:test', 1);
INSERT INTO drawings (
  id, user_id, user_name, brush_id, color, opacity, size, points, point_count,
  min_lat, max_lat, min_lng, max_lng, created_zoom, created_at_ms, updated_at_ms
) VALUES (
  'drawing-1', 'user-1', 'Tester', 'pencil', '#000000', 1, 2,
  '[{"x":0,"y":0}]', 1, 0, 0, 0, 0, 18, 1, 1
);
INSERT INTO drawing_tiles (z, x, y, drawing_id, created_at_ms)
VALUES (14, 0, 0, 'drawing-1', 1);
INSERT INTO map_pins (
  id, user_id, user_name, lng, lat, message, color, created_at_ms, updated_at_ms
) VALUES ('pin-1', 'user-1', 'Tester', 0, 0, 'hello', '#000000', 1, 1);
INSERT INTO reports (id, reporter_id, content_id, content_type, reason)
VALUES ('report-1', 'user-1', 'drawing-1', 'drawing', 'test');
DELETE FROM users WHERE id = 'user-1';
SQL

tile_revision="$(sqlite3 "$database_file" 'SELECT revision FROM tile_versions WHERE z=14 AND x=0 AND y=0;')"
if [ "$tile_revision" -ne 2 ]; then
  printf '%s\n' 'Tile version did not change on cascading deletion.' >&2
  exit 1
fi

cascade_rows="$(sqlite3 "$database_file" \
  'SELECT (SELECT COUNT(*) FROM drawings) + (SELECT COUNT(*) FROM drawing_tiles) + (SELECT COUNT(*) FROM map_pins) + (SELECT COUNT(*) FROM reports);')"
if [ "$cascade_rows" -ne 0 ]; then
  printf '%s\n' 'Account deletion cascade check failed.' >&2
  exit 1
fi

if sqlite3 "$database_file" "INSERT INTO users (id,email,user_name,password_hash) VALUES ('u','u@example.com','U','x'); INSERT INTO drawings (id,user_id,user_name,brush_id,color,opacity,size,points,point_count,min_lat,max_lat,min_lng,max_lng,created_zoom,created_at_ms,updated_at_ms) VALUES ('d','u','U','highlighter','#000000',1,1,'[{\"x\":0}]',1,0,0,0,0,18,1,1);" 2>/dev/null; then
  printf '%s\n' 'Unsupported brush constraint check failed.' >&2
  exit 1
fi

printf 'All migrations applied cleanly.\n'
