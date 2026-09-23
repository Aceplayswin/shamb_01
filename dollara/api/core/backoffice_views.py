"""HTTP endpoints for the backoffice-parity console screens.

Every view is admin-only and thin: parse, delegate to a service, serialise.
Validation lives in the services so it holds regardless of caller.
"""

import csv
import json

from django.db.utils import OperationalError, ProgrammingError
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from core import backoffice_reports as reports, backoffice_services as bo
from core.middleware import require_auth
from core.schema_errors import is_missing_column_error, schema_error_response


def _body(request) -> dict:
    if not request.body:
        return {}
    return json.loads(request.body)


def _fail(exc: Exception, status: int = 400):
    return JsonResponse({'error': str(exc)}, status=status)


def _admin_id(request):
    """The staff account making the request, per the auth middleware."""
    return getattr(request.auth, 'sub', None)


def _audit(request, action, entity_type=None, entity_id=None):
    """Append to admin_audit_logs. Never lets a logging failure break a write."""
    try:
        from django.db import connection

        with connection.cursor() as cur:
            cur.execute(
                '''INSERT INTO admin_audit_logs
                       (admin_id, action, entity_type, entity_id, ip_address)
                   VALUES (%s, %s, %s, %s, %s)''',
                [
                    _admin_id(request), action, entity_type, entity_id,
                    request.META.get('REMOTE_ADDR'),
                ],
            )
    except Exception:  # pragma: no cover - auditing must never block the action
        pass


def _json(payload):
    return JsonResponse(payload, safe=not isinstance(payload, list))


# --------------------------------------------------------------------------
# Users
# --------------------------------------------------------------------------

@require_auth(['admin'])
@require_http_methods(['GET'])
def users_list(request):
    return _json(bo.list_users(request.GET))


@require_auth(['admin'])
@require_http_methods(['GET'])
def search_plays(request):
    return _json(bo.search_plays(request.GET))


@require_auth(['admin'])
@require_http_methods(['GET'])
def players_online(request):
    return _json(bo.players_online(request.GET))


# --------------------------------------------------------------------------
# Risk — blocked IPs and cards
# --------------------------------------------------------------------------

@require_auth(['admin'])
@require_http_methods(['GET'])
def blocked_ips(request):
    return _json(bo.list_blocked_ips(request.GET))


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def blocked_ips_create(request):
    try:
        body = _body(request)
        result = bo.create_blocked_ip(
            body.get('ip_address'), body.get('status', 'block'),
            body.get('comments'), _admin_id(request),
        )
        _audit(request, 'blocked_ip.create', 'blocked_ip', result['id'])
        return JsonResponse(result, status=201)
    except (ValueError, json.JSONDecodeError) as e:
        return _fail(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['PATCH', 'DELETE'])
def blocked_ips_update(request, rule_id):
    try:
        if request.method == 'DELETE':
            result = bo.delete_blocked_ip(rule_id)
            _audit(request, 'blocked_ip.delete', 'blocked_ip', rule_id)
            return _json(result)
        body = _body(request)
        result = bo.update_blocked_ip(
            rule_id, body.get('status'), body.get('comments')
        )
        _audit(request, 'blocked_ip.update', 'blocked_ip', rule_id)
        return _json(result)
    except (ValueError, json.JSONDecodeError) as e:
        return _fail(e)


# --------------------------------------------------------------------------
# Reports
#
# One dispatch view keeps 30-odd read-only report routes from becoming 30
# near-identical functions. `REPORTS` maps the URL slug to its aggregator.
# --------------------------------------------------------------------------

