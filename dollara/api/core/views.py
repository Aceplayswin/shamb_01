import json
import logging

from django.conf import settings
from datetime import datetime

from django.http import (
    HttpResponse,
    HttpResponseRedirect,
    JsonResponse,
    StreamingHttpResponse,
)
from django.db.utils import OperationalError, ProgrammingError
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from core import (
    admin_services,
    bonus_services,
    deposit_gateway,
    game_admin_services,
    game_logging,
    game_services,
    services,
)
from core.paygate import PaygateError
from core.ai import chat_respond, fraud_score, welcome_call
from core.game_services import GameError
from core.geo import detect_geo_from_ip
from core.ip_tracking import IpBlocked, enforce_ip, get_client_ip, record_login
from core.middleware import require_auth
from core.models import AiCallLog, Transaction, User, UserSetting, Wallet
from core.schema_errors import (
    BONUSES_SCHEMA_MESSAGE,
    describe_database_error,
    is_missing_column_error,
    schema_error_response,
)
from services.branding import get_branding

logger = logging.getLogger(__name__)

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
def register(request):
    """Direct sign-up: full name + phone + password. No verification step."""
    try:
        enforce_ip(request)
        body = _json_body(request)
        result = services.register_user(
            body['fullName'],
            body['phone'],
            body['password'],
            body.get('countryCode', 'IN'),
            referral_code=body.get('referralCode'),
            # Affiliate attribution, forwarded by the web app from the ?ref/&sub
            # /&clk params a tracking link left behind. All optional: a direct
            # sign-up sends none of them and behaves exactly as before.
            affiliate_ref=body.get('affiliateRef'),
            affiliate_sub=body.get('affiliateSub'),
            affiliate_click_id=body.get('affiliateClickId'),
            signup_ip=get_client_ip(request),
        )
        return JsonResponse(result, status=201)
    except IpBlocked as e:
        return _error_response(e, 403)
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e)
    except (OperationalError, ProgrammingError) as e:
        # Schema drift (a column the model selects that the table lacks) must
        # come back as a sentence, not the MySQL text and not a generic 500.
        logger.exception('register failed')
        return JsonResponse(
            {'error': describe_database_error(e) or 'Registration could not be saved.'},
            status=500,
        )
    except Exception:
        # Anything else unexpected must still reach the sign-up form as JSON —
        # otherwise the browser gets an HTML error page. Details stay in the log.
        logger.exception('register failed')
        return JsonResponse({'error': 'Registration failed, please try again'}, status=500)


@csrf_exempt
@require_http_methods(['POST'])
def demo_session(request):
    try:
        return JsonResponse(services.create_demo_session(), status=201)
    except ValueError as e:
        return _error_response(e)
    except (OperationalError, ProgrammingError) as e:
        logger.exception('demo session failed')
        return JsonResponse(
            {'error': describe_database_error(e) or 'Demo session could not be created.'},
            status=500,
        )
    except Exception:
        logger.exception('demo session failed')
        return JsonResponse({'error': 'Demo session could not be created.'}, status=500)


@csrf_exempt
@require_http_methods(['POST'])
def login(request):
    try:
        enforce_ip(request)
        body = _json_body(request)
        result = services.login_user(body['phone'], body['password'])
        record_login(request, user_id=result.get('userId'))
        return JsonResponse(result)
    except IpBlocked as e:
        return _error_response(e, 403)
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e, 401)
    except (OperationalError, ProgrammingError) as e:
        logger.exception('login failed')
        return JsonResponse(
            {'error': describe_database_error(e) or 'Sign-in could not be completed.'},
            status=500,
        )


@csrf_exempt
@require_auth(['user', 'admin'])
@require_http_methods(['POST'])
def change_password(request):
    """Signed-in password change (verifies the current password)."""
    try:
        body = _json_body(request)
        return JsonResponse(services.change_password(
            request.auth.sub,
            body.get('currentPassword') or body.get('current_password') or '',
            body.get('newPassword') or body.get('new_password') or '',
        ))
    except json.JSONDecodeError as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e)


# --- Mobile app (APK) ---
@require_http_methods(['GET'])
def app_download(request):
    """Public app-install info (APK URL, version) set by the product admin."""
    return JsonResponse(services.get_app_download())


