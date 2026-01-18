"""
Database Seeding Script for RBAC System

This script creates initial roles and permissions for the School ERP system.
Run this once after creating the database tables to set up the RBAC foundation.

Usage:
    python seed_rbac.py
    
Or run from Flask shell:
    >>> from seed_rbac import seed_all
    >>> seed_all()
"""

from models import db
from auth.services.permissions import (
    create_permission, create_role,
    assign_permission_to_role_by_name,
    assign_role_to_user_by_email
)


def seed_permissions():
    """Create all standard permissions for the School ERP"""
    
    permissions = [
        # System Management
        ('system.manage', 'Full system access (super admin)'),
        
        # User Management
        ('user.create', 'Create new users'),
        ('user.read', 'Read user information'),
        ('user.update', 'Update user information'),
        ('user.delete', 'Delete users'),
        ('user.manage', 'Full user management access'),
        
        # Role Management
        ('role.create', 'Create new roles'),
        ('role.read', 'Read role information'),
        ('role.update', 'Update role information'),
        ('role.delete', 'Delete roles'),
        ('role.manage', 'Full role management access'),
        
        # Permission Management
        ('permission.create', 'Create new permissions'),
        ('permission.read', 'Read permission information'),
        ('permission.update', 'Update permission information'),
        ('permission.delete', 'Delete permissions'),
        ('permission.manage', 'Full permission management access'),
        
        # Attendance Management
        ('attendance.mark', 'Mark student attendance'),
        ('attendance.read.self', 'Read own attendance'),
        ('attendance.read.class', 'Read class attendance'),
        ('attendance.read.all', 'Read all attendance records'),
        ('attendance.update', 'Update attendance records'),
        ('attendance.delete', 'Delete attendance records'),
        ('attendance.manage', 'Full attendance management access'),
        
        # Student Management
        ('student.create', 'Create new students'),
        ('student.read', 'Read student information'),
        ('student.read.self', 'Read own student information'),
        ('student.update', 'Update student information'),
        ('student.update.self', 'Update own student information'),
        ('student.delete', 'Delete students'),
        ('student.manage', 'Full student management access'),
        
        # Grade Management
        ('grade.create', 'Create grades'),
        ('grade.read.self', 'Read own grades'),
        ('grade.read.class', 'Read class grades'),
        ('grade.read.all', 'Read all grades'),
        ('grade.update', 'Update grades'),
        ('grade.delete', 'Delete grades'),
        ('grade.manage', 'Full grade management access'),
        
        # Assignment Management
        ('assignment.create', 'Create assignments'),
        ('assignment.read.self', 'Read own assignments'),
        ('assignment.read.class', 'Read class assignments'),
        ('assignment.read.all', 'Read all assignments'),
        ('assignment.update', 'Update assignments'),
        ('assignment.delete', 'Delete assignments'),
        ('assignment.submit', 'Submit assignments'),
        ('assignment.manage', 'Full assignment management access'),
        
        # Profile Management
        ('profile.read.self', 'Read own profile'),
        ('profile.read.all', 'Read all profiles'),
        ('profile.update.self', 'Update own profile'),
        ('profile.update.all', 'Update any profile'),
        ('profile.manage', 'Full profile management access'),
        
        # Finance Management
        ('fee.create', 'Create fee records'),
        ('fee.read.self', 'Read own fee records'),
        ('fee.read.child', 'Read child fee records'),
        ('fee.read.all', 'Read all fee records'),
        ('fee.update', 'Update fee records'),
        ('fee.delete', 'Delete fee records'),
        ('fee.pay', 'Pay fees'),
        ('fee.manage', 'Full fee management access'),
        
        # Class Management
        ('class.create', 'Create classes'),
        ('class.read', 'Read class information'),
        ('class.update', 'Update class information'),
        ('class.delete', 'Delete classes'),
        ('class.manage', 'Full class management access'),
        
        # Report Management
        ('report.read.self', 'Read own reports'),
        ('report.read.class', 'Read class reports'),
        ('report.read.all', 'Read all reports'),
        ('report.generate', 'Generate reports'),
        ('report.manage', 'Full report management access'),
    ]
    
    print("Creating permissions...")
    created_count = 0
    
    for name, description in permissions:
        result = create_permission(name, description)
        if result['success']:
            print(f"  ✓ Created: {name}")
            created_count += 1
        else:
            print(f"  ✗ Failed: {name} - {result['error']}")
    
    print(f"\nCreated {created_count} permissions\n")
    return created_count


def seed_roles():
    """Create standard roles for the School ERP"""
    
    roles = [
        ('Admin', 'System administrator with full access'),
        ('Teacher', 'School teacher with class management access'),
        ('Student', 'Student with access to own academic information'),
        ('Parent', 'Parent with access to child information'),
        ('Staff', 'Administrative staff with limited access'),
    ]
    
    print("Creating roles...")
    created_count = 0
    
    for name, description in roles:
        result = create_role(name, description)
        if result['success']:
            print(f"  ✓ Created: {name}")
            created_count += 1
        else:
            print(f"  ✗ Failed: {name} - {result['error']}")
    
    print(f"\nCreated {created_count} roles\n")
    return created_count


