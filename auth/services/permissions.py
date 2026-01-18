"""
Permission Management Service

This module provides functions for managing roles and permissions.
These are intended for admin/management interfaces and CRUD operations.

For RBAC authorization logic, see: auth/services/rbac_service.py
For permission decorator, see: auth/utils/permissions.py

Usage: Import these functions in admin routes to manage the RBAC system.
"""

from typing import List, Dict, Optional
from models import db, User, Roles, Permissions, UserRoles, RolePermissions
from sqlalchemy.exc import IntegrityError


# ==================== PERMISSION CRUD ====================

def create_permission(name: str, description: str = None) -> Dict:
    """
    Create a new permission.
    
    Args:
        name: Permission name (e.g., 'attendance.mark')
        description: Optional description of what this permission allows
        
    Returns:
        Dict with success status and permission data or error message
        
    Example:
        >>> result = create_permission('attendance.mark', 'Mark student attendance')
        >>> print(result)
        {'success': True, 'permission': {'id': '...', 'name': 'attendance.mark'}}
    """
    try:
        # Check if permission already exists
        existing = Permissions.query.filter_by(name=name).first()
        if existing:
            return {
                'success': False,
                'error': 'Permission already exists',
                'permission': None
            }
        
        # Create new permission
        permission = Permissions(name=name, description=description)
        permission.save()
        
        return {
            'success': True,
            'permission': {
                'id': permission.id,
                'name': permission.name,
                'description': permission.description,
                'created_at': permission.created_at.isoformat()
            }
        }
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'error': str(e),
            'permission': None
        }


def list_permissions(search: str = None, limit: int = 100, offset: int = 0) -> List[Dict]:
    """
    List all permissions with optional search and pagination.
    
    Args:
        search: Optional search string to filter by name
        limit: Maximum number of results (default 100)
        offset: Number of results to skip (default 0)
        
    Returns:
        List of permission dictionaries
        
    Example:
        >>> permissions = list_permissions(search='attendance')
        >>> print(permissions)
        [{'id': '...', 'name': 'attendance.mark', ...}, ...]
    """
    query = Permissions.query
    
    if search:
        query = query.filter(Permissions.name.ilike(f'%{search}%'))
    
    permissions = query.limit(limit).offset(offset).all()
    
    return [{
        'id': p.id,
        'name': p.name,
        'description': p.description,
        'created_at': p.created_at.isoformat()
    } for p in permissions]


def get_permission_by_id(permission_id: str) -> Optional[Dict]:
    """
    Get a single permission by ID.
    
    Args:
        permission_id: The UUID of the permission
        
    Returns:
        Permission dictionary or None if not found
    """
    permission = Permissions.query.get(permission_id)
    if not permission:
        return None
    
    return {
        'id': permission.id,
        'name': permission.name,
        'description': permission.description,
        'created_at': permission.created_at.isoformat()
    }


def get_permission_by_name(name: str) -> Optional[Dict]:
    """
    Get a single permission by name.
    
    Args:
        name: The name of the permission
        
    Returns:
        Permission dictionary or None if not found
    """
    permission = Permissions.query.filter_by(name=name).first()
    if not permission:
        return None
    
    return {
        'id': permission.id,
        'name': permission.name,
        'description': permission.description,
        'created_at': permission.created_at.isoformat()
    }


def update_permission(permission_id: str, name: str = None, description: str = None) -> Dict:
    """
    Update an existing permission.
    
    Args:
        permission_id: The UUID of the permission to update
        name: New name (optional)
        description: New description (optional)
        
    Returns:
        Dict with success status and updated permission data
    """
    try:
        permission = Permissions.query.get(permission_id)
        if not permission:
            return {
                'success': False,
                'error': 'Permission not found'
            }
        
        if name:
            permission.name = name
        if description is not None:
            permission.description = description
        
        permission.save()
        
        return {
            'success': True,
            'permission': {
                'id': permission.id,
                'name': permission.name,
                'description': permission.description
            }
        }
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'error': str(e)
        }