REPORTS = {
    # Finance
    'deposits': reports.deposits_report,
    'withdrawals': reports.withdrawals_report,
    'bonuses': reports.bonuses_report,
    'refunds': lambda p: reports.adjustments_report(p, 'refund'),
    'chargebacks': lambda p: reports.adjustments_report(p, 'chargeback'),
    'withdrawal-adjustments': lambda p: reports.adjustments_report(p, 'withdrawal'),
    'other-adjustments': lambda p: reports.adjustments_report(p, 'other'),
    'gross-profit': reports.gross_profit_report,
    'net-profit': reports.net_profit_report,
    'providers-expense': reports.providers_expense_report,
    'payment-methods': reports.payment_methods_report,
    # Management
    'active-players': reports.active_players_report,
    'attrition': reports.attrition_report,
    'aging': reports.aging_report,
    'monthly-da': lambda p: reports.da_report(p, 'month'),
    'daily-da': lambda p: reports.da_report(p, 'day'),
    'bonus-analysis': reports.bonus_analysis_report,
    'player-wise': reports.player_wise_report,
    # Players / countries / games
    'signups': reports.signups_report,
    'gender': reports.gender_report,
    'countries-signups': lambda p: reports.countries_report(p, 'signups'),
    'countries-profit': lambda p: reports.countries_report(p, 'profit'),
    'profitability': reports.profitability_report,
    'bets-done': reports.bets_done_report,
    'log-history': reports.log_history_report,
    'real-revenue': reports.real_revenue_report,
    'free-money-analysis': reports.free_money_analysis_report,
    'jackpot-contribution': reports.jackpot_contribution_report,
    'players-campaign': reports.players_campaign_report,
    'sports': reports.sports_report,
    # Downloadable
    'players-data': reports.players_data,
    'banned-players': reports.banned_players_data,
    'deposits-data': reports.deposits_data,
    'bonus-data': reports.bonus_data,
    'transaction-history': reports.transaction_history,
    'one-page': reports.one_page_report,
}


