"""Integration tests for the gaming service layer: launch, settlement, idempotency.

Run with:
    python manage.py test core.tests.test_game_services --settings=config.test_settings
"""

from decimal import Decimal
from unittest import mock

from django.test import TestCase

from core import game_services
from core.game_services import GameError
from core.models import (
    Game,
    GameProvider,
    GameRound,
    GameSession,
    Transaction,
    User,
    Wallet,
)
from core.repositories import GameSettingsRepository
from services import game_provider

GAME_UID = 'a04d1f3eb8ccec8a4823bdf18e3f0e84'


class _Base(TestCase):
    def setUp(self):
        self.user = User.objects.create(
            username='player1', phone='9990001111', role=User.Role.USER,
            account_status=User.AccountStatus.ACTIVE,
        )
        self.wallet = Wallet.objects.create(
            user=self.user, main_balance=Decimal('500'), wagering_balance=Decimal('200'),
        )
        self.provider = GameProvider.objects.create(name='Agg', slug='agg')
        self.game = Game.objects.create(
            provider=self.provider, name='Aviator', slug='aviator-a04d1f3e',
            category=Game.Category.AI_GAMES, game_uid=GAME_UID, is_active=True,
        )
        GameSettingsRepository.set_games_enabled(True)

    def _callback_envelope(self, **overrides):
        payload = {
            'member_account': game_provider.build_member_account(self.user.id),
            'game_uid': GAME_UID,
            'serial_number': 'serial-1',
            'bet_amount': '50',
            'win_amount': '0',
            'game_round': 'round-1',
            'currency_code': 'INR',
            'timestamp': '2025-03-23 12:53:41',
        }
        payload.update(overrides)
        return {'payload': game_provider.encrypt_json(payload)}


class LaunchServiceTests(_Base):
    def test_launch_opens_session_and_returns_url(self):
        with mock.patch.object(
            game_provider, 'request_launch_url', return_value='https://play/aviator'
        ):
            res = game_services.launch_game(self.user.id, {'gameUid': GAME_UID})
        self.assertEqual(res['status_code'], 'success')
        self.assertEqual(res['data']['game_url'], 'https://play/aviator')
        session = GameSession.objects.get(user=self.user, game_uid=GAME_UID)
        self.assertEqual(session.launch_url, 'https://play/aviator')
        self.game.refresh_from_db()
        self.assertEqual(self.game.play_count, 1)

    def test_launch_blocked_when_games_disabled(self):
        GameSettingsRepository.set_games_enabled(False)
        with self.assertRaises(GameError) as ctx:
            game_services.launch_game(self.user.id, {'gameUid': GAME_UID})
        self.assertEqual(ctx.exception.code, 'game_off')

    def test_launch_blocked_below_min_balance(self):
        self.wallet.main_balance = Decimal('50')
        self.wallet.save()
        with self.assertRaises(GameError) as ctx:
            game_services.launch_game(self.user.id, {'gameUid': GAME_UID})
        self.assertEqual(ctx.exception.code, 'balance_error')

    def test_launch_unknown_game(self):
        with self.assertRaises(GameError) as ctx:
            game_services.launch_game(self.user.id, {'gameUid': 'deadbeefdeadbeef'})
        self.assertEqual(ctx.exception.code, 'game_not_found')

    def test_launch_inactive_game_blocked(self):
        self.game.is_active = False
        self.game.save()
        with self.assertRaises(GameError) as ctx:
            game_services.launch_game(self.user.id, {'gameUid': GAME_UID})
        self.assertEqual(ctx.exception.code, 'game_not_found')


