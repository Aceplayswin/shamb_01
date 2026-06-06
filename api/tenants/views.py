"""Super Admin control-plane API + public branding endpoint.

All super-admin endpoints operate on the master database and are guarded by the
``super_admin`` role. Endpoints that inspect a specific tenant (e.g. listing its
users) switch into that tenant's database context explicitly.
"""

import json

import bcrypt
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from core.auth_jwt import sign_token
from core.middleware import require_auth
from services.branding import get_branding_for_slug
from services.tenant_provisioning import ProvisioningError, provision_product
from services.tenant_resolver import invalidate_tenant_cache
from tenants.models import Branding, Domain, Product, TenantDatabase
from tenants.state import tenant_db_alias_for, use_tenant

BRANDING_FIELDS = (
    'product_name', 'logo_url', 'favicon_url', 'theme_color', 'secondary_color',
    'splash_url', 'app_icon_url', 'support_email', 'support_phone',
    'terms_url', 'privacy_url',
)


def _json_body(request) -> dict:
    if not request.body:
        return {}
    return json.loads(request.body)


def _error(message, status=400):
    return JsonResponse({'error': str(message)}, status=status)


def _serialize_product(product: Product) -> dict:
    branding = Branding.objects.filter(product=product).first()
    db = TenantDatabase.objects.filter(product=product).first()
    domains = list(
        Domain.objects.filter(product=product).values('id', 'host', 'is_primary')
    )
    return {
        'id': product.id,
        'slug': product.slug,
        'name': product.name,
        'status': product.status,
        'created_at': product.created_at.isoformat(),
        'domains': domains,
        'database': {
            'db_name': db.db_name if db else None,
            'db_host': db.db_host if db else None,
            'is_provisioned': db.is_provisioned if db else False,
        },
        'branding': get_branding_for_slug(product.slug),
    }


# --- Public branding (tenant-resolved, no auth) ---
@require_http_methods(['GET'])
def public_branding(request):
    slug = request.tenant.slug if getattr(request, 'tenant', None) else None
    return JsonResponse(get_branding_for_slug(slug))


# --- Super Admin auth ---
@csrf_exempt
@require_http_methods(['POST'])
def super_admin_login(request):
    from tenants.models import SuperAdminUser

    try:
        body = _json_body(request)
        username = body['username']
        password = body['password']
    except (KeyError, json.JSONDecodeError) as e:
        return _error(e)

    admin = SuperAdminUser.objects.filter(username=username, is_active=True).first()
    if not admin or not bcrypt.checkpw(password.encode(), admin.password_hash.encode()):
        return _error('Invalid credentials', 401)
    admin.last_login_at = timezone.now()
    admin.save(update_fields=['last_login_at'])
    return JsonResponse({
        'token': sign_token({'sub': admin.id, 'role': 'super_admin'}),
        'role': 'super_admin',
        'username': admin.username,
    })


# --- Products ---
@require_auth(['super_admin'])
@require_http_methods(['GET'])
def products_list(request):
    products = Product.objects.order_by('-created_at')
    return JsonResponse([_serialize_product(p) for p in products], safe=False)


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['POST'])
def products_create(request):
    try:
        body = _json_body(request)
        slug = body['slug'].strip().lower()
        name = body['name'].strip()
    except (KeyError, json.JSONDecodeError) as e:
        return _error(e)
    if Product.objects.filter(slug=slug).exists():
        return _error('A product with this slug already exists', 409)
    db = body.get('database') or {}
    try:
        product = provision_product(
            slug=slug,
            name=name,
            db_name=db.get('db_name'),
            db_host=db.get('db_host'),
            db_port=db.get('db_port'),
            db_user=db.get('db_user'),
            db_password=db.get('db_password'),
            branding={k: v for k, v in (body.get('branding') or {}).items() if k in BRANDING_FIELDS},
            domains=body.get('domains') or [],
            seed=body.get('seed', True),
        )
    except ProvisioningError as e:
        return _error(f'Provisioning failed: {e}', 500)
    invalidate_tenant_cache(slug)
    return JsonResponse(_serialize_product(product), status=201)


