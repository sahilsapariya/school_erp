"""
Quick script to assign admin role to existing user and seed RBAC data.
Run this once to set up the system.

Usage:
    python setup_admin.py
"""

from app import app
from seed_rbac import seed_all
from rbac_helpers import assign_admin_role

def setup():
    """Setup RBAC system and assign admin role"""
    with app.app_context():
        print("\n" + "="*60)
        print("Setting up RBAC system...")
        print("="*60 + "\n")
        
        # Step 1: Seed roles and permissions
        print("Step 1: Seeding roles and permissions...")
        seed_all()
        
        # Step 2: Assign admin role to existing user
        print("\nStep 2: Assigning admin role to sahilsapariya03@gmail.com...")
        result = assign_admin_role('sahilsapariya03@gmail.com')
        
        if result['success']:
            print("✓ Admin role assigned successfully!")
        else:
            print(f"✗ Error: {result.get('error')}")
        
        print("\n" + "="*60)
        print("Setup complete! You can now login with admin access.")
        print("="*60 + "\n")

if __name__ == '__main__':
    setup()
