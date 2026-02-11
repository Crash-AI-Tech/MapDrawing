ALTER TABLE users ADD COLUMN apple_id text;
CREATE UNIQUE INDEX IF NOT EXISTS users_apple_id_unique ON users (apple_id);
