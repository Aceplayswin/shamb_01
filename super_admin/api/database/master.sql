
--
-- Table structure for table `branding`
--

DROP TABLE IF EXISTS `branding`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `branding` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `theme_key` varchar(63) NOT NULL DEFAULT 'theme1',
  `product_name` varchar(150) NOT NULL,
  `logo_url` varchar(500) NOT NULL DEFAULT '',
  `favicon_url` varchar(500) NOT NULL DEFAULT '',
  `theme_color` varchar(20) NOT NULL DEFAULT '#ff9800',
  `secondary_color` varchar(20) NOT NULL DEFAULT '#a78bfa',
  `colors` json DEFAULT NULL,
  `splash_url` varchar(500) NOT NULL DEFAULT '',
  `app_icon_url` varchar(500) NOT NULL DEFAULT '',
  `support_email` varchar(150) NOT NULL DEFAULT '',
  `support_phone` varchar(50) NOT NULL DEFAULT '',
  `terms_url` varchar(500) NOT NULL DEFAULT '',
  `privacy_url` varchar(500) NOT NULL DEFAULT '',
  `extra` json DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_id` (`product_id`),
  UNIQUE KEY `uq_branding_product_theme` (`product_id`,`theme_key`),
  CONSTRAINT `fk_branding_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branding`
--

LOCK TABLES `branding` WRITE;
/*!40000 ALTER TABLE `branding` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `branding` VALUES
(1,1,'theme1','Rana Match','https://static.vecteezy.com/system/resources/thumbnails/011/883/284/small/colorful-star-logo-good-for-technology-logo-vintech-logo-company-logo-browser-logo-dummy-logo-bussiness-logo-free-vector.jpg','https://static.vecteezy.com/system/resources/thumbnails/011/883/284/small/colorful-star-logo-good-for-technology-logo-vintech-logo-company-logo-browser-logo-dummy-logo-bussiness-logo-free-vector.jpg','#f09d28','#5c5c61','{\"rail\": \"#0B0F14\", \"muted\": \"#9CA3AF\", \"panel\": \"#151A21\", \"accent\": \"#5c5c61\", \"app_bg\": \"#0B0F14\", \"app_fg\": \"#FFFFFF\", \"primary\": \"#f09d28\", \"hairline\": \"#FFFFFF\", \"panel_strong\": \"#0B0F14\"}','','','','','','',NULL,'2026-07-20 07:29:23'),
/*!40000 ALTER TABLE `branding` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `databases`
--

DROP TABLE IF EXISTS `databases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `databases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `db_name` varchar(120) NOT NULL,
  `db_host` varchar(255) NOT NULL DEFAULT 'localhost',
  `db_port` varchar(10) NOT NULL DEFAULT '3306',
  `db_user` varchar(120) NOT NULL,
  `db_password` varchar(255) NOT NULL DEFAULT '',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_id` (`product_id`),
  CONSTRAINT `fk_db_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `databases`
--

LOCK TABLES `databases` WRITE;
/*!40000 ALTER TABLE `databases` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `databases` VALUES
(1,1,'dollara','13.201.218.191','3306','whitegamemaster','Aceplays!1a','2026-07-13 14:36:03','2026-07-13 14:36:03');
/*!40000 ALTER TABLE `databases` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `product_credentials`
--

DROP TABLE IF EXISTS `product_credentials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_credentials` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `key_id` varchar(64) NOT NULL,
  `private_pem` text NOT NULL,
  `public_pem` text NOT NULL,
  `fingerprint` varchar(40) NOT NULL DEFAULT '',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `delivered_to_product_at` datetime DEFAULT NULL,
  `last_used_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `rotated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key_id` (`key_id`),
  KEY `idx_credentials_product_active` (`product_id`,`is_active`),
  CONSTRAINT `fk_credentials_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_credentials`
--

