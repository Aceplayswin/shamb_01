"""HTTP layer for the agent panel.

Thin adapters in the style of ``core/views.py`` and ``core/affiliate_views.py``:
read the request, call one service function, wrap the result. No business logic
lives here.

Decorator order matches the rest of the codebase — ``@csrf_exempt`` first, then
the auth guard, then the method whitelist. Only one guard appears below,
``@require_agent()``: unlike affiliates, agents have no signed server-to-server
contract, so there is no second authentication path to keep separate from this
one.
"""

from __future__ import annotations

import csv
import json
import logging
from datetime import datetime

from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from core import agent_services as svc
from core.agent_auth import require_agent

logger = logging.getLogger('agent')


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


def _filters(request) -> dict:
    """The filter bar every report screen shares, read straight off the query."""
    return {
        'from': request.GET.get('from'),
        'to': request.GET.get('to'),
        'sport': request.GET.get('sport'),
        'marketType': request.GET.get('marketType'),
        'event': request.GET.get('event'),
        'agentName': request.GET.get('agentName'),
        'status': request.GET.get('status'),
        'player': request.GET.get('player'),
        'type': request.GET.get('type'),
        'direction': request.GET.get('direction'),
        'side': request.GET.get('side'),
    }


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
# Public: authentication
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(['POST'])
def login(request):
    try:
        body = _json_body(request)
        return JsonResponse(svc.login(
            body.get('username', ''),
            body.get('password', ''),
            ip=svc.client_ip(request),
        ))
    except json.JSONDecodeError as e:
        return _error_response(e)
    except ValueError as e:
        return _error_response(e, status=401)


# ---------------------------------------------------------------------------
# Public: the agent programme (landing page + applications)
# ---------------------------------------------------------------------------

@require_http_methods(['GET'])
def program_overview(request):
    return JsonResponse(svc.get_program_overview())


@csrf_exempt
@require_http_methods(['POST'])
def apply(request):
    try:
        body = _json_body(request)
        return JsonResponse(svc.apply_as_agent(
            username=body.get('username'),
            password=body.get('password'),
            name=body.get('name'),
            email=body.get('email'),
            phone=body.get('phone'),
            company_name=body.get('companyName'),
            market_region=body.get('marketRegion'),
            expected_volume=body.get('expectedVolume'),
            experience=body.get('experience'),
            notes=body.get('notes'),
            parent_code=body.get('parentCode'),
            ip=svc.client_ip(request),
        ), status=201)
    except (ValueError, json.JSONDecodeError) as e:
        return _error_response(e)


@require_http_methods(['GET'])
def apply_status(request):
    return JsonResponse(svc.application_status(request.GET.get('email', '')))


# ---------------------------------------------------------------------------
# Panel: the review queue for applications addressed to this agent
# ---------------------------------------------------------------------------

@require_agent(allow_locked=True)
@require_http_methods(['GET'])
def applications(request):
    return JsonResponse(svc.list_applications(
        request.agent,
        status=request.GET.get('status'),
        page=_int_param(request, 'page', 0),
        per_page=_int_param(request, 'perPage', 25),
    ))


@csrf_exempt
@require_agent()
@require_http_methods(['POST'])
def application_approve(request, application_id):
    try:
        body = _json_body(request)
        return JsonResponse(svc.approve_application(
            request.agent, application_id,
            level=body.get('level'),
            partnership=body.get('partnership'),
            commission_rate=body.get('commissionRate'),
            credit=body.get('credit', 0),
            ip=svc.client_ip(request),
        ))
    except (ValueError, json.JSONDecodeError) as e:
        return _error_response(e)


@csrf_exempt
@require_agent(allow_locked=True)
@require_http_methods(['POST'])
def application_decide(request, application_id):
    try:
        body = _json_body(request)
        return JsonResponse(svc.decide_application(
            request.agent, application_id,
            decision=body.get('decision'),
            reason=body.get('reason'),
            ip=svc.client_ip(request),
        ))
    except (ValueError, json.JSONDecodeError) as e:
        return _error_response(e)


# ---------------------------------------------------------------------------
# Panel: identity
# ---------------------------------------------------------------------------

@require_agent(allow_locked=True)
@require_http_methods(['GET'])
def me(request):
    return JsonResponse(svc.get_identity(request.agent))


@csrf_exempt
@require_agent(allow_locked=True)
@require_http_methods(['POST'])
def change_password(request):
    try:
        body = _json_body(request)
        return JsonResponse(svc.change_password(
            request.agent,
            body.get('currentPassword', ''),
            body.get('newPassword', ''),
        ))
    except (ValueError, json.JSONDecodeError) as e:
        return _error_response(e)


# ---------------------------------------------------------------------------
# Panel: dashboard and sport analysis
# ---------------------------------------------------------------------------

@require_agent(allow_locked=True)
@require_http_methods(['GET'])
def dashboard(request):
    return JsonResponse(svc.get_dashboard(
        request.agent, request.GET.get('from'), request.GET.get('to')
    ))


@require_agent(allow_locked=True)
@require_http_methods(['GET'])
def sport_analysis(request):
    return JsonResponse(svc.get_sport_analysis(request.agent))


