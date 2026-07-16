import json

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from core import (
    admin_services,
    bonus_services,
    game_admin_services,
    game_logging,
    game_services,
    services,
)
from core.ai import chat_respond, fraud_score, pytorch_version, welcome_call
from core.game_services import GameError
from core.geo import detect_geo_from_ip
from core.middleware import require_auth
from core.models import AiCallLog, Transaction, User, UserSetting, Wallet
from services.branding import get_branding

# Game launch error codes -> HTTP status. Mirrors the legacy status_code set so
# the existing frontend game flow keeps working unchanged.
_GAME_ERROR_STATUS = {
    'auth_error': 401,
    'account_error': 403,
    'game_off': 403,
    'invalid_params': 400,
    'game_not_found': 404,
    'balance_error': 402,
    'server_error': 502,
}


def _brand_name() -> str:
    """Current tenant's product name for white-labelling user-facing copy."""
    return get_branding().get('product_name', 'our platform')


def health(request):
    return JsonResponse({
        'status': 'ok',
        'service': 'dollara-api',
        'version': '1.0.0',
        'pytorch_version': pytorch_version(),
    })


def landing(request):
    """Interactive status page served on a direct browser GET to the API root.

    Kept dependency-free (no DB / tenant lookups) so the bare URL always answers
    — this is also what Super Admin's backend-URL reachability check hits. The
    live status + latency are fetched client-side from ``/health``.
    """
    return HttpResponse(_LANDING_HTML, content_type='text/html; charset=utf-8')


