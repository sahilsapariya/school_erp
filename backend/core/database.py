"""
Database Module

Centralized database instance, Flask-Migrate, and utility functions.
Schema is managed via migrations (flask db upgrade); db.create_all() is not called on init.
"""

from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

# Initialize SQLAlchemy instance
# This will be initialized with the app in the application factory
db = SQLAlchemy()
migrate = Migrate()


def init_db(app):
    """
    Initialize database and migrations with Flask app.
    Tables are created/updated by running: flask db upgrade

    Args:
        app: Flask application instance
    """
    db.init_app(app)
    migrate.init_app(app, db, directory="backend/migrations")

    with app.app_context():
        from backend.modules.auth.models import User, Session
        from backend.modules.rbac.models import Role, Permission, RolePermission, UserRole
        from backend.modules.students.models import Student
        from backend.modules.classes.models import Class, ClassTeacher
        from backend.modules.teachers.models import Teacher
        from backend.modules.attendance.models import Attendance


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
