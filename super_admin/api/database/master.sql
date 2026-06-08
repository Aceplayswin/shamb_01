-- Super Admin Platform - Master / Control-Plane MySQL Schema
-- Holds the catalog of products (tenants), their URLs, isolated database
-- connection details, and the platform Super Admin accounts.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(63) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  -- Which full UI theme/skin the product's frontend renders. The catalog of
  -- valid keys is code-defined in dollara/web (src/themes) and mirrored in the
  -- super_admin API (AVAILABLE_THEMES in tenants/views.py). Keep them in sync.
  active_theme VARCHAR(63) NOT NULL DEFAULT 'theme1',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS urls (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL UNIQUE,
  fe_url VARCHAR(500) NOT NULL DEFAULT '',
  be_url VARCHAR(500) NOT NULL DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_urls_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `databases` (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL UNIQUE,
  db_name VARCHAR(120) NOT NULL,
  db_host VARCHAR(255) NOT NULL DEFAULT 'localhost',
  db_port VARCHAR(10) NOT NULL DEFAULT '3306',
  db_user VARCHAR(120) NOT NULL,
  db_password VARCHAR(255) NOT NULL DEFAULT '',
  is_provisioned BOOLEAN NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_db_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  session_token VARCHAR(500) NOT NULL UNIQUE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_type VARCHAR(50),
  country_code VARCHAR(10),
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_active (is_active),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Default Super Admin (login: superadmin / Admin@123)
INSERT INTO users (username, email, password_hash, is_active)
VALUES (
  'superadmin',
  'superadmin@platform.local',
  '$2b$12$C9ZVRYJkjISgdOHdF/wTIeoWNhC80WWiYrvlJenWGI9pAxSjFqcxm',
  1
)
ON DUPLICATE KEY UPDATE username = username;

-- ── Idempotent migrations for already-provisioned databases ──
-- The CREATE TABLE above only runs on fresh installs; existing master DBs need
-- the column added without erroring if it is already present. This guarded
-- prepared statement is safe to re-run.
SET @add_active_theme := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE products ADD COLUMN active_theme VARCHAR(63) NOT NULL DEFAULT ''theme1'' AFTER status',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'active_theme'
);
PREPARE stmt FROM @add_active_theme;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
