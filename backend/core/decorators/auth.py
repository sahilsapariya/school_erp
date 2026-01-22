"""
Authentication Decorator

Provides the @auth_required decorator for protecting routes that need authentication.
Handles JWT validation and token refresh logic.
"""

from functools import wraps
from flask import request, jsonify, g
from datetime import datetime


def auth_required(fn):
    """
    Decorator to protect routes requiring authentication.
    
    This decorator:
    1. Validates the access token from Authorization header
    2. If expired, attempts to refresh using X-Refresh-Token header
    3. Sets g.current_user for use in route handlers
    4. Returns 401 if authentication fails
    
    The decorator must be the OUTERMOST decorator (closest to the route).
    Other decorators like @require_permission should come after this.
    
    Usage:
        @bp.route('/protected')
        @auth_required
        def protected_route():
            # g.current_user is now available
            return jsonify({'user_id': g.current_user.id})
    
    Headers:
        Authorization: Bearer <access_token>
        X-Refresh-Token: <refresh_token> (optional, for token refresh)
        
    Response Headers:
        X-New-Access-Token: <new_access_token> (if token was refreshed)
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        # Import here to avoid circular imports
        from backend.modules.auth.models import User, Session
        from backend.modules.auth.services import validate_jwt_token, refresh_access_token
        
        # Check for Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing access token"}), 401

        access_token = auth_header.split(" ", 1)[1]

        # Try to validate the access token
        payload = validate_jwt_token(access_token, token_type="access")
        if payload:
            # Token is valid, get user
            user = User.query.get(payload["sub"])
            if not user:
                return jsonify({"error": "User not found"}), 401

            g.current_user = user
            return fn(*args, **kwargs)

        # Access token expired, try to refresh
        refresh_token = request.headers.get("X-Refresh-Token")
        if not refresh_token:
            return jsonify({"error": "Access token expired"}), 401

        new_access_token = refresh_access_token(refresh_token, request)
        if not new_access_token:
            return jsonify({"error": "Invalid refresh token"}), 401

        # Get session and user
        session = Session.query.filter_by(
            refresh_token=refresh_token,
            revoked=False
        ).first()

        if not session:
            return jsonify({"error": "Session not found"}), 401

        # Set current user from session
        user = session.user
        g.current_user = user

        # Update session last accessed time
        session.last_accessed_at = datetime.utcnow()
        session.save()

        # Call the route handler
        response = fn(*args, **kwargs)
        
        # Add new access token to response headers
        if hasattr(response, 'headers'):
            response.headers["X-New-Access-Token"] = new_access_token
        else:
            # Handle tuple responses like (data, status_code)
            from flask import make_response
            response = make_response(response)
            response.headers["X-New-Access-Token"] = new_access_token

        return response

    return wrapper
