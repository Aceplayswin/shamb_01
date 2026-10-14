-- Clean seed dump for mahakalworld
-- Keeps: schema + game catalog (games, game_providers, game_categories),
--        platform_settings, and admin user only.
-- Stripped: transactional / user / affiliate / session / audit seed data.
--
/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-12.0.2-MariaDB, for Win64 (AMD64)
--
-- Host: 187.53.132.69    Database: mahakalworld
-- ------------------------------------------------------
-- Server version	8.4.11-0ubuntu0.26.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `admin_audit_logs`
--

DROP TABLE IF EXISTS `admin_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `admin_id` bigint unsigned NOT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` bigint unsigned DEFAULT NULL,
  `before_value` json DEFAULT NULL,
  `after_value` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `admin_audit_logs_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_audit_logs`
--

LOCK TABLES `admin_audit_logs` WRITE;
/*!40000 ALTER TABLE `admin_audit_logs` DISABLE KEYS */;
set autocommit=0;

/*!40000 ALTER TABLE `admin_audit_logs` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `admin_manager_notes`
--

DROP TABLE IF EXISTS `admin_manager_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_manager_notes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `note` text NOT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_amn_user` (`user_id`),
  CONSTRAINT `admin_manager_notes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_manager_notes`
--

LOCK TABLES `admin_manager_notes` WRITE;
/*!40000 ALTER TABLE `admin_manager_notes` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `admin_manager_notes` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `affiliate_api_keys`
--

DROP TABLE IF EXISTS `affiliate_api_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `affiliate_api_keys` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `affiliate_id` bigint unsigned NOT NULL,
  `key_id` varchar(64) NOT NULL,
  `public_pem` text NOT NULL,
  `fingerprint` varchar(64) DEFAULT NULL,
  `status` enum('active','rotating','revoked') DEFAULT 'active',
  `last_used_at` datetime DEFAULT NULL,
  `grace_until` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_aak_key` (`key_id`),
  KEY `idx_aak_aff` (`affiliate_id`),
  CONSTRAINT `affiliate_api_keys_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affiliate_api_keys`
--

LOCK TABLES `affiliate_api_keys` WRITE;
/*!40000 ALTER TABLE `affiliate_api_keys` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `affiliate_api_keys` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `affiliate_api_logs`
--

DROP TABLE IF EXISTS `affiliate_api_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `affiliate_api_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `affiliate_id` bigint unsigned DEFAULT NULL,
  `key_id` varchar(64) DEFAULT NULL,
  `direction` enum('inbound','outbound') DEFAULT 'inbound',
  `endpoint` varchar(255) DEFAULT NULL,
  `method` varchar(10) DEFAULT NULL,
  `status_code` int DEFAULT NULL,
  `signature_result` enum('valid','invalid','missing','replay','expired','revoked') DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_aal_aff_created` (`affiliate_id`,`created_at`),
  CONSTRAINT `affiliate_api_logs_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affiliate_api_logs`
--

LOCK TABLES `affiliate_api_logs` WRITE;
/*!40000 ALTER TABLE `affiliate_api_logs` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `affiliate_api_logs` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `affiliate_api_nonces`
--

DROP TABLE IF EXISTS `affiliate_api_nonces`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `affiliate_api_nonces` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `key_id` varchar(64) NOT NULL,
  `nonce` varchar(96) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_aan_key_nonce` (`key_id`,`nonce`),
  KEY `idx_aan_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affiliate_api_nonces`
--

LOCK TABLES `affiliate_api_nonces` WRITE;
/*!40000 ALTER TABLE `affiliate_api_nonces` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `affiliate_api_nonces` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `affiliate_audit_logs`
--

DROP TABLE IF EXISTS `affiliate_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `affiliate_audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `affiliate_id` bigint unsigned DEFAULT NULL,
  `actor_type` enum('affiliate','staff','system') NOT NULL,
  `actor_id` bigint unsigned DEFAULT NULL,
  `actor_label` varchar(80) DEFAULT NULL,
  `action` varchar(120) NOT NULL,
  `target` varchar(160) DEFAULT NULL,
  `before_value` json DEFAULT NULL,
  `after_value` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_aal_aff_created` (`affiliate_id`,`created_at`),
  KEY `idx_aal_created` (`created_at`),
  CONSTRAINT `affiliate_audit_logs_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affiliate_audit_logs`
--

LOCK TABLES `affiliate_audit_logs` WRITE;
/*!40000 ALTER TABLE `affiliate_audit_logs` DISABLE KEYS */;
set autocommit=0;

/*!40000 ALTER TABLE `affiliate_audit_logs` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `affiliate_clicks`
--

DROP TABLE IF EXISTS `affiliate_clicks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `affiliate_clicks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `affiliate_id` bigint unsigned NOT NULL,
  `link_id` bigint unsigned DEFAULT NULL,
  `sub_id` varchar(60) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `referrer_url` varchar(500) DEFAULT NULL,
  `country_code` char(2) DEFAULT NULL,
  `converted` tinyint(1) DEFAULT '0',
  `converted_user_id` bigint unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_afc_aff_created` (`affiliate_id`,`created_at`),
  KEY `idx_afc_link_created` (`link_id`,`created_at`),
  KEY `idx_afc_ip_created` (`ip_address`,`created_at`),
  CONSTRAINT `affiliate_clicks_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `affiliate_clicks_ibfk_2` FOREIGN KEY (`link_id`) REFERENCES `affiliate_links` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affiliate_clicks`
--

LOCK TABLES `affiliate_clicks` WRITE;
/*!40000 ALTER TABLE `affiliate_clicks` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `affiliate_clicks` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `affiliate_commission_ledger`
--

DROP TABLE IF EXISTS `affiliate_commission_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `affiliate_commission_ledger` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `affiliate_id` bigint unsigned NOT NULL,
  `referral_id` bigint unsigned DEFAULT NULL,
  `source_affiliate_id` bigint unsigned DEFAULT NULL,
  `entry_type` enum('revenue_share','cpa','override','adjustment','clawback') NOT NULL,
  `base_kind` enum('ngr','ftd','network_commission','manual') NOT NULL,
  `base_amount` decimal(18,2) DEFAULT '0.00',
  `rate` decimal(6,2) DEFAULT '0.00',
  `amount` decimal(18,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'INR',
  `status` enum('pending','approved','paid','rejected','clawed_back') DEFAULT 'pending',
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `payout_id` bigint unsigned DEFAULT NULL,
  `run_id` bigint unsigned DEFAULT NULL,
  `dedupe_key` varchar(120) NOT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_alg_dedupe` (`affiliate_id`,`dedupe_key`),
  KEY `idx_alg_aff_status` (`affiliate_id`,`status`),
  KEY `idx_alg_payout` (`payout_id`),
  KEY `idx_alg_period` (`period_start`),
  CONSTRAINT `affiliate_commission_ledger_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affiliate_commission_ledger`
--

LOCK TABLES `affiliate_commission_ledger` WRITE;
/*!40000 ALTER TABLE `affiliate_commission_ledger` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `affiliate_commission_ledger` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `affiliate_commission_runs`
--

DROP TABLE IF EXISTS `affiliate_commission_runs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `affiliate_commission_runs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `period_start` date DEFAULT NULL,
  `period_end` date DEFAULT NULL,
  `status` enum('running','completed','failed') DEFAULT 'running',
  `trigger_source` enum('cron','admin') DEFAULT 'cron',
  `triggered_by` bigint unsigned DEFAULT NULL,
  `entries_written` int DEFAULT '0',
  `entries_skipped` int DEFAULT '0',
  `entries_approved` int DEFAULT '0',
  `total_amount` decimal(18,2) DEFAULT '0.00',
  `error` text,
  `started_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `finished_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_acr_started` (`started_at`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affiliate_commission_runs`
--

LOCK TABLES `affiliate_commission_runs` WRITE;
/*!40000 ALTER TABLE `affiliate_commission_runs` DISABLE KEYS */;
set autocommit=0;

/*!40000 ALTER TABLE `affiliate_commission_runs` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `affiliate_creatives`
--

DROP TABLE IF EXISTS `affiliate_creatives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `affiliate_creatives` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(150) NOT NULL,
  `asset_type` enum('banner','logo','video') DEFAULT 'banner',
  `file_url` varchar(500) NOT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `dimensions` varchar(20) DEFAULT NULL,
  `size_label` varchar(40) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affiliate_creatives`
--

LOCK TABLES `affiliate_creatives` WRITE;
/*!40000 ALTER TABLE `affiliate_creatives` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `affiliate_creatives` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `affiliate_fraud_flags`
--

DROP TABLE IF EXISTS `affiliate_fraud_flags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `affiliate_fraud_flags` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `affiliate_id` bigint unsigned NOT NULL,
  `referral_id` bigint unsigned DEFAULT NULL,
  `reason` varchar(255) NOT NULL,
  `rule_key` varchar(60) DEFAULT NULL,
  `risk_level` enum('low','medium','high','critical') DEFAULT 'medium',
  `status` enum('open','dismissed','actioned') DEFAULT 'open',
  `metadata` json DEFAULT NULL,
  `resolved_by` bigint unsigned DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_aff_flag_aff` (`affiliate_id`),
  KEY `idx_aff_flag_status` (`status`),
  CONSTRAINT `affiliate_fraud_flags_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affiliate_fraud_flags`
--

LOCK TABLES `affiliate_fraud_flags` WRITE;
/*!40000 ALTER TABLE `affiliate_fraud_flags` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `affiliate_fraud_flags` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `affiliate_kyc_docs`
--

DROP TABLE IF EXISTS `affiliate_kyc_docs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `affiliate_kyc_docs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `affiliate_id` bigint unsigned NOT NULL,
  `document_type` varchar(40) NOT NULL,
  `file_url` varchar(500) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_affiliate_kyc_affiliate` (`affiliate_id`),
  CONSTRAINT `affiliate_kyc_docs_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affiliate_kyc_docs`
--

LOCK TABLES `affiliate_kyc_docs` WRITE;
/*!40000 ALTER TABLE `affiliate_kyc_docs` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `affiliate_kyc_docs` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `affiliate_kyc_documents`
--

DROP TABLE IF EXISTS `affiliate_kyc_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `affiliate_kyc_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `affiliate_id` bigint unsigned NOT NULL,
  `document_type` enum('id_proof','address_proof','company_registration','tax_certificate','bank_proof','selfie') NOT NULL,
  `file_url` varchar(500) DEFAULT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `rejection_reason` text,
  `reviewed_by` bigint unsigned DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_akd_aff` (`affiliate_id`),
  CONSTRAINT `affiliate_kyc_documents_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affiliate_kyc_documents`
--

LOCK TABLES `affiliate_kyc_documents` WRITE;
/*!40000 ALTER TABLE `affiliate_kyc_documents` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `affiliate_kyc_documents` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `affiliate_links`
--

DROP TABLE IF EXISTS `affiliate_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `affiliate_links` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `affiliate_id` bigint unsigned NOT NULL,
  `code` varchar(32) NOT NULL,
  `name` varchar(150) NOT NULL,
  `sub_id` varchar(80) DEFAULT NULL,
  `target_path` varchar(255) DEFAULT '/',
  `is_active` tinyint(1) DEFAULT '1',
  `clicks_count` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `clicks` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_afl_code` (`code`),
  KEY `idx_afl_aff` (`affiliate_id`),
  KEY `idx_afl_aff_active` (`affiliate_id`,`is_active`),
  CONSTRAINT `affiliate_links_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affiliate_links`
--

LOCK TABLES `affiliate_links` WRITE;
/*!40000 ALTER TABLE `affiliate_links` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `affiliate_links` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `affiliate_login_challenges`
--

DROP TABLE IF EXISTS `affiliate_login_challenges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `affiliate_login_challenges` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `affiliate_id` bigint unsigned NOT NULL,
  `challenge_token` varchar(64) NOT NULL,
  `purpose` enum('2fa','reset') NOT NULL,
  `attempts` int DEFAULT '0',
  `expires_at` datetime NOT NULL,
  `consumed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_alc_token` (`challenge_token`),
  KEY `idx_alc_aff` (`affiliate_id`),
  CONSTRAINT `affiliate_login_challenges_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affiliate_login_challenges`
--

LOCK TABLES `affiliate_login_challenges` WRITE;
/*!40000 ALTER TABLE `affiliate_login_challenges` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `affiliate_login_challenges` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `affiliate_notifications`
--

DROP TABLE IF EXISTS `affiliate_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `affiliate_notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `affiliate_id` bigint unsigned NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_affiliate_notifs_affiliate` (`affiliate_id`,`is_read`),
  CONSTRAINT `affiliate_notifications_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affiliate_notifications`
--

LOCK TABLES `affiliate_notifications` WRITE;
/*!40000 ALTER TABLE `affiliate_notifications` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `affiliate_notifications` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `affiliate_payout_methods`
--

DROP TABLE IF EXISTS `affiliate_payout_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `affiliate_payout_methods` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `affiliate_id` bigint unsigned NOT NULL,
  `method_type` enum('bank','upi','crypto') NOT NULL,
  `label` varchar(100) DEFAULT NULL,
  `details` json DEFAULT NULL,
  `masked_details` varchar(120) DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `is_verified` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_apm_aff` (`affiliate_id`),
  CONSTRAINT `affiliate_payout_methods_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affiliate_payout_methods`
--

LOCK TABLES `affiliate_payout_methods` WRITE;
/*!40000 ALTER TABLE `affiliate_payout_methods` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `affiliate_payout_methods` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `affiliate_payouts`
--

DROP TABLE IF EXISTS `affiliate_payouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `affiliate_payouts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `affiliate_id` bigint unsigned NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'INR',
  `method_id` bigint unsigned DEFAULT NULL,
  `method_label` varchar(120) DEFAULT NULL,
  `method_details` varchar(255) DEFAULT NULL,
  `status` enum('requested','pending','approved','paid','rejected') NOT NULL DEFAULT 'pending',
  `reference` varchar(120) DEFAULT NULL,
  `rejection_reason` varchar(500) DEFAULT NULL,
  `requested_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `processed_at` datetime DEFAULT NULL,
  `processed_by` bigint unsigned DEFAULT NULL,
  `notes` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `payout_method_id` bigint unsigned DEFAULT NULL,
  `method` varchar(120) DEFAULT NULL,
  `note` text,
  `reviewed_by` bigint unsigned DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_afp_aff` (`affiliate_id`),
  KEY `idx_afp_status` (`status`),
  CONSTRAINT `affiliate_payouts_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affiliate_payouts`
--

LOCK TABLES `affiliate_payouts` WRITE;
/*!40000 ALTER TABLE `affiliate_payouts` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `affiliate_payouts` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `affiliate_referrals`
--

DROP TABLE IF EXISTS `affiliate_referrals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `affiliate_referrals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `affiliate_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `link_id` bigint unsigned DEFAULT NULL,
  `click_id` bigint unsigned DEFAULT NULL,
  `sub_id` varchar(60) DEFAULT NULL,
  `attributed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `first_deposit_at` datetime DEFAULT NULL,
  `first_deposit_amount` decimal(18,2) DEFAULT '0.00',
  `first_deposit_tx_id` bigint unsigned DEFAULT NULL,
  `deposit_count` int DEFAULT '0',
  `lifetime_deposits` decimal(18,2) DEFAULT '0.00',
  `lifetime_ngr` decimal(18,2) DEFAULT '0.00',
  `lifetime_commission` decimal(18,2) DEFAULT '0.00',
  `cpa_paid` tinyint(1) DEFAULT '0',
  -- Stamped once, when this player's deposits meet the affiliate's minimum
  -- deposit, redeposit count, and qualification window. Commission waits for it.
  `qualified_at` datetime DEFAULT NULL,
  `status` enum('active','dormant','blocked') DEFAULT 'active',
  `last_active_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_afr_user` (`user_id`),
  KEY `idx_afr_aff` (`affiliate_id`),
  KEY `idx_afr_aff_ftd` (`affiliate_id`,`first_deposit_at`),
  CONSTRAINT `affiliate_referrals_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `affiliate_referrals_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affiliate_referrals`
--

LOCK TABLES `affiliate_referrals` WRITE;
/*!40000 ALTER TABLE `affiliate_referrals` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `affiliate_referrals` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `affiliate_support_tickets`
--

DROP TABLE IF EXISTS `affiliate_support_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `affiliate_support_tickets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `affiliate_id` bigint unsigned NOT NULL,
  `subject` varchar(255) NOT NULL,
  `category` enum('payout','commission','tracking','account','api','other') DEFAULT 'other',
  `priority` enum('low','normal','high') DEFAULT 'normal',
  `status` enum('open','in_progress','pending_affiliate','resolved','closed') DEFAULT 'open',
  `assigned_to` bigint unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `message` text,
  `message_count` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_ast_aff` (`affiliate_id`),
  KEY `idx_ast_status` (`status`),
  CONSTRAINT `affiliate_support_tickets_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affiliate_support_tickets`
--

LOCK TABLES `affiliate_support_tickets` WRITE;
/*!40000 ALTER TABLE `affiliate_support_tickets` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `affiliate_support_tickets` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `affiliate_ticket_messages`
--

DROP TABLE IF EXISTS `affiliate_ticket_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `affiliate_ticket_messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ticket_id` bigint unsigned NOT NULL,
  `sender_type` enum('affiliate','staff','system') NOT NULL,
  `sender_id` bigint unsigned DEFAULT NULL,
  `message` text NOT NULL,
  `is_internal` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_atm_ticket` (`ticket_id`),
  CONSTRAINT `affiliate_ticket_messages_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `affiliate_support_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affiliate_ticket_messages`
--

LOCK TABLES `affiliate_ticket_messages` WRITE;
/*!40000 ALTER TABLE `affiliate_ticket_messages` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `affiliate_ticket_messages` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `affiliates`
--

DROP TABLE IF EXISTS `affiliates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `affiliates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `username` varchar(50) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `company_name` varchar(150) DEFAULT NULL,
  `commission_tier` int DEFAULT '1',
  `tier_label` varchar(20) DEFAULT 'Bronze',
  `commission_type` enum('revenue_share','cpa','hybrid') DEFAULT 'revenue_share',
  `commission_rate` decimal(5,2) DEFAULT '0.00',
  `cpa_amount` decimal(18,2) DEFAULT '0.00',
  `hybrid_cpa_days` int DEFAULT '0',
  `override_rate` decimal(5,2) DEFAULT '0.00',
  `parent_affiliate_id` bigint unsigned DEFAULT NULL,
  `total_referrals` int DEFAULT '0',
  `total_commission` decimal(18,2) DEFAULT '0.00',
  `payout_threshold` decimal(18,2) DEFAULT '0.00',
  -- 0 inherits the programme default. Commission is paid for a player only
  -- after deposits reach min_deposit across min_redeposits deposits inside
  -- this many days of signup.
  `min_deposit` decimal(18,2) DEFAULT '0.00',
  `min_redeposits` int DEFAULT '0',
  `qualification_period_days` int DEFAULT '0',
  `pending_commission` decimal(18,2) DEFAULT '0.00',
  `approved_commission` decimal(18,2) DEFAULT '0.00',
  `paid_commission` decimal(18,2) DEFAULT '0.00',
  `ngr_carry_forward` decimal(18,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `status` enum('pending','info_requested','approved','rejected','suspended') DEFAULT 'pending',
  `two_factor_enabled` tinyint(1) DEFAULT '0',
  `two_factor_secret` varchar(255) DEFAULT NULL,
  `two_factor_confirmed_at` datetime DEFAULT NULL,
  `kyc_status` enum('none','pending','verified','rejected') DEFAULT 'none',
  `onboarding_complete` tinyint(1) DEFAULT '0',
  `terms_accepted_at` datetime DEFAULT NULL,
  `timezone` varchar(64) DEFAULT 'Asia/Kolkata',
  `currency` varchar(10) DEFAULT 'INR',
  `notification_prefs` json DEFAULT NULL,
  `webhook_url` varchar(500) DEFAULT NULL,
  `traffic_source` varchar(60) DEFAULT NULL,
  `expected_volume` varchar(40) DEFAULT NULL,
  `payment_preference` varchar(40) DEFAULT NULL,
  `application_notes` text,
  `rejection_reason` varchar(500) DEFAULT NULL,
  `applied_at` datetime DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  -- Most recently issued login token id; a newer login invalidates older sessions.
  `active_session_id` varchar(64) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `website` varchar(255) DEFAULT NULL,
  `notes` text,
  `total_payout` decimal(18,2) NOT NULL DEFAULT '0.00',
  `reviewed_by` bigint unsigned DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `onboarding_terms_at` datetime DEFAULT NULL,
  `onboarding_payout_at` datetime DEFAULT NULL,
  `onboarding_kyc_at` datetime DEFAULT NULL,
  `onboarding_complete_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_aff_status` (`status`),
  KEY `idx_aff_parent` (`parent_affiliate_id`),
  KEY `idx_aff_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affiliates`
--

LOCK TABLES `affiliates` WRITE;
/*!40000 ALTER TABLE `affiliates` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `affiliates` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `agent_audit_logs`
--

DROP TABLE IF EXISTS `agent_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `agent_audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `agent_id` bigint unsigned DEFAULT NULL,
  `actor_id` bigint unsigned DEFAULT NULL,
  `actor_label` varchar(100) DEFAULT NULL,
  `action` varchar(60) NOT NULL,
  `target_type` enum('agent','player','market','settlement','session') DEFAULT NULL,
  `target_id` bigint unsigned DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_aal_agent` (`agent_id`,`created_at`),
  KEY `idx_aal_action` (`action`),
  CONSTRAINT `fk_aal_agent` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agent_audit_logs`
--

LOCK TABLES `agent_audit_logs` WRITE;
/*!40000 ALTER TABLE `agent_audit_logs` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `agent_audit_logs` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `agent_credit_entries`
--

DROP TABLE IF EXISTS `agent_credit_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `agent_credit_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `agent_id` bigint unsigned NOT NULL,
  `kind` enum('credit','debit','settlement') NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `balance_after` decimal(18,2) DEFAULT NULL,
  `note` text,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_agent_credit_agent` (`agent_id`),
  KEY `idx_agent_credit_created` (`created_at`),
  CONSTRAINT `agent_credit_entries_ibfk_1` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agent_credit_entries`
--

LOCK TABLES `agent_credit_entries` WRITE;
/*!40000 ALTER TABLE `agent_credit_entries` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `agent_credit_entries` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `agent_settlements`
--

DROP TABLE IF EXISTS `agent_settlements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `agent_settlements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `agent_id` bigint unsigned NOT NULL,
  `counterparty_type` enum('agent','player') NOT NULL,
  `counterparty_id` bigint unsigned NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `pl_before` decimal(18,2) DEFAULT '0.00',
  `pl_after` decimal(18,2) DEFAULT '0.00',
  `period_start` date DEFAULT NULL,
  `period_end` date DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `settled_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_as_agent` (`agent_id`,`created_at`),
  KEY `idx_as_counterparty` (`counterparty_type`,`counterparty_id`),
  CONSTRAINT `agent_settlements_ibfk_1` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agent_settlements`
--

LOCK TABLES `agent_settlements` WRITE;
/*!40000 ALTER TABLE `agent_settlements` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `agent_settlements` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `agent_transfers`
--

DROP TABLE IF EXISTS `agent_transfers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `agent_transfers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `agent_id` bigint unsigned NOT NULL,
  `counterparty_type` enum('agent','player') NOT NULL,
  `counterparty_id` bigint unsigned NOT NULL,
  `direction` enum('down','up') NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `agent_balance_after` decimal(18,2) DEFAULT NULL,
  `counterparty_balance_after` decimal(18,2) DEFAULT NULL,
  `remark` varchar(255) DEFAULT NULL,
  `performed_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_at_agent` (`agent_id`,`created_at`),
  KEY `idx_at_counterparty` (`counterparty_type`,`counterparty_id`,`created_at`),
  CONSTRAINT `agent_transfers_ibfk_1` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agent_transfers`
--

LOCK TABLES `agent_transfers` WRITE;
/*!40000 ALTER TABLE `agent_transfers` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `agent_transfers` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `agents`
--

DROP TABLE IF EXISTS `agents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `agents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `code` varchar(20) NOT NULL,
  `username` varchar(50) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `parent_agent_id` bigint unsigned DEFAULT NULL,
  `level` enum('super_admin','admin','super_master','master','agent') NOT NULL DEFAULT 'agent',
  `depth` int NOT NULL DEFAULT '1',
  `tree_path` varchar(255) DEFAULT NULL,
  `commission_rate` decimal(5,2) DEFAULT '10.00',
  `commission_type` enum('revenue_share','cpa','hybrid') DEFAULT 'revenue_share',
  `credit_reference` decimal(18,2) DEFAULT '0.00',
  `balance` decimal(18,2) DEFAULT '0.00',
  `exposure` decimal(18,2) DEFAULT '0.00',
  `partnership` decimal(5,2) DEFAULT '0.00',
  `total_players` int DEFAULT '0',
  `total_commission` decimal(18,2) DEFAULT '0.00',
  `settled_pl` decimal(18,2) DEFAULT '0.00',
  `unsettled_pl` decimal(18,2) DEFAULT '0.00',
  `pending_commission` decimal(18,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `status` enum('pending','info_requested','active','approved','rejected','suspended','locked','closed') NOT NULL DEFAULT 'approved',
  `bet_locked` tinyint(1) DEFAULT '0',
  `user_locked` tinyint(1) DEFAULT '0',
  `must_change_password` tinyint(1) DEFAULT '0',
  `timezone` varchar(64) DEFAULT 'Asia/Kolkata',
  `currency` varchar(10) DEFAULT 'INR',
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `company_name` varchar(150) DEFAULT NULL,
  `market_region` varchar(80) DEFAULT NULL,
  `expected_volume` varchar(40) DEFAULT NULL,
  `experience` varchar(40) DEFAULT NULL,
  `application_notes` text,
  `requested_parent_code` varchar(20) DEFAULT NULL,
  `rejection_reason` varchar(500) DEFAULT NULL,
  `applied_at` datetime DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `approved_by` bigint unsigned DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `last_login_ip` varchar(45) DEFAULT NULL,
  -- Most recently issued login token id; a newer login invalidates older sessions.
  `active_session_id` varchar(64) DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `credit_limit` decimal(18,2) NOT NULL DEFAULT '0.00',
  `credit_balance` decimal(18,2) NOT NULL DEFAULT '0.00',
  `notes` text,
  `reviewed_by` bigint unsigned DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_agents_parent` (`parent_agent_id`),
  KEY `idx_agents_path` (`tree_path`),
  KEY `idx_agents_status` (`status`),
  KEY `idx_agents_email` (`contact_email`),
  KEY `idx_agents_requested_parent` (`requested_parent_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agents`
--

LOCK TABLES `agents` WRITE;
/*!40000 ALTER TABLE `agents` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `agents` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `ai_call_logs`
--

DROP TABLE IF EXISTS `ai_call_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_call_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `voice_executive_id` varchar(50) DEFAULT NULL,
  `duration_seconds` int DEFAULT NULL,
  `recording_url` varchar(500) DEFAULT NULL,
  `transcript` text,
  `deposit_intent` tinyint(1) DEFAULT '0',
  `deposit_amount` decimal(18,2) DEFAULT NULL,
  `status` enum('completed','failed','escalated') DEFAULT 'completed',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `ai_call_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_call_logs`
--

LOCK TABLES `ai_call_logs` WRITE;
/*!40000 ALTER TABLE `ai_call_logs` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `ai_call_logs` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `backoffice_group_members`
--

DROP TABLE IF EXISTS `backoffice_group_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `backoffice_group_members` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `group_id` bigint unsigned NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bgm` (`user_id`),
  KEY `fk_bgm_group` (`group_id`),
  CONSTRAINT `fk_bgm_group` FOREIGN KEY (`group_id`) REFERENCES `backoffice_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bgm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `backoffice_group_members`
--

LOCK TABLES `backoffice_group_members` WRITE;
/*!40000 ALTER TABLE `backoffice_group_members` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `backoffice_group_members` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `backoffice_groups`
--

DROP TABLE IF EXISTS `backoffice_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `backoffice_groups` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) DEFAULT NULL,
  `access_level` enum('full','elevated','standard','readonly') NOT NULL DEFAULT 'standard',
  `description` text,
  `permissions` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `backoffice_groups`
--

LOCK TABLES `backoffice_groups` WRITE;
/*!40000 ALTER TABLE `backoffice_groups` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `backoffice_groups` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `bank_accounts`
--

DROP TABLE IF EXISTS `bank_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bank_accounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `account_holder_name` varchar(100) NOT NULL,
  `account_number` varchar(50) NOT NULL,
  `ifsc_code` varchar(20) DEFAULT NULL,
  `bank_name` varchar(100) DEFAULT NULL,
  `account_type` enum('savings','current') DEFAULT 'savings',
  `upi_id` varchar(100) DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT '0',
  `is_primary` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `bank_accounts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_accounts`
--

LOCK TABLES `bank_accounts` WRITE;
/*!40000 ALTER TABLE `bank_accounts` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `bank_accounts` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `banners`
--

DROP TABLE IF EXISTS `banners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `banners` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(150) DEFAULT NULL,
  `image_url` varchar(500) NOT NULL,
  `link_url` varchar(500) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `status` enum('draft','active') DEFAULT 'draft',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `banners`
--

LOCK TABLES `banners` WRITE;
/*!40000 ALTER TABLE `banners` DISABLE KEYS */;
set autocommit=0;

