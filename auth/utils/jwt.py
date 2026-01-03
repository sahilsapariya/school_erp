import jwt
from datetime import datetime, timedelta
import os
from models import Session

JWT_SECRET = os.getenv("JWT_SECRET_KEY", "your_default_secret_key")
JWT_ALGORITHM = "HS256"

def generate_access_token(user):
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "type": "access",
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(minutes=15),
    }

    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def generate_refresh_token(user):
    payload = {
        "sub": str(user.id),
        "type": "refresh",
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(days=int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES_DAYS", 7))),
    }

    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def validate_jwt_token(token, token_type="access"):
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )

        if payload.get("type") != token_type:
            return None

        return payload

    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def refresh_access_token(refresh_token, request=None):
    payload = validate_jwt_token(refresh_token, "refresh")
    if not payload:
        return None

    session = Session.query.filter_by(
        refresh_token=refresh_token,
        revoked=False
    ).first()

    if not session or session.refresh_token_expires_at < datetime.utcnow():
        return None

    new_access_token = generate_access_token(session.user)

    session.last_accessed_at = datetime.utcnow()
    if request:
        session.ip_address = request.remote_addr
        session.user_agent = request.headers.get("User-Agent")

    session.save()

    return new_access_token
