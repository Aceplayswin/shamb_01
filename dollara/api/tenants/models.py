"""Control-plane (master DB) models — read-only mirror of ``super_admin/api``.

These map to tables in ``super_admin/api/database/master.sql``. Dollara only
reads them for tenant resolution and branding; all writes (product onboarding,
branding edits, theme selection) happen in the Super Admin API.

They always live on the ``default`` (master) connection via ``TenantRouter``
and never inside any tenant database.
"""

from django.db import models


class Product(models.Model):
    """A white-label product/tenant (e.g. Dollara, Product B)."""

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        DISABLED = 'disabled', 'Disabled'

    id = models.BigAutoField(primary_key=True)
    slug = models.SlugField(max_length=63, unique=True)
    name = models.CharField(max_length=150)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tenants'
        db_table = 'products'

    @property
    def is_active(self) -> bool:
        return self.status == self.Status.ACTIVE


class ProductTheme(models.Model):
    """Per-product theme selection (managed by Super Admin)."""

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
