-- DOLLARA Platform - MySQL Schema
-- Complete tenant database schema (core + gaming module).
-- Import directly: mysql <tenant_db> < database/init.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  email VARCHAR(255) UNIQUE,
  country_code CHAR(2),
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255),
  full_name VARCHAR(100),
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  account_status ENUM('active', 'inactive', 'suspended', 'blocked') DEFAULT 'active',
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_phone (phone),
  INDEX idx_users_status (account_status),
  INDEX idx_users_country (country_code),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  date_of_birth DATE,
  gender ENUM('male', 'female', 'other', 'prefer_not_to_say'),
  kyc_status ENUM('none', 'pending', 'verified', 'rejected') DEFAULT 'none',
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(255),
  affiliate_id BIGINT UNSIGNED,
  agent_id BIGINT UNSIGNED,
  -- Referral chain: this user's own shareable code + who referred them.
  referral_code VARCHAR(20),
  referred_by BIGINT UNSIGNED,
  fraud_score INT DEFAULT 0,
  is_demo BOOLEAN DEFAULT FALSE,
  demo_expires_at DATETIME,
  website_language VARCHAR(10) DEFAULT 'en',
  communication_language VARCHAR(10) DEFAULT 'en',
  currency VARCHAR(10) DEFAULT 'INR',
  registration_path ENUM('direct', 'kyc') DEFAULT 'direct',
  preferred_game_type VARCHAR(50),
  typical_bet_range VARCHAR(20),
  ai_voice_executive_id VARCHAR(50),
  notifications_enabled BOOLEAN DEFAULT TRUE,
  marketing_opt_in BOOLEAN DEFAULT FALSE,
  settings JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_settings_user (user_id),
  UNIQUE KEY uk_user_settings_referral_code (referral_code),
  INDEX idx_user_settings_referred_by (referred_by),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wallets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  main_balance DECIMAL(18,2) DEFAULT 0,
  bonus_balance DECIMAL(18,2) DEFAULT 0,
  exposure_balance DECIMAL(18,2) DEFAULT 0,
  locked_balance DECIMAL(18,2) DEFAULT 0,
  wagering_balance DECIMAL(18,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'INR',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_wallet_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS kyc_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  document_type ENUM('id_proof', 'address_proof', 'selfie') NOT NULL,
  file_url VARCHAR(500),
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by BIGINT UNSIGNED,
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bank_accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  account_holder_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  ifsc_code VARCHAR(20),
  bank_name VARCHAR(100),
  account_type ENUM('savings', 'current') DEFAULT 'savings',
  upi_id VARCHAR(100),
  is_verified BOOLEAN DEFAULT FALSE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('deposit', 'withdrawal', 'bonus_credit', 'bet_settlement', 'refund', 'adjustment') NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status ENUM('pending', 'processing', 'completed', 'failed', 'rejected', 'cancelled') DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_provider VARCHAR(50),
  reference_number VARCHAR(255),
  bonus_id BIGINT UNSIGNED,
  fraud_score INT DEFAULT 0,
  metadata JSON,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_tx_user (user_id),
  INDEX idx_tx_type_status (type, status),
  INDEX idx_tx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS withdrawal_stages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  transaction_id BIGINT UNSIGNED NOT NULL,
  stage ENUM('account_verification', 'duplicate_check', 'wagering_compliance', 'final_approval', 'payment_processing') NOT NULL,
  status ENUM('pending', 'passed', 'failed', 'review') DEFAULT 'pending',
  details JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bonuses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  display_title VARCHAR(150),
  description TEXT,
  -- The trigger that awards this bonus. Each type is driven by a different money
  -- event: joining (registration), deposit (admin confirms a deposit),
  -- referral (a referred user registers / first-deposits), game/cashback
  -- (net gameplay loss over a period), manual (admin pushes it to a user).
  bonus_type ENUM('joining', 'deposit', 'referral', 'game', 'cashback', 'no_deposit', 'free_spins', 'loyalty', 'reload', 'manual') NOT NULL,
  value_type ENUM('percentage', 'fixed') NOT NULL,
  value_amount DECIMAL(18,2) NOT NULL,
  -- Money gates. min_deposit / min_amount = threshold the driving amount must
  -- meet; max_bonus_cap = ceiling on a single award; referral pays the referrer.
  min_deposit DECIMAL(18,2) DEFAULT 0,
  -- Deposit-sequence gates. None set = fires on any deposit; more than one set
  -- = fires on any of those ordinals.
  is_first_deposit BOOLEAN DEFAULT FALSE,
  is_second_deposit BOOLEAN DEFAULT FALSE,
  is_third_deposit BOOLEAN DEFAULT FALSE,
  -- Restricts to accounts registered within new_player_days.
  is_new_player_only BOOLEAN DEFAULT FALSE,
  new_player_days INT DEFAULT 7,
  max_bonus_cap DECIMAL(18,2),
  referrer_reward DECIMAL(18,2) DEFAULT 0,
  wagering_multiplier DECIMAL(5,2) DEFAULT 35,
  -- Where a credited bonus lands: locked bonus balance (needs wagering) or the
  -- withdrawable main balance.
  credit_target ENUM('bonus', 'main') DEFAULT 'bonus',
  status ENUM('draft', 'active', 'paused', 'expired') DEFAULT 'draft',
  start_date DATETIME,
  end_date DATETIME,
  claim_method ENUM('auto', 'manual', 'code', 'opt_in') DEFAULT 'auto',
  -- 'mass' = every eligible player; 'targeted' = issued to target_user_id only.
  scope ENUM('mass', 'targeted') DEFAULT 'mass',
  target_user_id BIGINT UNSIGNED,
  promo_code VARCHAR(40),
  -- Per-bonus budget controls. per_user_limit = how many times one user may
  -- receive it (NULL = unlimited); total_budget = money cap across all users
  -- (NULL = uncapped); the *_awarded / *_claims counters accrue as it pays out.
  per_user_limit INT,
  total_budget DECIMAL(18,2),
  total_awarded DECIMAL(18,2) DEFAULT 0,
  total_claims INT DEFAULT 0,
  bonus_validity_days INT DEFAULT 30,
  allowed_countries JSON,
  excluded_countries JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_bonuses_type_status (bonus_type, status),
  UNIQUE KEY uk_bonuses_promo_code (promo_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_bonuses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  bonus_id BIGINT UNSIGNED,
  amount DECIMAL(18,2) NOT NULL,
  wagering_required DECIMAL(18,2) DEFAULT 0,
  wagering_completed DECIMAL(18,2) DEFAULT 0,
  credit_target ENUM('bonus', 'main') DEFAULT 'bonus',
  -- 'pending' = the reward is owed but not yet in any balance (current model).
  -- 'locked'  = legacy rows credited into bonus_balance at award time.
  award_mode ENUM('locked', 'pending') NOT NULL DEFAULT 'locked',
  -- What awarded it, for auditing and duplicate-suppression.
  source ENUM('joining', 'deposit', 'referral', 'game', 'cashback', 'promo', 'manual') NOT NULL DEFAULT 'manual',
  transaction_id BIGINT UNSIGNED,
  granted_by BIGINT UNSIGNED,
  notes VARCHAR(255),
  status ENUM('pending', 'active', 'completed', 'expired', 'forfeited') DEFAULT 'pending',
  expires_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_bonuses_user (user_id),
  INDEX idx_user_bonuses_bonus (bonus_id),
  INDEX idx_user_bonuses_source (source),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (bonus_id) REFERENCES bonuses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A vendor/aggregator. The credential columns are OPTIONAL per-provider
-- overrides: blank means this provider rides the platform-wide aggregator
-- account from the API environment, filled means it is integrated on its own
-- account (a standalone lottery vendor, a second aggregator).
CREATE TABLE IF NOT EXISTS game_providers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  logo_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  agency_uid VARCHAR(100),
  aes_secret_key VARCHAR(128),
  server_url VARCHAR(255),
  launch_path VARCHAR(100),
  player_prefix VARCHAR(40),
  callback_path VARCHAR(100),
  currency_code VARCHAR(10),
  -- Sports/lottery vendors settle long after the stake; their rounds stay
  -- Pending in bet history until the result callback lands.
  delayed_settlement BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS games (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  provider_id BIGINT UNSIGNED,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  category ENUM('slots', 'live_casino', 'sports', 'lottery', 'ai_games', 'fantasy', 'virtual_sports') NOT NULL,
  game_uid VARCHAR(64),
  game_type VARCHAR(40),
  thumbnail_url VARCHAR(500),
  rtp DECIMAL(5,2),
  min_bet DECIMAL(18,2) DEFAULT 10,
  max_bet DECIMAL(18,2) DEFAULT 100000,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active_web BOOLEAN DEFAULT TRUE,
  is_active_mobile BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  is_provably_fair BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  play_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES game_providers(id),
  INDEX idx_games_category (category),
  INDEX idx_games_featured (is_featured),
  INDEX idx_games_uid (game_uid),
  INDEX idx_games_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  game_id BIGINT UNSIGNED,
  category VARCHAR(50),
  bet_amount DECIMAL(18,2) NOT NULL,
  odds DECIMAL(10,4),
  multiplier DECIMAL(10,4),
  payout DECIMAL(18,2) DEFAULT 0,
  profit_loss DECIMAL(18,2) DEFAULT 0,
  status ENUM('open', 'won', 'lost', 'void', 'cancelled', 'cashout') DEFAULT 'open',
  round_id VARCHAR(100),
  provably_fair_seed VARCHAR(255),
  provably_fair_hash VARCHAR(255),
  metadata JSON,
  settled_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (game_id) REFERENCES games(id),
  INDEX idx_bets_user (user_id),
  INDEX idx_bets_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Game launch sessions (one per user+game launch). Settlement totals are
-- accumulated here from aggregator bet/win callbacks. Replaces tblmatchplayed.
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
  -- Stakes not yet resolved by the provider. Non-zero keeps status at 'wait'.
  pending_rounds INT NOT NULL DEFAULT 0,
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

-- Individual settled bet/win events. serial_number is the aggregator's
-- idempotency key; the UNIQUE constraint makes duplicate delivery a no-op.
CREATE TABLE IF NOT EXISTS game_rounds (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id BIGINT UNSIGNED,
  user_id BIGINT UNSIGNED NOT NULL,
  game_id BIGINT UNSIGNED,
  game_uid VARCHAR(64) NOT NULL,
  -- The game actually played: a lobby launch reports the specific table here.
  game_name VARCHAR(150),
  serial_number VARCHAR(100) NOT NULL UNIQUE,
  game_round VARCHAR(100),
  -- A stake on a late-settling provider is 'pending' until its result arrives.
  settle_status ENUM('pending', 'settled') NOT NULL DEFAULT 'settled',
  settled_at DATETIME,
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

-- Raw audit log of inbound aggregator callbacks (replaces bet_logs.txt).
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

CREATE TABLE IF NOT EXISTS agents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 10,
  commission_type ENUM('revenue_share', 'cpa', 'hybrid') DEFAULT 'revenue_share',
  total_players INT DEFAULT 0,
  total_commission DECIMAL(18,2) DEFAULT 0,
  pending_commission DECIMAL(18,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS affiliates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  commission_tier INT DEFAULT 1,
  parent_affiliate_id BIGINT UNSIGNED,
  total_referrals INT DEFAULT 0,
  total_commission DECIMAL(18,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  subject VARCHAR(255) NOT NULL,
  category ENUM('deposit', 'withdrawal', 'game', 'account', 'bonus', 'other') DEFAULT 'other',
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  status ENUM('open', 'in_progress', 'pending_user', 'resolved', 'closed') DEFAULT 'open',
  assigned_to BIGINT UNSIGNED,
  source ENUM('web', 'email', 'whatsapp', 'phone', 'app') DEFAULT 'web',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_tickets_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ticket_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ticket_id BIGINT UNSIGNED NOT NULL,
  sender_type ENUM('user', 'agent', 'system') NOT NULL,
  sender_id BIGINT UNSIGNED,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS blocked_ips (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  reason VARCHAR(100),
  blocked_by BIGINT UNSIGNED,
  expires_at DATETIME,
  is_permanent BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_blocked_ip (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED,
  admin_id BIGINT UNSIGNED,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user (user_id),
  INDEX idx_notif_admin (admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_call_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  voice_executive_id VARCHAR(50),
  duration_seconds INT,
  recording_url VARCHAR(500),
  transcript TEXT,
  deposit_intent BOOLEAN DEFAULT FALSE,
  deposit_amount DECIMAL(18,2),
  status ENUM('completed', 'failed', 'escalated') DEFAULT 'completed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS platform_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value JSON NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Home-page promo banners shown in the hero carousel. Managed by this product's
-- own admin panel (/admin -> Banners), not by Super Admin. Only rows with
-- status='active' are served to the public frontends, ordered by sort_order.
CREATE TABLE IF NOT EXISTS banners (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150),
  image_url VARCHAR(500) NOT NULL,
  link_url VARCHAR(500),
  sort_order INT NOT NULL DEFAULT 0,
  status ENUM('draft', 'active') DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Home-page FAQ entries shown in the "Frequently asked questions" accordion on
-- every frontend theme. Managed by this product's own admin panel (/admin ->
-- FAQs), not by Super Admin. Only rows with status='active' are served to the
-- public frontends, ordered by sort_order.
CREATE TABLE IF NOT EXISTS faqs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(300) NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  status ENUM('draft', 'active') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS login_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED,
  admin_id BIGINT UNSIGNED,
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_type VARCHAR(50),
  country_code CHAR(2),
  session_id VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  admin_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id BIGINT UNSIGNED,
  before_value JSON,
  after_value JSON,
  ip_address VARCHAR(45),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Seed data (admin, platform settings, game catalog)
-- ---------------------------------------------------------------------------

INSERT INTO users (id, username, email, password_hash, full_name, role, account_status)
VALUES (
  1, 'superadmin', 'admin@dollara.local',
  '$2b$12$C9ZVRYJkjISgdOHdF/wTIeoWNhC80WWiYrvlJenWGI9pAxSjFqcxm', 'Platform Admin', 'admin', 'active'
)
ON DUPLICATE KEY UPDATE username = username;

-- Platform configuration, bonus campaigns and the live game catalog, exported
-- from the production database (dump-dollara-202607181724.sql) so a fresh
-- import comes up with the real provider list, catalog and settings.
--
-- Columns are named explicitly rather than relying on positional VALUES: the
-- export predates several schema additions, and naming them keeps this seed
-- correct as the schema moves on. Player data (users, wallets, transactions,
-- gameplay history) is deliberately NOT seeded here.

INSERT INTO platform_settings (id, setting_key, setting_value, updated_at) VALUES
  (1, 'site_name', '\"DOLLARA\"', '2026-06-26 06:58:40'),
  (2, 'supported_languages', '[\"en\", \"hi\", \"ta\", \"te\", \"ml\"]', '2026-06-26 06:58:40'),
  (3, 'min_deposit', '100', '2026-06-26 06:58:40'),
  (4, 'min_withdrawal', '500', '2026-06-26 06:58:40'),
  (5, 'auto_approve_withdrawal_limit', '10000', '2026-06-26 06:58:40'),
  (6, 'game_status', '{\"enabled\": true}', '2026-06-26 06:58:40')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

INSERT INTO bonuses (id, name, display_title, description, bonus_type, value_type, value_amount, min_deposit, max_bonus_cap, referrer_reward, wagering_multiplier, credit_target, status, start_date, end_date, claim_method, promo_code, per_user_limit, total_budget, total_awarded, total_claims, bonus_validity_days, allowed_countries, excluded_countries, created_at, updated_at) VALUES
  (2, 'welcome100_copy', 'Welcome Bonus ₹100', NULL, 'no_deposit', 'fixed', 100.00, 0.00, 100.00, 0.00, 35.00, 'bonus', 'paused', '2026-06-26 06:58:40', '2027-06-26 06:58:40', 'auto', NULL, NULL, NULL, 0.00, 0, 30, NULL, NULL, '2026-07-16 12:19:18', '2026-07-18 09:47:14')
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO banners (id, title, image_url, link_url, sort_order, status, created_at, updated_at) VALUES
  (1, 'offer', 'https://api.ranamatch.com/media/uploads/6/c4c51c6e21414b3fb70ae4cc5f70c4b1.png', NULL, 1, 'active', '2026-07-16 11:41:26', '2026-07-18 09:03:33'),
  (2, 'Offer 2', 'https://api.ranamatch.com/media/uploads/6/b9e85682706c4f5288bb7e279be50f89.png', NULL, 0, 'active', '2026-07-16 11:42:15', '2026-07-18 09:03:03')
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO faqs (id, question, answer, sort_order, status) VALUES
  (1, 'Why is this one of the best betting sites in India?', 'A trusted, licensed platform built around fast payouts, fair games and 24/7 human support — without the clutter of typical betting sites.', 0, 'active'),
  (2, 'Is online betting legal in India?', 'There are no federal laws explicitly prohibiting online betting across most of India. We recommend checking your local state regulations.', 1, 'active'),
  (3, 'How do I withdraw my winnings?', 'Withdraw instantly to UPI or your bank account. Most cash-outs complete in under five minutes after a quick verification.', 2, 'active'),
  (4, 'Can I actually win in an online casino?', 'Yes. Every game uses certified RNG and published RTP so outcomes are genuinely random and verifiable.', 3, 'active'),
  (5, 'Are casino games skill or luck?', 'It depends. Slots and crash games are luck-based, while Poker and Blackjack reward skill and strategy.', 4, 'active')
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO game_providers (id, name, slug, logo_url, is_active, created_at) VALUES
  (1, 'Arcade', 'arcade', '', 1, '2026-06-26 06:58:40'),
  (2, 'Esports', 'esports', '', 1, '2026-06-26 06:58:40'),
  (3, 'Instant Games', 'instant', '', 1, '2026-06-26 06:58:40'),
  (4, 'Live Casino', 'live', '', 1, '2026-06-26 06:58:40'),
  (5, 'Poker', 'poker', '', 1, '2026-06-26 06:58:40'),
  (6, 'Slots', 'slots', '', 1, '2026-06-26 06:58:40'),
  (7, 'Sportsbook', 'sports', '', 1, '2026-06-26 06:58:40'),
  (8, 'India Lotto', 'India-lotto', '', 1, '2026-07-15 11:02:55'),
  (9, 'Odin Cockfighting', 'odin-cockfighting', '', 1, '2026-07-15 11:35:01')
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO games (id, provider_id, name, slug, category, game_uid, game_type, thumbnail_url, rtp, min_bet, max_bet, is_featured, is_active_web, is_active_mobile, is_active, is_provably_fair, sort_order, play_count, created_at, updated_at) VALUES
  (1, 4, 'Microgaming Lobby', 'microgaming-lobby-4e58131a', 'live_casino', '4e58131adb95bb061a40e6e309116c19', 'CasinoLive', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT1BrpDj_tYZ2FysnP4-K6_cs9E5JdFBQWzleThcK4o1L2BPOzzFGSlq78&s=10', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 3, '2026-06-26 06:58:40', '2026-07-18 07:58:59'),
  (2, 4, 'Ezugi Lobby', 'ezugi-lobby-d0e052b0', 'live_casino', 'd0e052b031dfcdb08d1803f4bcc618ef', 'CasinoLive', 'https://www.livecasinocomparer.com/wp-content/uploads/2026/04/ezugi-live-casino.webp', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 1, 13, '2026-06-26 06:58:40', '2026-07-18 10:53:21'),
  (3, 4, 'Evolution Lobby', 'evolution-lobby-8ef39602', 'live_casino', '8ef39602e589bf9f32fc351b1cbb338b', 'CasinoLive', 'https://delivery2.objectic.io/Jd8DtRve6A7M91Dp6stxDe/jIWXpQOLRVBo/JpY1srhK0mprif3Erg9u8hhorJWy0N00QMMBQ9X6.jpg?w=1536&q=75&fm=auto', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 2, 4, '2026-06-26 06:58:40', '2026-07-16 14:10:35'),
  (4, 4, 'Super Andar Bahar', 'super-andar-bahar-f7b98e89', 'live_casino', 'f7b98e899461bdd49f92afc36b4c0db5', 'CasinoLive', 'https://i.postimg.cc/nzJXysKD/Screenshot-2025-03-21-153431.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 3, 7, '2026-06-26 06:58:40', '2026-07-16 14:02:50'),
  (5, 4, 'XXXtreme Lightning Roulette', 'xxxtreme-lightning-roulette-394fe6a2', 'live_casino', '394fe6a2cde24bc487767236cc6eccd6', 'CasinoLive', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTzVO-S7RaA_LKkxsZA_uko3yFvK4tN_ywLVdRscfc4WQ&s=10', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 4, 1, '2026-06-26 06:58:40', '2026-07-16 14:43:20'),
  (6, 4, 'Crazy Time', 'crazy-time-917c0c51', 'live_casino', '917c0c51d248c33eb058e3210a2e7371', 'CasinoLive', 'https://i.postimg.cc/tJ9Vx1Yj/Screenshot-2025-03-21-153400.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 5, 1, '2026-06-26 06:58:40', '2026-07-16 14:00:37'),
  (7, 4, 'Lightning Roulette', 'lightning-roulette-4a858d6b', 'live_casino', '4a858d6b74c05260d3ea2762838798c7', 'CasinoLive', 'https://egw.news/_next/image?url=https%3A%2F%2Fegw.news%2Fuploads%2Fnews%2F1%2F17%2F1755104641788_1755104641791.webp&w=1920&q=75', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 6, 4, '2026-06-26 06:58:40', '2026-07-16 14:13:12'),
  (8, 4, 'MONOPOLY Live', 'monopoly-live-d496ac5f', 'live_casino', 'd496ac5fd91702331133e44b6bd12b26', 'CasinoLive', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTPSJn1LFVhHz91ek4yaUukVv7h4vtLMs8bEijt60nVAAnPC4W-V9ZQMVcR&s=10', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 7, 1, '2026-06-26 06:58:40', '2026-07-16 14:00:45'),
  (9, 4, 'Playtech Lobby', 'playtech-lobby-c38efc51', 'live_casino', 'c38efc51028bd65f42396fa079c125d6', 'CasinoLive', 'https://www.primeapi.com/cdn/gameRes/sq/350/PlaytechGameShowsLobby.jpg', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 8, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (10, 4, 'DreamGaming', 'dreamgaming-8737e1ef', 'live_casino', '8737e1ef982bd7ba41ec02c1823626f9', 'CasinoLive', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcStNfAHfOSIAtMdyIl4WUifqAGzGvU4MYm4-JnUt2eQoa9-PzdGJABs-5AT&s=10', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 9, 0, '2026-06-26 06:58:40', '2026-07-03 13:26:56'),
  (11, 4, 'Mines', 'mines-72ce7e04', 'live_casino', '72ce7e04ce95ee94eef172c0dfd6dc17', 'CasinoLive', 'https://ossimg.tirangaagent.com/Tiranga/gamelogo/JILI/232.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 10, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (12, 4, 'Tower', 'tower-8e939551', 'live_casino', '8e939551b9e785001fcb5b0a32f88aba', 'CasinoLive', 'https://ossimg.tirangaagent.com/Tiranga/gamelogo/JILI/233.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 11, 1, '2026-06-26 06:58:40', '2026-07-14 16:08:17'),
  (13, 4, 'HILO', 'hilo-bd8a2bb2', 'live_casino', 'bd8a2bb2dd63503b93cf6ac9492786ce', 'CasinoLive', 'https://ossimg.tirangaagent.com/Tiranga/gamelogo/JILI/235.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 12, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (14, 4, 'Limbo', 'limbo-eabf0825', 'live_casino', 'eabf08253165b6bb2646e403de625d1a', 'CasinoLive', 'https://ossimg.tirangaagent.com/Tiranga/gamelogo/JILI/236.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 13, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (15, 4, 'Trump Card', 'trump-card-96c010fc', 'live_casino', '96c010fc4a95792401e903213d7add44', 'CasinoLive', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Trump-Card.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 14, 1, '2026-06-26 06:58:40', '2026-07-18 07:52:57'),
  (16, 4, 'Wheel', 'wheel-6e19e03c', 'live_casino', '6e19e03c50f035ddd9ffd804c30f8c80', 'CasinoLive', 'https://ossimg.tirangaagent.com/Tiranga/gamelogo/JILI/229.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 15, 3, '2026-06-26 06:58:40', '2026-07-16 14:41:59'),
  (17, 3, 'Aviator', 'aviator-a04d1f3e', 'ai_games', 'a04d1f3eb8ccec8a4823bdf18e3f0e84', 'CasinoTable', 'https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/800.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 16, 38, '2026-06-26 06:58:40', '2026-07-18 09:19:22'),
  (18, 3, 'Mines', 'mines-5c4a12fb', 'ai_games', '5c4a12fb0a9b296d9b0d5f9e1cd41d65', 'CasinoTable', 'https://ossimg.tirangaagent.com/Tiranga/gamelogo/SPRIBE/22005.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 17, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (19, 3, 'Plinko', 'plinko-6ab7a4fe', 'ai_games', '6ab7a4fe5161936012d6b06143918223', 'CasinoTable', 'https://ossimg.tirangaagent.com/Tiranga/gamelogo/SPRIBE/22004.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 18, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (20, 3, 'Dice', 'dice-8a87aae7', 'ai_games', '8a87aae7a3624d284306e9c6fe1b3e9c', 'CasinoTable', 'https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/102.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 19, 1, '2026-06-26 06:58:40', '2026-07-13 12:19:13'),
  (21, 3, 'Goal', 'goal-c68a515f', 'ai_games', 'c68a515f0b3b10eec96cf6d33299f4e2', 'CasinoTable', 'https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/105.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 20, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (22, 3, 'Hi Lo', 'hi-lo-a669c993', 'ai_games', 'a669c993b0e1f1b7da100fcf95516bdf', 'CasinoTable', 'https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/101.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 21, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (23, 3, 'Hotline', 'hotline-b31720b3', 'ai_games', 'b31720b3cd65d917a1a96ef61a72b672', 'CasinoTable', 'https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/107.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 22, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (24, 3, 'Keno', 'keno-c311eb4b', 'ai_games', 'c311eb4bbba03b105d150504931f2479', 'CasinoTable', 'https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/106.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 23, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (25, 3, 'Mini Roulette', 'mini-roulette-9dc7ac61', 'ai_games', '9dc7ac6155c5a19c1cc204853e426367', 'CasinoTable', 'https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/104.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 24, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (26, 1, 'Ocean King Jackpot', 'ocean-king-jackpot-564c48d5', 'ai_games', '564c48d53fcddd2bcf0bf3602d86c958', 'Fish Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Ocean-King-Jackpot.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 25, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (27, 1, 'Royal Fishing', 'royal-fishing-e794bf57', 'ai_games', 'e794bf5717aca371152df192341fe68b', 'Fish Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Royal-Fishing.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 26, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (28, 1, 'Bombing Fishing', 'bombing-fishing-e333695b', 'ai_games', 'e333695bcff28acdbecc641ae6ee2b23', 'Fish Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Bombing-Fishing.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 27, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (29, 1, 'Dinosaur Tycoon', 'dinosaur-tycoon-eef3e28f', 'ai_games', 'eef3e28f0e3e7b72cbca61e7924d00f1', 'Fish Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Dinosaur-Tycoon.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 28, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (30, 1, 'Jackpot Fishing', 'jackpot-fishing-3cf4a85c', 'ai_games', '3cf4a85cb6dcf4d8836c982c359cd72d', 'Fish Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Jackpot-Fishing.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 29, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (31, 1, 'Dragon Fortune', 'dragon-fortune-1200b824', 'ai_games', '1200b82493e4788d038849bca884d773', 'Fish Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Dragon-Fortune.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 30, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (32, 1, 'Mega Fishing', 'mega-fishing-caacafe3', 'ai_games', 'caacafe3f64a6279e10a378ede09ff38', 'Fish Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Mega-Fishing.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 31, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (33, 1, 'Boom Legend', 'boom-legend-f02ede19', 'ai_games', 'f02ede19c5953fce22c6098d860dadf4', 'Fish Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Boom-Legend.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 32, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (34, 1, 'Happy Fishing', 'happy-fishing-71c68a4d', 'ai_games', '71c68a4ddb63bdc8488114a08e603f1c', 'Fish Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Happy-Fishing.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 33, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (35, 1, 'All-star Fishing', 'all-star-fishing-9ec2a187', 'ai_games', '9ec2a18752f83e45ccedde8dfeb0f6a7', 'Fish Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/All-star-Fishing.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 34, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (36, 1, 'Dinosaur Tycoon II', 'dinosaur-tycoon-ii-bbae6016', 'ai_games', 'bbae6016f79f3df74e453eda164c08a4', 'Fish Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Dinosaur-Tycoon-II.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 35, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (37, 1, 'Fishing Disco', 'fishing-disco-e453b811', 'ai_games', 'e453b811fd1782fd2ade1f93ee0dee32', 'Fish Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Fishing-Disco.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 36, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (38, 1, 'Dragon Master', 'dragon-master-f691d904', 'ai_games', 'f691d904ea681ce449263f7e9cc47c35', 'Fish Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Dragon-Master.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 37, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (39, 1, 'Fishing Yilufa', 'fishing-yilufa-877c9736', 'ai_games', '877c97367d24925a11d342726eb0320f', 'Fish Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Fishing-Yilufa.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 38, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (40, 1, 'Shade Dragons Fishing', 'shade-dragons-fishing-89e967a8', 'ai_games', '89e967a8336fb8caad2c1b6d735588fe', 'Fish Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Shade-Dragons-Fishing.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 39, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (41, 1, 'Cai Shen Fishing', 'cai-shen-fishing-6df463ea', 'ai_games', '6df463eabe5fcdaa033e1c89b9ffd162', 'Fish Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Cai-Shen-Fishing.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 40, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (42, 1, 'Dragon Fishing II', 'dragon-fishing-ii-6cef8d8e', 'ai_games', '6cef8d8ea517d86602db60fe9781b01b', 'Fish Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Dragon-Fishing-Ii.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 41, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (43, 1, 'Dragon Fishing', 'dragon-fishing-1145d7cd', 'ai_games', '1145d7cd96518a5ba2f77cb14cb363c4', 'Fish Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Dragon-Fishing.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 42, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (44, 5, 'TeenPatti', 'teenpatti-f743cb55', 'live_casino', 'f743cb55c2c4b737727ef144413937f4', 'India Poker Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/TeenPatti.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 43, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (45, 5, 'AK47', 'ak47-488c3776', 'live_casino', '488c377662cad37a551bde18e2fbe785', 'India Poker Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/AK47.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 44, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (46, 5, 'Andar Bahar', 'andar-bahar-6f48b3aa', 'live_casino', '6f48b3aa0b64c79a2dc320ea021148b5', 'India Poker Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Andar-Bahar.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 45, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (47, 5, 'Rummy', 'rummy-ae632f32', 'live_casino', 'ae632f32c3a1e6803f9a6fbec16be28e', 'India Poker Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Rummy.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 46, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (48, 5, 'Callbreak', 'callbreak-9092b5a5', 'live_casino', '9092b5a56e001c60850c4c1184c53e07', 'India Poker Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Callbreak.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 47, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (49, 5, 'TeenPatti Joker', 'teenpatti-joker-1a4eaca6', 'live_casino', '1a4eaca67612e65fdcae43f4c8a667a4', 'India Poker Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/TeenPatti-Joker.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 48, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (50, 5, 'Callbreak Quick', 'callbreak-quick-aa9a9916', 'live_casino', 'aa9a9916d6e48ba50afa3c2246b6dacb', 'India Poker Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Callbreak-Quick.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 49, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (51, 5, 'TeenPatti 20-20', 'teenpatti-20-20-1afa7db5', 'live_casino', '1afa7db588d05de7b9abca4664542765', 'India Poker Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/TeenPatti-20-20.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 50, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (52, 5, 'Ludo Quick', 'ludo-quick-bb1f14d7', 'live_casino', 'bb1f14d788d37b06dc8f6701ed57ed0d', 'India Poker Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Ludo-Quick.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 51, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (53, 5, 'Tongits Go', 'tongits-go-26fbfab9', 'live_casino', '26fbfab92a3837b7dbf767e783b173af', 'India Poker Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Tongits-Go.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 52, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (54, 5, 'Pusoy Go', 'pusoy-go-f2879a3f', 'live_casino', 'f2879a3f20f305eadad13448e11c052e', 'India Poker Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Pusoy-Go.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 53, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (55, 5, 'Blackjack', 'blackjack-3b502aee', 'live_casino', '3b502aee6c9e1ef0f698332ee1b76634', 'India Poker Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Blackjack.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 54, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (56, 5, 'Blackjack Lucky Ladies', 'blackjack-lucky-ladies-d0d1c200', 'live_casino', 'd0d1c20062e28493e1750f27a1730c48', 'India Poker Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Blackjack-Lucky-Ladies.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 55, 4, '2026-06-26 06:58:40', '2026-07-18 07:57:56'),
  (57, 5, 'MINI FLUSH', 'mini-flush-07afefc3', 'live_casino', '07afefc388ab6af8cf26f85286f83fae', 'India Poker Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/MINI-FLUSH.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 56, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (58, 5, 'Pool Rummy', 'pool-rummy-43e7df81', 'live_casino', '43e7df819bf57722a8917bb328640b30', 'India Poker Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Pool-Rummy.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 57, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (59, 5, 'Caribbean Stud Poker', 'caribbean-stud-poker-04c9784b', 'live_casino', '04c9784b0b1b162b2c86f9ce353da8b7', 'India Poker Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Caribbean-Stud-Poker.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 58, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (60, 6, 'Le Pharaoh', 'le-pharaoh-fd4d50fd', 'slots', 'fd4d50fd42d7453c20776398269ee6c5', 'Slot', 'https://mediumrare.imgix.net/293b2337d4d5cfda999ca423e34518a1a6682062340f1f1c5a669a26e7927c79?w=180&h=236&fit=min&auto=format', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 59, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (61, 6, 'Phoenix DuelReels', 'phoenix-duelreels-32776cbf', 'slots', '32776cbf601015f626a96ccecb1137d9', 'Slot', 'https://mediumrare.imgix.net/7ac7169ca980177d2f7843face3046fb42c001bf4dd7356becb037e92fc07ff1?w=180&h=236&fit=min&auto=format', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 60, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (62, 6, 'Fortune Dragon', 'fortune-dragon-c5435a8a', 'slots', 'c5435a8a73707a3a8bb4fe8baaaef3d2', 'Slot', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Fortune-Dragon_icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 61, 2, '2026-06-26 06:58:40', '2026-07-13 12:30:41'),
  (63, 6, 'Fortune Rabbit', 'fortune-rabbit-e175cdd3', 'slots', 'e175cdd3215a02f5539cc8354a149b75', 'Slot', 'https://mediumrare.imgix.net/8f495d55e1cdbef9a5995b7133d6f4ad1b9a332493ade8b29a82f048ecda7388?w=180&h=236&fit=min&auto=format', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 62, 1, '2026-06-26 06:58:40', '2026-07-13 12:20:16'),
  (64, 6, 'Fortune Tiger', 'fortune-tiger-9a848256', 'slots', '9a8482565ce343ad3ea7fc4bc42cb043', 'Slot', 'https://mediumrare.imgix.net/38cdf7e275e87c2530ee926bb2f5c811d9cb6ffccdad7717bed7ca43aa88eb38?w=180&h=236&fit=min&auto=format', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 63, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (65, 6, 'SixSixSix', 'sixsixsix-37524900', 'slots', '3752490080e5e310b5a3f823de33deed', 'Slot', 'https://mediumrare.imgix.net/30be38fdc2b4d9a6c76194314dfb7814a66d6905287ade354a0e5f2a79b1ab27?w=180&h=236&fit=min&auto=format', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 64, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (66, 6, 'Le Bandit', 'le-bandit-2fbd2533', 'slots', '2fbd2533b1bb03d5e03bfa80dd5da0bf', 'Slot', 'https://mediumrare.imgix.net/8ade942d35d2cdbddf7888f303be4cf4bda8c650a112b3c53f7c6f3ccad81254?w=180&h=236&fit=min&auto=format', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 65, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (67, 6, 'Donny Dough', 'donny-dough-173c3e7c', 'slots', '173c3e7cb587af08a8aa2026e490b832', 'Slot', 'https://mediumrare.imgix.net/d0da486c2ef84196c52198fce55b4566303ef3d73d94c675179a8f6c4c5a3781?w=180&h=236&fit=min&auto=format', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 66, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (68, 6, 'Magic Piggy', 'magic-piggy-a1686de7', 'slots', 'a1686de737ae9cd841d500c825720778', 'Slot', 'https://mediumrare.imgix.net/b18560b8631fc3b27c06d41e9729f7774048864ad7c4a16d1a20b1a953883943?w=180&h=236&fit=min&auto=format', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 67, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (69, 6, 'Wild Bandito', 'wild-bandito-95fc290b', 'slots', '95fc290bb05c07b5aad1a054eba4dcc4', 'Slot', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Wild-Bandito_icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 68, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (70, 6, 'Aviamasters', 'aviamasters-d3c79852', 'slots', 'd3c7985229b2e4651fa7889445a5bfd8', 'Slot', 'https://mediumrare.imgix.net/202834625f09f92dc0213a6f046d5111bcbba4aec9abf2d1b896839b592c657d?w=180&h=236&fit=min&auto=format', NULL, 10.00, 100000.00, 0, 0, 1, 1, 0, 69, 0, '2026-06-26 06:58:40', '2026-06-30 18:06:43'),
  (71, 6, 'RIP City', 'rip-city-784f4587', 'slots', '784f4587c36ec560939eef1b85c639e4', 'Slot', 'https://mediumrare.imgix.net/c55c2ec37c310140617b75c9e490faca98090292991840dce959d93649efbfa5?w=180&h=236&fit=min&auto=format', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 70, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (72, 6, 'FRKN Bananas', 'frkn-bananas-7e6130a7', 'slots', '7e6130a781f047045e7b92638d8e3fca', 'Slot', 'https://mediumrare.imgix.net/d4c903b8aa3bcbcd3e7cfdd46e14fa5ff3f056922cd470a109438ee41184990e?w=180&h=236&fit=min&auto=format', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 71, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (73, 6, 'Mahjong Ways', 'mahjong-ways-1189baca', 'slots', '1189baca156e1bbbecc3b26651a63565', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Mahjong-Ways_rounded_1024.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 72, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (74, 6, 'Mahjong Ways 2', 'mahjong-ways-2-ba2adf72', 'slots', 'ba2adf72179e1ead9e3dae8f0a7d4c07', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Mahjong-Ways2_rounded_1024.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 73, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (75, 6, 'Treasures of Aztec', 'treasures-of-aztec-2fa9a84d', 'slots', '2fa9a84d096d6ff0bab53f81b79876c8', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Treasures-of-Aztec_rounded_1024.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 74, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (76, 6, 'Leprechaun Riches', 'leprechaun-riches-fb2a2ac5', 'slots', 'fb2a2ac51303c0a0801dbe6a72d936f7', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Leprechaun-Riches_rounded_1024.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 75, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (77, 6, 'Lucky Neko', 'lucky-neko-e1b4c6b9', 'slots', 'e1b4c6b95746d519228744771f15fe4b', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Lucky-Neko_icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 76, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (78, 6, 'Captain\'s Bounty', 'captain-s-bounty-cd29b990', 'slots', 'cd29b9906a852ce26b53b6d6d81037d4', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Captains-Bounty_Icon_Rounded_1024.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 77, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (79, 6, 'Queen of Bounty', 'queen-of-bounty-83a6890c', 'slots', '83a6890cf84e4c5a6bacf96d5355d472', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Queen-of-Bounty_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 78, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (80, 6, 'Ways of the Qilin', 'ways-of-the-qilin-fedfca55', 'slots', 'fedfca553a97a791a3a41c4f1e3bff58', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Ways-of-the-Qilin_icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 79, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (81, 6, 'Dragon Hatch', 'dragon-hatch-4afef91d', 'slots', '4afef91d3addb9ce5107abaf3342b9a5', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Dragon-Hatch_rounded_1024.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 80, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (82, 6, 'Chin Shi Huang', 'chin-shi-huang-24da72b4', 'slots', '24da72b49b0dd0e5cbef9579d09d8981', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Chin-Shi-Huang.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 81, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (83, 6, 'God Of Martial', 'god-of-martial-21ef8a7d', 'slots', '21ef8a7ddd39836979170a2e7584e333', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/God-Of-Martial.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 82, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (84, 6, 'Hot Chilli', 'hot-chilli-c845960c', 'slots', 'c845960c81d27d7880a636424e53964d', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Hot-Chilli.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 83, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (85, 6, 'Fortune Tree', 'fortune-tree-6a7e156c', 'slots', '6a7e156ceec5c581cd6b9251854fe504', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Fortune-Tree.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 84, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (86, 6, 'War Of Dragons', 'war-of-dragons-4b1d7ffa', 'slots', '4b1d7ffaf9f66e6152ea93a6d0e4215b', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/War-Of-Dragons.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 85, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (87, 6, 'Gem Party', 'gem-party-756cf3c7', 'slots', '756cf3c73a323b4bfec8d14864e3fada', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Gem-Party.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 86, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (88, 6, 'Lucky Ball', 'lucky-ball-89366989', 'slots', '893669898cd25d9da589a384f1d004df', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Lucky-Ball.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 87, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (89, 6, 'Mafia Mayhem', 'mafia-mayhem-c7b3016c', 'slots', 'c7b3016c70a06ddbb2355a3aee4179d0', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Mafia-Mayhem_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 88, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (90, 6, 'Werewolf Hunt', 'werewolf-hunt-2ac70bee', 'slots', '2ac70bee7b47c172381e55f7e644d92e', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Werewolfs-Hunt_icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 89, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (91, 6, 'Tsar Treasures', 'tsar-treasures-1eb6a959', 'slots', '1eb6a959aadf0491f4a648762d8d262a', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Tsar-Treasures_icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 90, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (92, 6, 'Dragon Hatch 2', 'dragon-hatch-2-910f2568', 'slots', '910f25689073d17680be453d7ed90ce2', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Dragon-Hatch2_icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 91, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (93, 6, 'Gemstones Gold', 'gemstones-gold-877c9b2e', 'slots', '877c9b2ec1c5e0505129315948f9bbfa', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Gemstones-Gold_appicon_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 92, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (94, 6, 'Cash Maniac', 'cash-maniac-8bbb4136', 'slots', '8bbb41367b3971ed3467c2f0c2627a4', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Cash-Mania_appicon_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 93, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (95, 6, 'Wild Ape #', 'wild-ape-2589b93c', 'slots', '2589b93cb0dc46d847864c87ed42a3428bb', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Wild-Ape_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 94, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (96, 6, 'Pinata Wins', 'pinata-wins-f08cc025', 'slots', 'f08cc025e23ee049b570517867c74be0', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Pinata-Wins_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 95, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (97, 6, 'Mystic Potion', 'mystic-potion-e61bde75', 'slots', 'e61bde75d590e943d2c5c6d432b29b46', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Mystic-Potion.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 96, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (98, 6, 'Hawaiian Tiki', 'hawaiian-tiki-35d6743a', 'slots', '35d6743ae5d73a3359f143cbb44ede09', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Hawaiian-Tiki_icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 97, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (99, 6, 'Bakery Bonanza', 'bakery-bonanza-d0fe7aa2', 'slots', 'd0fe7aa2f7ed5778190b1e60d94e6773', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Bakery-Bonanza_app-Icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 98, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (100, 6, 'Songkran Splash', 'songkran-splash-894b1c76', 'slots', '894b1c7609629cf9b3d127d9dbaa372c', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Songkran-Splash_appicon_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 99, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (101, 6, 'Mystical Spirits', 'mystical-spirits-3b2d4d1a', 'slots', '3b2d4d1ae24b1c3ad29556a6cf875f11', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Mystical-Spirits_icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 100, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (102, 6, 'Super Golf Drive', 'super-golf-drive-d37dde2a', 'slots', 'd37dde2adb52e0ea708c0ccd6877b1b3', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Super-Golf-Drive_icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 101, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (103, 6, 'Lucky Clover Lady', 'lucky-clover-lady-288f2905', 'slots', '288f290554746bb32322a79b96ecdcbb', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Lucky-Clover-Lady_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 102, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (104, 6, 'Fruity Candy', 'fruity-candy-9f2c89ae', 'slots', '9f2c89ae5b7c0894c9ee9e223e3fd9d8', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Fruity-Candy_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 103, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (105, 6, 'Cruise Royale', 'cruise-royale-8489d662', 'slots', '8489d662ccc07a2e9677729f76e26ae8', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Cruise-Royale_icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 104, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (106, 6, 'Safari Wilds', 'safari-wilds-97c6f05e', 'slots', '97c6f05ef6a0a34cad10d5e00edc909c', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Safari-Wilds_appicon_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 105, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (107, 6, 'Gladiator\'s Glory', 'gladiator-s-glory-2454dc7c', 'slots', '2454dc7cfdc651b7318950453bc3f617', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Gladiators-Glory_appicon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 106, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (108, 6, 'Ninja Racoon Frenzy', 'ninja-racoon-frenzy-6d1937d2', 'slots', '6d1937d2e7f87306333443c99ac2c03f', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Ninja-Racoon-Frenzy_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 107, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (109, 6, 'Ultimate Striker', 'ultimate-striker-4415d83c', 'slots', '4415d83cd9c74299814c1473db83bf7f', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Ultimate-Striker_appicon_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 108, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (110, 6, 'Mermaid Riches', 'mermaid-riches-a9d7a5af', 'slots', 'a9d7a5af417a94caf554170e6b345e57', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Mermaid-Riches-icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 109, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (111, 6, 'Raider Jane\'s Crypt of Fortune', 'raider-jane-s-crypt-of-fortune-24d8e1db', 'slots', '24d8e1dbc5cface0907f5a21ecd56753', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Raider-Janes-Crypt-of-Fortune_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 110, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (112, 6, 'Supermarket Spree', 'supermarket-spree-7ef03497', 'slots', '7ef03497fc0b21c34b137e85b1e409cd', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Supermarket-Spree_rounded_1024.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 111, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (113, 6, 'Buffalo Win', 'buffalo-win-818a7add', 'slots', '818a7add6e10b2ec5f938d7ae0efb04', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Buffalo-Win_icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 112, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (114, 6, 'Legendary Monkey King', 'legendary-monkey-king-5cdeba2a', 'slots', '5cdeba2ab48d6ba345b1a4de8e2776b5', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Legendary-Monkey-King_icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 113, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (115, 6, 'Spirited Wonders', 'spirited-wonders-87a05c81', 'slots', '87a05c81af5635bed41765bfd076ee15', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Spirited-Wonders_app-icon_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 114, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (116, 6, 'Emoji Riches', 'emoji-riches-101ca3ff', 'slots', '101ca3ff83b149dcf3439309e9b32142', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Emoji-Riches_app-Icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 115, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (117, 6, 'Mask Carnival', 'mask-carnival-adf297c2', 'slots', 'adf297c2666c69b3abc3b61618d593b8', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Mask-Carnival_app-icon_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 116, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (118, 6, 'Oriental Prosperity', 'oriental-prosperity-23b43b58', 'slots', '23b43b58e11aadb1f27fd05ba41e9819', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Oriental-Prosperity_icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 117, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (119, 6, 'Garuda Gems', 'garuda-gems-aa609892', 'slots', 'aa609892f551de2053e92427dc4ae17f', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Garuda-Gems_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 118, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (120, 6, 'Destiny of Sun & Moon', 'destiny-of-sun-moon-617ca04f', 'slots', '617ca04ffcffbc543a1a30cacdac98fa', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Destiny-of-Sun-and-Moon_icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 119, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (121, 6, 'Butterfly Blossom', 'butterfly-blossom-116989bb', 'slots', '116989bb267a72035bd01818c5496126', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Butterfly-Blossom_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 120, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (122, 6, 'Rooster Rumble', 'rooster-rumble-5c371d9f', 'slots', '5c371d9fca6109c954de93ac7986c5db', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Rooster-Rumble_app-icon_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 121, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (123, 6, 'The Queen\'s Banquet', 'the-queen-s-banquet-1b317b5f', 'slots', '1b317b5f8bf2ca0cc609307810407426', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/The-Queens-Banquet_icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 122, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (124, 6, 'Battleground Royale', 'battleground-royale-e9f92f6e', 'slots', 'e9f92f6edc2dac2d08bc345ee036260c', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Battleground-Royale_icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 123, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (125, 6, 'Win Win Fish Prawn Crab', 'win-win-fish-prawn-crab-9b344f0b', 'slots', '9b344f0b2a9bda427684be60597d2fc6', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Win-Win-Fish-Prawn-Crab_rounded_1024.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 124, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (126, 6, 'Lucky Piggy', 'lucky-piggy-66fadac6', 'slots', '66fadac68ed45e23def86c06cc811820', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Lucky-Piggy_icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 125, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (127, 6, 'Wild Coaster', 'wild-coaster-a06f1a15', 'slots', 'a06f1a154698243bf2484853d38e5fbb', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Wild-Coaster_app-icon_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 126, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (128, 6, 'Totem Wonders', 'totem-wonders-a03c6e7a', 'slots', 'a03c6e7a918132b50f9caa297df1752d', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Totem-Wonders_icon_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 127, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (129, 6, 'Alchemy Gold', 'alchemy-gold-9860c865', 'slots', '9860c865264dcacad1ef37176cdefc1a', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Alchemy-Gold_1024_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 128, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (130, 6, 'Asgardian Rising', 'asgardian-rising-08d92dc2', 'slots', '08d92dc2ca14f42c681b44297386d600', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Asgardian-Rising_appicon_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 129, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (131, 6, 'Midas Fortune', 'midas-fortune-a2fd6b0c', 'slots', 'a2fd6b0cadc8fefccfb0d063b1f81d85', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Midas-Fortune_appicon_rounded.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 130, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (132, 6, 'Hyper Burst', 'hyper-burst-a47b1797', 'slots', 'a47b17970036b37c1347484cf6956920', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Hyper-Burst.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 131, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (133, 6, 'Shanghai Beauty', 'shanghai-beauty-795d0cae', 'slots', '795d0cae623cbf34d7f1aa93bbcded28', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Shanghai-Beauty.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 132, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (134, 6, 'Fa Fa Fa', 'fa-fa-fa-54c41adc', 'slots', '54c41adcf43fdb6d385e38bc09cd77ca', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Fa-Fa-Fa.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 133, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (135, 6, 'Dragon Soar', 'dragon-soar-9341a18d', 'slots', '9341a18d096ad901ef77338998f29098', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Dragon-Soar.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 134, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (136, 6, 'Pop Pop Candy', 'pop-pop-candy-fde142e6', 'slots', 'fde142e65f14da39f784e9e5325e0a77', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Pop-Pop-Candy.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 135, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (137, 6, 'Open Sesame Mega', 'open-sesame-mega-cb5e57be', 'slots', 'cb5e57be0354264c6c7ea0cdf4eb18b3', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Open-Sesame-Mega.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 136, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (138, 6, 'Fruity Bonanza', 'fruity-bonanza-f5d6b418', 'slots', 'f5d6b418b755f3aefe3b9828f3112c9c', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Fruity-Bonanza.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 137, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (139, 6, 'Caishen Coming', 'caishen-coming-45ecec5d', 'slots', '45ecec5dd5077785e7a09988b95bbd24', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Caishen-Coming.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 138, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (140, 6, 'Coocoo Farm', 'coocoo-farm-d1f17fd5', 'slots', 'd1f17fd51e474b0e72892332ea551ba1', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Coocoo-Farm.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 139, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (141, 6, 'Elemental Link Water', 'elemental-link-water-b84274cd', 'slots', 'b84274cdfa5731945a34bfd0db1ddeea', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Elemental-Link-Water.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 140, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (142, 6, 'Elemental Link Fire', 'elemental-link-fire-46016a77', 'slots', '46016a772b92c7f47dfdc5873f184ef1', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Elemental-Link-Fire.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 141, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (143, 6, 'Birdsparty Deluxe', 'birdsparty-deluxe-786d1cd7', 'slots', '786d1cd7f4fa9905c825378292f1204c', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Birdsparty-Deluxe.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 142, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (144, 6, 'Moneybags Man 2', 'moneybags-man-2-33c862e7', 'slots', '33c862e7db9e0e59ab3f8fe770f797da', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Moneybags-Man-2.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 143, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (145, 6, 'JumpHigh', 'jumphigh-630a841b', 'slots', '630a841b4cf75a38e2e657040f785e63', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/cq9/JumpHigh.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 144, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (146, 6, 'Rave Jump', 'rave-jump-b602205d', 'slots', 'b602205d6a56d999df188e17ecc2bc91', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/cq9/Rave-Jump.png', NULL, 10.00, 100000.00, 0, 0, 1, 1, 0, 145, 0, '2026-06-26 06:58:40', '2026-06-30 18:06:51'),
  (147, 6, 'Jump High 2', 'jump-high-2-8d57ec62', 'slots', '8d57ec6274960fe2f2c252f4a49adf7f', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/cq9/Jump-High-2.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 146, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (148, 6, 'Jumping Mobile', 'jumping-mobile-1282953e', 'slots', '1282953e9452fe2852cb1724b4b9d617', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/cq9/Jumping-mobile.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 147, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (149, 6, 'Good Fortune M', 'good-fortune-m-50568ba2', 'slots', '50568ba2a8da9f30dded83dbbd3655d6', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/cq9/Good-Fortune-M.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 148, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (150, 6, 'God of War', 'god-of-war-f4b6484d', 'slots', 'f4b6484dc2b96fc339604446cd042534', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/cq9/God-of-War.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 149, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (151, 6, 'FlyOut', 'flyout-afddbebb', 'slots', 'afddbebb27c4b7408bda624aa9354aa7', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/cq9/FlyOut.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 150, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (152, 6, 'Emperor Qin', 'emperor-qin-d58b1c2d', 'slots', 'd58b1c2dd6456da42b2c1a33c70c1630', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-emperorqin.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 151, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (153, 6, 'Cracker', 'cracker-b6668f2a', 'slots', 'b6668f2abcfff3f7f78ae92fe908f99f', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-cracker.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 152, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (154, 6, 'FaFaFa', 'fafafa-017c1ede', 'slots', '017c1edeaf54d4684d675055c44a6f7e', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-fafafa.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 153, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (155, 6, 'Gold Toad', 'gold-toad-65415580', 'slots', '654155802c34cee717e943c4e2bb6bfe', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-goldtoad.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 154, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (156, 6, 'Lion Legend', 'lion-legend-eb8dd621', 'slots', 'eb8dd621ea38d742ff846362a9b1085d', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-lionlegend.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 155, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (157, 6, 'Goblin\'s Gold', 'goblin-s-gold-69799380', 'slots', '697993800419bf160901aa9133cde524', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-goblingold.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 156, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (158, 6, 'The Unsurpassed Grace', 'the-unsurpassed-grace-bf0ae3c4', 'slots', 'bf0ae3c404807429451d088725ae5377', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-theunsurpassedgrace.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 157, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (159, 6, 'Arctic King', 'arctic-king-8249b0e7', 'slots', '8249b0e703ceb0816f3645dbac0a83ce', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-arcticking.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 158, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (160, 6, 'Jalapeno', 'jalapeno-f23ad5ac', 'slots', 'f23ad5acc6c690a45f1280ba49d28266', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-jalapeno.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 159, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (161, 6, 'Ice Age Mammoths', 'ice-age-mammoths-484025f2', 'slots', '484025f23c821e32fc6ac31ff75613d6', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-iceagemammoths.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 160, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (162, 6, 'Cracker', 'cracker-4415afc3', 'slots', '4415afc357ffd90adfae34b7fc3217d0', 'Slot Game', 'https://dl.kz344.net/game-icon/agg_ht-cracker.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 161, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (163, 6, 'EstateRichman', 'estaterichman-99aa4072', 'slots', '99aa40727eebf03285f0b41492ad3200', 'Slot Game', 'https://dl.kz344.net/game-icon/agg_ht-estaterichman.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 162, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (164, 6, 'CaribbeanTreasure', 'caribbeantreasure-186ceb14', 'slots', '186ceb140e9248012244381fc169640b', 'Slot Game', 'https://dl.kz344.net/game-icon/agg_ht-caribbeantreasure.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 163, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (165, 6, 'LittleWitch', 'littlewitch-f41dd1fa', 'slots', 'f41dd1fabc4700025036ffd090358402', 'Slot Game', 'https://dl.kz344.net/game-icon/agg_ht-thelittlewitch.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 164, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (166, 6, 'FlameWolves', 'flamewolves-6ed7442a', 'slots', '6ed7442a8144c29321d95168ef6cb3de', 'Slot Game', 'https://dl.kz344.net/game-icon/agg_ht-flamewolves.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 165, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (167, 6, 'PersianEmpire', 'persianempire-b4a0d38b', 'slots', 'b4a0d38bac2760d3b2539430b3d65c6b', 'Slot Game', 'https://dl.kz344.net/game-icon/agg_ht-persianempire.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 166, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (168, 6, 'Heracles', 'heracles-3be4c3ab', 'slots', '3be4c3abed248df43bee04af55c7894e', 'Slot Game', 'https://dl.kz344.net/game-icon/agg_ht-heracles.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 167, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (169, 6, 'Poseidon', 'poseidon-7b5698f1', 'slots', '7b5698f1ab2aef819bea060ae5836c6d', 'Slot Game', 'https://dl.kz344.net/game-icon/agg_ht-poseidon.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 168, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (170, 6, 'GoldenMaitreya', 'goldenmaitreya-19565e4f', 'slots', '19565e4f0152c29bc3c05d44ffe316d2', 'Slot Game', 'https://dl.kz344.net/game-icon/agg_ht-goldenmaitreya.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 169, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (171, 6, 'GoldenWuZeTian', 'goldenwuzetian-e5e9c0ea', 'slots', 'e5e9c0eae20cdecc45c9287b93e00d4d', 'Slot Game', 'https://dl.kz344.net/game-icon/agg_ht-goldenwuzetian.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 170, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (172, 6, 'Sweet Land', 'sweet-land-91250a55', 'slots', '91250a55f75a3c67ed134b99bf587225', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Sweet-Land.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 171, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (173, 6, 'Cricket King 18', 'cricket-king-18-dcf220f4', 'slots', 'dcf220f4e3ecca0278911a55e6f11c77', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Cricket-King-18.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 172, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (174, 6, 'Elf Bingo', 'elf-bingo-5cec2b30', 'slots', '5cec2b309a8845b38f8e9b4e6d649ea2', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Elf-Bingo.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 173, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (175, 6, 'Cricket Sah 75', 'cricket-sah-75-6720a0ce', 'slots', '6720a0ce1d06648ff390fbea832798a9', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Cricket-Sah-75.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 174, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (176, 6, 'Golden Temple', 'golden-temple-976c5497', 'slots', '976c5497256c020ac012005f6bb166ad', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Golden-Temple.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 175, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (177, 6, 'Devil Fire', 'devil-fire-1b4c5865', 'slots', '1b4c5865131b4967513c1ee90cba4472', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Devil-Fire.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 176, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (178, 6, 'Bangla Beauty', 'bangla-beauty-6b60d159', 'slots', '6b60d159f0939a45f7b4c88a9b57499a', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Bangla-Beauty.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 177, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (179, 6, 'Aztec Priestess', 'aztec-priestess-6acff19b', 'slots', '6acff19b2d911a8c695ba24371964807', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Aztec-Priestess.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 178, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (180, 6, 'Fortune Monkey', 'fortune-monkey-add95fc4', 'slots', 'add95fc40f1ef0d56f5716ce45a56946', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Fortune-Monkey.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 179, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (181, 6, 'Dabanggg', 'dabanggg-5404a45b', 'slots', '5404a45b06826911c3537fdf935c281f', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Dabanggg.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 180, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (182, 6, 'Sin City', 'sin-city-830cac2f', 'slots', '830cac2f5da6cc1fb91cfae04b85b1e2', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Sin-City.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 181, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (183, 6, 'King Arthur', 'king-arthur-fafab1a1', 'slots', 'fafab1a17a237d0fc0e50c20d2c2bf4c', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/King-Arthur.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 182, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (184, 6, 'Charge Buffalo Ascent', 'charge-buffalo-ascent-28bc4a33', 'slots', '28bc4a33c985ddce6acd92422626b76f', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Charge-Buffalo-Ascent.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 183, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (185, 6, 'Witches Night', 'witches-night-82c5c404', 'slots', '82c5c404cf4c0790deb42a2b5653533c', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Witches-Night.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 184, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (186, 6, 'Mega Ace', 'mega-ace-eba92b1d', 'slots', 'eba92b1d3abd5f0d37dfbe112abdf0e2', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Mega-Ace.png', NULL, 10.00, 100000.00, 0, 0, 1, 1, 0, 185, 0, '2026-06-26 06:58:40', '2026-07-03 13:39:56'),
  (187, 6, 'Medusa', 'medusa-2c17b7c4', 'slots', '2c17b7c4e2ce5b8bebf4bd10e3e958d7', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Medusa.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 186, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (188, 6, 'Book of Gold', 'book-of-gold-6b283c43', 'slots', '6b283c434fd44250d83b7c2420f164f9', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Book-of-Gold.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 187, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (189, 6, 'Thor X', 'thor-x-7e6aa773', 'slots', '7e6aa773fa802aaa9cb1f2fac464736e', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Thor-X.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 188, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (190, 6, 'Happy Taxi', 'happy-taxi-1ed896aa', 'slots', '1ed896aae4bdc78c984021307b1dd177', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Happy-Taxi.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 189, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (191, 6, 'Gold Rush', 'gold-rush-2a5d731e', 'slots', '2a5d731e0fd60f52873a24ece11f2c0b', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Gold-Rush.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 190, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (192, 6, 'Mayan Empire', 'mayan-empire-5c2383ef', 'slots', '5c2383ef253f9c36dacec4b463d61622', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Mayan-Empire.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 191, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (193, 6, 'Crazy Pusher', 'crazy-pusher-00d92d5c', 'slots', '00d92d5cec10cf85623938222a6c2bb6', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Crazy-Pusher.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 192, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (194, 6, 'Bone Fortune', 'bone-fortune-aab3048a', 'slots', 'aab3048abc6a88e0759679fbe26e6a8d', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Bone-Fortune.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 193, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (195, 6, 'JILI CAISHEN', 'jili-caishen-11e330c2', 'slots', '11e330c2b23f106815f3b726d04e4316', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/JILI-CAISHEN.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 194, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (196, 6, 'Bonus Hunter', 'bonus-hunter-39775cdc', 'slots', '39775cdc4170e56c5f768bdee8b4fa00', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Bonus-Hunter.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 195, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (197, 6, 'World Cup', 'world-cup-28374b7a', 'slots', '28374b7ad7c91838a46404f1df046e5a', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/World-Cup.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 196, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (198, 6, 'Samba', 'samba-6d35789b', 'slots', '6d35789b2f419c1db3926350d57c58d8', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Samba.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 197, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (199, 6, 'Neko Fortune', 'neko-fortune-9a391758', 'slots', '9a391758f755cb30ff973e08b2df6089', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Neko-Fortune.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 198, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (200, 6, 'Wild Racer', 'wild-racer-2f0c5f96', 'slots', '2f0c5f96cda3c6e16b3929dd6103df8e', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Wild-Racer.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 199, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (201, 6, 'Pirate Queen', 'pirate-queen-70999d5b', 'slots', '70999d5bcf2a1d1f1fb8c82e357317f4', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Pirate-Queen.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 200, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (202, 6, 'Golden Joker', 'golden-joker-f301fe0b', 'slots', 'f301fe0b22d1540b1f215d282b20c642', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Golden-Joker.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 201, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (203, 6, 'Wild Ace', 'wild-ace-9a3b65e2', 'slots', '9a3b65e2ae5343df349356d548f3fc4b', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Wild-Ace.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 202, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (204, 6, 'Master Tiger', 'master-tiger-d2b48fe9', 'slots', 'd2b48fe98ac2956eeefd2bc4f7e0335a', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Master-Tiger.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 203, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (205, 6, 'Fortune Gems 2', 'fortune-gems-2-664fba4d', 'slots', '664fba4da609ee82b78820b1f570f4ad', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Fortune-Gems-2.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 204, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (206, 6, 'Fortune Gems', 'fortune-gems-a990de17', 'slots', 'a990de177577a2e6a889aaac5f57b429', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Fortune-Gems.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 205, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (207, 6, 'Crazy Hunter', 'crazy-hunter-69082f28', 'slots', '69082f28fcd46cbfd10ce7a0051f24b6', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Crazy-Hunter.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 206, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (208, 6, 'Party Night', 'party-night-d505541d', 'slots', 'd505541d522aa5ca01fc5e97cfcf2116', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Party-Night.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 207, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (209, 6, 'Magic Lamp', 'magic-lamp-582a5879', 'slots', '582a58791928760c28ec4cef3392a49f', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Magic-Lamp.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 208, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (210, 6, 'Agent Ace', 'agent-ace-8a4b4929', 'slots', '8a4b4929e796fda657a2d38264346509', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Agent-Ace.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 209, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (211, 6, 'TWIN WINS', 'twin-wins-c74b3cbd', 'slots', 'c74b3cbda5d16f77523e41c25104e602', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/TWIN-WINS.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 210, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (212, 6, 'Ali Baba', 'ali-baba-cc686634', 'slots', 'cc686634b4f953754b306317799f1f39', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Ali-Baba.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 211, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (213, 6, 'SevenSevenSeven', 'sevensevenseven-61d46add', 'slots', '61d46add6841aad4758288d68015eca6', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/SevenSevenSeven.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 212, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (214, 6, 'Bubble Beauty', 'bubble-beauty-a78d2ed9', 'slots', 'a78d2ed972aab8ba06181cc43c54a425', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Bubble-Beauty.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 213, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (215, 6, 'FortunePig', 'fortunepig-8488c76e', 'slots', '8488c76ee2afb8077fbd7eec62721215', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/FortunePig.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 214, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (216, 6, 'Crazy777', 'crazy777-8c62471f', 'slots', '8c62471fd4e28c084a61811a3958f7a1', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Crazy777.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 215, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (217, 6, 'Bao boon chin', 'bao-boon-chin-8c4ebb3d', 'slots', '8c4ebb3dc5dcf7b7fe6a26d5aadd2c3d', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Bao-boon-chin.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 216, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (218, 6, 'Night City', 'night-city-78e29705', 'slots', '78e29705f7c6084114f46a0aeeea1372', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Night-City.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 217, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (219, 6, 'Fengshen', 'fengshen-09699fd0', 'slots', '09699fd0de13edbb6c4a194d7494640b', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Fengshen.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 218, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (220, 6, 'Crazy FaFaFa', 'crazy-fafafa-a57a8d51', 'slots', 'a57a8d5176b54d4c825bd1eee8ab34df', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Crazy-FaFaFa.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 219, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (221, 6, 'XiYangYang', 'xiyangyang-5a962d0e', 'slots', '5a962d0e31e0d4c0798db5f331327e4f', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/XiYangYang.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 220, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (222, 6, 'DiamondParty', 'diamondparty-48d598e9', 'slots', '48d598e922e8c60643218ccda302af08', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/DiamondParty.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 221, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (223, 6, 'Golden Bank', 'golden-bank-c3f86b78', 'slots', 'c3f86b78938eab1b7f34159d98796e88', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Golden-Bank.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 222, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (224, 6, 'Dragon Treasure', 'dragon-treasure-c6955c14', 'slots', 'c6955c14f6c28a6c2a0c28274fec7520', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Dragon-Treasure.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 223, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (225, 6, 'Charge Buffalo', 'charge-buffalo-984615c9', 'slots', '984615c9385c42b3dad0db4a9ef89070', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Charge-Buffalo.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 224, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (226, 6, 'Lucky Goldbricks', 'lucky-goldbricks-d84ef530', 'slots', 'd84ef530121953240116e3b2e93f6af4', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Lucky-Goldbricks.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 225, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (227, 6, 'Super Ace', 'super-ace-bdfb23c9', 'slots', 'bdfb23c974a2517198c5443adeea77a8', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Super-Ace.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 226, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (228, 6, 'Money Coming', 'money-coming-db249def', 'slots', 'db249defce63610fccabfa829a405232', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Money-Coming.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 227, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (229, 6, 'Golden Queen', 'golden-queen-8de99455', 'slots', '8de99455c2f23f6827666fd798eb80ef', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Golden-Queen.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 228, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (230, 6, 'Jungle King', 'jungle-king-4db0ec24', 'slots', '4db0ec24ff55a685573c888efed47d7f', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Jungle-King.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 229, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (231, 6, 'Monkey Party', 'monkey-party-fd369a4a', 'slots', 'fd369a4a7486ff303beea267ec5c8eff', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Monkey-Party.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 230, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (232, 6, 'Fortune Neko', 'fortune-neko-49b706cc', 'slots', '49b706ccfe7c53727ee6760cd9a8721a', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Fortune-Neko.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 231, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (233, 6, 'Book Of Mystery', 'book-of-mystery-13072a6e', 'slots', '13072a6eb2111c1b5202fe6155227e94', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Book-Of-Mystery.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 232, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (234, 6, 'Prosperitytiger', 'prosperitytiger-1d704bbb', 'slots', '1d704bbb187a113229f3fdaa3b5406fe', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Prosperitytiger.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 233, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (235, 6, 'Glamorous Girl', 'glamorous-girl-2663e14e', 'slots', '2663e14e5b455525252a25d9bd99e840', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Glamorous-Girl.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 234, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (236, 6, 'Blossom Of Wealth', 'blossom-of-wealth-ed6fbaeb', 'slots', 'ed6fbaeb7a104dd7ed96fa1683a48669', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Blossom-Of-Wealth.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 235, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (237, 6, 'Boom Fiesta', 'boom-fiesta-1ffb31ff', 'slots', '1ffb31ff605f1a7862a138f5cd712056', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Boom-Fiesta.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 236, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (238, 6, 'Big Three Dragons', 'big-three-dragons-600c338d', 'slots', '600c338d3fca2da208f1bba2c9d29059', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Big-Three-Dragons.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 237, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (239, 6, 'Mayagoldcrazy', 'mayagoldcrazy-6c8009d1', 'slots', '6c8009d165293759bb218b72ba3c380f', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Mayagoldcrazy.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 238, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (240, 6, 'Lantern Wealth', 'lantern-wealth-f2f2eae3', 'slots', 'f2f2eae301311f0320ef669b68935546', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Lantern-Wealth.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 239, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (241, 6, 'Marvelous Iv', 'marvelous-iv-126cf2bf', 'slots', '126cf2bfe8a8e606b362d23de02c0d5e', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Marvelous-Iv.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 240, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (242, 6, 'Wonder Elephant', 'wonder-elephant-540da2ba', 'slots', '540da2ba4c849fc1c315f43ae74df220', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Wonder-Elephant.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 241, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (243, 6, 'Lucky Diamond', 'lucky-diamond-6f6867ad', 'slots', '6f6867ad1956a04b174c92629cab7f54', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Lucky-Diamond.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 242, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (244, 6, 'Spindrift 2', 'spindrift-2-5dc8c7a4', 'slots', '5dc8c7a43305c3fcb43574c570d6378', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Spindrift-2.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 243, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (245, 6, 'Jungle Jungle', 'jungle-jungle-6c5fe548', 'slots', '6c5fe548bd6e09b683566298b29510ea', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Jungle-Jungle.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 244, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (246, 6, 'Dragons Gate', 'dragons-gate-feaba603', 'slots', 'feaba603992f26633116fb54562e3693', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Dragons-Gate.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 245, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (247, 6, 'Spindrift', 'spindrift-b624d191', 'slots', 'b624d1917ef5a740c151e4904a7cf0dd', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Spindrift.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 246, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (248, 6, 'Double Wilds', 'double-wilds-7bd5233c', 'slots', '7bd5233c83de0669336ee649e6c8d2b5', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Double-Wilds.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 247, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (249, 6, 'Moneybags Man', 'moneybags-man-c4fdebb2', 'slots', 'c4fdebb24ff26fffb3a65d018da8ae92', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Moneybags-Man.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 248, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (250, 6, 'Miner Babe', 'miner-babe-e705514f', 'slots', 'e705514fdd4f9bea5f82bbd0b2c0a353', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Miner-Babe.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 249, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (251, 6, 'Super Niubi Deluxe', 'super-niubi-deluxe-5d940d11', 'slots', '5d940d11c48b64ec1e6a3c8be5228250', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Super-Niubi-Deluxe.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 250, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (252, 6, 'Funky King Kong', 'funky-king-kong-cdea2d06', 'slots', 'cdea2d0670bc40309b4a9b6f942a218a', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Funky-King-Kong.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 251, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (253, 6, 'Golden Disco', 'golden-disco-dfb8a198', 'slots', 'dfb8a198ce0e821560cf543387a2acc2', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Golden-Disco.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 252, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (254, 6, 'Treasure Bowl', 'treasure-bowl-0651af3e', 'slots', '0651af3e73c7600633522ffe15cc175b', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Treasure-Bowl.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 253, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (255, 6, 'Mjolnir', 'mjolnir-e270f067', 'slots', 'e270f0674dff538b181499d18ab47845', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Mjolnir.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 254, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (256, 6, 'Pirate Treasure', 'pirate-treasure-bfb3241e', 'slots', 'bfb3241e64953f731e72bc833f2fa79a', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Pirate-Treasure.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 255, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (257, 6, 'Fortune Treasure', 'fortune-treasure-5a55a19d', 'slots', '5a55a19d9cfbead5e64b8169e96bd27a', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Fortune-Treasure.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 256, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (258, 6, 'Egypt Treasure', 'egypt-treasure-b7f39e86', 'slots', 'b7f39e861e2e02633cb5cb08958f1041', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Egypt-Treasure.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 257, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (259, 6, 'Super Niubi', 'super-niubi-4042e5d0', 'slots', '4042e5d0c777e1d3c3bd481dac0a867e', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Super-Niubi.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 258, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (260, 6, 'Dragons World', 'dragons-world-00b88680', 'slots', '00b886803f3d067f7028872468e84745', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Dragons-World.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 259, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (261, 6, 'Go Lai Fu', 'go-lai-fu-a3584394', 'slots', 'a3584394182e8abce362d90c2f048c75', 'Slot Game', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Go-Lai-Fu.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 260, 0, '2026-06-26 06:58:40', '2026-06-26 06:58:40'),
  (262, 7, 'SABA Sports', 'saba-sports-08ced9dd', 'sports', '08ced9dd788aed11ff3c7f387ae0f063', 'Sport', 'https://ossimg.tirangaagent.com/Tiranga/vendorlogo/vendorlogo_20240814202959vsy1.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 261, 8, '2026-06-26 06:58:40', '2026-07-18 07:36:51'),
  (263, 2, 'Esports', 'esports-4ee8e005', 'virtual_sports', '4ee8e0051a035b463b47c3c473ce317d', 'SportsGame', 'https://i.postimg.cc/FHHg66F4/Screenshot-2025-03-21-153241.png', NULL, 10.00, 100000.00, 0, 1, 1, 1, 0, 262, 1, '2026-06-26 06:58:40', '2026-06-26 08:37:01'),
  (264, 8, 'Bhagyathara', 'bhagyathara-1', 'slots', '1', 'lottery', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS3QD-Oy8_XcjfMm_D6--_kQ0gXCzDSZxjEEw&s', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 0, '2026-07-15 11:09:42', '2026-07-15 11:30:50'),
  (265, 8, 'Sthree Sakthi', 'sthreep-sakthi', 'slots', '2', 'lottery', 'https://img.mathrubhumi.com/view/acePublic/alias/contentid/1omugj5ir8q4ogz5xyo/0/sthree-sakthi-lottery.webp?f=3%3A2&q=0.75&w=900', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 0, '2026-07-15 11:30:29', '2026-07-15 11:30:29'),
  (266, 9, 'Cockfight', 'cockfight-c084', 'slots', '8cc99bed98c7adbe84bdaf7a8ad0c084', 'cockfighting', 'https://store-images.s-microsoft.com/image/apps.441.13510798887503449.ea1c2ebf-90f3-409c-901c-2b814aeecb2f.4e0134f0-c35b-4920-a0d0-9b2397d59b2f', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 2, '2026-07-15 11:41:26', '2026-07-18 07:50:38'),
  (267, 9, 'WCC', 'wcc-358a', 'slots', '475a85119e0133e7b790be265fa9358a', NULL, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTo1zKMuhtsXWdj2IP2oxmQ6BHvTX3ZgYo9Ew&s', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 0, '2026-07-15 11:43:53', '2026-07-15 11:43:53'),
  (268, 9, 'WGC', 'wgc-78ee', 'slots', '304947ef77b76b16f2064932d72c78ee', NULL, 'https://play-lh.googleusercontent.com/XUD4scTtRUfJc8JpS0dazSKsf4Y4jAMlvfhzA4X0ASD5oUTbnj9IFot7RzmDP8oyXA', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 0, '2026-07-15 11:45:26', '2026-07-15 11:45:26'),
  (269, 7, 'Luck Sports', 'luck-sports-c24e4', 'sports', '92b24e4c25107367a80e0fe1a97c24e4', NULL, 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/LuckySports/Lucky Sports_Logo 01.jpg', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 9, '2026-07-15 12:08:53', '2026-07-18 07:38:01'),
  (270, 8, 'Dhanalekshmi', 'dhanalekshmi', 'lottery', '3', 'lottery', 'https://images.etnownews.com/thumb/msid-153261580,updatedat-1765363887142,width-1280,height-720,resizemode-75/153261580.jpg', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 0, '2026-07-15 12:11:39', '2026-07-15 12:11:39'),
  (271, 8, 'Karunya Plus', 'karunya-plus', 'lottery', '4', NULL, 'https://images.goodreturns.in/img/2025/07/keralalotterykarunyaplus600-1752142970.jpg', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 0, '2026-07-15 13:14:33', '2026-07-15 13:14:33'),
  (272, 8, 'Suvarana Keralam', 'suvarana-keralam-5', 'slots', '5', NULL, 'https://www.thestatesman.com/wp-content/uploads/2026/04/Kerala-lottery-Suvarna-Keralam-SK-50-result-today-April-24-2026-Check-complete-list-of-winners-1024x576.webp', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 0, '2026-07-15 13:20:49', '2026-07-15 13:21:23'),
  (273, 8, 'Karunya', 'Karunya-6', 'lottery', '6', NULL, 'https://img.etimg.com/thumb/width-1200,height-1200,imgsize-622196,resizemode-75,msid-130974147/news/new-updates/kerala-lottery-result-today-karunya-kr-753-may-9-2026-rs-1-crore-first-prize-rs-25-lakh-and-rs-10-lakh-winners-check-full-list.jpg', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 0, '2026-07-15 13:31:33', '2026-07-15 13:31:33'),
  (274, 8, 'Samrudhi', 'samrudhi-7', 'lottery', '7', NULL, 'https://i.ytimg.com/vi/2LKuwIwZMyk/sddefault.jpg', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 0, '2026-07-15 13:33:17', '2026-07-15 13:33:17'),
  (275, 5, 'Aero', 'aero-98bd', 'fantasy', 'cccdf7fc199f5c5b917a741c828398bd', NULL, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWi9lhzmHHuvCenzA7b_1AF_2NuVXHZKPnEA&s', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 0, '2026-07-16 08:52:17', '2026-07-16 08:52:17'),
  (276, 6, 'Wheel', 'wheel-8c80', 'slots', '6e19e03c50f035ddd9ffd804c30f8c80', NULL, 'https://ossimg.tirangaagent.com/Tiranga/gamelogo/JILI/229.png', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 0, '2026-07-16 08:55:17', '2026-07-16 08:55:17'),
  (277, 5, ' Pool Rummy', ' pool-rummy-0b30', 'live_casino', '43e7df819bf57722a8917bb328640b30', 'poker', 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Pool-Rummy.png', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 0, '2026-07-16 11:47:47', '2026-07-16 11:47:47'),
  (278, 4, 'Lightning Roulette', 'lightning-roulete-98c7', 'slots', '4a858d6b74c05260d3ea2762838798c7', NULL, 'https://i.postimg.cc/HLRHXq7m/7611-lightning-roulette.webp', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 0, '2026-07-17 13:44:20', '2026-07-17 13:44:20'),
  (279, 4, 'Speed Roulette', 'speed-roulette-8ff6', 'slots', 'b4af506243cafae52908e8fa266f8ff6', NULL, 'https://i.postimg.cc/4yfmVQbc/speed-roulette.jpg', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 0, '2026-07-17 13:52:57', '2026-07-17 13:52:57'),
  (280, 4, 'Power Blackjack', 'power-blackjack', 'live_casino', '1d1c0d3ec98deb128bdd5acdef0f157e', 'blackjack', 'https://i.postimg.cc/VNM9VrFD/power-blackjack-pid-11.jpg', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 3, '2026-07-17 13:55:55', '2026-07-18 08:11:50'),
  (281, NULL, 'Infinite blackjack ', 'infinite-blackjack-88f4', 'slots', '58d7089aa20bce7f70e0e2ce81e888f4', NULL, 'https://i.postimg.cc/26YBzZyd/infinite-blackjack-poster-600x840.jpg', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 0, '2026-07-17 14:00:43', '2026-07-17 14:00:43'),
  (282, 4, 'Blackjack Silver ', 'blackjack-silver', 'live_casino', '8de1993b371ce298b85584d21e5d2106', 'casino', 'https://i.postimg.cc/MHmyVYM6/blackjack-silver-b.webp', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 1, '2026-07-17 14:02:03', '2026-07-18 07:40:26'),
  (283, 4, 'Immersive Roulette', 'immersive-roulette', 'live_casino', '3b43390eebe1f1a84b15f1251a253b24', NULL, 'https://i.postimg.cc/G2nmFn1L/immersive-roulette-poster-600x840.jpg', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 1, '2026-07-17 14:19:20', '2026-07-18 07:44:26'),
  (284, 4, 'Baccarat B', 'baccarat-b-ca33e1d', 'live_casino', '0ea8519b837ebd62f5a8978acca33e1d', NULL, 'https://i.postimg.cc/k4tt9PxR/baccat-b.jpg', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 0, '2026-07-17 14:20:40', '2026-07-17 14:20:40'),
  (285, 4, 'First Person Lightning Baccarat', 'first-person-lightning-baccarat', 'live_casino', 'fec1b730e804bf14bd471a1e9b82bf44', NULL, 'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/evoplay/First%20Person%20Lightning%20Baccarat.png', 96.50, 10.00, 100000.00, 0, 1, 1, 1, 0, 0, 1, '2026-07-17 14:22:18', '2026-07-18 07:45:34')
ON DUPLICATE KEY UPDATE slug = slug;

-- ---------------------------------------------------------------------------
-- Idempotent upgrades for existing databases.
--
-- `CREATE TABLE IF NOT EXISTS` above never alters a table that already exists,
-- so the full-control Bonus columns must be back-filled here. Each ADD COLUMN
-- is guarded so re-running this file on a live DB is a no-op. Requires MySQL 5.7+
-- / MariaDB 10.2+ (information_schema + prepared statements).
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

-- bonuses: widen bonus_type enum, then add the control columns.
ALTER TABLE bonuses
  MODIFY bonus_type ENUM('joining', 'deposit', 'referral', 'game', 'cashback', 'no_deposit', 'free_spins', 'loyalty', 'reload', 'manual') NOT NULL,
  MODIFY value_amount DECIMAL(18,2) NOT NULL;
CALL _dollara_add_column('bonuses', 'referrer_reward',     "referrer_reward DECIMAL(18,2) DEFAULT 0 AFTER max_bonus_cap");
CALL _dollara_add_column('bonuses', 'credit_target',       "credit_target ENUM('bonus','main') DEFAULT 'bonus' AFTER wagering_multiplier");
CALL _dollara_add_column('bonuses', 'promo_code',          "promo_code VARCHAR(40) AFTER claim_method");
CALL _dollara_add_column('bonuses', 'per_user_limit',      "per_user_limit INT AFTER promo_code");
CALL _dollara_add_column('bonuses', 'total_budget',        "total_budget DECIMAL(18,2) AFTER per_user_limit");
CALL _dollara_add_column('bonuses', 'total_awarded',       "total_awarded DECIMAL(18,2) DEFAULT 0 AFTER total_budget");
CALL _dollara_add_column('bonuses', 'total_claims',        "total_claims INT DEFAULT 0 AFTER total_awarded");
CALL _dollara_add_column('bonuses', 'bonus_validity_days', "bonus_validity_days INT DEFAULT 30 AFTER total_claims");

-- bonuses: deposit-sequence gates, player-type filter and scope. A bonus with
-- none of the is_*_deposit flags set is unrestricted; setting more than one
-- makes it fire on any of those deposit ordinals. is_new_player_only limits it
-- to accounts registered within new_player_days. Scope 'targeted' issues the
-- bonus to exactly one account (target_user_id), typically via a promo code.
CALL _dollara_add_column('bonuses', 'is_first_deposit',    "is_first_deposit BOOLEAN DEFAULT FALSE AFTER min_deposit");
CALL _dollara_add_column('bonuses', 'is_second_deposit',   "is_second_deposit BOOLEAN DEFAULT FALSE AFTER is_first_deposit");
CALL _dollara_add_column('bonuses', 'is_third_deposit',    "is_third_deposit BOOLEAN DEFAULT FALSE AFTER is_second_deposit");
CALL _dollara_add_column('bonuses', 'is_new_player_only',  "is_new_player_only BOOLEAN DEFAULT FALSE AFTER is_third_deposit");
CALL _dollara_add_column('bonuses', 'new_player_days',     "new_player_days INT DEFAULT 7 AFTER is_new_player_only");
CALL _dollara_add_column('bonuses', 'scope',               "scope ENUM('mass','targeted') DEFAULT 'mass' AFTER claim_method");
CALL _dollara_add_column('bonuses', 'target_user_id',      "target_user_id BIGINT UNSIGNED AFTER scope");

-- user_bonuses: audit + duplicate-suppression columns.
CALL _dollara_add_column('user_bonuses', 'credit_target',  "credit_target ENUM('bonus','main') DEFAULT 'bonus' AFTER wagering_completed");
CALL _dollara_add_column('user_bonuses', 'source',         "source ENUM('joining','deposit','referral','game','cashback','promo','manual') NOT NULL DEFAULT 'manual' AFTER credit_target");
CALL _dollara_add_column('user_bonuses', 'transaction_id', "transaction_id BIGINT UNSIGNED AFTER source");
CALL _dollara_add_column('user_bonuses', 'granted_by',     "granted_by BIGINT UNSIGNED AFTER transaction_id");
CALL _dollara_add_column('user_bonuses', 'notes',          "notes VARCHAR(255) AFTER granted_by");
CALL _dollara_add_column('user_bonuses', 'updated_at',     "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

-- user_bonuses: pending-reward model. 'pending' means the bonus is NOT in the
-- player's balance yet — it is a reward owed once wagering_completed reaches
-- the target, at which point it is credited to main_balance and marked
-- 'completed'.
--
-- award_mode grandfathers the old behaviour: rows written before this change
-- ('locked') were credited into bonus_balance at award time and burn down
-- wallet.wagering_balance instead. DEFAULT 'locked' is deliberate so every
-- pre-existing row keeps settling the old way; the engine writes 'pending' on
-- all new awards.
ALTER TABLE user_bonuses
  MODIFY status ENUM('pending', 'active', 'completed', 'expired', 'forfeited') DEFAULT 'pending';
CALL _dollara_add_column('user_bonuses', 'award_mode',     "award_mode ENUM('locked','pending') NOT NULL DEFAULT 'locked' AFTER credit_target");
CALL _dollara_add_column('user_bonuses', 'completed_at',   "completed_at DATETIME AFTER expires_at");

-- Per-provider wagering multipliers (risk balancing). A row here overrides
-- bonuses.wagering_multiplier for bets on that provider, so low-house-edge
-- verticals (live casino) can demand a higher turnover than slots. A bonus
-- with no rows falls back to the flat bonuses.wagering_multiplier.
CREATE TABLE IF NOT EXISTS bonus_providers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  bonus_id BIGINT UNSIGNED NOT NULL,
  provider_id BIGINT UNSIGNED NOT NULL,
  wagering_multiplier DECIMAL(6,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_bonus_providers (bonus_id, provider_id),
  FOREIGN KEY (bonus_id) REFERENCES bonuses(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES game_providers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- user_settings: referral chain.
CALL _dollara_add_column('user_settings', 'referral_code', "referral_code VARCHAR(20) AFTER agent_id");
CALL _dollara_add_column('user_settings', 'referred_by',   "referred_by BIGINT UNSIGNED AFTER referral_code");

-- game_providers: optional per-provider aggregator credentials. A vendor that
-- is integrated on its own agency account (a separate lottery provider, a
-- second aggregator) overrides the platform-wide env config here; blank
-- columns fall back to settings.GAME_PROVIDER.
CALL _dollara_add_column('game_providers', 'agency_uid',         "agency_uid VARCHAR(100) AFTER is_active");
CALL _dollara_add_column('game_providers', 'aes_secret_key',     "aes_secret_key VARCHAR(128) AFTER agency_uid");
CALL _dollara_add_column('game_providers', 'server_url',         "server_url VARCHAR(255) AFTER aes_secret_key");
CALL _dollara_add_column('game_providers', 'launch_path',        "launch_path VARCHAR(100) AFTER server_url");
CALL _dollara_add_column('game_providers', 'player_prefix',      "player_prefix VARCHAR(40) AFTER launch_path");
CALL _dollara_add_column('game_providers', 'callback_path',      "callback_path VARCHAR(100) AFTER player_prefix");
CALL _dollara_add_column('game_providers', 'currency_code',      "currency_code VARCHAR(10) AFTER callback_path");
-- Sports/lottery vendors settle long after the stake; their rounds stay
-- Pending in bet history until the result callback lands.
CALL _dollara_add_column('game_providers', 'delayed_settlement', "delayed_settlement BOOLEAN NOT NULL DEFAULT FALSE AFTER currency_code");

-- game_sessions: outstanding (unresolved) round counter drives the WAIT status.
CALL _dollara_add_column('game_sessions', 'pending_rounds', "pending_rounds INT NOT NULL DEFAULT 0 AFTER rounds_count");

-- game_rounds: per-round settlement state + the game actually played (lobby
-- launches report the specific table, not the lobby the player entered).
CALL _dollara_add_column('game_rounds', 'game_name',    "game_name VARCHAR(150) AFTER game_uid");
CALL _dollara_add_column('game_rounds', 'settle_status', "settle_status ENUM('pending','settled') NOT NULL DEFAULT 'settled' AFTER game_round");
CALL _dollara_add_column('game_rounds', 'settled_at',   "settled_at DATETIME AFTER settle_status");

DROP PROCEDURE IF EXISTS _dollara_add_column;

-- Index helper: add an index only when it is missing (idempotent re-runs).
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

-- Pending-round lookup on the result callback, and the big-wins feed.
CALL _dollara_add_index('game_rounds', 'idx_gr_settle',    'settle_status');
CALL _dollara_add_index('game_rounds', 'idx_gr_round',     'user_id, game_round');
CALL _dollara_add_index('game_rounds', 'idx_gr_win',       'win_amount, created_at');

DROP PROCEDURE IF EXISTS _dollara_add_index;

-- ---------------------------------------------------------------------------
-- Provider integration defaults. These run last because they depend on the
-- columns the migration block above guarantees exist.
-- ---------------------------------------------------------------------------

-- Stakes on these verticals are resolved by a separate result callback that
-- lands later, so their rounds must stay Pending in bet history rather than
-- reading as an instant loss. Slugs match the seeded provider list above.
UPDATE game_providers SET delayed_settlement = TRUE
WHERE slug IN ('sports', 'esports', 'India-lotto', 'odin-cockfighting');

-- Every other provider settles in-callback.
UPDATE game_providers SET delayed_settlement = FALSE
WHERE slug NOT IN ('sports', 'esports', 'India-lotto', 'odin-cockfighting');

SET FOREIGN_KEY_CHECKS = 1;
