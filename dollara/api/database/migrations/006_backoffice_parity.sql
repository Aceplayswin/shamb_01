-- Migration: backoffice parity (staff groups, mailing, cashier/payments config,
-- bonus wizard fields, blocked-IP allow list, game categories, promo posters)
-- Run directly against each existing tenant database:
--   mysql -u root <tenant_db> < database/migrations/006_backoffice_parity.sql
--
-- A previous pass copied the backoffice-parity backend modules from
-- mahakalworld/api/core/ (backoffice_models.py, backoffice_services.py,
-- backoffice_reports.py, backoffice_views.py, data_export.py, ip_tracking.py,
-- logging_handlers.py, schema_errors.py) into this product's core/, and added
-- the matching Django ORM fields/classes to core/models.py (GameCategory,
-- PromotionPoster, User.state/signup_ip/created_by/staff_group_id,
-- UserSetting.risk_level/vip_level, Transaction.provider_id/
-- provider_payment_id/error_message, Game.sort_order, and 14 new Bonus wizard
-- fields). None of that had a database migration behind it — the ORM already
-- reads/writes columns and tables this database does not have yet. This file
-- creates them.
--
-- Safe to re-run: every ALTER goes through the guard procedures below and
-- every CREATE is `IF NOT EXISTS`, matching the convention in 002-005.
--
-- Judgment calls made while porting this from mahakalworld/api/database/init.sql:
--
-- 1. `blocked_ips` already existed in this database (init.sql) before this
--    port, just without the columns the reference backoffice screen needs.
--    This is an ALTER, not a fresh CREATE TABLE — see the BlockedIp section
--    below. `login_history` already matches core/backoffice_models.py's
--    LoginHistory column-for-column; nothing to do there.
--
-- 2. `mail_templates` is NOT copied verbatim from mahakalworld's init.sql.
--    That table's live definition there (template_type, trigger_event,
--    sender_name, reply_to, sent_count, track_opens, track_clicks, language
--    default 'English') has drifted from mahakalworld's OWN
--    core/backoffice_models.py MailTemplate model (name, subject, channel,
--    language default 'en', body, event_key, is_active, created_by) — the
--    table there was evidently never migrated to match its model. Since this
--    table is brand new here and the goal is to satisfy the Django model
--    already committed to core/backoffice_models.py (identical field-for-
--    field to mahakalworld's), it is built to match that model instead of
--    replaying mahakalworld's stale table.
--
-- 3. `games.category_id` is added even though it was not itemised in the
--    porting instructions. core/models.py's Game.category_ref is a live
--    ForeignKey to GameCategory with db_column='category_id'; without the
--    column, Django selects it on every plain Game query (it is a concrete
--    field, not deferred) and every read of `games` fails with "Unknown
--    column 'category_id'". mahakalworld's init.sql backs the same field
--    with `category_id BIGINT UNSIGNED` + `fk_games_category` + an index, so
--    the same is added here, ordered after `game_categories` is created.
--
-- 4. `bonuses.claim_min_balance` / `claim_min_wagering` / `claim_min_deposit_total`
--    are included even though they are not part of the 14-field wizard count
--    quoted in the porting brief. core/models.py's Bonus model already has
--    all three (a separate, earlier claim-conditions feature), and
--    core/management/commands/ensure_bonus_claim_columns.py exists purely to
--    heal a database missing them — the accompanying
--    mahakalworld/api/database/migration_bonus_claim_conditions.sql was
--    never folded into this product's migrations. This file closes that gap
--    at the same time, so ensure_bonus_claim_columns becomes a no-op here.
--    The payment_methods deposit-destination columns from
--    migrations_payment_method_accounts.sql are likewise folded straight
--    into the CREATE TABLE below, since payment_methods is new in this
--    database — there is no pre-existing narrower table to ALTER.
--
-- Explicitly OUT of scope (per the porting brief): `users.first_name` /
-- `last_name` (mahakalworld folded these back into full_name later; never
-- added here), `users.active_session_id` (mahakalworld's single-device-login
-- feature — would change existing login behaviour for every user on this
-- product, not asked for), migration_single_session.sql and
-- fix_game_providers.sql (skipped per instructions).

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- Guard procedures. init.sql declares and then drops its own copies, so this
-- file ships the ones it needs rather than depending on them existing.
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

DROP PROCEDURE IF EXISTS _dollara_add_fk;
DELIMITER $$
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
-- 1. New tables, in FK dependency order.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS staff_groups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_by BIGINT UNSIGNED,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_staff_groups_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS staff_group_permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  group_id BIGINT UNSIGNED NOT NULL,
  module VARCHAR(60) NOT NULL,
  permission VARCHAR(60) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_sgp (group_id, module, permission),
  FOREIGN KEY (group_id) REFERENCES staff_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Built to match core/backoffice_models.py's MailTemplate model, not
-- mahakalworld's live (drifted) mail_templates table — see judgment call 2
-- in the header comment.
CREATE TABLE IF NOT EXISTS mail_templates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  subject VARCHAR(255),
  channel ENUM('email', 'sms', 'both') NOT NULL DEFAULT 'email',
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  body TEXT,
  -- Trigger that fires this template, e.g. 'signup', 'deposit_success'.
  event_key VARCHAR(60),
  is_active BOOLEAN DEFAULT TRUE,
  created_by BIGINT UNSIGNED,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mail_configurations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  scope ENUM('casino', 'email_sms') NOT NULL,
  config_key VARCHAR(80) NOT NULL,
  config_value TEXT,
  updated_by BIGINT UNSIGNED,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_mc (scope, config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payment_providers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  code VARCHAR(40) NOT NULL,
  api_endpoint VARCHAR(500),
  -- Non-secret config only; secrets belong in the platform secret store.
  credentials JSON,
  supports_deposit BOOLEAN DEFAULT TRUE,
  supports_withdrawal BOOLEAN DEFAULT FALSE,
  deposit_countries TEXT,
  withdrawal_countries TEXT,
  currencies VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_pp_code (code),
  INDEX idx_pp_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Includes the deposit-destination columns from mahakalworld's
-- migrations_payment_method_accounts.sql directly in the CREATE — see
-- judgment call 4 in the header comment.
CREATE TABLE IF NOT EXISTS payment_methods (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  code VARCHAR(40) NOT NULL,
  method_type ENUM('card', 'wallet', 'bank', 'crypto', 'upi', 'other') DEFAULT 'other',
  logo_url VARCHAR(500),
  supports_deposit BOOLEAN DEFAULT TRUE,
  supports_withdrawal BOOLEAN DEFAULT FALSE,
  min_amount DECIMAL(18,2) DEFAULT 0,
  max_amount DECIMAL(18,2),
  currencies VARCHAR(255),
  countries TEXT,
  -- Destination account shown to the player for a manual deposit.
  account_name VARCHAR(120),
  account_number VARCHAR(64),
  ifsc_code VARCHAR(20),
  bank_name VARCHAR(120),
  branch_name VARCHAR(120),
  upi_id VARCHAR(120),
  qr_image_url VARCHAR(500),
  -- Crypto methods: which chain/token the player must use, and the address.
  crypto_network VARCHAR(40),
  wallet_address VARCHAR(191),
  instructions TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_pm_code (code),
  INDEX idx_pm_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payment_provider_methods (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  provider_id BIGINT UNSIGNED NOT NULL,
  method_id BIGINT UNSIGNED NOT NULL,
  fee_percent DECIMAL(6,3) DEFAULT 0,
  fee_fixed DECIMAL(18,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_ppm (provider_id, method_id),
  INDEX idx_ppm_method (method_id),
  FOREIGN KEY (provider_id) REFERENCES payment_providers(id) ON DELETE CASCADE,
  FOREIGN KEY (method_id) REFERENCES payment_methods(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payment_bin_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  provider_id BIGINT UNSIGNED,
  bin_from VARCHAR(8) NOT NULL,
  bin_to VARCHAR(8),
  card_brand VARCHAR(40),
  country_code CHAR(2),
  action ENUM('allow', 'deny', 'route') NOT NULL DEFAULT 'allow',
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pbr_bin (bin_from),
  INDEX idx_pbr_provider (provider_id),
  FOREIGN KEY (provider_id) REFERENCES payment_providers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payment_frontend_rules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  method_id BIGINT UNSIGNED,
  country_code CHAR(2),
  currency VARCHAR(10),
  min_amount DECIMAL(18,2) DEFAULT 0,
  max_amount DECIMAL(18,2),
  display_order INT DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pfr_country (country_code),
  INDEX idx_pfr_method (method_id),
  FOREIGN KEY (method_id) REFERENCES payment_methods(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Decline Queue and Profile Upgrade Queue. Both screens are identical apart
-- from the label, so `queue_type` keeps them in one table.
CREATE TABLE IF NOT EXISTS cashier_queue_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  queue_type ENUM('decline', 'profile_upgrade') NOT NULL,
  user_id BIGINT UNSIGNED,
  transaction_id BIGINT UNSIGNED,
  amount DECIMAL(18,2),
  currency VARCHAR(10) DEFAULT 'INR',
  reason VARCHAR(255),
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  assigned_to BIGINT UNSIGNED,
  resolved_by BIGINT UNSIGNED,
  resolved_at DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cqi_type_status (queue_type, status),
  INDEX idx_cqi_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bars one affiliate's referrals from a bonus. No rows for a bonus means
-- every affiliate is eligible. `bonuses` already exists on this platform.
CREATE TABLE IF NOT EXISTS bonus_excluded_affiliates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  bonus_id BIGINT UNSIGNED NOT NULL,
  affiliate_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_bea (bonus_id, affiliate_id),
  INDEX idx_bea_affiliate (affiliate_id),
  FOREIGN KEY (bonus_id) REFERENCES bonuses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Player-facing marketing copy for a bonus, one row per language. Backs the
-- reference's Coupon Sets tab.
CREATE TABLE IF NOT EXISTS bonus_translations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  bonus_id BIGINT UNSIGNED NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  title VARCHAR(150),
  description TEXT,
  image_url VARCHAR(500),
  terms_conditions TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_bt (bonus_id, language),
  FOREIGN KEY (bonus_id) REFERENCES bonuses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A catalog vertical (Slots, Live Casino, Sports, ...), managed in the admin.
-- Backs core/models.py's GameCategory; games.category_id (below) points here.
CREATE TABLE IF NOT EXISTS game_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  icon_url VARCHAR(500),
  is_sports BOOLEAN NOT NULL DEFAULT FALSE,
  is_delayed_settlement BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_game_categories_active (is_active),
  INDEX idx_game_categories_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Offer poster for the public /promotions page. Distinct from Bonus catalog
-- rows also served there. Backs core/models.py's PromotionPoster.
CREATE TABLE IF NOT EXISTS promotion_posters (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150),
  image_url VARCHAR(500) NOT NULL,
  link_url VARCHAR(500),
  sort_order INT NOT NULL DEFAULT 0,
  status ENUM('draft', 'active') DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 2. `users` — state / signup_ip / created_by / staff_group_id.
--
-- Deliberately NOT touching `email`, and NOT adding `first_name`/`last_name`
-- or `active_session_id`: see the header comment.
-- ---------------------------------------------------------------------------
CALL _dollara_add_column('users', 'state',          "state VARCHAR(60) AFTER country_code");
CALL _dollara_add_column('users', 'signup_ip',       "signup_ip VARCHAR(45) AFTER state");
CALL _dollara_add_column('users', 'created_by',      "created_by BIGINT UNSIGNED AFTER signup_ip");
CALL _dollara_add_column('users', 'staff_group_id',  "staff_group_id BIGINT UNSIGNED AFTER role");

CALL _dollara_add_index('users', 'idx_users_signup_ip',   'signup_ip');
CALL _dollara_add_index('users', 'idx_users_staff_group', 'staff_group_id');

-- ---------------------------------------------------------------------------
-- 3. `user_settings` — risk_level / vip_level (Aging and Player Wise reports).
-- ---------------------------------------------------------------------------
CALL _dollara_add_column('user_settings', 'risk_level', "risk_level ENUM('low','medium','high') DEFAULT 'low' AFTER fraud_score");
CALL _dollara_add_column('user_settings', 'vip_level',  "vip_level INT DEFAULT 0 AFTER risk_level");

-- ---------------------------------------------------------------------------
-- 4. `blocked_ips` — this table already existed; it just predates the
--    backoffice Blocked IP screen's allow-list and audit columns.
-- ---------------------------------------------------------------------------
CALL _dollara_add_column('blocked_ips', 'status',     "status ENUM('block','allow') NOT NULL DEFAULT 'block' AFTER ip_address");
CALL _dollara_add_column('blocked_ips', 'comments',   "comments VARCHAR(255) AFTER reason");
CALL _dollara_add_column('blocked_ips', 'updated_at', "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at");

CALL _dollara_add_index('blocked_ips', 'idx_blocked_ips_status', 'status');

-- ---------------------------------------------------------------------------
-- 5. `transactions` — which PSP handled the payment, its own id for it, and
--    any decline text.
-- ---------------------------------------------------------------------------
CALL _dollara_add_column('transactions', 'provider_id',         "provider_id BIGINT UNSIGNED AFTER payment_method");
CALL _dollara_add_column('transactions', 'provider_payment_id', "provider_payment_id VARCHAR(120) AFTER provider_id");
CALL _dollara_add_column('transactions', 'error_message',       "error_message VARCHAR(500)");

CALL _dollara_add_index('transactions', 'idx_tx_provider_payment', 'provider_payment_id');

-- ---------------------------------------------------------------------------
-- 6. `games` — sort_order (already present on this platform's games table;
--    the guard below is a no-op here) and category_id, which backs the live
--    Game.category_ref FK — see judgment call 3 in the header comment.
-- ---------------------------------------------------------------------------
CALL _dollara_add_column('games', 'sort_order',  "sort_order INT DEFAULT 0 AFTER is_provably_fair");
CALL _dollara_add_column('games', 'category_id', "category_id BIGINT UNSIGNED AFTER category");

CALL _dollara_add_index('games', 'idx_games_category_id', 'category_id');

CALL _dollara_add_fk(
  'games', 'fk_games_category',
  'FOREIGN KEY (category_id) REFERENCES game_categories(id) ON DELETE SET NULL'
);

-- ---------------------------------------------------------------------------
-- 7. `bonuses` — the 14 wizard fields from core/models.py's Bonus, plus the
--    3 claim-condition columns and 3 abuse-threshold columns already on that
--    model (see judgment call 4 in the header comment).
-- ---------------------------------------------------------------------------
CALL _dollara_add_column('bonuses', 'priority',              "priority INT DEFAULT 0 AFTER bonus_type");
CALL _dollara_add_column('bonuses', 'redemption_type',       "redemption_type VARCHAR(40) AFTER value_amount");
CALL _dollara_add_column('bonuses', 'redemption_amount',     "redemption_amount DECIMAL(18,2) AFTER redemption_type");
CALL _dollara_add_column('bonuses', 'max_redeemable_value',  "max_redeemable_value DECIMAL(18,2) AFTER redemption_amount");
CALL _dollara_add_column('bonuses', 'payment_methods',       "payment_methods VARCHAR(255) AFTER max_redeemable_value");
CALL _dollara_add_column('bonuses', 'coupon_length',         "coupon_length INT AFTER promo_code");
CALL _dollara_add_column('bonuses', 'is_published',          "is_published BOOLEAN DEFAULT FALSE AFTER status");
CALL _dollara_add_column('bonuses', 'is_public',             "is_public BOOLEAN DEFAULT FALSE AFTER is_published");
CALL _dollara_add_column('bonuses', 'affiliate_id',          "affiliate_id BIGINT UNSIGNED AFTER is_public");
CALL _dollara_add_column('bonuses', 'parent_bonus_id',       "parent_bonus_id BIGINT UNSIGNED AFTER affiliate_id");
CALL _dollara_add_column('bonuses', 'comment',               "comment TEXT AFTER parent_bonus_id");
CALL _dollara_add_column('bonuses', 'claim_min_balance',        "claim_min_balance DECIMAL(18,2) AFTER bonus_validity_days");
CALL _dollara_add_column('bonuses', 'claim_min_wagering',       "claim_min_wagering DECIMAL(18,2) AFTER claim_min_balance");
CALL _dollara_add_column('bonuses', 'claim_min_deposit_total',  "claim_min_deposit_total DECIMAL(18,2) AFTER claim_min_wagering");
CALL _dollara_add_column('bonuses', 'abuse_similarity_percent', "abuse_similarity_percent INT AFTER claim_min_deposit_total");
CALL _dollara_add_column('bonuses', 'abuse_deposited_days',     "abuse_deposited_days INT AFTER abuse_similarity_percent");
CALL _dollara_add_column('bonuses', 'abuse_played_days',        "abuse_played_days INT AFTER abuse_deposited_days");

CALL _dollara_add_index('bonuses', 'idx_bonuses_affiliate', 'affiliate_id');
CALL _dollara_add_index('bonuses', 'idx_bonuses_parent',    'parent_bonus_id');

-- ---------------------------------------------------------------------------
-- 8. `game_rounds` — stake_serial. A delayed-settlement provider (sports/
--    live-casino) sends a stake callback and, later, a separate result
--    callback; `serial_number` is overwritten by the result callback's number
--    once it lands, so without a second column a redelivered *stake* callback
--    for an already-settled round is no longer recognised as a duplicate.
--    Added alongside this port because core/management/commands/
--    merge_orphan_payouts.py (copied from mahakalworld) writes to this column
--    and calls .save(update_fields=['stake_serial', ...]), which fails at
--    runtime against a model field with no backing column.
-- ---------------------------------------------------------------------------
CALL _dollara_add_column('game_rounds', 'stake_serial', "stake_serial VARCHAR(100) NULL AFTER serial_number");

-- Django's unique=True needs a UNIQUE index, not a plain one — _dollara_add_index
-- only issues ADD INDEX, so this one guard is written out directly.
DROP PROCEDURE IF EXISTS _dollara_add_unique_index;
DELIMITER $$
CREATE PROCEDURE _dollara_add_unique_index(
  IN tbl VARCHAR(64), IN idx VARCHAR(64), IN cols VARCHAR(255)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD UNIQUE INDEX `', idx, '` (', cols, ')');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL _dollara_add_unique_index('game_rounds', 'uk_game_rounds_stake_serial', 'stake_serial');

DROP PROCEDURE IF EXISTS _dollara_add_unique_index;
DROP PROCEDURE IF EXISTS _dollara_add_column;
DROP PROCEDURE IF EXISTS _dollara_add_index;
DROP PROCEDURE IF EXISTS _dollara_add_fk;
