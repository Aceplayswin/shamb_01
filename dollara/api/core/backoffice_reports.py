"""Cashier, mailing and staff-group services for the backoffice console."""

from django.db.models import Count
from django.utils import timezone

from core.models import User
from core.backoffice_models import (
    CashierQueueItem,
    MailConfiguration,
    MailTemplate,
    PaymentBinRule,
    PaymentFrontendRule,
    PaymentMethod,
    PaymentProvider,
    StaffGroup,
    StaffGroupPermission,
)
from core.backoffice_services import (
    _f,
    _int,
    apply_date_range,
    page_result,
    paging,
    player_label,
)


# --------------------------------------------------------------------------
# Cashier system
# --------------------------------------------------------------------------

# Which destination fields each method type uses. The admin form shows only
# these for the chosen type and the deposit page renders only these, so the
# server stores the rest as NULL: switching a method from bank to UPI must not
# leave a stale account number that the player would then be told to pay into.
# `required` is enforced only for deposit-capable methods — a withdrawal-only
# method has nothing for the player to pay into.
DESTINATION_FIELDS = {
    'upi': {'required': ('upi_id',), 'optional': ('qr_image_url', 'account_name')},
    'bank': {
        'required': ('account_name', 'account_number', 'ifsc_code'),
        'optional': ('bank_name', 'branch_name'),
    },
    'crypto': {'required': ('wallet_address',), 'optional': ('crypto_network', 'qr_image_url')},
    'wallet': {'required': ('account_number',), 'optional': ('account_name', 'qr_image_url')},
    'card': {'required': (), 'optional': ()},
    'other': {'required': (), 'optional': ()},
}
ALL_DESTINATION_FIELDS = (
    'account_name', 'account_number', 'ifsc_code', 'bank_name', 'branch_name',
    'upi_id', 'qr_image_url', 'crypto_network', 'wallet_address',
)
# Labels for validation messages, so the admin is told which box to fill.
_DESTINATION_LABELS = {
    'upi_id': 'UPI ID',
    'account_name': 'account holder name',
    'account_number': 'account number',
    'ifsc_code': 'IFSC code',
    'wallet_address': 'wallet address',
}
_TYPE_LABELS = {
    'upi': 'UPI', 'bank': 'bank', 'crypto': 'crypto', 'wallet': 'e-wallet',
    'card': 'card', 'other': 'other',
}


def _serialize_payment_method(m):
    return {
        'id': m.id,
        'name': m.name,
        'code': m.code,
        'method_type': m.method_type,
        'logo_url': m.logo_url,
        'supports_deposit': m.supports_deposit,
        'supports_withdrawal': m.supports_withdrawal,
        'min_amount': _f(m.min_amount),
        'max_amount': _f(m.max_amount) if m.max_amount is not None else None,
        'currencies': m.currencies,
        'countries': m.countries,
        # Deposit destination shown to the player (only the fields for the
        # method's type are ever populated — see DESTINATION_FIELDS).
        'account_name': m.account_name,
        'account_number': m.account_number,
        'ifsc_code': m.ifsc_code,
        'bank_name': m.bank_name,
        'branch_name': m.branch_name,
        'upi_id': m.upi_id,
        'qr_image_url': m.qr_image_url,
        'crypto_network': m.crypto_network,
        'wallet_address': m.wallet_address,
        'instructions': m.instructions,
        'is_active': m.is_active,
        'sort_order': m.sort_order,
    }


def list_payment_methods(params):
    qs = PaymentMethod.objects.all()
    if name := (params.get('name') or '').strip():
        qs = qs.filter(name__icontains=name)
    if (active := params.get('isActive')) not in (None, ''):
        qs = qs.filter(is_active=str(active).lower() in ('1', 'true', 'yes'))
    limit, offset = paging(params)
    return page_result(
        qs.order_by('sort_order', 'name'), limit, offset, _serialize_payment_method
    )


