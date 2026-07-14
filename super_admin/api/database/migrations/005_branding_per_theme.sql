SET NAMES utf8mb4;
ALTER TABLE branding
  ADD COLUMN theme_key VARCHAR(63) NOT NULL DEFAULT 'theme1' AFTER product_id,
  ADD COLUMN colors JSON NULL AFTER secondary_color;
  
ALTER TABLE branding DROP INDEX product_id;
INSERT INTO branding
  (product_id, theme_key, product_name, logo_url, favicon_url, theme_color,
   secondary_color, colors, splash_url, app_icon_url, support_email,
   support_phone, terms_url, privacy_url, extra)
SELECT b.product_id, t.k, b.product_name, b.logo_url, b.favicon_url,
       b.theme_color, b.secondary_color, b.colors, b.splash_url, b.app_icon_url,
       b.support_email, b.support_phone, b.terms_url, b.privacy_url, b.extra
FROM branding b
JOIN (SELECT 'theme2' AS k UNION SELECT 'theme3' UNION SELECT 'theme4') t
WHERE b.theme_key = 'theme1'
  AND NOT EXISTS (
    SELECT 1 FROM branding b2
    WHERE b2.product_id = b.product_id AND b2.theme_key = t.k
  );

-- 4. New per-(product, theme) uniqueness.
ALTER TABLE branding
  ADD UNIQUE KEY uq_branding_product_theme (product_id, theme_key);