@require_auth(['super_admin'])
@require_http_methods(['GET'])
def product_detail(request, slug):
    product = Product.objects.filter(slug=slug).first()
    if not product:
        return _error('Product not found', 404)
    return JsonResponse(_serialize_product(product))


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['PATCH'])
def product_update(request, slug):
    product = Product.objects.filter(slug=slug).first()
    if not product:
        return _error('Product not found', 404)
    body = _json_body(request)
    if 'name' in body:
        product.name = body['name']
    if 'status' in body and body['status'] in dict(Product.Status.choices):
        product.status = body['status']
    product.save(update_fields=['name', 'status', 'updated_at'])
    invalidate_tenant_cache(slug)
    return JsonResponse(_serialize_product(product))


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['POST'])
def product_disable(request, slug):
    updated = Product.objects.filter(slug=slug).update(status=Product.Status.DISABLED)
    if not updated:
        return _error('Product not found', 404)
    invalidate_tenant_cache(slug)
    return JsonResponse({'slug': slug, 'status': Product.Status.DISABLED})


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['DELETE'])
def product_delete(request, slug):
    """Delete the product's control-plane records. The isolated tenant database
    is intentionally NOT dropped here (irreversible); operators remove it
    manually after export."""
    product = Product.objects.filter(slug=slug).first()
    if not product:
        return _error('Product not found', 404)
    product.delete()
    invalidate_tenant_cache(slug)
    return JsonResponse({'deleted': True, 'slug': slug})


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['POST'])
def product_provision(request, slug):
    """(Re)create + seed the tenant database for an existing product."""
    product = Product.objects.filter(slug=slug).first()
    if not product:
        return _error('Product not found', 404)
    db = TenantDatabase.objects.filter(product=product).first()
    branding = Branding.objects.filter(product=product).first()
    try:
        provision_product(
            slug=product.slug,
            name=product.name,
            db_name=db.db_name if db else None,
            db_host=db.db_host if db else None,
            db_port=db.db_port if db else None,
            db_user=db.db_user if db else None,
            db_password=db.db_password if db else None,
            branding={'product_name': branding.product_name} if branding else None,
            seed=request.GET.get('seed', '1') != '0',
        )
    except ProvisioningError as e:
        return _error(f'Provisioning failed: {e}', 500)
    return JsonResponse(_serialize_product(product))


# --- Branding ---
@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['GET', 'PUT'])
def product_branding(request, slug):
    product = Product.objects.filter(slug=slug).first()
    if not product:
        return _error('Product not found', 404)
    if request.method == 'GET':
        return JsonResponse(get_branding_for_slug(slug))
    body = _json_body(request)
    defaults = {k: v for k, v in body.items() if k in BRANDING_FIELDS}
    if 'extra' in body:
        defaults['extra'] = body['extra']
    defaults.setdefault('product_name', product.name)
    Branding.objects.update_or_create(product=product, defaults=defaults)
    invalidate_tenant_cache(slug)
    return JsonResponse(get_branding_for_slug(slug))


# --- Domains ---
@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['GET', 'POST'])
def product_domains(request, slug):
    product = Product.objects.filter(slug=slug).first()
    if not product:
        return _error('Product not found', 404)
    if request.method == 'GET':
        domains = list(Domain.objects.filter(product=product).values('id', 'host', 'is_primary'))
        return JsonResponse(domains, safe=False)
    body = _json_body(request)
    host = (body.get('host') or '').strip().lower()
    if not host:
        return _error('host is required')
    if Domain.objects.filter(host=host).exclude(product=product).exists():
        return _error('Host already mapped to another product', 409)
    domain, _ = Domain.objects.update_or_create(
        host=host, defaults={'product': product, 'is_primary': bool(body.get('is_primary'))}
    )
    return JsonResponse({'id': domain.id, 'host': domain.host, 'is_primary': domain.is_primary}, status=201)


@csrf_exempt
@require_auth(['super_admin'])
@require_http_methods(['DELETE'])
def domain_delete(request, slug, domain_id):
    deleted, _ = Domain.objects.filter(id=domain_id, product__slug=slug).delete()
    if not deleted:
        return _error('Domain not found', 404)
    return JsonResponse({'deleted': True})


# --- Cross-tenant inspection ---
@require_auth(['super_admin'])
@require_http_methods(['GET'])
def product_users(request, slug):
    from core.models import User

    product = Product.objects.filter(slug=slug).first()
    if not product:
        return _error('Product not found', 404)
    alias = tenant_db_alias_for(slug)
    # Ensure the connection is registered before querying the tenant DB.
    from services.tenant_resolver import resolve_tenant
    resolve_tenant(header_slug=slug)
    with use_tenant(slug, alias):
        users = list(
            User.objects.order_by('-created_at')[:100].values(
                'id', 'username', 'full_name', 'phone', 'role', 'account_status', 'created_at'
            )
        )
    for u in users:
        if u.get('created_at'):
            u['created_at'] = u['created_at'].isoformat()
    return JsonResponse(users, safe=False)


@require_auth(['super_admin'])
@require_http_methods(['GET'])
def analytics_summary(request):
    """Aggregate high-level metrics per product (super admin sees all)."""
    from core.models import Transaction, User
    from services.tenant_resolver import resolve_tenant

    summary = []
    for product in Product.objects.all():
        alias = tenant_db_alias_for(product.slug)
        entry = {'slug': product.slug, 'name': product.name, 'status': product.status}
        try:
            resolve_tenant(header_slug=product.slug)
            with use_tenant(product.slug, alias):
                entry['users'] = User.objects.filter(role='user').count()
                entry['transactions'] = Transaction.objects.count()
        except Exception as e:  # tenant DB unreachable/not provisioned
            entry['error'] = str(e)
        summary.append(entry)
    return JsonResponse(summary, safe=False)
