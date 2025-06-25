from flask import Blueprint, request, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required
from urllib.parse import urlparse, urljoin
from sqlalchemy import or_

from .models import db, User

auth_routes = Blueprint('auth_routes', __name__)

# ------------------ Helpers ------------------

def is_safe_url(target):
    ref_url = urlparse(request.host_url)
    test_url = urlparse(urljoin(request.host_url, target))
    return test_url.scheme in ('http', 'https') and ref_url.netloc == test_url.netloc

# ------------------ SIGNUP ------------------

@auth_routes.route('/signup', methods=['POST'])
def signup():
    full_name = request.form['full_name']
    username = request.form['username']
    email = request.form['email']
    password = request.form['password']
    confirm_password = request.form['confirm_password']
    next_page = request.args.get("next")

    if password != confirm_password:
        flash("Passwords do not match.", "danger")
        return redirect(url_for('main.index', show='signup', next=next_page))

    if User.query.filter_by(email=email).first():
        flash("Email already registered.", "danger")
        return redirect(url_for('main.index', show='signup', next=next_page))

    if User.query.filter_by(username=username).first():
        flash("Username already taken.", "danger")
        return redirect(url_for('main.index', show='signup', next=next_page))

    new_user = User(
        full_name=full_name,
        email=email,
        username=username,
        auth_method="password"
    )
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    login_user(new_user)
    flash("Account created! You’re now logged in.", "success")

    if next_page and is_safe_url(next_page):
        return redirect(next_page)

    return redirect(url_for('main.index'))

# ------------------ LOGIN ------------------

@auth_routes.route('/login', methods=['POST'])
def login():
    identifier = request.form['identifier']  # email or username
    password = request.form['password']
    next_page = request.args.get("next")

    user = User.query.filter(
        or_(User.email == identifier, User.username == identifier)
    ).first()

    if not user:
        flash("No account found with that email or username.", "warning")
        return redirect(url_for('main.index', show='login', next=next_page))

    if user.auth_method != 'password':
        flash("This account is linked to Google. Use Google login instead.", "warning")
        return redirect(url_for('main.index', show='login', next=next_page))

    if user.check_password(password):
        login_user(user)
        flash("Welcome back!", "success")
        if next_page and is_safe_url(next_page):
            return redirect(next_page)
        return redirect(url_for('main.index'))
    else:
        flash("Incorrect password.", "danger")
        return redirect(url_for('main.index', show='login', next=next_page))

# ------------------ LOGOUT ------------------

@auth_routes.route('/logout')
@login_required
def logout():
    logout_user()
    flash("You’ve been signed out.", "info")
    return redirect(url_for('main.index'))
