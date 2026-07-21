from django.urls import path

from core import views

urlpatterns = [
    # Auth
    path('auth/register', views.register),
    path('auth/demo', views.demo_session),
    path('auth/login', views.login),
    path('auth/change-password', views.change_password),
    # Settings / preferences
    path('settings', views.user_settings),
    # Mobile app install (APK) — public config + download redirect
    path('app/download', views.app_download),
    path('app/apk', views.app_download_redirect),
    # Wallet
    path('wallet', views.wallet_get),
    path('wallet/breakdown', views.wallet_breakdown),
    path('wallet/deposit', views.wallet_deposit),
    path('wallet/deposit/<int:tx_id>/confirm', views.wallet_deposit_confirm),
    path('wallet/withdraw', views.wallet_withdraw),
    path('wallet/transactions', views.wallet_transactions),
    # Bonuses / promotions (player-facing)
    path('promotions', views.promotions_list),
    path('bonuses/mine', views.my_bonuses),
    path('bonuses/claim', views.claim_promo),
    path('referral', views.my_referral),
    # Games
    path('games', views.games_list),
    path('games/trending', views.games_trending),
    # Public home-page hero banners (managed by this product's own admin).
    path('banners', views.banners_list),
    path('games/bet', views.games_bet),
    path('games/launch', views.games_launch),
    path('games/history', views.games_history),
    path('games/history/<str:session_uid>/rounds', views.games_session_rounds),
    path('games/pnl', views.games_pnl),
    path('games/big-wins', views.games_big_wins),
    # Inbound aggregator bet/win callback (auth via AES payload, not JWT).
    path('games/callback', views.games_callback),
    path('games/mock-launch', views.games_mock_launch),
    # Geo
    path('geo/detect', views.geo_detect),
    # Admin
    path('admin/auth/login', views.admin_login),
    path('admin/dashboard', views.admin_dashboard),
    path('admin/dashboard/charts', views.admin_dashboard_charts),
    path('admin/activity', views.admin_recent_activity),
    path('admin/users', views.admin_users),
    path('admin/users/create', views.admin_user_create),
    path('admin/users/<int:user_id>', views.admin_user_detail),
    path('admin/users/<int:user_id>/status', views.admin_user_status),
    path('admin/users/<int:user_id>/wallet/adjust', views.admin_wallet_adjust),
    path('admin/transactions', views.admin_transactions),
    path('admin/transactions/by-reference/<path:reference>', views.admin_transaction_by_reference),
    path('admin/deposits/pending', views.admin_deposits_pending),
    path('admin/deposits/<int:tx_id>/confirm', views.admin_deposit_confirm),
    path('admin/deposits/<int:tx_id>/reject', views.admin_deposit_reject),
    path('admin/upload', views.admin_upload_image),
    path('admin/games', views.admin_games),
    path('admin/games/create', views.admin_games_create),
    path('admin/games/status', views.admin_games_status),
    path('admin/games/status/set', views.admin_games_status_set),
    path('admin/games/statistics', views.admin_games_statistics),
    path('admin/games/pnl-series', views.admin_games_pnl_series),
    path('admin/games/top', views.admin_games_top),
    path('admin/games/rounds', views.admin_games_rounds),
    path('admin/games/<int:game_id>', views.admin_games_update),
    path('admin/providers', views.admin_providers),
    path('admin/providers/create', views.admin_providers_create),
    path('admin/providers/<int:provider_id>', views.admin_providers_update),
    path('admin/bets', views.admin_bets),
    path('admin/bonuses', views.admin_bonuses),
    path('admin/bonuses/stats', views.admin_bonuses_stats),
    path('admin/bonuses/issued', views.admin_bonuses_issued),
    path('admin/bonuses/create', views.admin_bonuses_create),
    path('admin/bonuses/issued/<int:user_bonus_id>/revoke', views.admin_bonuses_revoke),
    path('admin/bonuses/<int:bonus_id>', views.admin_bonuses_update),
    path('admin/bonuses/<int:bonus_id>/duplicate', views.admin_bonuses_duplicate),
    path('admin/bonuses/<int:bonus_id>/grant', views.admin_bonuses_grant),
    path('admin/bonuses/<int:bonus_id>/providers', views.admin_bonuses_providers),
    path('admin/banners', views.admin_banners),
    path('admin/banners/create', views.admin_banners_create),
    path('admin/banners/<int:banner_id>', views.admin_banners_update),
    path('admin/settings', views.admin_settings),
    path('admin/settings/<str:setting_key>', views.admin_settings_update),
    path('admin/ai-calls', views.admin_ai_calls),
    # Bet history (all players) + per-session round drill-down
    path('admin/bet-history', views.admin_bet_history),
    path('admin/bet-history/<str:session_uid>/rounds', views.admin_bet_history_rounds),
    path('admin/bet-history/settle-stale', views.admin_settle_stale_rounds),
    # Manage admin (staff accounts) — super-admin only for writes
    path('admin/staff', views.admin_staff),
    path('admin/staff/create', views.admin_staff_create),
    path('admin/staff/<int:staff_id>', views.admin_staff_update),
    # Report export (CSV)
    path('admin/reports', views.admin_reports),
    path('admin/reports/<str:kind>/export', views.admin_report_export),
    # Mobile app (APK) distribution
    path('admin/app-download', views.admin_app_download),
    path('admin/app-download/update', views.admin_app_download_update),
    path('admin/withdrawals/pending', views.admin_withdrawals_pending),
    path('admin/withdrawals/<int:tx_id>/approve', views.admin_withdrawal_approve),
    path('admin/withdrawals/<int:tx_id>/reject', views.admin_withdrawal_reject),
    # AI
    path('ai/fraud-score', views.ai_fraud_score),
    path('ai/trigger-welcome-call', views.ai_welcome_call),
    path('ai/chat', views.ai_chat),
]
