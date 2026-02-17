"""
Platform (Super Admin) API Routes

All routes require @auth_required and @platform_admin_required.
Prefix: /platform (registered at /api/platform).
"""

from flask import request, g

from backend.modules.platform import platform_bp
from backend.core.decorators import auth_required, platform_admin_required
from backend.core.extensions import limiter
from backend.shared.helpers import success_response, error_response, not_found_response, validation_error_response
from backend.modules.platform import services

# Rate limit: 30 requests per minute per IP for all platform routes
PLATFORM_LIMIT = "30 per minute"


@platform_bp.route("/plans", methods=["GET"])
@limiter.limit(PLATFORM_LIMIT)
@auth_required
@platform_admin_required
def list_plans():
    """GET /platform/plans - List all plans (for tenant creation form)."""
    data = services.list_plans()
    return success_response(data=data)


@platform_bp.route("/dashboard", methods=["GET"])
@limiter.limit(PLATFORM_LIMIT)
@auth_required
@platform_admin_required
def dashboard():
    """
    GET /platform/dashboard
    Returns: total_tenants, active_tenants, suspended_tenants, total_students,
             total_teachers, revenue_monthly, tenant_growth_by_month
    """
    data = services.get_dashboard_stats()
    return success_response(data=data)


@platform_bp.route("/tenants", methods=["POST"])
@limiter.limit(PLATFORM_LIMIT)
@auth_required
@platform_admin_required
def create_tenant():
    """
    POST /platform/tenants
    Body: name, subdomain, contact_email?, phone?, address?, plan_id, admin_email, admin_name?
    """
    data = request.get_json() or {}
    required = ["name", "subdomain", "plan_id", "admin_email"]
    missing = [k for k in required if not data.get(k)]
    if missing:
        return validation_error_response({k: "Required" for k in missing})

    result = services.create_tenant(
        name=data["name"],
        subdomain=data["subdomain"],
        contact_email=data.get("contact_email"),
        phone=data.get("phone"),
        address=data.get("address"),
        plan_id=data["plan_id"],
        admin_email=data["admin_email"],
        admin_name=data.get("admin_name"),
        platform_admin_id=g.current_user.id,
        login_url=data.get("login_url"),
    )
    if not result["success"]:
        return error_response("CreationError", result["error"], 400)
    return success_response(data=result, message="Tenant created", status_code=201)


@platform_bp.route("/tenants/<tenant_id>/suspend", methods=["PATCH"])
@limiter.limit(PLATFORM_LIMIT)
@auth_required
@platform_admin_required
def suspend_tenant(tenant_id):
    """PATCH /platform/tenants/<id>/suspend"""
    result = services.suspend_tenant(tenant_id, platform_admin_id=g.current_user.id)
    if not result["success"]:
        return error_response("NotFound", result["error"], 404)
    return success_response(data=result["tenant"], message="Tenant suspended")


@platform_bp.route("/tenants/<tenant_id>/activate", methods=["PATCH"])
@limiter.limit(PLATFORM_LIMIT)
@auth_required
@platform_admin_required
def activate_tenant(tenant_id):
    """PATCH /platform/tenants/<id>/activate"""
    result = services.activate_tenant(tenant_id, platform_admin_id=g.current_user.id)
    if not result["success"]:
        return error_response("NotFound", result["error"], 404)
    return success_response(data=result["tenant"], message="Tenant activated")


@platform_bp.route("/tenants/<tenant_id>/change-plan", methods=["PATCH"])
@limiter.limit(PLATFORM_LIMIT)
@auth_required
@platform_admin_required
def change_plan(tenant_id):
    """PATCH /platform/tenants/<id>/change-plan   Body: { plan_id }"""
    data = request.get_json() or {}
    plan_id = data.get("plan_id")
    if not plan_id:
        return validation_error_response({"plan_id": "Required"})
    result = services.change_tenant_plan(
        tenant_id, plan_id, platform_admin_id=g.current_user.id
    )
    if not result["success"]:
        if result["error"] == "Tenant not found":
            return not_found_response("Tenant")
        if result["error"] == "Plan not found":
            return not_found_response("Plan")
        return error_response("BadRequest", result["error"], 400)
    return success_response(data=result["tenant"], message="Plan updated")


@platform_bp.route("/tenants/<tenant_id>/reset-admin", methods=["POST"])
@limiter.limit(PLATFORM_LIMIT)
@auth_required
@platform_admin_required
def reset_admin(tenant_id):
    """POST /platform/tenants/<id>/reset-admin"""
    result = services.reset_tenant_admin(tenant_id, platform_admin_id=g.current_user.id)
    if not result["success"]:
        if result["error"] == "Tenant not found":
            return not_found_response("Tenant")
        if "school admin" in result["error"].lower():
            return error_response("NotFound", result["error"], 404)
        return error_response("BadRequest", result["error"], 400)
    return success_response(message=result["message"])


@platform_bp.route("/tenants", methods=["GET"])
@limiter.limit(PLATFORM_LIMIT)
@auth_required
@platform_admin_required
def list_tenants():
    """
    GET /platform/tenants?page=1&per_page=20&status=active|suspended
    Returns paginated list with tenant info, plan name, student_count, teacher_count, status.
    """
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(max(per_page, 1), 100)
    status = request.args.get("status")
    result = services.list_tenants(page=page, per_page=per_page, status=status)
    return success_response(
        data={"items": result["data"], "pagination": result["pagination"]},
        status_code=200,
    )
