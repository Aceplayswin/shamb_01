"""View/route tests for the gaming endpoints (launch, history, callback, admin)."""

import json
from decimal import Decimal
from unittest import mock

from django.test import Client, TestCase

from core.auth_jwt import sign_token
from core.models import Game, GameProvider, User, Wallet
from core.repositories import GameSettingsRepository
from services import game_provider

GAME_UID = 'a04d1f3eb8ccec8a4823bdf18e3f0e84'


class GameViewTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create(
            username='p1', phone='9990000000', role=User.Role.USER,
            account_status=User.AccountStatus.ACTIVE,
        )
        Wallet.objects.create(user=self.user, main_balance=Decimal('500'))
        provider = GameProvider.objects.create(name='Agg', slug='agg')
        Game.objects.create(
            provider=provider, name='Aviator', slug='aviator-x',
            category=Game.Category.AI_GAMES, game_uid=GAME_UID, is_active=True,
        )
        GameSettingsRepository.set_games_enabled(True)
        self.token = sign_token({'sub': self.user.id, 'role': 'user'})
        self.admin = User.objects.create(
            username='admin1', role=User.Role.ADMIN,
            account_status=User.AccountStatus.ACTIVE,
        )
        self.admin_token = sign_token({'sub': self.admin.id, 'role': 'admin'})

    def _auth(self, token):
        return {'HTTP_AUTHORIZATION': f'Bearer {token}'}

    def test_launch_requires_auth(self):
        res = self.client.post('/api/v1/games/launch', data='{}',
                               content_type='application/json')
        self.assertEqual(res.status_code, 401)

    def test_launch_success(self):
        with mock.patch.object(
            game_provider, 'request_launch_url', return_value='https://play/x'
        ):
            res = self.client.post(
                '/api/v1/games/launch',
                data=json.dumps({'gameUid': GAME_UID, 'gameName': 'Aviator'}),
                content_type='application/json', **self._auth(self.token),
            )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body['status_code'], 'success')
        self.assertEqual(body['data']['game_url'], 'https://play/x')

    def test_launch_balance_error_status(self):
        Wallet.objects.filter(user=self.user).update(main_balance=Decimal('10'))
        res = self.client.post(
            '/api/v1/games/launch', data=json.dumps({'gameUid': GAME_UID}),
            content_type='application/json', **self._auth(self.token),
        )
        self.assertEqual(res.status_code, 402)
        self.assertEqual(res.json()['status_code'], 'balance_error')

    def test_callback_endpoint_acks(self):
        payload = {
            'member_account': game_provider.build_member_account(self.user.id),
            'game_uid': GAME_UID, 'serial_number': 'view-s1',
            'bet_amount': '25', 'win_amount': '0', 'timestamp': '2025-03-23 12:00:00',
        }
        envelope = {'payload': game_provider.encrypt_json(payload)}
        res = self.client.post('/api/v1/games/callback', data=json.dumps(envelope),
                               content_type='application/json')
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body['code'], 0)
        ack = game_provider.decrypt_json(body['payload'])
        self.assertEqual(ack['credit_amount'], '475.00')

    def test_admin_status_toggle(self):
        res = self.client.put(
            '/api/v1/admin/games/status/set', data=json.dumps({'enabled': False}),
            content_type='application/json', **self._auth(self.admin_token),
        )
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()['enabled'])
        self.assertFalse(GameSettingsRepository.is_games_enabled())

    def test_history_endpoint(self):
        res = self.client.get('/api/v1/games/history', **self._auth(self.token))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['status_code'], 'no-records-found')