def _destination_fields(payload, method_type, supports_deposit):
    """Validate and normalise the destination for `method_type`.

    Returns every field in ALL_DESTINATION_FIELDS, with the ones that do not
    belong to this type forced to None.
    """
    rules = DESTINATION_FIELDS.get(method_type)
    if rules is None:
        raise ValueError(
            'Unknown payment method type; expected one of '
            + ', '.join(DESTINATION_FIELDS)
        )
    allowed = set(rules['required']) | set(rules['optional'])
    cleaned = {
        key: ((payload.get(key) or '').strip() or None) if key in allowed else None
        for key in ALL_DESTINATION_FIELDS
    }

    if supports_deposit:
        missing = [
            _DESTINATION_LABELS.get(key, key.replace('_', ' '))
            for key in rules['required'] if not cleaned.get(key)
        ]
        if missing:
            what = ', '.join(missing)
            kind = _TYPE_LABELS.get(method_type, method_type)
            article = 'an' if kind[0] in 'aeiou' else 'a'
            raise ValueError(
                f'{what[0].upper()}{what[1:]} {"is" if len(missing) == 1 else "are"} '
                f'required for {article} {kind} method that accepts deposits'
            )
        if method_type == 'upi' and '@' not in cleaned['upi_id']:
            raise ValueError('Enter a valid UPI ID (for example name@bank)')
    return cleaned


def save_payment_method(payload, method_id=None):
    name = (payload.get('name') or '').strip()
    code = (payload.get('code') or '').strip()
    if not name:
        raise ValueError('Name is required')
    if not code:
        raise ValueError('Code is required')

    clash = PaymentMethod.objects.filter(code=code)
    if method_id:
        clash = clash.exclude(id=method_id)
    if clash.exists():
        raise ValueError(f'Code "{code}" is already in use')

    method_type = (payload.get('method_type') or 'other').strip().lower()
    supports_deposit = bool(payload.get('supports_deposit', True))
    fields = {
        'name': name,
        'code': code,
        'method_type': method_type,
        'logo_url': (payload.get('logo_url') or '').strip() or None,
        'supports_deposit': supports_deposit,
        'supports_withdrawal': bool(payload.get('supports_withdrawal', False)),
        'min_amount': payload.get('min_amount') or 0,
        'max_amount': payload.get('max_amount') or None,
        'currencies': (payload.get('currencies') or '').strip() or None,
        'countries': (payload.get('countries') or '').strip() or None,
        # The account the player transfers to for a manual deposit.
        **_destination_fields(payload, method_type, supports_deposit),
        'instructions': (payload.get('instructions') or '').strip() or None,
        'is_active': bool(payload.get('is_active', True)),
        'sort_order': _int(payload.get('sort_order'), 0) or 0,
    }
    if method_id:
        updated = PaymentMethod.objects.filter(id=method_id).update(**fields)
        if not updated:
            raise ValueError('Payment method not found')
        return {'id': method_id}
    return {'id': PaymentMethod.objects.create(**fields).id}


def list_payment_providers(params):
    qs = PaymentProvider.objects.all()
    if name := (params.get('name') or '').strip():
        qs = qs.filter(name__icontains=name)
    limit, offset = paging(params)
    return page_result(qs.order_by('name'), limit, offset, lambda p: {
        'id': p.id,
        'name': p.name,
        'code': p.code,
        'api_endpoint': p.api_endpoint,
        'supports_deposit': p.supports_deposit,
        'supports_withdrawal': p.supports_withdrawal,
        'deposit_countries': p.deposit_countries,
        'withdrawal_countries': p.withdrawal_countries,
        'currencies': p.currencies,
        'is_active': p.is_active,
        'created_at': p.created_at,
    })