@require_agent(allow_locked=True)
@require_http_methods(['GET'])
def event_book(request, event_id):
    try:
        return JsonResponse(svc.get_event_book(request.agent, event_id))
    except ValueError as e:
        return _error_response(e, status=404)


# ---------------------------------------------------------------------------
# Panel: clients (downline agents)
# ---------------------------------------------------------------------------

@require_agent(allow_locked=True)
@require_http_methods(['GET'])
def clients(request):
    return JsonResponse(svc.list_clients(
        request.agent,
        search=request.GET.get('search'),
        status=request.GET.get('status'),
        page=_int_param(request, 'page', 0),
        per_page=_int_param(request, 'perPage', 25),
    ))


@csrf_exempt
@require_agent()
@require_http_methods(['POST'])
def clients_create(request):
    try:
        body = _json_body(request)
        return JsonResponse(svc.create_client(
            request.agent,
            username=body.get('username'),
            password=body.get('password'),
            name=body.get('name'),
            level=body.get('level'),
            partnership=body.get('partnership', 0),
            commission_rate=body.get('commissionRate', 0),
            credit=body.get('credit', 0),
            ip=svc.client_ip(request),
        ), status=201)
    except (ValueError, json.JSONDecodeError) as e:
        return _error_response(e)


@csrf_exempt
@require_agent(allow_locked=True)
@require_http_methods(['PATCH', 'POST'])
def client_detail(request, client_id):
    try:
        return JsonResponse(svc.update_client(
            request.agent, client_id, _json_body(request),
            ip=svc.client_ip(request),
        ))
    except (ValueError, json.JSONDecodeError) as e:
        return _error_response(e)


# ---------------------------------------------------------------------------
# Panel: players
# ---------------------------------------------------------------------------

@require_agent(allow_locked=True)
@require_http_methods(['GET'])
def players(request):
    return JsonResponse(svc.list_players(
        request.agent,
        player_id=request.GET.get('playerId') or None,
        username=request.GET.get('username') or None,
        page=_int_param(request, 'page', 0),
        per_page=_int_param(request, 'perPage', 25),
    ))


@csrf_exempt
@require_agent()
@require_http_methods(['POST'])
def players_create(request):
    try:
        body = _json_body(request)
        return JsonResponse(svc.create_player(
            request.agent,
            username=body.get('username'),
            password=body.get('password'),
            full_name=body.get('fullName'),
            phone=body.get('phone'),
            credit=body.get('credit', 0),
            ip=svc.client_ip(request),
        ), status=201)
    except (ValueError, json.JSONDecodeError) as e:
        return _error_response(e)


@csrf_exempt
@require_agent(allow_locked=True)
@require_http_methods(['PATCH', 'POST'])
def player_detail(request, user_id):
    try:
        return JsonResponse(svc.update_player(
            request.agent, user_id, _json_body(request),
            ip=svc.client_ip(request),
        ))
    except (ValueError, json.JSONDecodeError) as e:
        return _error_response(e)


# ---------------------------------------------------------------------------
# Panel: credit and settlement
# ---------------------------------------------------------------------------

@csrf_exempt
@require_agent()
@require_http_methods(['POST'])
def transfer(request):
    try:
        body = _json_body(request)
        return JsonResponse(svc.transfer_credit(
            request.agent,
            counterparty_type=body.get('counterpartyType'),
            counterparty_id=body.get('counterpartyId'),
            direction=body.get('direction'),
            amount=body.get('amount'),
            remark=body.get('remark'),
            ip=svc.client_ip(request),
        ), status=201)
    except (ValueError, json.JSONDecodeError) as e:
        return _error_response(e)


@csrf_exempt
@require_agent(allow_locked=True)
@require_http_methods(['POST'])
def settle(request):
    try:
        body = _json_body(request)
        return JsonResponse(svc.settle(
            request.agent,
            counterparty_type=body.get('counterpartyType'),
            counterparty_id=body.get('counterpartyId'),
            amount=body.get('amount'),
            note=body.get('note'),
            period_from=body.get('from'),
            period_to=body.get('to'),
            ip=svc.client_ip(request),
        ), status=201)
    except (ValueError, json.JSONDecodeError) as e:
        return _error_response(e)


# ---------------------------------------------------------------------------
# Panel: reports
#
# All eight report screens land on these two views. `kind` is validated against
# agent_services.REPORT_BUILDERS, so an unknown value is a 400 rather than an
# unbounded query.
# ---------------------------------------------------------------------------

@require_agent(allow_locked=True)
@require_http_methods(['GET'])
def report(request, kind):
    try:
        return JsonResponse(svc.build_report(
            request.agent, kind, _filters(request),
            page=_int_param(request, 'page', 0),
            per_page=_int_param(request, 'perPage', 50),
        ))
    except ValueError as e:
        return _error_response(e, status=404)


@require_agent(allow_locked=True)
@require_http_methods(['GET'])
def report_export(request, kind):
    try:
        rows = svc.report_csv_rows(request.agent, kind, _filters(request))
    except ValueError as e:
        return _error_response(e, status=404)
    return _csv_response(rows, f'agent-{kind}')
