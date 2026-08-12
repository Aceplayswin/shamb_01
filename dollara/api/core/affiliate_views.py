"""HTTP layer for the affiliate program.

Thin adapters in the style of ``core/views.py``: read the request, call one
service function, wrap the result. No business logic lives here.

Decorator order matches the rest of the codebase — ``@csrf_exempt`` first, then
the auth guard, then the method whitelist. Three different guards appear below
and they are never mixed on one view:

* ``@require_affiliate()``          — a partner's own portal session (JWT);
* ``@require_auth(['admin'])``      — staff console;
* ``@require_signed_affiliate``     — a partner's server, signing with X-Aff-*.
"""

from __future__ import annotations

import csv
import json
import logging
from datetime import datetime

from django.http import (HttpResponseRedirect, JsonResponse,
                         StreamingHttpResponse)
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from core import affiliate_admin_services as admin_svc
from core import affiliate_services as svc
from core.affiliate_auth import require_affiliate, require_signed_affiliate
from core.geo import detect_geo_from_ip
from core.middleware import require_auth

logger = logging.getLogger('affiliate')


def _json_body(request) -> dict:
    if not request.body:
        return {}
    return json.loads(request.body)


def _error_response(exc: Exception, status: int = 400):
    return JsonResponse({'error': str(exc)}, status=status)


def _int_param(request, name, default):
    try:
        return int(request.GET.get(name, default))
    except (TypeError, ValueError):
        return default


class _CsvEcho:
    """File-like sink so csv.writer can stream rows straight to the response."""

    def write(self, value):
        return value


def _csv_response(rows, filename_stem: str):
    writer = csv.writer(_CsvEcho())

    def stream():
        for row in rows:
            yield writer.writerow(row)

    stamp = datetime.now().strftime('%Y%m%d-%H%M')
    response = StreamingHttpResponse(stream(), content_type='text/csv')
    response['Content-Disposition'] = (
        f'attachment; filename="{filename_stem}-{stamp}.csv"'
    )
    return response


# ---------------------------------------------------------------------------
# Public: program info, applications, authentication
# ---------------------------------------------------------------------------

@require_http_methods(['GET'])
def program_overview(request):
    return JsonResponse(svc.get_program_overview())


@csrf_exempt
@require_http_methods(['POST'])
def apply(request):
    try:
        body = _json_body(request)
        return JsonResponse(
            svc.apply_as_affiliate(
                full_name=body.get('fullName', ''),
                email=body.get('email', ''),
                password=body.get('password', ''),
                phone=body.get('phone'),
                company_name=body.get('companyName'),
                traffic_source=body.get('trafficSource'),
                expected_volume=body.get('expectedVolume'),
                payment_preference=body.get('paymentPreference'),
                notes=body.get('notes'),
                parent_affiliate_code=body.get('parentAffiliateCode'),
                override_rate=body.get('overrideRate'),
                ip=svc.client_ip(request),
            ),
            status=201,
        )
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e)


@require_http_methods(['GET'])
def apply_status(request):
    return JsonResponse(svc.application_status(request.GET.get('email', '')))


@csrf_exempt
@require_http_methods(['POST'])
def login(request):
    try:
        body = _json_body(request)
        return JsonResponse(
            svc.login(body['email'], body['password'], ip=svc.client_ip(request))
        )
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e, 401)


@csrf_exempt
@require_http_methods(['POST'])
def verify_two_factor(request):
    try:
        body = _json_body(request)
        return JsonResponse(
            svc.verify_two_factor(body['challengeToken'], body.get('code', ''),
                                  ip=svc.client_ip(request))
        )
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e, 401)


@csrf_exempt
@require_http_methods(['POST'])
def forgot_password(request):
    try:
        return JsonResponse(svc.request_password_reset(_json_body(request).get('email', '')))
    except json.JSONDecodeError as e:
        return _error_response(e)


