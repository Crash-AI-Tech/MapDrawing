CREATE TABLE product_counters (
  day TEXT NOT NULL,
  event TEXT NOT NULL,
  platform TEXT NOT NULL CHECK(platform IN ('web', 'ios')),
  channel TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(day, event, platform, channel)
);
-- Daily authenticated activity only; no coordinates, IPs, content or device IDs.
CREATE TABLE product_activity (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  event TEXT NOT NULL,
  PRIMARY KEY(user_id, day, event)
);
CREATE INDEX idx_product_activity_day ON product_activity(day, event);
CREATE TRIGGER product_counter_retention AFTER INSERT ON product_counters BEGIN
  DELETE FROM product_activity WHERE day < date('now','-90 days');
  DELETE FROM product_counters WHERE day < date('now','-90 days');
  DELETE FROM api_rate_limits WHERE expires_at < (unixepoch() - 86400) * 1000;
END;
