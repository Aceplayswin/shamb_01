import hmac

from django.conf import settings
from django.http import JsonResponse

from tenants.auth_jwt import AuthUser, decode_token

STAFF_ROLES = frozenset({'admin', 'super_admin'})

# Header a product sends to authenticate itself when pulling its own config.
PRODUCT_TOKEN_HEADER = 'HTTP_X_PRODUCT_TOKEN'


def role_is_allowed(auth_role: str, allowed: list[str] | None) -> bool:
    if not allowed:
        return True
    expanded: set[str] = set()
    for role in allowed:
        if role == 'admin':
            expanded |= STAFF_ROLES
        else:
            expanded.add(role)
    return auth_role in expanded


class JWTAuthenticationMiddleware:
    """Attach JWT auth payload to request.auth (optional — views enforce roles)."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.auth = None
        header = request.META.get('HTTP_AUTHORIZATION', '')
        if header.startswith('Bearer '):
            payload = decode_token(header[7:])
            if payload and payload.get('sub'):
                request.auth = AuthUser(
                    sub=payload['sub'],
                    role=payload.get('role', 'user'),
                    token_type=payload.get('type'),
                )
        return self.get_response(request)


def require_auth(roles: list[str] | None = None):
    def decorator(view_func):
        def wrapped(request, *args, **kwargs):
            if not request.auth:
                return JsonResponse({'error': 'Unauthorized'}, status=401)
            if roles and not role_is_allowed(request.auth.role, roles):
                return JsonResponse({'error': 'Forbidden'}, status=403)
            return view_func(request, *args, **kwargs)
        return wrapped
    return decorator


def require_product_token(view_func):
    """Guard endpoints a product calls to pull its own control-plane config.

    Products authenticate with a shared secret in the ``X-Product-Token`` header
    (no JWT — these are server-to-server calls from the product API, not the
    console). The expected value is ``settings.PRODUCT_CONFIG_TOKEN``.

    Fails closed: if the server has no token configured we refuse the call (503)
    rather than leave the endpoint open. Comparison is constant-time.
    """

    def wrapped(request, *args, **kwargs):
        expected = getattr(settings, 'PRODUCT_CONFIG_TOKEN', '') or ''
        if not expected:
            return JsonResponse(
                {'error': 'Product config endpoint is not configured'}, status=503
            )
        provided = request.META.get(PRODUCT_TOKEN_HEADER, '')
        if not provided or not hmac.compare_digest(provided, expected):
            return JsonResponse({'error': 'Invalid product token'}, status=401)
        return view_func(request, *args, **kwargs)

    return wrapped