/*!40000 ALTER TABLE `banners` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `bets`
--

DROP TABLE IF EXISTS `bets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `game_id` bigint unsigned DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `bet_amount` decimal(18,2) NOT NULL,
  `odds` decimal(10,4) DEFAULT NULL,
  `multiplier` decimal(10,4) DEFAULT NULL,
  `payout` decimal(18,2) DEFAULT '0.00',
  `profit_loss` decimal(18,2) DEFAULT '0.00',
  `status` enum('open','won','lost','void','cancelled','cashout') DEFAULT 'open',
  `round_id` varchar(100) DEFAULT NULL,
  `provably_fair_seed` varchar(255) DEFAULT NULL,
  `provably_fair_hash` varchar(255) DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `settled_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `game_id` (`game_id`),
  KEY `idx_bets_user` (`user_id`),
  KEY `idx_bets_status` (`status`),
  CONSTRAINT `bets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `bets_ibfk_2` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bets`
--

LOCK TABLES `bets` WRITE;
/*!40000 ALTER TABLE `bets` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `bets` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `blocked_cards`
--

DROP TABLE IF EXISTS `blocked_cards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `blocked_cards` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `card_mask` varchar(30) NOT NULL,
  `card_holder` varchar(100) DEFAULT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `reason` varchar(150) DEFAULT NULL,
  `attempts` int NOT NULL DEFAULT '0',
  `blocked_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_bc_user` (`user_id`),
  KEY `idx_bc_mask` (`card_mask`),
  CONSTRAINT `fk_bc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blocked_cards`
--

LOCK TABLES `blocked_cards` WRITE;
/*!40000 ALTER TABLE `blocked_cards` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `blocked_cards` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `blocked_ips`
--

DROP TABLE IF EXISTS `blocked_ips`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `blocked_ips` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ip_address` varchar(45) NOT NULL,
  `status` enum('block','allow') NOT NULL DEFAULT 'block',
  `reason` varchar(100) DEFAULT NULL,
  `comments` varchar(255) DEFAULT NULL,
  `blocked_by` bigint unsigned DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `is_permanent` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_blocked_ip` (`ip_address`),
  KEY `idx_blocked_ips_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blocked_ips`
--

LOCK TABLES `blocked_ips` WRITE;
/*!40000 ALTER TABLE `blocked_ips` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `blocked_ips` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `bonus_excluded_affiliates`
--

DROP TABLE IF EXISTS `bonus_excluded_affiliates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bonus_excluded_affiliates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bonus_id` bigint unsigned NOT NULL,
  `affiliate_id` bigint unsigned NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bea` (`bonus_id`,`affiliate_id`),
  KEY `idx_bea_affiliate` (`affiliate_id`),
  CONSTRAINT `bonus_excluded_affiliates_ibfk_1` FOREIGN KEY (`bonus_id`) REFERENCES `bonuses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bonus_excluded_affiliates`
--

LOCK TABLES `bonus_excluded_affiliates` WRITE;
/*!40000 ALTER TABLE `bonus_excluded_affiliates` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `bonus_excluded_affiliates` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `bonus_providers`
--

DROP TABLE IF EXISTS `bonus_providers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bonus_providers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bonus_id` bigint unsigned NOT NULL,
  `provider_id` bigint unsigned NOT NULL,
  `wagering_multiplier` decimal(6,2) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bonus_providers` (`bonus_id`,`provider_id`),
  KEY `provider_id` (`provider_id`),
  CONSTRAINT `bonus_providers_ibfk_1` FOREIGN KEY (`bonus_id`) REFERENCES `bonuses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bonus_providers_ibfk_2` FOREIGN KEY (`provider_id`) REFERENCES `game_providers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bonus_providers`
--

LOCK TABLES `bonus_providers` WRITE;
/*!40000 ALTER TABLE `bonus_providers` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `bonus_providers` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `bonus_translations`
--

DROP TABLE IF EXISTS `bonus_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bonus_translations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bonus_id` bigint unsigned NOT NULL,
  `language` varchar(10) NOT NULL DEFAULT 'en',
  `title` varchar(150) DEFAULT NULL,
  `description` text,
  `image_url` varchar(500) DEFAULT NULL,
  `terms_conditions` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bt` (`bonus_id`,`language`),
  CONSTRAINT `bonus_translations_ibfk_1` FOREIGN KEY (`bonus_id`) REFERENCES `bonuses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bonus_translations`
--

LOCK TABLES `bonus_translations` WRITE;
/*!40000 ALTER TABLE `bonus_translations` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `bonus_translations` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `bonuses`
--

DROP TABLE IF EXISTS `bonuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bonuses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `display_title` varchar(150) DEFAULT NULL,
  `description` text,
  `bonus_type` enum('joining','deposit','referral','game','cashback','no_deposit','free_spins','loyalty','reload','manual') NOT NULL,
  `priority` int DEFAULT '0',
  `value_type` enum('percentage','fixed') NOT NULL,
  `value_amount` decimal(18,2) NOT NULL,
  `redemption_type` varchar(40) DEFAULT NULL,
  `redemption_amount` decimal(18,2) DEFAULT NULL,
  `max_redeemable_value` decimal(18,2) DEFAULT NULL,
  `payment_methods` varchar(255) DEFAULT NULL,
  `min_deposit` decimal(18,2) DEFAULT '0.00',
  `is_first_deposit` tinyint(1) DEFAULT '0',
  `is_second_deposit` tinyint(1) DEFAULT '0',
  `is_third_deposit` tinyint(1) DEFAULT '0',
  `is_new_player_only` tinyint(1) DEFAULT '0',
  `new_player_days` int DEFAULT '7',
  `max_bonus_cap` decimal(18,2) DEFAULT NULL,
  `referrer_reward` decimal(18,2) DEFAULT '0.00',
  `wagering_multiplier` decimal(5,2) DEFAULT '35.00',
  `credit_target` enum('bonus','main') DEFAULT 'bonus',
  `status` enum('draft','active','paused','expired') DEFAULT 'draft',
  `is_published` tinyint(1) DEFAULT '0',
  `is_public` tinyint(1) DEFAULT '0',
  `affiliate_id` bigint unsigned DEFAULT NULL,
  `parent_bonus_id` bigint unsigned DEFAULT NULL,
  `comment` text,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `claim_method` enum('auto','manual','code','opt_in') DEFAULT 'auto',
  `scope` enum('mass','targeted') DEFAULT 'mass',
  `target_user_id` bigint unsigned DEFAULT NULL,
  `promo_code` varchar(40) DEFAULT NULL,
  `coupon_length` int DEFAULT NULL,
  `per_user_limit` int DEFAULT NULL,
  `total_budget` decimal(18,2) DEFAULT NULL,
  `total_awarded` decimal(18,2) DEFAULT '0.00',
  `total_claims` int DEFAULT '0',
  `bonus_validity_days` int DEFAULT '30',
  `claim_min_balance` decimal(18,2) DEFAULT NULL,
  `claim_min_wagering` decimal(18,2) DEFAULT NULL,
  `claim_min_deposit_total` decimal(18,2) DEFAULT NULL,
  `abuse_similarity_percent` int DEFAULT NULL,
  `abuse_deposited_days` int DEFAULT NULL,
  `abuse_played_days` int DEFAULT NULL,
  `allowed_countries` json DEFAULT NULL,
  `excluded_countries` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bonuses_promo_code` (`promo_code`),
  KEY `idx_bonuses_type_status` (`bonus_type`,`status`),
  KEY `idx_bonuses_affiliate` (`affiliate_id`),
  KEY `idx_bonuses_parent` (`parent_bonus_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bonuses`
--

LOCK TABLES `bonuses` WRITE;
/*!40000 ALTER TABLE `bonuses` DISABLE KEYS */;
set autocommit=0;

/*!40000 ALTER TABLE `bonuses` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `cashier_queue_items`
--

DROP TABLE IF EXISTS `cashier_queue_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cashier_queue_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue_type` enum('decline','profile_upgrade') NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `transaction_id` bigint unsigned DEFAULT NULL,
  `amount` decimal(18,2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'INR',
  `reason` varchar(255) DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `assigned_to` bigint unsigned DEFAULT NULL,
  `resolved_by` bigint unsigned DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `notes` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cqi_type_status` (`queue_type`,`status`),
  KEY `idx_cqi_user` (`user_id`),
  CONSTRAINT `cashier_queue_items_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cashier_queue_items`
--

LOCK TABLES `cashier_queue_items` WRITE;
/*!40000 ALTER TABLE `cashier_queue_items` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `cashier_queue_items` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `decline_queue`
--

DROP TABLE IF EXISTS `decline_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `decline_queue` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `transaction_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `method_id` bigint unsigned DEFAULT NULL,
  `provider_id` bigint unsigned DEFAULT NULL,
  `decline_reason` varchar(255) DEFAULT NULL,
  `attempts` int NOT NULL DEFAULT '1',
  `status` enum('pending','retried','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_dq_user` (`user_id`),
  KEY `idx_dq_status` (`status`),
  CONSTRAINT `fk_dq_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `decline_queue`
--

LOCK TABLES `decline_queue` WRITE;
/*!40000 ALTER TABLE `decline_queue` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `decline_queue` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `faqs`
--

DROP TABLE IF EXISTS `faqs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `faqs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `question` varchar(300) NOT NULL,
  `answer` text NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `status` enum('draft','active') DEFAULT 'active',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `faqs`
--

LOCK TABLES `faqs` WRITE;
/*!40000 ALTER TABLE `faqs` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `faqs` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `frontend_config_rules`
--

DROP TABLE IF EXISTS `frontend_config_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `frontend_config_rules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `country_code` char(2) DEFAULT NULL,
  `currency_code` varchar(10) DEFAULT NULL,
  `player_group` varchar(50) DEFAULT 'all',
  `method_ids` json DEFAULT NULL,
  `priority` int NOT NULL DEFAULT '100',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `frontend_config_rules`
--

LOCK TABLES `frontend_config_rules` WRITE;
/*!40000 ALTER TABLE `frontend_config_rules` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `frontend_config_rules` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `frontend_payment_methods`
--

DROP TABLE IF EXISTS `frontend_payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `frontend_payment_methods` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `method_id` bigint unsigned DEFAULT NULL,
  `display_name` varchar(100) NOT NULL,
  `country_code` char(2) DEFAULT NULL,
  `currency_code` varchar(10) DEFAULT NULL,
  `player_group` varchar(50) DEFAULT 'all',
  `sort_order` int NOT NULL DEFAULT '0',
  `icon_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_fpm_method` (`method_id`),
  CONSTRAINT `fk_fpm_method` FOREIGN KEY (`method_id`) REFERENCES `payment_methods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `frontend_payment_methods`
--

LOCK TABLES `frontend_payment_methods` WRITE;
/*!40000 ALTER TABLE `frontend_payment_methods` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `frontend_payment_methods` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `game_callback_logs`
--

DROP TABLE IF EXISTS `game_callback_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_callback_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `serial_number` varchar(100) DEFAULT NULL,
  `member_account` varchar(100) DEFAULT NULL,
  `game_uid` varchar(64) DEFAULT NULL,
  `raw_payload` text,
  `decrypted_payload` json DEFAULT NULL,
  `result` enum('settled','duplicate','heartbeat','error','rejected') NOT NULL,
  `message` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gcl_serial` (`serial_number`),
  KEY `idx_gcl_created` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `game_callback_logs`
--

LOCK TABLES `game_callback_logs` WRITE;
/*!40000 ALTER TABLE `game_callback_logs` DISABLE KEYS */;
set autocommit=0;

/*!40000 ALTER TABLE `game_callback_logs` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `game_categories`
--

DROP TABLE IF EXISTS `game_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL,
  `slug` varchar(50) NOT NULL,
  `icon_url` varchar(500) DEFAULT NULL,
  `is_sports` tinyint(1) NOT NULL DEFAULT '0',
  `is_delayed_settlement` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_game_categories_active` (`is_active`),
  KEY `idx_game_categories_sort` (`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `game_categories`
--

LOCK TABLES `game_categories` WRITE;
/*!40000 ALTER TABLE `game_categories` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `game_categories` VALUES
(1,'All Games','all_games',NULL,0,0,1,1,'2026-09-14 18:05:02','2026-09-14 18:05:02'),
(2,'Slots','slots',NULL,0,0,1,2,'2026-09-14 18:05:02','2026-09-14 18:05:02'),
(3,'Live Casino','live_casino',NULL,0,0,1,3,'2026-09-14 18:05:02','2026-09-14 18:05:02'),
(4,'Sports','sports',NULL,1,1,1,4,'2026-09-14 18:05:02','2026-09-14 18:05:02'),
(5,'Lottery','lottery',NULL,0,1,1,5,'2026-09-14 18:05:02','2026-09-14 18:05:02'),
(6,'AI Games','ai_games',NULL,0,0,1,6,'2026-09-14 18:05:02','2026-09-14 18:05:02'),
(7,'Fantasy','fantasy',NULL,0,1,1,7,'2026-09-14 18:05:02','2026-09-14 18:05:02'),
(8,'Virtual Sports','virtual_sports',NULL,1,1,1,8,'2026-09-14 18:05:02','2026-09-14 18:05:02');
/*!40000 ALTER TABLE `game_categories` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `game_providers`
--

DROP TABLE IF EXISTS `game_providers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_providers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(50) NOT NULL,
  `logo_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `agency_uid` varchar(100) DEFAULT NULL,
  `aes_secret_key` varchar(128) DEFAULT NULL,
  `server_url` varchar(255) DEFAULT NULL,
  `launch_path` varchar(100) DEFAULT NULL,
  `player_prefix` varchar(40) DEFAULT NULL,
  `callback_path` varchar(100) DEFAULT NULL,
  `currency_code` varchar(10) DEFAULT NULL,
  `delayed_settlement` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `game_providers`
--

LOCK TABLES `game_providers` WRITE;
/*!40000 ALTER TABLE `game_providers` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `game_providers` VALUES
(1,'Arcade','arcade','',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-06-26 06:58:40'),
(2,'Esports','esports',NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-06-26 06:58:40'),
(3,'Instant Games','instant','',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-06-26 06:58:40'),
(4,'Live Casino','live','',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-06-26 06:58:40'),
(5,'Poker','poker','',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-06-26 06:58:40'),
(6,'Slots','slots','',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-06-26 06:58:40'),
(7,'Sportsbook','sports','',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-06-26 06:58:40'),
(8,'India Lotto','India-lotto','',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-15 11:02:55'),
(9,'Odin Cockfighting','odin-cockfighting','',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-07-15 11:35:01'),
(10,'Smartsoft','smartsoft',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:23:22'),
(11,'Spribe','spribe',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:23:22'),
(12,'PG Soft','pg-soft',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:23:22'),
(13,'Galaxsys','galaxsys',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:23:22'),
(14,'MAC88','mac88',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:23:22'),
(15,'Veliplay','veliplay',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:23:22'),
(16,'turbogamesasia','turbo-games',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:23:22'),
(17,'18 Peaches','18-peaches',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:23:22'),
(18,'Aura Gaming','aura-gaming',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:23:22'),
(19,'CasinoLive','casinolive',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:23:22'),
(20,'Evolution Live','evolution-live',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:23:22'),
(21,'TADAgaming','tada-gaming',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:23:22'),
(22,'GILIgaming','gili-gaming',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:23:22'),
(23,'India Poker Game','india-poker',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:23:22'),
(24,'IN OUT MINI GAMES','in-out-games',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:23:22'),
(25,'Fish Game','fish-game',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:23:22'),
(26,'iDeal','ideal',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:23:22'),
(27,'PgsGaming','pgs-gaming',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:23:22'),
(28,'LuckSportsGame','luck-sports',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:23:22'),
(29,'Slot Game','slot-game',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:23:22'),
(30,'SportsGame','sportsgame',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:36:53'),
(31,'aviatrix','aviatrix',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:36:53'),
(32,'jilli','jilli',NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'2026-09-11 14:36:53');
/*!40000 ALTER TABLE `game_providers` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `game_rounds`
--

DROP TABLE IF EXISTS `game_rounds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_rounds` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `session_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned NOT NULL,
  `game_id` bigint unsigned DEFAULT NULL,
  `game_uid` varchar(64) NOT NULL,
  `game_name` varchar(150) DEFAULT NULL,
  `serial_number` varchar(100) NOT NULL,
  `stake_serial` varchar(100) DEFAULT NULL,
  `game_round` varchar(100) DEFAULT NULL,
  `settle_status` enum('pending','settled') NOT NULL DEFAULT 'settled',
  `settled_at` datetime DEFAULT NULL,
  `bet_amount` decimal(20,2) DEFAULT '0.00',
  `win_amount` decimal(20,2) DEFAULT '0.00',
  `balance_before` decimal(20,2) DEFAULT NULL,
  `balance_after` decimal(20,2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'INR',
  `provider_timestamp` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `serial_number` (`serial_number`),
  UNIQUE KEY `stake_serial` (`stake_serial`),
  KEY `session_id` (`session_id`),
  KEY `game_id` (`game_id`),
  KEY `idx_gr_user` (`user_id`),
  KEY `idx_gr_game_uid` (`game_uid`),
  KEY `idx_gr_created` (`created_at`),
  KEY `idx_gr_settle` (`settle_status`),
  KEY `idx_gr_round` (`user_id`,`game_round`),
  KEY `idx_gr_win` (`win_amount`,`created_at`),
  CONSTRAINT `game_rounds_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `game_sessions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `game_rounds_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `game_rounds_ibfk_3` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `game_rounds`
--

LOCK TABLES `game_rounds` WRITE;
/*!40000 ALTER TABLE `game_rounds` DISABLE KEYS */;
set autocommit=0;

/*!40000 ALTER TABLE `game_rounds` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `game_sessions`
--

DROP TABLE IF EXISTS `game_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `game_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `session_uid` varchar(64) NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `game_id` bigint unsigned DEFAULT NULL,
  `game_uid` varchar(64) NOT NULL,
  `game_name` varchar(150) NOT NULL,
  `member_account` varchar(100) NOT NULL,
  `launch_url` text,
  `currency` varchar(10) DEFAULT 'INR',
  `total_bet` decimal(20,2) DEFAULT '0.00',
  `total_win` decimal(20,2) DEFAULT '0.00',
  `profit_loss` decimal(20,2) DEFAULT '0.00',
  `rounds_count` int DEFAULT '0',
  `pending_rounds` int NOT NULL DEFAULT '0',
  `last_balance` decimal(20,2) DEFAULT NULL,
  `status` enum('wait','profit','loss') DEFAULT 'wait',
  `last_played_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_uid` (`session_uid`),
  KEY `game_id` (`game_id`),
  KEY `idx_gs_user` (`user_id`),
  KEY `idx_gs_member` (`member_account`),
  KEY `idx_gs_game_uid` (`game_uid`),
  KEY `idx_gs_user_game` (`user_id`,`game_uid`),
  CONSTRAINT `game_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `game_sessions_ibfk_2` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `game_sessions`
--

LOCK TABLES `game_sessions` WRITE;
/*!40000 ALTER TABLE `game_sessions` DISABLE KEYS */;
set autocommit=0;

