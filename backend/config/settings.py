"""
Application Settings

Production-grade configuration management using class-based configs.
Separates concerns between development and production environments.
"""

import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration shared across all environments"""
    
    # Application
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = False
    TESTING = False
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False
    
    # JWT Configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_MINUTES', 15)))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES_DAYS', 7)))
    JWT_ALGORITHM = 'HS256'
    
    # Password Reset
    RESET_TOKEN_EXP_MINUTES = int(os.getenv('RESET_TOKEN_EXP_MINUTES', 30))
    
    # Email Configuration
    MAIL_SERVER = os.getenv('MAIL_SERVER')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', MAIL_USERNAME)
    
    # URLs
    BACKEND_URL = os.getenv('BACKEND_URL', 'http://0.0.0.0:5001')
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'exp://192.168.1.1:8081')
    
    # RBAC
    DEFAULT_USER_ROLE = os.getenv('DEFAULT_USER_ROLE', 'Student')
    
    # CORS
    CORS_ORIGINS = ['*']  # Should be more restrictive in production
    CORS_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    CORS_ALLOW_HEADERS = ['Content-Type', 'Authorization', 'X-Refresh-Token']
    CORS_EXPOSE_HEADERS = ['X-New-Access-Token']
    CORS_SUPPORTS_CREDENTIALS = True
    
    # Pagination
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100


class DevelopmentConfig(Config):
    """Development environment configuration"""
    
    DEBUG = True
    SQLALCHEMY_ECHO = False  # Set to True to see SQL queries
    
    # Override URLs for development
    BACKEND_URL = os.getenv('BACKEND_URL_DEV', 'http://0.0.0.0:5001')
    FRONTEND_URL = os.getenv('FRONTEND_URL_DEV', f"exp://{os.getenv('LOCAL_IP', '192.168.1.1')}:8081")


class ProductionConfig(Config):
    """Production environment configuration"""
    
    DEBUG = False
    TESTING = False
    
    # Production must have these set
    BACKEND_URL = os.getenv('BACKEND_URL')  # Must be set in production
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'schoolerp://')
    
    # More restrictive CORS in production
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*').split(',')
    
    # Enforce secure settings
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    @classmethod
    def init_app(cls, app):
        """Production-specific initialization"""
        # Validate critical config
        if not cls.BACKEND_URL:
            raise ValueError("BACKEND_URL must be set in production")
        if cls.SECRET_KEY == 'dev-secret-key-change-in-production':
            raise ValueError("SECRET_KEY must be changed in production")


def is_production():
    """Check if running in production environment"""
    return os.getenv("FLASK_ENV", "development") == "production"


def get_backend_url():
    """Returns the backend API URL"""
    if is_production():
        return os.getenv("BACKEND_URL") or "https://api.yourapp.com"
    return os.getenv("BACKEND_URL_DEV") or "http://0.0.0.0:5001"


def get_frontend_url():
    """Returns the frontend/app URL for deep linking"""
    if is_production():
        return os.getenv("FRONTEND_URL") or "schoolerp://"
    
    frontend_url = os.getenv("FRONTEND_URL_DEV")
    if frontend_url:
        return frontend_url
    
    local_ip = os.getenv("LOCAL_IP")
    expo_port = os.getenv("EXPO_PORT") or "8081"
    return f"exp://{local_ip}:{expo_port}"


def get_reset_password_url(token: str, email: str) -> str:
    """Generates the password reset URL"""
    base_url = get_frontend_url()
    return f"{base_url}/--/reset-password?token={token}&email={email}"


def get_email_verification_url(token: str, email: str) -> str:
    """Generates the email verification URL"""
    base_url = get_backend_url()
    return f"{base_url}/api/auth/email/validate?token={token}&email={email}"


def get_app_verification_success_url(access_token: str, refresh_token: str, user_id: str, email: str) -> str:
    """Generates the app deep link URL for successful email verification"""
    base_url = get_frontend_url()
    return f"{base_url}/--/verify-email?status=success&access_token={access_token}&refresh_token={refresh_token}&user_id={user_id}&email={email}"


def get_app_verification_error_url(error: str) -> str:
    """Generates the app deep link URL for failed email verification"""
    base_url = get_frontend_url()
    return f"{base_url}/--/verify-email?status=error&error={error}"
