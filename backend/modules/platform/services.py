"""
Platform Admin Services

Business logic for platform (super admin) operations: dashboard, tenant CRUD,
school admin creation, plan changes, audit. All operations are platform-scoped
(no g.tenant_id); tenant_id is passed explicitly where needed.
"""

import secrets
import string
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional, Any

from backend.core.database import db
from backend.core.models import Tenant, Plan, TENANT_STATUS_ACTIVE, TENANT_STATUS_SUSPENDED
from backend.modules.auth.models import User
from backend.modules.rbac.models import Role, Permission, RolePermission, UserRole
from backend.modules.students.models import Student
from backend.modules.teachers.models import Teacher
from backend.modules.platform.audit import log_platform_action


# Role definitions for seeding new tenants (must match seed_rbac.py structure)
_DEFAULT_ROLES = {
    "Admin": {
        "description": "System administrator with full access",
        "permissions": [
            "user.manage", "role.manage", "permission.manage",
            "student.manage", "teacher.manage", "attendance.manage",
            "grades.manage", "course.manage", "class.manage",
        ],
    },
    "Teacher": {
        "description": "School teacher with class management access",
        "permissions": [
            "student.read.class", "attendance.mark", "attendance.read.class",
            "grades.create", "grades.update", "grades.read.class",
            "course.read", "class.read",
        ],
    },
    "Student": {
        "description": "Student with limited access to own data",
        "permissions": ["student.read.self", "attendance.read.self", "grades.read.self", "course.read"],
    },
    "Parent": {
        "description": "Parent with access to their children's data",
        "permissions": ["student.read.self", "attendance.read.self", "grades.read.self", "course.read"],
    },
}


def _generate_strong_password(length: int = 16) -> str:
    """Generate a strong random password (letters + digits + symbols)."""
    alphabet = string.ascii_letters + string.digits + "!@#$%&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def seed_roles_for_tenant(tenant_id: str) -> Dict[str, str]:
    """
    Create default roles (Admin, Teacher, Student, Parent) and assign permissions
    for the given tenant. Permissions are global; roles are tenant-scoped.
    Returns dict of role_name -> role_id for use when assigning Admin to school admin.
    """
    role_ids = {}
    for role_name, role_data in _DEFAULT_ROLES.items():
        existing = Role.query.filter_by(name=role_name, tenant_id=tenant_id).first()
        if existing:
            role_ids[role_name] = existing.id
            continue
        role = Role(tenant_id=tenant_id, name=role_name, description=role_data["description"])
        db.session.add(role)
        db.session.flush()
        role_ids[role_name] = role.id
        for perm_name in role_data["permissions"]:
            perm = Permission.query.filter_by(name=perm_name).first()
            if not perm:
                continue
            rp = RolePermission(tenant_id=tenant_id, role_id=role.id, permission_id=perm.id)
            db.session.add(rp)
    db.session.commit()
    return role_ids


def get_dashboard_stats() -> Dict[str, Any]:
    """Aggregate stats for platform dashboard."""
    from sqlalchemy import func

    tenants = Tenant.query.all()
    total_tenants = len(tenants)
    active_tenants = sum(1 for t in tenants if t.status == TENANT_STATUS_ACTIVE)
    suspended_tenants = sum(1 for t in tenants if t.status == TENANT_STATUS_SUSPENDED)

    total_students = db.session.query(Student).count()
    total_teachers = db.session.query(Teacher).count()

    revenue_row = (
        db.session.query(func.coalesce(func.sum(Plan.price_monthly), 0))
        .select_from(Tenant)
        .join(Plan, Tenant.plan_id == Plan.id)
        .filter(Tenant.status == TENANT_STATUS_ACTIVE)
        .scalar()
    )
    revenue_monthly = revenue_row if revenue_row is not None else Decimal("0")

    # Tenant growth by month (created_at)
    growth_q = (
        db.session.query(
            func.date_trunc("month", Tenant.created_at).label("month"),
            func.count(Tenant.id).label("count"),
        )
        .group_by(func.date_trunc("month", Tenant.created_at))
        .order_by(func.date_trunc("month", Tenant.created_at))
        .all()
    )
    tenant_growth_by_month = [
        {"month": m.isoformat() if m else None, "count": c}
        for m, c in growth_q
    ]

    return {
        "total_tenants": total_tenants,
        "active_tenants": active_tenants,
        "suspended_tenants": suspended_tenants,
        "total_students": total_students,
        "total_teachers": total_teachers,
        "revenue_monthly": float(revenue_monthly),
        "tenant_growth_by_month": tenant_growth_by_month,
    }