@csrf_exempt
@require_http_methods(['POST'])
def reset_password(request):
    try:
        body = _json_body(request)
        return JsonResponse(svc.reset_password(body['challengeToken'], body['password']))
    except (KeyError, json.JSONDecodeError) as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e)


# ---------------------------------------------------------------------------
# Public: click tracking
# ---------------------------------------------------------------------------

@require_http_methods(['GET'])
def tracking_redirect(request, link_code):
    """Log a click and forward the visitor to the player site.

    Always redirects, whatever goes wrong. An unknown code, a disabled link or a
    database hiccup all end with the visitor on the site — losing attribution is
    recoverable, losing the visitor is not.
    """
    try:
        ip = svc.client_ip(request)
        country = None
        if ip:
            try:
                country = (detect_geo_from_ip(ip) or {}).get('country_code')
            except Exception:
                country = None
        result = svc.record_click(
            link_code,
            ip=ip,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            referrer=request.META.get('HTTP_REFERER', ''),
            country_code=country,
        )
        return HttpResponseRedirect(result['redirect_url'])
    except Exception:
        logger.exception('tracking redirect failed for %s', link_code)
        return HttpResponseRedirect(svc.web_base_url())


@require_http_methods(['GET'])
def track_resolve(request):
    """Confirm a hand-shared ``?ref=`` code and count the visit."""
    return JsonResponse(svc.resolve_ref(
        request.GET.get('ref', ''),
        request.GET.get('sub'),
        ip=svc.client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        referrer=request.META.get('HTTP_REFERER', ''),
    ))


# ---------------------------------------------------------------------------
# Affiliate portal: identity and dashboard
# ---------------------------------------------------------------------------

@require_affiliate(allow_pending=True)
@require_http_methods(['GET'])
def me(request):
    return JsonResponse(svc.serialize_affiliate(request.affiliate))


@require_affiliate()
@require_http_methods(['GET'])
def dashboard(request):
    return JsonResponse(svc.get_dashboard(
        request.affiliate, request.GET.get('from'), request.GET.get('to')
    ))


@require_affiliate()
@require_http_methods(['GET'])
def dashboard_chart(request):
    return JsonResponse(svc.get_dashboard_chart(
        request.affiliate, request.GET.get('from'), request.GET.get('to'),
        request.GET.get('metric', 'commission'),
    ))


@require_affiliate()
@require_http_methods(['GET'])
def activity(request):
    return JsonResponse(svc.get_activity(request.affiliate, _int_param(request, 'limit', 12)))


# ---------------------------------------------------------------------------
# Affiliate portal: links and creatives
# ---------------------------------------------------------------------------

@require_affiliate()
@require_http_methods(['GET'])
def links(request):
    return JsonResponse(svc.list_links(
        request.affiliate, q=request.GET.get('q'),
        limit=_int_param(request, 'limit', 50),
        offset=_int_param(request, 'offset', 0),
    ))


@csrf_exempt
@require_affiliate()
@require_http_methods(['POST'])
def links_create(request):
    try:
        body = _json_body(request)
        return JsonResponse(
            svc.create_link(
                request.affiliate,
                name=body.get('name', ''),
                sub_id=body.get('subId'),
                target_path=body.get('targetPath', '/'),
            ),
            status=201,
        )
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@csrf_exempt
@require_affiliate()
@require_http_methods(['PATCH', 'DELETE'])
def links_update(request, link_id):
    try:
        if request.method == 'DELETE':
            return JsonResponse(svc.delete_link(request.affiliate, link_id))
        return JsonResponse(svc.update_link(request.affiliate, link_id, _json_body(request)))
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@require_affiliate()
@require_http_methods(['GET'])
def landing_pages(request):
    return JsonResponse(svc.list_landing_pages())


@require_affiliate()
@require_http_methods(['GET'])
def creatives(request):
    return JsonResponse(svc.list_creatives(
        _int_param(request, 'limit', 100), _int_param(request, 'offset', 0)
    ))


# ---------------------------------------------------------------------------
# Affiliate portal: referrals and network
# ---------------------------------------------------------------------------

