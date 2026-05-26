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
    path('admin/users', views.admin_users),
    path('admin/users/<str:user_id>/status', views.admin_user_status),
    path('admin/withdrawals/pending', views.admin_withdrawals_pending),
    path('admin/withdrawals/<str:tx_id>/approve', views.admin_withdrawal_approve),
    path('admin/withdrawals/<str:tx_id>/reject', views.admin_withdrawal_reject),
    # AI
    path('ai/fraud-score', views.ai_fraud_score),
    path('ai/trigger-welcome-call', views.ai_welcome_call),
    path('ai/chat', views.ai_chat),
]
