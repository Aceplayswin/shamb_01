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

    A product authenticates with the secret ``api_key`` issued to it at creation
    (``provision_product``), sent in the ``X-Product-Token`` header (no JWT —
    these are server-to-server calls from the product API, not the console). The
    expected value is that product's *own* ``Product.api_key``, looked up by the
    ``slug`` in the URL: each product has a distinct key, and one product's key
    can never read another product's config.

    A global ``settings.PRODUCT_CONFIG_TOKEN``, when set, is also accepted as a
    fallback (operator tooling / products not yet migrated to per-product keys).

    Fails closed: if the product has no key and no global token is configured we
    refuse the call (503) rather than leave the endpoint open. Comparison is
    constant-time.
    """

    def wrapped(request, *args, **kwargs):
        provided = request.META.get(PRODUCT_TOKEN_HEADER, '')
        if not provided:
            return JsonResponse({'error': 'Invalid product token'}, status=401)

        # Per-product key: the api_key issued to the product named in the URL.
        from tenants.models import Product

        slug = kwargs.get('slug', '')
        product = Product.objects.filter(slug=slug).first() if slug else None
        product_key = (product.api_key or '') if product else ''

        # Optional global fallback secret, shared across products.
        global_token = getattr(settings, 'PRODUCT_CONFIG_TOKEN', '') or ''

        accepted = [key for key in (product_key, global_token) if key]
        if not accepted:
            return JsonResponse(
                {'error': 'Product config endpoint is not configured'}, status=503
            )
        if any(hmac.compare_digest(provided, key) for key in accepted):
            return view_func(request, *args, **kwargs)
        return JsonResponse({'error': 'Invalid product token'}, status=401)

    return wrapped
