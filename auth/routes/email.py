from flask import Blueprint, request, jsonify
from models import User
from auth.routes.login import create_login_session
from mailer.mail import send_email


bp = Blueprint('email', __name__)

@bp.route('/email/validate', methods=['GET'])
def validate_token():
    token = request.args.get('token')
    email = request.args.get('email')

    if not token:
        return jsonify({'error': 'Token is required'}), 400
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400

    if user := User.get_user_by_email(email):
        if user.email_verified:
            return jsonify({'is_valid': True}), 200
        if user.verification_token != token:
            return jsonify({'is_valid': False}), 200
    else:
        return jsonify({'error': 'User not found'}), 404
    
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

    access_token, refresh_token = create_login_session(user, request)

    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': user.id,
            'email': user.email,
        },
        'is_valid': True
    }), 200
