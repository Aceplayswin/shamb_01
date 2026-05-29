from django.urls import path

from core import views

urlpatterns = [
    # Auth
    path('auth/otp/send', views.otp_send),
    path('auth/otp/verify', views.otp_verify),
    path('auth/register/otp', views.register_otp),
    path('auth/demo', views.demo_session),
    path('auth/login', views.login),
    # Wallet
    path('wallet', views.wallet_get),
    path('wallet/deposit', views.wallet_deposit),
    path('wallet/deposit/<str:tx_id>/confirm', views.wallet_deposit_confirm),
    path('wallet/withdraw', views.wallet_withdraw),
    path('wallet/transactions', views.wallet_transactions),
    # Games
    path('games', views.games_list),
    path('games/trending', views.games_trending),
    path('games/bet', views.games_bet),
    # Geo
    path('geo/detect', views.geo_detect),
    # Admin
    path('admin/auth/login', views.admin_login),
    path('admin/dashboard', views.admin_dashboard),
    path('admin/dashboard/charts', views.admin_dashboard_charts),
    path('admin/activity', views.admin_recent_activity),
    path('admin/users', views.admin_users),
    path('admin/users/<str:user_id>', views.admin_user_detail),
    path('admin/users/<str:user_id>/status', views.admin_user_status),
    path('admin/users/<str:user_id>/wallet/adjust', views.admin_wallet_adjust),
    path('admin/transactions', views.admin_transactions),
    path('admin/deposits/pending', views.admin_deposits_pending),
    path('admin/deposits/<str:tx_id>/confirm', views.admin_deposit_confirm),
    path('admin/games', views.admin_games),
    path('admin/games/create', views.admin_games_create),
    path('admin/games/<str:game_id>', views.admin_games_update),
    path('admin/providers', views.admin_providers),
    path('admin/providers/create', views.admin_providers_create),
    path('admin/providers/<str:provider_id>', views.admin_providers_update),
    path('admin/bets', views.admin_bets),
    path('admin/bonuses', views.admin_bonuses),
    path('admin/bonuses/create', views.admin_bonuses_create),
    path('admin/bonuses/<str:bonus_id>', views.admin_bonuses_update),
    path('admin/settings', views.admin_settings),
    path('admin/settings/<str:setting_key>', views.admin_settings_update),
    path('admin/ai-calls', views.admin_ai_calls),
    path('admin/staff', views.admin_staff),
    path('admin/withdrawals/pending', views.admin_withdrawals_pending),
    path('admin/withdrawals/<str:tx_id>/approve', views.admin_withdrawal_approve),
    path('admin/withdrawals/<str:tx_id>/reject', views.admin_withdrawal_reject),
    # AI
    path('ai/fraud-score', views.ai_fraud_score),
    path('ai/trigger-welcome-call', views.ai_welcome_call),
    path('ai/chat', views.ai_chat),
]