_LANDING_HTML = """<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Platform API</title>
<style>
  :root{
    --bg:#0b1020; --bg2:#0e1630; --card:rgba(255,255,255,.04); --border:rgba(255,255,255,.09);
    --fg:#e8ecf6; --muted:#93a0bd; --brand:#6d8bff; --brand2:#8f6dff;
    --ok:#31d0a0; --okbg:rgba(49,208,160,.12); --err:#ff6b6b; --errbg:rgba(255,107,107,.12);
    --code:#0a0f22;
  }
  :root[data-theme="light"]{
    --bg:#f4f6fc; --bg2:#eaeefb; --card:#ffffff; --border:rgba(20,30,60,.10);
    --fg:#141a2e; --muted:#5a6683; --code:#0f1836;
  }
  *{box-sizing:border-box}
  html,body{height:100%}
  body{
    margin:0; font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    color:var(--fg);
    background:
      radial-gradient(1100px 600px at 12% -10%, rgba(109,139,255,.20), transparent 60%),
      radial-gradient(1000px 700px at 100% 0%, rgba(143,109,255,.16), transparent 55%),
      linear-gradient(160deg,var(--bg),var(--bg2));
    min-height:100%; display:flex; align-items:center; justify-content:center; padding:28px;
  }
  .card{
    width:100%; max-width:560px; background:var(--card); border:1px solid var(--border);
    border-radius:20px; padding:30px 30px 26px;
    backdrop-filter:blur(10px); box-shadow:0 24px 60px -24px rgba(0,0,0,.55);
  }
  .top{display:flex; align-items:center; gap:14px; margin-bottom:22px}
  .logo{
    width:46px; height:46px; border-radius:13px; flex:0 0 auto;
    background:linear-gradient(135deg,var(--brand),var(--brand2));
    display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:20px;
    box-shadow:0 8px 22px -6px rgba(109,139,255,.6);
  }
  h1{font-size:19px; margin:0; letter-spacing:.2px}
  .sub{color:var(--muted); font-size:13px; margin-top:2px}
  .status{
    display:flex; align-items:center; gap:10px; padding:13px 15px; border-radius:13px;
    background:var(--okbg); border:1px solid rgba(49,208,160,.25); font-weight:600; margin-bottom:8px;
    transition:background .25s,border-color .25s;
  }
  .status.down{background:var(--errbg); border-color:rgba(255,107,107,.3)}
  .status.wait{background:var(--card); border-color:var(--border); color:var(--muted); font-weight:500}
  .dot{width:11px; height:11px; border-radius:50%; background:var(--ok); flex:0 0 auto;
       box-shadow:0 0 0 0 rgba(49,208,160,.55); animation:pulse 1.8s infinite}
  .status.down .dot{background:var(--err); animation:none}
  .status.wait .dot{background:var(--muted); animation:none}
  @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(49,208,160,.5)}70%{box-shadow:0 0 0 12px rgba(49,208,160,0)}100%{box-shadow:0 0 0 0 rgba(49,208,160,0)}}
  .meta{margin-left:auto; font-size:12px; color:var(--muted); font-variant-numeric:tabular-nums}
  .row{display:flex; gap:10px; margin:16px 0 4px}
  button{
    appearance:none; cursor:pointer; border:0; border-radius:11px; padding:11px 18px; font-size:14px; font-weight:600;
    color:#fff; background:linear-gradient(135deg,var(--brand),var(--brand2));
    box-shadow:0 8px 20px -8px rgba(109,139,255,.7); transition:transform .12s,filter .2s;
  }
  button:hover{filter:brightness(1.08)} button:active{transform:translateY(1px)}
  button[disabled]{opacity:.6; cursor:progress}
  pre{
    margin:14px 0 0; background:var(--code); color:#cfe0ff; border:1px solid var(--border);
    border-radius:12px; padding:14px 15px; font:12.5px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    overflow:auto; max-height:200px;
  }
  .ep{margin-top:22px; border-top:1px solid var(--border); padding-top:16px}
  .ep h2{font-size:11px; text-transform:uppercase; letter-spacing:.12em; color:var(--muted); margin:0 0 10px}
  .ep ul{list-style:none; margin:0; padding:0; display:grid; gap:7px}
  .ep li{display:flex; align-items:center; gap:10px; font-size:13px}
  .verb{font:11px/1 ui-monospace,monospace; font-weight:700; color:#fff; background:rgba(109,139,255,.28);
        border:1px solid rgba(109,139,255,.4); padding:4px 7px; border-radius:6px; min-width:44px; text-align:center}
  .path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace; color:var(--fg)}
  .desc{color:var(--muted); margin-left:auto; font-size:12px}
  .foot{margin-top:20px; color:var(--muted); font-size:12px; display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap}
  a{color:var(--brand); text-decoration:none} a:hover{text-decoration:underline}
</style>
</head>
<body>
  <main class="card">
    <div class="top">
      <div class="logo">API</div>
      <div>
        <h1>Platform API</h1>
        <div class="sub">White-label gaming platform &middot; service gateway</div>
      </div>
    </div>

    <div id="status" class="status wait">
      <span class="dot"></span>
      <span id="statusText">Checking service&hellip;</span>
      <span class="meta" id="latency"></span>
    </div>

    <div class="row">
      <button id="pingBtn" type="button">Check health</button>
    </div>
    <pre id="out" hidden></pre>

    <section class="ep">
      <h2>Public endpoints</h2>
      <ul>
        <li><span class="verb">GET</span><span class="path">/health</span><span class="desc">service status (JSON)</span></li>
        <li><span class="verb">GET</span><span class="path">/api/v1/branding</span><span class="desc">tenant branding</span></li>
        <li><span class="verb">POST</span><span class="path">/graphql</span><span class="desc">feature API</span></li>
      </ul>
    </section>

    <div class="foot">
      <span id="host"></span>
      <span id="clock"></span>
    </div>
  </main>

<script>
(function(){
  var statusEl=document.getElementById('status'),
      textEl=document.getElementById('statusText'),
      latEl=document.getElementById('latency'),
      out=document.getElementById('out'),
      btn=document.getElementById('pingBtn');

  document.getElementById('host').textContent=location.host;

  function tick(){
    var d=new Date();
    document.getElementById('clock').textContent=d.toISOString().replace('T',' ').replace(/\\..+/,' UTC');
  }
  tick(); setInterval(tick,1000);

  function setState(cls,label){
    statusEl.className='status '+cls;
    textEl.textContent=label;
  }

  function ping(show){
    btn.disabled=true;
    setState('wait','Checking service\\u2026'); latEl.textContent='';
    var t0=performance.now();
    fetch('/health',{headers:{'Accept':'application/json'}})
      .then(function(r){ return r.json().then(function(j){ return {ok:r.ok,body:j}; }); })
      .then(function(res){
        var ms=Math.round(performance.now()-t0);
        latEl.textContent=ms+' ms';
        if(res.ok && res.body && res.body.status==='ok'){
          setState('up','Operational \\u2014 all systems normal');
        }else{
          setState('down','Degraded \\u2014 unexpected response');
        }
        if(show){ out.hidden=false; out.textContent=JSON.stringify(res.body,null,2); }
      })
      .catch(function(e){
        latEl.textContent='';
        setState('down','Unreachable \\u2014 '+e.message);
        if(show){ out.hidden=false; out.textContent=String(e); }
      })
      .finally(function(){ btn.disabled=false; });
  }

  btn.addEventListener('click',function(){ ping(true); });
  ping(false);
})();
</script>
</body>
</html>"""


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
            body['fullName'],
            body['phone'],
            body['password'],
            body.get('countryCode', 'IN'),
            referral_code=body.get('referralCode'),
        )
        return JsonResponse(result, status=201)
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e)


