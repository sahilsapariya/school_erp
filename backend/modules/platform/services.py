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
from backend.core.models import (
    Tenant,
    Plan,
    AuditLog,
    PlatformSetting,
    TENANT_STATUS_ACTIVE,
    TENANT_STATUS_SUSPENDED,
    TENANT_STATUS_DELETED,
)
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

    # Exclude deleted tenants from all counts
    tenants = Tenant.query.filter(
        Tenant.status.in_([TENANT_STATUS_ACTIVE, TENANT_STATUS_SUSPENDED])
    ).all()
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

    # Tenant growth by month (created_at); exclude deleted
    growth_q = (
        db.session.query(
            func.date_trunc("month", Tenant.created_at).label("month"),
            func.count(Tenant.id).label("count"),
        )
        .filter(
            Tenant.status.in_([TENANT_STATUS_ACTIVE, TENANT_STATUS_SUSPENDED])
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


def get_tenant_by_id(tenant_id: str) -> Dict[str, Any]:
    tenant = Tenant.query.get(tenant_id)
    if not tenant:
        return {"success": False, "error": "Tenant not found"}
    student_count = Student.query.filter_by(tenant_id=tenant_id).count()
    teacher_count = Teacher.query.filter_by(tenant_id=tenant_id).count()
    tenant_data = {
        "id": tenant.id,
        "name": tenant.name,
        "subdomain": tenant.subdomain,
        "contact_email": tenant.contact_email,
        "phone": tenant.phone,
        "address": tenant.address,
        "status": tenant.status,
        "plan_id": tenant.plan_id,
        "plan_name": tenant.plan.name if tenant.plan else None,
        "created_at": tenant.created_at.isoformat() if tenant.created_at else None,
        "student_count": student_count,
        "teacher_count": teacher_count,
    }
    return {"success": True, "tenant": tenant_data}


def update_tenant(
    tenant_id: str,
    platform_admin_id: str,
    name: Optional[str] = None,
    contact_email: Optional[str] = None,
    phone: Optional[str] = None,
    address: Optional[str] = None,
) -> Dict[str, Any]:
    tenant = Tenant.query.get(tenant_id)
    if not tenant:
        return {"success": False, "error": "Tenant not found"}
    if name is not None:
        tenant.name = name
    if contact_email is not None:
        tenant.contact_email = contact_email
    if phone is not None:
        tenant.phone = phone
    if address is not None:
        tenant.address = address
    tenant.updated_at = datetime.utcnow()
    db.session.commit()
    log_platform_action(
        platform_admin_id=platform_admin_id,
        action="tenant.updated",
        tenant_id=tenant_id,
        metadata={"updated_fields": ["name", "contact_email", "phone", "address"]},
    )
    return {"success": True, "tenant": {"id": tenant.id}}


def delete_tenant(tenant_id: str, platform_admin_id: str) -> Dict[str, Any]:
    tenant = Tenant.query.get(tenant_id)
    if not tenant:
        return {"success": False, "error": "Tenant not found"}
    tenant.status = TENANT_STATUS_DELETED
    tenant.updated_at = datetime.utcnow()
    db.session.commit()
    log_platform_action(
        platform_admin_id=platform_admin_id,
        action="tenant.deleted",
        tenant_id=tenant_id,
        metadata={"subdomain": tenant.subdomain},
    )
    return {"success": True}

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


def create_plan(
    name: str,
    price_monthly: float,
    max_students: int,
    max_teachers: int,
    features_json: Optional[dict] = None,
    platform_admin_id: Optional[str] = None,
) -> Dict[str, Any]:
    if Plan.query.filter_by(name=name).first():
        return {"success": False, "error": "Plan name already exists"}
    plan = Plan(
        name=name,
        price_monthly=Decimal(str(price_monthly)),
        max_students=max_students,
        max_teachers=max_teachers,
        features_json=features_json,
    )
    db.session.add(plan)
    db.session.commit()
    if platform_admin_id:
        log_platform_action(
            platform_admin_id=platform_admin_id,
            action="plan.created",
            tenant_id=None,
            metadata={"plan_id": plan.id, "name": plan.name},
        )
    return {"success": True, "plan": {"id": plan.id, "name": plan.name}}


def update_plan(
    plan_id: str,
    platform_admin_id: Optional[str],
    name: Optional[str] = None,
    price_monthly: Optional[float] = None,
    max_students: Optional[int] = None,
    max_teachers: Optional[int] = None,
    features_json: Optional[dict] = None,
) -> Dict[str, Any]:
    plan = Plan.query.get(plan_id)
    if not plan:
        return {"success": False, "error": "Plan not found"}
    if name is not None:
        existing = Plan.query.filter_by(name=name).first()
        if existing and existing.id != plan_id:
            return {"success": False, "error": "Plan name already exists"}
        plan.name = name
    if price_monthly is not None:
        plan.price_monthly = Decimal(str(price_monthly))
    if max_students is not None:
        plan.max_students = max_students
    if max_teachers is not None:
        plan.max_teachers = max_teachers
    if features_json is not None:
        plan.features_json = features_json
    plan.updated_at = datetime.utcnow()
    db.session.commit()
    if platform_admin_id:
        log_platform_action(
            platform_admin_id=platform_admin_id,
            action="plan.updated",
            tenant_id=None,
            metadata={"plan_id": plan_id},
        )
    return {"success": True, "plan": {"id": plan.id}}


def delete_plan(plan_id: str, platform_admin_id: Optional[str] = None) -> Dict[str, Any]:
    plan = Plan.query.get(plan_id)
    if not plan:
        return {"success": False, "error": "Plan not found"}
    if Tenant.query.filter_by(plan_id=plan_id).first():
        return {"success": False, "error": "Cannot delete plan: tenants are using it"}
    db.session.delete(plan)
    db.session.commit()
    if platform_admin_id:
        log_platform_action(
            platform_admin_id=platform_admin_id,
            action="plan.deleted",
            tenant_id=None,
            metadata={"plan_id": plan_id, "name": plan.name},
        )
    return {"success": True}


def list_audit_logs(
    page: int = 1,
    per_page: int = 20,
    action: Optional[str] = None,
    tenant_id: Optional[str] = None,
    platform_admin_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> Dict[str, Any]:
    query = AuditLog.query
    if action:
        query = query.filter(AuditLog.action == action)
    if tenant_id:
        query = query.filter(AuditLog.tenant_id == tenant_id)
    if platform_admin_id:
        query = query.filter(AuditLog.platform_admin_id == platform_admin_id)
    if date_from:
        try:
            from datetime import datetime as dt
            start = dt.fromisoformat(date_from.replace("Z", "+00:00"))
            query = query.filter(AuditLog.created_at >= start)
        except ValueError:
            pass
    if date_to:
        try:
            from datetime import datetime as dt
            end = dt.fromisoformat(date_to.replace("Z", "+00:00"))
            query = query.filter(AuditLog.created_at <= end)
        except ValueError:
            pass
    query = query.order_by(AuditLog.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    items = []
    for log in pagination.items:
        items.append({
            "id": log.id,
            "action": log.action,
            "tenant_id": log.tenant_id,
            "platform_admin_id": log.platform_admin_id,
            "extra_data": log.extra_data,
            "created_at": log.created_at.isoformat() if log.created_at else None,
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


def list_tenant_admins(tenant_id: str) -> Dict[str, Any]:
    """List users with Admin role for the given tenant."""
    admin_role = Role.query.filter_by(name="Admin", tenant_id=tenant_id).first()
    if not admin_role:
        return {"success": True, "admins": []}
    role_user_ids = [ur.user_id for ur in UserRole.query.filter_by(tenant_id=tenant_id, role_id=admin_role.id).all()]
    admins = []
    for uid in role_user_ids:
        user = User.query.get(uid)
        if user:
            admins.append({
                "id": user.id,
                "email": user.email,
                "name": user.name,
            })
    return {"success": True, "admins": admins}


def add_tenant_admin(
    tenant_id: str,
    email: str,
    name: Optional[str],
    platform_admin_id: str,
    login_url: Optional[str] = None,
) -> Dict[str, Any]:
    """Create an additional school admin user for the tenant and assign Admin role."""
    from backend.modules.mailer.service import send_template_email

    tenant = Tenant.query.get(tenant_id)
    if not tenant:
        return {"success": False, "error": "Tenant not found"}
    existing = User.query.filter_by(tenant_id=tenant_id, email=email).first()
    if existing:
        return {"success": False, "error": "A user with this email already exists for this tenant"}
    admin_role = Role.query.filter_by(name="Admin", tenant_id=tenant_id).first()
    if not admin_role:
        return {"success": False, "error": "Admin role not found for tenant"}
    password = _generate_strong_password()
    user = User(
        tenant_id=tenant_id,
        email=email,
        name=name or email,
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
            to_email=email,
            template_name="school_admin_credentials.html",
            context={
                "admin_name": name or email,
                "tenant_name": tenant.name,
                "admin_email": email,
                "password": password,
                "login_url": login_url or "",
            },
            subject="Your School Admin Account",
        )
    except Exception:
        pass
    log_platform_action(
        platform_admin_id=platform_admin_id,
        action="school_admin.created",
        tenant_id=tenant_id,
        metadata={"admin_email": email},
    )
    return {"success": True, "admin_user_id": user.id}


def get_platform_settings() -> Dict[str, Any]:
    """Return all platform settings as key -> value (strings)."""
    from backend.core.models import PLATFORM_SETTING_KEYS
    rows = PlatformSetting.query.all()
    result = {r.key: r.value for r in rows}
    for key in PLATFORM_SETTING_KEYS:
        if key not in result:
            result[key] = None
    return result


def get_platform_setting(key: str) -> Optional[str]:
    """Return a single platform setting value, or None if unset."""
    row = PlatformSetting.query.get(key)
    if row is None or row.value is None:
        return None
    return str(row.value)


def update_platform_settings(updates: Dict[str, Any], platform_admin_id: Optional[str] = None) -> Dict[str, Any]:
    """Update platform settings. Values are stored as strings."""
    from backend.core.models import PLATFORM_SETTING_KEYS
    for key, value in updates.items():
        if key not in PLATFORM_SETTING_KEYS:
            continue
        if value is None or value == "":
            stored = PlatformSetting.query.get(key)
            if stored:
                db.session.delete(stored)
        else:
            stored = PlatformSetting.query.get(key)
            str_val = str(value).lower() if isinstance(value, bool) else str(value)
            if stored:
                stored.value = str_val
                stored.updated_at = datetime.utcnow()
            else:
                db.session.add(PlatformSetting(key=key, value=str_val))
    db.session.commit()
    if platform_admin_id:
        log_platform_action(
            platform_admin_id=platform_admin_id,
            action="settings.updated",
            tenant_id=None,
            metadata={"keys": list(updates.keys())},
        )
    return {"success": True}