/*!40000 ALTER TABLE `game_sessions` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `games`
--

DROP TABLE IF EXISTS `games`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `games` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `provider_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `category` varchar(50) NOT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `game_uid` varchar(64) DEFAULT NULL,
  `game_type` varchar(40) DEFAULT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `rtp` decimal(5,2) DEFAULT NULL,
  `min_bet` decimal(18,2) DEFAULT '10.00',
  `max_bet` decimal(18,2) DEFAULT '100000.00',
  `is_featured` tinyint(1) DEFAULT '0',
  `is_active_web` tinyint(1) DEFAULT '1',
  `is_active_mobile` tinyint(1) DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `is_provably_fair` tinyint(1) DEFAULT '0',
  `sort_order` int DEFAULT '0',
  `play_count` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `provider_id` (`provider_id`),
  KEY `idx_games_category` (`category`),
  KEY `idx_games_featured` (`is_featured`),
  KEY `idx_games_uid` (`game_uid`),
  KEY `idx_games_active` (`is_active`),
  KEY `idx_games_sort` (`sort_order`),
  KEY `idx_games_category_id` (`category_id`),
  CONSTRAINT `fk_games_category` FOREIGN KEY (`category_id`) REFERENCES `game_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `games_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `game_providers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=798 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `games`
--

LOCK TABLES `games` WRITE;
/*!40000 ALTER TABLE `games` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `games` VALUES
(1,4,'Microgaming Lobby','microgaming-lobby-4e58131a','live_casino',3,'4e58131adb95bb061a40e6e309116c19','CasinoLive','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT1BrpDj_tYZ2FysnP4-K6_cs9E5JdFBQWzleThcK4o1L2BPOzzFGSlq78&s=10',NULL,10.00,100000.00,0,1,1,1,0,0,2,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(2,4,'Ezugi Lobby','ezugi-lobby-d0e052b0','live_casino',3,'d0e052b031dfcdb08d1803f4bcc618ef','CasinoLive','https://www.livecasinocomparer.com/wp-content/uploads/2026/04/ezugi-live-casino.webp',NULL,10.00,100000.00,0,1,1,1,0,1,2,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(3,4,'Evolution Lobby','evolution-lobby-8ef39602','live_casino',3,'8ef39602e589bf9f32fc351b1cbb338b','CasinoLive','https://delivery2.objectic.io/Jd8DtRve6A7M91Dp6stxDe/jIWXpQOLRVBo/JpY1srhK0mprif3Erg9u8hhorJWy0N00QMMBQ9X6.jpg?w=1536&q=75&fm=auto',NULL,10.00,100000.00,0,1,1,1,0,2,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(4,4,'Super Andar Bahar','super-andar-bahar-f7b98e89','live_casino',3,'f7b98e899461bdd49f92afc36b4c0db5','CasinoLive','https://i.postimg.cc/nzJXysKD/Screenshot-2025-03-21-153431.png',NULL,10.00,100000.00,0,1,1,1,0,3,2,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(5,4,'XXXtreme Lightning Roulette','xxxtreme-lightning-roulette-394fe6a2','live_casino',3,'394fe6a2cde24bc487767236cc6eccd6','CasinoLive','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTzVO-S7RaA_LKkxsZA_uko3yFvK4tN_ywLVdRscfc4WQ&s=10',NULL,10.00,100000.00,0,1,1,1,0,4,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(6,4,'Crazy Time','crazy-time-917c0c51','live_casino',3,'917c0c51d248c33eb058e3210a2e7371','CasinoLive','https://i.postimg.cc/tJ9Vx1Yj/Screenshot-2025-03-21-153400.png',NULL,10.00,100000.00,0,1,1,1,0,5,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(7,4,'Lightning Roulette','lightning-roulette-4a858d6b','live_casino',3,'4a858d6b74c05260d3ea2762838798c7','CasinoLive','https://egw.news/_next/image?url=https%3A%2F%2Fegw.news%2Fuploads%2Fnews%2F1%2F17%2F1755104641788_1755104641791.webp&w=1920&q=75',NULL,10.00,100000.00,0,1,1,1,0,6,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(8,4,'MONOPOLY Live','monopoly-live-d496ac5f','live_casino',3,'d496ac5fd91702331133e44b6bd12b26','CasinoLive','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTPSJn1LFVhHz91ek4yaUukVv7h4vtLMs8bEijt60nVAAnPC4W-V9ZQMVcR&s=10',NULL,10.00,100000.00,0,1,1,1,0,7,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(9,4,'Playtech Lobby','playtech-lobby-c38efc51','live_casino',3,'c38efc51028bd65f42396fa079c125d6','CasinoLive','https://www.primeapi.com/cdn/gameRes/sq/350/PlaytechGameShowsLobby.jpg',NULL,10.00,100000.00,0,1,1,1,0,8,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(10,4,'DreamGaming','dreamgaming-8737e1ef','live_casino',3,'8737e1ef982bd7ba41ec02c1823626f9','CasinoLive','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcStNfAHfOSIAtMdyIl4WUifqAGzGvU4MYm4-JnUt2eQoa9-PzdGJABs-5AT&s=10',NULL,10.00,100000.00,0,1,1,1,0,9,1,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(11,4,'Mines','mines-72ce7e04','live_casino',3,'72ce7e04ce95ee94eef172c0dfd6dc17','CasinoLive','https://ossimg.tirangaagent.com/Tiranga/gamelogo/JILI/232.png',NULL,10.00,100000.00,0,1,1,1,0,10,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(12,4,'Tower','tower-8e939551','live_casino',3,'8e939551b9e785001fcb5b0a32f88aba','CasinoLive','https://ossimg.tirangaagent.com/Tiranga/gamelogo/JILI/233.png',NULL,10.00,100000.00,0,1,1,1,0,11,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(13,4,'HILO','hilo-bd8a2bb2','live_casino',3,'bd8a2bb2dd63503b93cf6ac9492786ce','CasinoLive','https://ossimg.tirangaagent.com/Tiranga/gamelogo/JILI/235.png',NULL,10.00,100000.00,0,1,1,1,0,12,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(14,4,'Limbo','limbo-eabf0825','live_casino',3,'eabf08253165b6bb2646e403de625d1a','CasinoLive','https://ossimg.tirangaagent.com/Tiranga/gamelogo/JILI/236.png',NULL,10.00,100000.00,0,1,1,1,0,13,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(15,4,'Trump Card','trump-card-96c010fc','live_casino',3,'96c010fc4a95792401e903213d7add44','CasinoLive','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Trump-Card.png',NULL,10.00,100000.00,0,1,1,1,0,14,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(16,4,'Wheel','wheel-6e19e03c','live_casino',3,'6e19e03c50f035ddd9ffd804c30f8c80','CasinoLive','https://ossimg.tirangaagent.com/Tiranga/gamelogo/JILI/229.png',NULL,10.00,100000.00,0,1,1,1,0,15,2,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(17,3,'Aviator','aviator-a04d1f3e','ai_games',6,'a04d1f3eb8ccec8a4823bdf18e3f0e84','CasinoTable','https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/800.png',NULL,10.00,100000.00,0,1,1,1,0,16,3,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(18,3,'Mines','mines-5c4a12fb','ai_games',6,'5c4a12fb0a9b296d9b0d5f9e1cd41d65','CasinoTable','https://ossimg.tirangaagent.com/Tiranga/gamelogo/SPRIBE/22005.png',NULL,10.00,100000.00,0,1,1,1,0,17,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(19,3,'Plinko','plinko-6ab7a4fe','ai_games',6,'6ab7a4fe5161936012d6b06143918223','CasinoTable','https://ossimg.tirangaagent.com/Tiranga/gamelogo/SPRIBE/22004.png',NULL,10.00,100000.00,0,1,1,1,0,18,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(20,3,'Dice','dice-8a87aae7','ai_games',6,'8a87aae7a3624d284306e9c6fe1b3e9c','CasinoTable','https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/102.png',NULL,10.00,100000.00,0,1,1,1,0,19,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(21,3,'Goal','goal-c68a515f','ai_games',6,'c68a515f0b3b10eec96cf6d33299f4e2','CasinoTable','https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/105.png',NULL,10.00,100000.00,0,1,1,1,0,20,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(22,3,'Hi Lo','hi-lo-a669c993','ai_games',6,'a669c993b0e1f1b7da100fcf95516bdf','CasinoTable','https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/101.png',NULL,10.00,100000.00,0,1,1,1,0,21,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(23,3,'Hotline','hotline-b31720b3','ai_games',6,'b31720b3cd65d917a1a96ef61a72b672','CasinoTable','https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/107.png',NULL,10.00,100000.00,0,1,1,1,0,22,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(24,3,'Keno','keno-c311eb4b','ai_games',6,'c311eb4bbba03b105d150504931f2479','CasinoTable','https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/106.png',NULL,10.00,100000.00,0,1,1,1,0,23,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(25,3,'Mini Roulette','mini-roulette-9dc7ac61','ai_games',6,'9dc7ac6155c5a19c1cc204853e426367','CasinoTable','https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/104.png',NULL,10.00,100000.00,0,1,1,1,0,24,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(26,1,'Ocean King Jackpot','ocean-king-jackpot-564c48d5','ai_games',6,'564c48d53fcddd2bcf0bf3602d86c958','Fish Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Ocean-King-Jackpot.png',NULL,10.00,100000.00,0,1,1,1,0,25,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(27,1,'Royal Fishing','royal-fishing-e794bf57','ai_games',6,'e794bf5717aca371152df192341fe68b','Fish Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Royal-Fishing.png',NULL,10.00,100000.00,0,1,1,1,0,26,2,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(28,1,'Bombing Fishing','bombing-fishing-e333695b','ai_games',6,'e333695bcff28acdbecc641ae6ee2b23','Fish Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Bombing-Fishing.png',NULL,10.00,100000.00,0,1,1,1,0,27,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(29,1,'Dinosaur Tycoon','dinosaur-tycoon-eef3e28f','ai_games',6,'eef3e28f0e3e7b72cbca61e7924d00f1','Fish Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Dinosaur-Tycoon.png',NULL,10.00,100000.00,0,1,1,1,0,28,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(30,1,'Jackpot Fishing','jackpot-fishing-3cf4a85c','ai_games',6,'3cf4a85cb6dcf4d8836c982c359cd72d','Fish Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Jackpot-Fishing.png',NULL,10.00,100000.00,0,1,1,1,0,29,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(31,1,'Dragon Fortune','dragon-fortune-1200b824','ai_games',6,'1200b82493e4788d038849bca884d773','Fish Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Dragon-Fortune.png',NULL,10.00,100000.00,0,1,1,1,0,30,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(32,1,'Mega Fishing','mega-fishing-caacafe3','ai_games',6,'caacafe3f64a6279e10a378ede09ff38','Fish Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Mega-Fishing.png',NULL,10.00,100000.00,0,1,1,1,0,31,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(33,1,'Boom Legend','boom-legend-f02ede19','ai_games',6,'f02ede19c5953fce22c6098d860dadf4','Fish Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Boom-Legend.png',NULL,10.00,100000.00,0,1,1,1,0,32,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(34,1,'Happy Fishing','happy-fishing-71c68a4d','ai_games',6,'71c68a4ddb63bdc8488114a08e603f1c','Fish Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Happy-Fishing.png',NULL,10.00,100000.00,0,1,1,1,0,33,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(35,1,'All-star Fishing','all-star-fishing-9ec2a187','ai_games',6,'9ec2a18752f83e45ccedde8dfeb0f6a7','Fish Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/All-star-Fishing.png',NULL,10.00,100000.00,0,1,1,1,0,34,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(36,1,'Dinosaur Tycoon II','dinosaur-tycoon-ii-bbae6016','ai_games',6,'bbae6016f79f3df74e453eda164c08a4','Fish Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Dinosaur-Tycoon-II.png',NULL,10.00,100000.00,0,1,1,1,0,35,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(37,1,'Fishing Disco','fishing-disco-e453b811','ai_games',6,'e453b811fd1782fd2ade1f93ee0dee32','Fish Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Fishing-Disco.png',NULL,10.00,100000.00,0,1,1,1,0,36,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(38,1,'Dragon Master','dragon-master-f691d904','ai_games',6,'f691d904ea681ce449263f7e9cc47c35','Fish Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Dragon-Master.png',NULL,10.00,100000.00,0,1,1,1,0,37,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(39,1,'Fishing Yilufa','fishing-yilufa-877c9736','ai_games',6,'877c97367d24925a11d342726eb0320f','Fish Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Fishing-Yilufa.png',NULL,10.00,100000.00,0,1,1,1,0,38,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(40,1,'Shade Dragons Fishing','shade-dragons-fishing-89e967a8','ai_games',6,'89e967a8336fb8caad2c1b6d735588fe','Fish Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Shade-Dragons-Fishing.png',NULL,10.00,100000.00,0,1,1,1,0,39,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(41,1,'Cai Shen Fishing','cai-shen-fishing-6df463ea','ai_games',6,'6df463eabe5fcdaa033e1c89b9ffd162','Fish Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Cai-Shen-Fishing.png',NULL,10.00,100000.00,0,1,1,1,0,40,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(42,1,'Dragon Fishing II','dragon-fishing-ii-6cef8d8e','ai_games',6,'6cef8d8ea517d86602db60fe9781b01b','Fish Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Dragon-Fishing-Ii.png',NULL,10.00,100000.00,0,1,1,1,0,41,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(43,1,'Dragon Fishing','dragon-fishing-1145d7cd','ai_games',6,'1145d7cd96518a5ba2f77cb14cb363c4','Fish Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Dragon-Fishing.png',NULL,10.00,100000.00,0,1,1,1,0,42,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(44,5,'TeenPatti','teenpatti-f743cb55','live_casino',3,'f743cb55c2c4b737727ef144413937f4','India Poker Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/TeenPatti.png',NULL,10.00,100000.00,0,1,1,1,0,43,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(45,5,'AK47','ak47-488c3776','live_casino',3,'488c377662cad37a551bde18e2fbe785','India Poker Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/AK47.png',NULL,10.00,100000.00,0,1,1,1,0,44,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(46,5,'Andar Bahar','andar-bahar-6f48b3aa','live_casino',3,'6f48b3aa0b64c79a2dc320ea021148b5','India Poker Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Andar-Bahar.png',NULL,10.00,100000.00,0,1,1,1,0,45,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(47,5,'Rummy','rummy-ae632f32','live_casino',3,'ae632f32c3a1e6803f9a6fbec16be28e','India Poker Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Rummy.png',NULL,10.00,100000.00,0,1,1,1,0,46,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(48,5,'Callbreak','callbreak-9092b5a5','live_casino',3,'9092b5a56e001c60850c4c1184c53e07','India Poker Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Callbreak.png',NULL,10.00,100000.00,0,1,1,1,0,47,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(49,5,'TeenPatti Joker','teenpatti-joker-1a4eaca6','live_casino',3,'1a4eaca67612e65fdcae43f4c8a667a4','India Poker Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/TeenPatti-Joker.png',NULL,10.00,100000.00,0,1,1,1,0,48,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(50,5,'Callbreak Quick','callbreak-quick-aa9a9916','live_casino',3,'aa9a9916d6e48ba50afa3c2246b6dacb','India Poker Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Callbreak-Quick.png',NULL,10.00,100000.00,0,1,1,1,0,49,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(51,5,'TeenPatti 20-20','teenpatti-20-20-1afa7db5','live_casino',3,'1afa7db588d05de7b9abca4664542765','India Poker Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/TeenPatti-20-20.png',NULL,10.00,100000.00,0,1,1,1,0,50,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(52,5,'Ludo Quick','ludo-quick-bb1f14d7','live_casino',3,'bb1f14d788d37b06dc8f6701ed57ed0d','India Poker Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Ludo-Quick.png',NULL,10.00,100000.00,0,1,1,1,0,51,1,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(53,5,'Tongits Go','tongits-go-26fbfab9','live_casino',3,'26fbfab92a3837b7dbf767e783b173af','India Poker Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Tongits-Go.png',NULL,10.00,100000.00,0,1,1,1,0,52,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(54,5,'Pusoy Go','pusoy-go-f2879a3f','live_casino',3,'f2879a3f20f305eadad13448e11c052e','India Poker Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Pusoy-Go.png',NULL,10.00,100000.00,0,1,1,1,0,53,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(55,5,'Blackjack','blackjack-3b502aee','live_casino',3,'3b502aee6c9e1ef0f698332ee1b76634','India Poker Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Blackjack.png',NULL,10.00,100000.00,0,1,1,1,0,54,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(56,5,'Blackjack Lucky Ladies','blackjack-lucky-ladies-d0d1c200','live_casino',3,'d0d1c20062e28493e1750f27a1730c48','India Poker Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Blackjack-Lucky-Ladies.png',NULL,10.00,100000.00,0,1,1,1,0,55,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(57,5,'MINI FLUSH','mini-flush-07afefc3','live_casino',3,'07afefc388ab6af8cf26f85286f83fae','India Poker Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/MINI-FLUSH.png',NULL,10.00,100000.00,0,1,1,1,0,56,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(58,5,'Pool Rummy','pool-rummy-43e7df81','live_casino',3,'43e7df819bf57722a8917bb328640b30','India Poker Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Pool-Rummy.png',NULL,10.00,100000.00,0,1,1,1,0,57,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(59,5,'Caribbean Stud Poker','caribbean-stud-poker-04c9784b','live_casino',3,'04c9784b0b1b162b2c86f9ce353da8b7','India Poker Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Caribbean-Stud-Poker.png',NULL,10.00,100000.00,0,1,1,1,0,58,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(60,6,'Le Pharaoh','le-pharaoh-fd4d50fd','slots',2,'fd4d50fd42d7453c20776398269ee6c5','Slot','https://mediumrare.imgix.net/293b2337d4d5cfda999ca423e34518a1a6682062340f1f1c5a669a26e7927c79?w=180&h=236&fit=min&auto=format',NULL,10.00,100000.00,0,1,1,1,0,59,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(61,6,'Phoenix DuelReels','phoenix-duelreels-32776cbf','slots',2,'32776cbf601015f626a96ccecb1137d9','Slot','https://mediumrare.imgix.net/7ac7169ca980177d2f7843face3046fb42c001bf4dd7356becb037e92fc07ff1?w=180&h=236&fit=min&auto=format',NULL,10.00,100000.00,0,1,1,1,0,60,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(62,6,'Fortune Dragon','fortune-dragon-c5435a8a','slots',2,'c5435a8a73707a3a8bb4fe8baaaef3d2','Slot','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Fortune-Dragon_icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,61,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(63,6,'Fortune Rabbit','fortune-rabbit-e175cdd3','slots',2,'e175cdd3215a02f5539cc8354a149b75','Slot','https://mediumrare.imgix.net/8f495d55e1cdbef9a5995b7133d6f4ad1b9a332493ade8b29a82f048ecda7388?w=180&h=236&fit=min&auto=format',NULL,10.00,100000.00,0,1,1,1,0,62,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(64,6,'Fortune Tiger','fortune-tiger-9a848256','slots',2,'9a8482565ce343ad3ea7fc4bc42cb043','Slot','https://mediumrare.imgix.net/38cdf7e275e87c2530ee926bb2f5c811d9cb6ffccdad7717bed7ca43aa88eb38?w=180&h=236&fit=min&auto=format',NULL,10.00,100000.00,0,1,1,1,0,63,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(65,6,'SixSixSix','sixsixsix-37524900','slots',2,'3752490080e5e310b5a3f823de33deed','Slot','https://mediumrare.imgix.net/30be38fdc2b4d9a6c76194314dfb7814a66d6905287ade354a0e5f2a79b1ab27?w=180&h=236&fit=min&auto=format',NULL,10.00,100000.00,0,1,1,1,0,64,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(66,6,'Le Bandit','le-bandit-2fbd2533','slots',2,'2fbd2533b1bb03d5e03bfa80dd5da0bf','Slot','https://mediumrare.imgix.net/8ade942d35d2cdbddf7888f303be4cf4bda8c650a112b3c53f7c6f3ccad81254?w=180&h=236&fit=min&auto=format',NULL,10.00,100000.00,0,1,1,1,0,65,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(67,6,'Donny Dough','donny-dough-173c3e7c','slots',2,'173c3e7cb587af08a8aa2026e490b832','Slot','https://mediumrare.imgix.net/d0da486c2ef84196c52198fce55b4566303ef3d73d94c675179a8f6c4c5a3781?w=180&h=236&fit=min&auto=format',NULL,10.00,100000.00,0,1,1,1,0,66,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(68,6,'Magic Piggy','magic-piggy-a1686de7','slots',2,'a1686de737ae9cd841d500c825720778','Slot','https://mediumrare.imgix.net/b18560b8631fc3b27c06d41e9729f7774048864ad7c4a16d1a20b1a953883943?w=180&h=236&fit=min&auto=format',NULL,10.00,100000.00,0,1,1,1,0,67,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(69,6,'Wild Bandito','wild-bandito-95fc290b','slots',2,'95fc290bb05c07b5aad1a054eba4dcc4','Slot','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Wild-Bandito_icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,68,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(70,6,'Aviamasters','aviamasters-d3c79852','slots',2,'d3c7985229b2e4651fa7889445a5bfd8','Slot','https://mediumrare.imgix.net/202834625f09f92dc0213a6f046d5111bcbba4aec9abf2d1b896839b592c657d?w=180&h=236&fit=min&auto=format',NULL,10.00,100000.00,0,0,1,1,0,69,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(71,6,'RIP City','rip-city-784f4587','slots',2,'784f4587c36ec560939eef1b85c639e4','Slot','https://mediumrare.imgix.net/c55c2ec37c310140617b75c9e490faca98090292991840dce959d93649efbfa5?w=180&h=236&fit=min&auto=format',NULL,10.00,100000.00,0,1,1,1,0,70,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(72,6,'FRKN Bananas','frkn-bananas-7e6130a7','slots',2,'7e6130a781f047045e7b92638d8e3fca','Slot','https://mediumrare.imgix.net/d4c903b8aa3bcbcd3e7cfdd46e14fa5ff3f056922cd470a109438ee41184990e?w=180&h=236&fit=min&auto=format',NULL,10.00,100000.00,0,1,1,1,0,71,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(73,6,'Mahjong Ways','mahjong-ways-1189baca','slots',2,'1189baca156e1bbbecc3b26651a63565','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Mahjong-Ways_rounded_1024.png',NULL,10.00,100000.00,0,1,1,1,0,72,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(74,6,'Mahjong Ways 2','mahjong-ways-2-ba2adf72','slots',2,'ba2adf72179e1ead9e3dae8f0a7d4c07','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Mahjong-Ways2_rounded_1024.png',NULL,10.00,100000.00,0,1,1,1,0,73,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(75,6,'Treasures of Aztec','treasures-of-aztec-2fa9a84d','slots',2,'2fa9a84d096d6ff0bab53f81b79876c8','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Treasures-of-Aztec_rounded_1024.png',NULL,10.00,100000.00,0,1,1,1,0,74,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(76,6,'Leprechaun Riches','leprechaun-riches-fb2a2ac5','slots',2,'fb2a2ac51303c0a0801dbe6a72d936f7','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Leprechaun-Riches_rounded_1024.png',NULL,10.00,100000.00,0,1,1,1,0,75,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(77,6,'Lucky Neko','lucky-neko-e1b4c6b9','slots',2,'e1b4c6b95746d519228744771f15fe4b','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Lucky-Neko_icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,76,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(78,6,'Captain\'s Bounty','captain-s-bounty-cd29b990','slots',2,'cd29b9906a852ce26b53b6d6d81037d4','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Captains-Bounty_Icon_Rounded_1024.png',NULL,10.00,100000.00,0,1,1,1,0,77,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(79,6,'Queen of Bounty','queen-of-bounty-83a6890c','slots',2,'83a6890cf84e4c5a6bacf96d5355d472','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Queen-of-Bounty_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,78,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(80,6,'Ways of the Qilin','ways-of-the-qilin-fedfca55','slots',2,'fedfca553a97a791a3a41c4f1e3bff58','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Ways-of-the-Qilin_icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,79,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(81,6,'Dragon Hatch','dragon-hatch-4afef91d','slots',2,'4afef91d3addb9ce5107abaf3342b9a5','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Dragon-Hatch_rounded_1024.png',NULL,10.00,100000.00,0,1,1,1,0,80,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(82,6,'Chin Shi Huang','chin-shi-huang-24da72b4','slots',2,'24da72b49b0dd0e5cbef9579d09d8981','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Chin-Shi-Huang.png',NULL,10.00,100000.00,0,1,1,1,0,81,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(83,6,'God Of Martial','god-of-martial-21ef8a7d','slots',2,'21ef8a7ddd39836979170a2e7584e333','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/God-Of-Martial.png',NULL,10.00,100000.00,0,1,1,1,0,82,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(84,6,'Hot Chilli','hot-chilli-c845960c','slots',2,'c845960c81d27d7880a636424e53964d','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Hot-Chilli.png',NULL,10.00,100000.00,0,1,1,1,0,83,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(85,6,'Fortune Tree','fortune-tree-6a7e156c','slots',2,'6a7e156ceec5c581cd6b9251854fe504','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Fortune-Tree.png',NULL,10.00,100000.00,0,1,1,1,0,84,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(86,6,'War Of Dragons','war-of-dragons-4b1d7ffa','slots',2,'4b1d7ffaf9f66e6152ea93a6d0e4215b','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/War-Of-Dragons.png',NULL,10.00,100000.00,0,1,1,1,0,85,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(87,6,'Gem Party','gem-party-756cf3c7','slots',2,'756cf3c73a323b4bfec8d14864e3fada','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Gem-Party.png',NULL,10.00,100000.00,0,1,1,1,0,86,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(88,6,'Lucky Ball','lucky-ball-89366989','slots',2,'893669898cd25d9da589a384f1d004df','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Lucky-Ball.png',NULL,10.00,100000.00,0,1,1,1,0,87,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(89,6,'Mafia Mayhem','mafia-mayhem-c7b3016c','slots',2,'c7b3016c70a06ddbb2355a3aee4179d0','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Mafia-Mayhem_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,88,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(90,6,'Werewolf Hunt','werewolf-hunt-2ac70bee','slots',2,'2ac70bee7b47c172381e55f7e644d92e','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Werewolfs-Hunt_icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,89,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(91,6,'Tsar Treasures','tsar-treasures-1eb6a959','slots',2,'1eb6a959aadf0491f4a648762d8d262a','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Tsar-Treasures_icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,90,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(92,6,'Dragon Hatch 2','dragon-hatch-2-910f2568','slots',2,'910f25689073d17680be453d7ed90ce2','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Dragon-Hatch2_icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,91,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(93,6,'Gemstones Gold','gemstones-gold-877c9b2e','slots',2,'877c9b2ec1c5e0505129315948f9bbfa','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Gemstones-Gold_appicon_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,92,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(94,6,'Cash Maniac','cash-maniac-8bbb4136','slots',2,'8bbb41367b3971ed3467c2f0c2627a4','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Cash-Mania_appicon_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,93,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(95,6,'Wild Ape #','wild-ape-2589b93c','slots',2,'2589b93cb0dc46d847864c87ed42a3428bb','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Wild-Ape_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,94,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(96,6,'Pinata Wins','pinata-wins-f08cc025','slots',2,'f08cc025e23ee049b570517867c74be0','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Pinata-Wins_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,95,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(97,6,'Mystic Potion','mystic-potion-e61bde75','slots',2,'e61bde75d590e943d2c5c6d432b29b46','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Mystic-Potion.png',NULL,10.00,100000.00,0,1,1,1,0,96,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(98,6,'Hawaiian Tiki','hawaiian-tiki-35d6743a','slots',2,'35d6743ae5d73a3359f143cbb44ede09','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Hawaiian-Tiki_icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,97,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(99,6,'Bakery Bonanza','bakery-bonanza-d0fe7aa2','slots',2,'d0fe7aa2f7ed5778190b1e60d94e6773','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Bakery-Bonanza_app-Icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,98,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(100,6,'Songkran Splash','songkran-splash-894b1c76','slots',2,'894b1c7609629cf9b3d127d9dbaa372c','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Songkran-Splash_appicon_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,99,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(101,6,'Mystical Spirits','mystical-spirits-3b2d4d1a','slots',2,'3b2d4d1ae24b1c3ad29556a6cf875f11','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Mystical-Spirits_icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,100,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(102,6,'Super Golf Drive','super-golf-drive-d37dde2a','slots',2,'d37dde2adb52e0ea708c0ccd6877b1b3','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Super-Golf-Drive_icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,101,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(103,6,'Lucky Clover Lady','lucky-clover-lady-288f2905','slots',2,'288f290554746bb32322a79b96ecdcbb','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Lucky-Clover-Lady_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,102,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(104,6,'Fruity Candy','fruity-candy-9f2c89ae','slots',2,'9f2c89ae5b7c0894c9ee9e223e3fd9d8','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Fruity-Candy_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,103,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(105,6,'Cruise Royale','cruise-royale-8489d662','slots',2,'8489d662ccc07a2e9677729f76e26ae8','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Cruise-Royale_icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,104,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(106,6,'Safari Wilds','safari-wilds-97c6f05e','slots',2,'97c6f05ef6a0a34cad10d5e00edc909c','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Safari-Wilds_appicon_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,105,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(107,6,'Gladiator\'s Glory','gladiator-s-glory-2454dc7c','slots',2,'2454dc7cfdc651b7318950453bc3f617','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Gladiators-Glory_appicon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,106,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(108,6,'Ninja Racoon Frenzy','ninja-racoon-frenzy-6d1937d2','slots',2,'6d1937d2e7f87306333443c99ac2c03f','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Ninja-Racoon-Frenzy_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,107,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(109,6,'Ultimate Striker','ultimate-striker-4415d83c','slots',2,'4415d83cd9c74299814c1473db83bf7f','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Ultimate-Striker_appicon_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,108,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(110,6,'Mermaid Riches','mermaid-riches-a9d7a5af','slots',2,'a9d7a5af417a94caf554170e6b345e57','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Mermaid-Riches-icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,109,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(111,6,'Raider Jane\'s Crypt of Fortune','raider-jane-s-crypt-of-fortune-24d8e1db','slots',2,'24d8e1dbc5cface0907f5a21ecd56753','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Raider-Janes-Crypt-of-Fortune_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,110,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(112,6,'Supermarket Spree','supermarket-spree-7ef03497','slots',2,'7ef03497fc0b21c34b137e85b1e409cd','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Supermarket-Spree_rounded_1024.png',NULL,10.00,100000.00,0,1,1,1,0,111,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(113,6,'Buffalo Win','buffalo-win-818a7add','slots',2,'818a7add6e10b2ec5f938d7ae0efb04','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Buffalo-Win_icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,112,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(114,6,'Legendary Monkey King','legendary-monkey-king-5cdeba2a','slots',2,'5cdeba2ab48d6ba345b1a4de8e2776b5','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Legendary-Monkey-King_icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,113,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(115,6,'Spirited Wonders','spirited-wonders-87a05c81','slots',2,'87a05c81af5635bed41765bfd076ee15','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Spirited-Wonders_app-icon_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,114,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(116,6,'Emoji Riches','emoji-riches-101ca3ff','slots',2,'101ca3ff83b149dcf3439309e9b32142','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Emoji-Riches_app-Icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,115,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(117,6,'Mask Carnival','mask-carnival-adf297c2','slots',2,'adf297c2666c69b3abc3b61618d593b8','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Mask-Carnival_app-icon_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,116,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(118,6,'Oriental Prosperity','oriental-prosperity-23b43b58','slots',2,'23b43b58e11aadb1f27fd05ba41e9819','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Oriental-Prosperity_icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,117,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(119,6,'Garuda Gems','garuda-gems-aa609892','slots',2,'aa609892f551de2053e92427dc4ae17f','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Garuda-Gems_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,118,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(120,6,'Destiny of Sun & Moon','destiny-of-sun-moon-617ca04f','slots',2,'617ca04ffcffbc543a1a30cacdac98fa','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Destiny-of-Sun-and-Moon_icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,119,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(121,6,'Butterfly Blossom','butterfly-blossom-116989bb','slots',2,'116989bb267a72035bd01818c5496126','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Butterfly-Blossom_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,120,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(122,6,'Rooster Rumble','rooster-rumble-5c371d9f','slots',2,'5c371d9fca6109c954de93ac7986c5db','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Rooster-Rumble_app-icon_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,121,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(123,6,'The Queen\'s Banquet','the-queen-s-banquet-1b317b5f','slots',2,'1b317b5f8bf2ca0cc609307810407426','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/The-Queens-Banquet_icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,122,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(124,6,'Battleground Royale','battleground-royale-e9f92f6e','slots',2,'e9f92f6edc2dac2d08bc345ee036260c','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Battleground-Royale_icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,123,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(125,6,'Win Win Fish Prawn Crab','win-win-fish-prawn-crab-9b344f0b','slots',2,'9b344f0b2a9bda427684be60597d2fc6','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Win-Win-Fish-Prawn-Crab_rounded_1024.png',NULL,10.00,100000.00,0,1,1,1,0,124,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(126,6,'Lucky Piggy','lucky-piggy-66fadac6','slots',2,'66fadac68ed45e23def86c06cc811820','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Lucky-Piggy_icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,125,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(127,6,'Wild Coaster','wild-coaster-a06f1a15','slots',2,'a06f1a154698243bf2484853d38e5fbb','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Wild-Coaster_app-icon_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,126,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(128,6,'Totem Wonders','totem-wonders-a03c6e7a','slots',2,'a03c6e7a918132b50f9caa297df1752d','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Totem-Wonders_icon_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,127,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(129,6,'Alchemy Gold','alchemy-gold-9860c865','slots',2,'9860c865264dcacad1ef37176cdefc1a','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Alchemy-Gold_1024_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,128,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(130,6,'Asgardian Rising','asgardian-rising-08d92dc2','slots',2,'08d92dc2ca14f42c681b44297386d600','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Asgardian-Rising_appicon_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,129,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(131,6,'Midas Fortune','midas-fortune-a2fd6b0c','slots',2,'a2fd6b0cadc8fefccfb0d063b1f81d85','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/pg/Midas-Fortune_appicon_rounded.png',NULL,10.00,100000.00,0,1,1,1,0,130,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(132,6,'Hyper Burst','hyper-burst-a47b1797','slots',2,'a47b17970036b37c1347484cf6956920','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Hyper-Burst.png',NULL,10.00,100000.00,0,1,1,1,0,131,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(133,6,'Shanghai Beauty','shanghai-beauty-795d0cae','slots',2,'795d0cae623cbf34d7f1aa93bbcded28','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Shanghai-Beauty.png',NULL,10.00,100000.00,0,1,1,1,0,132,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(134,6,'Fa Fa Fa','fa-fa-fa-54c41adc','slots',2,'54c41adcf43fdb6d385e38bc09cd77ca','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Fa-Fa-Fa.png',NULL,10.00,100000.00,0,1,1,1,0,133,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(135,6,'Dragon Soar','dragon-soar-9341a18d','slots',2,'9341a18d096ad901ef77338998f29098','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Dragon-Soar.png',NULL,10.00,100000.00,0,1,1,1,0,134,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(136,6,'Pop Pop Candy','pop-pop-candy-fde142e6','slots',2,'fde142e65f14da39f784e9e5325e0a77','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Pop-Pop-Candy.png',NULL,10.00,100000.00,0,1,1,1,0,135,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(137,6,'Open Sesame Mega','open-sesame-mega-cb5e57be','slots',2,'cb5e57be0354264c6c7ea0cdf4eb18b3','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Open-Sesame-Mega.png',NULL,10.00,100000.00,0,1,1,1,0,136,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(138,6,'Fruity Bonanza','fruity-bonanza-f5d6b418','slots',2,'f5d6b418b755f3aefe3b9828f3112c9c','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Fruity-Bonanza.png',NULL,10.00,100000.00,0,1,1,1,0,137,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(139,6,'Caishen Coming','caishen-coming-45ecec5d','slots',2,'45ecec5dd5077785e7a09988b95bbd24','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Caishen-Coming.png',NULL,10.00,100000.00,0,1,1,1,0,138,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(140,6,'Coocoo Farm','coocoo-farm-d1f17fd5','slots',2,'d1f17fd51e474b0e72892332ea551ba1','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Coocoo-Farm.png',NULL,10.00,100000.00,0,1,1,1,0,139,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(141,6,'Elemental Link Water','elemental-link-water-b84274cd','slots',2,'b84274cdfa5731945a34bfd0db1ddeea','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Elemental-Link-Water.png',NULL,10.00,100000.00,0,1,1,1,0,140,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(142,6,'Elemental Link Fire','elemental-link-fire-46016a77','slots',2,'46016a772b92c7f47dfdc5873f184ef1','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Elemental-Link-Fire.png',NULL,10.00,100000.00,0,1,1,1,0,141,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(143,6,'Birdsparty Deluxe','birdsparty-deluxe-786d1cd7','slots',2,'786d1cd7f4fa9905c825378292f1204c','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Birdsparty-Deluxe.png',NULL,10.00,100000.00,0,1,1,1,0,142,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(144,6,'Moneybags Man 2','moneybags-man-2-33c862e7','slots',2,'33c862e7db9e0e59ab3f8fe770f797da','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Moneybags-Man-2.png',NULL,10.00,100000.00,0,1,1,1,0,143,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(145,6,'JumpHigh','jumphigh-630a841b','slots',2,'630a841b4cf75a38e2e657040f785e63','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/cq9/JumpHigh.png',NULL,10.00,100000.00,0,1,1,1,0,144,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(146,6,'Rave Jump','rave-jump-b602205d','slots',2,'b602205d6a56d999df188e17ecc2bc91','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/cq9/Rave-Jump.png',NULL,10.00,100000.00,0,0,1,1,0,145,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(147,6,'Jump High 2','jump-high-2-8d57ec62','slots',2,'8d57ec6274960fe2f2c252f4a49adf7f','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/cq9/Jump-High-2.png',NULL,10.00,100000.00,0,1,1,1,0,146,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(148,6,'Jumping Mobile','jumping-mobile-1282953e','slots',2,'1282953e9452fe2852cb1724b4b9d617','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/cq9/Jumping-mobile.png',NULL,10.00,100000.00,0,1,1,1,0,147,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(149,6,'Good Fortune M','good-fortune-m-50568ba2','slots',2,'50568ba2a8da9f30dded83dbbd3655d6','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/cq9/Good-Fortune-M.png',NULL,10.00,100000.00,0,1,1,1,0,148,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(150,6,'God of War','god-of-war-f4b6484d','slots',2,'f4b6484dc2b96fc339604446cd042534','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/cq9/God-of-War.png',NULL,10.00,100000.00,0,1,1,1,0,149,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(151,6,'FlyOut','flyout-afddbebb','slots',2,'afddbebb27c4b7408bda624aa9354aa7','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/cq9/FlyOut.png',NULL,10.00,100000.00,0,1,1,1,0,150,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(152,6,'Emperor Qin','emperor-qin-d58b1c2d','slots',2,'d58b1c2dd6456da42b2c1a33c70c1630','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-emperorqin.png',NULL,10.00,100000.00,0,1,1,1,0,151,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(153,6,'Cracker','cracker-b6668f2a','slots',2,'b6668f2abcfff3f7f78ae92fe908f99f','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-cracker.png',NULL,10.00,100000.00,0,1,1,1,0,152,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(154,6,'FaFaFa','fafafa-017c1ede','slots',2,'017c1edeaf54d4684d675055c44a6f7e','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-fafafa.png',NULL,10.00,100000.00,0,1,1,1,0,153,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(155,6,'Gold Toad','gold-toad-65415580','slots',2,'654155802c34cee717e943c4e2bb6bfe','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-goldtoad.png',NULL,10.00,100000.00,0,1,1,1,0,154,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(156,6,'Lion Legend','lion-legend-eb8dd621','slots',2,'eb8dd621ea38d742ff846362a9b1085d','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-lionlegend.png',NULL,10.00,100000.00,0,1,1,1,0,155,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(157,6,'Goblin\'s Gold','goblin-s-gold-69799380','slots',2,'697993800419bf160901aa9133cde524','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-goblingold.png',NULL,10.00,100000.00,0,1,1,1,0,156,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(158,6,'The Unsurpassed Grace','the-unsurpassed-grace-bf0ae3c4','slots',2,'bf0ae3c404807429451d088725ae5377','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-theunsurpassedgrace.png',NULL,10.00,100000.00,0,1,1,1,0,157,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(159,6,'Arctic King','arctic-king-8249b0e7','slots',2,'8249b0e703ceb0816f3645dbac0a83ce','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-arcticking.png',NULL,10.00,100000.00,0,1,1,1,0,158,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(160,6,'Jalapeno','jalapeno-f23ad5ac','slots',2,'f23ad5acc6c690a45f1280ba49d28266','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-jalapeno.png',NULL,10.00,100000.00,0,1,1,1,0,159,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(161,6,'Ice Age Mammoths','ice-age-mammoths-484025f2','slots',2,'484025f23c821e32fc6ac31ff75613d6','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/yesgaming/ht-iceagemammoths.png',NULL,10.00,100000.00,0,1,1,1,0,160,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(162,6,'Cracker','cracker-4415afc3','slots',2,'4415afc357ffd90adfae34b7fc3217d0','Slot Game','https://dl.kz344.net/game-icon/agg_ht-cracker.png',NULL,10.00,100000.00,0,1,1,1,0,161,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(163,6,'EstateRichman','estaterichman-99aa4072','slots',2,'99aa40727eebf03285f0b41492ad3200','Slot Game','https://dl.kz344.net/game-icon/agg_ht-estaterichman.png',NULL,10.00,100000.00,0,1,1,1,0,162,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(164,6,'CaribbeanTreasure','caribbeantreasure-186ceb14','slots',2,'186ceb140e9248012244381fc169640b','Slot Game','https://dl.kz344.net/game-icon/agg_ht-caribbeantreasure.png',NULL,10.00,100000.00,0,1,1,1,0,163,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(165,6,'LittleWitch','littlewitch-f41dd1fa','slots',2,'f41dd1fabc4700025036ffd090358402','Slot Game','https://dl.kz344.net/game-icon/agg_ht-thelittlewitch.png',NULL,10.00,100000.00,0,1,1,1,0,164,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(166,6,'FlameWolves','flamewolves-6ed7442a','slots',2,'6ed7442a8144c29321d95168ef6cb3de','Slot Game','https://dl.kz344.net/game-icon/agg_ht-flamewolves.png',NULL,10.00,100000.00,0,1,1,1,0,165,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(167,6,'PersianEmpire','persianempire-b4a0d38b','slots',2,'b4a0d38bac2760d3b2539430b3d65c6b','Slot Game','https://dl.kz344.net/game-icon/agg_ht-persianempire.png',NULL,10.00,100000.00,0,1,1,1,0,166,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(168,6,'Heracles','heracles-3be4c3ab','slots',2,'3be4c3abed248df43bee04af55c7894e','Slot Game','https://dl.kz344.net/game-icon/agg_ht-heracles.png',NULL,10.00,100000.00,0,1,1,1,0,167,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(169,6,'Poseidon','poseidon-7b5698f1','slots',2,'7b5698f1ab2aef819bea060ae5836c6d','Slot Game','https://dl.kz344.net/game-icon/agg_ht-poseidon.png',NULL,10.00,100000.00,0,1,1,1,0,168,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(170,6,'GoldenMaitreya','goldenmaitreya-19565e4f','slots',2,'19565e4f0152c29bc3c05d44ffe316d2','Slot Game','https://dl.kz344.net/game-icon/agg_ht-goldenmaitreya.png',NULL,10.00,100000.00,0,1,1,1,0,169,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(171,6,'GoldenWuZeTian','goldenwuzetian-e5e9c0ea','slots',2,'e5e9c0eae20cdecc45c9287b93e00d4d','Slot Game','https://dl.kz344.net/game-icon/agg_ht-goldenwuzetian.png',NULL,10.00,100000.00,0,1,1,1,0,170,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(172,6,'Sweet Land','sweet-land-91250a55','slots',2,'91250a55f75a3c67ed134b99bf587225','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Sweet-Land.png',NULL,10.00,100000.00,0,1,1,1,0,171,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(173,6,'Cricket King 18','cricket-king-18-dcf220f4','slots',2,'dcf220f4e3ecca0278911a55e6f11c77','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Cricket-King-18.png',NULL,10.00,100000.00,0,1,1,1,0,172,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(174,6,'Elf Bingo','elf-bingo-5cec2b30','slots',2,'5cec2b309a8845b38f8e9b4e6d649ea2','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Elf-Bingo.png',NULL,10.00,100000.00,0,1,1,1,0,173,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(175,6,'Cricket Sah 75','cricket-sah-75-6720a0ce','slots',2,'6720a0ce1d06648ff390fbea832798a9','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Cricket-Sah-75.png',NULL,10.00,100000.00,0,1,1,1,0,174,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(176,6,'Golden Temple','golden-temple-976c5497','slots',2,'976c5497256c020ac012005f6bb166ad','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Golden-Temple.png',NULL,10.00,100000.00,0,1,1,1,0,175,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(177,6,'Devil Fire','devil-fire-1b4c5865','slots',2,'1b4c5865131b4967513c1ee90cba4472','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Devil-Fire.png',NULL,10.00,100000.00,0,1,1,1,0,176,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(178,6,'Bangla Beauty','bangla-beauty-6b60d159','slots',2,'6b60d159f0939a45f7b4c88a9b57499a','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Bangla-Beauty.png',NULL,10.00,100000.00,0,1,1,1,0,177,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(179,6,'Aztec Priestess','aztec-priestess-6acff19b','slots',2,'6acff19b2d911a8c695ba24371964807','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Aztec-Priestess.png',NULL,10.00,100000.00,0,1,1,1,0,178,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(180,6,'Fortune Monkey','fortune-monkey-add95fc4','slots',2,'add95fc40f1ef0d56f5716ce45a56946','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Fortune-Monkey.png',NULL,10.00,100000.00,0,1,1,1,0,179,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(181,6,'Dabanggg','dabanggg-5404a45b','slots',2,'5404a45b06826911c3537fdf935c281f','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Dabanggg.png',NULL,10.00,100000.00,0,1,1,1,0,180,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(182,6,'Sin City','sin-city-830cac2f','slots',2,'830cac2f5da6cc1fb91cfae04b85b1e2','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Sin-City.png',NULL,10.00,100000.00,0,1,1,1,0,181,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(183,6,'King Arthur','king-arthur-fafab1a1','slots',2,'fafab1a17a237d0fc0e50c20d2c2bf4c','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/King-Arthur.png',NULL,10.00,100000.00,0,1,1,1,0,182,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(184,6,'Charge Buffalo Ascent','charge-buffalo-ascent-28bc4a33','slots',2,'28bc4a33c985ddce6acd92422626b76f','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Charge-Buffalo-Ascent.png',NULL,10.00,100000.00,0,1,1,1,0,183,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(185,6,'Witches Night','witches-night-82c5c404','slots',2,'82c5c404cf4c0790deb42a2b5653533c','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Witches-Night.png',NULL,10.00,100000.00,0,1,1,1,0,184,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(186,6,'Mega Ace','mega-ace-eba92b1d','slots',2,'eba92b1d3abd5f0d37dfbe112abdf0e2','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Mega-Ace.png',NULL,10.00,100000.00,0,0,1,1,0,185,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(187,6,'Medusa','medusa-2c17b7c4','slots',2,'2c17b7c4e2ce5b8bebf4bd10e3e958d7','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Medusa.png',NULL,10.00,100000.00,0,1,1,1,0,186,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(188,6,'Book of Gold','book-of-gold-6b283c43','slots',2,'6b283c434fd44250d83b7c2420f164f9','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Book-of-Gold.png',NULL,10.00,100000.00,0,1,1,1,0,187,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(189,6,'Thor X','thor-x-7e6aa773','slots',2,'7e6aa773fa802aaa9cb1f2fac464736e','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Thor-X.png',NULL,10.00,100000.00,0,1,1,1,0,188,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(190,6,'Happy Taxi','happy-taxi-1ed896aa','slots',2,'1ed896aae4bdc78c984021307b1dd177','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Happy-Taxi.png',NULL,10.00,100000.00,0,1,1,1,0,189,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(191,6,'Gold Rush','gold-rush-2a5d731e','slots',2,'2a5d731e0fd60f52873a24ece11f2c0b','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Gold-Rush.png',NULL,10.00,100000.00,0,1,1,1,0,190,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(192,6,'Mayan Empire','mayan-empire-5c2383ef','slots',2,'5c2383ef253f9c36dacec4b463d61622','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Mayan-Empire.png',NULL,10.00,100000.00,0,1,1,1,0,191,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(193,6,'Crazy Pusher','crazy-pusher-00d92d5c','slots',2,'00d92d5cec10cf85623938222a6c2bb6','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Crazy-Pusher.png',NULL,10.00,100000.00,0,1,1,1,0,192,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(194,6,'Bone Fortune','bone-fortune-aab3048a','slots',2,'aab3048abc6a88e0759679fbe26e6a8d','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Bone-Fortune.png',NULL,10.00,100000.00,0,1,1,1,0,193,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(195,6,'JILI CAISHEN','jili-caishen-11e330c2','slots',2,'11e330c2b23f106815f3b726d04e4316','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/JILI-CAISHEN.png',NULL,10.00,100000.00,0,1,1,1,0,194,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(196,6,'Bonus Hunter','bonus-hunter-39775cdc','slots',2,'39775cdc4170e56c5f768bdee8b4fa00','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Bonus-Hunter.png',NULL,10.00,100000.00,0,1,1,1,0,195,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(197,6,'World Cup','world-cup-28374b7a','slots',2,'28374b7ad7c91838a46404f1df046e5a','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/World-Cup.png',NULL,10.00,100000.00,0,1,1,1,0,196,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(198,6,'Samba','samba-6d35789b','slots',2,'6d35789b2f419c1db3926350d57c58d8','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Samba.png',NULL,10.00,100000.00,0,1,1,1,0,197,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(199,6,'Neko Fortune','neko-fortune-9a391758','slots',2,'9a391758f755cb30ff973e08b2df6089','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Neko-Fortune.png',NULL,10.00,100000.00,0,1,1,1,0,198,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(200,6,'Wild Racer','wild-racer-2f0c5f96','slots',2,'2f0c5f96cda3c6e16b3929dd6103df8e','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Wild-Racer.png',NULL,10.00,100000.00,0,1,1,1,0,199,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(201,6,'Pirate Queen','pirate-queen-70999d5b','slots',2,'70999d5bcf2a1d1f1fb8c82e357317f4','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Pirate-Queen.png',NULL,10.00,100000.00,0,1,1,1,0,200,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(202,6,'Golden Joker','golden-joker-f301fe0b','slots',2,'f301fe0b22d1540b1f215d282b20c642','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Golden-Joker.png',NULL,10.00,100000.00,0,1,1,1,0,201,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(203,6,'Wild Ace','wild-ace-9a3b65e2','slots',2,'9a3b65e2ae5343df349356d548f3fc4b','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Wild-Ace.png',NULL,10.00,100000.00,0,1,1,1,0,202,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(204,6,'Master Tiger','master-tiger-d2b48fe9','slots',2,'d2b48fe98ac2956eeefd2bc4f7e0335a','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Master-Tiger.png',NULL,10.00,100000.00,0,1,1,1,0,203,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(205,6,'Fortune Gems 2','fortune-gems-2-664fba4d','slots',2,'664fba4da609ee82b78820b1f570f4ad','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Fortune-Gems-2.png',NULL,10.00,100000.00,0,1,1,1,0,204,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(206,6,'Fortune Gems','fortune-gems-a990de17','slots',2,'a990de177577a2e6a889aaac5f57b429','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Fortune-Gems.png',NULL,10.00,100000.00,0,1,1,1,0,205,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(207,6,'Crazy Hunter','crazy-hunter-69082f28','slots',2,'69082f28fcd46cbfd10ce7a0051f24b6','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Crazy-Hunter.png',NULL,10.00,100000.00,0,1,1,1,0,206,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(208,6,'Party Night','party-night-d505541d','slots',2,'d505541d522aa5ca01fc5e97cfcf2116','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Party-Night.png',NULL,10.00,100000.00,0,1,1,1,0,207,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(209,6,'Magic Lamp','magic-lamp-582a5879','slots',2,'582a58791928760c28ec4cef3392a49f','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Magic-Lamp.png',NULL,10.00,100000.00,0,1,1,1,0,208,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(210,6,'Agent Ace','agent-ace-8a4b4929','slots',2,'8a4b4929e796fda657a2d38264346509','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Agent-Ace.png',NULL,10.00,100000.00,0,1,1,1,0,209,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(211,6,'TWIN WINS','twin-wins-c74b3cbd','slots',2,'c74b3cbda5d16f77523e41c25104e602','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/TWIN-WINS.png',NULL,10.00,100000.00,0,1,1,1,0,210,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(212,6,'Ali Baba','ali-baba-cc686634','slots',2,'cc686634b4f953754b306317799f1f39','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Ali-Baba.png',NULL,10.00,100000.00,0,1,1,1,0,211,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(213,6,'SevenSevenSeven','sevensevenseven-61d46add','slots',2,'61d46add6841aad4758288d68015eca6','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/SevenSevenSeven.png',NULL,10.00,100000.00,0,1,1,1,0,212,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(214,6,'Bubble Beauty','bubble-beauty-a78d2ed9','slots',2,'a78d2ed972aab8ba06181cc43c54a425','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Bubble-Beauty.png',NULL,10.00,100000.00,0,1,1,1,0,213,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(215,6,'FortunePig','fortunepig-8488c76e','slots',2,'8488c76ee2afb8077fbd7eec62721215','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/FortunePig.png',NULL,10.00,100000.00,0,1,1,1,0,214,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(216,6,'Crazy777','crazy777-8c62471f','slots',2,'8c62471fd4e28c084a61811a3958f7a1','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Crazy777.png',NULL,10.00,100000.00,0,1,1,1,0,215,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(217,6,'Bao boon chin','bao-boon-chin-8c4ebb3d','slots',2,'8c4ebb3dc5dcf7b7fe6a26d5aadd2c3d','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Bao-boon-chin.png',NULL,10.00,100000.00,0,1,1,1,0,216,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(218,6,'Night City','night-city-78e29705','slots',2,'78e29705f7c6084114f46a0aeeea1372','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Night-City.png',NULL,10.00,100000.00,0,1,1,1,0,217,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(219,6,'Fengshen','fengshen-09699fd0','slots',2,'09699fd0de13edbb6c4a194d7494640b','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Fengshen.png',NULL,10.00,100000.00,0,1,1,1,0,218,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(220,6,'Crazy FaFaFa','crazy-fafafa-a57a8d51','slots',2,'a57a8d5176b54d4c825bd1eee8ab34df','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Crazy-FaFaFa.png',NULL,10.00,100000.00,0,1,1,1,0,219,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(221,6,'XiYangYang','xiyangyang-5a962d0e','slots',2,'5a962d0e31e0d4c0798db5f331327e4f','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/XiYangYang.png',NULL,10.00,100000.00,0,1,1,1,0,220,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(222,6,'DiamondParty','diamondparty-48d598e9','slots',2,'48d598e922e8c60643218ccda302af08','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/DiamondParty.png',NULL,10.00,100000.00,0,1,1,1,0,221,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(223,6,'Golden Bank','golden-bank-c3f86b78','slots',2,'c3f86b78938eab1b7f34159d98796e88','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Golden-Bank.png',NULL,10.00,100000.00,0,1,1,1,0,222,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(224,6,'Dragon Treasure','dragon-treasure-c6955c14','slots',2,'c6955c14f6c28a6c2a0c28274fec7520','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Dragon-Treasure.png',NULL,10.00,100000.00,0,1,1,1,0,223,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(225,6,'Charge Buffalo','charge-buffalo-984615c9','slots',2,'984615c9385c42b3dad0db4a9ef89070','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Charge-Buffalo.png',NULL,10.00,100000.00,0,1,1,1,0,224,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(226,6,'Lucky Goldbricks','lucky-goldbricks-d84ef530','slots',2,'d84ef530121953240116e3b2e93f6af4','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Lucky-Goldbricks.png',NULL,10.00,100000.00,0,1,1,1,0,225,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(227,6,'Super Ace','super-ace-bdfb23c9','slots',2,'bdfb23c974a2517198c5443adeea77a8','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Super-Ace.png',NULL,10.00,100000.00,0,1,1,1,0,226,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(228,6,'Money Coming','money-coming-db249def','slots',2,'db249defce63610fccabfa829a405232','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Money-Coming.png',NULL,10.00,100000.00,0,1,1,1,0,227,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(229,6,'Golden Queen','golden-queen-8de99455','slots',2,'8de99455c2f23f6827666fd798eb80ef','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Golden-Queen.png',NULL,10.00,100000.00,0,1,1,1,0,228,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(230,6,'Jungle King','jungle-king-4db0ec24','slots',2,'4db0ec24ff55a685573c888efed47d7f','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Jungle-King.png',NULL,10.00,100000.00,0,1,1,1,0,229,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(231,6,'Monkey Party','monkey-party-fd369a4a','slots',2,'fd369a4a7486ff303beea267ec5c8eff','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Monkey-Party.png',NULL,10.00,100000.00,0,1,1,1,0,230,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(232,6,'Fortune Neko','fortune-neko-49b706cc','slots',2,'49b706ccfe7c53727ee6760cd9a8721a','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Fortune-Neko.png',NULL,10.00,100000.00,0,1,1,1,0,231,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(233,6,'Book Of Mystery','book-of-mystery-13072a6e','slots',2,'13072a6eb2111c1b5202fe6155227e94','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Book-Of-Mystery.png',NULL,10.00,100000.00,0,1,1,1,0,232,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(234,6,'Prosperitytiger','prosperitytiger-1d704bbb','slots',2,'1d704bbb187a113229f3fdaa3b5406fe','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Prosperitytiger.png',NULL,10.00,100000.00,0,1,1,1,0,233,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(235,6,'Glamorous Girl','glamorous-girl-2663e14e','slots',2,'2663e14e5b455525252a25d9bd99e840','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Glamorous-Girl.png',NULL,10.00,100000.00,0,1,1,1,0,234,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(236,6,'Blossom Of Wealth','blossom-of-wealth-ed6fbaeb','slots',2,'ed6fbaeb7a104dd7ed96fa1683a48669','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Blossom-Of-Wealth.png',NULL,10.00,100000.00,0,1,1,1,0,235,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(237,6,'Boom Fiesta','boom-fiesta-1ffb31ff','slots',2,'1ffb31ff605f1a7862a138f5cd712056','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Boom-Fiesta.png',NULL,10.00,100000.00,0,1,1,1,0,236,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(238,6,'Big Three Dragons','big-three-dragons-600c338d','slots',2,'600c338d3fca2da208f1bba2c9d29059','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Big-Three-Dragons.png',NULL,10.00,100000.00,0,1,1,1,0,237,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(239,6,'Mayagoldcrazy','mayagoldcrazy-6c8009d1','slots',2,'6c8009d165293759bb218b72ba3c380f','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Mayagoldcrazy.png',NULL,10.00,100000.00,0,1,1,1,0,238,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(240,6,'Lantern Wealth','lantern-wealth-f2f2eae3','slots',2,'f2f2eae301311f0320ef669b68935546','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Lantern-Wealth.png',NULL,10.00,100000.00,0,1,1,1,0,239,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(241,6,'Marvelous Iv','marvelous-iv-126cf2bf','slots',2,'126cf2bfe8a8e606b362d23de02c0d5e','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Marvelous-Iv.png',NULL,10.00,100000.00,0,1,1,1,0,240,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(242,6,'Wonder Elephant','wonder-elephant-540da2ba','slots',2,'540da2ba4c849fc1c315f43ae74df220','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Wonder-Elephant.png',NULL,10.00,100000.00,0,1,1,1,0,241,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(243,6,'Lucky Diamond','lucky-diamond-6f6867ad','slots',2,'6f6867ad1956a04b174c92629cab7f54','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Lucky-Diamond.png',NULL,10.00,100000.00,0,1,1,1,0,242,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(244,6,'Spindrift 2','spindrift-2-5dc8c7a4','slots',2,'5dc8c7a43305c3fcb43574c570d6378','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Spindrift-2.png',NULL,10.00,100000.00,0,1,1,1,0,243,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(245,6,'Jungle Jungle','jungle-jungle-6c5fe548','slots',2,'6c5fe548bd6e09b683566298b29510ea','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Jungle-Jungle.png',NULL,10.00,100000.00,0,1,1,1,0,244,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(246,6,'Dragons Gate','dragons-gate-feaba603','slots',2,'feaba603992f26633116fb54562e3693','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Dragons-Gate.png',NULL,10.00,100000.00,0,1,1,1,0,245,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(247,6,'Spindrift','spindrift-b624d191','slots',2,'b624d1917ef5a740c151e4904a7cf0dd','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Spindrift.png',NULL,10.00,100000.00,0,1,1,1,0,246,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(248,6,'Double Wilds','double-wilds-7bd5233c','slots',2,'7bd5233c83de0669336ee649e6c8d2b5','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Double-Wilds.png',NULL,10.00,100000.00,0,1,1,1,0,247,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(249,6,'Moneybags Man','moneybags-man-c4fdebb2','slots',2,'c4fdebb24ff26fffb3a65d018da8ae92','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Moneybags-Man.png',NULL,10.00,100000.00,0,1,1,1,0,248,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(250,6,'Miner Babe','miner-babe-e705514f','slots',2,'e705514fdd4f9bea5f82bbd0b2c0a353','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Miner-Babe.png',NULL,10.00,100000.00,0,1,1,1,0,249,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(251,6,'Super Niubi Deluxe','super-niubi-deluxe-5d940d11','slots',2,'5d940d11c48b64ec1e6a3c8be5228250','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Super-Niubi-Deluxe.png',NULL,10.00,100000.00,0,1,1,1,0,250,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(252,6,'Funky King Kong','funky-king-kong-cdea2d06','slots',2,'cdea2d0670bc40309b4a9b6f942a218a','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Funky-King-Kong.png',NULL,10.00,100000.00,0,1,1,1,0,251,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(253,6,'Golden Disco','golden-disco-dfb8a198','slots',2,'dfb8a198ce0e821560cf543387a2acc2','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Golden-Disco.png',NULL,10.00,100000.00,0,1,1,1,0,252,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(254,6,'Treasure Bowl','treasure-bowl-0651af3e','slots',2,'0651af3e73c7600633522ffe15cc175b','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Treasure-Bowl.png',NULL,10.00,100000.00,0,1,1,1,0,253,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(255,6,'Mjolnir','mjolnir-e270f067','slots',2,'e270f0674dff538b181499d18ab47845','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Mjolnir.png',NULL,10.00,100000.00,0,1,1,1,0,254,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(256,6,'Pirate Treasure','pirate-treasure-bfb3241e','slots',2,'bfb3241e64953f731e72bc833f2fa79a','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Pirate-Treasure.png',NULL,10.00,100000.00,0,1,1,1,0,255,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(257,6,'Fortune Treasure','fortune-treasure-5a55a19d','slots',2,'5a55a19d9cfbead5e64b8169e96bd27a','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Fortune-Treasure.png',NULL,10.00,100000.00,0,1,1,1,0,256,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(258,6,'Egypt Treasure','egypt-treasure-b7f39e86','slots',2,'b7f39e861e2e02633cb5cb08958f1041','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Egypt-Treasure.png',NULL,10.00,100000.00,0,1,1,1,0,257,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(259,6,'Super Niubi','super-niubi-4042e5d0','slots',2,'4042e5d0c777e1d3c3bd481dac0a867e','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Super-Niubi.png',NULL,10.00,100000.00,0,1,1,1,0,258,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(260,6,'Dragons World','dragons-world-00b88680','slots',2,'00b886803f3d067f7028872468e84745','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Dragons-World.png',NULL,10.00,100000.00,0,1,1,1,0,259,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(261,6,'Go Lai Fu','go-lai-fu-a3584394','slots',2,'a3584394182e8abce362d90c2f048c75','Slot Game','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jdb/Go-Lai-Fu.png',NULL,10.00,100000.00,0,1,1,1,0,260,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(262,7,'SABA Sports','saba-sports-08ced9dd','sports',4,'08ced9dd788aed11ff3c7f387ae0f063','Sport','https://ossimg.tirangaagent.com/Tiranga/vendorlogo/vendorlogo_20240814202959vsy1.png',NULL,10.00,100000.00,0,1,1,1,0,261,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(263,2,'Esports','esports-4ee8e005','virtual_sports',8,'4ee8e0051a035b463b47c3c473ce317d','SportsGame','https://i.postimg.cc/FHHg66F4/Screenshot-2025-03-21-153241.png',NULL,10.00,100000.00,0,1,1,1,0,262,0,'2026-06-26 06:58:40','2026-09-14 18:05:03'),
(264,8,'Bhagyathara','bhagyathara-1','slots',2,'1','lottery','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS3QD-Oy8_XcjfMm_D6--_kQ0gXCzDSZxjEEw&s',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-07-15 11:09:42','2026-09-14 18:05:03'),
(265,8,'Sthree Sakthi','sthreep-sakthi','slots',2,'2','lottery','https://img.mathrubhumi.com/view/acePublic/alias/contentid/1omugj5ir8q4ogz5xyo/0/sthree-sakthi-lottery.webp?f=3%3A2&q=0.75&w=900',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-07-15 11:30:29','2026-09-14 18:05:03'),
(266,9,'Cockfight','cockfight-c084','slots',2,'8cc99bed98c7adbe84bdaf7a8ad0c084','cockfighting','https://store-images.s-microsoft.com/image/apps.441.13510798887503449.ea1c2ebf-90f3-409c-901c-2b814aeecb2f.4e0134f0-c35b-4920-a0d0-9b2397d59b2f',96.50,10.00,100000.00,0,1,1,1,0,0,1,'2026-07-15 11:41:26','2026-09-14 18:05:03'),
(267,9,'WCC','wcc-358a','slots',2,'475a85119e0133e7b790be265fa9358a',NULL,'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTo1zKMuhtsXWdj2IP2oxmQ6BHvTX3ZgYo9Ew&s',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-07-15 11:43:53','2026-09-14 18:05:03'),
(268,9,'WGC','wgc-78ee','slots',2,'304947ef77b76b16f2064932d72c78ee',NULL,'https://play-lh.googleusercontent.com/XUD4scTtRUfJc8JpS0dazSKsf4Y4jAMlvfhzA4X0ASD5oUTbnj9IFot7RzmDP8oyXA',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-07-15 11:45:26','2026-09-14 18:05:03'),
(269,7,'Luck Sports','luck-sports-c24e4','sports',4,'92b24e4c25107367a80e0fe1a97c24e4',NULL,'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/LuckySports/Lucky Sports_Logo 01.jpg',96.50,10.00,100000.00,0,1,1,1,0,0,6,'2026-07-15 12:08:53','2026-09-14 18:05:03'),
(270,8,'Dhanalekshmi','dhanalekshmi','lottery',5,'3','lottery','https://images.etnownews.com/thumb/msid-153261580,updatedat-1765363887142,width-1280,height-720,resizemode-75/153261580.jpg',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-07-15 12:11:39','2026-09-14 18:05:03'),
(271,8,'Karunya Plus','karunya-plus','lottery',5,'4',NULL,'https://images.goodreturns.in/img/2025/07/keralalotterykarunyaplus600-1752142970.jpg',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-07-15 13:14:33','2026-09-14 18:05:03'),
(272,8,'Suvarana Keralam','suvarana-keralam-5','slots',2,'5',NULL,'https://www.thestatesman.com/wp-content/uploads/2026/04/Kerala-lottery-Suvarna-Keralam-SK-50-result-today-April-24-2026-Check-complete-list-of-winners-1024x576.webp',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-07-15 13:20:49','2026-09-14 18:05:03'),
(273,8,'Karunya','Karunya-6','lottery',5,'6',NULL,'https://img.etimg.com/thumb/width-1200,height-1200,imgsize-622196,resizemode-75,msid-130974147/news/new-updates/kerala-lottery-result-today-karunya-kr-753-may-9-2026-rs-1-crore-first-prize-rs-25-lakh-and-rs-10-lakh-winners-check-full-list.jpg',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-07-15 13:31:33','2026-09-14 18:05:03'),
(274,8,'Samrudhi','samrudhi-7','lottery',5,'7',NULL,'https://i.ytimg.com/vi/2LKuwIwZMyk/sddefault.jpg',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-07-15 13:33:17','2026-09-14 18:05:03'),
(275,5,'Aero','aero-98bd','fantasy',7,'cccdf7fc199f5c5b917a741c828398bd',NULL,'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWi9lhzmHHuvCenzA7b_1AF_2NuVXHZKPnEA&s',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-07-16 08:52:17','2026-09-14 18:05:03'),
(276,6,'Wheel','wheel-8c80','slots',2,'6e19e03c50f035ddd9ffd804c30f8c80',NULL,'https://ossimg.tirangaagent.com/Tiranga/gamelogo/JILI/229.png',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-07-16 08:55:17','2026-09-14 18:05:03'),
(277,5,' Pool Rummy',' pool-rummy-0b30','live_casino',3,'43e7df819bf57722a8917bb328640b30','poker','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/jili/Pool-Rummy.png',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-07-16 11:47:47','2026-09-14 18:05:03'),
(278,4,'Lightning Roulette','lightning-roulete-98c7','slots',2,'4a858d6b74c05260d3ea2762838798c7',NULL,'https://i.postimg.cc/HLRHXq7m/7611-lightning-roulette.webp',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-07-17 13:44:20','2026-09-14 18:05:03'),
(279,4,'Speed Roulette','speed-roulette-8ff6','slots',2,'b4af506243cafae52908e8fa266f8ff6',NULL,'https://i.postimg.cc/4yfmVQbc/speed-roulette.jpg',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-07-17 13:52:57','2026-09-14 18:05:03'),
(280,4,'Power Blackjack','power-blackjack','live_casino',3,'1d1c0d3ec98deb128bdd5acdef0f157e','blackjack','https://i.postimg.cc/VNM9VrFD/power-blackjack-pid-11.jpg',96.50,10.00,100000.00,0,1,1,1,0,0,5,'2026-07-17 13:55:55','2026-09-14 18:05:03'),
(281,NULL,'Infinite blackjack ','infinite-blackjack-88f4','slots',2,'58d7089aa20bce7f70e0e2ce81e888f4',NULL,'https://i.postimg.cc/26YBzZyd/infinite-blackjack-poster-600x840.jpg',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-07-17 14:00:43','2026-09-14 18:05:03'),
(282,4,'Blackjack Silver ','blackjack-silver','live_casino',3,'8de1993b371ce298b85584d21e5d2106','casino','https://i.postimg.cc/MHmyVYM6/blackjack-silver-b.webp',96.50,10.00,100000.00,0,1,1,1,0,0,8,'2026-07-17 14:02:03','2026-09-14 18:05:03'),
(283,4,'Immersive Roulette','immersive-roulette','live_casino',3,'3b43390eebe1f1a84b15f1251a253b24',NULL,'https://i.postimg.cc/G2nmFn1L/immersive-roulette-poster-600x840.jpg',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-07-17 14:19:20','2026-09-14 18:05:03'),
(284,4,'Baccarat B','baccarat-b-ca33e1d','live_casino',3,'0ea8519b837ebd62f5a8978acca33e1d',NULL,'https://i.postimg.cc/k4tt9PxR/baccat-b.jpg',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-07-17 14:20:40','2026-09-14 18:05:03'),
(285,4,'First Person Lightning Baccarat','first-person-lightning-baccarat','live_casino',3,'fec1b730e804bf14bd471a1e9b82bf44',NULL,'https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/evoplay/First%20Person%20Lightning%20Baccarat.png',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-07-17 14:22:18','2026-09-14 18:05:03'),
(287,4,'Crazy Pachinko','crazy-pachinko-911a32ad','live_casino',3,'911a32ad38d77f86baf29a2cdb95da05','CasinoLive','https://i.postimg.cc/43XCBf8k/Crazy-Pachinko.jpg',96.50,10.00,100000.00,0,1,1,1,0,9,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(288,4,'Football Studio Dice','football-studio-dice-1909b4e3','live_casino',3,'1909b4e3380dc37654f8e3997e63ec1b','CasinoLive','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/evoplay/Football%20Studio%20Dice.png',96.50,10.00,100000.00,0,1,1,1,0,29,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(289,4,'Fan Tan','fan-tan-5cb6aa4e','live_casino',3,'5cb6aa4e2ce1c775c568561401ffdfca','CasinoLive','https://i.postimg.cc/Y25PrDRM/fan-tan.jpg',96.50,10.00,100000.00,0,1,1,1,0,10,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(290,4,'Craps','craps-689dd8e8','live_casino',3,'689dd8e8f17dae910dba9fdd4990d41e','CasinoLive','https://i.postimg.cc/pLbMSX3b/craps.jpg',96.50,10.00,100000.00,0,1,1,1,0,12,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(291,4,'Dead or Alive: Saloon','dead-or-alive-saloon-eda1a2c5','live_casino',3,'eda1a2c5edb8370f8df58dcf8e1381b9','CasinoLive','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/evoplay/Dead or Alive: Saloon.png',96.50,10.00,100000.00,0,1,1,1,0,20,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(292,4,'Caribbean Stud Poker','caribbean-stud-poker-724eebd5','live_casino',3,'724eebd5cbe7555b01ed60279cb59e5a','CasinoLive','https://i.postimg.cc/bvsycNqN/carribean-stud.webp',96.50,10.00,100000.00,0,1,1,1,0,15,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(293,4,'Go Rush','go-rush-edef29b5','live_casino',3,'edef29b5eda8e2eaf721d7315491c51d','jilli','https://ossimg.tirangaagent.com/Tiranga/gamelogo/JILI/224.png',96.50,10.00,100000.00,0,1,1,1,0,12,1,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(294,7,'9 Wickets','9-wickets-48341a3b','sports',4,'48341a3bf62b6dd0814d7129e7e0834b','Sports','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQG2IDp8bHMOvKsg6bDCd9ashW15IDmIkoyjkGokPdFEg&s',96.50,10.00,100000.00,0,0,1,1,0,31,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(295,4,'First Person American Roulette','first-person-american-roulette-88b2d984','live_casino',3,'88b2d98462fbc45d6d31e95083e183df','CasinoLive','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/evoplay/First%20Person%20American%20Roulette.png',96.50,10.00,100000.00,0,1,1,1,0,16,3,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(296,4,'First Person Deal or No Deal','first-person-deal-or-no-deal-c715eb06','live_casino',3,'c715eb06391fabe5275d0b56440f49f3','CasinoLive','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/evoplay/First%20Person%20Deal%20or%20No%20Deal.png',96.50,10.00,100000.00,0,1,1,1,0,25,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(297,4,'First Person Blackjack','first-person-blackjack-4ac0e874','live_casino',3,'4ac0e874a4d5fc55bcdba5302b43bc96','CasinoLive','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/evoplay/First%20Person%20Blackjack.png',96.50,10.00,100000.00,0,1,1,1,0,26,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(298,4,'First Person Lightning Blackjack','first-person-lightning-blackjack-74914b06','live_casino',3,'74914b065a9e6b9c7cb8a0e4b17294ed','CasinoLive','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/evoplay/First%20Person%20Lightning%20Blackjack.png',96.50,10.00,100000.00,0,1,1,1,0,27,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(299,4,'First Person Roulette','first-person-roulette-a8267053','live_casino',3,'a82670530f49a6b3445dc1a592a2eb9e','CasinoLive','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/evoplay/First%20Person%20Roulette.png',96.50,10.00,100000.00,0,1,1,1,0,28,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(300,4,'Dream Catcher','dream-catcher-7f50a6fb','live_casino',3,'7f50a6fbfcd9257299303b5757d43525','CasinoLive','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/evoplay/Dream%20Catcher.png',96.50,10.00,100000.00,0,1,1,1,0,30,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(301,4,'First Person Lightning Roulette','first-person-lightning-roulette-f5ee6fce','live_casino',3,'f5ee6fce16d369d1a656f3b227fc7236','CasinoLive','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/evoplay/First%20Person%20Lightning%20Roulette.png',96.50,10.00,100000.00,0,1,1,1,0,31,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(302,4,'Football Studio','football-studio-392e13e3','live_casino',3,'392e13e38b3cec5ad259254a206d343a','CasinoLive','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/evoplay/Football%20Studio.png',96.50,10.00,100000.00,0,1,1,1,0,32,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(303,4,'First Person Craps','first-person-craps-82324591','live_casino',3,'823245918aa2afd108a5912e363c083c','Evolution Live','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/evoplay/First%20Person%20Craps.png',96.50,10.00,100000.00,0,1,1,1,0,22,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(304,4,'First Person Baccarat','first-person-baccarat-e18dfa4a','live_casino',3,'e18dfa4a5dd4a0f2d8b45337bd6abb9d','Evolution Live','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/evoplay/First%20Person%20Baccarat.png',96.50,10.00,100000.00,0,1,1,1,0,24,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(305,4,'First Person Golden Wealth Baccarat','first-person-golden-wealth-baccarat-88e49e3f','live_casino',3,'88e49e3fb9a9883f01f167d03f5efdcb','Evolution Live','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/evoplay/First%20Person%20Golden%20Wealth%20Baccarat.png',96.50,10.00,100000.00,0,1,1,1,0,23,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(306,3,'Balloon','balloon-de88f202','ai_games',6,'de88f202c5a8beeaccabbd944f8acfbf','Spribe','https://cms-ui-data-prd.sahara.editec-online.com/images/media-items/en/044721e4-bd1c-421d-b640-14347b43206b_180.jpg',96.50,10.00,100000.00,0,1,1,1,0,20,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(307,6,'Ocean King Jackpot','ocean-king-jackpot-2cccbb53','slots',2,'2cccbb53dc31457d0fda2b1af7b87f90','TADAgaming','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/tada/Ocean-King-Jackpot.png',96.50,10.00,100000.00,0,1,1,1,0,6,2,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(308,6,'Dinosaur Tycoon II','dinosaur-tycoon-ii-d96a6188','slots',2,'d96a6188227cfe71995feadc70f03c06','TADAgaming','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/tada/Dinosaur-Tycoon-II.png',96.50,10.00,100000.00,0,1,1,1,0,15,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(309,6,'Happy Fishing','happy-fishing-11055f0b','slots',2,'11055f0bc7f35b34bcfa966b529dba63','TADAgaming','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/tada/Happy-Fishing.png',96.50,10.00,100000.00,0,1,1,1,0,25,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(310,6,'Mega Fishing','mega-fishing-5b4c3acd','slots',2,'5b4c3acdabc8ac8f234d6864d2ee3a8a','TADAgaming','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/tada/Mega-Fishing.png',96.50,10.00,100000.00,0,1,1,1,0,32,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(311,6,'All-star Fishing','all-star-fishing-bb0c86c3','slots',2,'bb0c86c376c785e0133af2fe88faaadd','TADAgaming','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/tada/All-star-Fishing.png',96.50,10.00,100000.00,0,1,1,1,0,39,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(312,6,'Boom Legend','boom-legend-fc537dbf','slots',2,'fc537dbfab0fcfa7ade4bcb9210e78e0','TADAgaming','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/tada/Boom-Legend.png',96.50,10.00,100000.00,0,1,1,1,0,44,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(313,6,'Dragon Fortune','dragon-fortune-5c35435c','slots',2,'5c35435c71eb4674e79b1cd8068ba430','TADAgaming','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/tada/Dragon-Fortune.png',96.50,10.00,100000.00,0,1,1,1,0,50,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(314,6,'Dinosaur Tycoon','dinosaur-tycoon-dff81bd0','slots',2,'dff81bd0bba33f59adf64ca1ba80b63b','TADAgaming','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/tada/Dinosaur-Tycoon.png',96.50,10.00,100000.00,0,1,1,1,0,55,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(315,6,'Jackpot Fishing','jackpot-fishing-599dc6e5','slots',2,'599dc6e567e3cf3bc75c19318812bdbb','TADAgaming','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/tada/Jackpot-Fishing.png',96.50,10.00,100000.00,0,1,1,1,0,61,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(316,6,'Bombing Fishing','bombing-fishing-386cd7d3','slots',2,'386cd7d395614ff0e15e6c832211ecd1','TADAgaming','https://huidu-bucket.s3.ap-southeast-1.amazonaws.com/api/tada/Bombing-Fishing.png',96.50,10.00,100000.00,0,1,1,1,0,67,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(317,6,'Sugar Rush Xmas','sugar-rush-xmas-8170339c','slots',2,'8170339cc716c66d5b52779119fd718f','Slot','https://mediumrare.imgix.net/cafad5a2680956ba8bdc5f7ef147d23a8300f7debf44bb76510cd4ee97505aa4?w=180&h=236&fit=min&auto=format',96.50,10.00,100000.00,1,1,1,1,0,193,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(318,6,'Vampy Party','vampy-party-0ab1d901','slots',2,'0ab1d901b6cc731b48bc3b2cd07b3cf1','Slot','https://mediumrare.imgix.net/857e57fe97696eb3cdbd5c226b87b4357ef8e2926c75571e7e7ee70b082155b2?w=180&h=236&fit=min&auto=format',96.50,10.00,100000.00,1,1,1,1,0,195,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(319,6,'Sweet Bonanza 1000','sweet-bonanza-1000-e3f45e2f','slots',2,'e3f45e2f03388056aba660b7e737ecf0','Slot','https://mediumrare.imgix.net/a77d914f12935f85ca574c3b52989b13cb48901ab8c55bdf326e1f2a177cbd97?w=180&h=236&fit=min&auto=format',96.50,10.00,100000.00,1,1,1,1,0,201,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(320,6,'Gates of Olympus 1000','gates-of-olympus-1000-4ae52ed2','slots',2,'4ae52ed2e1a8c353878ba65ed7791ac4','Slot','https://mediumrare.imgix.net/2a83b2bfe89f30834cda26834e0715500c2c2885024069091fe7964ac3fa8adf?w=180&h=236&fit=min&auto=format',96.50,10.00,100000.00,1,1,1,1,0,203,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(321,6,'Game lobby','game-lobby-3de186f5','slots',2,'3de186f56460fc522e608cebf78391c2','Aura Gaming','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_Vww8wedZXau7rLCNFcaqpqf6HLbB6nJRkg&s',96.50,10.00,100000.00,0,1,1,1,0,177,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(322,6,'Blastoff','blastoff-6e82ceaf','slots',2,'6e82ceaf26530d35f033825acff40835','Aura Gaming','https://blastmotion.com/wp-content/uploads/Blast-Off-Launch-Graphic.jpg',96.50,10.00,100000.00,0,1,1,1,0,182,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(323,6,'Aviator','aviator-0954ca5c','slots',2,'0954ca5c3eb69163dc79e889b09ad69a','Aura Gaming','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQdgri62QmW4Ilk45ab8_d1Apb8noF-DYFTPQ&s',96.50,10.00,100000.00,0,1,1,1,0,179,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(324,4,'Mines Raider','mines-raider-f9f2a148','live_casino',3,'f9f2a148f101e25c381c7259ae41d9da','Arcade','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQyge8x46FaXnb-uyvBMmH-Qhh1ODxe1Z44Lw&s',96.50,10.00,100000.00,0,1,1,1,0,7,1,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(325,6,'Admiral Wilds','admiral-wilds-f0980130','slots',2,'f0980130e62b9465a069bf337d4ace74','18Peaches','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQzmJYX2qpM1dMUB94N6qnus34AXHojYP6pzQ&s',96.50,10.00,100000.00,0,1,1,1,0,1,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(326,6,'Brazilian Mask Fire','brazilian-mask-fire-be63ff4b','slots',2,'be63ff4b42188d4a87fd7c40f342ee5d','18Peaches','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvH_4bg2FX1XXFnnh97CrbdYe0_ItPEgjLYA&s',96.50,10.00,100000.00,0,1,1,1,0,2,1,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(327,6,'Cash Multipliers Respin','cash-multipliers-respin-6a5c65a0','slots',2,'6a5c65a0d36aa53a0e67f5fd7ac8fef8','18Peaches','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRs1qE8oEO_h5NUk0e-JrTO6N6zWt7gjUOCMQ&s',96.50,10.00,100000.00,0,1,1,1,0,3,1,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(328,3,'ChickNRoll','chicknroll-135e4f10','ai_games',6,'135e4f1032eae33954c8fe7d8d95e847','Veliplay','https://veliplay.com/wp-content/uploads/2025/12/LOGO-ChicknRoll.webp',96.50,10.00,100000.00,0,1,1,1,0,4,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(329,3,'Holy Moly','holy-moly-dd26a955','ai_games',6,'dd26a95551755e76db8ec3db15037f96','Veliplay','https://play-lh.googleusercontent.com/-E_WhCYhMjOTxDvohgabMA02WdqVUDQTcVeOFU__wK9klfUC5lYNWGBBfIsJ_5w9qEI',96.50,10.00,100000.00,0,1,1,1,0,5,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(330,3,'DroneX','dronex-ffe900e7','ai_games',6,'ffe900e717840fea46cdc2e98d44b51c','Veliplay','https://cms-cdn.beulabet.net/image-cdn?url=https%3A%2F%2Fcdn.hrzn.cloud%2Fgame%2F7b2d4f23-4ed9-44f5-818f-012ade8f6600.jpeg&q=75&w=128&h=256',96.50,10.00,100000.00,0,1,1,1,0,6,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(331,6,'aviatrix','aviatrix-6f652ee5','slots',2,'6f652ee587522116739db9ed5a8d529f','aviatrix','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_YgQZhJBg6OohsLQO-7vtLPGnDoXKZ2r5EQ&s',96.50,10.00,100000.00,0,1,1,1,0,7,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(332,4,'Penalty Unlimited','penalty-unlimited-66d311ff','live_casino',3,'66d311ff6cf531e40b61c483dd34c5c9','InOut Minigames','https://bfstatic.io/preview/inout:PenaltyUnlimited@1x.jpeg',96.50,10.00,100000.00,0,1,1,1,0,2,1,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(333,4,'Chicken Road 2.0','chicken-road-2-0-562b2999','live_casino',3,'562b299961b0ec40f252a832453c67b0','InOut Minigames','https://www.heominor.ca/wp-content/uploads/2025/08/chicken-road-2-logo.webp',96.50,10.00,100000.00,0,1,1,1,0,4,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(334,4,'Forest Arrow','forest-arrow-458bd34b','live_casino',3,'458bd34bc83e34501df7e7f96626df6b','IN OUT MINI GAMES','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR5NtONkGMq0P0l2vf5TM5LiIl6jEj35-g7Ag&s',96.50,10.00,100000.00,0,1,1,1,0,6,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(335,3,'GOD OF WEALTH','god-of-wealth-c44dc56b','ai_games',6,'c44dc56b33f2f501d5e0ce24abbe1345','Smartsoft','https://fan-cdn.nolimitcity.com/god_of_wealth_fansitethumb_512x512_04_09_2025_01_a0b4821389.png',96.50,10.00,100000.00,0,1,1,1,0,8,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(336,3,'ELVES','elves-8c1c4842','ai_games',6,'8c1c484262be6d9a972e7c6bd705e788','Smartsoft','https://i0.wp.com/ramblingbrick.com/wp-content/uploads/2016/04/img_9250.jpg?resize=291%2C517&ssl=1',96.50,10.00,100000.00,0,1,1,1,0,9,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(337,3,'777 FRUIT','777-fruit-48d221f9','ai_games',6,'48d221f9239f3602b2b2bf63d6ec39c4','Smartsoft','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT6AZKegdCjww5aUpJGqJwB1DBjB4zbmMFBaA&s',96.50,10.00,100000.00,0,1,1,1,0,10,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(338,6,'Rocketon','rocketon-0b880e49','slots',2,'0b880e4904c700af5fdd4eb7dc388e80','Galaxsys','https://images.ctfassets.net/3h2k9ldv19d8/5xzBSyscWvdqLkOEflzeTG/cb1bb2f6fbf1a18b0b0d7ca3287509e9/3.Square-.png?fm=webp&w=768&q=75',96.50,10.00,100000.00,0,1,1,1,0,11,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(339,6,'Keno 10 (1 Minute)','keno-10-1-minute-5dbad5d6','slots',2,'5dbad5d6886163b0e8b1e7b3d2857019','Galaxsys','https://images.evaplatform.tech/cdn-cgi/image/format=auto,width=320,height=320,trim.width=600,trim.height=600,trim.left=200,trim.top=200,dpr=1/games/digitain-galaxsys-keno-10-1-minute.png',96.50,10.00,100000.00,0,1,1,1,0,12,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(340,6,'Keno 10 (2 Minute)','keno-10-2-minute-3f10050e','slots',2,'3f10050e070b97a74ff3571dc823a79b','Galaxsys','https://spincity.co.zw/api/v1/Media/WebP/13150/Keno-10-(2-Minute)-15815',96.50,10.00,100000.00,0,1,1,1,0,13,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(341,5,'Poison Teenpatti 20 20','poison-teenpatti-20-20-3845e907','live_casino',3,'3845e907ece3ec94443a6aa3e49b51a8','MAC88','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTFCJvwd2wV-sg_y_TCu8GlVTPWiK7SFG8LYg&s',96.50,10.00,100000.00,0,1,1,1,0,14,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(342,3,'Towers','towers-0ad7c4c8','ai_games',6,'0ad7c4c8f9a1fe4ebec150c5b6606f54','turbogamesasia','https://cdn.britannica.com/15/152315-050-226AA671/twin-towers-skyline-Lower-Manhattan-World-Trade-center.jpg',96.50,10.00,100000.00,0,1,1,1,0,15,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(343,3,'Hamsta','hamsta-58303b4c','ai_games',6,'58303b4c3986d22d8d25f109e5f52e1d','turbogamesasia','https://speedcdn.tech/cdn-cgi/image/width=1200,fit=scale-down,format=auto,quality=75/https://speedcdn.tech/assets/prod/games/hub88-turbogames-hamsta.webp',96.50,10.00,100000.00,0,1,1,1,0,16,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(344,3,'Fury Stairs','fury-stairs-f24656f8','ai_games',6,'f24656f8ab73a646a9ce20d6a4aa83db','turbogamesasia','https://speedcdn.tech/cdn-cgi/image/width=3840,fit=scale-down,format=auto,quality=75/https://speedcdn.tech/assets/prod/games/hub88-turbogames-fury-stairs.webp',96.50,10.00,100000.00,0,1,1,1,0,17,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(345,6,'Spin Wheel','spin-wheel-c7baf203','slots',2,'c7baf203c859f1ecceb06bc25cf27e01','Aura Gaming','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQP2MufOHwiC46DYFT6MHdlnbmqy0VVXaMuIg&s',96.50,10.00,100000.00,0,1,1,1,0,18,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(346,6,'Coin Toss','coin-toss-dfcea866','slots',2,'dfcea866db2646c5aba0b474231892f4','Aura Gaming','https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Coin_Toss_%283635981474%29.jpg/250px-Coin_Toss_%283635981474%29.jpg',96.50,10.00,100000.00,0,1,1,1,0,19,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(347,6,'Limbo','limbo-0bc4618a','slots',2,'0bc4618af6711b0252c6c6118b52634b','Aura Gaming','https://upload.wikimedia.org/wikipedia/en/c/cc/Limbo_Box_Art.jpg',96.50,10.00,100000.00,0,1,1,1,0,20,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(348,6,'Slot Game','slot-game-13b02c4c','slots',2,'13b02c4c5261631d094dd9af0b4ae1a3','Aura Gaming','https://thumbs.dreamstime.com/b/slots-game-casino-banner-illustration-82743329.jpg',96.50,10.00,100000.00,0,1,1,1,0,21,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(349,6,'Rock Paper Scissors','rock-paper-scissors-9e192953','slots',2,'9e192953774a259261a5039a34a73d1f','Aura Gaming','https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Rock-paper-scissors.svg/1280px-Rock-paper-scissors.svg.png',96.50,10.00,100000.00,0,1,1,1,0,22,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(350,6,'Double','double-d773aaca','slots',2,'d773aaca0e40f36ae48d302aedeed3b3','Aura Gaming','https://cdn-icons-png.flaticon.com/512/9590/9590123.png',96.50,10.00,100000.00,0,1,1,1,0,23,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(351,6,'Cricket','cricket-da1af74a','slots',2,'da1af74a3628fe31ab77bea49c7a885b','Aura Gaming','https://thumbs.dreamstime.com/b/cricket-bat-ball-wicket-stumps-text-wooden-board-shiny-green-grass-48581990.jpg',96.50,10.00,100000.00,0,1,1,1,0,24,2,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(352,6,'Classic Dice','classic-dice-03d6add4','slots',2,'03d6add481aa146d07e0fc20cdc70325','Aura Gaming','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQE0XhHng17ZCxFE4IIjDIAnNX4vZ4Lz_d8bQ&s',96.50,10.00,100000.00,0,1,1,1,0,25,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(353,6,'Crash','crash-dfa76b2a','slots',2,'dfa76b2af67e68e64a769d2b249393b3','Aura Gaming','https://www.speedrun.com/static/game/9d3wm001/cover.png?v=0d8fa14',96.50,10.00,100000.00,0,1,1,1,0,26,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(354,6,'Mines','mines-b3d92fb4','slots',2,'b3d92fb446a2829a06f828ec83f432f4','Aura Gaming','https://storage.googleapis.com/kickthe/assets/images/games/mines-hacksawgaming/gb/gbp/tile_large.jpg',96.50,10.00,100000.00,0,1,1,1,0,27,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(355,6,'Tower Legends','tower-legends-7edcb68c','slots',2,'7edcb68c9c313c870e2e2722e0667c56','Aura Gaming','https://bestbonuslist.com/wp-content/uploads/2024/09/image.webp',96.50,10.00,100000.00,0,1,1,1,0,28,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(356,6,'Sugar Ride','sugar-ride-55b4abd7','slots',2,'55b4abd7ea22e78069c5a85b42da59b6','Aura Gaming','https://ma-1xbet.com/genfiles/cmsc-files/12f58184-8697-4da5-96bf-339d4cbbff78_auto.webp',96.50,10.00,100000.00,0,1,1,1,0,29,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(357,6,'Button Burst','button-burst-ec6cf01e','slots',2,'ec6cf01ec2f8833ad1d0f550fa0c7056','Aura Gaming','https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2244400/capsule_616x353.jpg?t=1719249958',96.50,10.00,100000.00,0,1,1,1,0,30,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(358,5,'Teenpatti T20 Fast','teenpatti-t20-fast-130b42b7','live_casino',3,'130b42b7fb15bea0b436914037396df4','Aura Gaming','https://images.evaplatform.tech/cdn-cgi/image/format=auto,width=180,height=180,trim.width=700,trim.height=700,trim.left=150,trim.top=150,dpr=1/games/jili-teenpatti-20-20.png',96.50,10.00,100000.00,0,1,1,1,0,31,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(359,6,'7 Up Down Fast','7-up-down-fast-1a08ba74','slots',2,'1a08ba740a47e476b6dd33cb6058f725','Aura Gaming','https://infayoudigital.com/wp-content/uploads/2025/02/7-up-down-game-development-500x500-1.webp',96.50,10.00,100000.00,0,1,1,1,0,32,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(360,5,'2 card Teenpatti Fast','2-card-teenpatti-fast-6b11c0e9','live_casino',3,'6b11c0e9d6e7839039269a701178c0bb','Aura Gaming','https://image.winudf.com/v2/image1/dGVlbi5wYXR0aWdvbGQycnVtbXlwb2tlcmNhcmRnYW1lX3NjcmVlbl8xXzE2MDM2NDQ5NDJfMDEw/screen-1.jpg?fakeurl=1&type=.jpg',96.50,10.00,100000.00,0,1,1,1,0,33,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(361,6,'Dragon Tiger Fast','dragon-tiger-fast-a2e86c94','slots',2,'a2e86c94ed72725b045969a9020c98f9','Aura Gaming','https://lh3.googleusercontent.com/1R1-V0UYH7HgbFH5ZyNlL-wlA-iR---pWOwex23RbAw3uW7BZdd2Kywb5YjpjNHRCQcCgwGXQF_G9ZxPWS7REjH_cXaizC2j7lbY=h200',96.50,10.00,100000.00,0,1,1,1,0,34,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(362,5,'Teenpatti T20','teenpatti-t20-0f4e83f5','live_casino',3,'0f4e83f5b602951af56003254d3dc592','Aura Gaming','https://5.imimg.com/data5/SELLER/Default/2022/9/KQ/SJ/IL/53668334/t-20-teen-patti-api-with-video-500x500.jpg',96.50,10.00,100000.00,0,1,1,1,0,35,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(363,5,'Teenpatti 1 Day','teenpatti-1-day-e7f361d6','live_casino',3,'e7f361d615a5a0b71b7bbc5f7b7952d6','Aura Gaming','https://images.evaplatform.tech/cdn-cgi/image/format=auto,width=418,height=360,trim.width=732,trim.height=630,trim.left=140,trim.top=180,dpr=1/games/sg-ez-lc-one-day-teen-patti--classic.png',96.50,10.00,100000.00,0,1,1,1,0,36,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(364,6,'Dragon Tiger','dragon-tiger-11029ba3','slots',2,'11029ba3e2c08ed76478518b6a04753d','Aura Gaming','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQdmpg_1ZTstXafONOjJvgh6NjgSh4XDFqgQ&s',96.50,10.00,100000.00,0,1,1,1,0,39,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(365,6,'7 Up Down','7-up-down-0d7060b1','slots',2,'0d7060b145e855ed4450bc4f551098d9','Aura Gaming','https://5.imimg.com/data5/SELLER/Default/2024/4/411158123/FI/PK/LH/37169537/7-up-down-game-development.png',96.50,10.00,100000.00,0,1,1,1,0,37,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(366,6,'Hi Low','hi-low-65b06983','slots',2,'65b0698385892008c539e6451a6bb8ab','Aura Gaming','https://www.gammastack.com/wp-content/uploads/2021/08/Hi-lo-Cards-min.png',96.50,10.00,100000.00,0,1,1,1,0,38,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(367,6,'Amar Akbar Anthony','amar-akbar-anthony-44d0d9e8','slots',2,'44d0d9e8c6da083327c2c6f6f84d25d6','Aura Gaming','https://www.mobzway.com/assets/images/skill-games/rnggame/amar-akbar-anthony.webp',96.50,10.00,100000.00,0,1,1,1,0,40,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(368,6,'Andar Bahar','andar-bahar-ddcf4070','slots',2,'ddcf4070efa7a93ad994a4a4f7ea2988','Aura Gaming','https://mir-s3-cdn-cf.behance.net/projects/404/354d92201336821.Y3JvcCwxMDgwLDg0NCwwLDExNw.jpg',96.50,10.00,100000.00,0,1,1,1,0,41,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(369,5,'2 Card Teenpatti','2-card-teenpatti-4986d8f6','live_casino',3,'4986d8f67ea3dc2ecdfed1a55978e0b8','Aura Gaming','https://imagedelivery.net/ET5O6T9EwD4kHH-pvhNJ_Q/8d28b66f-5eda-45c1-0e24-0f0b36e27600/w=1024',96.50,10.00,100000.00,0,1,1,1,0,42,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(370,5,'Muflis Teenpatti','muflis-teenpatti-4a47044a','live_casino',3,'4a47044a54157144bd04240b628f5bcd','Aura Gaming','https://mymasterteenpatti.com/wp-content/uploads/2024/09/muflisteenpatti-1.svg',96.50,10.00,100000.00,0,1,1,1,0,43,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(371,5,'Teenpatti Test','teenpatti-test-40b83786','live_casino',3,'40b8378671f14227323881042744a631','Aura Gaming','https://sthiracdn.com/assets/casinogames-new-v1/67630.webp',96.50,10.00,100000.00,0,1,1,1,0,44,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(372,5,'Teenpatti Open','teenpatti-open-a406ba8a','live_casino',3,'a406ba8a859fa86ee300b79794a3cba7','Aura Gaming','https://cdn.dreamdelhi.com/ag/teenpatti_open.webp',96.50,10.00,100000.00,0,1,1,1,0,45,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(373,6,'Roulette','roulette-57aab6e0','slots',2,'57aab6e0acdf334593f4147ac86299b6','Aura Gaming','https://a.storyblok.com/f/232514/5333x3555/a18192ba3b/aruze-interblock-xplosion-roulette-g2e-electronic-table-game-etg-2.jpg',96.50,10.00,100000.00,0,1,1,1,0,46,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(374,6,'29 Card Baccarat','29-card-baccarat-9f217028','slots',2,'9f217028836904851a9088ff3c089e77','Aura Gaming','https://play-lh.googleusercontent.com/G9u5ib3x1qHLiwVe4vm6FtoVK7VoQQhaNd4ca52GKAp_3VHS9iCPxC77YRJqhL9nEFo=w600-h300-pc0xffffff-pd',96.50,10.00,100000.00,0,1,1,1,0,47,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(375,6,'Baccarat','baccarat-6732c51e','slots',2,'6732c51eb228203438f9eb4c880c35dc','Aura Gaming','https://assets.nintendo.com/image/upload/ar_16:9,c_lpad,w_1240/b_white/f_auto/q_auto/store/software/switch/70010000100159/96e893c8088f4e9d0a48fe70aa222890a8b80b6275179f5886eca3e89079c7b3',96.50,10.00,100000.00,0,1,1,1,0,48,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(376,6,'Poker 20-20','poker-20-20-66ad42ad','slots',2,'66ad42ad90c0e0c51aaa9db08eefe5d6','Aura Gaming','https://d1zntghqrw5743.cloudfront.net/clicksmal/67567_2.webp',96.50,10.00,100000.00,0,1,1,1,0,49,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(377,6,'3 Cards Judgement','3-cards-judgement-e0853d2e','slots',2,'e0853d2ea07cdcdbb256aec54df999bc','Aura Gaming','https://cdn.dribbble.com/userupload/46083930/file/452756c54cd020a7a3a13b39becd0b36.png?crop=0x0-1440x1080&format=webp&resize=400x300&vertical=center',96.50,10.00,100000.00,0,1,1,1,0,50,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(378,6,'Queen Race','queen-race-587612d4','slots',2,'587612d47b0360ccd47a8b8d936d3938','Aura Gaming','https://rockyonlinebook.click/wp-content/uploads/2026/03/WhatsApp-Image-2026-03-03-at-8.41.16-AM.jpeg',96.50,10.00,100000.00,0,1,1,1,0,51,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(379,6,'Bollywood Casino','bollywood-casino-cbcd7a1d','slots',2,'cbcd7a1dd02e586d4e42b706f34ad6a4','Aura Gaming','https://images.rajabet.fun/casino/ciptahubimg/67570.webp',96.50,10.00,100000.00,0,1,1,1,0,52,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(380,6,'Race to 17','race-to-17-92230c2d','slots',2,'92230c2d3a3a333a8ad4532f14b96c54','Aura Gaming','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTEVc_WI0DH3vawV7edH-BSufcMSw8mGMsBLw&s',96.50,10.00,100000.00,0,1,1,1,0,53,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(381,6,'Trio','trio-e0953545','slots',2,'e09535454a4f948eec8ce52e7745d15e','Aura Gaming','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQenotQMTFyx0GGoyhadch_0sSJnzuJjhMfTA&s',96.50,10.00,100000.00,0,1,1,1,0,54,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(382,6,'Sicbo','sicbo-6859276d','slots',2,'6859276d1be5e54049231cb6d9da69b3','Aura Gaming','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSKPICt_cPbTbddqaToRAcCo68pYjbxrDmE0w&s',96.50,10.00,100000.00,0,1,1,1,0,55,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(383,6,'Matka','matka-5846a5ad','slots',2,'5846a5ad0c51a0fe1c8760eb869519ce','Aura Gaming','https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/80/5d/e9/805de960-d003-7b84-6810-962c7af7e146/AppIcon-1x_U007emarketing-0-11-0-0-85-220-0.png/1200x630wa.jpg',96.50,10.00,100000.00,0,1,1,1,0,56,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(384,6,'32 cards casino','32-cards-casino-d963d261','slots',2,'d963d26148705a435fcc4443e655f92e','Aura Gaming','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRnNHtE0C41334_S-MR4i6M43EwM7KkfHyNmg&s',96.50,10.00,100000.00,0,1,1,1,0,57,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(385,6,'Super Over','super-over-64233219','slots',2,'642332199664db087815c554d12f7b1d','Aura Gaming','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSYiydX74lkNCcdZBhw18Ur1uxQ33vpF85vAg&s',96.50,10.00,100000.00,0,1,1,1,0,58,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(386,6,'Poker','poker-1f5f5458','slots',2,'1f5f545868d879ef413411da54701ca0','Aura Gaming','https://static.vecteezy.com/system/resources/thumbnails/079/516/245/small/luxury-casino-poker-illustration-featuring-golden-text-banner-four-aces-and-gold-coins-vector.jpg',96.50,10.00,100000.00,0,1,1,1,0,59,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(387,5,'Unique Teenpatti','unique-teenpatti-2c997dc6','live_casino',3,'2c997dc6acdd89859160ee259e864afb','MAC88','https://assets.future09.com/asset/casino/urlThumb/mac88/150049.webp',96.50,10.00,100000.00,0,1,1,1,0,60,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(388,5,'Joker Teenpatti One Day','joker-teenpatti-one-day-2854446d','live_casino',3,'2854446d9b0a32070e341e3dcd61ef16','MAC88','https://sthiracdn.com/assets/parker-client/landing_casino/icg/joker-teenpatti-oneday.png',96.50,10.00,100000.00,0,1,1,1,0,61,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(389,4,'Lightning Dragon Tiger','lightning-dragon-tiger-d005f9c3','live_casino',3,'d005f9c3e7ee55784534461aace672af','MAC88','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcReKOgfbiKuPRST9y7Hwky7ndV3sh3swUXRkA&s',96.50,10.00,100000.00,0,1,1,1,0,62,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(390,5,'Unique Teenpatti','unique-teenpatti-65ee16cb','live_casino',3,'65ee16cb356c5e8459089aeac42d11f8','MAC88','https://i.ytimg.com/vi/RGcEBnRr0bE/hqdefault.jpg',96.50,10.00,100000.00,0,1,1,1,0,63,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(391,5,'Poison Teenpatti 20 20','poison-teenpatti-20-20-9a77d6f7','live_casino',3,'9a77d6f70d286588db2a5e097915d639','MAC88','https://i.ytimg.com/vi/RGcEBnRr0bE/hqdefault.jpg',96.50,10.00,100000.00,0,1,1,1,0,64,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(392,4,'Sexy Lucky 7 -2','sexy-lucky-7-2-566495ad','live_casino',3,'566495ad80dc35d8ebb504ffb50aa6d8','MAC88','https://jiofairplay.com/wp-content/uploads/2026/02/lucky-7.webp',96.50,10.00,100000.00,0,1,1,1,0,65,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(393,5,'Sexy 2 Card Teenpatti','sexy-2-card-teenpatti-7941279a','live_casino',3,'7941279a8a3939b432c71d84e7e2afd2','MAC88','https://play-lh.googleusercontent.com/ttmBLS-uDl5Cn22yt0vmbBlPU6G41VhQ0sH1V2q7CQsxZB9Tpn1WfAchxuKRT84xuK3fr7SjFlKh_dQLN3ydJw',96.50,10.00,100000.00,0,1,1,1,0,66,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(394,5,'Sexy Teenpatti 20-20','sexy-teenpatti-20-20-e39cabdb','live_casino',3,'e39cabdb0050effba6b7051e65665128','MAC88','https://images.sigma.world/M-TeenPatti20-20.jpg',96.50,10.00,100000.00,0,1,1,1,0,67,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(395,4,'Sexy Lucky 7 -3','sexy-lucky-7-3-fc46c023','live_casino',3,'fc46c02363cbae83f57026a6887722b3','MAC88','https://ik.imagekit.io/sitecdn/vking/lobby/20210811288970.webp?v=1',96.50,10.00,100000.00,0,1,1,1,0,68,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(396,4,'Sexy Dragon tiger 2','sexy-dragon-tiger-2-8462efb7','live_casino',3,'8462efb7e3477bdbe4e7af9dc4a32f8d','MAC88','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTjeU9eQ7-k1DTeNIgCrQCc1CMew8hg21WAJQ&s',96.50,10.00,100000.00,0,1,1,1,0,69,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(397,4,'Sexy Dragon Tiger','sexy-dragon-tiger-3af2f103','live_casino',3,'3af2f103fe4d196eb19aa3439cf74d32','MAC88','https://i.ytimg.com/vi/QOSgHPjSqvE/maxresdefault.jpg',96.50,10.00,100000.00,0,1,1,1,0,70,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(398,4,'Sexy Lucky 7','sexy-lucky-7-03a2171a','live_casino',3,'03a2171abc81db1bb2e3a714c95f4abe','MAC88','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRu7DXr8EsTzoFvyBu7xcPsUn1QdJC72Kn84Q&s',96.50,10.00,100000.00,0,1,1,1,0,71,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(399,4,'Sexy High Low','sexy-high-low-6c6d9322','live_casino',3,'6c6d9322e3a3e023b56216a11c3bd884','MAC88','https://pbs.twimg.com/media/BBqIX4SCEAEQuqs.jpg',96.50,10.00,100000.00,0,1,1,1,0,72,2,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(400,4,'Sexy Amar Akbar Anthony','sexy-amar-akbar-anthony-729fdf03','live_casino',3,'729fdf0380e92735cff0e8b62bdac358','MAC88','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTzypwEpehPbpEL3GX-9P9AwuCZM6Fv-4yuDg&s',96.50,10.00,100000.00,0,1,1,1,0,73,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(401,4,'Trade88 RNG2','trade88-rng2-fb748cc1','live_casino',3,'fb748cc1e60cc2e4b653722e202aa0bd','MAC88','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT-OUZF16B0WsoHBvJiGCIDyMzEqKi_TdwlmA&s',96.50,10.00,100000.00,0,1,1,1,0,74,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(402,4,'Lucky Tiger Mines','lucky-tiger-mines-15bdbae0','live_casino',3,'15bdbae0eb6d3e91430cd9cfcdc41c86','MAC88','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQt5O9iRVqOIGDH9grWhzMYxR4jp6-H9Rmigg&s',96.50,10.00,100000.00,0,1,1,1,0,75,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(403,4,'VR Lightning Roulette','vr-lightning-roulette-fba6287e','live_casino',3,'fba6287ee18e548bfe2af0d20cda85f0','MAC88','https://www.delamitri.info/wp-content/uploads/2025/11/lightning-roulette/images/lightning-roulette-logo.webp',96.50,10.00,100000.00,0,1,1,1,0,76,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(404,4,'Deal Or No Deal','deal-or-no-deal-401487e6','live_casino',3,'401487e6cf5489fd9153a83a337edc01','MAC88','https://m.media-amazon.com/images/I/91EdGmmpYcL._AC_UF1000,1000_QL80_.jpg',96.50,10.00,100000.00,0,1,1,1,0,77,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(405,4,'The Voice','the-voice-0984a086','live_casino',3,'0984a086c231ad1d3639ad3fa01f1e78','MAC88','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR3pYiRQyVNhSfoD03pfJzdYfX8nGTfWzgWBg&s',96.50,10.00,100000.00,0,1,1,1,0,78,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(406,4,'Plane Crash','plane-crash-80d58c9c','live_casino',3,'80d58c9cf15545f06e89f482a7872dfd','MAC88','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRa-MqC1nyUbJoqVkz1coav2UW71KOD2ifuzg&s',96.50,10.00,100000.00,0,1,1,1,0,79,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(407,4,'CRASH MAN','crash-man-29d3c28e','live_casino',3,'29d3c28e7825e2324e683d1e2b4b2488','MAC88','https://preview.redd.it/crash-man-with-hands-v0-lxymaba4s6ge1.png?width=640&crop=smart&auto=webp&s=5774e7bc29f3a6b233fa1eb25aa5f020800b41ae',96.50,10.00,100000.00,0,1,1,1,0,80,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(408,4,'Trade88 ETHUSD','trade88-ethusd-2a3f9c1d','live_casino',3,'2a3f9c1d229b2640ae1638b0d773af05','MAC88','https://cms.naga.com/ethereum_price_prediction_4528954dd6.png',96.50,10.00,100000.00,0,1,1,1,0,81,2,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(409,4,'Trade88 SOLUSD','trade88-solusd-88dc93e1','live_casino',3,'88dc93e15982d45f97aa5cd86ef53861','MAC88','https://s2.coinmarketcap.com/static/img/coins/200x200/5426.png',96.50,10.00,100000.00,0,1,1,1,0,82,1,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(410,4,'Snakes','snakes-9193f864','live_casino',3,'9193f864c9b1bebedbfc7b56f5332edb','MAC88','https://store-images.s-microsoft.com/image/apps.29406.14111501114128924.89d07a0e-ac07-419d-9169-7c97ed79241c.6dc6c888-cd5c-4556-bf31-384c55fb5d8c',96.50,10.00,100000.00,0,1,1,1,0,83,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(411,4,'Jalwa Color Game 10','jalwa-color-game-10-0e504250','live_casino',3,'0e504250a731f65aab34a31a2c32b0db','MAC88','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQpOetmun0iE_M96LF4LcduFmbrNU779bNHlA&s',96.50,10.00,100000.00,0,1,1,1,0,84,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(412,4,'Jalwa Color Game 5','jalwa-color-game-5-5391e93d','live_casino',3,'5391e93d03d0adcf6f8ab4360a72db06','MAC88','https://jalwagameblog.liveblog365.com/wp-content/uploads/2026/01/WhatsApp-Image-2025-12-29-at-2.08.42-PM-2.jpeg',96.50,10.00,100000.00,0,1,1,1,0,85,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(413,4,'Jalwa Color Game 3','jalwa-color-game-3-32fab661','live_casino',3,'32fab661cd9274e0672248152746b8a8','MAC88','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTzNzqU7Ms9bnInwlveV2KgNob6WuVeXPaYmw&s',96.50,10.00,100000.00,0,1,1,1,0,86,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(414,4,'Jalwa Color Game','jalwa-color-game-2d3eae97','live_casino',3,'2d3eae979426701b1cd443636f24b6b4','MAC88','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSUOInNdqHtc2N-PvaNW-HbgzePu0-Em8vnIA&s',96.50,10.00,100000.00,0,1,1,1,0,87,1,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(415,4,'Naughty Button','naughty-button-e7fdcc9c','live_casino',3,'e7fdcc9c3b60855acc8c1f0afc2f5a96','MAC88','https://m.media-amazon.com/images/I/411rWBahBvL._AC_UF894,1000_QL80_.jpg',96.50,10.00,100000.00,0,1,1,1,0,88,1,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(416,4,'Packs','packs-a2c56660','live_casino',3,'a2c566600da7afeae2a8f47f6174c37a','MAC88','https://mediumrare.imgix.net/f403357fdc65f2f81f6da97ed79b39a16804e5f583cd36c536c1ff37c6a7fb39',96.50,10.00,100000.00,0,1,1,1,0,89,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(417,4,'Dragon Tower','dragon-tower-2e4b140d','live_casino',3,'2e4b140d5ba77c625d0b5142ef3d19c5','MAC88','https://m.media-amazon.com/images/I/91vF+SW9JML.png',96.50,10.00,100000.00,0,1,1,1,0,90,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(418,4,'Pump','pump-b1f7c2de','live_casino',3,'b1f7c2de35204853db6dc17fd88edc00','MAC88','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSt-_aZn7OXMBuScKYiAn3GPJ9_LjEtPI2xkA&s',96.50,10.00,100000.00,0,1,1,1,0,91,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(419,4,'Stock Matka','stock-matka-7972e54f','live_casino',3,'7972e54fd89e2703b737fa2c87009ddd','MAC88','https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/80/5d/e9/805de960-d003-7b84-6810-962c7af7e146/AppIcon-1x_U007emarketing-0-11-0-0-85-220-0.png/1200x630wa.jpg',96.50,10.00,100000.00,0,1,1,1,0,92,1,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(420,4,'Race Track','race-track-346debe8','live_casino',3,'346debe8c51d61ba12556191dd15e913','MAC88','https://img.itch.zone/aW1nLzE3MDAyMzAzLnBuZw==/original/uY7Zou.png',96.50,10.00,100000.00,0,1,1,1,0,93,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(421,4,'Trade88 NATURAL GAS','trade88-natural-gas-026096a1','live_casino',3,'026096a11f0c51dbb3c22a8b7680eb00','MAC88','https://m.media-amazon.com/images/I/71M8ty+fNlL._AC_UF350,350_QL50_.jpg',96.50,10.00,100000.00,0,1,1,1,0,94,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(422,4,'Chicken Road Cross 2','chicken-road-cross-2-45342897','live_casino',3,'453428976b2a2214aee4f3e679f2303b','MAC88','https://www.heominor.ca/wp-content/uploads/2025/08/chicken-road-2-logo.webp',96.50,10.00,100000.00,0,1,1,1,0,95,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(423,6,'Cleo\'s Riches FlexiWays','cleo-s-riches-flexiways-4652a761','slots',2,'4652a761c9f9c182b5483174a8968a97','18 Peaches','https://www.freeslots99.com/app/uploads/Cleos-Riches-FlexiWays.webp',96.50,10.00,100000.00,0,1,1,1,0,96,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(424,6,'Coral Reef Flexiways','coral-reef-flexiways-dc61b111','slots',2,'dc61b111e441a25c7d2fc74634ad8976','18 Peaches','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSFD1cNFgTlb97dqG2vCT77ubElVRL5CKbtFw&s',96.50,10.00,100000.00,0,1,1,1,0,97,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(425,6,'Double Fortune Panda','double-fortune-panda-6279dabb','slots',2,'6279dabb6b13ef5891c29481dd07474f','18 Peaches','https://18peaches.com/images/games/double-fortune-panda/card/card-double-fortune-panda.webp',96.50,10.00,100000.00,0,1,1,1,0,98,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(426,6,'Dubai Luxury','dubai-luxury-ae0bf31a','slots',2,'ae0bf31ac84f061e466143c67c79d8b5','18 Peaches','https://play-lh.googleusercontent.com/uQ4iF3xESkQNGDrJ66vIt-C1NncHDbl7mqV4ga-3Yy33q2x-dlSXghMagK-i_hEpjl6X=w526-h296-rw',96.50,10.00,100000.00,0,1,1,1,0,99,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(427,6,'Frozen Fruits Flexiways','frozen-fruits-flexiways-e81320e7','slots',2,'e81320e76b5167b54bb4288ae704574d','18 Peaches','https://www.freeslots99.com/app/uploads/Frozen-Fruits-FlexiWays.webp',96.50,10.00,100000.00,0,1,1,1,0,100,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(428,6,'Hacker Crash','hacker-crash-75afbc6c','slots',2,'75afbc6c7517b1bf138d27119dc79aa7','18 Peaches','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQu81lYy4z1snwkzMhncQesFFaheluB8wEUUQ&s',96.50,10.00,100000.00,0,1,1,1,0,101,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(429,6,'Irish Riches Bonanza','irish-riches-bonanza-82fdf1cb','slots',2,'82fdf1cb839508d88f2bb04d24666c60','18 Peaches','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRRewM_wLmNA9zoggYEq_jLFI03wbor9WCBhg&s',96.50,10.00,100000.00,0,1,1,1,0,102,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(430,6,'Leprechaun JackPot Collector','leprechaun-jackpot-collector-b6241fe7','slots',2,'b6241fe748133fb35f823b41ca6b0802','18 Peaches','https://images.sigma.world/Leprechaun-Jackpot-Collector-18-Peaches.png',96.50,10.00,100000.00,0,1,1,1,0,103,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(431,6,'Lucky Santa Bonanza','lucky-santa-bonanza-0ea60d86','slots',2,'0ea60d86212dff99cc5369e8afc8b1c9','18 Peaches','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMl3Hf__Sw2rQ1QWFo49QhIyRLO0k9Yvw3sg&s',96.50,10.00,100000.00,0,1,1,1,0,104,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(432,6,'Lucky Skulls Bonanza','lucky-skulls-bonanza-89a20b49','slots',2,'89a20b4911991b1bee79f094f072280e','18 Peaches','https://18peaches.com/images/games/lucky-skulls-bonanza/hero/logo-lucky-skulls-bonanza.webp',96.50,10.00,100000.00,0,1,1,1,0,105,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(433,6,'Monster Load Up Hold and Win','monster-load-up-hold-and-win-1957f3a5','slots',2,'1957f3a57133295720d7c992997d75bc','18 Peaches','https://www.freeslots99.com/app/uploads/Monster-Load-Up-Hold-Win.webp',96.50,10.00,100000.00,0,1,1,1,0,106,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(434,6,'Squid Gold X2','squid-gold-x2-95886d9b','slots',2,'95886d9b5729181ac20ff50fe7ab89d9','18 Peaches','https://images.sigma.world/squid-gold-x2-thumbnail.png',96.50,10.00,100000.00,0,1,1,1,0,107,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(435,6,'Vampire Vault Hold\'n\'Win','vampire-vault-hold-n-win-f05fda7a','slots',2,'f05fda7ab35d33d2ebeb71099231056c','18 Peaches','https://18peaches.com/images/games/vampire-vault-hold-n-win/hero/logo-vampire-vault-hold-n-win.webp',96.50,10.00,100000.00,0,1,1,1,0,108,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(436,6,'Wild Dragon Respin','wild-dragon-respin-302df8d7','slots',2,'302df8d74eb92f3e7fdf4a75ee64efb1','18 Peaches','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRv4bnEZ7tijc63eh7S5nifTy1RpDW_zYm7wQ&s',96.50,10.00,100000.00,0,1,1,1,0,109,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(437,6,'Wild Yoga Collector','wild-yoga-collector-ef814df3','slots',2,'ef814df3567cbacdb82f2ee786bf8d68','18 Peaches','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRPCFoUQwXjgOS6tRrZ8EB3asNGi52sQS0VJA&s',96.50,10.00,100000.00,0,1,1,1,0,110,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(438,6,'Yakuza Clash Hold\'n\'Win','yakuza-clash-hold-n-win-119ab5f4','slots',2,'119ab5f4243c4d7238fddfe239af5f2d','18 Peaches','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSsYmyYSZDrpintqa56Cd4uP7Jd4o57PR767Q&s',96.50,10.00,100000.00,0,1,1,1,0,111,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(439,3,'Sky Diver','sky-diver-93265f13','ai_games',6,'93265f1320a6f42962e7ddfb1913cac5','Veliplay','https://upload.wikimedia.org/wikipedia/en/a/a9/Skydive%21_cover.png',96.50,10.00,100000.00,0,1,1,1,0,112,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(440,3,'Crash For Six','crash-for-six-ef63852c','ai_games',6,'ef63852cb697ecd12b0ae16f44d4058f','Veliplay','https://velitech.com/wp-content/uploads/2025/02/crash_for_six.png',96.50,10.00,100000.00,0,1,1,1,0,113,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(441,3,'Space Plinko','space-plinko-fac31d72','ai_games',6,'fac31d72a78a1aca9273cac30d94db30','Veliplay','https://cdn.prod.website-files.com/668bc41d42b1975518886b71/668e939acbcf1ed38625e582_Space%20Plinko.webp',96.50,10.00,100000.00,0,1,1,1,0,114,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(442,3,'LaunchX','launchx-581ae78d','ai_games',6,'581ae78deb51539ce39460a4754db3b5','Veliplay','https://cdn.prod.website-files.com/64ccd6203afd959b043b23ac/65123713ec42516c5bae9566_4-1.webp',96.50,10.00,100000.00,0,1,1,1,0,115,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(443,3,'Night Heist','night-heist-a4804790','ai_games',6,'a480479055bac01520025b0d0a8ac6a6','Veliplay','https://cf.geekdo-images.com/AGDSArnJX1Q7bgsAh5J3Qw__itemrep/img/iFFF4niR1ZfrsI4ARXWz99ZCZ7g=/fit-in/246x300/filters:strip_icc()/pic8873091.jpg',96.50,10.00,100000.00,0,1,1,1,0,116,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(444,3,'Hungry Frog','hungry-frog-8f47db8c','ai_games',6,'8f47db8c18e3f0c00a67e3ef7fdadf20','Veliplay','https://imgs.crazygames.com/hungry-frog-zot_1x1/20250901081749/hungry-frog-zot_1x1-cover?format=auto&quality=100&metadata=none&width=1200',96.50,10.00,100000.00,0,1,1,1,0,117,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(445,3,'Fury Balloon','fury-balloon-c62ac85f','ai_games',6,'c62ac85fb5e72980d6e6a1745feb623a','Veliplay','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTia2h65xPSdRSr1nUN7tD7VDnQFAs2kmgrbw&s',96.50,10.00,100000.00,0,1,1,1,0,118,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(446,3,'Jingle Jump','jingle-jump-7860292c','ai_games',6,'7860292c9d9a8f916458a88a71c67fb5','Veliplay','https://velitech.com/wp-content/uploads/2023/12/play-jingle-preview.png',96.50,10.00,100000.00,0,1,1,1,0,119,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(447,3,'Deep Dive','deep-dive-24684813','ai_games',6,'24684813369cb4210f8c5c98cbe4e8ff','Veliplay','https://images.squarespace-cdn.com/content/v1/5ca7cef5147c5a0001b2bfe7/1670785426433-2MCAOIGCFYMYD5THFBB6/Cover_FA-01.png?format=1500w',96.50,10.00,100000.00,0,1,1,1,0,120,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(448,3,'X Match','x-match-28631ca6','ai_games',6,'28631ca6ce178649f63aaeb842b27aa6','Veliplay','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTe50jYJbum68CIFznWKZV86HTIX7xMNSMecg&s',96.50,10.00,100000.00,0,1,1,1,0,121,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(449,3,'Trouble Jet','trouble-jet-182bf1e9','ai_games',6,'182bf1e92487920ea40c9829435ba017','Veliplay','https://veliplay.com/wp-content/uploads/2024/09/TJ_promo.png',96.50,10.00,100000.00,0,1,1,1,0,122,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(450,4,'Hamster Run','hamster-run-af95a673','live_casino',3,'af95a673c8f3a420444d73421bcf0e7a','IN OUT MINI GAMES','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSIZ62QQnoZF6V4zGKnxiN0oocRw-SNX9h7cw&s',96.50,10.00,100000.00,0,1,1,1,0,33,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(451,4,'Plinko Aztec','plinko-aztec-134bbc0f','live_casino',3,'134bbc0f61b73824cf9a68411aa32dc6','IN OUT MINI GAMES','https://static.templodeslots.es/pict/1155475/Plinko-Aztec-1000.png?timestamp=1742471396000&imageDataId=1243617&width=320&height=247',96.50,10.00,100000.00,0,1,1,1,0,35,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(452,4,'SugarDaddy','sugardaddy-3c802c68','live_casino',3,'3c802c686f7f9270057b6bb69567ea98','IN OUT MINI GAMES','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvm1nrqMFFxuulpXuvCWtU-ZVdeW06zSDIyA&s',96.50,10.00,100000.00,0,1,1,1,0,36,2,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(453,4,'Chicken Road','chicken-road-2126c5c4','live_casino',3,'2126c5c458316ba1f2df65b387b60408','IN OUT MINI GAMES','https://s3-newsifier.ams3.digitaloceanspaces.com/grandprix247.com/images/2025-11/screenshot-2025-05-16-082941.jpg',96.50,10.00,100000.00,0,1,1,1,0,37,2,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(454,4,'Joker Poker','joker-poker-23d59c10','live_casino',3,'23d59c10bc65c3cfb6cafdf49969a2b7','IN OUT MINI GAMES','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQSHGzouWGYJA-wf3qVIpwa8Df7cmg7z9FXsw&s',96.50,10.00,100000.00,0,1,1,1,0,38,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(455,4,'Stairs','stairs-a6212c1c','live_casino',3,'a6212c1c462a2442a369a4ec25bf40d7','IN OUT MINI GAMES','https://play-lh.googleusercontent.com/gM5cFp2yYKLO2BYltsO0kD2b0yGSZ8FXvYsNDIhhANkHzDS1-o7piI_G00AbsUWUHQs=w526-h296-rw',96.50,10.00,100000.00,0,1,1,1,0,39,13,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(456,4,'Triple','triple-4169b950','live_casino',3,'4169b950c7cbd0bbd392941a13e56767','IN OUT MINI GAMES','https://i.ytimg.com/vi/YaQCC_mj30Y/hqdefault.jpg',96.50,10.00,100000.00,0,1,1,1,0,40,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(457,4,'Jogo Do Bicho','jogo-do-bicho-09a13890','live_casino',3,'09a138907ccf03d5c064c5ca71e9d9b3','IN OUT MINI GAMES','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT74QAjydBG6osj71OxpSH2n8EozNr4LmzeMw&s',96.50,10.00,100000.00,0,1,1,1,0,41,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(458,4,'Limbo','limbo-81c4999d','live_casino',3,'81c4999d70b1ebbb7cf89d8e41ad493c','IN OUT MINI GAMES','https://upload.wikimedia.org/wikipedia/en/c/cc/Limbo_Box_Art.jpg',96.50,10.00,100000.00,0,1,1,1,0,42,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(459,4,'AviaFly','aviafly-cb66d23b','live_casino',3,'cb66d23b547498132598589af324d558','IN OUT MINI GAMES','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5_jfQcPKHgdFFdOyBZecZn70-b9IXZGA0gg&s',96.50,10.00,100000.00,0,1,1,1,0,43,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(460,4,'Lucky mines','lucky-mines-3a3affa1','live_casino',3,'3a3affa176283107288f5da3698ffe7c','IN OUT MINI GAMES','https://bfstatic.io/preview/inout:LuckyMines@1x.jpeg',96.50,10.00,100000.00,0,1,1,1,0,44,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(461,4,'Coinflip','coinflip-9b48efcf','live_casino',3,'9b48efcf6b18b12fdd7dc8efe9ae971e','IN OUT MINI GAMES','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZbT4AH4Yhe0JLtIw3KX8WopCa4r9I00DD3A&s',96.50,10.00,100000.00,0,1,1,1,0,45,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(462,3,'Roulette','roulette-c81286ce','ai_games',6,'c81286ce4034dcf5b71d44c106f968db','IN OUT MINI GAMES','https://m.media-amazon.com/images/I/81NKBHKLb+L.png',96.50,10.00,100000.00,0,1,1,1,0,46,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(463,4,'Bubbles','bubbles-f84949bd','live_casino',3,'f84949bd783c7395b5f3092f4d4ec600','IN OUT MINI GAMES','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIOX84rKuvGAqkXAe2UP0mez5dDMplNTsgWg&s',96.50,10.00,100000.00,0,1,1,1,0,47,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(464,4,'Mines','mines-e5e23d4c','live_casino',3,'e5e23d4c8f7256a1753793cba5fb5aaf','IN OUT MINI GAMES','https://play-lh.googleusercontent.com/UzYDkZyYakZSC1rjw4x2K8YmOzZa6cCvPPmMUoI8hjhUA7LqsCYMtC8jySMss8w8t7Ml6vPeraT3jPa3zKMHiQ=w240-h480-rw',96.50,10.00,100000.00,0,1,1,1,0,48,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(465,4,'Sweet Keno','sweet-keno-2c62ddc0','live_casino',3,'2c62ddc0ad8e2c175ec771882e91789b','IN OUT MINI GAMES','https://bfstatic.io/preview/inout:SweetKeno@1x.jpeg',96.50,10.00,100000.00,0,1,1,1,0,49,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(466,4,'Hot-mines','hot-mines-6180fdaf','live_casino',3,'6180fdaf4dfab4042194a7d595aca4bb','IN OUT MINI GAMES','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSV9-WCKRFwkWFDQRbsyoUK7MFDZX90RFzBuw&s',96.50,10.00,100000.00,0,1,1,1,0,50,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(467,4,'Plinko 1000','plinko-1000-eb3f4260','live_casino',3,'eb3f4260c17737e09767bc4c06796a61','IN OUT MINI GAMES','https://images.evaplatform.tech/cdn-cgi/image/format=auto,width=180,height=180,trim.width=700,trim.height=700,trim.left=150,trim.top=150,dpr=1/games/inout-plinko-1000.png',96.50,10.00,100000.00,0,1,1,1,0,51,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(468,4,'Goblin-tower','goblin-tower-46d14949','live_casino',3,'46d14949aa244609aaa03fa58b198784','IN OUT MINI GAMES','https://goblin-tower.com/assets/img/download/goblin-tower-app.webp',96.50,10.00,100000.00,0,1,1,1,0,52,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(469,4,'Robo dice','robo-dice-d0ddc8ac','live_casino',3,'d0ddc8acfbc6836f0db6d270bd83243d','IN OUT MINI GAMES','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRNyHr271VDGXg837o0-Jzx2RlF1yLFno-Zsg&s',96.50,10.00,100000.00,0,1,1,1,0,53,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(470,4,'Hilo Joker','hilo-joker-f4fd9569','live_casino',3,'f4fd956965b6f08ce48fee7d4407aaed','IN OUT MINI GAMES','https://heathmont.imgix.net/casino-jdbgaming/HiLo.jpg?w=152&h=212&fit=crop&crop=faces&dpr=1.5&auto=compress%2Cformat&q=100',96.50,10.00,100000.00,0,1,1,1,0,54,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(471,4,'Double Online','double-online-d8439d60','live_casino',3,'d8439d6083288f9171930e60836ba505','IN OUT MINI GAMES','https://bfstatic.io/preview/inout:Double@3x.webp',96.50,10.00,100000.00,0,1,1,1,0,55,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(472,4,'Diver','diver-90741c45','live_casino',3,'90741c45a03fbfc800f79c3f5a23be44','IN OUT MINI GAMES','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZxiiQWXhp_RusAX44h1e9_MGdmqCVsxhNHQ&s',96.50,10.00,100000.00,0,1,1,1,0,56,1,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(473,4,'Cryptos','cryptos-445289d5','live_casino',3,'445289d56c9ee8fa590bf6b29b13dc37','IN OUT MINI GAMES','https://cimg.co/wp-content/uploads/2024/05/13220329/1715637808-best-crypto-games.jpg',96.50,10.00,100000.00,0,1,1,1,0,57,1,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(474,4,'Tower','tower-a51b03be','live_casino',3,'a51b03beafa1773484d1e9c866709589','IN OUT MINI GAMES','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNrMpambKlHXRaGquD3lUKow_3wSykgPgr0A&s',96.50,10.00,100000.00,0,1,1,1,0,58,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(475,3,'Wheel','wheel-757bdd7e','ai_games',6,'757bdd7e1d8c260807bc78449258d00c','IN OUT MINI GAMES','https://img.freepik.com/premium-vector/cartoon-wheel-fortune-lottery-design-element-spinning-lucky-fortune-isolated-white-vector_90220-2552.jpg?semt=ais_hybrid&w=740&q=80',96.50,10.00,100000.00,0,1,1,1,0,59,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(476,4,'Crash','crash-8ac6b247','live_casino',3,'8ac6b247bd94d71ecdeaa1e62d74f382','IN OUT MINI GAMES','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRxEvCpeO5uORJZZrXR2SJVuZpnnJymHfPBrg&s',96.50,10.00,100000.00,0,1,1,1,0,60,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(477,4,'Squid Gamebler','squid-gamebler-2bd20312','live_casino',3,'2bd203129afe1059923b45d7bd5de143','IN OUT MINI GAMES','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_ruLZ4pcgYqmz6onfbDHwuL11i9QlkDBa1A&s',96.50,10.00,100000.00,0,1,1,1,0,61,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(478,4,'BalloniX','ballonix-c6345c53','live_casino',3,'c6345c538d4eb8c4f6d91373009ffc8b','IN OUT MINI GAMES','https://bfstatic.io/preview/inout:BalloniX@3x.webp',96.50,10.00,100000.00,0,1,1,1,0,62,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(479,4,'Twist','twist-1eef5926','live_casino',3,'1eef592674667c25dfaf067feef6c1fc','IN OUT MINI GAMES','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSTs0NYC3Qu3lnJOjxWP25RgA2FJIoengweSg&s',96.50,10.00,100000.00,0,1,1,1,0,63,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(480,4,'Rock Paper Scissors','rock-paper-scissors-9ac1086c','live_casino',3,'9ac1086c9791c979ebd0397b9b6e8e8b','IN OUT MINI GAMES','https://platform.vox.com/wp-content/uploads/sites/2/chorus/uploads/chorus_asset/file/3488502/shutterstock_106919999.0.jpg?quality=90&strip=all&crop=0,0,100,100',96.50,10.00,100000.00,0,1,1,1,0,64,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(481,4,'Rabbit Road','rabbit-road-efb14d01','live_casino',3,'efb14d01f5ec68e1cf49c53f30c4d476','IN OUT MINI GAMES','https://s3-eu-west-1.amazonaws.com/tpd/logos/68dd0887feaa4aedec4b1797/0x0.png',96.50,10.00,100000.00,0,1,1,1,0,34,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(482,6,'Crash','crash-677eceb1','slots',2,'677eceb1fc0278ea6f57e53f3141f562','Galaxsys','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSJ6tcaDURmWVaDYKjES2uEUuy6wzqTJB50Eg&s',96.50,10.00,100000.00,0,1,1,1,0,123,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(483,6,'Keno 8 (1 Minute)','keno-8-1-minute-9a2a5ad7','slots',2,'9a2a5ad7ebf1660a23b2b3c0a6ccf729','Galaxsys','https://netcontent.cc/fortuneplay/i/s6/galaxsys/Keno8.webp',96.50,10.00,100000.00,0,1,1,1,0,124,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(484,6,'Keno 8 (2 Minute)','keno-8-2-minute-32eea3e1','slots',2,'32eea3e1a28377585dd6ba3e275a1c13','Galaxsys','https://www.primeapi.com/cdn/gameRes/sq/200/Keno81Minute.jpg',96.50,10.00,100000.00,0,1,1,1,0,125,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(485,6,'Keno Express','keno-express-3afe06de','slots',2,'3afe06de0dbaa6ef8d406d846f099b4e','Galaxsys','https://galaxsys.co/media/2023/12/13/5ea84673149e74a4bb390c2a8b369218c18c1090.webp',96.50,10.00,100000.00,0,1,1,1,0,126,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(486,6,'Penalty','penalty-2631ce8f','slots',2,'2631ce8fa647ee05bee93e9d63e137b7','Galaxsys','https://blueoceangaming.com/wp-content/uploads/df-penalty.jpg',96.50,10.00,100000.00,0,1,1,1,0,127,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(487,6,'SicBo','sicbo-801d4f53','slots',2,'801d4f535e7ec55160543ec83f5ac2c5','Galaxsys','https://blueoceangaming.com/wp-content/uploads/df-sicbo.jpg',96.50,10.00,100000.00,0,1,1,1,0,128,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(488,6,'Hilo','hilo-b594799d','slots',2,'b594799de8f02ddf27f0e04f1654e298','Galaxsys','https://blueoceangaming.com/wp-content/uploads/df-hilo.jpg',96.50,10.00,100000.00,0,1,1,1,0,129,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(489,6,'BlackJack','blackjack-f5bb302b','slots',2,'f5bb302b5f5772556db4ba37188e1e3f','Galaxsys','https://blueoceangaming.com/wp-content/uploads/df-blackjack.jpg',96.50,10.00,100000.00,0,1,1,1,0,130,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(490,6,'GoldenRA','goldenra-568b72d7','slots',2,'568b72d78f61ad38f317f183ba1efa2b','Galaxsys','https://cdn.hrzn.cloud/game/da291f53-dcc5-4f97-8a90-20d6692d7331.webp',96.50,10.00,100000.00,0,1,1,1,0,131,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(491,6,'Mr.Thimble','mr-thimble-2779858f','slots',2,'2779858f78ce08209c4fcf6198f32ac7','Galaxsys','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRIo7TD51fzBQY0O_sKH66tQasCmNlENTDccw&s',96.50,10.00,100000.00,0,1,1,1,0,132,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(492,6,'Crasher','crasher-51c48ce8','slots',2,'51c48ce8916dcb04fc92d84f7178db29','Galaxsys','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMRTVUMV8gh6xenookpiPCgllcgMl3hqFXsA&s',96.50,10.00,100000.00,0,1,1,1,0,133,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(493,6,'NinjaCrash','ninjacrash-f885b237','slots',2,'f885b2373b51f7d1853a2c2d6ef9a75e','Galaxsys','https://images.ctfassets.net/3h2k9ldv19d8/4e5wkUFPLpcv8OgyhAkeNi/daccd3b771816b83e8d1234e7cabba16/3.Square-.png?fm=webp&w=768&q=75',96.50,10.00,100000.00,0,1,1,1,0,134,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(494,6,'Plinkoman','plinkoman-cae12a5f','slots',2,'cae12a5fada53095e321f4d7111b144a','Galaxsys','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQT9qBqwX37OPW-yLtXYVSKb8vg9ICnVVeADg&s',96.50,10.00,100000.00,0,1,1,1,0,135,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(495,6,'Jungle Wheel','jungle-wheel-68c23eef','slots',2,'68c23eef4327e0328981e66420f33ae2','Galaxsys','https://thumbs.alea.com/64402b65_galaxsys_jungle-wheel_400x400.webp',96.50,10.00,100000.00,0,1,1,1,0,136,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(496,6,'Roulette X','roulette-x-5329394b','slots',2,'5329394bbfe1a06066eda99351a2942b','Galaxsys','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTj-kMj3sdFPuEHzHZcVZQfqCQ3hBv8QRDs0Q&s',96.50,10.00,100000.00,0,1,1,1,0,137,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(497,6,'Coin Flip','coin-flip-6b661271','slots',2,'6b6612717230df83c3bff6fd07fdd928','Galaxsys','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSXJXw6dQlaVczIEEeNoh1QEVpVLrFDTRcVGw&s',96.50,10.00,100000.00,0,1,1,1,0,138,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(498,6,'Scratch Map','scratch-map-14ca0a13','slots',2,'14ca0a134762317e0d539157d0d8dcb9','Galaxsys','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSSLGT63XcF_PmYn3wz-RIEGOMHNO8we3qTJQ&s',96.50,10.00,100000.00,0,1,1,1,0,139,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(499,6,'Magic Dice','magic-dice-23e035c9','slots',2,'23e035c950b266f55fe004fdd78ea6c7','Galaxsys','https://imagedelivery.net/OOahao1ejQQJFOoUSSCKqw/game/magic-dice/OWHLjHB6.png/public',96.50,10.00,100000.00,0,1,1,1,0,140,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(500,6,'Totem','totem-c743bb6a','slots',2,'c743bb6a8b56587e24a1d0c17a7fcb7d','Galaxsys','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCqnnf5MoutjyMl8C89Q3M9ZxRIr43xvMjjw&s',96.50,10.00,100000.00,0,1,1,1,0,141,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(501,3,'Crash Duel X','crash-duel-x-d901f78f','ai_games',6,'d901f78f875b497e577785c7e20ff99f','Smartsoft','https://bfstatic.io/preview/964c3fcdf9de4827b7c0a8abee3bb54d@1x.jpeg',96.50,10.00,100000.00,0,1,1,1,0,19,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(502,3,'4 Bonuses Bonanza','4-bonuses-bonanza-cab7aee3','ai_games',6,'cab7aee3bac4f737e21064af9b15eb3e','Smartsoft','https://bfstatic.io/preview/951898218e6240f582447b0b818d1dcc@3x.webp',96.50,10.00,100000.00,0,1,1,1,0,5,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(503,3,'RodeoX','rodeox-a3168ce2','ai_games',6,'a3168ce2162dd8abce11220bd9f21f84','Smartsoft','https://bfstatic.io/preview/1b0061521df549f6942d28e944f13e74@3x.webp',96.50,10.00,100000.00,0,1,1,1,0,24,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(504,3,'MultiHot5','multihot5-d14c7bee','ai_games',6,'d14c7bee006243f2c871f948567cd6de','Smartsoft','https://cdn.prod.website-files.com/68263adafcf8918559aaa083/69031c0f6b8dd5bda0c477f1_493x617%20(2).webp',96.50,10.00,100000.00,0,1,1,1,0,1,1,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(505,3,'Multi Hot Ways','multi-hot-ways-d1b3c0d5','ai_games',6,'d1b3c0d5a9244f091326d5b67326be29','Smartsoft','https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683033dbe3049eee5fe4ea38_MultiHotWays.webp',96.50,10.00,100000.00,0,1,1,1,0,2,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(506,3,'Burning Ice','burning-ice-80d9739d','ai_games',6,'80d9739d8f8c28efed374f92004aeff9','Smartsoft','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRaEvu2xIQwzu22l6SXUNtEoZZTun8H5ydkWA&s',96.50,10.00,100000.00,0,1,1,1,0,3,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(507,3,'Burning Ice 10','burning-ice-10-ec484f39','ai_games',6,'ec484f392ab823b1eda3ae165855aa62','Smartsoft','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4Um8ReqdRysiShiMBwKKEci6raQ3_fDwqiw&s',96.50,10.00,100000.00,0,1,1,1,0,4,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(508,3,'Burning Ice 40','burning-ice-40-a45fe511','ai_games',6,'a45fe51120ece7b82df68db517be93ef','Smartsoft','https://gares.cc/games/rect/1/webp/smartsoft_BurningIce10.webp',96.50,10.00,100000.00,0,1,1,1,0,6,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(509,3,'Wild & Gods','wild-gods-0c678423','ai_games',6,'0c6784230fa2e9a1025b94e5f922db20','Smartsoft','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRgHTGYEuQw7dkcYry7x2UIxGrtKFgeyx5ZFg&s',96.50,10.00,100000.00,0,1,1,1,0,7,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(510,3,'Book of Futuria','book-of-futuria-70aa2b99','ai_games',6,'70aa2b994c771293caf6e293ad558184','Smartsoft','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT0GGwpkRgGc5IV5ojwqz8lfNxVaneGr7Klwg&s',96.50,10.00,100000.00,0,1,1,1,0,8,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(511,3,'WildMultiStar','wildmultistar-15aaf33f','ai_games',6,'15aaf33fa883350f2e30e6e154da983d','Smartsoft','https://casinolandia.com/wp-content/uploads/2025/04/image-248-3.jpg',96.50,10.00,100000.00,0,1,1,1,0,9,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(512,3,'HotSamba','hotsamba-97975f47','ai_games',6,'97975f474952c6f82eca72c0dec22479','Smartsoft','https://cdn.prod.website-files.com/68263adafcf8918559aaa083/683030621c0794a24599f5cc_Hot%20Samba.webp',96.50,10.00,100000.00,0,1,1,1,0,10,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(513,3,'Vampires','vampires-3a849575','ai_games',6,'3a849575e6d3df594ba83d3083260a6e','Smartsoft','https://www.getwin.com/images/casino/games/smartsoft/vampires/thumbnail.webp',96.50,10.00,100000.00,0,1,1,1,0,11,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(514,3,'BINGO LUCKY CLOVER','bingo-lucky-clover-7bd34489','ai_games',6,'7bd34489984eea3d1bad41975fae542e','Smartsoft','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_sZtreqqhws6E-08oYtwNWIfS2HZ6BuC_XQ&s',96.50,10.00,100000.00,0,1,1,1,0,142,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(515,3,'FOOTBALL','football-5697722e','ai_games',6,'5697722e6724bd046fb2afbd424a014d','Smartsoft','https://cdn2.softswiss.net/i/s6/smartsoft/FootballX.webp',96.50,10.00,100000.00,0,1,1,1,0,143,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(516,3,'WILD VEGAS','wild-vegas-b282943c','ai_games',6,'b282943cd126f41a9e38bdd2bc76fe43','Smartsoft','https://www.casinorating.com/media/game_logo/0002/51/thumb_150165_game_logo_standart.jpg',96.50,10.00,100000.00,0,1,1,1,0,144,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(517,3,'LAND OF GEMS','land-of-gems-90940426','ai_games',6,'9094042632aac3550530ad5b525ffae6','Smartsoft','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTUIXcB9eUsBJA-GyRh8nQEBKcUdG-2xv4_0w&s',96.50,10.00,100000.00,0,1,1,1,0,145,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(518,3,'PHOENIX','phoenix-d56057bf','ai_games',6,'d56057bffa63438983c93aaf6fc788d6','Smartsoft','https://play-lh.googleusercontent.com/WYvBVKQBcu7hXxx9MlRHq8nxKWHjwxcOHzd9-GGO-dAFma6RB52BXelox85MfBl6qg',96.50,10.00,100000.00,0,1,1,1,0,146,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(519,3,'GOD OF FORTUNE','god-of-fortune-59d69795','ai_games',6,'59d69795bd961796525c0c49f294d6a9','Smartsoft','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQ2NPQb__VVcTjj_GIS45QZU6-T2tEVFksKQ&s',96.50,10.00,100000.00,0,1,1,1,0,147,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(520,3,'CrashX','crashx-f023cea0','ai_games',6,'f023cea0ab3e0c35ecbd607876b6000c','turbogamesasia','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQSpte9zlv2FrWV1224rIYNHIgNHYeJYORW6A&s',96.50,10.00,100000.00,0,1,1,1,0,148,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(521,3,'Dice Twice','dice-twice-15a182df','ai_games',6,'15a182dfecfd4fcad6076a810a2ea31f','turbogamesasia','https://imoon.com/files/public/banner_Img_Mobile_bfdec0d172.jpg',96.50,10.00,100000.00,0,1,1,1,0,149,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(522,3,'Mines','mines-e609e40e','ai_games',6,'e609e40e82f5414e31dd67878cc67fcc','turbogamesasia','https://www.coololdgames.com/wp-content/uploads/free-mines.webp',96.50,10.00,100000.00,0,1,1,1,0,150,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(523,3,'Ball&Ball','ball-ball-91525c2e','ai_games',6,'91525c2e2b91e7d2ec0140dc5ca2923b','turbogamesasia','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdDKZqnxf-tayz1r_GZBMWI-IVHEW1xKA45A&s',96.50,10.00,100000.00,0,1,1,1,0,151,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(524,3,'Limbo Rider','limbo-rider-7216e174','ai_games',6,'7216e174571092316e4d071399cc0fc0','turbogamesasia','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRInW1Ow7gpnyvYpwtzgTg4sHTic6UMnkLf4w&s',96.50,10.00,100000.00,0,1,1,1,0,152,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(525,3,'CrashX Football Edition','crashx-football-edition-a628c38d','ai_games',6,'a628c38d18b9816a2e1c5627e064d7e9','turbogamesasia','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSbaNuIlM4TEQoKuTeGH4KES6aByKlU5ozA0g&s',96.50,10.00,100000.00,0,1,1,1,0,153,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(526,3,'Save the Princess','save-the-princess-400e3bac','ai_games',6,'400e3bac945b77ae44c307092ad1369f','turbogamesasia','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcREAuFtIuATUR30YfSGwx_xduIfuN47JO782Q&s',96.50,10.00,100000.00,0,1,1,1,0,154,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(527,3,'Turbo Plinko','turbo-plinko-58780cb2','ai_games',6,'58780cb27054158845312d5bda968574','turbogamesasia','https://images.evaplatform.tech/cdn-cgi/image/format=auto,width=180,height=180,trim.width=700,trim.height=700,trim.left=150,trim.top=150,dpr=1/games/turbogames-turbo-plinko.png',96.50,10.00,100000.00,0,1,1,1,0,155,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(528,3,'Turbo Mines','turbo-mines-2b84d70f','ai_games',6,'2b84d70f6b637dabfc527515273fdd0f','turbogamesasia','https://turbominesgame.com/wp-content/uploads/2024/04/turbo-mines-demo.jpg',96.50,10.00,100000.00,0,1,1,1,0,156,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(529,3,'Fruit Towers','fruit-towers-b7f5746e','ai_games',6,'b7f5746e5ee7d5ea7f13e6db3e2dcb5c','turbogamesasia','https://images.evaplatform.tech/cdn-cgi/image/format=auto,width=180,height=180,trim.width=700,trim.height=700,trim.left=150,trim.top=150,dpr=1/games/turbogames-fruit-towers.png',96.50,10.00,100000.00,0,1,1,1,0,157,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(530,3,'HiLo','hilo-21c31058','ai_games',6,'21c310588382e86af1dc3d66ea3b387b','turbogamesasia','https://m.media-amazon.com/images/I/81e9lga7kLL._AC_SL1500_.jpg',96.50,10.00,100000.00,0,1,1,1,0,158,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(531,3,'Bubbles','bubbles-da56a87d','ai_games',6,'da56a87d4cf3e0ced7b7ce72aaf2d437','turbogamesasia','https://img.poki-cdn.com/cdn-cgi/image/q=78,scq=50,width=1200,height=1200,fit=cover,f=png/2d5e417ea0fc1ef06d746b2cef691c07/bubble-shooter-lak.png',96.50,10.00,100000.00,0,1,1,1,0,159,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(532,3,'Vortex','vortex-dd3a0786','ai_games',6,'dd3a07869b4a50330f2d691196297004','turbogamesasia','https://s3-eu-west-1.amazonaws.com/tpd/logos/6899f515dd17b897f89de374/0x0.png',96.50,10.00,100000.00,0,1,1,1,0,161,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(533,3,'Trading Dice','trading-dice-9c96e2b6','ai_games',6,'9c96e2b627c62dd28a4c4d36b12768da','turbogamesasia','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR7GjJ8Y1MNE9K_s5gSAz5RCNj5xyehsRYXWA&s',96.50,10.00,100000.00,0,1,1,1,0,162,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(534,3,'1Tap Mines','1tap-mines-dad62a94','ai_games',6,'dad62a94d4cefc185418f04816daca15','turbogamesasia','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_3hue8QVexE0b05gQh94ARfstLQo2Bb8CpA&s',96.50,10.00,100000.00,0,1,1,1,0,163,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(535,3,'Book of Mines','book-of-mines-038d26e4','ai_games',6,'038d26e4c9dfff266f45382d6b1f824a','turbogamesasia','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcROBwnk58qyydhR7EqpXQ43U_5uK3DSUdqEag&s',96.50,10.00,100000.00,0,1,1,1,0,164,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(536,3,'Crystal Poker','crystal-poker-6d6c6938','ai_games',6,'6d6c6938817d634ffff567743e578b0e','turbogamesasia','https://images.evaplatform.tech/cdn-cgi/image/format=auto,width=320,height=320,dpr=1,fit=cover/games/turbogames-crystal-poker.png',96.50,10.00,100000.00,0,1,1,1,0,165,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(537,3,'Pumped X','pumped-x-33d2cbfc','ai_games',6,'33d2cbfc69e725c5d771d31f11242b5f','turbogamesasia','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT3JVf0vanLyzeduuA5pC7Oa_FPz9wsJ_kwNQ&s',96.50,10.00,100000.00,0,1,1,1,0,166,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(538,3,'Catanza','catanza-431e7014','ai_games',6,'431e70145fb4054d772e6589d8ab7dad','turbogamesasia','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhjpR5n_lxc3swlGYCrO4sG6qPYGJCV2EKUA&s',96.50,10.00,100000.00,0,1,1,1,0,167,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(539,3,'Cricket Boom','cricket-boom-3af74cc0','ai_games',6,'3af74cc02faf7045b3a1af17a9c5991f','turbogamesasia','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTkUp0NNUipTBU0eI5GgDK6Pg6uOQTiHfExnA&s',96.50,10.00,100000.00,0,1,1,1,0,168,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(540,3,'Rings of Olympus','rings-of-olympus-969183d0','ai_games',6,'969183d01c2ed74b183757ed2667847b','turbogamesasia','https://d2rmaj9qusfeqg.cloudfront.net/megadice/game_images_v2/634ae8a88c99c8d5_792da1e1-bfc1-4a2d-887f-ff96017879e6.jpg',96.50,10.00,100000.00,0,1,1,1,0,169,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(541,3,'Panda Bao','panda-bao-6cb18a8a','ai_games',6,'6cb18a8a982c91de51e5513a1edadb7a','turbogamesasia','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTrbmrV9B5UDNfiR6hi_gHI9v91SQNNEwEYHw&s',96.50,10.00,100000.00,0,1,1,1,0,170,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(542,3,'Chicken Route','chicken-route-d5b66df0','ai_games',6,'d5b66df095c326398b3639f691d7df65','turbogamesasia','https://pridespins.com.gh/api/v1/Media/80335/Chicken-route-17135',96.50,10.00,100000.00,0,1,1,1,0,171,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(543,3,'Balloon Doggo','balloon-doggo-aee20eb5','ai_games',6,'aee20eb53e911933570a851e5a80df99','turbogamesasia','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQa9JYTC3PM6-vFJcq97PsHGx0LjvGmHr-IJQ&s',96.50,10.00,100000.00,0,1,1,1,0,172,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(544,3,'Vortex Safari','vortex-safari-fe6524ef','ai_games',6,'fe6524ef5d36869e5f42d0d120920ace','turbogamesasia','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRB-kaGd74fywfHXol5Ovb49_RixoOlu-yvXg&s',96.50,10.00,100000.00,0,1,1,1,0,173,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(545,3,'Vortex PowerPlay','vortex-powerplay-a07033bf','ai_games',6,'a07033bfe471f603fbbdbc6b660db565','turbogamesasia','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRB-kaGd74fywfHXol5Ovb49_RixoOlu-yvXg&s',96.50,10.00,100000.00,0,1,1,1,0,174,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(546,3,'Vortex 2','vortex-2-17b2f1e9','ai_games',6,'17b2f1e9f197a039fb40e3f620757c3a','turbogamesasia','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYl6fVXxTgfWHAjdL76lnZ5QHcL6rfHRKGpQ&s',96.50,10.00,100000.00,0,1,1,1,0,175,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(547,8,'Online Only','online-only-8','lottery',5,'8','India Lotto','https://www.biz4group.com/blog/images/cost-to-build-a-lottery-app/cost-to-build-a-lottery-app-banner.webp',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(548,8,'Christmax New Year Bumper','christmax-new-year-bumper-9','lottery',5,'9','India Lotto','https://img.onmanorama.com/content/dam/mm/en/archive/kerala/top-news/images/2026/1/24/christmas-new-year-bumper-lottery.jpg?w=1120&h=583',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(549,8,'Summer Bumper','summer-bumper-10','lottery',5,'10','India Lotto','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSl4hiqA0lnj2AenKp-j5W1c1YkeYNR6ZfZTA&s',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-09-11 14:42:54','2026-09-14 18:05:03'),
(550,8,'Vishu Bumper','vishu-bumper-11','lottery',5,'11','India Lotto','https://img.onmanorama.com/content/dam/mm/en/kerala/top-news/images/2025/5/28/vishu-bumper.jpg',96.50,10.00,100000.00,0,1,1,1,0,0,0,'2026-09-11 14:42:54','2026-09-14 18:05:03');
/*!40000 ALTER TABLE `games` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `login_history`
--

DROP TABLE IF EXISTS `login_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `admin_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `device_type` varchar(50) DEFAULT NULL,
  `country_code` char(2) DEFAULT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_login_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_history`
--

LOCK TABLES `login_history` WRITE;
/*!40000 ALTER TABLE `login_history` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `login_history` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `mail_configurations`
--

DROP TABLE IF EXISTS `mail_configurations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `mail_configurations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `scope` enum('casino','email_sms') NOT NULL,
  `config_key` varchar(80) NOT NULL,
  `config_value` text,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_mc` (`scope`,`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mail_configurations`
--

LOCK TABLES `mail_configurations` WRITE;
/*!40000 ALTER TABLE `mail_configurations` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `mail_configurations` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `mail_templates`
--

DROP TABLE IF EXISTS `mail_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `mail_templates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `template_type` enum('email','sms','push') NOT NULL DEFAULT 'email',
  `language` varchar(30) DEFAULT 'English',
  `trigger_event` varchar(50) DEFAULT 'manual',
  `sender_name` varchar(100) DEFAULT NULL,
  `reply_to` varchar(255) DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `body` text,
  `sent_count` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `track_opens` tinyint(1) NOT NULL DEFAULT '0',
  `track_clicks` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mail_templates`
--

LOCK TABLES `mail_templates` WRITE;
/*!40000 ALTER TABLE `mail_templates` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `mail_templates` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `monitoring_notes`
--

DROP TABLE IF EXISTS `monitoring_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `monitoring_notes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `admin_id` bigint unsigned DEFAULT NULL,
  `admin_name` varchar(120) DEFAULT NULL,
  `player_status` varchar(30) DEFAULT NULL,
  `note` text NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mn_user` (`user_id`),
  CONSTRAINT `monitoring_notes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `monitoring_notes`
--

LOCK TABLES `monitoring_notes` WRITE;
/*!40000 ALTER TABLE `monitoring_notes` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `monitoring_notes` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `admin_id` bigint unsigned DEFAULT NULL,
  `affiliate_id` bigint unsigned DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `message` text,
  `is_read` tinyint(1) DEFAULT '0',
  `metadata` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user` (`user_id`),
  KEY `idx_notif_admin` (`admin_id`),
  KEY `idx_notif_affiliate` (`affiliate_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `partner_settings`
--

DROP TABLE IF EXISTS `partner_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `partner_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `scope` enum('affiliate','agent') NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text,
  `updated_by` bigint unsigned DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_partner_setting` (`scope`,`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partner_settings`
--

LOCK TABLES `partner_settings` WRITE;
/*!40000 ALTER TABLE `partner_settings` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `partner_settings` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `payment_bin_rules`
--

DROP TABLE IF EXISTS `payment_bin_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_bin_rules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `provider_id` bigint unsigned DEFAULT NULL,
  `bin_from` varchar(8) NOT NULL,
  `bin_to` varchar(8) DEFAULT NULL,
  `card_brand` varchar(40) DEFAULT NULL,
  `country_code` char(2) DEFAULT NULL,
  `action` enum('allow','deny','route') NOT NULL DEFAULT 'allow',
  `priority` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pbr_bin` (`bin_from`),
  KEY `provider_id` (`provider_id`),
  CONSTRAINT `payment_bin_rules_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `payment_providers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_bin_rules`
--

LOCK TABLES `payment_bin_rules` WRITE;
/*!40000 ALTER TABLE `payment_bin_rules` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `payment_bin_rules` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `payment_frontend_rules`
--

DROP TABLE IF EXISTS `payment_frontend_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_frontend_rules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `method_id` bigint unsigned DEFAULT NULL,
  `country_code` char(2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `min_amount` decimal(18,2) DEFAULT '0.00',
  `max_amount` decimal(18,2) DEFAULT NULL,
  `display_order` int DEFAULT '0',
  `is_visible` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pfr_country` (`country_code`),
  KEY `method_id` (`method_id`),
  CONSTRAINT `payment_frontend_rules_ibfk_1` FOREIGN KEY (`method_id`) REFERENCES `payment_methods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_frontend_rules`
--

LOCK TABLES `payment_frontend_rules` WRITE;
/*!40000 ALTER TABLE `payment_frontend_rules` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `payment_frontend_rules` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `payment_methods`
--

DROP TABLE IF EXISTS `payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_methods` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL,
  `code` varchar(40) NOT NULL,
  `method_type` enum('card','wallet','bank','crypto','upi','other') DEFAULT 'other',
  `logo_url` varchar(500) DEFAULT NULL,
  `supports_deposit` tinyint(1) DEFAULT '1',
  `supports_withdrawal` tinyint(1) DEFAULT '0',
  `min_amount` decimal(18,2) DEFAULT '0.00',
  `max_amount` decimal(18,2) DEFAULT NULL,
  `currencies` varchar(255) DEFAULT NULL,
  `countries` text,
  -- Where the PLAYER SENDS money for a manual deposit. The deposit page has to
  -- show these, or the player is asked to pay with no account to pay into.
  `account_name` varchar(120) DEFAULT NULL,
  `account_number` varchar(64) DEFAULT NULL,
  `ifsc_code` varchar(20) DEFAULT NULL,
  `bank_name` varchar(120) DEFAULT NULL,
  `branch_name` varchar(120) DEFAULT NULL,
  `upi_id` varchar(120) DEFAULT NULL,
  `qr_image_url` varchar(500) DEFAULT NULL,
  -- Crypto methods: the chain/token label and the receiving wallet address.
  `crypto_network` varchar(40) DEFAULT NULL,
  `wallet_address` varchar(191) DEFAULT NULL,
  `instructions` text,
  `is_active` tinyint(1) DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pm_code` (`code`),
  KEY `idx_pm_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_methods`
--

LOCK TABLES `payment_methods` WRITE;
/*!40000 ALTER TABLE `payment_methods` DISABLE KEYS */;
set autocommit=0;
-- Explicit column list: this row predates the destination columns above, and a
-- bare VALUES(...) list stops the whole load with "column count doesn't match".