@require_http_methods(['GET'])
def app_download_redirect(request):
    """Send the browser straight to the APK — the target of the install button
    and the QR code, so the download link stays stable if the file is replaced."""
    config = services.get_app_download()
    if not config.get('available'):
        return JsonResponse({'error': 'App download is not available yet'}, status=404)
    return HttpResponseRedirect(config['apk_url'])


@require_http_methods(['GET'])
def social_links(request):
    """Public Facebook / Instagram / X / WhatsApp URLs for player chrome."""
    return JsonResponse(services.get_social_links())


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


@require_auth(['user'])
@require_http_methods(['GET'])
def wallet_breakdown(request):
    """Itemised wallet view for the Wallet page — balances plus a per-source
    breakdown of bonuses, deposits/withdrawals, and game-play totals."""
    try:
        return JsonResponse(services.get_wallet_breakdown(request.auth.sub))
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
            # Screenshot the player uploaded first (see wallet_deposit_proof).
            payment_proof_url=(body.get('paymentProofUrl') or body.get('payment_proof_url')),
            # Same ?ref/&sub/&clk the tracking link left in the browser. Used
            # when signup did not already tie this player to the link, so the
            # confirmed deposit can count as that link's first deposit.
            affiliate_ref=body.get('affiliateRef'),
            affiliate_sub=body.get('affiliateSub'),
            affiliate_click_id=body.get('affiliateClickId'),
            client_ip=get_client_ip(request),
        )
        return JsonResponse(result, status=201)
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except Exception as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['user'])
@require_http_methods(['POST'])
def wallet_deposit_proof(request):
    """Player uploads a payment screenshot (multipart) and gets back its URL.

    Uploading alone credits nothing: the URL is passed to the deposit request,
    which stays PENDING until an admin reviews the proof and confirms it.
    """
    try:
        url = services.save_payment_proof(request.auth.sub, request.FILES.get('file'))
        return JsonResponse({'url': request.build_absolute_uri(url)}, status=201)
    except ValueError as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['user'])
@require_http_methods(['POST'])
def wallet_deposit_checkout(request):
    """Create a Paygate order and return the Razorpay checkout payload."""
    try:
        body = _json_body(request)
        result = deposit_gateway.start_checkout(
            request.auth.sub,
            body.get('amount'),
            payment_method=body.get('paymentMethod') or body.get('payment_method'),
            affiliate_ref=body.get('affiliateRef'),
            affiliate_sub=body.get('affiliateSub'),
            affiliate_click_id=body.get('affiliateClickId'),
            client_ip=get_client_ip(request),
        )
        return JsonResponse(result, status=201)
    except PaygateError as e:
        return JsonResponse({'error': str(e)}, status=e.status)
    except Transaction.DoesNotExist:
        return _error_response(ValueError('Deposit not found'), 404)
    except (KeyError, json.JSONDecodeError, User.DoesNotExist) as e:
        return _error_response(e)
    except Exception as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['user'])
@require_http_methods(['POST'])
def wallet_deposit_verify(request):
    """Forward the Razorpay checkout result to Paygate; queue for admin on success."""
    try:
        body = _json_body(request)
        result = deposit_gateway.verify_checkout(
            request.auth.sub,
            transaction_id=int(body['transactionId']),
            byte_transaction_id=body.get('byteTransactionId'),
            razorpay_order_id=body.get('razorpay_order_id'),
            razorpay_payment_id=body.get('razorpay_payment_id'),
            razorpay_signature=body.get('razorpay_signature'),
        )
        return JsonResponse(result)
    except PaygateError as e:
        return JsonResponse({'error': str(e)}, status=e.status)
    except Transaction.DoesNotExist:
        return _error_response(ValueError('Deposit not found'), 404)
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as e:
        return _error_response(e)
    except Exception as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['user'])
@require_http_methods(['POST'])
def wallet_deposit_abandon(request):
    """Player dismissed the checkout widget before paying."""
    try:
        body = _json_body(request)
        return JsonResponse(
            deposit_gateway.abandon_checkout(
                request.auth.sub, int(body['transactionId'])
            )
        )
    except Transaction.DoesNotExist:
        return _error_response(ValueError('Deposit not found'), 404)
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as e:
        return _error_response(e)
    except Exception as e:
        return _error_response(e)


