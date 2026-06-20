"""Unit tests for the provider service layer (crypto + member account + launch)."""

from unittest import mock

from django.test import SimpleTestCase, override_settings

from services import game_provider


class CryptoTests(SimpleTestCase):
    def test_encrypt_decrypt_roundtrip(self):
        obj = {
            'game_uid': 'a04d1f3eb8ccec8a4823bdf18e3f0e84',
            'bet_amount': '10',
            'win_amount': '0',
            'serial_number': '9c12630d-7c78-3fd4-986b-b9901681cdc0',
        }
        ct = game_provider.encrypt_json(obj)
        self.assertNotIn('game_uid', ct)  # actually encrypted, not plaintext
        self.assertEqual(game_provider.decrypt_json(ct), obj)

    def test_decrypt_is_deterministic_for_ecb(self):
        # AES-ECB is deterministic — same plaintext+key => same ciphertext.
        a = game_provider.encrypt('hello world')
        b = game_provider.encrypt('hello world')
        self.assertEqual(a, b)

    def test_member_account_roundtrip(self):
        ma = game_provider.build_member_account(1111111)
        self.assertEqual(ma, 'h72add1111111')
        self.assertEqual(game_provider.strip_member_account(ma), '1111111')

    def test_strip_without_prefix_returns_input(self):
        self.assertEqual(game_provider.strip_member_account('999'), '999')

    def test_build_ack_is_encrypted_and_parseable(self):
        ack = game_provider.build_ack('1234.56', '2025-03-23 12:53:41')
        self.assertEqual(ack['code'], 0)
        body = game_provider.decrypt_json(ack['payload'])
        self.assertEqual(body['credit_amount'], '1234.56')
        self.assertEqual(body['timestamp'], '2025-03-23 12:53:41')

    def test_parse_callback_decrypts_payload_envelope(self):
        payload = {'member_account': 'h72add5', 'game_uid': 'x', 'bet_amount': '1'}
        envelope = {'payload': game_provider.encrypt_json(payload)}
        self.assertEqual(game_provider.parse_callback(envelope), payload)


class LaunchTests(SimpleTestCase):
    @override_settings(GAME_PROVIDER={
        'AGENCY_UID': '', 'AES_SECRET_KEY': 'k', 'PLAYER_PREFIX': 'p',
        'SERVER_URL': '', 'CALLBACK_BASE_URL': 'https://c', 'HOME_URL': 'h',
        'CURRENCY_CODE': 'INR', 'DEFAULT_LANGUAGE': 'en', 'HTTP_TIMEOUT': 5,
    })
    def test_missing_config_raises_config_error(self):
        with self.assertRaises(game_provider.ProviderConfigError):
            game_provider.request_launch_url(
                user_id=1, game_uid='abc123', credit_amount='100.00'
            )

    def test_successful_launch_sends_encrypted_envelope(self):
        captured = {}

        class _Resp:
            status_code = 200

            @staticmethod
            def json():
                return {'code': 0, 'payload': {'game_launch_url': 'https://play/x'}}

        def _fake_post(url, json=None, **kw):
            captured['url'] = url
            captured['json'] = json
            return _Resp()

        with mock.patch.object(game_provider.requests, 'post', _fake_post):
            url = game_provider.request_launch_url(
                user_id=42, game_uid='a04d1f3eb8ccec8a4823bdf18e3f0e84',
                credit_amount='250.00',
            )

        self.assertEqual(url, 'https://play/x')
        self.assertTrue(captured['url'].endswith('/game/v1'))
        # The outbound body must carry an encrypted payload, not plaintext fields.
        envelope = captured['json']
        self.assertIn('payload', envelope)
        decrypted = game_provider.decrypt_json(envelope['payload'])
        self.assertEqual(decrypted['member_account'], 'h72add42')
        self.assertEqual(decrypted['game_uid'], 'a04d1f3eb8ccec8a4823bdf18e3f0e84')
        self.assertEqual(decrypted['credit_amount'], '250.00')
        self.assertEqual(decrypted['callback_url'], 'https://api.test/api/v1/games/callback')

    @override_settings(
        DEBUG=True,
        GAME_MOCK_LAUNCH=False,
        GAME_PROVIDER={
            'AGENCY_UID': 'test_agency_uid',
            'AES_SECRET_KEY': '1f806d609f1ef42a131a187d1509ca98',
            'PLAYER_PREFIX': 'h72add',
            'SERVER_URL': 'https://bet',
            'CALLBACK_BASE_URL': 'https://api.test',
            'HOME_URL': 'https://app.test',
            'CURRENCY_CODE': 'INR',
            'DEFAULT_LANGUAGE': 'en',
            'HTTP_TIMEOUT': 5,
        },
    )
    def test_placeholder_url_uses_mock_in_debug(self):
        with mock.patch.object(game_provider.requests, 'post') as post:
            url = game_provider.request_launch_url(
                user_id=42, game_uid='a04d1f3eb8ccec8a4823bdf18e3f0e84',
                credit_amount='250.00',
            )
        post.assert_not_called()
        self.assertIn('/api/v1/games/mock-launch', url)
        self.assertIn('game_uid=a04d1f3eb8ccec8a4823bdf18e3f0e84', url)

    @override_settings(
        DEBUG=False,
        GAME_MOCK_LAUNCH=False,
        GAME_PROVIDER={
            'AGENCY_UID': 'test_agency_uid',
            'AES_SECRET_KEY': '1f806d609f1ef42a131a187d1509ca98',
            'PLAYER_PREFIX': 'h72add',
            'SERVER_URL': 'https://bet',
            'CALLBACK_BASE_URL': 'https://api.test',
            'HOME_URL': 'https://app.test',
            'CURRENCY_CODE': 'INR',
            'DEFAULT_LANGUAGE': 'en',
            'HTTP_TIMEOUT': 5,
        },
    )
    def test_placeholder_url_raises_in_production(self):
        with self.assertRaises(game_provider.ProviderConfigError):
            game_provider.request_launch_url(
                user_id=1, game_uid='abc123', credit_amount='100.00',
            )

    def test_non_zero_code_raises_provider_error(self):
        class _Resp:
            status_code = 200

            @staticmethod
            def json():
                return {'code': 10001, 'msg': 'bad agency'}

        with mock.patch.object(game_provider.requests, 'post', lambda *a, **k: _Resp()):
            with self.assertRaises(game_provider.ProviderError):
                game_provider.request_launch_url(
                    user_id=1, game_uid='abc123def456', credit_amount='100.00'
                )
