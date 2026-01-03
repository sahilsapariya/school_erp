import os
from dotenv import load_dotenv

load_dotenv()


def is_production():
    return os.getenv("FLASK_ENV", "development") == "production"


def get_app_url():
    """
    Returns the base URL for the app.
    - In development: Uses local IP or localhost
    - In production: Uses the production domain
    """
    if is_production():
        return os.getenv("APP_URL", "https://yourapp.com")
    return os.getenv("APP_URL_DEV", "http://localhost:5001")


def get_app_scheme():
    """
    Returns the app's URL scheme for deep linking.
    For Expo apps, this is typically 'exp' in dev or your custom scheme in production.
    """
    if is_production():
        return os.getenv("APP_SCHEME", "yourapp")
    return os.getenv("APP_SCHEME_DEV", "exp")


def get_reset_password_url(token: str, email: str) -> str:
    """
    Generates the password reset URL.
    For mobile apps, this creates a deep link that opens the reset-password screen.
    """
    base_url = get_app_url()
    return f"{base_url}/reset-password?token={token}&email={email}"


def get_email_verification_url(token: str, email: str) -> str:
    """
    Generates the email verification URL.
    This points to the backend API endpoint that handles verification.
    """
    base_url = get_app_url()
    return f"{base_url}/api/auth/email/validate?token={token}&email={email}"

