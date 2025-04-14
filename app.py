from flask import Flask, request, jsonify, render_template, redirect, make_response
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import jwt
import datetime
import sqlite3
import os
from datetime import datetime, timedelta, timezone
from flask_cors import CORS

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your_secret_key')  # Load from environment variable
CORS(app, supports_credentials=True)

# Initialize SQLite database
def init_db():
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            user_type TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# Helper function to validate tokens
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.cookies.get('authToken')  # Read token from cookies
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            request.user_email = data['email']
        except jwt.ExpiredSignatureError:
            print("Token has expired!")
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            print("Invalid token!")
            return jsonify({'message': 'Invalid token!'}), 401
        return f(*args, **kwargs)
    return decorated

# GET /signup
@app.route('/signup', methods=['GET'])
def signup_page():
    return render_template('signup.html')

# POST /signup
@app.route('/signup', methods=['POST'])
def signup():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    user_type = data.get('user_type')

    if not email or not password or not user_type:
        return jsonify({'message': 'Missing required fields'}), 400

# Use 'pbkdf2:sha256' as the hashing method
# Use 'pbkdf2:sha256' as the hashing method
    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')

    try:
        with sqlite3.connect('users.db') as conn:
            cursor = conn.cursor()
            cursor.execute('INSERT INTO users (email, password, user_type) VALUES (?, ?, ?)',
                           (email, hashed_password, user_type))
            conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({'message': 'User already exists'}), 400

    token = jwt.encode({'email': email, 'exp': datetime.now(timezone.utc) + timedelta(hours=1)},
                       app.config['SECRET_KEY'], algorithm="HS256")
    response = make_response(jsonify({'message': 'Signup successful!'}))
    response.set_cookie('authToken', token, httponly=True, samesite='Strict', secure=True)  # Set HTTP-only cookie
    return response

# GET /login
@app.route('/login', methods=['GET'])
def login_page():
    return render_template('login.html')

# POST /login
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT password FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()

    if not user or not check_password_hash(user[0], password):
        return jsonify({'message': 'Invalid credentials'}), 401

    token = jwt.encode({'email': email, 'exp': datetime.now(timezone.utc) + timedelta(hours=1)},
                       app.config['SECRET_KEY'], algorithm="HS256")
    response = make_response(jsonify({'message': 'Login successful!'}))
    response.set_cookie('authToken', token, httponly=True, samesite='Strict', secure=True)  # Set HTTP-only cookie
    return response

# GET /protected (Example of a protected route)
@app.route('/protected', methods=['GET'])
@token_required
def protected():
    return jsonify({'message': f'Welcome, {request.user_email}! This is a protected route.'})

# POST /refresh-token
@app.route('/refresh-token', methods=['POST'])
@token_required
def refresh_token():
    new_token = jwt.encode({'email': request.user_email, 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)},
                           app.config['SECRET_KEY'], algorithm="HS256")
    return jsonify({'token': new_token})

@app.route('/calculation', methods=['GET'])
@token_required
def calculation_page():
    return render_template('calculation.html')

@app.route('/')
def home():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)