@csrf_exempt
@require_http_methods(['POST'])
def demo_session(request):
    try:
        return JsonResponse(services.create_demo_session(), status=201)
    except ValueError as e:
        return _error_response(e)
    except Exception as e:
        return _error_response(e, status=500)


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


# --- Settings / preferences ---
@csrf_exempt
@require_auth(['user'])
@require_http_methods(['GET', 'PUT', 'PATCH'])
def user_settings(request):
    try:
        if request.method == 'GET':
            return JsonResponse(services.get_user_preferences(request.auth.sub))
        body = _json_body(request)
        return JsonResponse(services.update_user_preferences(request.auth.sub, body))
    except json.JSONDecodeError as e:
        return _error_response(e)
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)
    except Exception as e:
        return _error_response(e)


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
            # Optional UTR / reference the user pastes from their payment app.
            reference_number=(body.get('referenceNumber') or body.get('reference_number')),
        )
        return JsonResponse(result, status=201)
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except Exception as e:
        return _error_response(e)


# Admin-only: crediting a deposit is a product-admin action. The public deposit
# flow leaves the transaction PENDING; only an admin confirm credits the wallet.
@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def wallet_deposit_confirm(request, tx_id):
    try:
        body = _json_body(request)
        ref = body.get('referenceNumber') or body.get('reference_number', f'ADMIN-{tx_id}')
        return JsonResponse(services.confirm_deposit(tx_id, ref))
    except Transaction.DoesNotExist:
        return _error_response(ValueError('Transaction not found'), 404)
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


# --- Bonuses / Promotions (player-facing) ---
@require_http_methods(['GET'])
def promotions_list(request):
    """Active, promotable bonuses for the public promotions page. Keyless."""
    return JsonResponse(bonus_services.list_public_bonuses(), safe=False)


@require_auth(['user'])
@require_http_methods(['GET'])
def my_bonuses(request):
    """The signed-in player's awarded bonuses + wagering progress."""
    return JsonResponse(bonus_services.list_user_bonuses(request.auth.sub), safe=False)


@csrf_exempt
@require_auth(['user'])
@require_http_methods(['POST'])
def claim_promo(request):
    """Player redeems a promo code for its bonus."""
    try:
        body = _json_body(request)
        return JsonResponse(bonus_services.claim_promo_code(request.auth.sub, body.get('code', '')))
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e)


@require_auth(['user'])
@require_http_methods(['GET'])
def my_referral(request):
    """The player's shareable referral code + how many people they've referred."""
    code = bonus_services.ensure_referral_code(request.auth.sub)
    count = UserSetting.objects.filter(referred_by=request.auth.sub).count()
    return JsonResponse({'referral_code': code, 'referred_count': count})


# --- Games ---
@require_http_methods(['GET'])
def games_list(request):
    category = request.GET.get('category')
    featured_param = request.GET.get('featured')
    featured = True if featured_param == 'true' else None
    search = request.GET.get('search')
    limit = int(request.GET.get('limit', 50))
    offset = int(request.GET.get('offset', 0))
    return JsonResponse(
        services.list_games(category, featured, limit, offset, search),
        safe=False,
    )


