# app/auth.py
from flask import Blueprint, redirect, url_for
from flask_login import login_user
from flask_dance.contrib.google import make_google_blueprint, google
from .models import db, User
import os

auth_bp = Blueprint('auth', __name__)

google_bp = make_google_blueprint(
    client_id=os.getenv("GOOGLE_OAUTH_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_OAUTH_CLIENT_SECRET"),
    redirect_url='/auth/google/authorized',
    scope=["profile", "email"]
)

@auth_bp.route('/google/authorized')
def google_authorized():
    if not google.authorized:
        return redirect(url_for("google.login"))

    resp = google.get("/oauth2/v2/userinfo")
    if not resp.ok:
        return "Failed to fetch user info."

    info = resp.json()
    email = info["email"]
    name = info.get("name", "")
    username = email.split("@")[0]

    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(full_name=name, email=email, username=username, password_hash="google")
        db.session.add(user)
        db.session.commit()

    login_user(user)
    return redirect(url_for("home"))  # adjust as needed
