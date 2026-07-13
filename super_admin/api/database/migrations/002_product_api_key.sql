-- Migration: Product API key
-- Run directly against an existing master DB:
--   mysql -u root dollara_master < database/migrations/002_product_api_key.sql
--
-- Adds api_key to products. Super Admin now verifies which product a request
-- belongs to using this per-product secret, issued once at creation, instead
-- of trusting the (public, guessable) slug alone.

SET NAMES utf8mb4;

ALTER TABLE products
  ADD COLUMN api_key VARCHAR(64) UNIQUE AFTER name;
