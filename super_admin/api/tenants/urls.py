from django.urls import path

from tenants import views

urlpatterns = [
    # Super Admin auth
    path('super-admin/auth/login', views.super_admin_login),
    # Products
    path('super-admin/products', views.products_list),
    path('super-admin/products/create', views.products_create),
    path('super-admin/products/<slug:slug>', views.product_detail),
    path('super-admin/products/<slug:slug>/update', views.product_update),
    path('super-admin/products/<slug:slug>/disable', views.product_disable),
    path('super-admin/products/<slug:slug>/delete', views.product_delete),
    # Database update
    path('super-admin/products/<slug:slug>/database', views.product_database_update),
    # URLs
    path('super-admin/products/<slug:slug>/urls', views.product_urls),
    # Branding
    path('super-admin/products/<slug:slug>/branding', views.product_branding),
    # Themes
    path('super-admin/themes', views.themes_catalog),
    path('super-admin/products/<slug:slug>/themes', views.product_themes),
    path('super-admin/products/<slug:slug>/themes/activate', views.product_theme_activate),
    path('super-admin/products/<slug:slug>/themes/<str:theme_key>/enabled', views.product_theme_set_enabled),
    # Connection testing
    path('super-admin/test-connection', views.test_connection),
    # Product webhook credentials (RSA key pair securing the data channel)
    path('super-admin/products/<slug:slug>/credential', views.product_credential),
    path('super-admin/products/<slug:slug>/credential/generate', views.product_credential_generate),
    path('super-admin/products/<slug:slug>/credential/rotate', views.product_credential_rotate),
    path('super-admin/products/<slug:slug>/credential/mark-delivered', views.product_credential_mark_delivered),
    # Cross-tenant inspection
    path('super-admin/products/<slug:slug>/users', views.product_users),
    # Cross-tenant data explorer (read-only view of a product's tenant DB).
    # NOTE: the direct-DB path below is being superseded by the signed webhook
    # path (data-webhook/*); kept for now during the migration.
    path('super-admin/products/<slug:slug>/data/summary', views.product_data_summary),
    path('super-admin/products/<slug:slug>/data/<str:dataset>', views.product_dataset),
    # Webhook-based data fetch (PULL): same datasets, fetched over the signed
    # webhook instead of connecting to the tenant database.
    path('super-admin/products/<slug:slug>/data-webhook/summary', views.product_webhook_summary),
    path('super-admin/products/<slug:slug>/data-webhook/deliveries', views.product_webhook_deliveries),
    path('super-admin/products/<slug:slug>/data-webhook/<str:dataset>', views.product_webhook_dataset),

    # Public (no auth) — product frontends resolve branding + live theme here.
    path('public/products/<slug:slug>/branding', views.public_product_branding),
    path('public/products/<slug:slug>/theme', views.public_product_theme),

    # Product config delivery — a product's own API pulls its identity/branding/
    # theme/webhook public keys instead of connecting to this master database.
    # Key-oriented: the product is identified from its api_key (X-Product-Token),
    # no slug required. See views.product_config_self.
    path('product/config', views.product_config_self),
    # Legacy slug-addressed variant, kept for back-compat.
    path('products/<slug:slug>/config', views.product_config),
]
