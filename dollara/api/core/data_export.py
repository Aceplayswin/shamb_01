"""Whole-database export.

The Reports screen can download any single table, a pre-joined combination, or
the entire database at once. Three concerns live here:

* **Discovery** — the table catalogue is derived from Django's app registry, so
  a model added later shows up in the export list without touching this file.
* **Denormalisation** — a raw row is mostly foreign-key ids, which an operator
  cannot read. Every export resolves its FKs into human columns (a transaction
  carries the username and phone, not just ``user_id``), so a downloaded CSV is
  usable on its own.
* **Redaction** — password hashes, API secrets and session tokens never leave
  the database, whatever the caller asks for.

Formats: CSV (streamed), XLSX (one sheet per table) and a ZIP of CSVs for the
full dump.
"""

from __future__ import annotations

import csv
import io
import zipfile
from datetime import date, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.apps import apps
from django.db.models import ForeignKey, OneToOneField
from django.utils import timezone

# Never exported, whatever table they appear on. Matched on the field name, so a
# new secret column is covered as soon as it follows the same naming.
SENSITIVE_FIELDS = frozenset({
    'password_hash', 'password', 'secret', 'api_secret', 'secret_key',
    'token', 'access_token', 'refresh_token', 'session_token', 'private_key',
    'otp', 'otp_code', 'reset_token', 'challenge', 'signature', 'nonce',
    'webhook_secret', 'encryption_key', 'salt',
})

# Apps whose models are part of the product's own data. Django's own tables
# (auth, sessions, migrations) are internal plumbing and not useful to an
# operator, so they are left out.
EXPORT_APPS = ('core', 'tenants')

# When a FK is resolved, these are the columns worth pulling from the related
# row — the first that exists on that model wins, so one rule covers users,
# games, providers and affiliates alike.
LABEL_FIELDS = ('username', 'name', 'label', 'title', 'full_name', 'code', 'slug', 'email')


def _is_sensitive(field_name: str) -> bool:
    lowered = field_name.lower()
    if lowered in SENSITIVE_FIELDS:
        return True
    # Catches password_hash_v2, api_secret_encrypted and similar variants.
    return any(marker in lowered for marker in ('password', 'secret', 'token', 'private_key'))


def _exportable_models():
    for model in apps.get_models():
        if model._meta.app_label not in EXPORT_APPS:
            continue
        if model._meta.proxy or model._meta.abstract:
            continue
        yield model


def table_key(model) -> str:
    """URL-safe identity for a model: ``core.transaction``."""
    return f'{model._meta.app_label}.{model._meta.model_name}'


def _label_for(model) -> str:
    return model._meta.verbose_name_plural.title()


def list_tables() -> list[dict]:
    """Every exportable table with its row count and column count."""
    out = []
    for model in _exportable_models():
        try:
            count = model.objects.count()
        except Exception:
            # A model whose table has not been migrated yet must not break the
            # whole listing — report it as empty rather than 500 the page.
            count = 0
        fields = _plain_fields(model)
        out.append({
            'key': table_key(model),
            'label': _label_for(model),
            'table': model._meta.db_table,
            'rows': count,
            'columns': len(fields),
        })
    return sorted(out, key=lambda t: t['label'])


def _resolve_model(key: str):
    for model in _exportable_models():
        if table_key(model) == key:
            return model
    raise ValueError(f'Unknown table: {key}')


def _plain_fields(model) -> list:
    """Concrete, non-sensitive fields on the model, FKs included."""
    return [
        f for f in model._meta.concrete_fields
        if not _is_sensitive(f.name)
    ]


# How a moment in time reads inside a downloaded file: "12 Jan 2026 10:00 AM",
# the same shape the console shows on screen, rather than the ISO string the
# API hands the UI. Zero-padded day and hour so columns line up.
DATETIME_FORMAT = '%d %b %Y %I:%M %p'
DATE_FORMAT = '%d %b %Y'


def fmt_when(value):
    """Render a ``datetime`` or ``date`` for a report cell; anything else is
    returned untouched so callers can run every cell through it."""
    if isinstance(value, datetime):
        if timezone.is_aware(value):
            value = timezone.localtime(value)
        return value.strftime(DATETIME_FORMAT)
    if isinstance(value, date):
        return value.strftime(DATE_FORMAT)
    return value


# settings.TIME_ZONE is UTC, so `fmt_when` above renders every report in UTC.
# The "ITZ" ("Indian Time Zone") column each dated report carries alongside
# renders the same instant here instead, regardless of the server's own zone.
IST = ZoneInfo('Asia/Kolkata')


