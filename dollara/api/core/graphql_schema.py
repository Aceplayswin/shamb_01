from typing import Optional

import strawberry
from django.db.models import F, Sum
from strawberry.schema.config import StrawberryConfig
from strawberry.types import Info

from core import services
from core.models import Transaction, User, UserSetting


@strawberry.type
class WalletType:
    main: float
    bonus: float
    exposure: float
    locked: float
    available: float
    currency: str


@strawberry.type
class GameType:
    id: str
    name: str
    slug: str
    category: str
    thumbnail_url: Optional[str]
    rtp: Optional[float]
    min_bet: float
    max_bet: float
    is_featured: bool
    is_provably_fair: bool
    play_count: int
    provider_name: Optional[str]
    provider_slug: Optional[str]


@strawberry.type
class UserType:
    id: int
    username: Optional[str]
    full_name: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    kyc_status: str
    account_status: str
    currency: str
    website_language: str

    @strawberry.field
    def wallet(self) -> Optional[WalletType]:
        try:
            w = services.get_wallet(self.id)
            return WalletType(**w)
        except Exception:
            return None


@strawberry.type
class DepositStatsType:
    amount: float
    count: int


@strawberry.type
class WithdrawalStatsType:
    amount: float
    count: int
    pending: int


@strawberry.type
class DashboardStatsType:
    totalUsers: int
    signupsToday: int
    activePlayers: int
    depositsToday: DepositStatsType
    withdrawalsToday: WithdrawalStatsType
    totalLiability: float


@strawberry.type
class LiveTickerType:
    username: str
    amount: float
    type: str
    timestamp: str


def _get_auth(info: Info):
    request = info.context.request
    return getattr(request, 'auth', None)


@strawberry.type
class Query:
    @strawberry.field
    def me(self, info: Info) -> Optional[UserType]:
        auth = _get_auth(info)
        if not auth:
            return None
        user = User.objects.select_related('usersetting').filter(id=auth.sub).first()
        if not user:
            return None
        prefs = services.get_user_settings(user)
        return UserType(
            id=user.id,
            username=user.username,
            full_name=user.full_name,
            phone=user.phone,
            email=user.email,
            kyc_status=prefs.kyc_status if prefs else UserSetting.KycStatus.NONE,
            account_status=user.account_status,
            currency=prefs.currency if prefs else 'INR',
            website_language=prefs.website_language if prefs else 'en',
        )

    @strawberry.field
    def wallet(self, info: Info) -> Optional[WalletType]:
        auth = _get_auth(info)
        if not auth:
            return None
        try:
            w = services.get_wallet(auth.sub)
            return WalletType(**w)
        except Exception:
            return None

    @strawberry.field
    def games(
        self,
        category: Optional[str] = None,
        featured: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[GameType]:
        items = services.list_games(category, featured, limit, offset)
        return [GameType(**g) for g in items]

    @strawberry.field
    def trendingGames(self) -> list[GameType]:
        items = services.list_games(limit=12)
        return [GameType(**g) for g in items]

    @strawberry.field
    def adminDashboard(self, info: Info) -> Optional[DashboardStatsType]:
        auth = _get_auth(info)
        if not auth or auth.role != 'admin':
            return None
        stats = services.get_dashboard_stats()
        return DashboardStatsType(
            totalUsers=stats['totalUsers'],
            signupsToday=stats['signupsToday'],
            activePlayers=stats['activePlayers'],
            depositsToday=DepositStatsType(**stats['depositsToday']),
            withdrawalsToday=WithdrawalStatsType(**stats['withdrawalsToday']),
            totalLiability=stats['totalLiability'],
        )

    @strawberry.field
    def liveTickers(self) -> list[LiveTickerType]:
        txs = (
            Transaction.objects.filter(
                type=Transaction.TxType.DEPOSIT,
                status=Transaction.Status.COMPLETED,
            )
            .select_related('user')
            .order_by('-created_at')[:10]
        )
        result = []
        for t in txs:
            u = t.user.username or 'User'
            masked = f'{u[0]}*{u[-1]}' if len(u) >= 2 else u
            result.append(
                LiveTickerType(
                    username=masked,
                    amount=float(t.amount),
                    type='deposit',
                    timestamp=t.created_at.isoformat(),
                )
            )
        return result


schema = strawberry.Schema(
    query=Query,
    config=StrawberryConfig(auto_camel_case=False),
)