def save_payment_provider(payload, provider_id=None):
    name = (payload.get('name') or '').strip()
    code = (payload.get('code') or '').strip()
    if not name:
        raise ValueError('Name is required')
    if not code:
        raise ValueError('Code is required')

    clash = PaymentProvider.objects.filter(code=code)
    if provider_id:
        clash = clash.exclude(id=provider_id)
    if clash.exists():
        raise ValueError(f'Code "{code}" is already in use')

    fields = {
        'name': name,
        'code': code,
        'api_endpoint': (payload.get('api_endpoint') or '').strip() or None,
        'credentials': payload.get('credentials') or None,
        'supports_deposit': bool(payload.get('supports_deposit', True)),
        'supports_withdrawal': bool(payload.get('supports_withdrawal', False)),
        'deposit_countries': (payload.get('deposit_countries') or '').strip() or None,
        'withdrawal_countries': (payload.get('withdrawal_countries') or '').strip() or None,
        'currencies': (payload.get('currencies') or '').strip() or None,
        'is_active': bool(payload.get('is_active', True)),
    }
    if provider_id:
        updated = PaymentProvider.objects.filter(id=provider_id).update(**fields)
        if not updated:
            raise ValueError('Payment provider not found')
        return {'id': provider_id}
    return {'id': PaymentProvider.objects.create(**fields).id}


def list_bin_rules(params):
    qs = PaymentBinRule.objects.select_related('provider').all()
    if bin_prefix := (params.get('bin') or '').strip():
        qs = qs.filter(bin_from__startswith=bin_prefix)
    limit, offset = paging(params)
    return page_result(qs.order_by('-priority', 'bin_from'), limit, offset, lambda r: {
        'id': r.id,
        'provider': r.provider.name if r.provider else None,
        'provider_id': r.provider_id,
        'bin_from': r.bin_from,
        'bin_to': r.bin_to,
        'card_brand': r.card_brand,
        'country_code': r.country_code,
        'action': r.action,
        'priority': r.priority,
        'is_active': r.is_active,
    })


def save_bin_rule(payload, rule_id=None):
    bin_from = (payload.get('bin_from') or '').strip()
    if not bin_from or not bin_from.isdigit():
        raise ValueError('BIN from must be numeric')
    bin_to = (payload.get('bin_to') or '').strip() or None
    if bin_to and not bin_to.isdigit():
        raise ValueError('BIN to must be numeric')
    if bin_to and bin_to < bin_from:
        raise ValueError('BIN to must not be lower than BIN from')

    fields = {
        'provider_id': _int(payload.get('provider_id')),
        'bin_from': bin_from,
        'bin_to': bin_to,
        'card_brand': (payload.get('card_brand') or '').strip() or None,
        'country_code': (payload.get('country_code') or '').strip() or None,
        'action': (payload.get('action') or 'allow').strip(),
        'priority': _int(payload.get('priority'), 0) or 0,
        'is_active': bool(payload.get('is_active', True)),
    }
    if rule_id:
        updated = PaymentBinRule.objects.filter(id=rule_id).update(**fields)
        if not updated:
            raise ValueError('BIN rule not found')
        return {'id': rule_id}
    return {'id': PaymentBinRule.objects.create(**fields).id}


def list_frontend_rules(params):
    qs = PaymentFrontendRule.objects.select_related('method').all()
    limit, offset = paging(params)
    return page_result(qs.order_by('display_order'), limit, offset, lambda r: {
        'id': r.id,
        'method': r.method.name if r.method else None,
        'method_id': r.method_id,
        'country_code': r.country_code,
        'currency': r.currency,
        'min_amount': _f(r.min_amount),
        'max_amount': _f(r.max_amount) if r.max_amount is not None else None,
        'display_order': r.display_order,
        'is_visible': r.is_visible,
    })


def save_frontend_rule(payload, rule_id=None):
    fields = {
        'method_id': _int(payload.get('method_id')),
        'country_code': (payload.get('country_code') or '').strip() or None,
        'currency': (payload.get('currency') or '').strip() or None,
        'min_amount': payload.get('min_amount') or 0,
        'max_amount': payload.get('max_amount') or None,
        'display_order': _int(payload.get('display_order'), 0) or 0,
        'is_visible': bool(payload.get('is_visible', True)),
    }
    if rule_id:
        updated = PaymentFrontendRule.objects.filter(id=rule_id).update(**fields)
        if not updated:
            raise ValueError('Front end rule not found')
        return {'id': rule_id}
    return {'id': PaymentFrontendRule.objects.create(**fields).id}


