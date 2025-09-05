# app/routes.py

from flask import Blueprint, render_template
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

@main.route('/estimate')
@login_required
def estimate():
    return render_template('dashboard.html')

@main.route('/projects')
@login_required
def projects():
    return render_template('projects.html')

@main.route('/materials')
@login_required
def materials():
    return render_template('materials.html')

@main.route('/clients')
@login_required
def clients():
    return render_template('clients.html')

@main.route('/settings')
@login_required
def settings():
    return render_template('settings.html')

@main.route('/profile')
@login_required
def profile():
    return render_template('profile.html', user=current_user)
