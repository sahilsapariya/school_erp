import os
from dotenv import load_dotenv

load_dotenv()


def is_production():
    return os.getenv("FLASK_ENV", "development") == "production"


def get_backend_url():
    """
    Returns the backend API URL.
    Used for endpoints that need to be called directly (like email verification).
    """
    if is_production():
        return os.getenv("BACKEND_URL") or "https://api.yourapp.com"
    return os.getenv("BACKEND_URL_DEV") or "http://0.0.0.0:5001"


def get_frontend_url():
    """
    Returns the frontend/app URL for deep linking.
    - For Expo Go in dev: exp://YOUR_IP:8081
    - For production: Your custom scheme (schoolerp://)
    """
    if is_production():
        return os.getenv("FRONTEND_URL") or "schoolerp://"
    
    # Check if explicitly set in env
    frontend_url = os.getenv("FRONTEND_URL_DEV")
    if frontend_url:
        return frontend_url
    
    # Build Expo Go deep link: exp://IP:PORT
    local_ip = os.getenv("LOCAL_IP") or "10.70.93.240"
    expo_port = os.getenv("EXPO_PORT") or "8081"
    return f"exp://{local_ip}:{expo_port}"


def get_reset_password_url(token: str, email: str) -> str:
    """
    Generates the password reset URL.
    This should open the app's reset-password screen.
    """
    base_url = get_frontend_url()
    return f"{base_url}/--/reset-password?token={token}&email={email}"


def get_email_verification_url(token: str, email: str) -> str:
    """
    Generates the email verification URL.
    This points to the backend API endpoint that handles verification.
    """
    base_url = get_backend_url()
    return f"{base_url}/api/auth/email/validate?token={token}&email={email}"