@require_auth(['user'])
@require_http_methods(['GET'])
def wallet_deposit_order(request, tx_id):
    """Status lookup used by the deposit result view; polls Paygate if needed."""
    try:
        return JsonResponse(deposit_gateway.get_checkout_status(request.auth.sub, tx_id))
    except PaygateError as e:
        return JsonResponse({'error': str(e)}, status=e.status)
    except Transaction.DoesNotExist:
        return _error_response(ValueError('Deposit not found'), 404)
    except Exception as e:
        return _error_response(e)


@csrf_exempt
@require_http_methods(['GET', 'POST'])
def wallet_deposit_paygate_callback(request):
    """Server-to-server Paygate callback (urlencoded or JSON). Always 200."""
    payload = {}
    if request.method == 'POST':
        content_type = request.content_type or ''
        if 'json' in content_type:
            try:
                payload = _json_body(request)
            except json.JSONDecodeError:
                payload = {}
        else:
            payload = request.POST
    order_id = (
        (payload.get('order_id') if payload else None)
        or request.GET.get('order_id')
        or request.GET.get('orderId')
    )
    status = (payload.get('status') if payload else None) or request.GET.get('status')
    utr = (payload.get('utr') if payload else None) or request.GET.get('utr')
    return JsonResponse(deposit_gateway.handle_callback(order_id, status, utr))


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
            request.auth.sub,
            float(body['amount']),
            body['paymentMethod'],
            body.get('destination'),
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
    """Active, promotable bonuses for the public promotions page. Keyless.

    Anyone can browse the catalogue; a signed-in player additionally gets
    their own claim state on each offer (conditions met or not, already
    claimed), which is what the Bonus page's Claim button is driven by.
    """
    auth = getattr(request, 'auth', None)
    user_id = auth.sub if auth and auth.role == 'user' else None
    try:
        return JsonResponse(bonus_services.list_public_bonuses(user_id), safe=False)
    except (OperationalError, ProgrammingError) as e:
        # A database that missed the bonuses claim-condition columns: tell the
        # operator what to run instead of a bare HTML 500.
        if is_missing_column_error(e):
            return schema_error_response(503, BONUSES_SCHEMA_MESSAGE)
        raise


@require_auth(['user'])
@require_http_methods(['GET'])
def my_bonuses(request):
    """The signed-in player's awarded bonuses + wagering progress."""
    try:
        return JsonResponse(bonus_services.list_user_bonuses(request.auth.sub), safe=False)
    except (OperationalError, ProgrammingError) as e:
        if is_missing_column_error(e):
            return schema_error_response(503, BONUSES_SCHEMA_MESSAGE)
        raise


@csrf_exempt
@require_auth(['user'])
@require_http_methods(['POST'])
def claim_promo(request):
    """Player redeems a coupon code for its bonus."""
    try:
        body = _json_body(request)
        return JsonResponse(bonus_services.claim_promo_code(request.auth.sub, body.get('code', '')))
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['user'])
@require_http_methods(['POST'])
def preview_promo(request):
    """Validate a coupon code without redeeming it (live check on the redeem form)."""
    try:
        body = _json_body(request)
        return JsonResponse(bonus_services.preview_coupon(request.auth.sub, body.get('code', '')))
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e)


@require_auth(['user'])
@require_http_methods(['GET'])
def my_referral(request):
    """The player's shareable referral code, their referrals, and who referred them.

    The list is what makes the code meaningful to the player: a bare count gave
    them no way to see whether a person they invited actually signed up.
    Usernames are masked — a referrer is entitled to see that a signup happened,
    not to read another player's account name in full.
    """
    code = bonus_services.ensure_referral_code(request.auth.sub)
    referred = (
        UserSetting.objects.filter(referred_by=request.auth.sub)
        .select_related('user')
        .order_by('-user__created_at')[:100]
    )
    referrals = [
        {
            'username': game_services._mask_username(r.user.username),
            'joined_at': r.user.created_at.isoformat() if r.user.created_at else None,
        }
        for r in referred
        if r.user_id
    ]
    mine = UserSetting.objects.filter(user_id=request.auth.sub).first()
    referrer = (
        User.objects.filter(id=mine.referred_by).first()
        if mine and mine.referred_by
        else None
    )
    return JsonResponse({
        'referral_code': code,
        'referred_count': len(referrals),
        'referrals': referrals,
        # Who invited this player, when they signed up with a code.
        'referred_by': game_services._mask_username(referrer.username) if referrer else None,
    })


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
def games_detail(request, slug):
    """One game by slug — what the play page resolves its URL against.

    404s on an unknown or hidden slug so the client can show "game not found"
    without having to download the whole catalog to decide.
    """
    game = services.get_game_by_slug(slug)
    if not game:
        return JsonResponse({'error': 'Game not found'}, status=404)
    return JsonResponse(game)


