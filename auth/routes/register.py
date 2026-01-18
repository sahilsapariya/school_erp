from flask import Blueprint, request, jsonify
from mailer.mail import send_email
from models import User
from config import get_email_verification_url
from auth.services.permissions import assign_role_to_user_by_email
import os

bp = Blueprint("register", __name__)


@bp.route("/register", methods=["POST"])
def register_user():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    
    if User.get_user_by_email(email):
        return jsonify({"error": "User already exists"}), 400

    user = User()
    user.email = email
    user.set_password(password)

    email_verification_token = user.generate_email_verification_token()
    user.save()

    # Auto-assign default role for new users
    # Industry best practice: New signups get a basic role (Student)
    # Admins can later change the role if needed
    default_role = os.getenv("DEFAULT_USER_ROLE", "Student")
    assign_result = assign_role_to_user_by_email(email, default_role)
    
    if not assign_result['success']:
        # Log the error but don't fail registration
        # User will be created but won't be able to login until role is assigned
        print(f"Warning: Could not assign default role to {email}: {assign_result.get('error')}")

    verify_url = get_email_verification_url(email_verification_token, email)

    send_email(
        to_email=email,
        template_name="email_verification.html",
        context={"verify_url": verify_url},
    )

    return jsonify({"message": f"User {email} registered successfully!"}), 201
