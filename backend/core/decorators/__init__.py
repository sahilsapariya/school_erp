"""
Decorators Module

This module provides decorators for authentication, authorization, and multi-tenant.

RBAC Philosophy:
- Authorization via permissions only
- Role names never used in business logic
- Permission naming: resource.action.scope

Usage:
    from backend.core.decorators import auth_required, require_permission, tenant_required

    @bp.route('/protected')
    @auth_required
    def protected_route():
        return jsonify({'message': 'Success'})

    @bp.route('/admin')
    @auth_required
    @require_permission('user.manage')
    def admin_route():
        return jsonify({'message': 'Admin access'})

    @bp.route('/students')
    @tenant_required
    @auth_required
    def list_students():
        ...
"""

from .auth import auth_required
from .rbac import require_permission
from .platform import platform_admin_required
from backend.core.tenant import tenant_required

__all__ = ['auth_required', 'require_permission', 'tenant_required', 'platform_admin_required']