@require_http_methods(['GET'])
def games_trending(request):
    return JsonResponse(services.list_games(limit=12), safe=False)


# --- Banners (public home-page hero carousel) ---
@require_http_methods(['GET'])
def banners_list(request):
    """Active hero banners for this product's frontends. Keyless, like games."""
    return JsonResponse(services.list_active_banners(), safe=False)


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


@csrf_exempt
@require_auth(['user'])
@require_http_methods(['POST'])
def games_launch(request):
    """Request a launch URL from the aggregator and open a game session."""
    try:
        body = _json_body(request)
        return JsonResponse(game_services.launch_game(request.auth.sub, body))
    except json.JSONDecodeError as e:
        return JsonResponse({'status_code': 'invalid_params', 'error': str(e)}, status=400)
    except GameError as e:
        return JsonResponse(
            {'status_code': e.code, 'error': str(e)},
            status=_GAME_ERROR_STATUS.get(e.code, 400),
        )


@require_auth(['user'])
@require_http_methods(['GET'])
def games_history(request):
    """Paginated play/session history for the current user."""
    limit = int(request.GET.get('limit', 40))
    offset = int(request.GET.get('offset', 0))
    return JsonResponse(game_services.get_play_history(request.auth.sub, limit, offset))


@require_auth(['user'])
@require_http_methods(['GET'])
def games_pnl(request):
    """Aggregate betting profit/loss for the current user."""
    return JsonResponse(game_services.get_user_pnl(request.auth.sub))


@csrf_exempt
@require_http_methods(['POST'])
def games_callback(request):
    """Inbound aggregator bet/win callback. Public (auth is via AES payload)."""
    raw = request.body.decode('utf-8', errors='replace') if request.body else ''
    try:
        envelope = json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        # The aggregator may post the encrypted payload as a raw form field.
        envelope = {'payload': request.POST.get('payload', raw)}
    try:
        ack = game_services.process_callback(envelope, raw_body=raw)
        return JsonResponse(ack)
    except GameError as e:
        # Provider-shaped error envelope (non-zero code) so the aggregator can
        # retry/alert without us leaking internals.
        return JsonResponse({'code': 1, 'msg': str(e), 'payload': ''}, status=200)
    except Exception as e:
        game_logging.callback_error(f'{type(e).__name__}: {e}')
        return JsonResponse({'code': 1, 'msg': 'internal_error', 'payload': ''}, status=200)


