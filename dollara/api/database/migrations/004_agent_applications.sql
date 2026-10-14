-- Migration: agent applications (public landing page + apply flow)
-- Run directly against each existing tenant database:
--   mysql -u root <tenant_db> < database/migrations/004_agent_applications.sql
--
-- 003 built the agent panel on the assumption that every account is opened by
-- its upline. That is still the common path, but it gives the programme no
-- front door: there was no way for a prospective agent to apply, and no queue
-- for an upline to work through.
--
-- This adds the application lifecycle to `agents` rather than a separate
-- applications table. An application IS the agent row, in `pending` status —
-- the same choice `affiliates` made in 002, and for the same reason: approving
-- would otherwise mean copying a dozen fields between two tables and hoping
-- nobody adds a thirteenth to only one of them.
--
-- A pending row is invisible to every report by construction: `tree_path` stays
-- NULL until approval attaches it to the tree, and every scoped query in
-- core/agent_services.py is a `tree_path` prefix match.
--
-- Safe to re-run: guarded ADD COLUMNs, and the ENUM MODIFY is naturally
-- idempotent. Mirrored into init.sql so fresh installs never replay this.

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- Guard procedures. init.sql declares and then drops these, so this file ships
-- its own copies (verbatim) rather than depending on them existing.
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS _dollara_add_column;
DELIMITER $$
CREATE PROCEDURE _dollara_add_column(
  IN tbl VARCHAR(64), IN col VARCHAR(64), IN ddl VARCHAR(512)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN ', ddl);
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS _dollara_add_index;
DELIMITER $$
CREATE PROCEDURE _dollara_add_index(
  IN tbl VARCHAR(64), IN idx VARCHAR(64), IN cols VARCHAR(255)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD INDEX `', idx, '` (', cols, ')');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

-- ---------------------------------------------------------------------------
-- 1. Application lifecycle joins the operational status column.
--
-- One column, not two. 'pending' / 'info_requested' / 'rejected' are the states
-- before an account exists in the tree; 'active' / 'suspended' / 'locked' /
-- 'closed' are what it can be afterwards. They are mutually exclusive in
-- practice — a rejected application is never also suspended — so splitting them
-- would mean every read joining two columns to answer "can this row log in".
--
-- DEFAULT stays 'active': accounts an upline opens through the panel are live
-- immediately, and only the public apply flow writes 'pending' explicitly.
-- ---------------------------------------------------------------------------
ALTER TABLE agents
  MODIFY status ENUM(
    'pending', 'info_requested', 'active', 'rejected',
    'suspended', 'locked', 'closed'
  ) NOT NULL DEFAULT 'active';

-- ---------------------------------------------------------------------------
-- 2. What the application form captures.
--
-- `requested_parent_code` keeps what the applicant actually typed even when it
-- resolves to nothing — an approver needs to see "they said they came from
-- MASTER01" to judge a mistyped or stale code, which a NULL parent_agent_id
-- alone would silently throw away.
-- ---------------------------------------------------------------------------
CALL _dollara_add_column('agents', 'company_name',          "company_name VARCHAR(150) AFTER name");
CALL _dollara_add_column('agents', 'market_region',         "market_region VARCHAR(80)");
CALL _dollara_add_column('agents', 'expected_volume',       "expected_volume VARCHAR(40)");
CALL _dollara_add_column('agents', 'experience',            "experience VARCHAR(40)");
CALL _dollara_add_column('agents', 'application_notes',     "application_notes TEXT");
CALL _dollara_add_column('agents', 'requested_parent_code', "requested_parent_code VARCHAR(20)");
CALL _dollara_add_column('agents', 'rejection_reason',      "rejection_reason VARCHAR(500)");
CALL _dollara_add_column('agents', 'applied_at',            "applied_at DATETIME");
CALL _dollara_add_column('agents', 'approved_at',           "approved_at DATETIME");
CALL _dollara_add_column('agents', 'approved_by',           "approved_by BIGINT UNSIGNED");

-- The applications queue filters on status + who was named as upline, and the
-- public status check resolves by contact_email.
CALL _dollara_add_index('agents', 'idx_agents_email',          'contact_email');
CALL _dollara_add_index('agents', 'idx_agents_requested_parent', 'requested_parent_code');

-- ---------------------------------------------------------------------------
-- 3. Programme defaults, read by the public landing page and applied on
--    approval. One JSON row, same shape and same table as the affiliate
--    programme's settings, so an operator edits both in one place.
-- ---------------------------------------------------------------------------
INSERT INTO platform_settings (setting_key, setting_value)
VALUES (
  'agent_program',
  '{"default_level": "agent", "default_partnership": 25, "default_commission_rate": 2, "default_opening_credit": 0, "min_partnership": 0, "max_partnership": 100, "review_hours": 24, "currency": "INR"}'
)
ON DUPLICATE KEY UPDATE setting_key = setting_key;

DROP PROCEDURE IF EXISTS _dollara_add_column;
DROP PROCEDURE IF EXISTS _dollara_add_index;
