-- Additive migration. Versions change in the same transaction as tile content,
-- including cascading account/content deletions. No existing content is removed.
CREATE TABLE tile_versions (
  z INTEGER NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (z, x, y)
);
INSERT INTO tile_versions (z, x, y, revision)
SELECT z, x, y, 1 FROM drawing_tiles GROUP BY z, x, y;

CREATE TRIGGER drawing_tile_insert_version AFTER INSERT ON drawing_tiles BEGIN
  INSERT INTO tile_versions (z, x, y, revision) VALUES (NEW.z, NEW.x, NEW.y, 1)
  ON CONFLICT(z, x, y) DO UPDATE SET revision = revision + 1;
END;
CREATE TRIGGER drawing_tile_delete_version AFTER DELETE ON drawing_tiles BEGIN
  INSERT INTO tile_versions (z, x, y, revision) VALUES (OLD.z, OLD.x, OLD.y, 1)
  ON CONFLICT(z, x, y) DO UPDATE SET revision = revision + 1;
END;
