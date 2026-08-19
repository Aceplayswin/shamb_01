-- Migration: agent administration from the admin console
-- Run directly against each existing tenant database:
--   mysql -u root <tenant_db> < database/migrations/005_agent_admin.sql
--
-- 003 and 004 built the agent panel and its application flow on one assumption:
-- every action is taken by an agent, on an account inside its own subtree. The
-- admin console breaks both halves of that. Staff sit outside the tree, and
-- some of what they do — changing programme-wide settings, deleting an account
-- — is not about any single agent at all.
--
-- `agent_audit_logs.agent_id` was NOT NULL, which made those actions
-- unrecordable: the row they belong to does not exist, or is about to stop
-- existing. This relaxes the column to match `affiliate_audit_logs.affiliate_id`
-- in 002, which is nullable for exactly the same reason.
--
-- Nothing else changes. Everything the console does to an individual agent
-- (approvals, terms, status, credit) already fits the tables as they stand, and
-- the ENUM on `agent_transfers.counterparty_type` is deliberately left alone —
-- a platform credit injection is written as a self-referencing agent transfer
-- rather than earning a third counterparty type. See the "Credit" section of
-- core/agent_admin_services.py.
--
-- Safe to re-run: every step below checks information_schema first. Mirrored
-- into init.sql so fresh installs never replay this.

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- Guard procedures. init.sql declares and then drops its own copies, so this
-- file ships the ones it needs rather than depending on them existing.
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS _dollara_drop_fk;
DROP PROCEDURE IF EXISTS _dollara_add_fk;
DELIMITER $$

-- Drops whatever foreign key currently constrains `col` on `tbl`, by looking
-- its name up rather than assuming the auto-generated `<table>_ibfk_1`: 003
-- created these unnamed, and a database restored from a dump can easily carry
-- a different number.
CREATE PROCEDURE _dollara_drop_fk(IN tbl VARCHAR(64), IN col VARCHAR(64))
BEGIN
  DECLARE fk VARCHAR(64);
  SET fk = (
    SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl
      AND COLUMN_NAME = col AND REFERENCED_TABLE_NAME IS NOT NULL
    LIMIT 1
  );
  IF fk IS NOT NULL THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` DROP FOREIGN KEY `', fk, '`');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$

CREATE PROCEDURE _dollara_add_fk(
  IN tbl VARCHAR(64), IN fk VARCHAR(64), IN ddl VARCHAR(512)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = tbl
      AND CONSTRAINT_NAME = fk AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD CONSTRAINT `', fk, '` ', ddl);
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

-- ---------------------------------------------------------------------------
-- agent_audit_logs.agent_id -> nullable
--
-- MySQL will not relax a column a foreign key constrains while the key is in
-- place, so the key comes off, the column is widened, and the key goes back
-- with the same ON DELETE CASCADE it had before — this time under a name later
-- migrations can find. A NULL agent_id is never cascaded, which is exactly the
-- behaviour wanted: a "settings changed" row must outlive every agent.
-- ---------------------------------------------------------------------------
CALL _dollara_drop_fk('agent_audit_logs', 'agent_id');

ALTER TABLE agent_audit_logs
  MODIFY COLUMN agent_id BIGINT UNSIGNED NULL;

CALL _dollara_add_fk(
  'agent_audit_logs', 'fk_aal_agent',
  'FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE'
);

DROP PROCEDURE IF EXISTS _dollara_drop_fk;
DROP PROCEDURE IF EXISTS _dollara_add_fk;
