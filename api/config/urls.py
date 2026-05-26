from django.urls import include, path
from strawberry.django.views import GraphQLView

from core.graphql_schema import schema
from core.views import health

urlpatterns = [
    path('health', health),
    path('api/v1/', include('core.urls')),
    path('graphql', GraphQLView.as_view(schema=schema)),
]
