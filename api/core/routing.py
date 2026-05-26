from django.urls import path

from core.consumers import LiveFeedConsumer

websocket_urlpatterns = [
    path('ws', LiveFeedConsumer.as_asgi()),
]
