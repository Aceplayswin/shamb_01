from django.conf import settings
from django.urls import include, path
from django.views.static import serve as serve_media
from strawberry.django.views import GraphQLView

from core import affiliate_views
from core.graphql_schema import schema
from core.views import games_callback, health, landing
from core.webhook_views import super_admin_data_webhook
from tenants.views import public_branding, public_theme

urlpatterns = [
    # Root GET: interactive status page for a direct browser hit. Also answers
    # external reachability checks (e.g. Super Admin's backend-URL test, which
    # hits the bare URL as entered) with a 200 instead of a 404.
    path('', landing),
    # Machine-readable status for programmatic health checks.
    path('health', health),
    # Affiliate tracking link target. Deliberately short and outside /api/v1 —
    # this URL is printed on creatives and pasted into chat.
    path('r/<str:link_code>', affiliate_views.tracking_redirect),
    # Winco/Huidu legacy callback path (https://api.host/game/) — same handler as
    # /api/v1/games/callback. Set GAME_CALLBACK_PATH=/game/ for shared agency accounts.
    path('game/', games_callback),
    # Public white-label branding + live theme for this product's own frontends.
    # Key-resolved (single product) — no tenant/slug argument.
    path('api/v1/branding', public_branding),
    path('api/v1/theme', public_theme),
    # Super Admin signed-webhook data channel (Phase 2). Authenticated by the
    # X-SA-Signature, not JWT; reads this product's OWN database. <resource> is
    # 'summary' or a dataset key. See core/webhook_views.py.
    path('api/v1/webhooks/super-admin/data/<str:resource>', super_admin_data_webhook),
    # Per-tenant feature API (auth, wallet, games, admin, ai).
    path('api/v1/', include('core.urls')),
    # Affiliate program. Mounted after core.urls — Django tries includes in order
    # and falls through on no match, so core/urls.py needs no change.
    path('api/v1/', include('core.affiliate_urls')),
    path('graphql', GraphQLView.as_view(schema=schema)),
    # Admin-uploaded images. Served by Django directly (no nginx/object storage
    # in this stack yet) so this must stay enabled outside DEBUG too — unlike
    # django.conf.urls.static.static(), which no-ops when DEBUG=False.
    path('media/<path:path>', serve_media, {'document_root': settings.MEDIA_ROOT}),
]
