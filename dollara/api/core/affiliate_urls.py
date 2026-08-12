"""URL map for the affiliate program.

Mounted under ``/api/v1/`` *after* ``core.urls`` in ``config/urls.py``. Django
tries includes in order and falls through on no match, so ``core/urls.py``
itself needs no change at all.

Ordering note: every literal admin sub-path is listed before the
``<int:affiliate_id>`` pattern. The int converter would not match a word anyway,
but keeping literals first makes the intent obvious to the next reader.
"""

from django.urls import path

from core import affiliate_views as views

urlpatterns = [
    # --- Public: program info and applications ---
    path('affiliate/program', views.program_overview),
    path('affiliate/apply', views.apply),
    path('affiliate/apply/status', views.apply_status),

    # --- Public: authentication ---
    path('affiliate/auth/login', views.login),
    path('affiliate/auth/2fa', views.verify_two_factor),
    path('affiliate/auth/forgot', views.forgot_password),
    path('affiliate/auth/reset', views.reset_password),

    # --- Public: click tracking ---
    path('affiliate/track/resolve', views.track_resolve),

    # --- Signed partner API (X-Aff-*). Listed before the JWT routes below so the
    # --- two families stay visually distinct; they share no decorator.
    path('affiliate/webhook/postback', views.webhook_postback),
    path('affiliate/data/<str:resource>', views.data_pull),

    # --- Portal: identity and dashboard ---
    path('affiliate/me', views.me),
    path('affiliate/dashboard', views.dashboard),
    path('affiliate/dashboard/chart', views.dashboard_chart),
    path('affiliate/activity', views.activity),

    # --- Portal: links and creatives ---
    path('affiliate/links', views.links),
    path('affiliate/links/create', views.links_create),
    path('affiliate/links/<int:link_id>', views.links_update),
    path('affiliate/landing-pages', views.landing_pages),
    path('affiliate/creatives', views.creatives),

    # --- Portal: referrals and network ---
    path('affiliate/referrals', views.referrals),
    path('affiliate/referrals/<int:referral_id>', views.referral_detail),
    path('affiliate/network', views.network),
    path('affiliate/network/invite', views.network_invite),

    # --- Portal: earnings, payouts, reports ---
    path('affiliate/earnings', views.earnings),
    path('affiliate/earnings/export', views.earnings_export),
    path('affiliate/payouts', views.payouts),
    path('affiliate/payouts/request', views.payouts_request),
    path('affiliate/payout-methods', views.payout_methods),
    path('affiliate/payout-methods/<int:method_id>', views.payout_method_detail),
    path('affiliate/reports', views.reports),
    path('affiliate/reports/export', views.reports_export),

    # --- Portal: profile and security ---
    path('affiliate/profile', views.profile),
    path('affiliate/profile/password', views.profile_password),
    path('affiliate/profile/2fa/setup', views.two_factor_setup),
    path('affiliate/profile/2fa/enable', views.two_factor_enable),
    path('affiliate/profile/2fa/disable', views.two_factor_disable),

    # --- Portal: partner API keys ---
    path('affiliate/api-keys', views.api_keys),
    path('affiliate/api-keys/<int:key_id>/rotate', views.api_key_rotate),
    path('affiliate/api-keys/<int:key_id>/revoke', views.api_key_revoke),
    path('affiliate/webhook-config', views.webhook_config),
    path('affiliate/api-logs', views.api_logs),

    # --- Portal: notifications and support ---
    path('affiliate/notifications', views.notifications),
    path('affiliate/notifications/read-all', views.notifications_read_all),
    path('affiliate/notifications/clear', views.notifications_clear),
    path('affiliate/notifications/<int:notification_id>/read', views.notification_read),
    path('affiliate/support/tickets', views.tickets),
    path('affiliate/support/tickets/<int:ticket_id>', views.ticket_detail),
    path('affiliate/support/tickets/<int:ticket_id>/messages', views.ticket_message),

    # --- Portal: onboarding ---
    path('affiliate/onboarding', views.onboarding),
    path('affiliate/onboarding/terms', views.onboarding_terms),
    path('affiliate/onboarding/payout', views.onboarding_payout),
    path('affiliate/onboarding/kyc', views.onboarding_kyc),
    path('affiliate/onboarding/complete', views.onboarding_complete),

    # --- Admin: applications ---
    path('admin/affiliates/applications', views.admin_applications),
    path('admin/affiliates/applications/<int:affiliate_id>/approve',
         views.admin_application_approve),
    path('admin/affiliates/applications/<int:affiliate_id>/reject',
         views.admin_application_reject),
    path('admin/affiliates/applications/<int:affiliate_id>/request-info',
         views.admin_application_request_info),

    # --- Admin: payouts, settings, fraud, audit, commission runs ---
    # All literal paths, kept above the <int:affiliate_id> pattern below.
    path('admin/affiliates/payouts', views.admin_payouts),
    path('admin/affiliates/payouts/bulk', views.admin_payouts_bulk),
    path('admin/affiliates/payouts/<int:payout_id>/approve', views.admin_payout_approve),
    path('admin/affiliates/payouts/<int:payout_id>/pay', views.admin_payout_pay),
    path('admin/affiliates/payouts/<int:payout_id>/reject', views.admin_payout_reject),
    path('admin/affiliates/ledger/<int:entry_id>/approve', views.admin_ledger_approve),
    path('admin/affiliates/ledger/<int:entry_id>/clawback', views.admin_ledger_clawback),
    path('admin/affiliates/settings', views.admin_settings),
    path('admin/affiliates/fraud-flags', views.admin_fraud_flags),
    path('admin/affiliates/fraud-flags/<int:flag_id>/resolve',
         views.admin_fraud_flag_resolve),
    path('admin/affiliates/audit', views.admin_audit),
    path('admin/affiliates/commissions/run', views.admin_commissions_run),
    path('admin/affiliates/commissions/runs', views.admin_commission_runs),

    # --- Admin: affiliate list and detail ---
    path('admin/affiliates', views.admin_affiliates),
    path('admin/affiliates/<int:affiliate_id>', views.admin_affiliate_detail),
    path('admin/affiliates/<int:affiliate_id>/status', views.admin_affiliate_status),
    path('admin/affiliates/<int:affiliate_id>/kyc/<int:doc_id>/review',
         views.admin_affiliate_kyc_review),
    path('admin/affiliates/<int:affiliate_id>/api-keys/<int:key_id>/revoke',
         views.admin_affiliate_key_revoke),
]
