"""
Authentication Routes

API endpoints for user authentication, registration, and account management.

Routes:
- POST /register - Register new user
- POST /login - Login user
- POST /logout - Logout user
- GET /email/validate - Validate email verification token
- POST /password/forgot - Request password reset
- POST /password/reset - Reset password with token
"""

from flask import request, jsonify, redirect, g
from urllib.parse import quote
import os

from . import auth_bp
from .models import User, Session
from .services import (
    authenticate_user,
    generate_access_token,
    create_session,
    logout_user as logout_user_service
)
from backend.core.decorators import auth_required
from backend.core.database import db
from backend.shared.helpers import success_response, error_response


# ==================== REGISTRATION ====================

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Register a new user.
    
    Request Body:
        - email: User email (required)
        - password: User password (required)
        - name: User name (optional)
        
    Returns:
        201: User created successfully
        400: Validation error or user already exists
    """
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')

    # Validation
    if not email or not password:
        return error_response(
            error='ValidationError',
            message='Email and password are required',
            status_code=400
        )
    
    # Check if user already exists
    if User.get_user_by_email(email):
        return error_response(
            error='UserExists',
            message='User already exists',
            status_code=400
        )

    # Create user
    user = User()
    user.email = email
    user.set_password(password)
    if name:
        user.name = name

    # Generate email verification token
    email_verification_token = user.generate_email_verification_token()
    user.save()

    # Auto-assign default role (handled by RBAC module)
    from backend.modules.rbac.services import assign_role_to_user_by_email
    default_role = os.getenv("DEFAULT_USER_ROLE", "Student")
    assign_result = assign_role_to_user_by_email(email, default_role)
    
    if not assign_result['success']:
        # Log warning but don't fail registration
        print(f"Warning: Could not assign default role to {email}: {assign_result.get('error')}")

    # Send verification email
    from backend.modules.mailer.service import send_template_email
    from backend.config.settings import get_email_verification_url
    
    verify_url = get_email_verification_url(email_verification_token, email)
    send_template_email(
        to_email=email,
        template_name="email_verification.html",
        context={"verify_url": verify_url}
    )

    return success_response(
        data={'email': email},
        message=f'User {email} registered successfully! Please verify your email.',
        status_code=201
    )


# ==================== LOGIN ====================

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Login user with email and password.
    
    Request Body:
        - email: User email (required)
        - password: User password (required)
        
    Returns:
        200: Login successful with tokens and user data
        400: Missing credentials
        401: Invalid credentials or email not verified
        403: User has no permissions
    """
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    # Validation
    if not email or not password:
        return error_response(
            error='ValidationError',
            message='Email and password are required',
            status_code=400
        )

    # Authenticate user
    user = authenticate_user(email, password)
    if not user:
        return error_response(
            error='InvalidCredentials',
            message='Invalid email or password',
            status_code=401
        )

    # Check if email is verified
    if not user.email_verified:
        return error_response(
            error='EmailNotVerified',
            message='Please verify your email before logging in',
            status_code=401
        )

    # Check if user has any permissions (RBAC requirement)
    from backend.modules.rbac.services import get_user_permissions
    permissions = get_user_permissions(user.id)
    
    if not permissions or len(permissions) == 0:
        return error_response(
            error='NoPermissions',
            message='No permissions assigned. Contact administrator.',
            status_code=403
        )

    # Update last login
    from datetime import datetime
    user.last_login_at = datetime.utcnow()
    user.save()

    # Create session and generate tokens
    access_token = generate_access_token(user)
    session = create_session(user, request)

    return success_response(
        data={
            'access_token': access_token,
            'refresh_token': session.refresh_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'email_verified': user.email_verified,
                'profile_picture_url': user.profile_picture_url
            },
            'permissions': permissions
        },
        message='Login successful',
        status_code=200
    )