@require_http_methods(['GET'])
def games_categories(request):
    return JsonResponse(services.list_game_categories(), safe=False)


@require_http_methods(['GET'])
def games_trending(request):
    return JsonResponse(services.list_games(limit=12), safe=False)


@require_auth(['user'])
@require_http_methods(['GET'])
def deposit_methods(request):
    """Deposit methods plus the account details the player pays into."""
    try:
        return JsonResponse(services.list_deposit_methods(), safe=False)
    except (OperationalError, ProgrammingError) as e:
        # A database that missed the payment_methods column migration: tell the
        # operator what to run, and let the deposit page show "unavailable"
        # rather than an HTML 500.
        if is_missing_column_error(e):
            return schema_error_response(503)
        raise


# --- Banners (public home-page hero carousel) ---
@require_http_methods(['GET'])
def banners_list(request):
    """Active hero banners for this product's frontends. Keyless, like games."""
    return JsonResponse(services.list_active_banners(), safe=False)


@require_http_methods(['GET'])
def promotion_posters_list(request):
    """Active offer posters for /promotions. Keyless. Not bonus claims."""
    return JsonResponse(services.list_active_promotion_posters(), safe=False)


@require_http_methods(['GET'])
def faqs_list(request):
    """Active home-page FAQs for this product's frontends. Keyless, like banners."""
    return JsonResponse(services.list_active_faqs(), safe=False)


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
    except ValueError as e:
        # Request-body validation (LaunchRequest.parse) — a bad game identifier
        # is the caller's error, not a platform fault.
        return JsonResponse({'status_code': 'invalid_params', 'error': str(e)}, status=400)
    except Exception:
        # Anything the launch path did not anticipate (a vendor returning a
        # shape we don't parse, a transport library raising its own error type)
        # used to escape as a bare HTTP 500 "internal server error" on the
        # player's screen. Log the detail for operators and hand the client the
        # same structured error every other launch failure returns.
        logger.exception('Game launch failed for user %s', getattr(request.auth, 'sub', None))
        return JsonResponse(
            {
                'status_code': 'server_error',
                'error': 'This game is temporarily unavailable. Please try again.',
            },
            status=502,
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
def games_session_rounds(request, session_uid):
    """Round-by-round detail behind one bet-history row."""
    try:
        return JsonResponse(
            game_services.get_session_rounds(request.auth.sub, session_uid)
        )
    except GameError as e:
        return JsonResponse(
            {'status_code': e.code, 'error': str(e)},
            status=_GAME_ERROR_STATUS.get(e.code, 400),
        )


@require_auth(['user'])
@require_http_methods(['GET'])
def games_pnl(request):
    """Aggregate betting profit/loss for the current user."""
    return JsonResponse(game_services.get_user_pnl(request.auth.sub))


@require_http_methods(['GET'])
def games_big_wins(request):
    """Recent big wins across all players (masked names). Public."""
    limit = min(int(request.GET.get('limit', 12)), 50)
    min_win = request.GET.get('minWin')
    return JsonResponse(
        game_services.get_big_wins(limit, float(min_win) if min_win else None),
        safe=False,
    )


def _callback_reply(payload: dict, status: int = 200):
    """Return a callback ack and record the exact JSON that goes out."""
    response = JsonResponse(payload, status=status)
    game_logging.raw_callback_response(
        response.content.decode('utf-8'), code=payload.get('code'),
    )
    return response


@csrf_exempt
@require_http_methods(['POST'])
def games_callback(request):
    """Inbound aggregator bet/win callback. Public (auth is via AES payload)."""
    raw = request.body.decode('utf-8', errors='replace') if request.body else ''
    # First, before anything can reject it: a callback that fails to parse or
    # decrypt is exactly the one worth having verbatim in raw_games.log.
    game_logging.raw_callback(
        raw, ip=get_client_ip(request), path=request.get_full_path(),
        content_type=request.content_type,
    )
    try:
        envelope = json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        # The aggregator may post the encrypted payload as a raw form field.
        envelope = {'payload': request.POST.get('payload', raw)}
    try:
        ack = game_services.process_callback(envelope, raw_body=raw)
        return _callback_reply(ack)
    except GameError as e:
        # Provider-shaped error envelope (non-zero code) so the aggregator can
        # retry/alert without us leaking internals.
        return _callback_reply({'code': 1, 'msg': str(e), 'payload': ''})
    except Exception as e:
        game_logging.callback_error(f'{type(e).__name__}: {e}')
        return _callback_reply({'code': 1, 'msg': 'internal_error', 'payload': ''})


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
    ip = get_client_ip(request) or '127.0.0.1'
    return JsonResponse(detect_geo_from_ip(ip))


# --- Admin ---
@csrf_exempt
@require_http_methods(['POST'])
def admin_login(request):
    try:
        body = _json_body(request)
        result = services.login_admin(body['username'], body['password'])
        record_login(request, admin_id=result.get('adminId'))
        return JsonResponse(result)
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e, 401)
    except (OperationalError, ProgrammingError) as e:
        logger.exception('admin login failed')
        return JsonResponse(
            {'error': describe_database_error(e) or 'Sign-in could not be completed.'},
            status=500,
        )


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
def admin_dashboard_tables(request):
    return JsonResponse(admin_services.get_dashboard_tables())


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_recent_activity(request):
    return JsonResponse(admin_services.get_recent_activity(), safe=False)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_users(request):
    """Every player, or the subset matching the search box and filter panel.

    ``limit`` is optional. Omitting it returns the whole match set — the admin
    list used to hard-cap the response at 200, which hid older accounts from
    both the table and the on-page search.
    """
    raw_limit = (request.GET.get('limit') or '').strip()
    try:
        limit = int(raw_limit) if raw_limit else None
        offset = int(request.GET.get('offset', 0) or 0)
    except ValueError:
        return _error_response(ValueError('limit and offset must be integers'))
    return JsonResponse(
        services.list_users(
            request.GET.get('status'),
            limit,
            offset,
            search=request.GET.get('search'),
            user_id=request.GET.get('userId'),
            affiliate_id=request.GET.get('affiliateId'),
            username=request.GET.get('username'),
            full_name=request.GET.get('fullName'),
            phone=request.GET.get('phone'),
            ip=request.GET.get('ip'),
            date_from=request.GET.get('dateFrom'),
            date_to=request.GET.get('dateTo'),
        ),
        safe=False,
    )


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_user_create(request):
    try:
        body = _json_body(request)
        return JsonResponse(
            services.admin_create_user(
                full_name=body.get('full_name', ''),
                phone=body.get('phone', ''),
                password=body.get('password', ''),
                country_code=body.get('country_code', 'IN'),
                initial_balance=body.get('initial_balance', 0),
                state=body.get('state'),
                signup_ip=get_client_ip(request),
                created_by=getattr(request.auth, 'sub', None),
            ),
            status=201,
        )
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_user_detail(request, user_id):
    try:
        return JsonResponse(admin_services.get_user_full_detail(user_id))
    except User.DoesNotExist:
        return _error_response(ValueError('User not found'), 404)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_user_reset_password(request, user_id):
    try:
        body = _json_body(request)
        return JsonResponse(
            admin_services.reset_user_password(user_id, body.get('password', ''))
        )
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except User.DoesNotExist:
        return _error_response(ValueError('User not found'), 404)
    except ValueError as e:
        return _error_response(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_user_duplicates(request, user_id):
    try:
        return JsonResponse(admin_services.find_duplicate_accounts(user_id), safe=False)
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
                fraud_score=body.get('fraud_score'),
                username=body.get('username'),
                phone=body.get('phone'),
                full_name=body.get('full_name'),
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
def admin_transaction_by_reference(request, reference):
    tx = admin_services.get_transaction_by_reference(reference)
    if not tx:
        return _error_response(ValueError('No transaction found for this reference'), 404)
    return JsonResponse(tx)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_deposits_pending(request):
    """Deposit requests for one review tab (all/pending/approved/rejected).

    Defaults to pending so the original callers of this endpoint, which sent no
    tab, keep getting exactly what they got before.
    """
    tab = request.GET.get('tab') or 'pending'
    try:
        rows = admin_services.list_cashier_requests(
            Transaction.TxType.DEPOSIT, tab,
            limit=_query_limit(request),
            date_from=_parse_date(request.GET.get('dateFrom') or request.GET.get('from')),
            date_to=_parse_date(request.GET.get('dateTo') or request.GET.get('to')),
        )
    except ValueError as e:
        return _error_response(e)
    return JsonResponse(rows, safe=False)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_deposits_counts(request):
    return JsonResponse(
        admin_services.count_cashier_requests(
            Transaction.TxType.DEPOSIT,
            date_from=_parse_date(request.GET.get('dateFrom') or request.GET.get('from')),
            date_to=_parse_date(request.GET.get('dateTo') or request.GET.get('to')),
        )
    )


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
            _query_limit(request),
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


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_categories(request):
    return JsonResponse(admin_services.list_admin_categories(), safe=False)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_categories_create(request):
    try:
        return JsonResponse(admin_services.create_category(_json_body(request)), status=201)
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except Exception as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['PATCH', 'DELETE'])
def admin_categories_update(request, category_id):
    try:
        if request.method == 'DELETE':
            return JsonResponse(admin_services.delete_category(category_id))
        return JsonResponse(
            admin_services.update_category(category_id, _json_body(request))
        )
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
    try:
        return JsonResponse(admin_services.list_admin_bonuses(), safe=False)
    except (OperationalError, ProgrammingError) as e:
        if is_missing_column_error(e):
            return schema_error_response(503, BONUSES_SCHEMA_MESSAGE)
        raise


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
            body['userId'],
            request.auth.sub,
            amount=body.get('amount'),
            notes=body.get('notes', ''),
        ))
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except Exception as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_bonuses_providers(request, bonus_id):
    """Set the per-provider wagering multipliers for one bonus."""
    try:
        body = _json_body(request)
        return JsonResponse(admin_services.set_bonus_provider_multipliers(
            bonus_id, body.get('rules') or [],
        ))
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except Exception as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_bonuses_generate_code(request):
    """Mint an unused coupon code for the bonus form."""
    try:
        body = _json_body(request)
        return JsonResponse(admin_services.generate_coupon_code(
            body.get('length') or 8, body.get('prefix') or '',
        ))
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_coupon_redemptions(request):
    """Ledger of coupon-code redemptions — who used which code."""
    bonus_id = request.GET.get('bonusId')
    return JsonResponse(
        admin_services.list_coupon_redemptions(int(bonus_id) if bonus_id else None),
        safe=False,
    )


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