/*!40000 ALTER TABLE `payment_methods` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `payment_provider_methods`
--

DROP TABLE IF EXISTS `payment_provider_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_provider_methods` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `provider_id` bigint unsigned NOT NULL,
  `method_id` bigint unsigned NOT NULL,
  `fee_percent` decimal(6,3) DEFAULT '0.000',
  `fee_fixed` decimal(18,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ppm` (`provider_id`,`method_id`),
  KEY `method_id` (`method_id`),
  CONSTRAINT `payment_provider_methods_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `payment_providers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payment_provider_methods_ibfk_2` FOREIGN KEY (`method_id`) REFERENCES `payment_methods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_provider_methods`
--

LOCK TABLES `payment_provider_methods` WRITE;
/*!40000 ALTER TABLE `payment_provider_methods` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `payment_provider_methods` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `payment_providers`
--

DROP TABLE IF EXISTS `payment_providers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_providers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL,
  `code` varchar(40) NOT NULL,
  `api_endpoint` varchar(500) DEFAULT NULL,
  `credentials` json DEFAULT NULL,
  `supports_deposit` tinyint(1) DEFAULT '1',
  `supports_withdrawal` tinyint(1) DEFAULT '0',
  `deposit_countries` text,
  `withdrawal_countries` text,
  `currencies` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pp_code` (`code`),
  KEY `idx_pp_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_providers`
--

LOCK TABLES `payment_providers` WRITE;
/*!40000 ALTER TABLE `payment_providers` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `payment_providers` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `platform_settings`
--

DROP TABLE IF EXISTS `platform_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `platform_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` json NOT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platform_settings`
--

LOCK TABLES `platform_settings` WRITE;
/*!40000 ALTER TABLE `platform_settings` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `platform_settings` VALUES
(1,'social_links','{\"twitter\": \"\", \"facebook\": \"\", \"whatsapp\": \"https://wa.link/mahakalworld\", \"instagram\": \"\"}','2026-09-12 07:24:15');
/*!40000 ALTER TABLE `platform_settings` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `player_tasks`
--

DROP TABLE IF EXISTS `player_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `player_tasks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `task_type` varchar(60) DEFAULT NULL,
  `title` varchar(160) NOT NULL,
  `description` text,
  `status` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
  `assigned_to` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pt_status` (`status`),
  KEY `idx_pt_assigned` (`assigned_to`),
  KEY `idx_pt_user` (`user_id`),
  CONSTRAINT `player_tasks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `player_tasks`
--

LOCK TABLES `player_tasks` WRITE;
/*!40000 ALTER TABLE `player_tasks` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `player_tasks` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `profile_upgrade_queue`
--

DROP TABLE IF EXISTS `profile_upgrade_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `profile_upgrade_queue` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `current_level` varchar(30) DEFAULT 'basic',
  `requested_level` varchar(30) NOT NULL,
  `document_count` int NOT NULL DEFAULT '0',
  `status` enum('pending','approved','declined') NOT NULL DEFAULT 'pending',
  `reviewer_id` bigint unsigned DEFAULT NULL,
  `note` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_puq_user` (`user_id`),
  KEY `idx_puq_status` (`status`),
  CONSTRAINT `fk_puq_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `profile_upgrade_queue`
--

LOCK TABLES `profile_upgrade_queue` WRITE;
/*!40000 ALTER TABLE `profile_upgrade_queue` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `profile_upgrade_queue` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `promotion_posters`
--

DROP TABLE IF EXISTS `promotion_posters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `promotion_posters` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(150) DEFAULT NULL,
  `image_url` varchar(500) NOT NULL,
  `link_url` varchar(500) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `status` enum('draft','active') DEFAULT 'draft',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promotion_posters`
--

LOCK TABLES `promotion_posters` WRITE;
/*!40000 ALTER TABLE `promotion_posters` DISABLE KEYS */;
set autocommit=0;

