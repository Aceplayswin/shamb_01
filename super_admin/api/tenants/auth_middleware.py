from django.http import JsonResponse

from tenants.auth_jwt import AuthUser, decode_token

STAFF_ROLES = frozenset({'admin', 'super_admin'})


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
