-- Migration: Drop database provisioning tracking
-- Run directly against an existing master DB:
--   mysql -u root dollara_master < database/migrations/003_drop_db_provisioning.sql
--
-- The Super Admin no longer creates tenant databases (CREATE DATABASE / apply
-- schema) on behalf of products; tenant databases must be created and
-- schema-applied manually, then registered via the `databases` table. Drops
-- the now-unused provisioning-tracking flag.

SET NAMES utf8mb4;

ALTER TABLE `databases`
  DROP COLUMN is_provisioned;