@require_affiliate()
@require_http_methods(['GET'])
def referrals(request):
    return JsonResponse(svc.list_referrals(
        request.affiliate,
        status=request.GET.get('status'),
        q=request.GET.get('q'),
        date_from=request.GET.get('from'),
        date_to=request.GET.get('to'),
        limit=_int_param(request, 'limit', 50),
        offset=_int_param(request, 'offset', 0),
    ))


@require_affiliate()
@require_http_methods(['GET'])
def referral_detail(request, referral_id):
    try:
        return JsonResponse(svc.get_referral_detail(request.affiliate, referral_id))
    except ValueError as e:
        return _error_response(e, 404)


@require_affiliate()
@require_http_methods(['GET'])
def network(request):
    return JsonResponse(svc.get_network(request.affiliate, q=request.GET.get('q')))


@csrf_exempt
@require_affiliate()
@require_http_methods(['POST'])
def network_invite(request):
    try:
        body = _json_body(request)
        return JsonResponse(svc.create_invite(request.affiliate, body.get('overrideRate')))
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


# ---------------------------------------------------------------------------
# Affiliate portal: earnings, payouts, reports
# ---------------------------------------------------------------------------

@require_affiliate()
@require_http_methods(['GET'])
def earnings(request):
    return JsonResponse(svc.list_earnings(
        request.affiliate,
        entry_type=request.GET.get('type'),
        status=request.GET.get('status'),
        date_from=request.GET.get('from'),
        date_to=request.GET.get('to'),
        q=request.GET.get('q'),
        limit=_int_param(request, 'limit', 50),
        offset=_int_param(request, 'offset', 0),
    ))


@require_affiliate()
@require_http_methods(['GET'])
def earnings_export(request):
    rows = svc.earnings_csv_rows(
        request.affiliate,
        date_from=request.GET.get('from'),
        date_to=request.GET.get('to'),
        entry_type=request.GET.get('type'),
        status=request.GET.get('status'),
    )
    return _csv_response(rows, f'statement-{request.affiliate.code}')


@require_affiliate()
@require_http_methods(['GET'])
def payouts(request):
    return JsonResponse(svc.get_payouts(
        request.affiliate,
        status=request.GET.get('status'),
        limit=_int_param(request, 'limit', 50),
        offset=_int_param(request, 'offset', 0),
    ))


@csrf_exempt
@require_affiliate()
@require_http_methods(['POST'])
def payouts_request(request):
    try:
        body = _json_body(request)
        return JsonResponse(
            svc.request_payout(request.affiliate, amount=body.get('amount'),
                               method_id=body.get('methodId')),
            status=201,
        )
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@csrf_exempt
@require_affiliate()
@require_http_methods(['GET', 'POST'])
def payout_methods(request):
    try:
        if request.method == 'GET':
            return JsonResponse(svc.list_payout_methods(request.affiliate))
        body = _json_body(request)
        return JsonResponse(
            svc.create_payout_method(
                request.affiliate,
                method_type=body.get('methodType', ''),
                details=body.get('details') or {},
                label=body.get('label'),
                is_primary=body.get('isPrimary', False),
            ),
            status=201,
        )
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@csrf_exempt
@require_affiliate()
@require_http_methods(['PATCH', 'DELETE'])
def payout_method_detail(request, method_id):
    try:
        if request.method == 'DELETE':
            return JsonResponse(svc.delete_payout_method(request.affiliate, method_id))
        return JsonResponse(
            svc.update_payout_method(request.affiliate, method_id, _json_body(request))
        )
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@require_affiliate()
@require_http_methods(['GET'])
def reports(request):
    return JsonResponse(svc.get_reports(
        request.affiliate,
        breakdown=request.GET.get('breakdown', 'link'),
        date_from=request.GET.get('from'),
        date_to=request.GET.get('to'),
    ))


