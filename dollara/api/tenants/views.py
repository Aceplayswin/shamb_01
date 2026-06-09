"""Public tenant-resolved branding endpoint (fallback).

Branding is authored in Super Admin and stored in the master ``branding`` table.
Product frontends should prefer ``GET /api/v1/public/products/<slug>/branding`` on
the platform API; this view remains for direct product-API access.
"""

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from services.branding import get_branding_for_slug


@require_http_methods(['GET'])
def public_branding(request):
    slug = request.tenant.slug if getattr(request, 'tenant', None) else None
    return JsonResponse(get_branding_for_slug(slug))
