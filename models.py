from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import secrets


load_dotenv()

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)

    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)

    name = db.Column(db.String(120), nullable=True)
    role = db.Column(db.String(20), nullable=False, default="user")

    email_verified = db.Column(db.Boolean, default=False, nullable=False)
    verification_token = db.Column(db.String(255), nullable=True)

    reset_password_token = db.Column(db.String(255), nullable=True)
    reset_password_sent_at = db.Column(db.DateTime, nullable=True)

    profile_picture_url = db.Column(db.String(255), nullable=True)

    last_login_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # Relationships
    sessions = db.relationship(
        "Session",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan"
    )

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)
    
    @classmethod
    def get_user_by_email(cls, email: str):
        return cls.query.filter_by(email=email).first()
    
    def generate_email_verification_token(self) -> str:
        import uuid
        token = str(uuid.uuid4())
        self.verification_token = token
        return token

    def get_email_verification_token(self, email) -> str:
        user = User.query.filter_by(email=email).first()
        if user:
            return user.verification_token
        return None
    

    def generate_reset_password_token(self):
        token = secrets.token_urlsafe(32)
        self.reset_password_token = token
        self.reset_password_sent_at = datetime.utcnow()
        return token

    RESET_TOKEN_EXP_MINUTES = int(os.getenv("RESET_TOKEN_EXP_MINUTES", 30))
    
    def is_reset_token_valid(self, token):
        if not self.reset_password_token:
            return False
        if self.reset_password_token != token:
            return False
        if self.reset_password_sent_at + timedelta(minutes=self.RESET_TOKEN_EXP_MINUTES) < datetime.utcnow():
            return False
        return True
    
    def save(self) -> None:
        db.session.add(self)
        db.session.commit()

    def __repr__(self):
        return f"<User {self.email}>"


REFRESH_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES_DAYS", 7))
def refresh_token_expiry():
    return datetime.utcnow() + timedelta(days=REFRESH_DAYS)

class Session(db.Model):
    __tablename__ = "sessions"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    refresh_token = db.Column(db.Text, nullable=True, index=True)


    refresh_token_expires_at = db.Column(
        db.DateTime, 
        default=refresh_token_expiry,
        nullable=False
    )

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    last_accessed_at = db.Column(db.DateTime, nullable=True)

    revoked = db.Column(db.Boolean, nullable=False, default=False)
    revoked_at = db.Column(db.DateTime, nullable=True)

    ip_address = db.Column(db.String(45), nullable=True)  # IPv4 + IPv6 safe
    user_agent = db.Column(db.String(255), nullable=True)
    device_info = db.Column(db.String(255), nullable=True)

    login_method = db.Column(
        db.String(20),
        nullable=False,
        default="email"
    )

    def revoke(self):
        self.revoked = True
        self.revoked_at = datetime.utcnow()
        self.save()
    
    def save(self):
        db.session.add(self)
        db.session.commit()

    def __repr__(self):
        return f"<Session user_id={self.user_id} revoked={self.revoked}>"
