"""Public tenant-resolved branding endpoint.

Super Admin control-plane endpoints live in the separate ``super_admin/api``
service. This module only exposes the public branding API used by product
frontends (web/mobile).
"""

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from services.branding import get_branding_for_slug


@require_http_methods(['GET'])
def public_branding(request):
    slug = request.tenant.slug if getattr(request, 'tenant', None) else None
    return JsonResponse(get_branding_for_slug(slug))
