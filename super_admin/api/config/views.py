from django.http import JsonResponse


def health(request):
    return JsonResponse({
        'status': 'ok',
        'service': 'platform-super-admin-api',
        'version': '1.0.0',
    })