def delete_permission(permission_id: str) -> Dict:
    """
    Delete a permission and remove all role associations.
    
    Args:
        permission_id: The UUID of the permission to delete
        
    Returns:
        Dict with success status
        
    Warning:
        This will remove the permission from all roles that have it.
    """
    try:
        permission = Permissions.query.get(permission_id)
        if not permission:
            return {
                'success': False,
                'error': 'Permission not found'
            }
        
        # Delete all role_permissions entries (cascade should handle this)
        db.session.delete(permission)
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Permission deleted successfully'
        }
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'error': str(e)
        }


# ==================== ROLE CRUD ====================

def create_role(name: str, description: str = None) -> Dict:
    """
    Create a new role.
    
    Args:
        name: Role name (e.g., 'Teacher', 'Student', 'Admin')
        description: Optional description of the role
        
    Returns:
        Dict with success status and role data or error message
        
    Example:
        >>> result = create_role('Teacher', 'School teacher with class management access')
        >>> print(result)
        {'success': True, 'role': {'id': '...', 'name': 'Teacher'}}
    """
    try:
        # Check if role already exists
        existing = Roles.query.filter_by(name=name).first()
        if existing:
            return {
                'success': False,
                'error': 'Role already exists',
                'role': None
            }
        
        # Create new role
        role = Roles(name=name, description=description)
        role.save()
        
        return {
            'success': True,
            'role': {
                'id': role.id,
                'name': role.name,
                'description': role.description,
                'created_at': role.created_at.isoformat()
            }
        }
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'error': str(e),
            'role': None
        }


def list_roles(search: str = None, limit: int = 100, offset: int = 0) -> List[Dict]:
    """
    List all roles with optional search and pagination.
    
    Args:
        search: Optional search string to filter by name
        limit: Maximum number of results (default 100)
        offset: Number of results to skip (default 0)
        
    Returns:
        List of role dictionaries
    """
    query = Roles.query
    
    if search:
        query = query.filter(Roles.name.ilike(f'%{search}%'))
    
    roles = query.limit(limit).offset(offset).all()
    
    return [{
        'id': r.id,
        'name': r.name,
        'description': r.description,
        'created_at': r.created_at.isoformat(),
        'permission_count': len(r.permissions)
    } for r in roles]


def get_role_by_id(role_id: str) -> Optional[Dict]:
    """
    Get a single role by ID with its permissions.
    
    Args:
        role_id: The UUID of the role
        
    Returns:
        Role dictionary with permissions list or None if not found
    """
    role = Roles.query.get(role_id)
    if not role:
        return None
    
    return {
        'id': role.id,
        'name': role.name,
        'description': role.description,
        'created_at': role.created_at.isoformat(),
        'permissions': [p.name for p in role.permissions]
    }


def get_role_by_name(name: str) -> Optional[Dict]:
    """
    Get a single role by name with its permissions.
    
    Args:
        name: The name of the role
        
    Returns:
        Role dictionary with permissions list or None if not found
    """
    role = Roles.query.filter_by(name=name).first()
    if not role:
        return None
    
    return {
        'id': role.id,
        'name': role.name,
        'description': role.description,
        'created_at': role.created_at.isoformat(),
        'permissions': [p.name for p in role.permissions]
    }


def update_role(role_id: str, name: str = None, description: str = None) -> Dict:
    """
    Update an existing role.
    
    Args:
        role_id: The UUID of the role to update
        name: New name (optional)
        description: New description (optional)
        
    Returns:
        Dict with success status and updated role data
    """
    try:
        role = Roles.query.get(role_id)
        if not role:
            return {
                'success': False,
                'error': 'Role not found'
            }
        
        if name:
            role.name = name
        if description is not None:
            role.description = description
        
        role.save()
        
        return {
            'success': True,
            'role': {
                'id': role.id,
                'name': role.name,
                'description': role.description
            }
        }
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'error': str(e)
        }


def delete_role(role_id: str) -> Dict:
    """
    Delete a role and remove all user and permission associations.
    
    Args:
        role_id: The UUID of the role to delete
        
    Returns:
        Dict with success status
        
    Warning:
        This will remove the role from all users that have it.
    """
    try:
        role = Roles.query.get(role_id)
        if not role:
            return {
                'success': False,
                'error': 'Role not found'
            }
        
        # Delete role (cascade should handle user_roles and role_permissions)
        db.session.delete(role)
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Role deleted successfully'
        }
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'error': str(e)
        }