@require_affiliate()
@require_http_methods(['GET'])
def reports_export(request):
    breakdown = request.GET.get('breakdown', 'link')
    rows = svc.reports_csv_rows(
        request.affiliate, breakdown=breakdown,
        date_from=request.GET.get('from'), date_to=request.GET.get('to'),
    )
    return _csv_response(rows, f'report-{breakdown}')


# ---------------------------------------------------------------------------
# Affiliate portal: profile, security, API keys
# ---------------------------------------------------------------------------

@csrf_exempt
@require_affiliate(allow_pending=True)
@require_http_methods(['GET', 'PUT'])
def profile(request):
    try:
        if request.method == 'GET':
            return JsonResponse(svc.get_profile(request.affiliate))
        return JsonResponse(svc.update_profile(request.affiliate, _json_body(request)))
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@csrf_exempt
@require_affiliate(allow_pending=True)
@require_http_methods(['POST'])
def profile_password(request):
    try:
        body = _json_body(request)
        return JsonResponse(svc.change_password(
            request.affiliate, body.get('currentPassword', ''),
            body.get('newPassword', ''),
        ))
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@csrf_exempt
@require_affiliate(allow_pending=True)
@require_http_methods(['POST'])
def two_factor_setup(request):
    try:
        return JsonResponse(svc.start_two_factor(request.affiliate))
    except ValueError as e:
        return _error_response(e)


@csrf_exempt
@require_affiliate(allow_pending=True)
@require_http_methods(['POST'])
def two_factor_enable(request):
    try:
        return JsonResponse(
            svc.enable_two_factor(request.affiliate, _json_body(request).get('code', ''))
        )
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@csrf_exempt
@require_affiliate(allow_pending=True)
@require_http_methods(['POST'])
def two_factor_disable(request):
    try:
        body = _json_body(request)
        return JsonResponse(svc.disable_two_factor(
            request.affiliate, body.get('password', ''), body.get('code', '')
        ))
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@csrf_exempt
@require_affiliate()
@require_http_methods(['GET', 'POST'])
def api_keys(request):
    try:
        if request.method == 'GET':
            return JsonResponse(svc.list_api_keys(request.affiliate))
        return JsonResponse(svc.create_api_key(request.affiliate), status=201)
    except ValueError as e:
        return _error_response(e)


@csrf_exempt
@require_affiliate()
@require_http_methods(['POST'])
def api_key_rotate(request, key_id):
    try:
        return JsonResponse(svc.rotate_api_key(request.affiliate, key_id))
    except ValueError as e:
        return _error_response(e)


@csrf_exempt
@require_affiliate()
@require_http_methods(['POST'])
def api_key_revoke(request, key_id):
    try:
        return JsonResponse(svc.revoke_api_key(request.affiliate, key_id))
    except ValueError as e:
        return _error_response(e)


@csrf_exempt
@require_affiliate()
@require_http_methods(['GET', 'PUT'])
def webhook_config(request):
    try:
        if request.method == 'GET':
            return JsonResponse(svc.get_webhook_config(request.affiliate))
        return JsonResponse(svc.set_webhook_config(
            request.affiliate, _json_body(request).get('webhookUrl', '')
        ))
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@require_affiliate()
@require_http_methods(['GET'])
def api_logs(request):
    return JsonResponse(svc.list_api_logs(
        request.affiliate, _int_param(request, 'limit', 25),
        _int_param(request, 'offset', 0),
    ))


# ---------------------------------------------------------------------------
# Affiliate portal: notifications and support
# ---------------------------------------------------------------------------

@require_affiliate(allow_pending=True)
@require_http_methods(['GET'])
def notifications(request):
    return JsonResponse(svc.list_notifications(
        request.affiliate,
        unread_only=request.GET.get('unreadOnly') in ('1', 'true', 'True'),
        limit=_int_param(request, 'limit', 50),
        offset=_int_param(request, 'offset', 0),
    ))


