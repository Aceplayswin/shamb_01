import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        # Log resolved aggregator endpoints once at startup (no secrets).
        try:
            from django.conf import settings

            from services.game_provider import aggregator_launch_url, get_config

            if getattr(settings, 'GAME_MOCK_LAUNCH', False):
                logger.info('Game aggregator: mock launch enabled (GAME_MOCK_LAUNCH)')
                return
            raw = settings.GAME_PROVIDER
            if not raw.get('SERVER_URL'):
                return
            cfg = get_config()
            logger.info(
                'Game aggregator: launch=%s callback=%s home=%s',
                aggregator_launch_url(cfg),
                cfg.callback_url,
                cfg.home_url,
            )
        except Exception:  # pragma: no cover - startup must not block boot
            logger.debug('Game aggregator config not logged', exc_info=True)
