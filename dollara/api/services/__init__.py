"""Cross-cutting platform services (control plane).

- ``tenant_resolver``: map a request (host / subdomain / header / JWT claim) to a
  product and its isolated database connection.
- ``branding``: serialize white-label branding for the current tenant.

Product onboarding and master DB writes live in ``super_admin/api``.
"""
