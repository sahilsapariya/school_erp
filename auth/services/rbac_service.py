"""
RBAC Service Module

This module provides centralized Role-Based Access Control (RBAC) logic.
All permission-related queries and checks are isolated here to maintain
clean architecture and reusability across the application.

Design Rules:
- Never check role names in business logic
- Always use permissions for authorization
- Permissions follow the convention: <resource>.<action>[.<scope>]
- The 'manage' permission for a resource implies all actions on that resource
"""

from typing import List, Optional
from models import User, Roles, db
from sqlalchemy.orm import joinedload


def get_user_permissions(user_id: str) -> List[str]:
    """
    Fetch all unique permissions for a user by traversing their roles.
    
    This function queries the user and eagerly loads their roles and permissions
    using SQLAlchemy relationships: User -> UserRoles -> Roles -> RolePermissions -> Permissions
    
    Args:
        user_id: The UUID string of the user
        
    Returns:
        A sorted list of unique permission name strings (e.g., ['attendance.mark', 'student.read'])
        Returns empty list if user not found or has no permissions
        
    Example:
        >>> permissions = get_user_permissions('user-uuid-123')
        >>> print(permissions)
        ['attendance.mark', 'attendance.read.class', 'student.read']
    """
    # Query user with eager loading of roles and their permissions
    # This prevents N+1 query problem by loading all related data in one query
    user = User.query.options(
        joinedload(User.roles).joinedload(Roles.permissions)
    ).filter_by(id=user_id).first()
    
    # If user not found, return empty list
    if not user:
        return []
    
    # Collect all unique permission names across all roles
    # Using a set to automatically handle duplicates when a permission
    # is assigned to multiple roles that the user has
    permission_names = set()
    
    for role in user.roles:
        for permission in role.permissions:
            permission_names.add(permission.name)
    
    # Return sorted list for consistency in responses and easier debugging
    return sorted(list(permission_names))


def has_permission(user_id: str, permission_name: str) -> bool:
    """
    Check if a user has a specific permission or its hierarchical equivalent.
    
    This function implements the hierarchical permission rule:
    - If user has the exact permission, return True
    - If user has '<resource>.manage', they have all permissions for that resource
    
    Args:
        user_id: The UUID string of the user
        permission_name: The permission to check (e.g., 'attendance.read.self')
        
    Returns:
        True if user has the permission or the manage permission for that resource
        False otherwise
        
    Example:
        >>> # User has 'attendance.manage'
        >>> has_permission('user-123', 'attendance.mark')
        True
        >>> has_permission('user-123', 'attendance.read.self')
        True
        >>> has_permission('user-123', 'student.create')
        False
    """
    # Get all permissions for the user
    user_permissions = get_user_permissions(user_id)
    
    # Check for exact permission match
    if permission_name in user_permissions:
        return True
    
    # Check for hierarchical 'manage' permission
    # Extract resource name from permission (e.g., 'attendance' from 'attendance.read.self')
    resource = parse_resource_from_permission(permission_name)
    manage_permission = f"{resource}.manage"
    
    # If user has resource.manage, they can do anything with that resource
    if manage_permission in user_permissions:
        return True
    
    return False


def parse_resource_from_permission(permission: str) -> str:
    """
    Extract the resource name from a permission string.
    
    Permissions follow the format: <resource>.<action>[.<scope>]
    This function extracts the resource (first part before the dot).
    
    Args:
        permission: Permission string (e.g., 'attendance.read.self')
        
    Returns:
        The resource name (e.g., 'attendance')
        Returns the full permission string if no dot is found (edge case)
        
    Example:
        >>> parse_resource_from_permission('attendance.read.self')
        'attendance'
        >>> parse_resource_from_permission('student.create')
        'student'
        >>> parse_resource_from_permission('admin')
        'admin'
    """
    # Split on first dot and return the resource part
    # If no dot exists (single-part permission), return as-is
    parts = permission.split('.', 1)
    return parts[0]


def check_user_has_any_permissions(user_id: str) -> bool:
    """
    Check if a user has at least one permission assigned.
    
    This is used during login to enforce the security rule that users
    with zero permissions should not be allowed to access the system.
    
    Args:
        user_id: The UUID string of the user
        
    Returns:
        True if user has at least one permission, False otherwise
        
    Example:
        >>> check_user_has_any_permissions('user-with-role')
        True
        >>> check_user_has_any_permissions('user-without-role')
        False
    """
    permissions = get_user_permissions(user_id)
    return len(permissions) > 0
