"""
Create Admin User Script

Creates an admin user and assigns the Admin role.

Usage:
    python -m backend.scripts.create_admin
"""

import getpass
from backend.app import create_app
from backend.modules.auth.models import User
from backend.modules.rbac.services import assign_role_to_user_by_email


def create_admin_user(email: str, password: str, name: str = None):
    """
    Create an admin user and assign Admin role.
    
    Args:
        email: Admin email
        password: Admin password
        name: Admin name (optional)
        
    Returns:
        Boolean indicating success
    """
    try:
        # Check if user already exists
        existing_user = User.get_user_by_email(email)
        if existing_user:
            print(f"✗ User with email {email} already exists!")
            return False
        
        # Create user
        user = User()
        user.email = email
        user.set_password(password)
        user.email_verified = True  # Auto-verify admin
        if name:
            user.name = name
        user.save()
        
        print(f"✓ User created: {email}")
        
        # Assign Admin role
        result = assign_role_to_user_by_email(email, 'Admin')
        if result['success']:
            print(f"✓ Admin role assigned to {email}")
            return True
        else:
            print(f"✗ Failed to assign Admin role: {result['error']}")
            return False
            
    except Exception as e:
        print(f"✗ Error creating admin user: {str(e)}")
        return False


def main():
    """Interactive admin user creation"""
    print("\n" + "="*60)
    print("🔐 Create Admin User")
    print("="*60 + "\n")
    
    # Get user input
    email = input("Enter admin email: ").strip()
    if not email:
        print("✗ Email is required")
        return
    
    password = getpass.getpass("Enter admin password: ")
    if not password:
        print("✗ Password is required")
        return
    
    confirm_password = getpass.getpass("Confirm password: ")
    if password != confirm_password:
        print("✗ Passwords do not match")
        return
    
    name = input("Enter admin name (optional): ").strip()
    
    # Create app and user
    app = create_app()
    with app.app_context():
        success = create_admin_user(email, password, name if name else None)
        
        if success:
            print("\n" + "="*60)
            print("✅ Admin user created successfully!")
            print("="*60)
            print(f"Email: {email}")
            print(f"Role: Admin")
            print("="*60 + "\n")
        else:
            print("\n✗ Failed to create admin user\n")


if __name__ == '__main__':
    main()
