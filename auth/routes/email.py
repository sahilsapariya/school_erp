from flask import Blueprint, request, jsonify, redirect
from urllib.parse import quote
from models import User
from auth.routes.login import create_login_session
from mailer.mail import send_email
from config import get_app_verification_success_url, get_app_verification_error_url
from auth.services.rbac_service import get_user_permissions


bp = Blueprint('email', __name__)

@bp.route('/email/validate', methods=['GET'])
def validate_token():
    token = request.args.get('token')
    email = request.args.get('email')

    if not token:
        return redirect(get_app_verification_error_url(quote('Token is required')))
    
    if not email:
        return redirect(get_app_verification_error_url(quote('Email is required')))

    user = User.get_user_by_email(email)
    
    if not user:
        return redirect(get_app_verification_error_url(quote('User not found')))
    
    if user.email_verified:
        # Already verified - redirect to success (they can login from there)
        return redirect(get_app_verification_error_url(quote('Email already verified. Please login.')))
    
    if user.verification_token != token:
        return redirect(get_app_verification_error_url(quote('Invalid or expired token')))
    
    user.verification_token = None
    user.email_verified = True
    user.save()

    features = [
        "Access to exclusive content",
        "Personalized recommendations",
        "Priority customer support",
    ]
    send_email(
        to_email=email,
        template_name="register.html",
        context={
            "email": email,
            "features": features
        }
    )

    # Check user permissions before creating login session
    # Enforce same rule as regular login: users with zero permissions cannot access system
    permissions = get_user_permissions(user.id)
    
    if not permissions or len(permissions) == 0:
        # Redirect to error page - user verified but has no permissions assigned
        return redirect(get_app_verification_error_url(
            quote('Email verified successfully, but no permissions assigned. Contact administrator.')
        ))

    access_token, refresh_token = create_login_session(user, request)

    # Redirect to app with tokens
    return redirect(get_app_verification_success_url(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        email=user.email
    ))
