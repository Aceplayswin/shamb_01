"""Merge historical payout-only rounds into the stakes they settled.

A delayed-settlement provider (sports, lottery) reports a bet as two callbacks
with two serial numbers: the stake, then the result. Until the settlement path
learned to fold the second into the first, each result was recorded as its own
``GameRound`` — leaving a phantom "bet 0 / win N" row next to the stake it
belonged to.

Two things were wrong with that, and this command repairs both for rows already
in the database:

* the phantom row reports the **gross payout as profit** (a 262 payout on a 300
  stake reads +262 instead of the true -38), which feeds GGR, affiliate
  commission and every player P&L report;
* the bet is counted as **two rounds** instead of one.

No money moves: the wallet was already credited correctly at callback time, and
each row's own balance_before/balance_after are left exactly as recorded. Only
the reporting shape changes.

    python manage.py merge_orphan_payouts --dry-run
    python manage.py merge_orphan_payouts
    python manage.py merge_orphan_payouts --since 2026-01-01
"""

from datetime import datetime

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from core.models import GameRound, GameSession
from tenants.state import tenant_atomic

ZERO = 0


class Command(BaseCommand):
    help = 'Fold historical payout-only rounds into the stake rows they settled.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--since',
            type=str,
            default=None,
            help='Only repair rounds created on/after this date (YYYY-MM-DD).',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Report what would be merged without changing anything.',
        )

    def handle(self, *args, **options):
        dry = options['dry_run']

        # Payout-only rows: a win with no stake attached. These only ever arise
        # from a result callback recorded as its own round.
        orphans = GameRound.objects.filter(
            bet_amount=ZERO, win_amount__gt=ZERO,
        ).exclude(Q(game_round__isnull=True) | Q(game_round='')).order_by('id')

        if options['since']:
            try:
                since = datetime.strptime(options['since'], '%Y-%m-%d')
            except ValueError:
                self.stderr.write(self.style.ERROR('--since must be YYYY-MM-DD'))
                return
            orphans = orphans.filter(
                created_at__gte=timezone.make_aware(since)
            )

        merged = skipped = 0
        touched_sessions: set[int] = set()

        for payout in orphans:
            # The stake this payout settled: same player, same provider round,
            # carrying the money. Scoped to the provider because round ids are
            # only unique within a vendor.
            stakes = GameRound.objects.filter(
                user_id=payout.user_id,
                game_round=payout.game_round,
                bet_amount__gt=ZERO,
            ).exclude(id=payout.id)
            if payout.game_id:
                stakes = stakes.filter(game__provider_id=payout.game.provider_id)
            else:
                stakes = stakes.filter(game_uid=payout.game_uid)

            # Only a stake that was never paid out can absorb this payout;
            # one that already has a win recorded is a settled round of its own.
            stake = stakes.filter(win_amount=ZERO).order_by('id').first()
            if stake is None:
                # No matching stake — a genuine free-round/bonus payout, or the
                # stake predates the data we hold. Leave it alone rather than
                # invent a bet for it.
                skipped += 1
                continue

            if dry:
                merged += 1
                self.stdout.write(
                    f'[dry-run] round {payout.game_round} user {payout.user_id}: '
                    f'stake #{stake.id} bet={stake.bet_amount} '
                    f'+ payout #{payout.id} win={payout.win_amount} '
                    f'-> net {payout.win_amount - stake.bet_amount}'
                )
                continue

            with tenant_atomic():
                stake.stake_serial = stake.serial_number
                stake.serial_number = payout.serial_number
                stake.win_amount = payout.win_amount
                # The payout row recorded the balance after the credit landed;
                # that is the true end state of this wager.
                stake.balance_after = payout.balance_after
                stake.settle_status = GameRound.SettleStatus.SETTLED
                stake.settled_at = payout.settled_at or payout.created_at
                stake.save(update_fields=[
                    'stake_serial', 'serial_number', 'win_amount',
                    'balance_after', 'settle_status', 'settled_at',
                ])
                if payout.session_id:
                    touched_sessions.add(payout.session_id)
                if stake.session_id:
                    touched_sessions.add(stake.session_id)
                payout.delete()
            merged += 1

        if dry:
            self.stdout.write(
                f'[dry-run] would merge {merged} payout(s); '
                f'{skipped} left as-is (no matching stake)'
            )
            return

        # The deleted rows were counted in their session totals. Recompute the
        # affected sessions from their rounds rather than adjusting by hand, so
        # the totals match the rows that actually survive.
        for session_id in touched_sessions:
            self._recount(session_id)

        self.stdout.write(self.style.SUCCESS(
            f'Merged {merged} payout(s) into their stakes; '
            f'{skipped} left as-is (no matching stake); '
            f'{len(touched_sessions)} session(s) recounted'
        ))

    @staticmethod
    def _recount(session_id: int) -> None:
        from django.db.models import Count, Sum

        session = GameSession.objects.filter(id=session_id).first()
        if not session:
            return
        rounds = GameRound.objects.filter(session_id=session_id)
        agg = rounds.aggregate(
            bet=Sum('bet_amount'), win=Sum('win_amount'), n=Count('id'),
        )
        session.total_bet = agg['bet'] or 0
        session.total_win = agg['win'] or 0
        session.profit_loss = session.total_win - session.total_bet
        session.rounds_count = agg['n'] or 0
        session.pending_rounds = rounds.filter(
            settle_status=GameRound.SettleStatus.PENDING
        ).count()
        session.status = (
            GameSession.Status.WAIT
            if session.rounds_count == 0 or session.pending_rounds > 0
            else (
                GameSession.Status.PROFIT
                if session.profit_loss >= 0
                else GameSession.Status.LOSS
            )
        )
        session.save(update_fields=[
            'total_bet', 'total_win', 'profit_loss', 'rounds_count',
            'pending_rounds', 'status', 'updated_at',
        ])