@require_http_methods(['GET'])
def games_mock_launch(request):
    """Dev-only placeholder page when GAME_MOCK_LAUNCH is active."""
    game_uid = request.GET.get('game_uid', '')
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mock game launch</title>
  <style>
    body {{
      margin: 0; min-height: 100vh; display: grid; place-items: center;
      font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0;
    }}
    .card {{
      max-width: 32rem; padding: 2rem; border-radius: 1rem;
      background: #1e293b; border: 1px solid #334155; text-align: center;
    }}
    h1 {{ margin: 0 0 0.75rem; font-size: 1.25rem; }}
    p {{ margin: 0.5rem 0; color: #94a3b8; line-height: 1.5; }}
    code {{ color: #38bdf8; word-break: break-all; }}
  </style>
</head>
<body>
  <div class="card">
    <h1>Mock game launch (development)</h1>
    <p>Launch session created successfully. The real aggregator is not configured.</p>
    <p>Game UID: <code>{game_uid or 'n/a'}</code></p>
    <p>Set <code>GAME_SERVER_URL</code> to your provider&apos;s full HTTPS base URL for live play.</p>
  </div>
</body>
</html>"""
    return HttpResponse(html, content_type='text/html; charset=utf-8')


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
def admin_dashboard_charts(request):
    return JsonResponse(admin_services.get_dashboard_charts())


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_recent_activity(request):
    return JsonResponse(admin_services.get_recent_activity(), safe=False)


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


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_user_detail(request, user_id):
    try:
        return JsonResponse(admin_services.get_user_full_detail(user_id))
    except User.DoesNotExist:
        return _error_response(ValueError('User not found'), 404)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['PATCH'])
def admin_user_status(request, user_id):
    try:
        body = _json_body(request)
        if 'status' in body:
            User.objects.filter(id=user_id).update(account_status=body['status'])
            return JsonResponse({'updated': True})
        return JsonResponse(
            admin_services.update_user_admin(
                user_id,
                account_status=body.get('account_status'),
                kyc_status=body.get('kyc_status'),
                fraud_score=body.get('fraud_score'),
            )
        )
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except User.DoesNotExist:
        return _error_response(ValueError('User not found'), 404)
    except ValueError as e:
        return _error_response(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_transactions(request):
    return JsonResponse(
        admin_services.list_admin_transactions(
            request.GET.get('type'),
            request.GET.get('status'),
            request.GET.get('userId'),
            int(request.GET.get('limit', 50)),
            int(request.GET.get('offset', 0)),
        ),
        safe=False,
    )


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_deposits_pending(request):
    return JsonResponse(admin_services.list_pending_deposits(), safe=False)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_deposit_confirm(request, tx_id):
    try:
        body = _json_body(request)
        ref = body.get('referenceNumber') or body.get('reference_number', f'ADMIN-{tx_id}')
        return JsonResponse(services.confirm_deposit(tx_id, ref))
    except Transaction.DoesNotExist:
        return _error_response(ValueError('Transaction not found'), 404)
    except Exception as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_deposit_reject(request, tx_id):
    try:
        body = _json_body(request)
        return JsonResponse(services.reject_deposit(tx_id, body.get('reason', '')))
    except Transaction.DoesNotExist:
        return _error_response(ValueError('Transaction not found'), 404)
    except Exception as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_upload_image(request):
    file = request.FILES.get('file')
    if not file:
        return _error_response(ValueError('No file uploaded'))
    try:
        url = admin_services.upload_admin_image(file)
    except ValueError as e:
        return _error_response(e)
    return JsonResponse({'url': request.build_absolute_uri(url)}, status=201)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_games(request):
    return JsonResponse(
        admin_services.list_admin_games(
            int(request.GET.get('limit', 200)),
            int(request.GET.get('offset', 0)),
        ),
        safe=False,
    )


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_games_create(request):
    try:
        return JsonResponse(admin_services.create_game(_json_body(request)), status=201)
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except Exception as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['PATCH'])
def admin_games_update(request, game_id):
    try:
        return JsonResponse(admin_services.update_game(game_id, _json_body(request)))
    except Exception as e:
        return _error_response(e)


# --- Admin: gaming control, analytics, reports ---
@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_games_status(request):
    return JsonResponse(game_admin_services.get_game_status())


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['PUT'])
def admin_games_status_set(request):
    try:
        body = _json_body(request)
        return JsonResponse(game_admin_services.set_game_status(bool(body['enabled'])))
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_games_statistics(request):
    return JsonResponse(game_admin_services.get_game_statistics())


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_games_pnl_series(request):
    return JsonResponse(
        game_admin_services.get_pnl_series(int(request.GET.get('days', 7))),
        safe=False,
    )


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_games_top(request):
    return JsonResponse(
        game_admin_services.get_top_games(int(request.GET.get('limit', 10))),
        safe=False,
    )


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_games_rounds(request):
    return JsonResponse(
        game_admin_services.list_recent_rounds(
            int(request.GET.get('limit', 50)),
            int(request.GET.get('offset', 0)),
            request.GET.get('userId'),
            request.GET.get('gameUid'),
        ),
        safe=False,
    )


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_providers(request):
    return JsonResponse(admin_services.list_admin_providers(), safe=False)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_providers_create(request):
    try:
        return JsonResponse(admin_services.create_provider(_json_body(request)), status=201)
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except Exception as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['PATCH'])
def admin_providers_update(request, provider_id):
    try:
        return JsonResponse(admin_services.update_provider(provider_id, _json_body(request)))
    except Exception as e:
        return _error_response(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_bets(request):
    return JsonResponse(
        admin_services.list_admin_bets(
            int(request.GET.get('limit', 50)),
            int(request.GET.get('offset', 0)),
            request.GET.get('userId'),
        ),
        safe=False,
    )


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_bonuses(request):
    return JsonResponse(admin_services.list_admin_bonuses(), safe=False)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_bonuses_stats(request):
    return JsonResponse(admin_services.bonus_stats())


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_bonuses_create(request):
    try:
        return JsonResponse(admin_services.create_bonus(_json_body(request)), status=201)
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except Exception as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['PATCH', 'DELETE'])
def admin_bonuses_update(request, bonus_id):
    try:
        if request.method == 'DELETE':
            return JsonResponse(admin_services.delete_bonus(bonus_id))
        return JsonResponse(admin_services.update_bonus(bonus_id, _json_body(request)))
    except Exception as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_bonuses_duplicate(request, bonus_id):
    try:
        return JsonResponse(admin_services.duplicate_bonus(bonus_id), status=201)
    except Exception as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_bonuses_grant(request, bonus_id):
    try:
        body = _json_body(request)
        return JsonResponse(admin_services.grant_bonus_to_user(
            bonus_id,
            int(body['userId']),
            request.auth.sub,
            amount=body.get('amount'),
            notes=body.get('notes', ''),
        ))
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except Exception as e:
        return _error_response(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_bonuses_issued(request):
    bonus_id = request.GET.get('bonusId')
    return JsonResponse(
        admin_services.list_issued_bonuses(int(bonus_id) if bonus_id else None),
        safe=False,
    )


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_bonuses_revoke(request, user_bonus_id):
    try:
        return JsonResponse(admin_services.revoke_user_bonus(user_bonus_id))
    except Exception as e:
        return _error_response(e)


# --- Admin: home-page banners ---
@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_banners(request):
    return JsonResponse(admin_services.list_admin_banners(), safe=False)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_banners_create(request):
    try:
        return JsonResponse(admin_services.create_banner(_json_body(request)), status=201)
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except Exception as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['PATCH', 'DELETE'])
def admin_banners_update(request, banner_id):
    try:
        if request.method == 'DELETE':
            return JsonResponse(admin_services.delete_banner(banner_id))
        return JsonResponse(admin_services.update_banner(banner_id, _json_body(request)))
    except Exception as e:
        return _error_response(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_settings(request):
    return JsonResponse(admin_services.list_platform_settings(), safe=False)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['PUT'])
def admin_settings_update(request, setting_key):
    try:
        body = _json_body(request)
        return JsonResponse(admin_services.update_platform_setting(setting_key, body['value']))
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_ai_calls(request):
    return JsonResponse(
        admin_services.list_ai_call_logs(
            int(request.GET.get('limit', 50)),
            int(request.GET.get('offset', 0)),
        ),
        safe=False,
    )


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_wallet_adjust(request, user_id):
    try:
        body = _json_body(request)
        return JsonResponse(
            admin_services.wallet_adjustment(
                user_id, float(body['amount']), body.get('notes', '')
            )
        )
    except Wallet.DoesNotExist:
        return _error_response(ValueError('Wallet not found'), 404)
    except (KeyError, json.JSONDecodeError, TypeError, ValueError) as e:
        return _error_response(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_staff(request):
    return JsonResponse(admin_services.list_admin_users_list(), safe=False)


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
    try:
        return JsonResponse(services.approve_withdrawal(tx_id))
    except Transaction.DoesNotExist:
        return _error_response(ValueError('Transaction not found'), 404)
    except Exception as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_withdrawal_reject(request, tx_id):
    try:
        body = _json_body(request)
        return JsonResponse(services.reject_withdrawal(tx_id, body.get('reason', '')))
    except Transaction.DoesNotExist:
        return _error_response(ValueError('Transaction not found'), 404)
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except Exception as e:
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
    user = User.objects.select_related('usersetting').get(id=user_id)
    prefs = services.get_user_settings(user)
    voice_id = prefs.ai_voice_executive_id if prefs else None
    data = welcome_call(
        user_id=user_id,
        name=user.full_name,
        voice_executive_id=voice_id,
        brand=_brand_name(),
    )
    AiCallLog.objects.create(
        user_id=user_id,
        voice_executive_id=voice_id,
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
    data = chat_respond(message=message, language=body.get('language', 'en'), brand=_brand_name())
    return JsonResponse(data)
