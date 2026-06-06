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
    # Branding & domains
    path('super-admin/products/<slug:slug>/branding', views.product_branding),
    path('super-admin/products/<slug:slug>/domains', views.product_domains),
    path('super-admin/products/<slug:slug>/domains/<int:domain_id>', views.domain_delete),
    # Cross-tenant inspection & analytics
    path('super-admin/products/<slug:slug>/users', views.product_users),
    path('super-admin/analytics', views.analytics_summary),
]
