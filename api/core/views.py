import json

from django.conf import settings
from django.db.models import F
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from core import services
from core.ai import chat_respond, fraud_score, pytorch_version, welcome_call
from core.geo import detect_geo_from_ip
from core.middleware import require_auth
from core.models import AiCallLog, Transaction, User, Wallet


def health(request):
    return JsonResponse({
        'status': 'ok',
        'service': 'dollara-api',
        'version': '1.0.0',
        'pytorch_version': pytorch_version(),
    })


def _json_body(request) -> dict:
    if not request.body:
        return {}
    return json.loads(request.body)


def _error_response(exc: Exception, status: int = 400):
    return JsonResponse({'error': str(exc)}, status=status)


# --- Auth ---
@csrf_exempt
@require_http_methods(['POST'])
def otp_send(request):
    try:
        body = _json_body(request)
        return JsonResponse(services.send_otp(body['phone'], body.get('channel', 'sms')))
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except Exception as e:
        return _error_response(e)


@csrf_exempt
@require_http_methods(['POST'])
def otp_verify(request):
    try:
        body = _json_body(request)
        services.verify_otp(body['phone'], body['otp'])
        return JsonResponse({'verified': True})
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e)


@csrf_exempt
@require_http_methods(['POST'])
def register_otp(request):
    try:
        body = _json_body(request)
        services.verify_otp(body['phone'], body['otp'])
        result = services.register_with_otp(
            body['fullName'], body['phone'], body.get('countryCode', 'IN')
        )
        return JsonResponse(result, status=201)
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e)


@csrf_exempt
@require_http_methods(['POST'])
def demo_session(request):
    return JsonResponse(services.create_demo_session(), status=201)


@csrf_exempt
@require_http_methods(['POST'])
def login(request):
    try:
        body = _json_body(request)
        return JsonResponse(services.login_user(body['phone'], body['password']))
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e, 401)


# --- Wallet ---
@require_auth(['user'])
@require_http_methods(['GET'])
def wallet_get(request):
    try:
        return JsonResponse(services.get_wallet(request.auth.sub))
    except Exception as e:
        return _error_response(e, 404)


@csrf_exempt
@require_auth(['user'])
@require_http_methods(['POST'])
def wallet_deposit(request):
    try:
        body = _json_body(request)
        result = services.create_deposit(
            request.auth.sub,
            float(body['amount']),
            body['paymentMethod'],
            body.get('currency', 'INR'),
        )
        return JsonResponse(result, status=201)
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except Exception as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['user', 'admin'])
@require_http_methods(['POST'])
def wallet_deposit_confirm(request, tx_id):
    try:
        body = _json_body(request)
        return JsonResponse(services.confirm_deposit(tx_id, body['referenceNumber']))
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except Exception as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['user'])
@require_http_methods(['POST'])
def wallet_withdraw(request):
    try:
        body = _json_body(request)
        result = services.create_withdrawal(
            request.auth.sub, float(body['amount']), body['paymentMethod']
        )
        return JsonResponse(result, status=201)
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e)


@require_auth(['user'])
@require_http_methods(['GET'])
def wallet_transactions(request):
    txs = Transaction.objects.filter(user_id=request.auth.sub).order_by('-created_at')[:50]
    data = [
        {
            'id': t.id,
            'type': t.type,
            'amount': float(t.amount),
            'currency': t.currency,
            'status': t.status,
            'payment_method': t.payment_method,
            'reference_number': t.reference_number,
            'created_at': t.created_at.isoformat(),
        }
        for t in txs
    ]
    return JsonResponse(data, safe=False)


# --- Games ---
@require_http_methods(['GET'])
def games_list(request):
    category = request.GET.get('category')
    featured_param = request.GET.get('featured')
    featured = True if featured_param == 'true' else None
    limit = int(request.GET.get('limit', 50))
    offset = int(request.GET.get('offset', 0))
    return JsonResponse(
        services.list_games(category, featured, limit, offset),
        safe=False,
    )


@require_http_methods(['GET'])
def games_trending(request):
    return JsonResponse(services.list_games(limit=12), safe=False)


@csrf_exempt
@require_auth(['user'])
@require_http_methods(['POST'])
def games_bet(request):
    try:
        body = _json_body(request)
        result = services.place_bet(
            request.auth.sub,
            body['gameId'],
            float(body['amount']),
            float(body['odds']) if body.get('odds') else None,
        )
        return JsonResponse(result, status=201)
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e)


