import asyncio
import json

from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache


class LiveFeedConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        await self.send(text_data=json.dumps({
            'type': 'connected',
            'message': 'live feed',
        }))
        self._task = asyncio.create_task(self._ticker_loop())

    async def disconnect(self, close_code):
        if hasattr(self, '_task'):
            self._task.cancel()

    async def _ticker_loop(self):
        try:
            while True:
                ticker = cache.get('live:ticker:latest')
                if ticker:
                    await self.send(text_data=json.dumps({'type': 'ticker', 'data': ticker}))
                await asyncio.sleep(5)
        except asyncio.CancelledError:
            pass
