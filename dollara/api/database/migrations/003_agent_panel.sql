-- Migration: agent panel (hierarchy, credit, exchange sportsbook, settlements)
-- Run directly against each existing tenant database:
--   mysql -u root <tenant_db> < database/migrations/003_agent_panel.sql
--
-- `agents` shipped in init.sql as an 11-column placeholder with no login, no
-- hierarchy and no credit — it recorded a commission rate and nothing that
-- could earn one. This migration turns it into a real identity table with an
-- upline/downline tree, and adds the tables the agent panel reports on:
--
--   * credit movement between an agent and its downline (transfer statement),
--   * settlement of accrued P&L (settlement report),
--   * an exchange sportsbook (events -> markets -> bets), which is what the
--     Sport Analysis screen and every "by market" / "by event" report read.
--     The existing `bets` / `game_rounds` tables stay the CASINO side of those
--     reports; nothing here changes how aggregator play is recorded.
--
-- Safe to re-run: every ALTER goes through the guard procedures below, and
-- every CREATE is `IF NOT EXISTS`. The same statements are mirrored into
-- init.sql so a fresh tenant install never needs this file replayed.

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
-- 1. Extend `agents` into a real identity + hierarchy + credit table.
--
-- Two columns carry the whole tree and must stay in step (agent_services keeps
-- them so):
--   parent_agent_id -> the immediate upline, NULL for the root operator;
--   tree_path       -> materialised path '/1/4/9/' including this row's own id.
-- The path exists because every report on this panel is "me and everything
-- below me", and a recursive CTE per request is the one thing MySQL 5.7 (which
-- some tenants still run) cannot do at all.
--
-- Money columns, in the language the panel prints them in:
--   credit_reference -> notional credit the upline has extended (a limit, not cash)
--   balance          -> chips actually held; goes up when the upline pushes credit down
--   exposure         -> currently at risk on unsettled bets
--   available credit -> balance - exposure, derived, never stored
--   partnership      -> % of downline P&L this agent keeps; the rest flows upline
-- ---------------------------------------------------------------------------
CALL _dollara_add_column('agents', 'username',          "username VARCHAR(50) AFTER code");
CALL _dollara_add_column('agents', 'password_hash',     "password_hash VARCHAR(255) AFTER username");
CALL _dollara_add_column('agents', 'parent_agent_id',   "parent_agent_id BIGINT UNSIGNED AFTER name");
CALL _dollara_add_column('agents', 'level',             "level ENUM('super_admin','admin','super_master','master','agent') NOT NULL DEFAULT 'agent' AFTER parent_agent_id");
CALL _dollara_add_column('agents', 'depth',             "depth INT NOT NULL DEFAULT 1 AFTER level");
CALL _dollara_add_column('agents', 'tree_path',         "tree_path VARCHAR(255) AFTER depth");
CALL _dollara_add_column('agents', 'credit_reference',  "credit_reference DECIMAL(18,2) DEFAULT 0 AFTER commission_type");
CALL _dollara_add_column('agents', 'balance',           "balance DECIMAL(18,2) DEFAULT 0 AFTER credit_reference");
CALL _dollara_add_column('agents', 'exposure',          "exposure DECIMAL(18,2) DEFAULT 0 AFTER balance");
CALL _dollara_add_column('agents', 'partnership',       "partnership DECIMAL(5,2) DEFAULT 0 AFTER exposure");
CALL _dollara_add_column('agents', 'settled_pl',        "settled_pl DECIMAL(18,2) DEFAULT 0 AFTER total_commission");
CALL _dollara_add_column('agents', 'unsettled_pl',      "unsettled_pl DECIMAL(18,2) DEFAULT 0 AFTER settled_pl");
CALL _dollara_add_column('agents', 'status',            "status ENUM('active','suspended','locked','closed') NOT NULL DEFAULT 'active' AFTER is_active");
-- Two independent locks, exactly as the panel's Actions column offers them:
-- bet_locked still lets the account log in and read; user_locked does not.
CALL _dollara_add_column('agents', 'bet_locked',        "bet_locked BOOLEAN DEFAULT FALSE AFTER status");
CALL _dollara_add_column('agents', 'user_locked',       "user_locked BOOLEAN DEFAULT FALSE AFTER bet_locked");
CALL _dollara_add_column('agents', 'must_change_password', "must_change_password BOOLEAN DEFAULT FALSE AFTER user_locked");
CALL _dollara_add_column('agents', 'timezone',          "timezone VARCHAR(64) DEFAULT 'Asia/Kolkata'");
CALL _dollara_add_column('agents', 'currency',          "currency VARCHAR(10) DEFAULT 'INR'");
CALL _dollara_add_column('agents', 'contact_email',     "contact_email VARCHAR(255)");
CALL _dollara_add_column('agents', 'contact_phone',     "contact_phone VARCHAR(20)");
CALL _dollara_add_column('agents', 'last_login_at',     "last_login_at DATETIME");
CALL _dollara_add_column('agents', 'last_login_ip',     "last_login_ip VARCHAR(45)");
CALL _dollara_add_column('agents', 'created_by',        "created_by BIGINT UNSIGNED");
CALL _dollara_add_column('agents', 'updated_at',        "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

-- Username is the login handle, so it has to be unique the way `code` already
-- is. Added as a real UNIQUE index rather than a column attribute so the guard
-- procedure above can stay a plain ADD COLUMN.
DROP PROCEDURE IF EXISTS _dollara_add_unique;
DELIMITER $$
CREATE PROCEDURE _dollara_add_unique(
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

CALL _dollara_add_unique('agents', 'uk_agents_username', 'username');
CALL _dollara_add_index('agents', 'idx_agents_parent', 'parent_agent_id');
CALL _dollara_add_index('agents', 'idx_agents_path',   'tree_path');
CALL _dollara_add_index('agents', 'idx_agents_status', 'status');

-- Existing placeholder rows (if any) predate the tree. Give them a path so the
-- subtree queries below see them instead of silently skipping them.
UPDATE agents SET tree_path = CONCAT('/', id, '/') WHERE tree_path IS NULL OR tree_path = '';

-- ---------------------------------------------------------------------------
-- 2. Sports bonus bucket.
--
-- The panel's player-stats row prints casino and sports bonus balances side by
-- side. `wallets.bonus_balance` is the existing bucket and keeps its meaning
-- (casino wagering clears it); the sportsbook gets its own so neither product
-- can spend the other's promotional money.
-- ---------------------------------------------------------------------------
CALL _dollara_add_column('wallets', 'sports_bonus_balance',
  "sports_bonus_balance DECIMAL(18,2) DEFAULT 0 AFTER bonus_balance");

-- `user_settings.agent_id` already exists but was never indexed, and every
-- screen on this panel filters players by it.
CALL _dollara_add_index('user_settings', 'idx_us_agent', 'agent_id');

-- ---------------------------------------------------------------------------
-- 3. Credit movement — backs the Transfer Statement report.
--
-- One row per transfer, written once and never updated. Both sides are stored
-- as (type, id) rather than two nullable FKs because a transfer is agent->agent
-- as often as agent->player, and a single pair keeps the statement query to one
-- index scan per side.
--
-- `direction` is recorded from the PERFORMING agent's point of view:
--   'down' = credit pushed to the counterparty (the panel's "Balance Down")
--   'up'   = credit pulled back from them      (the panel's "Balance Up")
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_transfers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  agent_id BIGINT UNSIGNED NOT NULL,
  counterparty_type ENUM('agent','player') NOT NULL,
  counterparty_id BIGINT UNSIGNED NOT NULL,
  direction ENUM('down','up') NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  agent_balance_after DECIMAL(18,2),
  counterparty_balance_after DECIMAL(18,2),
  remark VARCHAR(255),
  performed_by BIGINT UNSIGNED,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_at_agent (agent_id, created_at),
  INDEX idx_at_counterparty (counterparty_type, counterparty_id, created_at),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 4. Settlements — backs the Settlement Report.
--
-- Settling zeroes the P&L that has accrued between two accounts and records
-- what was agreed. `amount` is signed from the AGENT's side: positive means the
-- counterparty owed the agent.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_settlements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  agent_id BIGINT UNSIGNED NOT NULL,
  counterparty_type ENUM('agent','player') NOT NULL,
  counterparty_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  pl_before DECIMAL(18,2) DEFAULT 0,
  pl_after DECIMAL(18,2) DEFAULT 0,
  period_start DATE,
  period_end DATE,
  note VARCHAR(255),
  settled_by BIGINT UNSIGNED,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_as_agent (agent_id, created_at),
  INDEX idx_as_counterparty (counterparty_type, counterparty_id),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 5. Exchange sportsbook: events -> markets -> bets.
--
-- Deliberately separate from `bets` / `game_rounds`. Those record aggregator
-- casino play, which has no event, no market and no lay side; forcing an
-- exchange bet through them would mean every column the Sport Analysis screen
-- needs living in a JSON blob no report could group by.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sport_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  -- Free text rather than an ENUM: the sport list grows with the feed, and an
  -- ENUM would need a migration per sport.
  sport VARCHAR(40) NOT NULL,
  -- Upstream feed id, when there is one. Unique so a re-import updates rather
  -- than duplicates the fixture.
  event_key VARCHAR(64) UNIQUE,
  name VARCHAR(200) NOT NULL,
  competition VARCHAR(150),
  start_time DATETIME,
  status ENUM('upcoming','in_play','closed','settled','abandoned') NOT NULL DEFAULT 'upcoming',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_se_sport (sport, start_time),
  INDEX idx_se_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sport_markets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT UNSIGNED NOT NULL,
  market_key VARCHAR(64),
  -- What the panel prints in its MARKETS column, e.g. "Match Odds (Bookmaker)".
  name VARCHAR(150) NOT NULL,
  market_type ENUM('match_odds','bookmaker','fancy','toss','tied_match','other')
    NOT NULL DEFAULT 'match_odds',
  status ENUM('open','suspended','closed','settled') NOT NULL DEFAULT 'open',
  winning_selection VARCHAR(150),
  settled_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_sm_event_key (event_id, market_key),
  INDEX idx_sm_event (event_id),
  INDEX idx_sm_type (market_type),
  FOREIGN KEY (event_id) REFERENCES sport_events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per stake. `agent_id` is denormalised off user_settings at placement
-- time on purpose: it is the column every report groups by, and a player moved
-- to a different agent tomorrow must not silently rewrite yesterday's history.
--
-- Sign conventions, all from the HOUSE's point of view so the reports can sum
-- without a CASE per row:
--   stake      -> what the member risked (back) / their backer's risk (lay)
--   liability  -> the most the house can lose on this bet
--   profit_loss-> settled house result: positive = house won, negative = paid out
--   exposure   -> liability while status='open', 0 once settled
CREATE TABLE IF NOT EXISTS sport_bets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  agent_id BIGINT UNSIGNED,
  event_id BIGINT UNSIGNED NOT NULL,
  market_id BIGINT UNSIGNED NOT NULL,
  selection_name VARCHAR(150),
  side ENUM('back','lay') NOT NULL DEFAULT 'back',
  odds DECIMAL(10,4) NOT NULL DEFAULT 0,
  -- Fancy markets price in runs, not decimal odds; both are kept so the bet
  -- list can print what the member actually saw.
  run_line DECIMAL(10,2),
  stake DECIMAL(18,2) NOT NULL,
  liability DECIMAL(18,2) NOT NULL DEFAULT 0,
  potential_win DECIMAL(18,2) NOT NULL DEFAULT 0,
  exposure DECIMAL(18,2) NOT NULL DEFAULT 0,
  profit_loss DECIMAL(18,2) NOT NULL DEFAULT 0,
  commission DECIMAL(18,2) NOT NULL DEFAULT 0,
  status ENUM('open','won','lost','void','cancelled') NOT NULL DEFAULT 'open',
  ip_address VARCHAR(45),
  placed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  settled_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sb_user (user_id, placed_at),
  INDEX idx_sb_agent (agent_id, placed_at),
  INDEX idx_sb_event (event_id),
  INDEX idx_sb_market (market_id),
  INDEX idx_sb_status (status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES sport_events(id) ON DELETE CASCADE,
  FOREIGN KEY (market_id) REFERENCES sport_markets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 6. Audit trail for everything an agent does to an account below it.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  agent_id BIGINT UNSIGNED NOT NULL,
  actor_id BIGINT UNSIGNED,
  actor_label VARCHAR(100),
  action VARCHAR(60) NOT NULL,
  target_type ENUM('agent','player','market','settlement','session') DEFAULT NULL,
  target_id BIGINT UNSIGNED,
  metadata JSON,
  ip_address VARCHAR(45),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_aal_agent (agent_id, created_at),
  INDEX idx_aal_action (action),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP PROCEDURE IF EXISTS _dollara_add_column;
DROP PROCEDURE IF EXISTS _dollara_add_index;
DROP PROCEDURE IF EXISTS _dollara_add_unique;
