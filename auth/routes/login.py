from flask import Blueprint, request, jsonify
from models import User, Session
from mailer.mail import send_email
from datetime import datetime, timedelta
import os

bp = Blueprint('login', __name__)

@bp.route('/login', methods=['POST'])
def login_user():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    user = User.get_user_by_email(email)
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    if user.email_verified is False:
        email_verification_token = user.generate_email_verification_token()
        user.save()

        send_email(
            to_email=email,
            template_name="email_verification.html",
            context={
                "verify_url": f"{os.getenv('DOMAIN_LOCAL')}/api/auth/email/validate?token={email_verification_token}&email={email}"
            }
        )
        return jsonify({'message': 'Email was not verified. Verification URL is sent!'}), 201

    access_token, refresh_token = create_login_session(user, request)

    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': user.id,
            'email': user.email,
        }
    }), 200


REFRESH_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES_DAYS", 7))
def refresh_token_expiry():
    return datetime.utcnow() + timedelta(days=REFRESH_DAYS)

def create_login_session(user, request):
    from auth.utils.jwt import generate_access_token, generate_refresh_token

    # remove this line to support multiple sessions on multiple devices
    session = Session.query.filter_by(user_id=user.id, revoked=False).first()
    if session:
        session.revoke()


    access_token = generate_access_token(user)
    refresh_token = generate_refresh_token(user)

    session = Session(
        user_id=user.id,
        refresh_token=refresh_token,
        refresh_token_expires_at=refresh_token_expiry(),
        ip_address=request.remote_addr,
        user_agent=request.headers.get("User-Agent"),
        device_info=request.user_agent.string,
    )
    session.save()

    return access_token, refresh_token
