from django.urls import include, path
from strawberry.django.views import GraphQLView

from core.graphql_schema import schema
from core.views import games_callback, health
from tenants.views import public_branding

urlpatterns = [
    path('health', health),
    # Winco/Huidu legacy callback path (https://api.host/game/) — same handler as
    # /api/v1/games/callback. Set GAME_CALLBACK_PATH=/game/ for shared agency accounts.
    path('game/', games_callback),
    # Public, tenant-resolved white-label branding.
    path('api/v1/branding', public_branding),
    # Per-tenant feature API (auth, wallet, games, admin, ai).
    path('api/v1/', include('core.urls')),
    path('graphql', GraphQLView.as_view(schema=schema)),
]
