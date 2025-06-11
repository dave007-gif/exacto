from flask import Blueprint, render_template

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

@main.route('/estimate')
def estimate():
    return render_template('estimate.html')

@main.route('/projects')
def projects():
    return render_template('projects.html')
