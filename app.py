from flask import Flask
from flask_cors import CORS
import os
from models import db
from auth.utils.auth_guard import auth_required

from auth import auth_bp
from auth.routes.admin import bp as admin_bp


app = Flask(__name__)

def create_app(app):

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # CORS configuration for mobile app
    CORS(app, 
         resources={
             r"/api/auth/*": {
                 "origins": ["*"],  # Allow all origins for development
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization", "X-Refresh-Token"],
                 "expose_headers": ["X-New-Access-Token"]
             },
             r"/api/protected/*": {
                 "origins": ["*"],
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization", "X-Refresh-Token"],
                 "expose_headers": ["X-New-Access-Token"]
             },
             r"/api/admin/*": {
                 "origins": ["*"],
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization", "X-Refresh-Token"],
                 "expose_headers": ["X-New-Access-Token"]
             }
         },
         supports_credentials=True)

    db.init_app(app)

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    @app.route('/api')
    def health_check():
        return "Hello, World!"
    
    return app

@app.route('/api/protected', methods=['GET'])
@auth_required
def protected_route():
    return "This is a protected route."

if __name__ == '__main__':

    app = create_app(app)

    with app.app_context():
        db.create_all()

    # Use 0.0.0.0 to listen on all network interfaces
    # This allows access from localhost, local IP, and other devices on the network
    # Using port 5001 because macOS AirPlay Receiver uses port 5000 by default
    app.run(host="0.0.0.0", port=5001, debug=True)
