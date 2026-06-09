"""Seed the game catalog (providers + 263 aggregator games) into a tenant DB.

The catalog data lives in ``_game_catalog.py`` (auto-generated from the legacy
frontend bundle; see games.md). This command upserts providers and games keyed
on their stable identifiers (provider slug, game ``game_uid``) so it is safe to
re-run after the aggregator catalog changes.

Usage:
    python manage.py seed_games --tenant dollara
"""

from __future__ import annotations

from django.core.management.base import BaseCommand

from core.models import Game, GameProvider
from core.repositories import GameSettingsRepository

from ._game_catalog import GAMES, PROVIDERS


class Command(BaseCommand):
    help = 'Seed game providers and the aggregator game catalog into a tenant DB'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant',
            default=None,
            help='Product slug to seed. Activates that tenant DB before seeding.',
        )

    def handle(self, *args, **options):
        tenant = options.get('tenant')
        if tenant:
            from services.tenant_resolver import resolve_tenant

            resolve_tenant(header_slug=tenant)
            self.stdout.write(f'Seeding games into tenant: {tenant}')

        # Providers (upsert by slug).
        provider_ids: dict[str, int] = {}
        for slug, name in PROVIDERS:
            provider, _ = GameProvider.objects.get_or_create(
                slug=slug, defaults={'name': name}
            )
            provider_ids[slug] = provider.id

        created = 0
        updated = 0
        for sort_order, g in enumerate(GAMES):
            provider_id = provider_ids.get(g['provider_slug'])
            defaults = {
                'provider_id': provider_id,
                'name': g['name'],
                'slug': g['slug'],
                'category': g['category'],
                'game_type': g['game_type'],
                'is_active': True,
                'is_active_web': True,
                'sort_order': sort_order,
            }
            # Key on the aggregator game_uid (the stable external identifier).
            obj, was_created = Game.objects.update_or_create(
                game_uid=g['game_uid'], defaults=defaults
            )
            created += int(was_created)
            updated += int(not was_created)

        # Ensure the global games master switch exists and is on.
        GameSettingsRepository.set_games_enabled(True)

        self.stdout.write(
            self.style.SUCCESS(
                f'Catalog seeded: {len(PROVIDERS)} providers, '
                f'{created} games created, {updated} updated.'
            )
        )
