"""Cross-cutting platform services (control plane).

- ``control_plane``: fetch this product's config (identity, branding, theme,
  webhook public keys) from Super Admin over HTTP and cache it. dollara never
  connects to the master database directly.
- ``tenant_resolver``: map a request (host / subdomain / header / JWT claim) to
  the product, using ``control_plane``.
- ``branding``: white-label branding for the current tenant, from ``control_plane``.
- ``super_admin_keys``: resolve the Super Admin public key that signs inbound
  webhook data pulls, from ``control_plane``.

Product onboarding and master DB writes live in ``super_admin/api``.
"""