class SettlementTests(_Base):
    def setUp(self):
        super().setUp()
        with mock.patch.object(
            game_provider, 'request_launch_url', return_value='https://play/aviator'
        ):
            game_services.launch_game(self.user.id, {'gameUid': GAME_UID})

    def test_bet_loss_debits_wallet_and_wagering(self):
        ack = game_services.process_callback(self._callback_envelope(bet_amount='50', win_amount='0'))
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.main_balance, Decimal('450'))  # 500 - 50
        self.assertEqual(self.wallet.wagering_balance, Decimal('150'))  # 200 - 50
        body = game_provider.decrypt_json(ack['payload'])
        self.assertEqual(body['credit_amount'], '450.00')
        # Ledger transaction recorded.
        tx = Transaction.objects.get(reference_number='serial-1')
        self.assertEqual(tx.type, Transaction.TxType.BET_SETTLEMENT)
        self.assertEqual(tx.amount, Decimal('50'))

    def test_bet_win_credits_wallet(self):
        game_services.process_callback(
            self._callback_envelope(serial_number='s-win', bet_amount='50', win_amount='130')
        )
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.main_balance, Decimal('580'))  # 500 - 50 + 130

    def test_session_accumulates_and_sets_status(self):
        game_services.process_callback(
            self._callback_envelope(serial_number='s1', bet_amount='50', win_amount='0'))
        game_services.process_callback(
            self._callback_envelope(serial_number='s2', bet_amount='20', win_amount='100'))
        session = GameSession.objects.get(user=self.user, game_uid=GAME_UID)
        self.assertEqual(session.total_bet, Decimal('70'))
        self.assertEqual(session.total_win, Decimal('100'))
        self.assertEqual(session.profit_loss, Decimal('30'))
        self.assertEqual(session.rounds_count, 2)
        self.assertEqual(session.status, GameSession.Status.PROFIT)

    def test_duplicate_serial_is_idempotent(self):
        env = self._callback_envelope(serial_number='dup', bet_amount='50', win_amount='0')
        game_services.process_callback(env)
        # Re-deliver the same callback twice more.
        game_services.process_callback(env)
        game_services.process_callback(env)
        self.wallet.refresh_from_db()
        # Wallet only moved once despite three deliveries.
        self.assertEqual(self.wallet.main_balance, Decimal('450'))
        self.assertEqual(GameRound.objects.filter(serial_number='dup').count(), 1)
        self.assertEqual(Transaction.objects.filter(reference_number='dup').count(), 1)

    def test_heartbeat_returns_balance_without_settling(self):
        ack = game_services.process_callback(
            self._callback_envelope(serial_number='hb', bet_amount='0', win_amount='0'))
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.main_balance, Decimal('500'))  # unchanged
        self.assertEqual(GameRound.objects.count(), 0)
        body = game_provider.decrypt_json(ack['payload'])
        self.assertEqual(body['credit_amount'], '500.00')

    def test_wagering_never_goes_negative(self):
        # Wager more than the outstanding wagering balance (200).
        game_services.process_callback(
            self._callback_envelope(serial_number='big', bet_amount='300', win_amount='0'))
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.wagering_balance, Decimal('0'))

    def test_unknown_member_account_rejected(self):
        env = self._callback_envelope(member_account='h72add999999', serial_number='x')
        with self.assertRaises(GameError) as ctx:
            game_services.process_callback(env)
        self.assertEqual(ctx.exception.code, 'auth_error')

    def test_invalid_payload_rejected(self):
        env = {'payload': game_provider.encrypt_json({'member_account': 'h72add1'})}
        with self.assertRaises(GameError) as ctx:
            game_services.process_callback(env)
        self.assertEqual(ctx.exception.code, 'invalid_params')

    def test_undecryptable_payload_rejected(self):
        with self.assertRaises(GameError) as ctx:
            game_services.process_callback({'payload': 'not-valid-base64-cipher!!!'})
        self.assertIn(ctx.exception.code, ('decrypt_error', 'invalid_params'))


class ReportingTests(_Base):
    def test_play_history_and_pnl(self):
        with mock.patch.object(
            game_provider, 'request_launch_url', return_value='https://play/aviator'
        ):
            game_services.launch_game(self.user.id, {'gameUid': GAME_UID})
        game_services.process_callback(self._callback_envelope(
            serial_number='r1', bet_amount='50', win_amount='80'))

        hist = game_services.get_play_history(self.user.id)
        self.assertEqual(hist['status_code'], 'success')
        self.assertEqual(len(hist['records']), 1)
        self.assertEqual(hist['records'][0]['profit_loss'], 30.0)

        pnl = game_services.get_user_pnl(self.user.id)
        self.assertEqual(pnl['total_bet'], 50.0)
        self.assertEqual(pnl['total_win'], 80.0)
        self.assertEqual(pnl['profit_loss'], 30.0)

    def test_empty_history(self):
        hist = game_services.get_play_history(self.user.id)
        self.assertEqual(hist['status_code'], 'no-records-found')
        self.assertEqual(hist['records'], [])