/*!40000 ALTER TABLE `promotion_posters` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `sport_bets`
--

DROP TABLE IF EXISTS `sport_bets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sport_bets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `agent_id` bigint unsigned DEFAULT NULL,
  `event_id` bigint unsigned NOT NULL,
  `market_id` bigint unsigned NOT NULL,
  `selection_name` varchar(150) DEFAULT NULL,
  `side` enum('back','lay') NOT NULL DEFAULT 'back',
  `odds` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `run_line` decimal(10,2) DEFAULT NULL,
  `stake` decimal(18,2) NOT NULL,
  `liability` decimal(18,2) NOT NULL DEFAULT '0.00',
  `potential_win` decimal(18,2) NOT NULL DEFAULT '0.00',
  `exposure` decimal(18,2) NOT NULL DEFAULT '0.00',
  `profit_loss` decimal(18,2) NOT NULL DEFAULT '0.00',
  `commission` decimal(18,2) NOT NULL DEFAULT '0.00',
  `status` enum('open','won','lost','void','cancelled') NOT NULL DEFAULT 'open',
  `ip_address` varchar(45) DEFAULT NULL,
  `placed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `settled_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sb_user` (`user_id`,`placed_at`),
  KEY `idx_sb_agent` (`agent_id`,`placed_at`),
  KEY `idx_sb_event` (`event_id`),
  KEY `idx_sb_market` (`market_id`),
  KEY `idx_sb_status` (`status`),
  CONSTRAINT `sport_bets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sport_bets_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `sport_events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sport_bets_ibfk_3` FOREIGN KEY (`market_id`) REFERENCES `sport_markets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sport_bets`
--

LOCK TABLES `sport_bets` WRITE;
/*!40000 ALTER TABLE `sport_bets` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `sport_bets` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `sport_configurations`
--

DROP TABLE IF EXISTS `sport_configurations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sport_configurations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `config_key` varchar(80) NOT NULL,
  `config_value` text,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sc_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sport_configurations`
--

LOCK TABLES `sport_configurations` WRITE;
/*!40000 ALTER TABLE `sport_configurations` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `sport_configurations` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `sport_event_settings`
--

DROP TABLE IF EXISTS `sport_event_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sport_event_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `event_id` bigint unsigned NOT NULL,
  `max_stake` decimal(18,2) DEFAULT '0.00',
  `min_stake` decimal(18,2) DEFAULT '0.00',
  `volume_limit` decimal(18,2) DEFAULT '1.00',
  `odds_limit` decimal(10,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ses_event` (`event_id`),
  CONSTRAINT `sport_event_settings_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `sport_events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sport_event_settings`
--

LOCK TABLES `sport_event_settings` WRITE;
/*!40000 ALTER TABLE `sport_event_settings` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `sport_event_settings` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `sport_events`
--

DROP TABLE IF EXISTS `sport_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sport_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sport` varchar(40) NOT NULL,
  `event_key` varchar(64) DEFAULT NULL,
  `name` varchar(200) NOT NULL,
  `competition` varchar(150) DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `status` enum('upcoming','in_play','closed','settled','abandoned') NOT NULL DEFAULT 'upcoming',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `event_key` (`event_key`),
  KEY `idx_se_sport` (`sport`,`start_time`),
  KEY `idx_se_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sport_events`
--

LOCK TABLES `sport_events` WRITE;
/*!40000 ALTER TABLE `sport_events` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `sport_events` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `sport_fancy`
--

DROP TABLE IF EXISTS `sport_fancy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sport_fancy` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `event_id` bigint unsigned NOT NULL,
  `name` varchar(150) NOT NULL,
  `yes_value` int DEFAULT NULL,
  `no_value` int DEFAULT NULL,
  `min_bet` decimal(18,2) DEFAULT NULL,
  `max_bet` decimal(18,2) DEFAULT NULL,
  `exposure` decimal(18,2) NOT NULL DEFAULT '0.00',
  `status` enum('active','suspended','settled') NOT NULL DEFAULT 'active',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_fancy_event` (`event_id`),
  KEY `idx_fancy_status` (`status`),
  CONSTRAINT `fk_fancy_event` FOREIGN KEY (`event_id`) REFERENCES `sport_events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sport_fancy`
--

LOCK TABLES `sport_fancy` WRITE;
/*!40000 ALTER TABLE `sport_fancy` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `sport_fancy` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `sport_markets`
--

DROP TABLE IF EXISTS `sport_markets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sport_markets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `event_id` bigint unsigned NOT NULL,
  `market_key` varchar(64) DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `market_type` enum('match_odds','bookmaker','fancy','toss','tied_match','other') NOT NULL DEFAULT 'match_odds',
  `status` enum('open','suspended','closed','settled') NOT NULL DEFAULT 'open',
  `winning_selection` varchar(150) DEFAULT NULL,
  `settled_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_favourite` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sm_event_key` (`event_id`,`market_key`),
  KEY `idx_sm_event` (`event_id`),
  KEY `idx_sm_type` (`market_type`),
  KEY `idx_sm_favourite` (`is_favourite`),
  CONSTRAINT `sport_markets_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `sport_events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sport_markets`
--

LOCK TABLES `sport_markets` WRITE;
/*!40000 ALTER TABLE `sport_markets` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `sport_markets` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `sport_series`
--

DROP TABLE IF EXISTS `sport_series`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sport_series` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sport_id` bigint unsigned NOT NULL,
  `name` varchar(150) NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `max_bet` decimal(18,2) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_series_sport` (`sport_id`),
  CONSTRAINT `fk_series_sport` FOREIGN KEY (`sport_id`) REFERENCES `sports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sport_series`
--

LOCK TABLES `sport_series` WRITE;
/*!40000 ALTER TABLE `sport_series` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `sport_series` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `sports`
--

DROP TABLE IF EXISTS `sports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sports` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(60) NOT NULL,
  `code` varchar(20) DEFAULT NULL,
  `min_bet` decimal(18,2) DEFAULT '100.00',
  `max_bet` decimal(18,2) DEFAULT '100000.00',
  `max_profit` decimal(18,2) DEFAULT '1000000.00',
  `commission_percent` decimal(6,3) DEFAULT '0.000',
  `bet_delay_seconds` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sports`
--

LOCK TABLES `sports` WRITE;
/*!40000 ALTER TABLE `sports` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `sports` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `staff_group_permissions`
--

DROP TABLE IF EXISTS `staff_group_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_group_permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `group_id` bigint unsigned NOT NULL,
  `module` varchar(60) NOT NULL,
  `permission` varchar(60) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sgp` (`group_id`,`module`,`permission`),
  CONSTRAINT `staff_group_permissions_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `staff_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_group_permissions`
--

LOCK TABLES `staff_group_permissions` WRITE;
/*!40000 ALTER TABLE `staff_group_permissions` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `staff_group_permissions` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `staff_groups`
--

DROP TABLE IF EXISTS `staff_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_groups` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_staff_groups_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_groups`
--

LOCK TABLES `staff_groups` WRITE;
/*!40000 ALTER TABLE `staff_groups` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `staff_groups` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `support_tickets`
--

DROP TABLE IF EXISTS `support_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_tickets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `subject` varchar(255) NOT NULL,
  `category` enum('deposit','withdrawal','game','account','bonus','other') DEFAULT 'other',
  `priority` enum('low','medium','high') DEFAULT 'medium',
  `status` enum('open','in_progress','pending_user','resolved','closed') DEFAULT 'open',
  `importance` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  `assigned_to` bigint unsigned DEFAULT NULL,
  `last_activity_at` datetime DEFAULT NULL,
  `source` enum('web','email','whatsapp','phone','app') DEFAULT 'web',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_tickets_status` (`status`),
  KEY `idx_st_assigned` (`assigned_to`),
  CONSTRAINT `support_tickets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `support_tickets`
--

LOCK TABLES `support_tickets` WRITE;
/*!40000 ALTER TABLE `support_tickets` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `support_tickets` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `ticket_messages`
--

DROP TABLE IF EXISTS `ticket_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ticket_id` bigint unsigned NOT NULL,
  `sender_type` enum('user','agent','system') NOT NULL,
  `sender_id` bigint unsigned DEFAULT NULL,
  `message` text NOT NULL,
  `is_internal` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ticket_id` (`ticket_id`),
  CONSTRAINT `ticket_messages_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticket_messages`
--

LOCK TABLES `ticket_messages` WRITE;
/*!40000 ALTER TABLE `ticket_messages` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `ticket_messages` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `type` enum('deposit','withdrawal','bonus_credit','bet_settlement','refund','adjustment') NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'INR',
  `status` enum('pending','processing','completed','failed','rejected','cancelled') DEFAULT 'pending',
  `payment_method` varchar(50) DEFAULT NULL,
  `provider_id` bigint unsigned DEFAULT NULL,
  `provider_payment_id` varchar(120) DEFAULT NULL,
  `payment_provider` varchar(50) DEFAULT NULL,
  `reference_number` varchar(255) DEFAULT NULL,
  `payment_proof_url` varchar(500) DEFAULT NULL,
  `bonus_id` bigint unsigned DEFAULT NULL,
  `fraud_score` int DEFAULT '0',
  `metadata` json DEFAULT NULL,
  `notes` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `error_message` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tx_user` (`user_id`),
  KEY `idx_tx_type_status` (`type`,`status`),
  KEY `idx_tx_created` (`created_at`),
  KEY `idx_tx_provider_payment` (`provider_payment_id`),
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
set autocommit=0;

/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `user_bonuses`
--

DROP TABLE IF EXISTS `user_bonuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_bonuses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `bonus_id` bigint unsigned DEFAULT NULL,
  `amount` decimal(18,2) NOT NULL,
  `wagering_required` decimal(18,2) DEFAULT '0.00',
  `wagering_completed` decimal(18,2) DEFAULT '0.00',
  `credit_target` enum('bonus','main') DEFAULT 'bonus',
  `award_mode` enum('locked','pending') NOT NULL DEFAULT 'locked',
  `source` enum('joining','deposit','referral','game','cashback','promo','manual') NOT NULL DEFAULT 'manual',
  `transaction_id` bigint unsigned DEFAULT NULL,
  `granted_by` bigint unsigned DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `status` enum('pending','active','completed','expired','forfeited') DEFAULT 'pending',
  `expires_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_bonuses_user` (`user_id`),
  KEY `idx_user_bonuses_bonus` (`bonus_id`),
  KEY `idx_user_bonuses_source` (`source`),
  KEY `idx_user_bonuses_user_bonus` (`user_id`,`bonus_id`),
  CONSTRAINT `user_bonuses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_bonuses_ibfk_2` FOREIGN KEY (`bonus_id`) REFERENCES `bonuses` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_bonuses`
--

LOCK TABLES `user_bonuses` WRITE;
/*!40000 ALTER TABLE `user_bonuses` DISABLE KEYS */;
set autocommit=0;

