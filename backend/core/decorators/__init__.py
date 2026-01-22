"""
Decorators Module

This module provides decorators for authentication and authorization.

RBAC Philosophy:
- Authorization via permissions only
- Role names never used in business logic
- Permission naming: resource.action.scope

Usage:
    from backend.core.decorators import auth_required, require_permission
    
    @bp.route('/protected')
    @auth_required
    def protected_route():
        return jsonify({'message': 'Success'})
    
    @bp.route('/admin')
    @auth_required
    @require_permission('user.manage')
    def admin_route():
        return jsonify({'message': 'Admin access'})
"""

from .auth import auth_required
from .rbac import require_permission

__all__ = ['auth_required', 'require_permission']
