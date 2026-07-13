"""Tenant resolution middleware.

Runs early in the request cycle to resolve the active tenant from the host,
``X-Tenant`` header, or JWT ``tenant`` claim, activate its database connection,
and expose it as ``request.tenant``. The thread-local tenant context is always
cleared at the end of the request so connections are never leaked across the
worker thread pool.
"""

import logging

from core.auth_jwt import decode_token
from services.tenant_resolver import resolve_tenant
from tenants.state import clear_current_tenant

logger = logging.getLogger(__name__)


class TenantResolverMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    @staticmethod
    def _header_slug(request) -> str | None:
        return (
            request.META.get('HTTP_X_TENANT')
            or request.META.get('HTTP_X_TENANT_ID')
            or request.GET.get('tenant')
            or None
        )

    @staticmethod
    def _jwt_slug(request) -> str | None:
        header = request.META.get('HTTP_AUTHORIZATION', '')
        if header.startswith('Bearer '):
            payload = decode_token(header[7:])
            if payload:
                return payload.get('tenant')
        return None

    def __call__(self, request):
        try:
            try:
                request.tenant = resolve_tenant(
                    host=request.get_host(),
                    header_slug=self._header_slug(request),
                    jwt_slug=self._jwt_slug(request),
                )
            except Exception:
                # Tenant resolution must never take down the request cycle. Views
                # that need a tenant already handle ``request.tenant is None``, and
                # tenant-free routes (root status page, /health) don't need one at
                # all — so degrade to "no tenant" instead of returning a 500.
                logger.exception('tenant resolution failed for host=%s', request.get_host())
                request.tenant = None
            return self.get_response(request)
        finally:
            clear_current_tenant()
