"""Unit tests for gaming request validation schemas."""

from decimal import Decimal

from django.test import SimpleTestCase

from core.game_schemas import CallbackPayload, LaunchRequest


class LaunchRequestTests(SimpleTestCase):
    def test_accepts_new_and_legacy_keys(self):
        new = LaunchRequest.parse({'gameUid': 'a04d1f3eb8ccec8a4823bdf18e3f0e84'})
        legacy = LaunchRequest.parse({
            'GAME_UID': 'a04d1f3eb8ccec8a4823bdf18e3f0e84',
            'GAME_NAME': 'Aviator',
        })
        self.assertEqual(new.game_uid, legacy.game_uid)
        self.assertEqual(legacy.game_name, 'Aviator')

    def test_missing_uid_raises(self):
        with self.assertRaises(ValueError):
            LaunchRequest.parse({'gameName': 'Aviator'})

    def test_invalid_uid_format_raises(self):
        with self.assertRaises(ValueError):
            LaunchRequest.parse({'gameUid': 'not a uid!!'})

    def test_platform_defaults_and_sanitizes(self):
        self.assertEqual(LaunchRequest.parse({'gameUid': 'abcd1234abcd1234'}).platform, 'web')
        self.assertEqual(
            LaunchRequest.parse({'gameUid': 'abcd1234abcd1234', 'platform': 'junk'}).platform,
            'web',
        )


class CallbackPayloadTests(SimpleTestCase):
    BASE = {
        'member_account': 'h72add1111111',
        'game_uid': 'a04d1f3eb8ccec8a4823bdf18e3f0e84',
        'serial_number': '9c12630d-7c78-3fd4-986b-b9901681cdc0',
        'bet_amount': '10',
        'win_amount': '0',
    }

    def test_parses_amounts_as_decimal(self):
        cb = CallbackPayload.parse(self.BASE)
        self.assertEqual(cb.bet_amount, Decimal('10'))
        self.assertEqual(cb.win_amount, Decimal('0'))
        self.assertFalse(cb.is_heartbeat)

    def test_heartbeat_detection(self):
        cb = CallbackPayload.parse({**self.BASE, 'bet_amount': '0', 'win_amount': '0'})
        self.assertTrue(cb.is_heartbeat)

    def test_missing_required_field_raises(self):
        bad = dict(self.BASE)
        del bad['serial_number']
        with self.assertRaises(ValueError):
            CallbackPayload.parse(bad)

    def test_negative_amount_rejected(self):
        with self.assertRaises(ValueError):
            CallbackPayload.parse({**self.BASE, 'bet_amount': '-5'})

    def test_non_numeric_amount_rejected(self):
        with self.assertRaises(ValueError):
            CallbackPayload.parse({**self.BASE, 'win_amount': 'abc'})