@csrf_exempt
@require_affiliate(allow_pending=True)
@require_http_methods(['POST'])
def notification_read(request, notification_id):
    try:
        body = _json_body(request)
        return JsonResponse(svc.mark_notification(
            request.affiliate, notification_id, body.get('isRead', True)
        ))
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@csrf_exempt
@require_affiliate(allow_pending=True)
@require_http_methods(['POST'])
def notifications_read_all(request):
    return JsonResponse(svc.mark_all_notifications_read(request.affiliate))


@csrf_exempt
@require_affiliate(allow_pending=True)
@require_http_methods(['DELETE'])
def notifications_clear(request):
    return JsonResponse(svc.clear_notifications(request.affiliate))


@csrf_exempt
@require_affiliate(allow_pending=True)
@require_http_methods(['GET', 'POST'])
def tickets(request):
    try:
        if request.method == 'GET':
            return JsonResponse(svc.list_tickets(
                request.affiliate, status=request.GET.get('status'),
                limit=_int_param(request, 'limit', 50),
                offset=_int_param(request, 'offset', 0),
            ))
        body = _json_body(request)
        return JsonResponse(
            svc.create_ticket(
                request.affiliate,
                subject=body.get('subject', ''),
                message=body.get('message', ''),
                category=body.get('category', 'other'),
                priority=body.get('priority', 'normal'),
            ),
            status=201,
        )
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@require_affiliate(allow_pending=True)
@require_http_methods(['GET'])
def ticket_detail(request, ticket_id):
    try:
        return JsonResponse(svc.get_ticket(request.affiliate, ticket_id))
    except ValueError as e:
        return _error_response(e, 404)


@csrf_exempt
@require_affiliate(allow_pending=True)
@require_http_methods(['POST'])
def ticket_message(request, ticket_id):
    try:
        return JsonResponse(
            svc.add_ticket_message(request.affiliate, ticket_id,
                                   _json_body(request).get('message', '')),
            status=201,
        )
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


# ---------------------------------------------------------------------------
# Affiliate portal: onboarding
#
# These use allow_pending=True — they are exactly the endpoints an affiliate who
# has not finished onboarding needs to reach.
# ---------------------------------------------------------------------------

@require_affiliate(allow_pending=True)
@require_http_methods(['GET'])
def onboarding(request):
    return JsonResponse(svc.get_onboarding(request.affiliate))


@csrf_exempt
@require_affiliate(allow_pending=True)
@require_http_methods(['POST'])
def onboarding_terms(request):
    return JsonResponse(svc.accept_terms(request.affiliate, ip=svc.client_ip(request)))


@csrf_exempt
@require_affiliate(allow_pending=True)
@require_http_methods(['POST'])
def onboarding_payout(request):
    try:
        body = _json_body(request)
        return JsonResponse(
            svc.create_payout_method(
                request.affiliate,
                method_type=body.get('methodType', ''),
                details=body.get('details') or {},
                label=body.get('label'),
                is_primary=True,
            ),
            status=201,
        )
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@csrf_exempt
@require_affiliate(allow_pending=True)
@require_http_methods(['POST'])
def onboarding_kyc(request):
    """Accept a KYC document upload (multipart)."""
    from core.admin_services import upload_admin_image

    file = request.FILES.get('file')
    if not file:
        return _error_response(ValueError('Attach a document to upload.'))
    try:
        url = upload_admin_image(file)
        return JsonResponse(
            svc.upload_kyc_document(
                request.affiliate,
                document_type=request.POST.get('documentType', 'id_proof'),
                file_url=request.build_absolute_uri(url),
                original_name=file.name,
            ),
            status=201,
        )
    except ValueError as e:
        return _error_response(e)


@csrf_exempt
@require_affiliate(allow_pending=True)
@require_http_methods(['POST'])
def onboarding_complete(request):
    try:
        return JsonResponse(svc.complete_onboarding(request.affiliate))
    except ValueError as e:
        return _error_response(e)


# ---------------------------------------------------------------------------
# Admin console
# ---------------------------------------------------------------------------

