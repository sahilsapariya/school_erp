"""
Permission Decorator Module

This module provides the @require_permission decorator for enforcing
permission-based access control on Flask routes.

The decorator must be used AFTER @auth_required, which sets g.current_user.
It checks if the authenticated user has the required permission or the
hierarchical 'manage' permission for that resource.

Usage:
    @bp.route('/attendance/mark', methods=['POST'])
    @auth_required
    @require_permission('attendance.mark')
    def mark_attendance():
        # Business logic here
        pass
"""

from functools import wraps
from flask import g, jsonify
from typing import Callable
from auth.services.rbac_service import has_permission


def require_permission(permission_name: str) -> Callable:
    """
    Decorator to enforce permission-based access control on routes.
    
    This decorator checks if the authenticated user (from g.current_user)
    has the required permission. It implements hierarchical permission checking:
    - Allows access if user has the exact permission
    - Allows access if user has '<resource>.manage' for that resource
    - Returns 403 Forbidden otherwise
    
    The decorator MUST be used after @auth_required, which sets g.current_user.
    
    Args:
        permission_name: The permission string to check (e.g., 'attendance.mark')
        
    Returns:
        The decorated function if authorized, or 403/401 response if not
        
    Example:
        @bp.route('/students', methods=['POST'])
        @auth_required
        @require_permission('student.create')
        def create_student():
            return jsonify({'message': 'Student created'})
            
    Design Rules:
        - Never checks role names, only permissions
        - Always fetches fresh permissions from database (no caching yet)
        - Implements 'manage' implies all rule for hierarchical permissions
    """
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Check if user is authenticated (set by @auth_required decorator)
            if not hasattr(g, 'current_user') or g.current_user is None:
                return jsonify({
                    'error': 'Unauthorized',
                    'message': 'Authentication required. Use @auth_required before @require_permission.'
                }), 401
            
            # Get user_id from the authenticated user
            user_id = g.current_user.id
            
            # Check if user has the required permission (exact or via manage)
            # This calls the RBAC service which handles the business logic
            if has_permission(user_id, permission_name):
                # User is authorized, proceed with the route handler
                return fn(*args, **kwargs)
            
            # User does not have the required permission
            return jsonify({
                'error': 'Forbidden',
                'message': f'Insufficient permissions. Required: {permission_name}'
            }), 403
        
        return wrapper
    return decorator
