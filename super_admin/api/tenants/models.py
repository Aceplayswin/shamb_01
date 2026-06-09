"""Control-plane (master DB) models.

These describe the SaaS catalog of products/tenants, their URLs, isolated
database connections, and the platform Super Admin accounts. They always live
on the ``default`` (master) connection via ``TenantRouter``.
"""

from django.db import models


class Product(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        DISABLED = 'disabled', 'Disabled'

    id = models.BigAutoField(primary_key=True)
    slug = models.SlugField(max_length=63, unique=True)
    name = models.CharField(max_length=150)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    # Theme selection lives in the ProductTheme table (one row per theme), not here.
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tenants'
        db_table = 'products'

    @property
    def is_active(self) -> bool:
        return self.status == self.Status.ACTIVE


class ProductTheme(models.Model):
    """One row per theme per product. Exactly one row per product is active (the
    live theme the product frontend renders). Valid ``theme_key`` values come from
    the catalog in ``tenants/themes.py``."""

    id = models.BigAutoField(primary_key=True)
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, db_column='product_id', related_name='themes'
    )
    theme_key = models.CharField(max_length=63)
    is_active = models.BooleanField(default=False)
    is_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tenants'
        db_table = 'product_themes'
        unique_together = (('product', 'theme_key'),)


class Branding(models.Model):
    """White-label branding configuration for a product."""

    id = models.BigAutoField(primary_key=True)
    product = models.OneToOneField(
        Product, on_delete=models.CASCADE, db_column='product_id', related_name='branding'
    )
    product_name = models.CharField(max_length=150)
    logo_url = models.CharField(max_length=500, blank=True, default='')
    favicon_url = models.CharField(max_length=500, blank=True, default='')
    theme_color = models.CharField(max_length=20, default='#ff9800')
    secondary_color = models.CharField(max_length=20, default='#a78bfa')
    splash_url = models.CharField(max_length=500, blank=True, default='')
    app_icon_url = models.CharField(max_length=500, blank=True, default='')
    support_email = models.CharField(max_length=150, blank=True, default='')
    support_phone = models.CharField(max_length=50, blank=True, default='')
    terms_url = models.CharField(max_length=500, blank=True, default='')
    privacy_url = models.CharField(max_length=500, blank=True, default='')
    extra = models.JSONField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tenants'
        db_table = 'branding'


class Url(models.Model):
    """FE and BE URLs for a product."""

    id = models.BigAutoField(primary_key=True)
    product = models.OneToOneField(
        Product, on_delete=models.CASCADE, db_column='product_id', related_name='urls'
    )
    fe_url = models.CharField(max_length=500, blank=True, default='')
    be_url = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tenants'
        db_table = 'urls'


class Database(models.Model):
    """Connection details for a product's isolated tenant database."""

    id = models.BigAutoField(primary_key=True)
    product = models.OneToOneField(
        Product, on_delete=models.CASCADE, db_column='product_id', related_name='database'
    )
    db_name = models.CharField(max_length=120)
    db_host = models.CharField(max_length=255, default='localhost')
    db_port = models.CharField(max_length=10, default='3306')
    db_user = models.CharField(max_length=120)
    db_password = models.CharField(max_length=255, blank=True, default='')
    is_provisioned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tenants'
        db_table = 'databases'


class User(models.Model):
    """Platform Super Admin (separate from per-tenant user/admin accounts)."""

    id = models.BigAutoField(primary_key=True)
    username = models.CharField(max_length=50, unique=True)
    email = models.EmailField(null=True, blank=True)
    password_hash = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'tenants'
        db_table = 'users'


class UserSession(models.Model):
    """Tracks active login sessions. Only one session is active per user at a time."""

    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, db_column='user_id', related_name='sessions'
    )
    session_token = models.CharField(max_length=500, unique=True)
    ip_address = models.CharField(max_length=45, null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    device_type = models.CharField(max_length=50, null=True, blank=True)
    country_code = models.CharField(max_length=10, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    last_activity_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tenants'
        db_table = 'user_sessions'