LOCK TABLES `product_credentials` WRITE;
/*!40000 ALTER TABLE `product_credentials` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `product_credentials` VALUES
(1,1,'sak_401fb01252b926a5d8a4534129cd3465','-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDVUVE89sRlKLCQ\nPfJhnEW8rHAhhAhKgF+GxFd3c5FpD/27AYMTkHN/vFPty/+TJtlbu7LkhZbTJ98d\nKs6k2CxbW7YPEJflQWMQKBORxIV1mVX3B+2m63C41CbjLyVIYMwlvfP5FCV+1qqg\nAOB2SxwHrEnEq5uXqx416pRDHnLHMsWGct+XIiEHez6scAkv4oWFlmN7wVl2ErWU\nEI5Di+c1iaJxG5iHCoJmA3utSRpi7sdfZzjEY3JMwi3yBr5y5GgzecxZc05tXYAo\nhlFUKf8fzqNetYZ0c076xNdL181EsksKgikM/KlU4eFxr6K/273I9ZNTaJD8ccUC\nlcmHCcfxAgMBAAECggEAB0xOarcIlhYTywOLi4JfXRVLNXerxEdrEpRyEktOZ26d\ndYHs5u+eEU8zUeM/qFxVEGSLZMfF7A3PqNL3meqEGKYPxFPYK9xA/uMCybhpq9HQ\nqpscqtrK6E/oeq+jZ2avEAAqh37Zyjf0Q3V0OH0uWtGD/pSzxeHGrqfgEFcg1ybE\ntAHJasq4Cs1SkYPZ1jD6YKtehGuHN/loVVz+ehyQ/0IUFp7GwxE+w4fMzrYvPjMi\nO/FdyuPHDkb5xDqCoHzulS6dpWhsmQN56U2zPuteuS0k1MaoyH7lZgX9thZk8+Gr\nCrt1VnkYeFNk6kIq4w2yYT1qxfmAXC808GIvnPQQjwKBgQDuRwzcBYRUUZ+2cgAU\nO714KePDy3/GBdcw5fztEM4LExtTYtGDaZ3ezyUmmgvWlVHxtBNtthlY+sn9DXSA\n6y3I6lbIieIOoHFvPoWIe1EILAJs0pjsVg/J9ad0FujwmSxK1PUJbd2uIRzdYTmS\nfIXnwHPMGYAc2JHd7pWhWt+2hwKBgQDlLwP3DsGJU1b4bIzqzml0TvVDBXHbMoGf\n9LuZiVHRkwSjWgDGwF7mcg8HDdX/nZ2y0WmOBNfL8O+ak6pd6wUlzyfn7iiH4+am\nvLhHEr19PHdmJgVmDl1dwLyFZK8vh57cmQ4TlXsW0pV48X3A9kuk3nTf+f7es5g5\ne7vN64ozxwKBgQCHibTf5ud6CyAdaMVwvPauxq0/r58T5jidIQX5V8jMdebiTOC+\nrrJVjmEkjxXSzwdYxMUUcDQE8Es7fY7a0mwt0FbjJcOH7G36CIduti7Gxjnu6vB/\n5wh+KhVBrNJ+IbMXMgHchjlGFqHTr71O/TQyOr/jxlGglvSKWG+W5BlDOwKBgDEs\ny18BbYl3tluLfxkKvRnVr054Jpvv1Fxr+KzTCBk9wGsEbtI2iKZNpufOkjJMsX+i\n61ErvNnnkqHKOW35dZtNPbTIJy4xOlZge/HUFZB/nubuFY52WpY5OroshmJeaTnQ\nJXMSSdz1xlizCFaVAloX2WANliBWzLzYzc07UuYVAoGBALheRDwTV4IZ9gr18oze\nKLbR/j3Xb+kdvYhREOa9TlGzNzaZeYG2b7hhyZngO9SFXZcxle/EtCbhsUnWGJyr\nQ2ddRaGXix5b8ZtJV0AKHOj35gfWEMcBG8TIIbz3BBn6C8qLrUVaO/6KUNHNmwds\njplyI0mV1n9Ka2EGbpp/HiCM\n-----END PRIVATE KEY-----\n','-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1VFRPPbEZSiwkD3yYZxF\nvKxwIYQISoBfhsRXd3ORaQ/9uwGDE5Bzf7xT7cv/kybZW7uy5IWW0yffHSrOpNgs\nW1u2DxCX5UFjECgTkcSFdZlV9wftputwuNQm4y8lSGDMJb3z+RQlftaqoADgdksc\nB6xJxKubl6seNeqUQx5yxzLFhnLflyIhB3s+rHAJL+KFhZZje8FZdhK1lBCOQ4vn\nNYmicRuYhwqCZgN7rUkaYu7HX2c4xGNyTMIt8ga+cuRoM3nMWXNObV2AKIZRVCn/\nH86jXrWGdHNO+sTXS9fNRLJLCoIpDPypVOHhca+iv9u9yPWTU2iQ/HHFApXJhwnH\n8QIDAQAB\n-----END PUBLIC KEY-----\n','5c98:363b:cc59:38ae',1,NULL,NULL,'2026-07-13 14:36:03',NULL),
/*!40000 ALTER TABLE `product_credentials` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `product_themes`
--

DROP TABLE IF EXISTS `product_themes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_themes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `theme_key` varchar(63) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '0',
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_theme` (`product_id`,`theme_key`),
  KEY `idx_product_themes_active` (`product_id`,`is_active`),
  CONSTRAINT `fk_product_themes_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_themes`
--

LOCK TABLES `product_themes` WRITE;
/*!40000 ALTER TABLE `product_themes` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `product_themes` VALUES
(1,1,'theme1',1,1,'2026-07-13 14:36:03','2026-07-23 08:38:43'),
(2,1,'theme2',0,1,'2026-07-13 14:36:03','2026-07-20 07:22:47'),
(3,1,'theme3',0,1,'2026-07-13 14:36:03','2026-07-20 07:24:01'),
(4,1,'theme4',0,1,'2026-07-13 14:36:03','2026-07-20 07:24:58'),
(5,1,'theme5',0,1,'2026-07-19 13:23:45','2026-07-23 08:38:43'),
/*!40000 ALTER TABLE `product_themes` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(63) DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `api_key` varchar(64) DEFAULT NULL,
  `status` enum('active','disabled') NOT NULL DEFAULT 'active',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  UNIQUE KEY `api_key` (`api_key`),
  KEY `idx_products_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `products` VALUES
(1,'ranamatch','Ranamatch','pk_a945fd8c6ae803dabeab492ea9cad9de1ff8b35f318d1f60','active','2026-07-13 14:36:03','2026-07-13 14:36:03'),
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `urls`
--

DROP TABLE IF EXISTS `urls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `urls` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `fe_url` varchar(500) NOT NULL DEFAULT '',
  `be_url` varchar(500) NOT NULL DEFAULT '',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_id` (`product_id`),
  CONSTRAINT `fk_urls_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `urls`
--

LOCK TABLES `urls` WRITE;
/*!40000 ALTER TABLE `urls` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `urls` VALUES
(1,1,'https://ranamatch.com/','https://api.ranamatch.com/','2026-07-13 14:36:03','2026-07-13 14:36:03');
/*!40000 ALTER TABLE `urls` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `session_token` varchar(500) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `device_type` varchar(50) DEFAULT NULL,
  `country_code` varchar(10) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime DEFAULT NULL,
  `last_activity_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_token` (`session_token`),
  KEY `idx_sessions_user` (`user_id`),
  KEY `idx_sessions_active` (`is_active`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_sessions`
--

LOCK TABLES `user_sessions` WRITE;
/*!40000 ALTER TABLE `user_sessions` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `user_sessions` VALUES
(1,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg0MDE0NjgyfQ.2ZRgcepxNldfhy2-y4WrsWv1ocpEasC24EYC8U4irn8','110.225.227.188','Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36','mobile',NULL,0,'2026-07-07 07:38:02','2026-07-14 07:38:02','2026-07-07 08:16:42'),
(2,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg0MDE3MDAyfQ.d8jLoutWNRvP-pOGPjxFuA92Q8rubreIhsikpO_9EJY','110.225.227.188','Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36','mobile',NULL,0,'2026-07-07 08:16:42','2026-07-14 08:16:42','2026-07-07 12:29:19'),
(3,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg0MDMyMTU5fQ.nv5vBCWgp-LwDT0apSqrbsqssxc2leR4HNKObjs_BHE','109.177.214.174','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop',NULL,0,'2026-07-07 12:29:20','2026-07-14 12:29:20','2026-07-08 20:03:28'),
(4,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg0MTQ1ODA4fQ.VZANPKM-8kewpJAWRuarzVFJU_ryXNhuJCmkgYYycU0','127.0.0.1','Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36','mobile',NULL,0,'2026-07-08 20:03:29','2026-07-15 20:03:29','2026-07-08 20:05:45'),
(5,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg0MTQ1OTQ1fQ.xd7yE1duPKohY8DEq6Zw4-Q_k99O1AR3eTMoFvGt23E','127.0.0.1','Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36','mobile',NULL,0,'2026-07-08 20:05:45','2026-07-15 20:05:45','2026-07-09 19:21:38'),
(6,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg0MjI5Njk4fQ.WMxD_HQoNcvyKlnvVxe1NOkEzrHuLLGnnESivheAN30','106.215.148.93','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','desktop',NULL,0,'2026-07-09 19:21:39','2026-07-16 19:21:39','2026-07-10 03:38:22'),
(7,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg0MjU5NTAyfQ.-dDYZIrCvMs49mIaWoUilZp0M7jnF_QFnXqbVDOEILk','109.177.214.174','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop',NULL,0,'2026-07-10 03:38:23','2026-07-17 03:38:23','2026-07-10 15:35:05'),
(8,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg0MzAyNTA1fQ.Vl8Jl2-Y-VxU01qq7-MILAOvls5GkpZDSypL0Hjj1vs','110.225.227.34','Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36','mobile',NULL,0,'2026-07-10 15:35:05','2026-07-17 15:35:05','2026-07-10 19:43:41'),
(9,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg0MzE3NDIxfQ.iwH0-kY_SOaj0Y7o0H5nkwGmHci7KlD7ZL6T6A25PSY','149.88.106.90','Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1','mobile',NULL,0,'2026-07-10 19:43:41','2026-07-17 19:43:41','2026-07-11 16:10:02'),
(10,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg0MzkxMDAyfQ.iv7yNEh3qbWPu69cLL6x2f3ElnZjIq6si2GKa43xPak','15.235.212.113','Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1','mobile',NULL,0,'2026-07-11 16:10:02','2026-07-18 16:10:02','2026-07-13 04:17:04'),
(11,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg0NTIxMDI0fQ.qWuf4sT-5JwvV_iAHcQvFyV6sEd2mp_k9LuijSL2U40','110.225.227.56','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','desktop',NULL,0,'2026-07-13 04:17:04','2026-07-20 04:17:04','2026-07-13 04:21:35'),
(12,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg0NTIxMjk1fQ.RQ6H0EID1HZHktea8m6IMjaib9zXXrBeNNqesZsaGJQ','110.225.227.56','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','desktop',NULL,0,'2026-07-13 04:21:35','2026-07-20 04:21:35','2026-07-13 05:11:50'),
(13,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg0NTI0MzEwfQ._PnhZk_zqY6pRGp32XcA_mJwWceVIb3HBEFJ4JgpFCk','109.177.214.174','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','desktop',NULL,0,'2026-07-13 05:11:51','2026-07-20 05:11:51','2026-07-13 07:42:18'),
(14,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg0NTMzMzM4fQ.UM8bMVW8V32O_-ko_yKRS6XYbBffXZTdtnxlmWpw9YU','86.99.156.116','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','desktop',NULL,0,'2026-07-13 07:42:18','2026-07-20 07:42:18','2026-07-15 08:36:29'),
(15,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg0NzA5Mzg5fQ.0CMTM0ntoSe2W_5HM4k4IH_LuP0yu8R8EuEU_Lc0bN0','110.225.227.6','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','desktop',NULL,0,'2026-07-15 08:36:30','2026-07-22 08:36:30','2026-07-16 10:06:44'),
(16,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg0ODAxMjA0fQ.S9GpUgmcXIE4cBUDd08p99cwjqIdnvO30s7IGoL62ZI','109.177.214.174','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','desktop',NULL,0,'2026-07-16 10:06:45','2026-07-23 10:06:45','2026-07-16 11:43:38'),
(17,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg0ODA3MDE4fQ.ZMkYJ3zs1P3CdD3s5q7MRq9fT8tP30WSYMR6CyE0_-o','127.0.0.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','desktop',NULL,0,'2026-07-16 11:43:38','2026-07-23 11:43:38','2026-07-18 09:21:56'),
(18,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg0OTcxMzE2fQ.waqaynNIopkCwpTpDHt5cplW1rzdSMfb145PXKo2K_c','51.158.195.13','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','desktop',NULL,0,'2026-07-18 09:21:57','2026-07-25 09:21:57','2026-07-19 13:13:02'),
(19,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg1MDcxNTgyfQ.O7ey8nTytfmfxGGeTY8NwT00abUKZnTBT7i_DT24kss','109.177.214.174','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','desktop',NULL,0,'2026-07-19 13:13:03','2026-07-26 13:13:03','2026-07-20 06:55:09'),
(20,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg1MTM1MzA5fQ.G-x8polCOxWo-R4k8R0oDr4vBiHcT3y4t17WdGeh99E','109.177.214.174','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','desktop',NULL,0,'2026-07-20 06:55:09','2026-07-27 06:55:09','2026-07-21 20:35:38'),
(21,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg1MjcwOTM4fQ.LAGzNrzgkaOAVcTU8Pstc54QTHDtld8yOy-pNJj9g5M','109.177.214.174','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','desktop',NULL,0,'2026-07-21 20:35:39','2026-07-28 20:35:39','2026-07-23 07:19:18'),
(22,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg1Mzk1OTU4fQ.py29YEFUbGM-xld3CK0Sbn4ucaNAGOUEKpLkTYycYGE','110.225.227.30','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','desktop',NULL,0,'2026-07-23 07:19:19','2026-07-30 07:19:19','2026-07-23 12:25:42'),
(23,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN1cGVyX2FkbWluIiwiZXhwIjoxNzg1NDE0MzQyfQ.baGMZHnfFDDjpIeuXsOF7TNLg0NQW8HgXDkwRWqJUtY','127.0.0.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36','desktop',NULL,1,'2026-07-23 12:25:42','2026-07-30 12:25:42','2026-07-23 12:25:42');
/*!40000 ALTER TABLE `user_sessions` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `users` VALUES
(1,'superadmin','superadmin@platform.local','$2b$12$3yHr1sy8Qx4ETNqZ.lWC..KcE6aV16Lj0UeVpOrnauQPtAp/xAvg6',1,'2026-07-23 12:25:42','2026-07-07 06:37:55');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `webhook_deliveries`
--

DROP TABLE IF EXISTS `webhook_deliveries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `webhook_deliveries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `credential_id` int DEFAULT NULL,
  `resource` varchar(100) NOT NULL,
  `request_method` varchar(10) NOT NULL DEFAULT 'GET',
  `request_path` varchar(500) NOT NULL DEFAULT '',
  `nonce` varchar(64) NOT NULL DEFAULT '',
  `status` enum('pending','success','failed') NOT NULL DEFAULT 'pending',
  `http_status` int DEFAULT NULL,
  `duration_ms` int DEFAULT NULL,
  `error` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_deliveries_product_created` (`product_id`,`created_at`),
  KEY `idx_deliveries_status` (`status`),
  KEY `fk_deliveries_credential` (`credential_id`),
  CONSTRAINT `fk_deliveries_credential` FOREIGN KEY (`credential_id`) REFERENCES `product_credentials` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_deliveries_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `webhook_deliveries`
--

LOCK TABLES `webhook_deliveries` WRITE;
/*!40000 ALTER TABLE `webhook_deliveries` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `webhook_deliveries` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Dumping routines for database 'whitegamemaster'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-07-23 18:29:57