def fmt_when_ist(value):
    """Same instant as {@link fmt_when}, always converted to IST."""
    if isinstance(value, datetime):
        if timezone.is_aware(value):
            value = timezone.localtime(value, IST)
        return value.strftime(DATETIME_FORMAT)
    if isinstance(value, date):
        return value.strftime(DATE_FORMAT)
    return value


def cell(value):
    """Render one value for a spreadsheet cell (CSV or XLSX)."""
    if value is None:
        return ''
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return fmt_when(value)
    if isinstance(value, bool):
        return 'Yes' if value else 'No'
    if isinstance(value, (dict, list, tuple, set)):
        # JSON columns: spreadsheets accept only scalars, so serialise rather
        # than hand openpyxl a dict it will refuse.
        import json as _json
        try:
            return _json.dumps(value, default=str, ensure_ascii=False)
        except (TypeError, ValueError):
            return str(value)
    if isinstance(value, (bytes, bytearray, memoryview)):
        return bytes(value).decode('utf-8', 'replace')
    if isinstance(value, (int, float, str)):
        return value
    # UUIDs, timedeltas, IPs and anything else a field may hold.
    return str(value)


def build_table(key: str, limit: int | None = None) -> tuple[list[str], list[list]]:
    """``(header, rows)`` for one table, with foreign keys denormalised.

    Each FK contributes both its raw id (so the export can still be joined
    mechanically) and a readable label pulled from the related row.
    """
    model = _resolve_model(key)
    fields = _plain_fields(model)

    # Which FKs can be followed, and what to show for each.
    relations = []
    for f in fields:
        if isinstance(f, (ForeignKey, OneToOneField)):
            related = f.related_model
            label_field = next(
                (name for name in LABEL_FIELDS
                 if any(rf.name == name for rf in related._meta.concrete_fields)),
                None,
            )
            if label_field:
                relations.append((f, label_field))

    # A model may already own a column with the name a resolved FK would take
    # (GameRound stores its own game_name alongside a game FK). Suffix the
    # derived column rather than emit two identically-named headers.
    own_names = {f.attname for f in fields}
    header = []
    derived = {}  # id(field) -> header name for its resolved label
    for f in fields:
        header.append(f.attname)  # user_id, not user
        for rel_field, label_field in relations:
            if rel_field is f:
                name = f'{f.name}_{label_field}'
                if name in own_names or name in header:
                    name = f'{name}_resolved'
                derived[id(f)] = name
                header.append(name)

    qs = model.objects.all()
    select = [f.name for f, _ in relations]
    if select:
        qs = qs.select_related(*select)
    order_field = 'id' if any(f.name == 'id' for f in fields) else fields[0].name
    qs = qs.order_by(order_field)
    if limit:
        qs = qs[:limit]

    rows = []
    for obj in qs.iterator(chunk_size=2000):
        row = []
        for f in fields:
            row.append(cell(getattr(obj, f.attname, None)))
            for rel_field, label_field in relations:
                if rel_field is f:
                    related_obj = getattr(obj, f.name, None)
                    row.append(cell(getattr(related_obj, label_field, None)) if related_obj else '')
        rows.append(row)
    return header, rows


# --------------------------------------------------------------------------
# Output formats
# --------------------------------------------------------------------------

class _Echo:
    """File-like object that returns what it is handed — lets csv.writer feed a
    streaming response without buffering the whole export in memory."""

    def write(self, value):
        return value


# Filenames and the generated-on line both come from here so every export
# agrees on one instant and one format. UTC, matching settings.TIME_ZONE and
# the timestamps inside the rows themselves — `datetime.now()` would have
# given the server's local wall clock, which is neither.
def export_stamp() -> str:
    """Compact UTC stamp for filenames: date + time to the second."""
    return timezone.now().strftime('%Y%m%d-%H%M%S')


def generated_on() -> str:
    """Human-readable UTC generation time for the header line inside a file."""
    return timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')


def generated_row(width: int = 1) -> list:
    """The generated-on banner row, padded to the sheet's column count so the
    CSV stays rectangular and Excel does not flag a ragged row."""
    row = [f'Generated on: {generated_on()}']
    return row + [''] * max(0, width - 1)


def stream_csv(header: list[str], rows) -> 'generator':
    writer = csv.writer(_Echo())
    yield writer.writerow(header)
    for row in rows:
        yield writer.writerow(row)