# ==================== ROLE-PERMISSION MANAGEMENT ====================

def assign_permission_to_role(role_id: str, permission_id: str) -> Dict:
    """
    Assign a permission to a role.
    
    Args:
        role_id: The UUID of the role
        permission_id: The UUID of the permission
        
    Returns:
        Dict with success status
        
    Example:
        >>> result = assign_permission_to_role(role_id, permission_id)
        >>> print(result)
        {'success': True, 'message': 'Permission assigned to role'}
    """
    try:
        role = Roles.query.get(role_id)
        if not role:
            return {'success': False, 'error': 'Role not found'}
        
        permission = Permissions.query.get(permission_id)
        if not permission:
            return {'success': False, 'error': 'Permission not found'}
        
        # Check if already assigned
        existing = RolePermissions.query.filter_by(
            role_id=role_id,
            permission_id=permission_id
        ).first()
        
        if existing:
            return {
                'success': False,
                'error': 'Permission already assigned to this role'
            }
        
        # Create association
        role_permission = RolePermissions(
            role_id=role_id,
            permission_id=permission_id
        )
        role_permission.save()
        
        return {
            'success': True,
            'message': f'Permission "{permission.name}" assigned to role "{role.name}"'
        }
    except IntegrityError:
        db.session.rollback()
        return {
            'success': False,
            'error': 'Permission already assigned to this role'
        }
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'error': str(e)
        }


def assign_permission_to_role_by_name(role_name: str, permission_name: str) -> Dict:
    """
    Assign a permission to a role by their names (convenience function).
    
    Args:
        role_name: The name of the role
        permission_name: The name of the permission
        
    Returns:
        Dict with success status
    """
    role = Roles.query.filter_by(name=role_name).first()
    if not role:
        return {'success': False, 'error': f'Role "{role_name}" not found'}
    
    permission = Permissions.query.filter_by(name=permission_name).first()
    if not permission:
        return {'success': False, 'error': f'Permission "{permission_name}" not found'}
    
    return assign_permission_to_role(role.id, permission.id)


def remove_permission_from_role(role_id: str, permission_id: str) -> Dict:
    """
    Remove a permission from a role.
    
    Args:
        role_id: The UUID of the role
        permission_id: The UUID of the permission
        
    Returns:
        Dict with success status
    """
    try:
        role_permission = RolePermissions.query.filter_by(
            role_id=role_id,
            permission_id=permission_id
        ).first()
        
        if not role_permission:
            return {
                'success': False,
                'error': 'Permission not assigned to this role'
            }
        
        db.session.delete(role_permission)
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Permission removed from role'
        }
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'error': str(e)
        }


def get_role_permissions(role_id: str) -> List[Dict]:
    """
    Get all permissions for a specific role.
    
    Args:
        role_id: The UUID of the role
        
    Returns:
        List of permission dictionaries
    """
    role = Roles.query.get(role_id)
    if not role:
        return []
    
    return [{
        'id': p.id,
        'name': p.name,
        'description': p.description
    } for p in role.permissions]


# ==================== USER-ROLE MANAGEMENT ====================

def assign_role_to_user(user_id: str, role_id: str) -> Dict:
    """
    Assign a role to a user.
    
    Args:
        user_id: The UUID of the user
        role_id: The UUID of the role
        
    Returns:
        Dict with success status
        
    Example:
        >>> result = assign_role_to_user(user_id, teacher_role_id)
        >>> print(result)
        {'success': True, 'message': 'Role assigned to user'}
    """
    try:
        user = User.query.get(user_id)
        if not user:
            return {'success': False, 'error': 'User not found'}
        
        role = Roles.query.get(role_id)
        if not role:
            return {'success': False, 'error': 'Role not found'}
        
        # Check if already assigned
        existing = UserRoles.query.filter_by(
            user_id=user_id,
            role_id=role_id
        ).first()
        
        if existing:
            return {
                'success': False,
                'error': 'Role already assigned to this user'
            }
        
        # Create association
        user_role = UserRoles(user_id=user_id, role_id=role_id)
        user_role.save()
        
        return {
            'success': True,
            'message': f'Role "{role.name}" assigned to user {user.email}'
        }
    except IntegrityError:
        db.session.rollback()
        return {
            'success': False,
            'error': 'Role already assigned to this user'
        }
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'error': str(e)
        }


