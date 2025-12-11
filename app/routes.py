# app/routes.py

from flask import Blueprint, render_template, request, url_for, jsonify
from flask_login import login_required, current_user

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/about')
def about():
    return render_template('about.html')

@main.route('/contact')
def contact():
    return render_template('contact.html')

@main.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', user=current_user)

@main.route('/calculation')
@login_required
def calculation():
    return render_template('calculation.html', user=current_user)

@main.route('/suppliers')
@login_required
def suppliers():
    return render_template('suppliers.html', user=current_user)

@main.route('/admin_review')
@login_required
def admin_review():
    return render_template('dashboard.html', user=current_user)

@main.route('/admin_upload')
@login_required
def admin_upload():
    return render_template('dashboard.html', user=current_user)

@main.route('/admin_upload_requests')
@login_required
def admin_upload_requests():
    return render_template('dashboard.html', user=current_user)

@main.route('/estimate')
@login_required
def estimate():
    return render_template('estimate.html')

@main.route('/projects')
@login_required
def projects():
    return render_template('projects.html')
