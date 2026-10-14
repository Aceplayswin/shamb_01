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
    # Credited on award and stakeable, but not cashable until its wagering
    # requirement clears — see core.bonus_services.
    bonus: float
    exposure: float
    locked: float
    # Withdrawable cash: main minus holds, never including `bonus`.
    available: float
    withdrawable: float
    # Stakeable total: real money plus bonus credit, minus holds.
    playable: float
    # Real money plus bonus credit, before holds — the headline "total balance"
    # figure. Mirrors services.get_wallet()'s `total`.
    total: float
    currency: str

    @staticmethod
    def from_service(w: dict) -> 'WalletType':
        """Project services.get_wallet()'s dict onto the GraphQL fields.

        Explicit rather than ``WalletType(**w)``: the service dict carries extra
        aliases (``real``, ``pendingWithdrawal``) that a splat would reject, and
        the resolvers swallow errors into a null wallet.
        """
        return WalletType(
            main=w['main'],
            bonus=w['bonus'],
            exposure=w['exposure'],
            locked=w['locked'],
            available=w['available'],
            withdrawable=w['withdrawable'],
            playable=w['playable'],
            total=w['total'],
            currency=w['currency'],
        )


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
    account_status: str
    currency: str
    website_language: str
    # Read-only profile detail shown on the player's own Profile page. All of it
    # already exists on User / UserSetting; none of it is editable here.
    country_code: Optional[str] = None
    state: Optional[str] = None
    gender: Optional[str] = None
    referral_code: Optional[str] = None
    phone_verified: bool = False
    two_factor_enabled: bool = False
    vip_level: int = 0
    is_demo: bool = False
    # ISO-8601 strings: the client formats them for display.
    created_at: Optional[str] = None
    last_login_at: Optional[str] = None

    @strawberry.field
    def wallet(self) -> Optional[WalletType]:
        try:
            w = services.get_wallet(self.id)
            return WalletType.from_service(w)
        except Exception:
            return None


@strawberry.type
class DepositStatsType:
    amount: float
    count: int
    players: int = 0


@strawberry.type
class WithdrawalStatsType:
    amount: float
    count: int
    pending: int
    players: int = 0


@strawberry.type
class DashboardStatsType:
    totalUsers: int
    signupsToday: int
    activePlayers: int
    activePlayersLastHour: int = 0
    signupsYesterday: int = 0
    depositingPlayers: int = 0
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
    """Resolve the request's auth, rejecting a token superseded by a newer
    login elsewhere (see core/middleware.py:require_auth — this mirrors that
    check for the GraphQL surface, which bypasses the REST decorator). Players
    only — admins may hold several concurrent sessions."""
    request = info.context.request
    auth = getattr(request, 'auth', None)
    if auth and auth.sid and auth.role == 'user':
        account = User.objects.filter(id=auth.sub).only('active_session_id').first()
        if not account or (
            account.active_session_id and auth.sid != account.active_session_id
        ):
            return None
    return auth


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
            account_status=user.account_status,
            currency=prefs.currency if prefs else 'INR',
            website_language=prefs.website_language if prefs else 'en',
            country_code=user.country_code,
            state=user.state,
            gender=prefs.gender if prefs else None,
            referral_code=prefs.referral_code if prefs else None,
            phone_verified=prefs.phone_verified if prefs else False,
            two_factor_enabled=prefs.two_factor_enabled if prefs else False,
            vip_level=prefs.vip_level if prefs else 0,
            is_demo=prefs.is_demo if prefs else False,
            created_at=user.created_at.isoformat() if user.created_at else None,
            last_login_at=(
                user.last_login_at.isoformat() if user.last_login_at else None
            ),
        )

    @strawberry.field
    def wallet(self, info: Info) -> Optional[WalletType]:
        auth = _get_auth(info)
        if not auth:
            return None
        try:
            w = services.get_wallet(auth.sub)
            return WalletType.from_service(w)
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
            activePlayersLastHour=stats['activePlayersLastHour'],
            signupsYesterday=stats['signupsYesterday'],
            depositingPlayers=stats['depositingPlayers'],
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
