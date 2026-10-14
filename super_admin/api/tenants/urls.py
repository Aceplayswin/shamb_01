from django.urls import path

from tenants import views

urlpatterns = [
    # Super Admin auth
    path('super-admin/auth/login', views.super_admin_login),
    # Products (addressed by numeric id; api_key is secret and never in a URL)
    path('super-admin/products', views.products_list),
    path('super-admin/products/create', views.products_create),
    path('super-admin/products/<int:product_id>', views.product_detail),
    path('super-admin/products/<int:product_id>/update', views.product_update),
    path('super-admin/products/<int:product_id>/disable', views.product_disable),
    path('super-admin/products/<int:product_id>/delete', views.product_delete),
    # API key — generate / regenerate this product's api_key (the product's
    # PRODUCT_CONFIG_TOKEN). Same endpoint serves first-generate and rotate.
    path('super-admin/products/<int:product_id>/api-key/generate', views.product_api_key_generate),
    # Database update
    path('super-admin/products/<int:product_id>/database', views.product_database_update),
    # URLs
    path('super-admin/products/<int:product_id>/urls', views.product_urls),
    # Branding
    path('super-admin/products/<int:product_id>/branding', views.product_branding),
    # Upload a branding asset (logo/favicon/splash/app icon) -> returns its URL.
    path('super-admin/branding/upload', views.branding_asset_upload),
    # Themes
    path('super-admin/themes', views.themes_catalog),
    path('super-admin/products/<int:product_id>/themes', views.product_themes),
    path('super-admin/products/<int:product_id>/themes/activate', views.product_theme_activate),
    path('super-admin/products/<int:product_id>/themes/<str:theme_key>/enabled', views.product_theme_set_enabled),
    # Connection testing
    path('super-admin/test-connection', views.test_connection),
    # Product webhook credentials (RSA key pair securing the data channel)
    path('super-admin/products/<int:product_id>/credential', views.product_credential),
    path('super-admin/products/<int:product_id>/credential/generate', views.product_credential_generate),
    path('super-admin/products/<int:product_id>/credential/rotate', views.product_credential_rotate),
    path('super-admin/products/<int:product_id>/credential/mark-delivered', views.product_credential_mark_delivered),
    # Cross-tenant inspection
    path('super-admin/products/<int:product_id>/users', views.product_users),
    # Cross-tenant data explorer (read-only view of a product's tenant DB).
    # NOTE: the direct-DB path below is being superseded by the signed webhook
    # path (data-webhook/*); kept for now during the migration.
    path('super-admin/products/<int:product_id>/data/summary', views.product_data_summary),
    path('super-admin/products/<int:product_id>/data/<str:dataset>', views.product_dataset),
    # Game activation control (write): Super Admin flips a game's web visibility
    # directly in the product's tenant DB. Product admins can only add/edit games.
    path('super-admin/products/<int:product_id>/games/<int:game_id>/active', views.product_game_active),
    # Webhook-based data fetch (PULL): same datasets, fetched over the signed
    # webhook instead of connecting to the tenant database.
    path('super-admin/products/<int:product_id>/data-webhook/summary', views.product_webhook_summary),
    path('super-admin/products/<int:product_id>/data-webhook/deliveries', views.product_webhook_deliveries),
    path('super-admin/products/<int:product_id>/data-webhook/<str:dataset>', views.product_webhook_dataset),

    # Public (no auth) — product frontends resolve branding + live theme here,
    # addressed by product id (non-secret; the api_key is never in a URL).
    path('public/products/<int:product_id>/branding', views.public_product_branding),
    path('public/products/<int:product_id>/theme', views.public_product_theme),

    # Product config delivery — a product's own API pulls its identity/branding/
    # theme/webhook public keys instead of connecting to this master database.
    # Key-oriented: the product is identified from its api_key (X-Product-Token),
    # no slug required. See views.product_config_self.
    path('product/config', views.product_config_self),
]
