from flask import Flask
from .models import db
from flask_login import LoginManager
from flask_dance.contrib.google import google
from .auth import auth_bp, google_bp
from dotenv import load_dotenv
import os

load_dotenv()  # 👈 This loads the .env file

# Example of using values:
SECRET_KEY = os.getenv("SECRET_KEY")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")


def create_app():
    app = Flask(__name__)

    # ✅ Use the secret from .env instead of hardcoding
    app.secret_key = SECRET_KEY or 'fallback-secret'

    # ✅ Set up database
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    # ✅ Flask-Login setup
    login_manager = LoginManager(app)
    login_manager.login_view = "google.login"

    from .models import User
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # ✅ Register Blueprints
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(google_bp, url_prefix="/auth/google")

    from .routes import main
    app.register_blueprint(main)

    return app
