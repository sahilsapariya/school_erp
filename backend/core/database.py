"""
Database Module

Centralized database instance and utility functions.
"""

from flask_sqlalchemy import SQLAlchemy

# Initialize SQLAlchemy instance
# This will be initialized with the app in the application factory
db = SQLAlchemy()


def init_db(app):
    """
    Initialize database with Flask app.
    
    Args:
        app: Flask application instance
    """
    db.init_app(app)
    
    with app.app_context():
        # Import all models to ensure they are registered with SQLAlchemy
        # This is needed before db.create_all()
        from backend.modules.auth.models import User, Session
        from backend.modules.rbac.models import Role, Permission, RolePermission, UserRole
        
        # Create all tables
        db.create_all()


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
