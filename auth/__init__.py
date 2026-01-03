from flask import Blueprint

auth_bp = Blueprint('auth', __name__)

from .routes import register, login, logout, email, password

auth_bp.register_blueprint(register.bp)
auth_bp.register_blueprint(login.bp)
auth_bp.register_blueprint(logout.bp)
# auth_bp.register_blueprint(jwt.bp)
auth_bp.register_blueprint(email.bp)
auth_bp.register_blueprint(password.bp)

