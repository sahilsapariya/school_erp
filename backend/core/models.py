"""
Core Models

Tenant and TenantBaseModel for multi-tenant SaaS.
All tenant-scoped business models inherit from TenantBaseModel.
"""

from datetime import datetime
import uuid

from backend.core.database import db


# Status values for Tenant
TENANT_STATUS_ACTIVE = "active"
TENANT_STATUS_SUSPENDED = "suspended"


class Tenant(db.Model):
    """
    Tenant Model

    Represents a school/organization in the multi-tenant SaaS.
    All business data is scoped by tenant_id.
    """
    __tablename__ = "tenants"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False)
    subdomain = db.Column(db.String(63), unique=True, nullable=False, index=True)
    contact_email = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    address = db.Column(db.Text, nullable=True)
    plan_id = db.Column(db.String(36), nullable=True)  # nullable for now
    status = db.Column(
        db.String(20),
        nullable=False,
        default=TENANT_STATUS_ACTIVE,
        index=True
    )  # active | suspended
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    def __repr__(self):
        return f"<Tenant {self.subdomain}>"


class TenantBaseModel(db.Model):
    """
    Abstract base model for all tenant-scoped business entities.

    - Adds tenant_id (FK to tenants.id, NOT NULL, indexed).
    - Subclasses are automatically filtered by tenant in queries when
      tenant resolution middleware has set g.tenant_id.

    All business models (users, sessions, roles, user_roles, role_permissions,
    students, teachers, classes, class_teachers, attendance) must inherit
    from this to prevent cross-tenant data leakage.
    """
    __abstract__ = True
    __tenant_scoped__ = True  # Used by query filter to apply tenant scope

    tenant_id = db.Column(
        db.String(36),
        db.ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