@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_applications(request):
    return JsonResponse(admin_svc.list_applications(
        status=request.GET.get('status'),
        limit=_int_param(request, 'limit', 50),
        offset=_int_param(request, 'offset', 0),
    ))


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_application_approve(request, affiliate_id):
    try:
        return JsonResponse(admin_svc.approve_application(
            affiliate_id, request.auth.sub, _json_body(request)
        ))
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_application_reject(request, affiliate_id):
    try:
        return JsonResponse(admin_svc.reject_application(
            affiliate_id, request.auth.sub, _json_body(request).get('reason', '')
        ))
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_application_request_info(request, affiliate_id):
    try:
        return JsonResponse(admin_svc.request_application_info(
            affiliate_id, request.auth.sub, _json_body(request).get('message', '')
        ))
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_affiliates(request):
    return JsonResponse(admin_svc.list_affiliates(
        status=request.GET.get('status'),
        tier=request.GET.get('tier'),
        commission_type=request.GET.get('commissionType'),
        q=request.GET.get('q'),
        limit=_int_param(request, 'limit', 100),
        offset=_int_param(request, 'offset', 0),
    ))


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['GET', 'PATCH', 'DELETE'])
def admin_affiliate_detail(request, affiliate_id):
    try:
        if request.method == 'PATCH':
            return JsonResponse(admin_svc.update_affiliate(
                affiliate_id, request.auth.sub, _json_body(request)
            ))
        if request.method == 'DELETE':
            return JsonResponse(admin_svc.delete_affiliate(affiliate_id, request.auth.sub))
        return JsonResponse(admin_svc.get_affiliate_detail(affiliate_id))
    except json.JSONDecodeError as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e, 404 if request.method == 'GET' else 400)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_affiliate_status(request, affiliate_id):
    try:
        return JsonResponse(admin_svc.set_affiliate_status(
            affiliate_id, request.auth.sub, _json_body(request).get('status', '')
        ))
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_affiliate_kyc_review(request, affiliate_id, doc_id):
    try:
        body = _json_body(request)
        return JsonResponse(admin_svc.review_kyc_document(
            affiliate_id, doc_id, request.auth.sub,
            status=body.get('status', ''), reason=body.get('reason'),
        ))
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_affiliate_key_revoke(request, affiliate_id, key_id):
    try:
        return JsonResponse(admin_svc.revoke_affiliate_key(
            affiliate_id, key_id, request.auth.sub
        ))
    except ValueError as e:
        return _error_response(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_payouts(request):
    return JsonResponse(admin_svc.list_payout_requests(
        status=request.GET.get('status'),
        limit=_int_param(request, 'limit', 50),
        offset=_int_param(request, 'offset', 0),
    ))


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_payout_approve(request, payout_id):
    try:
        return JsonResponse(admin_svc.approve_payout(payout_id, request.auth.sub))
    except ValueError as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_payout_pay(request, payout_id):
    try:
        return JsonResponse(admin_svc.mark_payout_paid(
            payout_id, request.auth.sub, _json_body(request).get('reference', '')
        ))
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_payout_reject(request, payout_id):
    try:
        return JsonResponse(admin_svc.reject_payout(
            payout_id, request.auth.sub, _json_body(request).get('reason', '')
        ))
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_payouts_bulk(request):
    try:
        body = _json_body(request)
        return JsonResponse(admin_svc.bulk_payout_action(
            body.get('ids') or [], request.auth.sub, body.get('action', ''),
            reference=body.get('reference'), reason=body.get('reason'),
        ))
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_ledger_approve(request, entry_id):
    try:
        return JsonResponse(admin_svc.approve_ledger_entry(entry_id, request.auth.sub))
    except ValueError as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_ledger_clawback(request, entry_id):
    try:
        return JsonResponse(admin_svc.clawback_ledger_entry(
            entry_id, request.auth.sub, _json_body(request).get('reason', '')
        ))
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['GET', 'PUT'])
def admin_settings(request):
    try:
        if request.method == 'GET':
            return JsonResponse(admin_svc.get_settings())
        return JsonResponse(admin_svc.update_settings(_json_body(request), request.auth.sub))
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_fraud_flags(request):
    return JsonResponse(admin_svc.list_fraud_flags(
        status=request.GET.get('status'),
        risk_level=request.GET.get('riskLevel'),
        limit=_int_param(request, 'limit', 100),
        offset=_int_param(request, 'offset', 0),
    ))


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_fraud_flag_resolve(request, flag_id):
    try:
        body = _json_body(request)
        return JsonResponse(admin_svc.resolve_fraud_flag(
            flag_id, request.auth.sub, status=body.get('status', ''),
            note=body.get('note'),
        ))
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_audit(request):
    return JsonResponse(admin_svc.list_audit_log(
        affiliate_id=request.GET.get('affiliateId'),
        date_from=request.GET.get('from'),
        date_to=request.GET.get('to'),
        limit=_int_param(request, 'limit', 100),
        offset=_int_param(request, 'offset', 0),
    ))


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def admin_commissions_run(request):
    """The console's "Run commissions now" button.

    Same entry point as the nightly command, so the two cannot diverge.
    """
    try:
        body = _json_body(request)
        return JsonResponse(admin_svc.trigger_commission_run(
            request.auth.sub, date_from=body.get('from'), date_to=body.get('to'),
            dry_run=body.get('dryRun', False),
        ))
    except (json.JSONDecodeError, ValueError) as e:
        return _error_response(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def admin_commission_runs(request):
    return JsonResponse(admin_svc.list_commission_runs(
        _int_param(request, 'limit', 25), _int_param(request, 'offset', 0)
    ))


# ---------------------------------------------------------------------------
# Signed partner API (X-Aff-*)
#
# Separate views with their own decorator. The X-Aff-* parser is never shared
# with the X-SA-* Super Admin path, so an affiliate key cannot be presented on a
# Super Admin route or the reverse — enforced structurally rather than by a flag.
# ---------------------------------------------------------------------------

@csrf_exempt
@require_signed_affiliate
@require_http_methods(['POST'])
def webhook_postback(request):
    """A partner's server reporting an event to us.

    Currently accepts offline conversions: a click their own system recorded
    that should count toward attribution.
    """
    try:
        body = _json_body(request)
    except json.JSONDecodeError as e:
        return _error_response(e)

    event = body.get('event', 'click')
    if event == 'click':
        result = svc.resolve_ref(
            body.get('ref') or request.affiliate.code,
            body.get('sub'),
            ip=svc.client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            referrer=body.get('referrer'),
        )
        return JsonResponse({'accepted': True, 'event': event,
                             'click_id': result.get('click_id')}, status=201)

    logger.info('affiliate %s posted unsupported event %s',
                request.affiliate.id, event)
    return JsonResponse({'accepted': False, 'error': f'Unsupported event: {event}'},
                        status=400)


@require_signed_affiliate
@require_http_methods(['GET'])
def data_pull(request, resource):
    """Programmatic read access, mirroring the Super Admin resource-pull shape."""
    affiliate = request.affiliate
    if resource == 'summary':
        return JsonResponse(svc.get_dashboard(
            affiliate, request.GET.get('from'), request.GET.get('to')
        ))
    if resource == 'referrals':
        return JsonResponse(svc.list_referrals(
            affiliate, limit=_int_param(request, 'limit', 100),
            offset=_int_param(request, 'offset', 0),
        ))
    if resource == 'commission':
        return JsonResponse(svc.list_earnings(
            affiliate, limit=_int_param(request, 'limit', 100),
            offset=_int_param(request, 'offset', 0),
        ))
    if resource == 'payouts':
        return JsonResponse(svc.get_payouts(
            affiliate, limit=_int_param(request, 'limit', 100),
            offset=_int_param(request, 'offset', 0),
        ))
    if resource == 'links':
        return JsonResponse(svc.list_links(
            affiliate, limit=_int_param(request, 'limit', 100),
            offset=_int_param(request, 'offset', 0),
        ))
    return _error_response(ValueError(f'Unknown resource: {resource}'), 404)
