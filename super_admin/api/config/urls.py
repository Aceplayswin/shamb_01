from django.conf import settings
from django.urls import include, path
from django.views.static import serve as serve_media

from config.views import health

urlpatterns = [
    path('health', health),
    path('api/v1/', include('tenants.urls')),
    # Admin-uploaded branding assets. Served by Django directly (no nginx/object
    # storage in this stack yet) so this must stay enabled outside DEBUG too —
    # unlike django.conf.urls.static.static(), which no-ops when DEBUG=False.
    path('media/<path:path>', serve_media, {'document_root': settings.MEDIA_ROOT}),
]
