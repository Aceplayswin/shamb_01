"""Cross-cutting platform services (control plane).

- ``tenant_resolver``: map a request (host / subdomain / header / JWT claim) to a
  product and its isolated database connection.
- ``tenant_provisioning``: register new products in the master database.
- ``branding``: serialize white-label branding for the current tenant.
"""
