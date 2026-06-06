"""Cross-cutting platform services (control plane).

- ``tenant_resolver``: map a request (host / subdomain / header / JWT claim) to a
  product and its isolated database connection.
- ``tenant_provisioning``: create and seed new tenant databases.
- ``branding``: serialize white-label branding for the current tenant.
"""
