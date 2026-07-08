-- Migration: Webhook data channel (Phase 1)
-- Run directly against an existing master DB:
--   mysql -u root dollara_master < database/migrations/001_webhook_data_channel.sql
--
-- Adds the two tables that secure the Super Admin -> Product signed-webhook data
-- channel. Both are new tables (no column changes to existing tables), so this is
-- additive and safe to re-run (IF NOT EXISTS).

SET NAMES utf8mb4;

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