# --- Admin: promotion posters (/promotions page offer images) ---
@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_promotion_posters(request):
    return JsonResponse(admin_services.list_admin_promotion_posters(), safe=False)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_promotion_posters_create(request):
    try:
        return JsonResponse(admin_services.create_promotion_poster(_json_body(request)), status=201)
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except Exception as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['PATCH', 'DELETE'])
def admin_promotion_posters_update(request, poster_id):
    try:
        if request.method == 'DELETE':
            return JsonResponse(admin_services.delete_promotion_poster(poster_id))
        return JsonResponse(admin_services.update_promotion_poster(poster_id, _json_body(request)))
    except Exception as e:
        return _error_response(e)


# --- Admin: home-page FAQs ---
@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_faqs(request):
    return JsonResponse(admin_services.list_admin_faqs(), safe=False)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_faqs_create(request):
    try:
        return JsonResponse(admin_services.create_faq(_json_body(request)), status=201)
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except Exception as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['PATCH', 'DELETE'])
def admin_faqs_update(request, faq_id):
    try:
        if request.method == 'DELETE':
            return JsonResponse(admin_services.delete_faq(faq_id))
        return JsonResponse(admin_services.update_faq(faq_id, _json_body(request)))
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
            _query_limit(request),
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


# --- Admin: bet history ---
def _parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(value, '%Y-%m-%d').date()
    except ValueError:
        return None


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_bet_history(request):
    """Play sessions across all players — the admin bet-history view."""
    user_id = request.GET.get('userId')
    return JsonResponse(admin_services.list_bet_history(
        limit=int(request.GET.get('limit', 50)),
        offset=int(request.GET.get('offset', 0)),
        user_id=int(user_id) if user_id else None,
        status=request.GET.get('status'),
        game_uid=request.GET.get('gameUid'),
        date_from=_parse_date(request.GET.get('from')),
        date_to=_parse_date(request.GET.get('to')),
        search=request.GET.get('search'),
    ))


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_bet_history_rounds(request, session_uid):
    """Round-by-round drill-down for one session."""
    try:
        return JsonResponse(admin_services.get_bet_history_rounds(session_uid))
    except ValueError as e:
        return _error_response(e, 404)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_settle_stale_rounds(request):
    """Force-settle stakes a provider never reported a result for.

    The scheduled command does this automatically; this is the manual escape
    hatch when a vendor outage leaves bets stuck on Pending.
    """
    try:
        body = _json_body(request)
    except json.JSONDecodeError:
        body = {}
    hours = body.get('hours')
    return JsonResponse(
        game_services.settle_stale_pending_rounds(int(hours) if hours else None)
    )


