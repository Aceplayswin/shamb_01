"""Control-plane (master DB) models.

These describe the SaaS catalog of products/tenants, their domains, isolated
database connections, white-label branding, subscriptions/licenses, and the
platform Super Admin accounts. They always live on the ``default`` (master)
connection via ``TenantRouter`` and never inside any tenant database.
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


class Domain(models.Model):
    """Maps a hostname/subdomain to a product for tenant resolution."""

    id = models.BigAutoField(primary_key=True)
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, db_column='product_id', related_name='domains'
    )
    host = models.CharField(max_length=255, unique=True)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'tenants'
        db_table = 'domains'


class TenantDatabase(models.Model):
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
        db_table = 'tenant_databases'


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


class Subscription(models.Model):
    class Status(models.TextChoices):
        TRIAL = 'trial', 'Trial'
        ACTIVE = 'active', 'Active'
        PAST_DUE = 'past_due', 'Past due'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.BigAutoField(primary_key=True)
    product = models.OneToOneField(
        Product, on_delete=models.CASCADE, db_column='product_id', related_name='subscription'
    )
    plan = models.CharField(max_length=50, default='standard')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TRIAL)
    started_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = 'tenants'
        db_table = 'subscriptions'


class License(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        REVOKED = 'revoked', 'Revoked'
        EXPIRED = 'expired', 'Expired'

    id = models.BigAutoField(primary_key=True)
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, db_column='product_id', related_name='licenses'
    )
    key = models.CharField(max_length=120, unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    issued_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = 'tenants'
        db_table = 'licenses'


class SuperAdminUser(models.Model):
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
        db_table = 'super_admin_users'