def assign_role_to_user_by_email(email: str, role_name: str) -> Dict:
    """
    Assign a role to a user by email and role name (convenience function).
    
    Args:
        email: The email of the user
        role_name: The name of the role
        
    Returns:
        Dict with success status
    """
    user = User.query.filter_by(email=email).first()
    if not user:
        return {'success': False, 'error': f'User with email "{email}" not found'}
    
    role = Roles.query.filter_by(name=role_name).first()
    if not role:
        return {'success': False, 'error': f'Role "{role_name}" not found'}
    
    return assign_role_to_user(user.id, role.id)


def remove_role_from_user(user_id: str, role_id: str) -> Dict:
    """
    Remove a role from a user.
    
    Args:
        user_id: The UUID of the user
        role_id: The UUID of the role
        
    Returns:
        Dict with success status
    """
    try:
        user_role = UserRoles.query.filter_by(
            user_id=user_id,
            role_id=role_id
        ).first()
        
        if not user_role:
            return {
                'success': False,
                'error': 'Role not assigned to this user'
            }
        
        db.session.delete(user_role)
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Role removed from user'
        }
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'error': str(e)
        }


def get_user_roles(user_id: str) -> List[Dict]:
    """
    Get all roles for a specific user.
    
    Args:
        user_id: The UUID of the user
        
    Returns:
        List of role dictionaries
    """
    user = User.query.get(user_id)
    if not user:
        return []
    
    return [{
        'id': r.id,
        'name': r.name,
        'description': r.description
    } for r in user.roles]


# ==================== BULK OPERATIONS ====================

def bulk_assign_permissions_to_role(role_id: str, permission_ids: List[str]) -> Dict:
    """
    Assign multiple permissions to a role at once.
    
    Args:
        role_id: The UUID of the role
        permission_ids: List of permission UUIDs
        
    Returns:
        Dict with success status and count of assignments
    """
    try:
        role = Roles.query.get(role_id)
        if not role:
            return {'success': False, 'error': 'Role not found'}
        
        assigned_count = 0
        errors = []
        
        for permission_id in permission_ids:
            result = assign_permission_to_role(role_id, permission_id)
            if result['success']:
                assigned_count += 1
            else:
                errors.append(result['error'])
        
        return {
            'success': True,
            'assigned_count': assigned_count,
            'total': len(permission_ids),
            'errors': errors if errors else None
        }
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'error': str(e)
        }


def bulk_assign_roles_to_user(user_id: str, role_ids: List[str]) -> Dict:
    """
    Assign multiple roles to a user at once.
    
    Args:
        user_id: The UUID of the user
        role_ids: List of role UUIDs
        
    Returns:
        Dict with success status and count of assignments
    """
    try:
        user = User.query.get(user_id)
        if not user:
            return {'success': False, 'error': 'User not found'}
        
        assigned_count = 0
        errors = []
        
        for role_id in role_ids:
            result = assign_role_to_user(user_id, role_id)
            if result['success']:
                assigned_count += 1
            else:
                errors.append(result['error'])
        
        return {
            'success': True,
            'assigned_count': assigned_count,
            'total': len(role_ids),
            'errors': errors if errors else None
        }
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'error': str(e)
        }


# ==================== UTILITY FUNCTIONS ====================

def check_user_permission(user_id: str, permission_name: str) -> bool:
    """
    Check if a user has a specific permission (wrapper for RBAC service).
    
    This is a convenience function that wraps the RBAC service function.
    For actual authorization in decorators, use auth/services/rbac_service.py
    
    Args:
        user_id: The UUID of the user
        permission_name: The permission to check
        
    Returns:
        True if user has the permission, False otherwise
    """
    from auth.services.rbac_service import has_permission
    return has_permission(user_id, permission_name)


def get_all_user_permissions(user_id: str) -> List[str]:
    """
    Get all permissions for a user (wrapper for RBAC service).
    
    This is a convenience function that wraps the RBAC service function.
    
    Args:
        user_id: The UUID of the user
        
    Returns:
        List of permission name strings
    """
    from auth.services.rbac_service import get_user_permissions
    return get_user_permissions(user_id)
