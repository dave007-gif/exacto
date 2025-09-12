# app/auth.py

from flask import Blueprint, redirect, url_for, flash
from flask_login import login_user
from flask_dance.contrib.google import make_google_blueprint, google
from .models import db, User
import os
from uuid import uuid4

# Handles /auth/ routes
auth_bp = Blueprint('auth', __name__)

# 🔐 Google OAuth Setup – no redirect_url override
google_bp = make_google_blueprint(
    client_id=os.getenv("GOOGLE_OAUTH_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_OAUTH_CLIENT_SECRET"),
    scope=["profile", "email"]
)

# ✅ Google redirects here: http://127.0.0.1:5000/auth/google/authorized
@auth_bp.route('/google/authorized')
def google_authorized():
    if not google.authorized:
        flash("Google login not authorized. Try again.", "danger")
        return redirect(url_for("main.index", show="login"))

    resp = google.get("/oauth2/v2/userinfo")
    if not resp.ok:
        flash("Failed to fetch your Google profile.", "danger")
        return redirect(url_for("main.index", show="login"))

    info = resp.json()
    email = info.get("email")
    name = info.get("name", "")

    if not email:
        flash("Google account missing email.", "danger")
        return redirect(url_for("main.index", show="login"))

    user = User.query.filter_by(email=email).first()

    if user:
        if user.auth_method != "google":
            flash("This email is registered with a password. Use password login instead.", "warning")
            return redirect(url_for("main.index", show="login"))
    else:
        username = f"{email.split('@')[0]}_{uuid4().hex[:6]}"
        user = User(
            full_name=name,
            email=email,
            username=username,
            password_hash=None,
            auth_method="google"
        )
        db.session.add(user)
        db.session.commit()

    login_user(user)
    flash(f"Welcome back, {user.full_name or user.username}!", "success")
    return redirect(url_for("main.index"))
