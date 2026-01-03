from flask import Blueprint, request, jsonify
from mailer.mail import send_email
import os
from models import User
from dotenv import load_dotenv

load_dotenv()

bp = Blueprint('register', __name__)

@bp.route('/register', methods=['POST'])
def register_user():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    if User.get_user_by_email(email):
        return jsonify({'error': 'User already exists'}), 400

    user = User()
    user.email = email
    user.set_password(password)

    email_verification_token = user.generate_email_verification_token()

    user.save()

    send_email(
        to_email=email,
        template_name="email_verification.html",
        context={
            "verify_url": f"{os.getenv('DOMAIN_LOCAL')}/api/auth/email/validate?token={email_verification_token}&email={email}"
        }
    )

    return jsonify({'message': f'User {email} registered successfully!'}), 201