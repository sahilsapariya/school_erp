"""
Flask Application Factory

Production-grade application factory pattern for School ERP backend.

This module creates and configures the Flask application with all blueprints,
extensions, and middleware properly initialized.

Usage:
    >>> from backend.app import create_app
    >>> app = create_app()
    >>> app.run()
"""

from flask import Flask, jsonify
from flask_cors import CORS

from backend.config import get_config
from backend.core.database import db, init_db
from backend.core.extensions import init_extensions


def create_app(config_name=None):
    """
    Application factory function.
    
    Args:
        config_name: Configuration environment name ('development', 'production', etc.)
                    If None, reads from FLASK_ENV environment variable
                    
    Returns:
        Configured Flask application instance
        
    Example:
        >>> app = create_app('development')
        >>> app.run(debug=True)
    """
    # Create Flask app
    app = Flask(__name__)
    
    # Load configuration
    config_class = get_config(config_name)
    app.config.from_object(config_class)
    
    # Initialize extensions
    init_extensions(app)
    
    # Initialize database
    init_db(app)
    
    # Register blueprints
    register_blueprints(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Register health check route
    register_health_check(app)
    
    # Production-specific initialization
    if config_class.__name__ == 'ProductionConfig':
        config_class.init_app(app)
    
    return app


def register_blueprints(app: Flask):
    """
    Register all application blueprints.
    
    Blueprint Organization:
    - /api/auth - Authentication (login, register, logout, etc.)
    - /api/rbac - RBAC management (roles, permissions)
    - /api/users - User management
    
    Future modules can be added here following the same pattern.
    
    Args:
        app: Flask application instance
    """
    # Import blueprints
    from backend.modules.auth import auth_bp
    from backend.modules.rbac import rbac_bp
    from backend.modules.users import users_bp
    
    # Register blueprints with URL prefixes
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(rbac_bp, url_prefix='/api/rbac')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    
    # Future modules can be registered here:
    # app.register_blueprint(students_bp, url_prefix='/api/students')
    # app.register_blueprint(teachers_bp, url_prefix='/api/teachers')
    # app.register_blueprint(attendance_bp, url_prefix='/api/attendance')
    # app.register_blueprint(academics_bp, url_prefix='/api/academics')
    # etc.


def register_error_handlers(app: Flask):
    """
    Register global error handlers.
    
    Provides consistent error responses across the application.
    
    Args:
        app: Flask application instance
    """
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 Not Found errors"""
        return jsonify({
            'success': False,
            'error': 'NotFound',
            'message': 'Resource not found'
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 Internal Server errors"""
        db.session.rollback()  # Rollback any failed transactions
        return jsonify({
            'success': False,
            'error': 'InternalServerError',
            'message': 'An internal server error occurred'
        }), 500
    
    @app.errorhandler(400)
    def bad_request(error):
        """Handle 400 Bad Request errors"""
        return jsonify({
            'success': False,
            'error': 'BadRequest',
            'message': 'Invalid request'
        }), 400
    
    @app.errorhandler(403)
    def forbidden(error):
        """Handle 403 Forbidden errors"""
        return jsonify({
            'success': False,
            'error': 'Forbidden',
            'message': 'Access forbidden'
        }), 403
    
    @app.errorhandler(401)
    def unauthorized(error):
        """Handle 401 Unauthorized errors"""
        return jsonify({
            'success': False,
            'error': 'Unauthorized',
            'message': 'Authentication required'
        }), 401


def register_health_check(app: Flask):
    """
    Register health check endpoint.
    
    Useful for monitoring, load balancers, and container orchestration.
    
    Args:
        app: Flask application instance
    """
    
    @app.route('/api/health', methods=['GET'])
    def health_check():
        """
        Health check endpoint.
        
        Returns:
            200: Service is healthy
        """
        return jsonify({
            'status': 'healthy',
            'service': 'School ERP Backend',
            'version': '1.0.0'
        }), 200
    
    @app.route('/api', methods=['GET'])
    def api_root():
        """
        API root endpoint.
        
        Returns:
            200: API information
        """
        return jsonify({
            'message': 'School ERP Backend API',
            'version': '1.0.0',
            'endpoints': {
                'auth': '/api/auth',
                'rbac': '/api/rbac',
                'users': '/api/users',
                'health': '/api/health'
            }
        }), 200


# Create application instance
app = create_app()


if __name__ == '__main__':
    """
    Development server entry point.
    
    For production, use a WSGI server like Gunicorn:
        gunicorn -w 4 -b 0.0.0.0:5001 backend.app:app
    """
    import os
    
    # Use 0.0.0.0 to listen on all network interfaces
    # Port 5001 because macOS AirPlay Receiver uses port 5000 by default
    host = os.getenv('FLASK_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_PORT', 5001))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    print(f"\n{'='*60}")
    print(f"Starting School ERP Backend Server")
    print(f"{'='*60}")
    print(f"Environment: {os.getenv('FLASK_ENV', 'development')}")
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"Debug: {debug}")
    print(f"{'='*60}\n")
    
    app.run(host=host, port=port, debug=debug)