/*!40000 ALTER TABLE `user_bonuses` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `user_settings`
--

DROP TABLE IF EXISTS `user_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `gender` enum('male','female','other','prefer_not_to_say') DEFAULT NULL,
  `phone_verified` tinyint(1) DEFAULT '0',
  `two_factor_enabled` tinyint(1) DEFAULT '0',
  `two_factor_secret` varchar(255) DEFAULT NULL,
  `affiliate_id` bigint unsigned DEFAULT NULL,
  `agent_id` bigint unsigned DEFAULT NULL,
  `referral_code` varchar(20) DEFAULT NULL,
  `referred_by` bigint unsigned DEFAULT NULL,
  `fraud_score` int DEFAULT '0',
  `risk_level` enum('low','medium','high') DEFAULT 'low',
  `vip_level` int DEFAULT '0',
  `is_demo` tinyint(1) DEFAULT '0',
  `demo_expires_at` datetime DEFAULT NULL,
  `website_language` varchar(10) DEFAULT 'en',
  `communication_language` varchar(10) DEFAULT 'en',
  `currency` varchar(10) DEFAULT 'INR',
  `registration_path` enum('direct') DEFAULT 'direct',
  `preferred_game_type` varchar(50) DEFAULT NULL,
  `typical_bet_range` varchar(20) DEFAULT NULL,
  `ai_voice_executive_id` varchar(50) DEFAULT NULL,
  `notifications_enabled` tinyint(1) DEFAULT '1',
  `marketing_opt_in` tinyint(1) DEFAULT '0',
  `settings` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `affiliate_link_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_settings_user` (`user_id`),
  UNIQUE KEY `uk_user_settings_referral_code` (`referral_code`),
  KEY `idx_user_settings_referred_by` (`referred_by`),
  KEY `idx_us_agent` (`agent_id`),
  CONSTRAINT `user_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_settings`
--

LOCK TABLES `user_settings` WRITE;
/*!40000 ALTER TABLE `user_settings` DISABLE KEYS */;
set autocommit=0;

