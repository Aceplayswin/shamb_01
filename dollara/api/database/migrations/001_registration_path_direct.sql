-- Migration: registration_path 'otp' -> 'direct'
-- Run directly against each existing tenant database:
--   mysql -u root <tenant_db> < database/migrations/001_registration_path_direct.sql
--
-- Sign-up no longer goes through an OTP step (see core.services.register_user):
-- accounts are created straight from full name + phone + password, so the API
-- writes registration_path='direct'. Tenant databases created from the older
-- init.sql still declare ENUM('otp','kyc') and reject that value with
--   (1265, "Data truncated for column 'registration_path' at row 1").
-- Safe to re-run: a database already on ENUM('direct','kyc') ends up unchanged.

SET NAMES utf8mb4;

-- 1. Widen the enum so both the old and the new value are legal, otherwise the
--    rewrite below has nowhere to put existing 'otp' rows.
ALTER TABLE user_settings
  MODIFY registration_path ENUM('otp', 'direct', 'kyc') DEFAULT 'otp';

-- 2. Re-label historic sign-ups: they all took what is now the direct path.
UPDATE user_settings SET registration_path = 'direct' WHERE registration_path = 'otp';

-- 3. Narrow to the schema in init.sql.
ALTER TABLE user_settings
  MODIFY registration_path ENUM('direct', 'kyc') DEFAULT 'direct';

-- The OTP flow is gone from the API entirely; init.sql no longer creates this
-- table. Dropping it discards any stored verification history, so it is left to
-- run by hand once you are happy to lose those rows:
--   DROP TABLE IF EXISTS otp_verifications;