def build_xlsx(sheets: list[tuple[str, list[str], list[list]]]) -> bytes:
    """One workbook, one sheet per table, header row in bold."""
    from openpyxl import Workbook
    from openpyxl.cell import WriteOnlyCell
    from openpyxl.styles import Font

    wb = Workbook(write_only=True)
    bold = Font(bold=True)
    for name, header, rows in sheets:
        # Excel sheet names: 31 chars, and none of : \ / ? * [ ]
        safe = ''.join(c for c in name if c not in ':\\/?*[]')[:31] or 'Sheet'
        ws = wb.create_sheet(title=safe)
        # Write-only sheets take styling per cell, not per row, so the header
        # is built from styled cells rather than appended as plain strings.
        head = []
        for label in header:
            c = WriteOnlyCell(ws, value=label)
            c.font = bold
            head.append(c)
        ws.append(head)
        for row in rows:
            ws.append(row)
    if not sheets:
        wb.create_sheet(title='Empty')
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def build_zip(tables: list[str], limit: int | None = None) -> bytes:
    """A ZIP holding one CSV per table — the full-database download."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        for key in tables:
            try:
                header, rows = build_table(key, limit=limit)
            except Exception as exc:  # one bad table must not void the dump
                zf.writestr(f'{key}.error.txt', str(exc))
                continue
            out = io.StringIO()
            writer = csv.writer(out)
            writer.writerow(header)
            writer.writerows(rows)
            zf.writestr(f'{key}.csv', out.getvalue())
    return buf.getvalue()


def all_table_keys() -> list[str]:
    return [t['key'] for t in list_tables()]


# --------------------------------------------------------------------------
# Pre-joined combinations
#
# The per-table exports above answer "give me this table". These answer the
# questions an operator actually asks, which always span tables: everything
# about a player, the full money trail, the complete play history. Each combo
# is a base queryset plus the related columns worth carrying alongside.
# --------------------------------------------------------------------------

def _combo_player_360(limit=None):
    """One row per player: profile, wallet, lifetime money and play totals."""
    from django.db.models import Count, Sum
    from core.models import GameRound, Transaction, User, UserBonus, Wallet

    header = [
        'user_id', 'username', 'full_name', 'phone', 'country_code',
        'account_status', 'signup_ip', 'signup_date', 'last_login_at',
        'main_balance', 'bonus_balance', 'currency',
        'deposits_count', 'deposits_total', 'withdrawals_count', 'withdrawals_total',
        'rounds_played', 'total_staked', 'total_won', 'gross_profit',
        'bonuses_issued', 'bonus_amount_total',
    ]

    wallets = {w.user_id: w for w in Wallet.objects.all()}

    def agg(model, **filters):
        return {
            r['user_id']: r for r in model.objects.filter(**filters)
            .values('user_id')
            .annotate(n=Count('id'), total=Sum(filters.get('_sum_field', 'amount')))
        }

    deposits = {
        r['user_id']: r for r in Transaction.objects
        .filter(type=Transaction.TxType.DEPOSIT, status='completed')
        .values('user_id').annotate(n=Count('id'), total=Sum('amount'))
    }
    withdrawals = {
        r['user_id']: r for r in Transaction.objects
        .filter(type=Transaction.TxType.WITHDRAWAL, status='completed')
        .values('user_id').annotate(n=Count('id'), total=Sum('amount'))
    }
    plays = {
        r['user_id']: r for r in GameRound.objects
        .values('user_id')
        .annotate(n=Count('id'), staked=Sum('bet_amount'), won=Sum('win_amount'))
    }
    bonuses = {
        r['user_id']: r for r in UserBonus.objects
        .values('user_id').annotate(n=Count('id'), total=Sum('amount'))
    }

    qs = User.objects.all().order_by('id')
    if limit:
        qs = qs[:limit]

    rows = []
    for u in qs.iterator(chunk_size=2000):
        w = wallets.get(u.id)
        d = deposits.get(u.id, {})
        wd = withdrawals.get(u.id, {})
        p = plays.get(u.id, {})
        b = bonuses.get(u.id, {})
        staked = p.get('staked') or 0
        won = p.get('won') or 0
        rows.append([
            u.id, cell(u.username), cell(u.full_name), cell(u.phone),
            cell(u.country_code), cell(u.account_status), cell(u.signup_ip),
            cell(u.created_at), cell(u.last_login_at),
            cell(w.main_balance if w else 0), cell(w.bonus_balance if w else 0),
            cell(w.currency if w else ''),
            d.get('n', 0), cell(d.get('total') or 0),
            wd.get('n', 0), cell(wd.get('total') or 0),
            p.get('n', 0), cell(staked), cell(won), cell(staked - won),
            b.get('n', 0), cell(b.get('total') or 0),
        ])
    return header, rows


def _combo_money_trail(limit=None):
    """Every transaction with the player and wallet context around it."""
    from core.models import Transaction, Wallet

    header = [
        'transaction_id', 'created_at', 'type', 'status', 'amount', 'currency',
        'payment_method', 'reference_number', 'provider_payment_id', 'notes',
        'user_id', 'username', 'full_name', 'phone', 'country_code',
        'account_status', 'wallet_main_balance', 'wallet_bonus_balance',
    ]
    wallets = {w.user_id: w for w in Wallet.objects.all()}
    qs = Transaction.objects.select_related('user').order_by('-created_at')
    if limit:
        qs = qs[:limit]
    rows = []
    for t in qs.iterator(chunk_size=2000):
        u = t.user
        w = wallets.get(t.user_id)
        rows.append([
            t.id, cell(t.created_at), cell(t.type), cell(t.status),
            cell(t.amount), cell(t.currency), cell(t.payment_method),
            cell(t.reference_number), cell(t.provider_payment_id), cell(t.notes),
            t.user_id, cell(getattr(u, 'username', '')), cell(getattr(u, 'full_name', '')),
            cell(getattr(u, 'phone', '')), cell(getattr(u, 'country_code', '')),
            cell(getattr(u, 'account_status', '')),
            cell(w.main_balance if w else 0), cell(w.bonus_balance if w else 0),
        ])
    return header, rows


def _combo_play_history(limit=None):
    """Every game round joined to its player, game, provider and session."""
    from core.models import GameRound

    header = [
        'round_id', 'created_at', 'settled_at', 'settle_status',
        'bet_amount', 'win_amount', 'net', 'currency',
        'balance_before', 'balance_after', 'game_round', 'serial_number',
        'user_id', 'username', 'phone', 'country_code',
        'game_id', 'game_name', 'game_category', 'game_uid',
        'provider_id', 'provider_name', 'session_id',
    ]
    qs = (
        GameRound.objects
        .select_related('user', 'game', 'game__provider')
        .order_by('-created_at')
    )
    if limit:
        qs = qs[:limit]
    rows = []
    for r in qs.iterator(chunk_size=2000):
        u, g = r.user, r.game
        prov = getattr(g, 'provider', None) if g else None
        bet = r.bet_amount or 0
        win = r.win_amount or 0
        rows.append([
            r.id, cell(r.created_at), cell(r.settled_at), cell(r.settle_status),
            cell(bet), cell(win), cell(bet - win), cell(r.currency),
            cell(r.balance_before), cell(r.balance_after),
            cell(r.game_round), cell(r.serial_number),
            r.user_id, cell(getattr(u, 'username', '')), cell(getattr(u, 'phone', '')),
            cell(getattr(u, 'country_code', '')),
            r.game_id, cell(r.game_name or getattr(g, 'name', '')),
            cell(getattr(g, 'category', '')), cell(r.game_uid),
            cell(getattr(prov, 'id', '')), cell(getattr(prov, 'name', '')),
            cell(r.session_id),
        ])
    return header, rows


def _combo_bonus_ledger(limit=None):
    """Issued bonuses joined to the player and the bonus definition."""
    from core.models import UserBonus

    header = [
        'user_bonus_id', 'created_at', 'status', 'amount', 'wagering_requirement',
        'wagered_amount', 'expires_at',
        'user_id', 'username', 'phone',
        'bonus_id', 'bonus_name', 'bonus_type',
    ]
    qs = UserBonus.objects.select_related('user', 'bonus').order_by('-id')
    if limit:
        qs = qs[:limit]
    rows = []
    for b in qs.iterator(chunk_size=2000):
        u, d = b.user, b.bonus
        rows.append([
            b.id, cell(getattr(b, 'created_at', None)), cell(getattr(b, 'status', '')),
            cell(getattr(b, 'amount', 0)),
            cell(getattr(b, 'wagering_requirement', '')),
            cell(getattr(b, 'wagered_amount', '')),
            cell(getattr(b, 'expires_at', None)),
            b.user_id, cell(getattr(u, 'username', '')), cell(getattr(u, 'phone', '')),
            cell(getattr(b, 'bonus_id', '')), cell(getattr(d, 'name', '')),
            cell(getattr(d, 'type', '')),
        ])
    return header, rows


COMBOS = {
    'player-360': (
        'Player 360',
        'One row per player: profile, wallet, deposits, withdrawals, play totals and bonuses.',
        _combo_player_360,
    ),
    'money-trail': (
        'Money Trail',
        'Every transaction joined to its player and current wallet balances.',
        _combo_money_trail,
    ),
    'play-history': (
        'Play History',
        'Every game round joined to player, game, category and provider.',
        _combo_play_history,
    ),
    'bonus-ledger': (
        'Bonus Ledger',
        'Issued bonuses joined to the player and the bonus definition.',
        _combo_bonus_ledger,
    ),
}


def list_combos() -> list[dict]:
    return [
        {'key': k, 'label': label, 'description': desc}
        for k, (label, desc, _) in COMBOS.items()
    ]


def build_combo(key: str, limit: int | None = None):
    entry = COMBOS.get(key)
    if not entry:
        raise ValueError(f'Unknown combination: {key}')
    return entry[2](limit)
