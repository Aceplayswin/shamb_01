"""URL map for the agent panel.

Mounted under ``/api/v1/`` *after* ``core.urls`` and ``core.affiliate_urls`` in
``config/urls.py``. Django tries includes in order and falls through on no
match, so neither of those files needs a change.

Two families live here. Everything prefixed ``agent/`` is the panel itself, and
every one of those except the login is behind ``@require_agent``. Everything
prefixed ``admin/agents`` is the staff console, behind ``@require_auth(['admin'])``.

Ordering note: in the admin block every literal sub-path is listed before the
``<int:agent_id>`` pattern. The int converter would not match a word anyway,
but keeping literals first makes the intent obvious to the next reader.
"""

from django.urls import path

from core import agent_views as views

urlpatterns = [
    # --- Public: programme info and applications ---
    path('agent/program', views.program_overview),
    path('agent/apply', views.apply),
    path('agent/apply/status', views.apply_status),

    # --- Public: authentication ---
    path('agent/auth/login', views.login),

    # --- Panel: identity ---
    path('agent/me', views.me),
    path('agent/profile/password', views.change_password),

    # --- Panel: home and sport analysis ---
    path('agent/dashboard', views.dashboard),
    path('agent/sport-analysis', views.sport_analysis),
    path('agent/sport-analysis/events/<int:event_id>', views.event_book),

    # --- Panel: application review queue ---
    path('agent/applications', views.applications),
    path('agent/applications/<int:application_id>/approve', views.application_approve),
    path('agent/applications/<int:application_id>/decide', views.application_decide),

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

    # --- Admin: applications ---
    path('admin/agents/applications', views.admin_applications),
    path('admin/agents/applications/<int:application_id>/approve',
         views.admin_application_approve),
    path('admin/agents/applications/<int:application_id>/reject',
         views.admin_application_reject),
    path('admin/agents/applications/<int:application_id>/request-info',
         views.admin_application_request_info),

    # --- Admin: credit ledger, settings and audit ---
    # All literal paths, kept above the <int:agent_id> pattern below.
    path('admin/agents/transfers', views.admin_transfers),
    path('admin/agents/settlements', views.admin_settlements),
    path('admin/agents/settings', views.admin_settings),
    path('admin/agents/audit', views.admin_audit),

    # --- Admin: agent list and detail ---
    path('admin/agents', views.admin_agents),
    path('admin/agents/<int:agent_id>', views.admin_agent_detail),
    path('admin/agents/<int:agent_id>/status', views.admin_agent_status),
    path('admin/agents/<int:agent_id>/password', views.admin_agent_password),
    path('admin/agents/<int:agent_id>/credit', views.admin_agent_credit),
]
