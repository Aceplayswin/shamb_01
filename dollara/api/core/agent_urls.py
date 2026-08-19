"""URL map for the agent panel.

Mounted under ``/api/v1/`` *after* ``core.urls`` and ``core.affiliate_urls`` in
``config/urls.py``. Django tries includes in order and falls through on no
match, so neither of those files needs a change.

Every path is prefixed ``agent/`` and every one of them except the login is
behind ``@require_agent``.
"""

from django.urls import path

from core import agent_views as views

urlpatterns = [
    # --- Public: authentication ---
    path('agent/auth/login', views.login),

    # --- Panel: identity ---
    path('agent/me', views.me),
    path('agent/profile/password', views.change_password),

    # --- Panel: home and sport analysis ---
    path('agent/dashboard', views.dashboard),
    path('agent/sport-analysis', views.sport_analysis),
    path('agent/sport-analysis/events/<int:event_id>', views.event_book),

    # --- Panel: clients (downline agents) ---
    path('agent/clients', views.clients),
    path('agent/clients/create', views.clients_create),
    path('agent/clients/<int:client_id>', views.client_detail),

    # --- Panel: players ---
    path('agent/players', views.players),
    path('agent/players/create', views.players_create),
    path('agent/players/<int:user_id>', views.player_detail),

    # --- Panel: credit and settlement ---
    path('agent/transfer', views.transfer),
    path('agent/settle', views.settle),

    # --- Panel: reports. <kind> is one of agent_services.REPORT_BUILDERS:
    # --- pl-market, pl-agent, bet-list, transfer-statement, settlement,
    # --- transactions, event-pl, real-revenue.
    # --- The literal /export path is listed first so it cannot be swallowed by
    # --- the <str:kind> converter above it.
    path('agent/reports/<str:kind>/export', views.report_export),
    path('agent/reports/<str:kind>', views.report),
]