@require_auth(['admin'])
@require_http_methods(['GET'])
def report(request, slug):
    fn = REPORTS.get(slug)
    if not fn:
        return _fail(ValueError(f'Unknown report "{slug}"'), 404)
    try:
        return _json(fn(request.GET))
    except ValueError as e:
        return _fail(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def report_export(request, slug):
    """Download any row-shaped report: XLSX (bold header) unless ``format=csv``."""
    fn = REPORTS.get(slug)
    if not fn:
        return _fail(ValueError(f'Unknown report "{slug}"'), 404)
    try:
        # Export the full result set, not just the page the screen is showing.
        params = request.GET.copy()
        params['limit'] = str(bo.MAX_LIMIT)
        data = fn(params)
    except ValueError as e:
        return _fail(e)

    rows = data.get('rows') if isinstance(data, dict) else None
    if rows is None:
        return _fail(ValueError('This report has no exportable rows'), 400)

    from core import data_export

    header = list(rows[0].keys()) if rows else []
    cells = ([data_export.cell(v) for v in row.values()] for row in rows)
    name = f'{slug}-{data_export.export_stamp()}'

    if (request.GET.get('format') or 'xlsx').lower() == 'csv':
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{name}.csv"'
        writer = csv.writer(response)
        writer.writerow(header)
        writer.writerows(cells)
        return response

    response = HttpResponse(
        data_export.build_xlsx([(slug, header, cells)]),
        content_type=(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ),
    )
    response['Content-Disposition'] = f'attachment; filename="{name}.xlsx"'
    return response


# --------------------------------------------------------------------------
# Cashier system
# --------------------------------------------------------------------------

# The payment_methods columns are applied by SQL that deploy.sh never runs, so a
# database behind this build makes every read of the table raise "Unknown
# column". Turn that into an actionable JSON error instead of a bare HTML 500.
def _schema_or_raise(exc):
    if isinstance(exc, (OperationalError, ProgrammingError)) and is_missing_column_error(exc):
        return schema_error_response(500)
    raise exc


@require_auth(['admin'])
@require_http_methods(['GET'])
def payment_methods(request):
    try:
        return _json(reports.list_payment_methods(request.GET))
    except (OperationalError, ProgrammingError) as e:
        return _schema_or_raise(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def payment_methods_create(request):
    try:
        result = reports.save_payment_method(_body(request))
        _audit(request, 'payment_method.create', 'payment_method', result['id'])
        return JsonResponse(result, status=201)
    except (ValueError, json.JSONDecodeError) as e:
        return _fail(e)
    except (OperationalError, ProgrammingError) as e:
        return _schema_or_raise(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['PATCH'])
def payment_methods_update(request, method_id):
    try:
        result = reports.save_payment_method(_body(request), method_id)
        _audit(request, 'payment_method.update', 'payment_method', method_id)
        return _json(result)
    except (ValueError, json.JSONDecodeError) as e:
        return _fail(e)
    except (OperationalError, ProgrammingError) as e:
        return _schema_or_raise(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def payment_providers(request):
    return _json(reports.list_payment_providers(request.GET))


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def payment_providers_create(request):
    try:
        result = reports.save_payment_provider(_body(request))
        _audit(request, 'payment_provider.create', 'payment_provider', result['id'])
        return JsonResponse(result, status=201)
    except (ValueError, json.JSONDecodeError) as e:
        return _fail(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['PATCH'])
def payment_providers_update(request, provider_id):
    try:
        result = reports.save_payment_provider(_body(request), provider_id)
        _audit(request, 'payment_provider.update', 'payment_provider', provider_id)
        return _json(result)
    except (ValueError, json.JSONDecodeError) as e:
        return _fail(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def bin_rules(request):
    return _json(reports.list_bin_rules(request.GET))


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def bin_rules_create(request):
    try:
        result = reports.save_bin_rule(_body(request))
        _audit(request, 'bin_rule.create', 'payment_bin_rule', result['id'])
        return JsonResponse(result, status=201)
    except (ValueError, json.JSONDecodeError) as e:
        return _fail(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['PATCH'])
def bin_rules_update(request, rule_id):
    try:
        result = reports.save_bin_rule(_body(request), rule_id)
        _audit(request, 'bin_rule.update', 'payment_bin_rule', rule_id)
        return _json(result)
    except (ValueError, json.JSONDecodeError) as e:
        return _fail(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def frontend_rules(request):
    return _json(reports.list_frontend_rules(request.GET))


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def frontend_rules_create(request):
    try:
        result = reports.save_frontend_rule(_body(request))
        _audit(request, 'frontend_rule.create', 'payment_frontend_rule', result['id'])
        return JsonResponse(result, status=201)
    except (ValueError, json.JSONDecodeError) as e:
        return _fail(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['PATCH'])
def frontend_rules_update(request, rule_id):
    try:
        result = reports.save_frontend_rule(_body(request), rule_id)
        _audit(request, 'frontend_rule.update', 'payment_frontend_rule', rule_id)
        return _json(result)
    except (ValueError, json.JSONDecodeError) as e:
        return _fail(e)


@require_auth(['admin'])
@require_http_methods(['GET'])
def queue(request, queue_type):
    if queue_type not in ('decline', 'profile_upgrade'):
        return _fail(ValueError('Unknown queue'), 404)
    return _json(reports.list_queue(request.GET, queue_type))


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['PATCH'])
def queue_resolve(request, item_id):
    try:
        body = _body(request)
        result = reports.resolve_queue_item(
            item_id, body.get('status'), _admin_id(request), body.get('notes')
        )
        _audit(request, f'queue.{result["status"]}', 'cashier_queue_item', item_id)
        return _json(result)
    except (ValueError, json.JSONDecodeError) as e:
        return _fail(e)


# --------------------------------------------------------------------------
# Mailing
# --------------------------------------------------------------------------

@require_auth(['admin'])
@require_http_methods(['GET'])
def templates(request):
    return _json(reports.list_templates(request.GET))


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def templates_create(request):
    try:
        result = reports.save_template(_body(request), _admin_id(request))
        _audit(request, 'template.create', 'mail_template', result['id'])
        return JsonResponse(result, status=201)
    except (ValueError, json.JSONDecodeError) as e:
        return _fail(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['GET', 'PATCH', 'DELETE'])
def templates_detail(request, template_id):
    try:
        if request.method == 'GET':
            return _json(reports.get_template(template_id))
        if request.method == 'DELETE':
            result = reports.delete_template(template_id)
            _audit(request, 'template.delete', 'mail_template', template_id)
            return _json(result)
        result = reports.save_template(
            _body(request), _admin_id(request), template_id
        )
        _audit(request, 'template.update', 'mail_template', template_id)
        return _json(result)
    except (ValueError, json.JSONDecodeError) as e:
        return _fail(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['GET', 'PUT'])
def configuration(request, scope):
    try:
        if request.method == 'GET':
            return _json(reports.get_configuration(scope))
        result = reports.save_configuration(
            scope, _body(request), _admin_id(request)
        )
        _audit(request, 'configuration.update', 'mail_configuration', None)
        return _json(result)
    except (ValueError, json.JSONDecodeError) as e:
        return _fail(e)


# --------------------------------------------------------------------------
# Staff groups
# --------------------------------------------------------------------------

@require_auth(['admin'])
@require_http_methods(['GET'])
def staff_groups(request):
    return _json(reports.list_staff_groups(request.GET))


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def staff_groups_create(request):
    try:
        result = reports.save_staff_group(_body(request), _admin_id(request))
        _audit(request, 'staff_group.create', 'staff_group', result['id'])
        return JsonResponse(result, status=201)
    except (ValueError, json.JSONDecodeError) as e:
        return _fail(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['GET', 'PATCH', 'DELETE'])
def staff_groups_detail(request, group_id):
    try:
        if request.method == 'GET':
            return _json(reports.get_staff_group(group_id))
        if request.method == 'DELETE':
            result = reports.delete_staff_group(group_id)
            _audit(request, 'staff_group.delete', 'staff_group', group_id)
            return _json(result)
        result = reports.save_staff_group(
            _body(request), _admin_id(request), group_id
        )
        _audit(request, 'staff_group.update', 'staff_group', group_id)
        return _json(result)
    except (ValueError, json.JSONDecodeError) as e:
        return _fail(e)


# --------------------------------------------------------------------------
# Bonus — list, wizard sub-resources, eligibility check
# --------------------------------------------------------------------------

@require_auth(['admin'])
@require_http_methods(['GET'])
def bonuses(request):
    return _json(bo.list_bonuses(request.GET))


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['GET', 'PUT'])
def bonus_excluded_affiliates(request, bonus_id):
    try:
        if request.method == 'GET':
            return _json({'excluded': bo.get_bonus_excluded_affiliates(bonus_id)})
        result = bo.set_bonus_excluded_affiliates(
            bonus_id, _body(request).get('affiliate_ids', [])
        )
        _audit(request, 'bonus.excluded_affiliates', 'bonus', bonus_id)
        return _json(result)
    except (ValueError, json.JSONDecodeError) as e:
        return _fail(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['GET', 'POST'])
def bonus_translations(request, bonus_id):
    try:
        if request.method == 'GET':
            return _json({'translations': bo.get_bonus_translations(bonus_id)})
        result = bo.save_bonus_translation(bonus_id, _body(request))
        _audit(request, 'bonus.translation', 'bonus', bonus_id)
        return _json(result)
    except (ValueError, json.JSONDecodeError) as e:
        return _fail(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['DELETE'])
def bonus_translation_delete(request, bonus_id, language):
    try:
        result = bo.delete_bonus_translation(bonus_id, language)
        _audit(request, 'bonus.translation_delete', 'bonus', bonus_id)
        return _json(result)
    except ValueError as e:
        return _fail(e)


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['POST'])
def bonus_eligibility(request, bonus_id):
    """Exchange Bonus: check a player against the bonus before redeeming."""
    try:
        return _json(bo.bonus_eligibility(bonus_id, _body(request).get('username')))
    except (ValueError, json.JSONDecodeError) as e:
        return _fail(e)


# --------------------------------------------------------------------------
# Games / Sort by Web
# --------------------------------------------------------------------------

@require_auth(['admin'])
@require_http_methods(['GET'])
def game_order(request):
    return _json(bo.list_game_order(request.GET))


@csrf_exempt
@require_auth(['admin'])
@require_http_methods(['PUT'])
def game_order_save(request):
    try:
        result = bo.save_game_order(_body(request).get('game_ids', []))
        _audit(request, 'game_order.update', 'game', None)
        return _json(result)
    except (ValueError, json.JSONDecodeError) as e:
        return _fail(e)