/*!40000 ALTER TABLE `user_settings` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50) DEFAULT NULL,
  `country_code` char(2) DEFAULT NULL,
  `state` varchar(60) DEFAULT NULL,
  `signup_ip` varchar(45) DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `staff_group_id` bigint unsigned DEFAULT NULL,
  `account_status` enum('active','inactive','suspended','blocked') DEFAULT 'active',
  `last_login_at` datetime DEFAULT NULL,
  -- Most recently issued login token id; a newer login invalidates older sessions.
  `active_session_id` varchar(64) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `phone` (`phone`),
  KEY `idx_users_phone` (`phone`),
  KEY `idx_users_status` (`account_status`),
  KEY `idx_users_country` (`country_code`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_signup_ip` (`signup_ip`),
  KEY `idx_users_created_at` (`created_at`),
  KEY `idx_users_staff_group` (`staff_group_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
set autocommit=0;
-- Explicit column list: active_session_id was added after last_login_at and
-- defaults to NULL; a bare VALUES(...) list would fail with a column-count mismatch.
INSERT INTO `users` (`id`,`username`,`country_code`,`state`,`signup_ip`,`created_by`,`phone`,`password_hash`,`full_name`,`role`,`staff_group_id`,`account_status`,`last_login_at`,`created_at`,`updated_at`) VALUES
(1,'admin',NULL,NULL,NULL,NULL,NULL,'$2b$12$7ApjIY9R97wMLZ4Q5QnateoIhY9YZFqC3.xHAc0RDM8k6kBoPCQge','Platform Admin','admin',NULL,'active',NULL,'2026-09-02 12:57:59','2026-09-02 12:57:59');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `wallets`
--

DROP TABLE IF EXISTS `wallets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `wallets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `main_balance` decimal(18,2) DEFAULT '0.00',
  `bonus_balance` decimal(18,2) DEFAULT '0.00',
  `sports_bonus_balance` decimal(18,2) DEFAULT '0.00',
  `exposure_balance` decimal(18,2) DEFAULT '0.00',
  `locked_balance` decimal(18,2) DEFAULT '0.00',
  `wagering_balance` decimal(18,2) DEFAULT '0.00',
  `currency` varchar(10) DEFAULT 'INR',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wallet_user` (`user_id`),
  CONSTRAINT `wallets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallets`
--

LOCK TABLES `wallets` WRITE;
/*!40000 ALTER TABLE `wallets` DISABLE KEYS */;
set autocommit=0;

