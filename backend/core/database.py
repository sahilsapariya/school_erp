"""
Database Module

Centralized database instance, Flask-Migrate, and utility functions.
Schema is managed via migrations (flask db upgrade); db.create_all() is not called on init.

Multi-tenant: TenantBaseModel subclasses are automatically filtered by g.tenant_id
when the query runs inside a request that has tenant resolution.
"""

from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import Query
from sqlalchemy import event

# Initialize SQLAlchemy instance
# This will be initialized with the app in the application factory
db = SQLAlchemy()
migrate = Migrate()


def _tenant_scope_query(query):
    """
    Apply tenant_id filter to queries for models with __tenant_scoped__.
    Ensures no cross-tenant data leakage when g.tenant_id is set.
    """
    from flask import has_request_context, g
    if not has_request_context():
        return query
    tenant_id = getattr(g, "tenant_id", None)
    if tenant_id is None:
        return query
    for ent in query._entities:
        if getattr(ent, "entity_zero", None) is not None:
            mapper = ent.entity_zero
            cls = getattr(mapper, "class_", None)
            if cls and getattr(cls, "__tenant_scoped__", False):
                query = query.filter(cls.tenant_id == tenant_id)
            break
    return query


def init_db(app):
    """
    Initialize database and migrations with Flask app.
    Tables are created/updated by running: flask db upgrade

    Args:
        app: Flask application instance
    """
    db.init_app(app)
    migrate.init_app(app, db, directory="backend/migrations")

    # Automatically scope tenant-scoped model queries by g.tenant_id
    event.listen(Query, "before_compile", _tenant_scope_query, retval=True)

    with app.app_context():
        from backend.core.models import Tenant
        from backend.modules.auth.models import User, Session
        from backend.modules.rbac.models import Role, Permission, RolePermission, UserRole
        from backend.modules.students.models import Student
        from backend.modules.classes.models import Class, ClassTeacher
        from backend.modules.teachers.models import Teacher
        from backend.modules.attendance.models import Attendance


def reset_db(app):
    """
    Drop all tables and recreate them. USE WITH CAUTION!
    Only for development/testing purposes.
    
    Args:
        app: Flask application instance
    """
    with app.app_context():
        db.drop_all()
        db.create_all()
