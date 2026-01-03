from flask import Blueprint, request, jsonify
from models import Session
from datetime import datetime

bp = Blueprint('logout', __name__)

@bp.route('/logout', methods=['POST'])
def logout_user():
    refresh_token = request.headers.get("X-Refresh-Token")

    if not refresh_token:
        return jsonify({"error": "Refresh token is required"}), 400

    session = Session.query.filter_by(
        refresh_token=refresh_token,
        revoked=False
    ).first()

    if not session:
        return jsonify({"message": "User logged out successfully"}), 200

    session.revoked = True
    session.revoked_at = datetime.utcnow()
    session.save()

    return jsonify({"message": "User logged out successfully"}), 200