# --- Admin: manage admin (staff accounts) ---
@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_staff(request):
    return JsonResponse(admin_services.list_admin_users_list(), safe=False)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_staff_create(request):
    try:
        return JsonResponse(
            admin_services.create_staff(_json_body(request)),
            status=201,
        )
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['PATCH', 'DELETE'])
def admin_staff_update(request, staff_id):
    try:
        if request.method == 'DELETE':
            return JsonResponse(admin_services.delete_staff(staff_id, request.auth.sub))
        return JsonResponse(admin_services.update_staff(
            staff_id, _json_body(request), request.auth.sub
        ))
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


# --- Admin: report export ---
@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_reports(request):
    """The report kinds available for export."""
    return JsonResponse(admin_services.list_report_kinds(), safe=False)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_report_export(request, kind):
    """One report as a download: XLSX (bold header row) unless ``format=csv``."""
    fmt = (request.GET.get('format') or 'xlsx').lower()
    date_from = _parse_date(request.GET.get('from'))
    date_to = _parse_date(request.GET.get('to'))
    member_id = (request.GET.get('memberId') or '').strip() or None
    try:
        header, rows = admin_services.build_report(
            kind, date_from, date_to, member_id=member_id,
        )
    except ValueError as e:
        return _error_response(e, 404)

    from core import data_export
    name = f'{kind}-{data_export.export_stamp()}'
    if fmt == 'csv':
        return _csv_response(name, header, rows)
    return _xlsx_response(name, [(kind, header, rows)])


