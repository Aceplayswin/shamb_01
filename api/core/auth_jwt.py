from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from django.conf import settings


def _normalize_sub(sub: Any) -> int | str:
    if isinstance(sub, str) and sub.isdigit():
        return int(sub)
    return sub


def sign_token(payload: dict[str, Any], tenant: str | None = None) -> str:
    data = dict(payload)
    if 'sub' in data and data['sub'] is not None:
        data['sub'] = str(data['sub'])
    # Embed the resolved tenant so the API can scope/verify requests even when
    # the host header is absent (e.g. native mobile clients).
    if tenant is not None and 'tenant' not in data:
        data['tenant'] = tenant
    data['exp'] = datetime.now(timezone.utc) + timedelta(days=settings.JWT_EXPIRY_DAYS)
    return jwt.encode(data, settings.JWT_SECRET, algorithm='HS256')


def decode_token(token: str) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=['HS256'])
        if 'sub' in payload:
            payload['sub'] = _normalize_sub(payload['sub'])
        return payload
    except jwt.PyJWTError:
        return None


class AuthUser:
    def __init__(self, sub: int | str, role: str, token_type: str | None = None):
        self.sub = sub
        self.role = role
        self.type = token_type
        self.is_authenticated = True
