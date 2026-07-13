"""Public product endpoints for this product's own frontends (web + mobile).

This instance serves a single product identified by its api_key, so branding and
the live theme come from the product's control-plane config (see
:mod:`services.control_plane`). Frontends call these with no tenant/slug — the
backend already knows which product it is from its key.
"""

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from services.branding import get_branding
from services.control_plane import get_product_config


@require_http_methods(['GET'])
def public_branding(request):
    # Single-product instance: branding comes from this product's control-plane
    # config (resolved by api_key), so no tenant/slug argument is needed.
    return JsonResponse(get_branding())


@require_http_methods(['GET'])
def public_theme(request):
    """This product's live theme key, resolved from its control-plane config."""
    config = get_product_config() or {}
    theme = config.get('theme') or {}
    product = config.get('product') or {}
    return JsonResponse({
        'active_theme': theme.get('active_theme'),
        'known_themes': theme.get('known_themes', []),
        'status': product.get('status', ''),
    })
