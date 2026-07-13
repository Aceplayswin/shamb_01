"""Tenant resolution middleware.

Runs early in the request cycle to resolve the active product from dollara's own
api_key (via the control-plane config pull), expose it as ``request.tenant``, and
always clear the thread-local tenant context at the end of the request so
connections are never leaked across the worker thread pool.

This instance serves a single product identified by its key — there is no
host/header/JWT slug selection.
"""

import logging

from services.tenant_resolver import resolve_tenant
from tenants.state import clear_current_tenant

logger = logging.getLogger(__name__)


class TenantResolverMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            try:
                request.tenant = resolve_tenant()
            except Exception:
                # Tenant resolution must never take down the request cycle. Views
                # that need a tenant already handle ``request.tenant is None``, and
                # tenant-free routes (root status page, /health) don't need one at
                # all — so degrade to "no tenant" instead of returning a 500.
                logger.exception('tenant resolution failed')
                request.tenant = None
            return self.get_response(request)
        finally:
            clear_current_tenant()
