"""Write the missing deposit rows for players opened with agent credit.

``agent_services.create_player`` used to fund the new player's wallet and write
the ``agent_transfers`` row without ever writing to ``transactions``. Opening
credit therefore reached the balance but never the cash ledger, and since every
deposit figure in the product counts ledger rows rather than wallet deltas, the
money was invisible: the Players screen showed it, the dashboard's Sum Of
Deposits did not, and Real Revenue read the eventual withdrawal as pure loss.

``create_player`` writes the row now, so this is a one-off repair of the players
opened before that fix. Run once per tenant database:

    python manage.py backfill_opening_credit_deposits --dry-run
    python manage.py backfill_opening_credit_deposits

Safe to re-run: each repaired transfer is stamped on the transaction it created
(``reference_number = agent-transfer:<id>``) and skipped on a second pass. Rows
are dated to the transfer they belong to rather than to now, so a backfilled
deposit lands in the period the player was actually opened.
"""

from datetime import timedelta

from django.core.management.base import BaseCommand

from core.agent_models import AgentTransfer
from core.models import Transaction
from tenants.state import tenant_atomic

# How far apart a transfer and a deposit may sit and still be the same event.
# Both are written inside one atomic block, so anything beyond a moment apart
# is a different movement.
MATCH_WINDOW = timedelta(seconds=2)


class Command(BaseCommand):
    help = 'Backfill deposit transactions for opening credit given at player creation.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Report what would be written without changing anything.',
        )

    def handle(self, *args, **options):
        # Only player-side opening credit: `create_player` is the sole writer of
        # this remark against a player, and it is the only path that skipped the
        # ledger. Agent-to-agent credit never touches `transactions` at all.
        transfers = AgentTransfer.objects.filter(
            counterparty_type=AgentTransfer.CounterpartyType.PLAYER,
            direction=AgentTransfer.Direction.DOWN,
            remark='Opening credit',
            amount__gt=0,
        ).order_by('id')

        written = skipped = already = 0
        for transfer in transfers:
            reference = f'agent-transfer:{transfer.id}'
            if Transaction.objects.filter(reference_number=reference).exists():
                already += 1
                continue

            # Defensive: a deposit already sitting on this instant means the
            # movement did reach the ledger somehow, and writing another would
            # double the player's deposits. Skipping under-counts, which is the
            # safe direction for money, and every skip is reported.
            clash = Transaction.objects.filter(
                user_id=transfer.counterparty_id,
                type=Transaction.TxType.DEPOSIT,
                amount=transfer.amount,
                created_at__range=(transfer.created_at - MATCH_WINDOW,
                                   transfer.created_at + MATCH_WINDOW),
            ).exists()
            if clash:
                skipped += 1
                self.stdout.write(
                    f'  skip transfer {transfer.id}: player '
                    f'{transfer.counterparty_id} already has a matching deposit'
                )
                continue

            if options['dry_run']:
                written += 1
                self.stdout.write(
                    f'  [dry-run] player {transfer.counterparty_id}: '
                    f'deposit {transfer.amount} at {transfer.created_at:%Y-%m-%d %H:%M}'
                )
                continue

            with tenant_atomic():
                created = Transaction.objects.create(
                    user_id=transfer.counterparty_id,
                    type=Transaction.TxType.DEPOSIT,
                    amount=transfer.amount,
                    status=Transaction.Status.COMPLETED,
                    payment_method='agent_transfer',
                    reference_number=reference,
                    notes='Opening credit',
                )
                # `created_at` is auto_now_add, so it has to be corrected with an
                # UPDATE. Dating the row to the transfer is what keeps the
                # dashboard's period filter honest — otherwise every historic
                # opening credit would pile up on the day of the repair.
                Transaction.objects.filter(id=created.id).update(
                    created_at=transfer.created_at
                )
            written += 1

        verb = 'would write' if options['dry_run'] else 'wrote'
        self.stdout.write(self.style.SUCCESS(
            f'{verb} {written} deposit(s); {already} already backfilled, '
            f'{skipped} skipped'
        ))
