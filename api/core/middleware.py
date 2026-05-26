from django.http import JsonResponse

from core.auth_jwt import AuthUser, decode_token


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
            if roles and request.auth.role not in roles:
                return JsonResponse({'error': 'Forbidden'}, status=403)
            return view_func(request, *args, **kwargs)
        return wrapped
    return decorator
