-- Migration: drop the legacy UNIQUE(product_id) index on branding
-- Run directly against an existing master DB:
--   mysql -u <user> -p <master_db> < database/migrations/006_branding_drop_legacy_unique.sql
--
-- Repairs a partial application of 005_branding_per_theme.sql. That migration
-- added theme_key/colors and the new uq_branding_product_theme key, but its
-- `ALTER TABLE branding DROP INDEX product_id;` did not take on every database.
-- Branding is now one row per (product, theme), so a UNIQUE index on product_id
-- alone rejects every theme after the first and product creation dies with
--   (1062, "Duplicate entry '<id>' for key 'branding.product_id'")
--
-- Dropping it is safe: uq_branding_product_theme (product_id, theme_key) already
-- enforces the intended uniqueness, and its leftmost prefix is product_id, so it
-- continues to back the foreign key and any product_id lookups.
--
-- Guarded so it is safe to re-run: MySQL 8.0 has no DROP INDEX IF EXISTS, so we
-- check information_schema and no-op when the index is already gone.

SET NAMES utf8mb4;

SET @drop_legacy := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'branding'
    AND INDEX_NAME = 'product_id'
);

SET @sql := IF(
  @drop_legacy > 0,
  'ALTER TABLE branding DROP INDEX product_id',
  'DO 0'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Safety net: ensure the replacement composite key exists (005 may have been
-- interrupted before adding it). Same guard pattern, inverted.
SET @has_composite := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'branding'
    AND INDEX_NAME = 'uq_branding_product_theme'
);

SET @sql2 := IF(
  @has_composite = 0,
  'ALTER TABLE branding ADD UNIQUE KEY uq_branding_product_theme (product_id, theme_key)',
  'DO 0'
);

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
