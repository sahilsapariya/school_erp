"""
Tenant resolution and enforcement for multi-tenant SaaS.

- Middleware: resolve tenant by subdomain or X-Tenant-ID header, set g.tenant_id / g.tenant.
- Decorator: @tenant_required to enforce tenant context.
- Helper: get_tenant_id() for use in services.
"""

from functools import wraps

from flask import g, request, jsonify


def get_tenant_id():
    """Return current request's tenant_id from g. None if not in tenant context."""
    return getattr(g, "tenant_id", None)


def resolve_tenant():
    """
    Resolve tenant from request and set g.tenant_id and g.tenant.

    Resolution order:
    1. Header X-Tenant-ID (UUID string)
    2. Subdomain from Host (e.g. acme.school-erp.example.com -> acme)

    Aborts with 404 if tenant not found or 403 if tenant is suspended.
    Must run in a request context. No-op if g.tenant_id already set.
    """
    if getattr(g, "tenant_id", None) is not None:
        return

    from backend.core.models import Tenant
    from backend.core.models import TENANT_STATUS_ACTIVE

    tenant = None
    # 1. Header
    tenant_id_header = request.headers.get("X-Tenant-ID", "").strip()
    if tenant_id_header:
        tenant = Tenant.query.get(tenant_id_header)
    # 2. Subdomain
    if tenant is None and request.host:
        parts = request.host.lower().split(".")
        # Support: subdomain.domain.tld or subdomain.localhost
        if len(parts) >= 2 and parts[0] not in ("www", "api"):
            subdomain = parts[0]
            tenant = Tenant.query.filter_by(
                subdomain=subdomain,
                status=TENANT_STATUS_ACTIVE,
            ).first()
        # If single part (e.g. localhost), use default tenant by subdomain if configured
        elif len(parts) == 1:
            tenant = Tenant.query.filter_by(
                subdomain="default",
                status=TENANT_STATUS_ACTIVE,
            ).first()

    if tenant is None:
        return (
            jsonify(
                success=False,
                error="TenantNotFound",
                message="Tenant not found",
            ),
            404,
        )

    if tenant.status != TENANT_STATUS_ACTIVE:
        return (
            jsonify(
                success=False,
                error="TenantSuspended",
                message="Tenant is suspended",
            ),
            403,
        )

    g.tenant_id = tenant.id
    g.tenant = tenant


def tenant_required(fn):
    """
    Decorator that enforces tenant context.

    Ensures g.tenant_id is set (by calling resolve_tenant() if not).
    Use on API routes that must run in a tenant context.

    Usage:
        @bp.route('/students')
        @tenant_required
        @auth_required
        def list_students():
            ...
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if getattr(g, "tenant_id", None) is None:
            resolve_tenant()
        return fn(*args, **kwargs)
    return wrapper
