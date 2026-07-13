from django.conf import settings
from django.urls import include, path
from django.views.static import serve as serve_media
from strawberry.django.views import GraphQLView

from core.graphql_schema import schema
from core.views import games_callback, health
from core.webhook_views import super_admin_data_webhook
from tenants.views import public_branding

urlpatterns = [
    # Root GET so external reachability checks (e.g. Super Admin's backend-URL
    # test, which hits the bare URL as entered) get a response instead of 404.
    path('', health),
    path('health', health),
    # Winco/Huidu legacy callback path (https://api.host/game/) — same handler as
    # /api/v1/games/callback. Set GAME_CALLBACK_PATH=/game/ for shared agency accounts.
    path('game/', games_callback),
    # Public, tenant-resolved white-label branding.
    path('api/v1/branding', public_branding),
    # Super Admin signed-webhook data channel (Phase 2). Authenticated by the
    # X-SA-Signature, not JWT; reads this product's OWN database. <resource> is
    # 'summary' or a dataset key. See core/webhook_views.py.
    path('api/v1/webhooks/super-admin/data/<str:resource>', super_admin_data_webhook),
    # Per-tenant feature API (auth, wallet, games, admin, ai).
    path('api/v1/', include('core.urls')),
    path('graphql', GraphQLView.as_view(schema=schema)),
    # Admin-uploaded images. Served by Django directly (no nginx/object storage
    # in this stack yet) so this must stay enabled outside DEBUG too — unlike
    # django.conf.urls.static.static(), which no-ops when DEBUG=False.
    path('media/<path:path>', serve_media, {'document_root': settings.MEDIA_ROOT}),
]
