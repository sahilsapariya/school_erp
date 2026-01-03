from flask import Blueprint, request, jsonify
from models import User, Session
from mailer.mail import send_email
from config import get_reset_password_url
import os

bp = Blueprint("password", __name__)


@bp.route("/password/forgot", methods=["POST"])
def forgot_password():
    data = request.get_json()
    email = data.get("email")

    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = User.get_user_by_email(email)

    if user:
        token = user.generate_reset_password_token()
        user.save()

        reset_url = get_reset_password_url(token, email)

        send_email(
            to_email=email,
            template_name="forgot_password.html",
            context={
                "reset_url": reset_url,
                "expires_in": os.getenv("RESET_TOKEN_EXP_MINUTES", 30),
            },
        )

    return jsonify({
        "message": "If the email exists, a reset link has been sent"
    }), 200


@bp.route("/password/reset", methods=["POST"])
def reset_password():
    data = request.get_json()

    email = data.get("email")
    token = data.get("token")
    new_password = data.get("new_password")

    if not email or not token or not new_password:
        return jsonify({"error": "Invalid request"}), 400

    user = User.get_user_by_email(email)
    if not user or not user.is_reset_token_valid(token):
        return jsonify({"error": "Invalid or expired token"}), 400

    user.set_password(new_password)
    user.reset_password_token = None
    user.reset_password_sent_at = None
    user.save()

    sessions = Session.query.filter_by(user_id=user.id, revoked=False).all()
    for session in sessions:
        session.revoke()

    return jsonify({"message": "Password reset successful"}), 200
