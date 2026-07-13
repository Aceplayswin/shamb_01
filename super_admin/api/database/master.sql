-- Super Admin Platform - Master / Control-Plane MySQL Schema
-- Holds the catalog of products (tenants), their URLs, isolated database
-- connection details, and the platform Super Admin accounts.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(63) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  api_key VARCHAR(64) UNIQUE,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Theme selection moved to the product_themes table (below). For databases that
-- still have the old columns, drop them:
--   ALTER TABLE products DROP COLUMN available_themes, DROP COLUMN active_theme;

-- One row per theme per product. The catalog of valid theme keys lives in
-- tenants/themes.py; each product gets a row for every catalog theme (auto-seeded
-- on create). Exactly one row per product has is_active = 1 (the live theme the
-- product frontend renders); the rest are inactive. is_enabled lets an operator
-- hide a theme from activation without deleting the row.
CREATE TABLE IF NOT EXISTS product_themes (
  id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id INT(11) NOT NULL,
  theme_key VARCHAR(63) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_product_theme (product_id, theme_key),
  INDEX idx_product_themes_active (product_id, is_active),
  CONSTRAINT fk_product_themes_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS urls (
  id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id INT(11) NOT NULL UNIQUE,
  fe_url VARCHAR(500) NOT NULL DEFAULT '',
  be_url VARCHAR(500) NOT NULL DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_urls_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS branding (
  id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id INT(11) NOT NULL UNIQUE,
  product_name VARCHAR(150) NOT NULL,
  logo_url VARCHAR(500) NOT NULL DEFAULT '',
  favicon_url VARCHAR(500) NOT NULL DEFAULT '',
  theme_color VARCHAR(20) NOT NULL DEFAULT '#ff9800',
  secondary_color VARCHAR(20) NOT NULL DEFAULT '#a78bfa',
  splash_url VARCHAR(500) NOT NULL DEFAULT '',
  app_icon_url VARCHAR(500) NOT NULL DEFAULT '',
  support_email VARCHAR(150) NOT NULL DEFAULT '',
  support_phone VARCHAR(50) NOT NULL DEFAULT '',
  terms_url VARCHAR(500) NOT NULL DEFAULT '',
  privacy_url VARCHAR(500) NOT NULL DEFAULT '',
  extra JSON,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_branding_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `databases` (
  id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id INT(11) NOT NULL UNIQUE,
  db_name VARCHAR(120) NOT NULL,
  db_host VARCHAR(255) NOT NULL DEFAULT 'localhost',
  db_port VARCHAR(10) NOT NULL DEFAULT '3306',
  db_user VARCHAR(120) NOT NULL,
  db_password VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_db_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- RSA key pair securing the Super Admin -> Product webhook data channel.
-- Super Admin keeps private_pem and signs every data request to a product; the
-- product holds public_pem and verifies those requests before returning tenant
-- data. One active row per product (is_active = 1); rotated keys are retained
-- (is_active = 0) for audit.
CREATE TABLE IF NOT EXISTS product_credentials (
  id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id INT(11) NOT NULL,
  key_id VARCHAR(64) NOT NULL UNIQUE,
  private_pem TEXT NOT NULL,
  public_pem TEXT NOT NULL,
  fingerprint VARCHAR(40) NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT 1,
  delivered_to_product_at DATETIME,
  last_used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  rotated_at DATETIME,
  INDEX idx_credentials_product_active (product_id, is_active),
  CONSTRAINT fk_credentials_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Audit log of signed data requests Super Admin sent to a product webhook.
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id INT(11) NOT NULL,
  credential_id INT(11),
  resource VARCHAR(100) NOT NULL,
  request_method VARCHAR(10) NOT NULL DEFAULT 'GET',
  request_path VARCHAR(500) NOT NULL DEFAULT '',
  nonce VARCHAR(64) NOT NULL DEFAULT '',
  status ENUM('pending', 'success', 'failed') NOT NULL DEFAULT 'pending',
  http_status INT(11),
  duration_ms INT(11),
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_deliveries_product_created (product_id, created_at),
  INDEX idx_deliveries_status (status),
  CONSTRAINT fk_deliveries_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT fk_deliveries_credential FOREIGN KEY (credential_id)
    REFERENCES product_credentials (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_sessions (
  id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT(11) NOT NULL,
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
