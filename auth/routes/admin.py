"""
Admin Routes for RBAC Management

This module provides API endpoints for managing roles, permissions,
and their assignments. These routes should be protected with admin permissions.

Example protection:
    @bp.route('/roles', methods=['POST'])
    @auth_required
    @require_permission('role.manage')
    def create_role_route():
        ...
"""

from flask import Blueprint, request, jsonify
from auth.utils.auth_guard import auth_required
from auth.utils.permissions import require_permission
from auth.services.permissions import (
    # Permission CRUD
    create_permission, list_permissions, get_permission_by_id,
    get_permission_by_name, update_permission, delete_permission,
    # Role CRUD
    create_role, list_roles, get_role_by_id, get_role_by_name,
    update_role, delete_role,
    # Role-Permission Management
    assign_permission_to_role, assign_permission_to_role_by_name,
    remove_permission_from_role, get_role_permissions,
    # User-Role Management
    assign_role_to_user, assign_role_to_user_by_email,
    remove_role_from_user, get_user_roles,
    # Bulk Operations
    bulk_assign_permissions_to_role, bulk_assign_roles_to_user,
    # Utility
    get_all_user_permissions
)

bp = Blueprint('admin', __name__)


# ==================== PERMISSION ROUTES ====================

@bp.route('/permissions', methods=['POST'])
@auth_required
@require_permission('permission.manage')
def create_permission_route():
    """Create a new permission"""
    data = request.get_json()
    name = data.get('name')
    description = data.get('description')
    
    if not name:
        return jsonify({'error': 'Permission name is required'}), 400
    
    result = create_permission(name, description)
    
    if result['success']:
        return jsonify(result), 201
    else:
        return jsonify(result), 400


@bp.route('/permissions', methods=['GET'])
@auth_required
@require_permission('permission.read')
def list_permissions_route():
    """List all permissions with optional search"""
    search = request.args.get('search')
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    permissions = list_permissions(search, limit, offset)
    
    return jsonify({
        'success': True,
        'permissions': permissions,
        'count': len(permissions)
    }), 200


@bp.route('/permissions/<permission_id>', methods=['GET'])
@auth_required
@require_permission('permission.read')
def get_permission_route(permission_id):
    """Get a single permission by ID"""
    permission = get_permission_by_id(permission_id)
    
    if not permission:
        return jsonify({'error': 'Permission not found'}), 404
    
    return jsonify({
        'success': True,
        'permission': permission
    }), 200


@bp.route('/permissions/<permission_id>', methods=['PUT'])
@auth_required
@require_permission('permission.manage')
def update_permission_route(permission_id):
    """Update a permission"""
    data = request.get_json()
    name = data.get('name')
    description = data.get('description')
    
    result = update_permission(permission_id, name, description)
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 400


@bp.route('/permissions/<permission_id>', methods=['DELETE'])
@auth_required
@require_permission('permission.manage')
def delete_permission_route(permission_id):
    """Delete a permission"""
    result = delete_permission(permission_id)
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 400


# ==================== ROLE ROUTES ====================

@bp.route('/roles', methods=['POST'])
@auth_required
@require_permission('role.manage')
def create_role_route():
    """Create a new role"""
    data = request.get_json()
    name = data.get('name')
    description = data.get('description')
    
    if not name:
        return jsonify({'error': 'Role name is required'}), 400
    
    result = create_role(name, description)
    
    if result['success']:
        return jsonify(result), 201
    else:
        return jsonify(result), 400


@bp.route('/roles', methods=['GET'])
@auth_required
@require_permission('role.read')
def list_roles_route():
    """List all roles with optional search"""
    search = request.args.get('search')
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    roles = list_roles(search, limit, offset)
    
    return jsonify({
        'success': True,
        'roles': roles,
        'count': len(roles)
    }), 200


@bp.route('/roles/<role_id>', methods=['GET'])
@auth_required
@require_permission('role.read')
def get_role_route(role_id):
    """Get a single role by ID with its permissions"""
    role = get_role_by_id(role_id)
    
    if not role:
        return jsonify({'error': 'Role not found'}), 404
    
    return jsonify({
        'success': True,
        'role': role
    }), 200


@bp.route('/roles/<role_id>', methods=['PUT'])
@auth_required
@require_permission('role.manage')
def update_role_route(role_id):
    """Update a role"""
    data = request.get_json()
    name = data.get('name')
    description = data.get('description')
    
    result = update_role(role_id, name, description)
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 400


@bp.route('/roles/<role_id>', methods=['DELETE'])
@auth_required
@require_permission('role.manage')
def delete_role_route(role_id):
    """Delete a role"""
    result = delete_role(role_id)
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 400


# ==================== ROLE-PERMISSION ASSIGNMENT ROUTES ====================