def assign_admin_permissions():
    """Assign all management permissions to Admin role"""
    
    permissions = [
        'system.manage',
        'user.manage',
        'role.manage',
        'permission.manage',
        'attendance.manage',
        'student.manage',
        'grade.manage',
        'assignment.manage',
        'profile.manage',
        'fee.manage',
        'class.manage',
        'report.manage',
    ]
    
    print("Assigning permissions to Admin role...")
    assigned_count = 0
    
    for permission in permissions:
        result = assign_permission_to_role_by_name('Admin', permission)
        if result['success']:
            print(f"  ✓ Assigned: {permission}")
            assigned_count += 1
        else:
            print(f"  ✗ Failed: {permission} - {result.get('error', 'Unknown error')}")
    
    print(f"\nAssigned {assigned_count} permissions to Admin\n")
    return assigned_count


def assign_teacher_permissions():
    """Assign appropriate permissions to Teacher role"""
    
    permissions = [
        'attendance.mark',
        'attendance.read.class',
        'student.read',
        'grade.create',
        'grade.update',
        'grade.read.class',
        'assignment.manage',
        'class.read',
        'report.read.class',
        'report.generate',
        'profile.read.self',
        'profile.update.self',
    ]
    
    print("Assigning permissions to Teacher role...")
    assigned_count = 0
    
    for permission in permissions:
        result = assign_permission_to_role_by_name('Teacher', permission)
        if result['success']:
            print(f"  ✓ Assigned: {permission}")
            assigned_count += 1
        else:
            print(f"  ✗ Failed: {permission} - {result.get('error', 'Unknown error')}")
    
    print(f"\nAssigned {assigned_count} permissions to Teacher\n")
    return assigned_count


def assign_student_permissions():
    """Assign appropriate permissions to Student role"""
    
    permissions = [
        'attendance.read.self',
        'student.read.self',
        'student.update.self',
        'grade.read.self',
        'assignment.read.self',
        'assignment.submit',
        'profile.read.self',
        'profile.update.self',
        'report.read.self',
        'fee.read.self',
    ]
    
    print("Assigning permissions to Student role...")
    assigned_count = 0
    
    for permission in permissions:
        result = assign_permission_to_role_by_name('Student', permission)
        if result['success']:
            print(f"  ✓ Assigned: {permission}")
            assigned_count += 1
        else:
            print(f"  ✗ Failed: {permission} - {result.get('error', 'Unknown error')}")
    
    print(f"\nAssigned {assigned_count} permissions to Student\n")
    return assigned_count


def assign_parent_permissions():
    """Assign appropriate permissions to Parent role"""
    
    permissions = [
        'attendance.read.child',
        'student.read',
        'grade.read.child',
        'assignment.read.class',
        'profile.read.self',
        'profile.update.self',
        'report.read.child',
        'fee.read.child',
        'fee.pay',
    ]
    
    print("Assigning permissions to Parent role...")
    assigned_count = 0
    
    for permission in permissions:
        result = assign_permission_to_role_by_name('Parent', permission)
        if result['success']:
            print(f"  ✓ Assigned: {permission}")
            assigned_count += 1
        else:
            print(f"  ✗ Failed: {permission} - {result.get('error', 'Unknown error')}")
    
    print(f"\nAssigned {assigned_count} permissions to Parent\n")
    return assigned_count


def assign_staff_permissions():
    """Assign appropriate permissions to Staff role"""
    
    permissions = [
        'student.read',
        'class.read',
        'profile.read.self',
        'profile.update.self',
        'fee.read.all',
        'fee.update',
    ]
    
    print("Assigning permissions to Staff role...")
    assigned_count = 0
    
    for permission in permissions:
        result = assign_permission_to_role_by_name('Staff', permission)
        if result['success']:
            print(f"  ✓ Assigned: {permission}")
            assigned_count += 1
        else:
            print(f"  ✗ Failed: {permission} - {result.get('error', 'Unknown error')}")
    
    print(f"\nAssigned {assigned_count} permissions to Staff\n")
    return assigned_count


def seed_all():
    """Run all seeding functions"""
    
    print("=" * 60)
    print("Starting RBAC Database Seeding")
    print("=" * 60)
    print()
    
    # Create permissions
    perm_count = seed_permissions()
    
    # Create roles
    role_count = seed_roles()
    
    # Assign permissions to roles
    admin_count = assign_admin_permissions()
    teacher_count = assign_teacher_permissions()
    student_count = assign_student_permissions()
    parent_count = assign_parent_permissions()
    staff_count = assign_staff_permissions()
    
    print("=" * 60)
    print("RBAC Seeding Complete!")
    print("=" * 60)
    print(f"Permissions created: {perm_count}")
    print(f"Roles created: {role_count}")
    print(f"Admin permissions: {admin_count}")
    print(f"Teacher permissions: {teacher_count}")
    print(f"Student permissions: {student_count}")
    print(f"Parent permissions: {parent_count}")
    print(f"Staff permissions: {staff_count}")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Assign roles to users using assign_role_to_user_by_email()")
    print("2. Users can now login and will receive their permissions")
    print()


if __name__ == '__main__':
    # This allows running the script directly
    # Make sure Flask app context is available
    print("\nTo run this seeding script:")
    print("1. Start Python shell: python")
    print("2. Import app and create context:")
    print("   >>> from app import app")
    print("   >>> with app.app_context():")
    print("   ...     from seed_rbac import seed_all")
    print("   ...     seed_all()")
    print()