def create_tenant(
    name: str,
    subdomain: str,
    contact_email: Optional[str],
    phone: Optional[str],
    address: Optional[str],
    plan_id: str,
    admin_email: str,
    admin_name: str,
    platform_admin_id: str,
    login_url: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Create tenant, seed roles, create school admin user, assign Admin role,
    send credentials email, and log audit.
    """
    from backend.modules.mailer.service import send_template_email

    subdomain = subdomain.strip().lower()
    if Tenant.query.filter_by(subdomain=subdomain).first():
        return {"success": False, "error": "Subdomain already exists"}

    plan = Plan.query.get(plan_id)
    if not plan:
        return {"success": False, "error": "Plan not found"}

    # School admin email must be unique within the new tenant; we create tenant first so no conflict yet
    tenant = Tenant(
        name=name,
        subdomain=subdomain,
        contact_email=contact_email,
        phone=phone,
        address=address,
        plan_id=plan_id,
        status=TENANT_STATUS_ACTIVE,
    )
    db.session.add(tenant)
    db.session.flush()
    tenant_id = tenant.id

    seed_roles_for_tenant(tenant_id)
    admin_role = Role.query.filter_by(name="Admin", tenant_id=tenant_id).first()
    if not admin_role:
        db.session.rollback()
        return {"success": False, "error": "Failed to create Admin role for tenant"}

    password = _generate_strong_password()
    user = User(
        tenant_id=tenant_id,
        email=admin_email,
        name=admin_name or admin_email,
    )
    user.set_password(password)
    user.force_password_reset = True
    user.email_verified = True
    db.session.add(user)
    db.session.flush()

    ur = UserRole(tenant_id=tenant_id, user_id=user.id, role_id=admin_role.id)
    db.session.add(ur)
    db.session.commit()

    try:
        send_template_email(
            to_email=admin_email,
            template_name="school_admin_credentials.html",
            context={
                "admin_name": admin_name or admin_email,
                "tenant_name": name,
                "admin_email": admin_email,
                "password": password,
                "login_url": login_url or "",
            },
            subject="Your School Admin Account",
        )
    except Exception as e:
        # Log but do not fail tenant creation
        pass

    log_platform_action(
        platform_admin_id=platform_admin_id,
        action="tenant.created",
        tenant_id=tenant_id,
        metadata={"subdomain": subdomain, "admin_email": admin_email},
    )

    return {
        "success": True,
        "tenant": {
            "id": tenant.id,
            "name": tenant.name,
            "subdomain": tenant.subdomain,
            "status": tenant.status,
            "plan_id": tenant.plan_id,
        },
        "admin_user_id": user.id,
    }


def suspend_tenant(tenant_id: str, platform_admin_id: str) -> Dict[str, Any]:
    tenant = Tenant.query.get(tenant_id)
    if not tenant:
        return {"success": False, "error": "Tenant not found"}
    tenant.status = TENANT_STATUS_SUSPENDED
    tenant.updated_at = datetime.utcnow()
    db.session.commit()
    log_platform_action(
        platform_admin_id=platform_admin_id,
        action="tenant.suspended",
        tenant_id=tenant_id,
        metadata={},
    )
    return {"success": True, "tenant": {"id": tenant.id, "status": tenant.status}}


def activate_tenant(tenant_id: str, platform_admin_id: str) -> Dict[str, Any]:
    tenant = Tenant.query.get(tenant_id)
    if not tenant:
        return {"success": False, "error": "Tenant not found"}
    tenant.status = TENANT_STATUS_ACTIVE
    tenant.updated_at = datetime.utcnow()
    db.session.commit()
    log_platform_action(
        platform_admin_id=platform_admin_id,
        action="tenant.activated",
        tenant_id=tenant_id,
        metadata={},
    )
    return {"success": True, "tenant": {"id": tenant.id, "status": tenant.status}}


def change_tenant_plan(tenant_id: str, plan_id: str, platform_admin_id: str) -> Dict[str, Any]:
    tenant = Tenant.query.get(tenant_id)
    if not tenant:
        return {"success": False, "error": "Tenant not found"}
    plan = Plan.query.get(plan_id)
    if not plan:
        return {"success": False, "error": "Plan not found"}
    old_plan_id = tenant.plan_id
    tenant.plan_id = plan_id
    tenant.updated_at = datetime.utcnow()
    db.session.commit()
    log_platform_action(
        platform_admin_id=platform_admin_id,
        action="plan.changed",
        tenant_id=tenant_id,
        metadata={"old_plan_id": old_plan_id, "new_plan_id": plan_id},
    )
    return {"success": True, "tenant": {"id": tenant.id, "plan_id": tenant.plan_id}}


def get_school_admin_user_for_tenant(tenant_id: str) -> Optional[User]:
    """Return the first user in the tenant with Admin role (school admin)."""
    admin_role = Role.query.filter_by(name="Admin", tenant_id=tenant_id).first()
    if not admin_role:
        return None
    ur = UserRole.query.filter_by(tenant_id=tenant_id, role_id=admin_role.id).first()
    if not ur:
        return None
    return User.query.get(ur.user_id)


def reset_tenant_admin(tenant_id: str, platform_admin_id: str) -> Dict[str, Any]:
    """
    Generate new password for school admin, set force_password_reset=True,
    send email, log audit.
    """
    from backend.modules.mailer.service import send_template_email

    tenant = Tenant.query.get(tenant_id)
    if not tenant:
        return {"success": False, "error": "Tenant not found"}
    user = get_school_admin_user_for_tenant(tenant_id)
    if not user:
        return {"success": False, "error": "No school admin user found for this tenant"}

    password = _generate_strong_password()
    user.set_password(password)
    user.force_password_reset = True
    user.save()

    try:
        send_template_email(
            to_email=user.email,
            template_name="school_admin_credentials.html",
            context={
                "admin_name": user.name or user.email,
                "tenant_name": tenant.name,
                "admin_email": user.email,
                "password": password,
                "login_url": "",
            },
            subject="Your School Admin Password Has Been Reset",
        )
    except Exception:
        pass

    log_platform_action(
        platform_admin_id=platform_admin_id,
        action="school_admin.reset",
        tenant_id=tenant_id,
        metadata={"admin_email": user.email},
    )
    return {"success": True, "message": "Password reset and email sent"}


def list_tenants(
    page: int = 1,
    per_page: int = 20,
    status: Optional[str] = None,
) -> Dict[str, Any]:
    """Paginated list of tenants with plan name, student count, teacher count, status."""
    query = Tenant.query
    if status:
        query = query.filter(Tenant.status == status)
    query = query.order_by(Tenant.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    items = []
    for t in pagination.items:
        plan_name = t.plan.name if t.plan else None
        student_count = Student.query.filter_by(tenant_id=t.id).count()
        teacher_count = Teacher.query.filter_by(tenant_id=t.id).count()
        items.append({
            "id": t.id,
            "name": t.name,
            "subdomain": t.subdomain,
            "contact_email": t.contact_email,
            "status": t.status,
            "plan_id": t.plan_id,
            "plan_name": plan_name,
            "student_count": student_count,
            "teacher_count": teacher_count,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })
    return {
        "success": True,
        "data": items,
        "pagination": {
            "page": pagination.page,
            "per_page": pagination.per_page,
            "total": pagination.total,
            "pages": pagination.pages,
        },
    }


def get_tenant_by_id(tenant_id: str) -> Optional[Tenant]:
    return Tenant.query.get(tenant_id)


def list_plans() -> List[Dict[str, Any]]:
    """List all plans for dropdowns (e.g. tenant creation)."""
    plans = Plan.query.order_by(Plan.price_monthly).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "price_monthly": float(p.price_monthly),
            "max_students": p.max_students,
            "max_teachers": p.max_teachers,
            "features_json": p.features_json,
        }
        for p in plans
    ]