@bp.route('/roles/<role_id>/permissions', methods=['POST'])
@auth_required
@require_permission('role.manage')
def assign_permission_to_role_route(role_id):
    """Assign a permission to a role"""
    data = request.get_json()
    permission_id = data.get('permission_id')
    
    if not permission_id:
        return jsonify({'error': 'Permission ID is required'}), 400
    
    result = assign_permission_to_role(role_id, permission_id)
    
    if result['success']:
        return jsonify(result), 201
    else:
        return jsonify(result), 400


@bp.route('/roles/<role_id>/permissions/bulk', methods=['POST'])
@auth_required
@require_permission('role.manage')
def bulk_assign_permissions_route(role_id):
    """Assign multiple permissions to a role"""
    data = request.get_json()
    permission_ids = data.get('permission_ids', [])
    
    if not permission_ids:
        return jsonify({'error': 'Permission IDs are required'}), 400
    
    result = bulk_assign_permissions_to_role(role_id, permission_ids)
    
    return jsonify(result), 200


@bp.route('/roles/<role_id>/permissions/<permission_id>', methods=['DELETE'])
@auth_required
@require_permission('role.manage')
def remove_permission_from_role_route(role_id, permission_id):
    """Remove a permission from a role"""
    result = remove_permission_from_role(role_id, permission_id)
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 400


@bp.route('/roles/<role_id>/permissions', methods=['GET'])
@auth_required
@require_permission('role.read')
def get_role_permissions_route(role_id):
    """Get all permissions for a role"""
    permissions = get_role_permissions(role_id)
    
    return jsonify({
        'success': True,
        'permissions': permissions,
        'count': len(permissions)
    }), 200


# ==================== USER-ROLE ASSIGNMENT ROUTES ====================

@bp.route('/users/<user_id>/roles', methods=['POST'])
@auth_required
@require_permission('user.manage')
def assign_role_to_user_route(user_id):
    """Assign a role to a user"""
    data = request.get_json()
    role_id = data.get('role_id')
    
    if not role_id:
        return jsonify({'error': 'Role ID is required'}), 400
    
    result = assign_role_to_user(user_id, role_id)
    
    if result['success']:
        return jsonify(result), 201
    else:
        return jsonify(result), 400


@bp.route('/users/<user_id>/roles/bulk', methods=['POST'])
@auth_required
@require_permission('user.manage')
def bulk_assign_roles_route(user_id):
    """Assign multiple roles to a user"""
    data = request.get_json()
    role_ids = data.get('role_ids', [])
    
    if not role_ids:
        return jsonify({'error': 'Role IDs are required'}), 400
    
    result = bulk_assign_roles_to_user(user_id, role_ids)
    
    return jsonify(result), 200


@bp.route('/users/<user_id>/roles/<role_id>', methods=['DELETE'])
@auth_required
@require_permission('user.manage')
def remove_role_from_user_route(user_id, role_id):
    """Remove a role from a user"""
    result = remove_role_from_user(user_id, role_id)
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 400


@bp.route('/users/<user_id>/roles', methods=['GET'])
@auth_required
@require_permission('user.read')
def get_user_roles_route(user_id):
    """Get all roles for a user"""
    roles = get_user_roles(user_id)
    
    return jsonify({
        'success': True,
        'roles': roles,
        'count': len(roles)
    }), 200


@bp.route('/users/<user_id>/permissions', methods=['GET'])
@auth_required
@require_permission('user.read')
def get_user_permissions_route(user_id):
    """Get all permissions for a user (aggregated from roles)"""
    permissions = get_all_user_permissions(user_id)
    
    return jsonify({
        'success': True,
        'permissions': permissions,
        'count': len(permissions)
    }), 200


# ==================== CONVENIENCE ROUTES ====================

@bp.route('/roles/by-name/<role_name>/permissions', methods=['POST'])
@auth_required
@require_permission('role.manage')
def assign_permission_by_name_route(role_name):
    """Assign a permission to a role using names instead of IDs"""
    data = request.get_json()
    permission_name = data.get('permission_name')
    
    if not permission_name:
        return jsonify({'error': 'Permission name is required'}), 400
    
    result = assign_permission_to_role_by_name(role_name, permission_name)
    
    if result['success']:
        return jsonify(result), 201
    else:
        return jsonify(result), 400


@bp.route('/users/by-email/<email>/roles', methods=['POST'])
@auth_required
@require_permission('user.manage')
def assign_role_by_email_route(email):
    """Assign a role to a user using email and role name"""
    data = request.get_json()
    role_name = data.get('role_name')
    
    if not role_name:
        return jsonify({'error': 'Role name is required'}), 400
    
    result = assign_role_to_user_by_email(email, role_name)
    
    if result['success']:
        return jsonify(result), 201
    else:
        return jsonify(result), 400
