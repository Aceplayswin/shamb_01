-- Gaming module migration (idempotent).
-- Apply to EXISTING tenant databases that were created before the gaming module
-- was added. New tenant databases get these objects directly from init.sql.
--
-- Usage:
--   mysql <tenant_db> < database/migrations/001_gaming_module.sql
--
-- Every statement is written to be safe to run more than once (guarded with
-- INFORMATION_SCHEMA checks via a stored procedure, since MySQL lacks
-- "ADD COLUMN IF NOT EXISTS" before 8.0.29 / MariaDB variance).

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DELIMITER //

DROP PROCEDURE IF EXISTS _add_col //
CREATE PROCEDURE _add_col(
  IN tbl VARCHAR(64), IN col VARCHAR(64), IN ddl VARCHAR(255)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
  ) THEN
    SET @s = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN ', ddl);
    PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END //

DROP PROCEDURE IF EXISTS _add_idx //
CREATE PROCEDURE _add_idx(
  IN tbl VARCHAR(64), IN idx VARCHAR(64), IN cols VARCHAR(255)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx
  ) THEN
    SET @s = CONCAT('ALTER TABLE `', tbl, '` ADD INDEX `', idx, '` (', cols, ')');
    PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END //

DELIMITER ;

-- wallets: wagering requirement tracking
CALL _add_col('wallets', 'wagering_balance', 'wagering_balance DECIMAL(18,2) DEFAULT 0');

-- games: aggregator UID/type + per-game toggle
CALL _add_col('games', 'game_uid', 'game_uid VARCHAR(64)');
CALL _add_col('games', 'game_type', 'game_type VARCHAR(40)');
CALL _add_col('games', 'is_active', 'is_active BOOLEAN DEFAULT TRUE');
CALL _add_idx('games', 'idx_games_uid', 'game_uid');
CALL _add_idx('games', 'idx_games_active', 'is_active');

DROP PROCEDURE IF EXISTS _add_col;
DROP PROCEDURE IF EXISTS _add_idx;

-- New tables (CREATE TABLE IF NOT EXISTS is inherently idempotent).
CREATE TABLE IF NOT EXISTS game_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_uid VARCHAR(64) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NOT NULL,
  game_id BIGINT UNSIGNED,
  game_uid VARCHAR(64) NOT NULL,
  game_name VARCHAR(150) NOT NULL,
  member_account VARCHAR(100) NOT NULL,
  launch_url TEXT,
  currency VARCHAR(10) DEFAULT 'INR',
  total_bet DECIMAL(20,2) DEFAULT 0,
  total_win DECIMAL(20,2) DEFAULT 0,
  profit_loss DECIMAL(20,2) DEFAULT 0,
  rounds_count INT DEFAULT 0,
  last_balance DECIMAL(20,2),
  status ENUM('wait', 'profit', 'loss') DEFAULT 'wait',
  last_played_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL,
  INDEX idx_gs_user (user_id),
  INDEX idx_gs_member (member_account),
  INDEX idx_gs_game_uid (game_uid),
  INDEX idx_gs_user_game (user_id, game_uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS game_rounds (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id BIGINT UNSIGNED,
  user_id BIGINT UNSIGNED NOT NULL,
  game_id BIGINT UNSIGNED,
  game_uid VARCHAR(64) NOT NULL,
  serial_number VARCHAR(100) NOT NULL UNIQUE,
  game_round VARCHAR(100),
  bet_amount DECIMAL(20,2) DEFAULT 0,
  win_amount DECIMAL(20,2) DEFAULT 0,
  balance_before DECIMAL(20,2),
  balance_after DECIMAL(20,2),
  currency VARCHAR(10) DEFAULT 'INR',
  provider_timestamp VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL,
  INDEX idx_gr_user (user_id),
  INDEX idx_gr_game_uid (game_uid),
  INDEX idx_gr_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS game_callback_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  serial_number VARCHAR(100),
  member_account VARCHAR(100),
  game_uid VARCHAR(64),
  raw_payload TEXT,
  decrypted_payload JSON,
  result ENUM('settled', 'duplicate', 'heartbeat', 'error', 'rejected') NOT NULL,
  message VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_gcl_serial (serial_number),
  INDEX idx_gcl_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
