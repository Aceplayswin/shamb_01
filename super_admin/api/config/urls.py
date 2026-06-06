from django.urls import include, path

from config.views import health

urlpatterns = [
    path('health', health),
    path('api/v1/', include('tenants.urls')),
]
