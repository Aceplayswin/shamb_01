-- Migration: affiliate program (portal, tracking, commission, payouts)
-- Run directly against each existing tenant database:
--   mysql -u root <tenant_db> < database/migrations/002_affiliate_program.sql
--
-- `affiliates` shipped in init.sql as a 10-column placeholder with no password,
-- no status and no commission config — there was no login, no tracking and no
-- ledger behind it. This migration turns it into a real identity table and adds
-- the 17 tables the program needs around it.
--
-- Safe to re-run: every ALTER goes through the guard procedures below, and every
-- CREATE is `IF NOT EXISTS`. The same statements are mirrored into init.sql so a
-- fresh tenant install never needs this file replayed.

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
-- 1. Extend `affiliates` into a real identity + commission-config table.
--
-- Rate/amount columns default to 0, which the service layer reads as "inherit
-- the platform_settings default" — that is what makes the admin Global Settings
-- page meaningful instead of decorative.
--
-- `commission_tier` (already present) means NETWORK DEPTH (1 = direct partner).
-- `tier_label` (added here) means LOYALTY BAND ("Bronze"/"Gold"/"Platinum").
-- The admin mock used the word "tier" for the second and the portal mock used it
-- for the first; keeping two named columns is what stops that collision coming
-- back. Nothing is ever called bare `tier` again.
-- ---------------------------------------------------------------------------
CALL _dollara_add_column('affiliates', 'password_hash',       "password_hash VARCHAR(255) AFTER email");
CALL _dollara_add_column('affiliates', 'phone',               "phone VARCHAR(20) AFTER password_hash");
CALL _dollara_add_column('affiliates', 'company_name',        "company_name VARCHAR(150) AFTER phone");
CALL _dollara_add_column('affiliates', 'status',              "status ENUM('pending','info_requested','approved','rejected','suspended') DEFAULT 'pending' AFTER is_active");
CALL _dollara_add_column('affiliates', 'tier_label',          "tier_label VARCHAR(20) DEFAULT 'Bronze' AFTER commission_tier");
CALL _dollara_add_column('affiliates', 'commission_type',     "commission_type ENUM('revenue_share','cpa','hybrid') DEFAULT 'revenue_share' AFTER tier_label");
CALL _dollara_add_column('affiliates', 'commission_rate',     "commission_rate DECIMAL(5,2) DEFAULT 0 AFTER commission_type");
CALL _dollara_add_column('affiliates', 'cpa_amount',          "cpa_amount DECIMAL(18,2) DEFAULT 0 AFTER commission_rate");
CALL _dollara_add_column('affiliates', 'hybrid_cpa_days',     "hybrid_cpa_days INT DEFAULT 0 AFTER cpa_amount");
-- What this row's PARENT earns on this row's commission (not what this row earns).
CALL _dollara_add_column('affiliates', 'override_rate',       "override_rate DECIMAL(5,2) DEFAULT 0 AFTER hybrid_cpa_days");
CALL _dollara_add_column('affiliates', 'payout_threshold',    "payout_threshold DECIMAL(18,2) DEFAULT 0 AFTER total_commission");
-- Display caches, recomputed by the commission run and the payout transitions.
CALL _dollara_add_column('affiliates', 'pending_commission',  "pending_commission DECIMAL(18,2) DEFAULT 0 AFTER payout_threshold");
CALL _dollara_add_column('affiliates', 'approved_commission', "approved_commission DECIMAL(18,2) DEFAULT 0 AFTER pending_commission");
CALL _dollara_add_column('affiliates', 'paid_commission',     "paid_commission DECIMAL(18,2) DEFAULT 0 AFTER approved_commission");
-- A losing day carries forward so tomorrow's revenue share nets it off first.
CALL _dollara_add_column('affiliates', 'ngr_carry_forward',   "ngr_carry_forward DECIMAL(18,2) DEFAULT 0 AFTER paid_commission");
CALL _dollara_add_column('affiliates', 'two_factor_enabled',  "two_factor_enabled BOOLEAN DEFAULT FALSE");
CALL _dollara_add_column('affiliates', 'two_factor_secret',   "two_factor_secret VARCHAR(64)");
CALL _dollara_add_column('affiliates', 'two_factor_confirmed_at', "two_factor_confirmed_at DATETIME");
CALL _dollara_add_column('affiliates', 'kyc_status',          "kyc_status ENUM('none','pending','verified','rejected') DEFAULT 'none'");
CALL _dollara_add_column('affiliates', 'onboarding_complete', "onboarding_complete BOOLEAN DEFAULT FALSE");
CALL _dollara_add_column('affiliates', 'terms_accepted_at',   "terms_accepted_at DATETIME");
CALL _dollara_add_column('affiliates', 'timezone',            "timezone VARCHAR(64) DEFAULT 'Asia/Kolkata'");
CALL _dollara_add_column('affiliates', 'currency',            "currency VARCHAR(10) DEFAULT 'INR'");
CALL _dollara_add_column('affiliates', 'notification_prefs',  "notification_prefs JSON");
CALL _dollara_add_column('affiliates', 'webhook_url',         "webhook_url VARCHAR(500)");
-- Application fields, captured by the public /apply form.
CALL _dollara_add_column('affiliates', 'traffic_source',      "traffic_source VARCHAR(60)");
CALL _dollara_add_column('affiliates', 'expected_volume',     "expected_volume VARCHAR(40)");
CALL _dollara_add_column('affiliates', 'payment_preference',  "payment_preference VARCHAR(40)");
CALL _dollara_add_column('affiliates', 'application_notes',   "application_notes TEXT");
CALL _dollara_add_column('affiliates', 'rejection_reason',    "rejection_reason VARCHAR(500)");
CALL _dollara_add_column('affiliates', 'applied_at',          "applied_at DATETIME");
CALL _dollara_add_column('affiliates', 'approved_at',         "approved_at DATETIME");
CALL _dollara_add_column('affiliates', 'approved_by',         "approved_by BIGINT UNSIGNED");
CALL _dollara_add_column('affiliates', 'last_login_at',       "last_login_at DATETIME");
CALL _dollara_add_column('affiliates', 'updated_at',          "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

CALL _dollara_add_index('affiliates', 'idx_aff_status', 'status');
CALL _dollara_add_index('affiliates', 'idx_aff_parent', 'parent_affiliate_id');
CALL _dollara_add_index('affiliates', 'idx_aff_email',  'email');

-- No FOREIGN KEY on parent_affiliate_id on purpose: it fails outright on any DB
-- that already has an orphan row, re-running mints a second auto-named
-- constraint, and a self-FK does not prevent CYCLES anyway. Parent validity,
-- acyclicity and max depth are enforced in core/affiliate_services.py instead.

-- ---------------------------------------------------------------------------
-- 2. Notifications gain a third actor.
--
-- `notifications` already carries nullable user_id AND admin_id with no foreign
-- keys — it was built for multiple actor types, so this is a purely additive
-- 2-line change. (Contrast support_tickets/kyc_documents, whose user_id is NOT
-- NULL with an FK to users: an affiliate has no users row, so those get their
-- own tables below rather than a widened column.)
-- ---------------------------------------------------------------------------
CALL _dollara_add_column('notifications', 'affiliate_id', "affiliate_id BIGINT UNSIGNED AFTER admin_id");
CALL _dollara_add_index('notifications', 'idx_notif_affiliate', 'affiliate_id');

DROP PROCEDURE IF EXISTS _dollara_add_column;
DROP PROCEDURE IF EXISTS _dollara_add_index;

-- ---------------------------------------------------------------------------
-- 3. New tables.
-- ---------------------------------------------------------------------------

-- A named tracking link. `code` is what appears in /r/<code>.
CREATE TABLE IF NOT EXISTS affiliate_links (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  affiliate_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(120) NOT NULL,
  sub_id VARCHAR(60),
  target_path VARCHAR(255) DEFAULT '/',
  is_active BOOLEAN DEFAULT TRUE,
  clicks_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_afl_code (code),
  INDEX idx_afl_aff (affiliate_id),
  INDEX idx_afl_aff_active (affiliate_id, is_active),
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Raw click log. Highest-volume table in the program — the daily command purges
-- rows older than the configured click_retention_days.
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  affiliate_id BIGINT UNSIGNED NOT NULL,
  link_id BIGINT UNSIGNED,
  sub_id VARCHAR(60),
  ip_address VARCHAR(45),
  user_agent TEXT,
  referrer_url VARCHAR(500),
  country_code CHAR(2),
  converted BOOLEAN DEFAULT FALSE,
  converted_user_id BIGINT UNSIGNED,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_afc_aff_created (affiliate_id, created_at),
  INDEX idx_afc_link_created (link_id, created_at),
  -- Velocity fraud check: "how many signups from this IP in the last hour".
  INDEX idx_afc_ip_created (ip_address, created_at),
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
  FOREIGN KEY (link_id) REFERENCES affiliate_links(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per referred player. The UNIQUE on user_id is what makes attribution
-- deterministic: a double-fire of attribute_signup is a harmless no-op, and no
-- player can ever be claimed by two affiliates.
CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  affiliate_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  link_id BIGINT UNSIGNED,
  click_id BIGINT UNSIGNED,
  sub_id VARCHAR(60),
  attributed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  first_deposit_at DATETIME,
  first_deposit_amount DECIMAL(18,2) DEFAULT 0,
  first_deposit_tx_id BIGINT UNSIGNED,
  deposit_count INT DEFAULT 0,
  lifetime_deposits DECIMAL(18,2) DEFAULT 0,
  lifetime_ngr DECIMAL(18,2) DEFAULT 0,
  lifetime_commission DECIMAL(18,2) DEFAULT 0,
  cpa_paid BOOLEAN DEFAULT FALSE,
  status ENUM('active','dormant','blocked') DEFAULT 'active',
  last_active_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_afr_user (user_id),
  INDEX idx_afr_aff (affiliate_id),
  INDEX idx_afr_aff_ftd (affiliate_id, first_deposit_at),
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The money. `dedupe_key` + its UNIQUE constraint is the entire idempotency
-- guarantee of the commission engine: re-running a day corrects still-pending
-- rows in place and can never touch money already approved or paid.
CREATE TABLE IF NOT EXISTS affiliate_commission_ledger (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  affiliate_id BIGINT UNSIGNED NOT NULL,
  referral_id BIGINT UNSIGNED,
  -- For override entries: the sub-affiliate whose commission this is a cut of.
  source_affiliate_id BIGINT UNSIGNED,
  entry_type ENUM('revenue_share','cpa','override','adjustment','clawback') NOT NULL,
  base_kind ENUM('ngr','ftd','network_commission','manual') NOT NULL,
  base_amount DECIMAL(18,2) DEFAULT 0,
  rate DECIMAL(6,2) DEFAULT 0,
  amount DECIMAL(18,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status ENUM('pending','approved','paid','rejected','clawed_back') DEFAULT 'pending',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payout_id BIGINT UNSIGNED,
  run_id BIGINT UNSIGNED,
  dedupe_key VARCHAR(120) NOT NULL,
  notes VARCHAR(255),
  approved_at DATETIME,
  paid_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_alg_dedupe (affiliate_id, dedupe_key),
  INDEX idx_alg_aff_status (affiliate_id, status),
  INDEX idx_alg_payout (payout_id),
  INDEX idx_alg_period (period_start),
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  affiliate_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  method_id BIGINT UNSIGNED,
  method_label VARCHAR(120),
  method_details VARCHAR(255),
  status ENUM('requested','approved','paid','rejected') DEFAULT 'requested',
  reference VARCHAR(120),
  rejection_reason VARCHAR(500),
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  processed_by BIGINT UNSIGNED,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_afp_aff (affiliate_id),
  INDEX idx_afp_status (status),
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS affiliate_payout_methods (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  affiliate_id BIGINT UNSIGNED NOT NULL,
  method_type ENUM('bank','upi','crypto') NOT NULL,
  label VARCHAR(80),
  details JSON NOT NULL,
  -- Pre-masked for display, so the raw `details` never has to reach a list view.
  masked_details VARCHAR(120),
  is_primary BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_apm_aff (affiliate_id),
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Signed-request keys. There is deliberately no private-key column: the private
-- half is returned to the affiliate exactly once and never persisted.
CREATE TABLE IF NOT EXISTS affiliate_api_keys (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  affiliate_id BIGINT UNSIGNED NOT NULL,
  key_id VARCHAR(64) NOT NULL,
  public_pem TEXT NOT NULL,
  fingerprint VARCHAR(64),
  status ENUM('active','rotating','revoked') DEFAULT 'active',
  last_used_at DATETIME,
  -- During rotation the old key keeps verifying until this moment, so a partner
  -- integration does not break mid-flight.
  grace_until DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME,
  UNIQUE KEY uk_aak_key (key_id),
  INDEX idx_aak_aff (affiliate_id),
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Replay protection for signed requests. This has to be a table: CACHES is
-- LocMemCache (per-process), so a cache-backed nonce store is silently
-- ineffective the moment there is more than one gunicorn worker.
CREATE TABLE IF NOT EXISTS affiliate_api_nonces (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  key_id VARCHAR(64) NOT NULL,
  nonce VARCHAR(96) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_aan_key_nonce (key_id, nonce),
  INDEX idx_aan_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS affiliate_api_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  affiliate_id BIGINT UNSIGNED,
  key_id VARCHAR(64),
  direction ENUM('inbound','outbound') DEFAULT 'inbound',
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INT,
  signature_result ENUM('valid','invalid','missing','replay','expired','revoked'),
  note VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_aal_aff_created (affiliate_id, created_at),
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Shared banner/creative library — no affiliate_id, same as `banners`.
CREATE TABLE IF NOT EXISTS affiliate_creatives (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  asset_type ENUM('banner','logo','video') DEFAULT 'banner',
  file_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  dimensions VARCHAR(20),
  size_label VARCHAR(40),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Separate from kyc_documents: that table's user_id is NOT NULL with an FK to
-- users, and its document_type enum cannot express a company registration.
CREATE TABLE IF NOT EXISTS affiliate_kyc_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  affiliate_id BIGINT UNSIGNED NOT NULL,
  document_type ENUM('id_proof','address_proof','company_registration','tax_certificate','bank_proof','selfie') NOT NULL,
  file_url VARCHAR(500),
  original_name VARCHAR(255),
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by BIGINT UNSIGNED,
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_akd_aff (affiliate_id),
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Separate from support_tickets for the same reason (NOT NULL user_id FK).
CREATE TABLE IF NOT EXISTS affiliate_support_tickets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  affiliate_id BIGINT UNSIGNED NOT NULL,
  subject VARCHAR(255) NOT NULL,
  category ENUM('payout','commission','tracking','account','api','other') DEFAULT 'other',
  priority ENUM('low','normal','high') DEFAULT 'normal',
  status ENUM('open','in_progress','pending_affiliate','resolved','closed') DEFAULT 'open',
  assigned_to BIGINT UNSIGNED,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ast_aff (affiliate_id),
  INDEX idx_ast_status (status),
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS affiliate_ticket_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ticket_id BIGINT UNSIGNED NOT NULL,
  sender_type ENUM('affiliate','staff','system') NOT NULL,
  sender_id BIGINT UNSIGNED,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_atm_ticket (ticket_id),
  FOREIGN KEY (ticket_id) REFERENCES affiliate_support_tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Fraud signals never block a signup — they are recorded here and gate the
-- auto-approval of commission instead.
CREATE TABLE IF NOT EXISTS affiliate_fraud_flags (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  affiliate_id BIGINT UNSIGNED NOT NULL,
  referral_id BIGINT UNSIGNED,
  reason VARCHAR(255) NOT NULL,
  rule_key VARCHAR(60),
  risk_level ENUM('low','medium','high','critical') DEFAULT 'medium',
  status ENUM('open','dismissed','actioned') DEFAULT 'open',
  metadata JSON,
  resolved_by BIGINT UNSIGNED,
  resolved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_aff_flag_aff (affiliate_id),
  INDEX idx_aff_flag_status (status),
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dedicated rather than admin_audit_logs, which FKs admin_id to users and so
-- cannot record an action an affiliate took on their own account.
CREATE TABLE IF NOT EXISTS affiliate_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  affiliate_id BIGINT UNSIGNED,
  actor_type ENUM('affiliate','staff','system') NOT NULL,
  actor_id BIGINT UNSIGNED,
  actor_label VARCHAR(80),
  action VARCHAR(120) NOT NULL,
  target VARCHAR(160),
  before_value JSON,
  after_value JSON,
  ip_address VARCHAR(45),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_aal_aff_created (affiliate_id, created_at),
  INDEX idx_aal_created (created_at),
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Short-lived 2FA / password-reset handles. A table rather than a short-expiry
-- JWT because auth_jwt.sign_token hardcodes a 7-day expiry, and because a row
-- can carry an attempt counter that a stateless token cannot.
CREATE TABLE IF NOT EXISTS affiliate_login_challenges (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  affiliate_id BIGINT UNSIGNED NOT NULL,
  challenge_token VARCHAR(64) NOT NULL,
  purpose ENUM('2fa','reset') NOT NULL,
  attempts INT DEFAULT 0,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_alc_token (challenge_token),
  INDEX idx_alc_aff (affiliate_id),
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per commission run, so the admin "Run now" button can report exactly
-- what a run did rather than just claiming success.
CREATE TABLE IF NOT EXISTS affiliate_commission_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  period_start DATE,
  period_end DATE,
  status ENUM('running','completed','failed') DEFAULT 'running',
  trigger_source ENUM('cron','admin') DEFAULT 'cron',
  triggered_by BIGINT UNSIGNED,
  entries_written INT DEFAULT 0,
  entries_skipped INT DEFAULT 0,
  entries_approved INT DEFAULT 0,
  total_amount DECIMAL(18,2) DEFAULT 0,
  error TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME,
  INDEX idx_acr_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 4. Program defaults.
--
-- One platform_settings row rather than new columns or a settings table:
-- setting_value is already JSON, and admin_services.update_platform_setting()
-- plus GET/PUT /api/v1/admin/settings/<key> already exist, so the admin Global
-- Settings screen needs no new endpoint. Per-affiliate overrides live on the
-- affiliates row, where 0 means "inherit whatever is in here".
--
-- Amounts are INR (the admin mock's 50/100 defaults were USD).
-- ---------------------------------------------------------------------------
INSERT INTO platform_settings (setting_key, setting_value) VALUES (
  'affiliate_program',
  '{"default_commission_type":"revenue_share","default_commission_rate":30,"default_cpa_amount":500,"default_override_rate":5,"default_hybrid_cpa_days":30,"cpa_min_deposit":500,"cookie_window_days":30,"attribution_model":"last_click","min_payout_threshold":5000,"payout_cycle":"monthly","auto_approve_days":7,"max_override_depth":3,"deduct_bonus_from_ngr":true,"negative_ngr_carry_forward":true,"fraud_max_referrals_per_ip":5,"fraud_block_disposable_emails":true,"fraud_flag_self_referral":true,"click_retention_days":180,"currency":"INR"}'
)
ON DUPLICATE KEY UPDATE setting_key = setting_key;
