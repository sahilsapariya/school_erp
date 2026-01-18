from functools import wraps
from flask import request, jsonify, g
from models import User, Session
from auth.utils.jwt import validate_jwt_token, refresh_access_token
from datetime import datetime

def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing access token"}), 401

        access_token = auth_header.split(" ", 1)[1]

        payload = validate_jwt_token(access_token, token_type="access")
        if payload:
            # User ID is a UUID string, not an integer
            user = User.query.get(payload["sub"])
            if not user:
                return jsonify({"error": "User not found"}), 401

            g.current_user = user
            return fn(*args, **kwargs)

        refresh_token = request.headers.get("X-Refresh-Token")
        if not refresh_token:
            return jsonify({"error": "Access token expired"}), 401

        new_access_token = refresh_access_token(refresh_token, request)
        if not new_access_token:
            return jsonify({"error": "Invalid refresh token"}), 401

        session = Session.query.filter_by(
            refresh_token=refresh_token,
            revoked=False
        ).first()

        if not session:
            return jsonify({"error": "Session not found"}), 401

        # Get the User object from the session relationship
        user = session.user
        g.current_user = user

        session.last_accessed_at = datetime.utcnow()
        session.save()

        response = fn(*args, **kwargs)
        response.headers["X-New-Access-Token"] = new_access_token

        return response

    return wrapper
