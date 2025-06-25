# app/__init__.py

from flask import Flask
from .models import db, User
from flask_login import LoginManager
from flask_dance.contrib.google import google
from .auth import auth_bp, google_bp
from .auth_routes import auth_routes
from .routes import main
from dotenv import load_dotenv
import os

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.secret_key = os.getenv("SECRET_KEY") or "fallback-secret"

    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)

    login_manager = LoginManager(app)
    login_manager.login_view = "main.index"  # Redirects to homepage with ?next=/estimate
    login_manager.login_message_category = "info"

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Register blueprints
    app.register_blueprint(main)
    app.register_blueprint(auth_routes, url_prefix="/auth")
    app.register_blueprint(auth_bp, url_prefix="/auth")  
    app.register_blueprint(google_bp, url_prefix="/auth/google")

    return app

