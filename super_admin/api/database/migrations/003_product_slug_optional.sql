-- Migration: make products.slug optional (deprecate slug identity)
-- Run directly against an existing master DB:
--   mysql -u root dollara_master < database/migrations/003_product_slug_optional.sql
--
-- Products are now identified by id (Super Admin console) and api_key (product
-- config pull). The slug is no longer written by the app; we keep the column for
-- backward compatibility but drop its NOT NULL so slug-free inserts succeed.
-- The UNIQUE index is retained (MySQL allows multiple NULLs under UNIQUE).

SET NAMES utf8mb4;

ALTER TABLE products
  MODIFY COLUMN slug VARCHAR(63) NULL;
