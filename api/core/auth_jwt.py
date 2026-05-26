from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from django.conf import settings


def sign_token(payload: dict[str, Any]) -> str:
    data = {**payload, 'exp': datetime.now(timezone.utc) + timedelta(days=settings.JWT_EXPIRY_DAYS)}
    return jwt.encode(data, settings.JWT_SECRET, algorithm='HS256')


def decode_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=['HS256'])
    except jwt.PyJWTError:
        return None


class AuthUser:
    def __init__(self, sub: str, role: str, token_type: str | None = None):
        self.sub = sub
        self.role = role
        self.type = token_type
        self.is_authenticated = True