# --- Admin: mobile app (APK) distribution ---
@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_app_download(request):
    return JsonResponse(services.get_app_download())


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['PUT'])
def admin_app_download_update(request):
    """Publish/replace the downloadable app build."""
    try:
        body = _json_body(request)
        config = {
            key: body.get(key, default)
            for key, default in services.APP_DOWNLOAD_DEFAULTS.items()
        }
        config['enabled'] = bool(config.get('enabled'))
        admin_services.update_platform_setting(services.APP_DOWNLOAD_KEY, config)
        return JsonResponse(services.get_app_download())
    except json.JSONDecodeError as e:
        return _error_response(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_social_links(request):
    return JsonResponse(services.get_social_links())


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['PUT'])
def admin_social_links_update(request):
    """Update player-facing social / support URLs."""
    try:
        body = _json_body(request)
        config = {}
        for key in services.SOCIAL_LINKS_DEFAULTS:
            raw = body.get(key, '')
            config[key] = raw.strip() if isinstance(raw, str) else ''
        admin_services.update_platform_setting(services.SOCIAL_LINKS_KEY, config)
        return JsonResponse(services.get_social_links())
    except json.JSONDecodeError as e:
        return _error_response(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_withdrawals_pending(request):
    """Withdrawal requests for one review tab (all/pending/approved/rejected).

    Defaults to pending, so callers that send no tab are unaffected.
    """
    tab = request.GET.get('tab') or 'pending'
    try:
        rows = admin_services.list_cashier_requests(
            Transaction.TxType.WITHDRAWAL, tab,
            limit=_query_limit(request),
            date_from=_parse_date(request.GET.get('dateFrom') or request.GET.get('from')),
            date_to=_parse_date(request.GET.get('dateTo') or request.GET.get('to')),
            # Admins read withdrawals latest-first, pending tab included.
            pending_oldest_first=False,
        )
    except ValueError as e:
        return _error_response(e)
    return JsonResponse(rows, safe=False)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_withdrawals_counts(request):
    return JsonResponse(
        admin_services.count_cashier_requests(
            Transaction.TxType.WITHDRAWAL,
            date_from=_parse_date(request.GET.get('dateFrom') or request.GET.get('from')),
            date_to=_parse_date(request.GET.get('dateTo') or request.GET.get('to')),
        )
    )


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


# --- Admin: whole-database export -------------------------------------------
# The Reports screen lists every table and pre-joined combination here, and can
# download any of them as CSV or XLSX, or the entire database as a ZIP of CSVs.

@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_data_catalog(request):
    """Every exportable table and combination, with row counts."""
    from core import data_export
    return JsonResponse({
        'tables': data_export.list_tables(),
        'combos': data_export.list_combos(),
    })


def _query_limit(request):
    """Optional ``?limit=``. A missing value means the list is not capped."""
    raw = (request.GET.get('limit') or '').strip()
    if not raw:
        return None
    return int(raw)


def _export_limit(request):
    raw = (request.GET.get('limit') or '').strip()
    if not raw:
        return None
    try:
        value = int(raw)
    except ValueError:
        return None
    return value if value > 0 else None


def _csv_response(filename, header, rows):
    from core import data_export
    response = StreamingHttpResponse(
        data_export.stream_csv(header, rows), content_type='text/csv',
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}.csv"'
    return response


def _xlsx_response(filename, sheets):
    from core import data_export
    payload = data_export.build_xlsx(sheets)
    response = HttpResponse(
        payload,
        content_type=(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ),
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}.xlsx"'
    return response


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_data_table_export(request, key):
    """One table as CSV or XLSX, foreign keys resolved to readable columns."""
    from core import data_export
    fmt = (request.GET.get('format') or 'csv').lower()
    limit = _export_limit(request)
    try:
        header, rows = data_export.build_table(key, limit=limit)
    except ValueError as e:
        return _error_response(e, 404)

    name = f'{key}-{data_export.export_stamp()}'
    if fmt == 'xlsx':
        return _xlsx_response(name, [(key.split('.')[-1], header, rows)])
    return _csv_response(name, header, rows)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_data_combo_export(request, key):
    """One pre-joined combination as CSV or XLSX."""
    from core import data_export
    fmt = (request.GET.get('format') or 'csv').lower()
    limit = _export_limit(request)
    try:
        header, rows = data_export.build_combo(key, limit=limit)
    except ValueError as e:
        return _error_response(e, 404)

    name = f'{key}-{data_export.export_stamp()}'
    if fmt == 'xlsx':
        return _xlsx_response(name, [(key, header, rows)])
    return _csv_response(name, header, rows)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_data_full_export(request):
    """The whole database: a ZIP of one CSV per table, or a single workbook.

    Built in memory rather than streamed — a ZIP central directory and an XLSX
    package are both written last, so neither can be produced incrementally.
    """
    from core import data_export
    fmt = (request.GET.get('format') or 'zip').lower()
    limit = _export_limit(request)
    # An explicit table list narrows the dump; otherwise take everything.
    requested = [k for k in (request.GET.get('tables') or '').split(',') if k.strip()]
    keys = requested or data_export.all_table_keys()
    stamp = data_export.export_stamp()

    if fmt == 'xlsx':
        sheets = []
        for key in keys:
            try:
                header, rows = data_export.build_table(key, limit=limit)
            except Exception:
                continue
            sheets.append((key.split('.')[-1], header, rows))
        return _xlsx_response(f'database-{stamp}', sheets)

    payload = data_export.build_zip(keys, limit=limit)
    response = HttpResponse(payload, content_type='application/zip')
    response['Content-Disposition'] = f'attachment; filename="database-{stamp}.zip"'
    return response
