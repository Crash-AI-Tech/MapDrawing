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

printf 'All migrations applied cleanly.\n'