# --- Geo ---
@require_http_methods(['GET'])
def geo_detect(request):
    ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
    if not ip:
        ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
    return JsonResponse(detect_geo_from_ip(ip))


# --- Admin ---
@csrf_exempt
@require_http_methods(['POST'])
def admin_login(request):
    try:
        body = _json_body(request)
        return JsonResponse(services.login_admin(body['username'], body['password']))
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e, 401)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_dashboard(request):
    return JsonResponse(services.get_dashboard_stats())


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_users(request):
    return JsonResponse(
        services.list_users(
            request.GET.get('status'),
            request.GET.get('kycStatus'),
            int(request.GET.get('limit', 50)),
            int(request.GET.get('offset', 0)),
        ),
        safe=False,
    )


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['PATCH'])
def admin_user_status(request, user_id):
    try:
        body = _json_body(request)
        User.objects.filter(id=user_id).update(account_status=body['status'])
        return JsonResponse({'updated': True})
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_withdrawals_pending(request):
    txs = (
        Transaction.objects.filter(
            type=Transaction.TxType.WITHDRAWAL,
            status__in=[Transaction.Status.PENDING, Transaction.Status.PROCESSING],
        )
        .select_related('user')
        .order_by('created_at')[:100]
    )
    data = [
        {
            'id': t.id,
            'user_id': t.user_id,
            'amount': float(t.amount),
            'status': t.status,
            'created_at': t.created_at.isoformat(),
            'username': t.user.username,
            'full_name': t.user.full_name,
        }
        for t in txs
    ]
    return JsonResponse(data, safe=False)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_withdrawal_approve(request, tx_id):
    Transaction.objects.filter(id=tx_id).update(status=Transaction.Status.COMPLETED)
    return JsonResponse({'approved': True})


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_withdrawal_reject(request, tx_id):
    try:
        body = _json_body(request)
        tx = Transaction.objects.get(id=tx_id)
        tx.status = Transaction.Status.REJECTED
        tx.notes = body.get('reason', '')
        tx.save(update_fields=['status', 'notes', 'updated_at'])
        Wallet.objects.filter(user_id=tx.user_id).update(
            locked_balance=F('locked_balance') - tx.amount,
            main_balance=F('main_balance') + tx.amount,
        )
        return JsonResponse({'rejected': True})
    except Transaction.DoesNotExist:
        return _error_response(ValueError('Not found'), 404)
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)


# --- AI ---
@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def ai_fraud_score(request):
    body = _json_body(request)
    try:
        amount = float(body['amount'])
    except (KeyError, TypeError, ValueError) as e:
        return _error_response(e)
    data = fraud_score(
        user_id=body.get('userId', ''),
        transaction_id=body.get('transactionId'),
        amount=amount,
        deposit_count=int(body.get('depositCount', 0)),
        withdrawal_count=int(body.get('withdrawalCount', 0)),
        account_age_days=int(body.get('accountAgeDays', 30)),
        same_ip_accounts=int(body.get('sameIpAccounts', 0)),
        vpn_detected=bool(body.get('vpnDetected', False)),
        wagering_complete=bool(body.get('wageringComplete', True)),
    )
    return JsonResponse(data)


@csrf_exempt
@require_auth(['user', 'admin'])
@require_http_methods(['POST'])
def ai_welcome_call(request):
    body = _json_body(request)
    user_id = body.get('userId') or request.auth.sub
    user = User.objects.get(id=user_id)
    data = welcome_call(
        user_id=user_id,
        name=user.full_name,
        voice_executive_id=user.ai_voice_executive_id,
    )
    AiCallLog.objects.create(
        user_id=user_id,
        voice_executive_id=user.ai_voice_executive_id,
        duration_seconds=data.get('duration_seconds', 90),
        transcript=data.get('transcript', ''),
        status='completed',
    )
    return JsonResponse(data)


@csrf_exempt
@require_auth(['user', 'admin'])
@require_http_methods(['POST'])
def ai_chat(request):
    body = _json_body(request)
    message = body.get('message', '')
    if not message:
        return _error_response(ValueError('message is required'))
    data = chat_respond(message=message, language=body.get('language', 'en'))
    return JsonResponse(data)
