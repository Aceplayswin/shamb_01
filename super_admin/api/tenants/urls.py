from django.urls import path

from tenants import views

urlpatterns = [
    # Super Admin auth
    path('super-admin/auth/login', views.super_admin_login),
    # Public (no auth): active UI theme for a product frontend
    path('super-admin/public/theme', views.public_active_theme),
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
    # Connection testing
    path('super-admin/test-connection', views.test_connection),
    # Cross-tenant inspection
    path('super-admin/products/<slug:slug>/users', views.product_users),
]