def list_queue(params, queue_type):
    qs = CashierQueueItem.objects.select_related('user').filter(queue_type=queue_type)
    qs = apply_date_range(qs, params, 'created_at', 'dateFrom', 'dateTo')
    if status := (params.get('status') or '').strip():
        qs = qs.filter(status=status)
    if (player_id := _int(params.get('playerId'))) is not None:
        qs = qs.filter(user_id=player_id)
    limit, offset = paging(params)
    return page_result(qs.order_by('-created_at'), limit, offset, lambda q: {
        'id': q.id,
        'created_at': q.created_at,
        'player': player_label(q.user) if q.user else '',
        'player_id': q.user_id,
        'amount': _f(q.amount),
        'currency': q.currency,
        'reason': q.reason,
        'status': q.status,
        'notes': q.notes,
        'resolved_at': q.resolved_at,
    })


def resolve_queue_item(item_id, status, admin_id, notes=None):
    try:
        item = CashierQueueItem.objects.get(id=item_id)
    except CashierQueueItem.DoesNotExist:
        raise ValueError('Queue item not found')
    if status not in ('approved', 'rejected'):
        raise ValueError('Status must be approved or rejected')
    if item.status != 'pending':
        raise ValueError(f'Item is already {item.status}')
    item.status = status
    item.resolved_by = admin_id
    item.resolved_at = timezone.now()
    if notes:
        item.notes = notes
    item.save()
    return {'id': item.id, 'status': item.status}


# --------------------------------------------------------------------------
# Mailing
# --------------------------------------------------------------------------

def list_templates(params):
    qs = MailTemplate.objects.all()
    if name := (params.get('name') or '').strip():
        qs = qs.filter(name__icontains=name)
    if channel := (params.get('channel') or '').strip():
        qs = qs.filter(channel=channel)
    limit, offset = paging(params)
    return page_result(qs.order_by('-created_at'), limit, offset, lambda t: {
        'id': t.id,
        'name': t.name,
        'subject': t.subject,
        'channel': t.channel,
        'language': t.language,
        'event_key': t.event_key,
        'is_active': t.is_active,
        'created_at': t.created_at,
        'updated_at': t.updated_at,
    })


def get_template(template_id):
    try:
        t = MailTemplate.objects.get(id=template_id)
    except MailTemplate.DoesNotExist:
        raise ValueError('Template not found')
    return {
        'id': t.id, 'name': t.name, 'subject': t.subject, 'channel': t.channel,
        'language': t.language, 'body': t.body, 'event_key': t.event_key,
        'is_active': t.is_active,
    }


def save_template(payload, admin_id, template_id=None):
    name = (payload.get('name') or '').strip()
    if not name:
        raise ValueError('Template name is required')
    channel = (payload.get('channel') or 'email').strip()
    if channel not in ('email', 'sms', 'both'):
        raise ValueError('Channel must be email, sms or both')
    # An email needs a subject line; an SMS has none by nature.
    if channel in ('email', 'both') and not (payload.get('subject') or '').strip():
        raise ValueError('Subject is required for email templates')

    fields = {
        'name': name,
        'subject': (payload.get('subject') or '').strip() or None,
        'channel': channel,
        'language': (payload.get('language') or 'en').strip(),
        'body': payload.get('body') or '',
        'event_key': (payload.get('event_key') or '').strip() or None,
        'is_active': bool(payload.get('is_active', True)),
    }
    if template_id:
        updated = MailTemplate.objects.filter(id=template_id).update(**fields)
        if not updated:
            raise ValueError('Template not found')
        return {'id': template_id}
    return {'id': MailTemplate.objects.create(created_by=admin_id, **fields).id}


def delete_template(template_id):
    deleted, _ = MailTemplate.objects.filter(id=template_id).delete()
    if not deleted:
        raise ValueError('Template not found')
    return {'deleted': True}


