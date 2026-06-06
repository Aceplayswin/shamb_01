-- DOLLARA SaaS Platform - Master / Control-Plane MySQL Schema
-- Holds the catalog of products (tenants), their domains, isolated database
-- connection details, white-label branding, subscriptions/licenses, and the
-- platform Super Admin accounts. This database is completely separate from any
-- tenant database (see database/init.sql for the per-tenant schema).

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(63) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS domains (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  host VARCHAR(255) NOT NULL UNIQUE,
  is_primary BOOLEAN NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_domains_product (product_id),
  CONSTRAINT fk_domains_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tenant_databases (
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
  CONSTRAINT fk_tenant_db_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS branding (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL UNIQUE,
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

CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL UNIQUE,
  plan VARCHAR(50) NOT NULL DEFAULT 'standard',
  status ENUM('trial', 'active', 'past_due', 'cancelled') NOT NULL DEFAULT 'trial',
  started_at DATETIME,
  expires_at DATETIME,
  CONSTRAINT fk_subscriptions_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS licenses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  `key` VARCHAR(120) NOT NULL UNIQUE,
  status ENUM('active', 'revoked', 'expired') NOT NULL DEFAULT 'active',
  issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  INDEX idx_licenses_product (product_id),
  CONSTRAINT fk_licenses_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS super_admin_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