# ==================== LOGOUT ====================

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    Logout user by revoking the session.
    
    Headers:
        - X-Refresh-Token: Refresh token (required)
        
    Returns:
        200: Logout successful
        400: Missing refresh token
    """
    refresh_token = request.headers.get("X-Refresh-Token")

    if not refresh_token:
        return error_response(
            error='ValidationError',
            message='Refresh token is required',
            status_code=400
        )

    # Revoke session
    logout_user_service(refresh_token)

    return success_response(
        message='User logged out successfully',
        status_code=200
    )


# ==================== EMAIL VERIFICATION ====================

@auth_bp.route('/email/validate', methods=['GET'])
def validate_email():
    """
    Validate email verification token and auto-login user.
    
    Query Parameters:
        - token: Verification token (required)
        - email: User email (required)
        
    Returns:
        Redirect to app with success/error status
    """
    from backend.config.settings import get_app_verification_success_url, get_app_verification_error_url
    from backend.modules.rbac.services import get_user_permissions
    
    token = request.args.get('token')
    email = request.args.get('email')

    # Validation
    if not token:
        return redirect(get_app_verification_error_url(quote('Token is required')))
    
    if not email:
        return redirect(get_app_verification_error_url(quote('Email is required')))

    # Get user
    user = User.get_user_by_email(email)
    if not user:
        return redirect(get_app_verification_error_url(quote('User not found')))
    
    # Check if already verified
    if user.email_verified:
        return redirect(get_app_verification_error_url(quote('Email already verified. Please login.')))
    
    # Validate token
    if user.verification_token != token:
        return redirect(get_app_verification_error_url(quote('Invalid or expired token')))
    
    # Mark as verified
    user.verification_token = None
    user.email_verified = True
    user.save()

    # Send welcome email
    from backend.modules.mailer.service import send_template_email
    features = [
        "Access to exclusive content",
        "Personalized recommendations",
        "Priority customer support",
    ]
    send_template_email(
        to_email=email,
        template_name="register.html",
        context={
            "email": email,
            "features": features
        }
    )

    # Check user permissions before auto-login
    permissions = get_user_permissions(user.id)
    if not permissions or len(permissions) == 0:
        return redirect(get_app_verification_error_url(
            quote('Email verified successfully, but no permissions assigned. Contact administrator.')
        ))

    # Auto-login: create session
    access_token = generate_access_token(user)
    session = create_session(user, request)

    # Redirect to app with tokens
    return redirect(get_app_verification_success_url(
        access_token=access_token,
        refresh_token=session.refresh_token,
        user_id=user.id,
        email=user.email
    ))


# ==================== PASSWORD RESET ====================

@auth_bp.route('/password/forgot', methods=['POST'])
def forgot_password():
    """
    Request password reset email.
    
    Request Body:
        - email: User email (required)
        
    Returns:
        200: Always returns success (security best practice)
    """
    from backend.config.settings import get_reset_password_url
    from backend.modules.mailer.service import send_template_email
    
    data = request.get_json()
    email = data.get('email')

    if not email:
        return error_response(
            error='ValidationError',
            message='Email is required',
            status_code=400
        )

    # Get user (but don't reveal if exists or not)
    user = User.get_user_by_email(email)

    if user:
        # Generate reset token
        token = user.generate_reset_password_token()
        user.save()

        # Send reset email
        reset_url = get_reset_password_url(token, email)
        send_template_email(
            to_email=email,
            template_name="forgot_password.html",
            context={
                "reset_url": reset_url,
                "expires_in": os.getenv("RESET_TOKEN_EXP_MINUTES", 30),
            }
        )

    # Always return success (security best practice - don't reveal if email exists)
    return success_response(
        message='If the email exists, a reset link has been sent',
        status_code=200
    )


@auth_bp.route('/password/reset', methods=['POST'])
def reset_password():
    """
    Reset password using reset token.
    
    Request Body:
        - email: User email (required)
        - token: Reset token (required)
        - new_password: New password (required)
        
    Returns:
        200: Password reset successful
        400: Invalid or expired token
    """
    data = request.get_json()

    email = data.get('email')
    token = data.get('token')
    new_password = data.get('new_password')

    # Validation
    if not email or not token or not new_password:
        return error_response(
            error='ValidationError',
            message='Email, token, and new password are required',
            status_code=400
        )

    # Get user and validate token
    user = User.get_user_by_email(email)
    if not user or not user.is_reset_token_valid(token):
        return error_response(
            error='InvalidToken',
            message='Invalid or expired token',
            status_code=400
        )

    # Update password
    user.set_password(new_password)
    user.reset_password_token = None
    user.reset_password_sent_at = None
    user.save()

    # Revoke all sessions (force re-login on all devices)
    sessions = Session.query.filter_by(user_id=user.id, revoked=False).all()
    for session in sessions:
        session.revoke()

    return success_response(
        message='Password reset successful',
        status_code=200
    )


# ==================== PROFILE ====================

@auth_bp.route('/profile', methods=['GET'])
@auth_required
def get_profile():
    """
    Get current user profile.
    
    Headers:
        - Authorization: Bearer <access_token>
        
    Returns:
        200: User profile data
    """
    user = g.current_user
    
    # Get user permissions
    from backend.modules.rbac.services import get_user_permissions, get_user_roles
    permissions = get_user_permissions(user.id)
    roles = get_user_roles(user.id)
    
    return success_response(
        data={
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'email_verified': user.email_verified,
                'profile_picture_url': user.profile_picture_url,
                'last_login_at': user.last_login_at.isoformat() if user.last_login_at else None,
                'created_at': user.created_at.isoformat(),
            },
            'roles': roles,
            'permissions': permissions
        },
        status_code=200
    )


@auth_bp.route('/profile', methods=['PUT'])
@auth_required
def update_profile():
    """
    Update current user profile.
    
    Headers:
        - Authorization: Bearer <access_token>
        
    Request Body:
        - name: User name (optional)
        - profile_picture_url: Profile picture URL (optional)
        
    Returns:
        200: Profile updated successfully
    """
    user = g.current_user
    data = request.get_json()

    # Update allowed fields
    if 'name' in data:
        user.name = data['name']
    
    if 'profile_picture_url' in data:
        user.profile_picture_url = data['profile_picture_url']

    user.save()

    return success_response(
        data={
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'profile_picture_url': user.profile_picture_url,
            }
        },
        message='Profile updated successfully',
        status_code=200
    )
