"""Tenant resolution middleware.

Runs early in the request cycle to resolve the active tenant from the host,
``X-Tenant`` header, or JWT ``tenant`` claim, activate its database connection,
and expose it as ``request.tenant``. The thread-local tenant context is always
cleared at the end of the request so connections are never leaked across the
worker thread pool.
"""

from core.auth_jwt import decode_token
from services.tenant_resolver import resolve_tenant
from tenants.state import clear_current_tenant


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
            request.tenant = resolve_tenant(
                host=request.get_host(),
                header_slug=self._header_slug(request),
                jwt_slug=self._jwt_slug(request),
            )
            return self.get_response(request)
        finally:
            clear_current_tenant()