def get_configuration(scope):
    if scope not in ('casino', 'email_sms'):
        raise ValueError('Unknown configuration scope')
    return {
        c.config_key: c.config_value
        for c in MailConfiguration.objects.filter(scope=scope)
    }


def save_configuration(scope, values, admin_id):
    if scope not in ('casino', 'email_sms'):
        raise ValueError('Unknown configuration scope')
    if not isinstance(values, dict):
        raise ValueError('Configuration must be an object')
    for key, value in values.items():
        MailConfiguration.objects.update_or_create(
            scope=scope, config_key=str(key)[:80],
            defaults={
                'config_value': None if value is None else str(value),
                'updated_by': admin_id,
            },
        )
    return get_configuration(scope)


# --------------------------------------------------------------------------
# Staff groups / permissions
# --------------------------------------------------------------------------

def list_staff_groups(params):
    qs = StaffGroup.objects.all()
    if name := (params.get('name') or '').strip():
        qs = qs.filter(name__icontains=name)
    limit, offset = paging(params)
    counts = dict(
        User.objects.filter(role=User.Role.ADMIN, staff_group_id__isnull=False)
        .values('staff_group_id')
        .annotate(n=Count('id'))
        .values_list('staff_group_id', 'n')
    )
    perm_counts = dict(
        StaffGroupPermission.objects.values('group_id')
        .annotate(n=Count('id'))
        .values_list('group_id', 'n')
    )
    return page_result(qs.order_by('name'), limit, offset, lambda g: {
        'id': g.id,
        'name': g.name,
        'description': g.description,
        'is_active': g.is_active,
        'members': counts.get(g.id, 0),
        'permissions': perm_counts.get(g.id, 0),
        'created_at': g.created_at,
    })


def get_staff_group(group_id):
    try:
        g = StaffGroup.objects.get(id=group_id)
    except StaffGroup.DoesNotExist:
        raise ValueError('Group not found')
    perms = [
        {'module': p.module, 'permission': p.permission}
        for p in StaffGroupPermission.objects.filter(group_id=group_id)
    ]
    return {
        'id': g.id, 'name': g.name, 'description': g.description,
        'is_active': g.is_active, 'permissions': perms,
    }


def save_staff_group(payload, admin_id, group_id=None):
    name = (payload.get('name') or '').strip()
    if not name:
        raise ValueError('Group name is required')
    clash = StaffGroup.objects.filter(name=name)
    if group_id:
        clash = clash.exclude(id=group_id)
    if clash.exists():
        raise ValueError(f'A group named "{name}" already exists')

    if group_id:
        group = StaffGroup.objects.filter(id=group_id).first()
        if not group:
            raise ValueError('Group not found')
        group.name = name
        group.description = (payload.get('description') or '').strip() or None
        group.is_active = bool(payload.get('is_active', True))
        group.save()
    else:
        group = StaffGroup.objects.create(
            name=name,
            description=(payload.get('description') or '').strip() or None,
            is_active=bool(payload.get('is_active', True)),
            created_by=admin_id,
        )

    # Permissions are sent as the complete desired set, so replace wholesale.
    perms = payload.get('permissions')
    if perms is not None:
        StaffGroupPermission.objects.filter(group_id=group.id).delete()
        seen = set()
        for p in perms:
            module = str(p.get('module', '')).strip()
            permission = str(p.get('permission', '')).strip()
            if not module or not permission or (module, permission) in seen:
                continue
            seen.add((module, permission))
            StaffGroupPermission.objects.create(
                group_id=group.id, module=module, permission=permission
            )
    return {'id': group.id}


def delete_staff_group(group_id):
    if User.objects.filter(staff_group_id=group_id).exists():
        raise ValueError('Cannot delete a group that still has members')
    deleted, _ = StaffGroup.objects.filter(id=group_id).delete()
    if not deleted:
        raise ValueError('Group not found')
    return {'deleted': True}
