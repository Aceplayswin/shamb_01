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
    path('super-admin/products/<slug:slug>/provision', views.product_provision),
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
    # Cross-tenant inspection
    path('super-admin/products/<slug:slug>/users', views.product_users),
    # Cross-tenant data explorer (read-only view of a product's tenant DB)
    path('super-admin/products/<slug:slug>/data/summary', views.product_data_summary),
    path('super-admin/products/<slug:slug>/data/<str:dataset>', views.product_dataset),

    # Public (no auth) — product frontends resolve branding + live theme here.
    path('public/products/<slug:slug>/branding', views.public_product_branding),
    path('public/products/<slug:slug>/theme', views.public_product_theme),
]
