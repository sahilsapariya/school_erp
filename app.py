from flask import Flask
import os
from models import db
from auth.utils.auth_guard import auth_required

from auth import auth_bp


app = Flask(__name__)

def create_app(app):

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    app.register_blueprint(auth_bp, url_prefix='/api/auth')

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

    app.run(debug=True)
