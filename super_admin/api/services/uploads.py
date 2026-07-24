"""Storage for admin-uploaded branding assets.

Super Admins can upload a logo/favicon/splash/app-icon in the branding editor
instead of pasting a CDN URL. Files land under ``MEDIA_ROOT`` and are served by
Django; swap ``default_storage`` for S3/Cloudinary later without touching the
upload view — it only knows about ``django.core.files.storage.default_storage``.
"""

from __future__ import annotations

import uuid

from django.core.files.storage import default_storage

# Image types allowed for branding assets. ``ico`` is included for favicons.
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'ico'}
MAX_BYTES = 5 * 1024 * 1024


def save_branding_asset(file) -> str:
    """Save an uploaded branding image and return its storage URL (relative).

    The caller turns it into an absolute URL via ``request.build_absolute_uri``.
    Raises ``ValueError`` for an unsupported type or an oversized file.
    """
    ext = file.name.rsplit('.', 1)[-1].lower() if '.' in file.name else ''
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f'Unsupported file type: .{ext or "unknown"}')
    if file.size > MAX_BYTES:
        raise ValueError('File too large (max 5MB)')

    filename = f'{uuid.uuid4().hex}.{ext}'
    path = default_storage.save(f'branding/{filename}', file)
    return default_storage.url(path)