/*!40000 ALTER TABLE `wallets` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `withdrawal_stages`
--

DROP TABLE IF EXISTS `withdrawal_stages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `withdrawal_stages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `transaction_id` bigint unsigned NOT NULL,
  `stage` enum('account_verification','duplicate_check','wagering_compliance','final_approval','payment_processing') NOT NULL,
  `status` enum('pending','passed','failed','review') DEFAULT 'pending',
  `details` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `transaction_id` (`transaction_id`),
  CONSTRAINT `withdrawal_stages_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `withdrawal_stages`
--

LOCK TABLES `withdrawal_stages` WRITE;
/*!40000 ALTER TABLE `withdrawal_stages` DISABLE KEYS */;
set autocommit=0;

/*!40000 ALTER TABLE `withdrawal_stages` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Dumping routines for database 'mahakalworld'
--
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `_bo_add_column` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
DELIMITER ;;
CREATE DEFINER=`whitegamemaster`@`%` PROCEDURE `_bo_add_column`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `_bo_add_index` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
DELIMITER ;;
CREATE DEFINER=`whitegamemaster`@`%` PROCEDURE `_bo_add_index`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- ===========================================================================
-- Normalize game_providers / games.provider_id (idempotent; safe on fresh import)
-- ===========================================================================

INSERT INTO `game_providers` (`name`, `slug`, `is_active`, `created_at`)
SELECT * FROM (SELECT 'PG Soft' AS n, 'pg-soft' AS s, 1 AS a, NOW() AS c) AS t
WHERE NOT EXISTS (SELECT 1 FROM `game_providers` WHERE `name` = 'PG Soft');

UPDATE `games` g
  JOIN `game_providers` p ON p.`name` = TRIM(g.`game_type`)
SET g.`provider_id` = p.`id`
WHERE (g.`provider_id` IN (1,2,3,4,5,6,7) OR g.`provider_id` IS NULL)
  AND g.`game_type` IS NOT NULL
  AND p.`id` NOT IN (1,2,3,4,5,6,7)
  AND g.`provider_id` <> p.`id`;

UPDATE `games` g
  JOIN `game_providers` p
    ON p.`name` = CASE LOWER(TRIM(g.`game_type`))
         WHEN 'slot'            THEN 'PG Soft'
         WHEN 'casinotable'     THEN 'Spribe'
         WHEN '18peaches'       THEN '18 Peaches'
         WHEN 'inout minigames' THEN 'IN OUT MINI GAMES'
         WHEN 'lottery'         THEN 'India Lotto'
         WHEN 'cockfighting'    THEN 'Odin Cockfighting'
         WHEN 'sport'           THEN 'SportsGame'
         WHEN 'sports'          THEN 'SportsGame'
         WHEN 'blackjack'       THEN 'Evolution Live'
         WHEN 'casino'          THEN 'Evolution Live'
       END
SET g.`provider_id` = p.`id`
WHERE (g.`provider_id` IN (1,2,3,4,5,6,7) OR g.`provider_id` IS NULL)
  AND g.`provider_id` <> p.`id`;

UPDATE `games` g
  JOIN `game_providers` p ON p.`name` = 'Evolution Live'
SET g.`provider_id` = p.`id`
WHERE TRIM(g.`name`) IN (
        'Lightning Roulette', 'Speed Roulette', 'Immersive Roulette',
        'Baccarat B', 'First Person Lightning Baccarat', 'Infinite blackjack',
        'Power Blackjack', 'Blackjack Silver'
      )
  AND (g.`provider_id` IN (1,2,3,4,5,6,7) OR g.`provider_id` IS NULL);

UPDATE `games` g
  JOIN `game_providers` p ON p.`name` = 'LuckSportsGame'
SET g.`provider_id` = p.`id`
WHERE g.`name` = 'Luck Sports'
  AND (g.`provider_id` IN (1,2,3,4,5,6,7) OR g.`provider_id` IS NULL);

UPDATE `games` g
  JOIN `game_providers` p ON p.`name` = 'India Poker Game'
SET g.`provider_id` = p.`id`
WHERE TRIM(g.`name`) = 'Pool Rummy'
  AND (g.`provider_id` IN (1,2,3,4,5,6,7) OR g.`provider_id` IS NULL);

UPDATE `games` g
  JOIN `game_providers` p ON p.`name` = 'Fish Game'
SET g.`provider_id` = p.`id`
WHERE TRIM(g.`name`) = 'Mines Raider'
  AND (g.`provider_id` IN (1,2,3,4,5,6,7) OR g.`provider_id` IS NULL);

UPDATE `games` g
  JOIN `game_providers` p ON p.`name` = 'jilli'
SET g.`provider_id` = p.`id`
WHERE TRIM(g.`name`) = 'Wheel'
  AND g.`thumbnail_url` LIKE '%/gamelogo/JILI/%'
  AND (g.`provider_id` IN (1,2,3,4,5,6,7) OR g.`provider_id` IS NULL);

UPDATE `games` g
  JOIN `game_providers` p ON p.`name` = 'jilli'
  JOIN `game_providers` cur ON cur.`id` = g.`provider_id`
SET g.`provider_id` = p.`id`
WHERE g.`thumbnail_url` LIKE '%/gamelogo/JILI/%'
  AND cur.`name` = 'CasinoLive';

UPDATE `games` g
  JOIN `game_providers` p ON p.`id` = g.`provider_id`
SET g.`game_type` = p.`name`
WHERE (g.`game_type` IS NULL OR g.`game_type` = '')
  AND p.`id` NOT IN (1,2,3,4,5,6,7);

UPDATE `game_providers`
SET `is_active` = 0
WHERE `id` IN (1,2,3,4,5,6,7)
  AND NOT EXISTS (SELECT 1 FROM `games` WHERE `games`.`provider_id` = `game_providers`.`id`);

