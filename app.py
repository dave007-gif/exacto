from flask import Flask, request, jsonify, render_template, redirect, make_response
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import jwt
import sqlite3
import os
from datetime import datetime, timedelta, timezone
from flask_cors import CORS
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your_secret_key')  # Load from environment variable
CORS(app, supports_credentials=True)

# Add this region adjacency configuration at the top level of app.py
REGION_NEIGHBORS = {
    'Greater Accra': ['Eastern', 'Volta'],
    'Ashanti': ['Eastern', 'Western', 'Central', 'Bono'],
    'Western': ['Central', 'Ashanti'],
    'Volta': ['Greater Accra', 'Eastern', 'Oti'],
    'Eastern': ['Greater Accra', 'Ashanti', 'Volta', 'Bono East'],
    'Central': ['Western', 'Ashanti', 'Greater Accra'],
    # Add other regions as needed
}

def get_neighboring_regions(region):
    """Return list of adjacent regions for a given region"""
    return REGION_NEIGHBORS.get(region, [])

# Initialize SQLite database
def init_db():
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()

    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            verified BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Roles table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT
        )
    ''')

    # User-Roles junction table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_roles (
            user_id INTEGER NOT NULL,
            role_id INTEGER NOT NULL,
            PRIMARY KEY (user_id, role_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (role_id) REFERENCES roles(id)
        )
    ''')

    # Locations table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            zone TEXT UNIQUE NOT NULL,
            region TEXT NOT NULL
        )
    ''')

    # HaulageBands table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS HaulageBands (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL,
            min_km REAL NOT NULL,
            max_km REAL NOT NULL,
            multiplier REAL NOT NULL
        )
    ''')

    # Projects table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            project_name TEXT NOT NULL,
            project_location TEXT,
            supplier_location TEXT,
            total_cost REAL DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    # Sources table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            region TEXT NOT NULL,
            contact TEXT
        )
    ''')

    # Material Prices table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS MaterialPrices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id INTEGER NOT NULL,
            material TEXT NOT NULL,
            unit_cost REAL NOT NULL,
            valid_from DATE NOT NULL,
            valid_to DATE NOT NULL,
            FOREIGN KEY (source_id) REFERENCES Sources(id)
        )
    ''')

    # Labor Rates table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS LaborRates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id INTEGER NOT NULL,
            task TEXT NOT NULL,
            rate REAL NOT NULL,
            valid_from DATE NOT NULL,
            valid_to DATE NOT NULL, 
            FOREIGN KEY (source_id) REFERENCES Sources(id)
        )
    ''')

    # Adjustments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Adjustments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            region TEXT UNIQUE NOT NULL,
            concrete_waste_factor REAL NOT NULL,
            labor_efficiency REAL NOT NULL,
            thickness REAL NOT NULL
        )
    ''')

    # Plants table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Plants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            equipment TEXT NOT NULL,
            daily_rate REAL NOT NULL,
            duration_per_unit REAL NOT NULL -- Days per unit (e.g., m³)
        )
    ''')

    # Add password_resets table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS password_resets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            token TEXT NOT NULL UNIQUE,
            expiration DATETIME NOT NULL
        )
    ''')

    # Add to init_db()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_activity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            activity_type TEXT NOT NULL,
            description TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    # Subscriptions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            plan_name TEXT NOT NULL,
            start_date DATETIME NOT NULL,
            end_date DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    conn.commit()
    conn.close()

init_db()

def populate_initial_data():
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()

    # Populate Sources table
    cursor.execute('''
        INSERT OR IGNORE INTO Sources (name, type, region, contact)
        VALUES ('Ghacem Ltd', 'supplier', 'greater-accra', '123-456-789'),
               ('Local Supplier', 'supplier', 'greater-accra', '987-654-321'),
               ('Block Factory', 'supplier', 'greater-accra', '555-555-555')
    ''')

    # Get source IDs
    cursor.execute('SELECT id FROM Sources WHERE name = "Ghacem Ltd"')
    ghacem_id = cursor.fetchone()[0]
    cursor.execute('SELECT id FROM Sources WHERE name = "Local Supplier"')
    local_supplier_id = cursor.fetchone()[0]
    cursor.execute('SELECT id FROM Sources WHERE name = "Block Factory"')
    block_factory_id = cursor.fetchone()[0]

    # Populate MaterialPrices table
    materials = [
        (ghacem_id, 'cement', 85.00, '2023-01-01', '2023-12-31'),
        (local_supplier_id, 'sand', 30.00, '2023-01-01', '2023-12-31'),
        (local_supplier_id, 'aggregate', 60.00, '2023-01-01', '2023-12-31'),
        (block_factory_id, 'blocks', 5.50, '2023-01-01', '2023-12-31'),
        (local_supplier_id, 'mortar', 40.00, '2023-01-01', '2023-12-31')
    ]
    cursor.executemany('''
        INSERT OR IGNORE INTO MaterialPrices (source_id, material, unit_cost, valid_from, valid_to)
        VALUES (?, ?, ?, ?, ?)
    ''', materials)

    # Populate LaborRates table
    labor_rates = [
        (local_supplier_id, 'tree cutting 600-1500', 20.00, '2023-01-01', '2023-12-31'),
        (local_supplier_id, 'tree cutting 1500-3000', 35.00, '2023-01-01', '2023-12-31'),
        (local_supplier_id, 'tree cutting over 3000', 60.00, '2023-01-01', '2023-12-31'),
        (local_supplier_id, 'site clearance', 2.50, '2023-01-01', '2023-12-31'),
        (local_supplier_id, 'excavation', 15.00, '2023-01-01', '2023-12-31'),
        (local_supplier_id, 'bricklaying', 25.00, '2023-01-01', '2023-12-31'),
        (local_supplier_id, 'concreting', 30.00, '2023-01-01', '2023-12-31'),
    ]
    cursor.executemany('''
        INSERT OR IGNORE INTO LaborRates (source_id, task, rate, valid_from, valid_to)
        VALUES (?, ?, ?, ?, ?)
    ''', labor_rates)

    # Populate Adjustments table
    adjustments = [
        ('default', 1.05, 1.0, 0.2),  # Default region
        ('greater-accra', 1.07, 0.92, 0.25),  # Greater Accra region
        ('ashanti', 1.06, 0.95, 0.22)  # Example for another region
    ]
    cursor.executemany('''
        INSERT OR IGNORE INTO Adjustments (region, concrete_waste_factor, labor_efficiency, thickness)
        VALUES (?, ?, ?, ?)
    ''', adjustments)

    # Populate Plants table
    plants = [
        ('Mixer', 400.00, 0.2),      # Mixer: GHS 400/day, 0.2 days per m³
        ('Crane', 1000.00, 0.1),     # Crane: GHS 1000/day, 0.1 days per m³
        ('Excavator', 1200.00, 0.15),# Excavator: GHS 1200/day, 0.15 days per m³
        ('Tipper Truck', 800.00, 0.1) # Tipper Truck: GHS 800/day, 0.1 days per m³
    ]
    cursor.executemany('''
        INSERT OR IGNORE INTO Plants (equipment, daily_rate, duration_per_unit)
        VALUES (?, ?, ?)
    ''', plants)

    # Populate Locations table
    locations = [
        ('Accra Central', 'Greater Accra'),
        ('Tema', 'Greater Accra'),
        ('Kumasi', 'Ashanti'),
        ('Takoradi', 'Western'),
        ('Ho', 'Volta'),
        ('Koforidua', 'Eastern'),
        ('Cape Coast', 'Central'),
        # Add more as needed
    ]
    cursor.executemany('''
        INSERT OR IGNORE INTO locations (zone, region)
        VALUES (?, ?)
    ''', locations)

    # --- Add this block to ensure roles exist ---
    roles = [
        ('professional', 'Professional user'),
        ('firm', 'Firm user'),
        ('student', 'Student user')
    ]
    cursor.executemany('''
        INSERT OR IGNORE INTO roles (name, description)
        VALUES (?, ?)
    ''', roles)

     # Populate HaulageBands table
    haulage_bands = [
        ('Band 1', 0, 5, 1.0),
        ('Band 2', 5, 15, 1.2),
        ('Band 3', 15, 1000, 1.5)
    ]
    cursor.executemany('''
        INSERT OR IGNORE INTO HaulageBands (label, min_km, max_km, multiplier)
        VALUES (?, ?, ?, ?)
    ''', haulage_bands)

    # Example: Add a test subscription for user_id 1
    cursor.execute('''
        INSERT OR IGNORE INTO subscriptions (user_id, plan_name, start_date, end_date)
        VALUES (1, 'Pro', '2024-01-01', '2025-01-01')
    ''')

    conn.commit()
    conn.close()

# Call the function to populate the database
populate_initial_data()

# JWT Helpers
def get_user_roles(user_id):
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT r.name FROM roles r
            JOIN user_roles ur ON ur.role_id = r.id
            WHERE ur.user_id = ?
        ''', (user_id,))
        return [row[0] for row in cursor.fetchall()]

def role_required(*required_roles):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            token = request.cookies.get('authToken')
            if not token:
                return jsonify({'message': 'Missing token'}), 401

            try:
                data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
                user_roles = data.get('roles', [])
                
                if not any(role in user_roles for role in required_roles):
                    return jsonify({'message': 'Insufficient permissions'}), 403
                
                request.user_id = data['user_id']
            except jwt.ExpiredSignatureError:
                return jsonify({'message': 'Token expired'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'message': 'Invalid token'}), 401

            return f(*args, **kwargs)
        return wrapped
    return decorator

# Helper function to validate tokens
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.cookies.get('authToken')
        if not token:
            return redirect('/login')

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            request.user_id = data['user_id']
            request.user_email = data['email']
            request.user_roles = data['roles']
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return redirect('/login')
            
        return f(*args, **kwargs)
    return decorated

# Activity logging decorator
def log_activity(description):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            result = f(*args, **kwargs)
            with sqlite3.connect('users.db') as conn:
                conn.execute('''
                    INSERT INTO user_activity (user_id, activity_type, description)
                    VALUES (?, ?, ?)
                ''', (request.user_id, f.__name__, description))
            return result
        return wrapper
    return decorator

# Password Reset Routes
@app.route('/forgot-password', methods=['GET'])
def forgot_password_page():
    return render_template('forgot-password.html')

@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    email = request.json.get('email')
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        
    if not user:
        return jsonify({'message': 'If this email exists, we will send a reset link'}), 200

    # Generate reset token (use secrets in production)
    import secrets
    token = secrets.token_urlsafe(32)
    expiration = datetime.now(timezone.utc) + timedelta(hours=1)

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO password_resets (email, token, expiration)
            VALUES (?, ?, ?)
        ''', (email, token, expiration))
        conn.commit()

    # In production: Send email with reset link
    print(f"Password reset link: http://127.0.0.1:5000/reset-password/{token}")  # For development
    return jsonify({'message': 'Reset link sent if email exists'})

@app.route('/reset-password/<token>', methods=['GET'])
def reset_password_page(token):
    return render_template('reset-password.html', token=token)

@app.route('/reset-password/<token>', methods=['POST'])
def reset_password(token):
    new_password = request.json.get('password')
    
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT email FROM password_resets 
            WHERE token = ? AND expiration > ?
        ''', (token, datetime.now(timezone.utc)))
        reset_request = cursor.fetchone()

    if not reset_request:
        return jsonify({'message': 'Invalid or expired token'}), 400

    email = reset_request[0]
    hashed_password = generate_password_hash(new_password, method='pbkdf2:sha256')

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE users SET password = ? WHERE email = ?
        ''', (hashed_password, email))
        cursor.execute('DELETE FROM password_resets WHERE token = ?', (token,))
        conn.commit()

    return jsonify({'message': 'Password updated successfully'})

# Formula version endpoint
@app.route('/api/version', methods=['GET'])
def get_formula_version():
    return jsonify({'version': '2023.1'})  # Update this version as needed

# Dynamic adjustments API
@app.route('/api/adjustments', methods=['GET'])
@token_required
def get_adjustments():
    region = request.args.get('region', 'default').lower()
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT concrete_waste_factor, labor_efficiency, thickness FROM Adjustments WHERE region = ?', (region,))
        result = cursor.fetchone()

    if not result:
        return jsonify({'message': f'Adjustments for region "{region}" not found'}), 404

    concrete_waste_factor, labor_efficiency, thickness = result
    return jsonify({
        'concrete_waste_factor': concrete_waste_factor,
        'labor_efficiency': labor_efficiency,
        'thickness': thickness
    })

# GET /signup
@app.route('/signup', methods=['GET'])
def signup_page():
    return render_template('signup.html')

# Updated Auth Endpoints
@app.route('/signup', methods=['POST'])
def signup():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    # Accept both 'role' and 'user_type' for compatibility
    role = data.get('role') or data.get('user_type') or 'student'

    if not email or not password:
        return jsonify({'message': 'Missing required fields'}), 400

    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')

    try:
        with sqlite3.connect('users.db') as conn:
            cursor = conn.cursor()
            cursor.execute('INSERT INTO users (email, password) VALUES (?, ?)',
                           (email, hashed_password))
            user_id = cursor.lastrowid

            # Assign role
            cursor.execute('SELECT id FROM roles WHERE name = ?', (role,))
            role_row = cursor.fetchone()
            if not role_row:
                return jsonify({'message': f'Role "{role}" does not exist'}), 400
            role_id = role_row[0]
            cursor.execute('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', (user_id, role_id))

            conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({'message': 'User already exists'}), 400

    # Fetch roles
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT r.name FROM roles r
            JOIN user_roles ur ON ur.role_id = r.id
            WHERE ur.user_id = ?
        ''', (user_id,))
        roles = [row[0] for row in cursor.fetchall()]

    token = jwt.encode({
        'email': email,
        'user_id': user_id,
        'roles': roles,
        'exp': datetime.now(timezone.utc) + timedelta(hours=1)
    }, app.config['SECRET_KEY'], algorithm="HS256")
    response = make_response(jsonify({'message': 'Signup successful!'}))
    response.set_cookie('authToken', token, httponly=True, samesite='Strict', secure=True)
    return response

# GET /login
@app.route('/login', methods=['GET'])
def login_page():
    return render_template('login.html')

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id, password FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()

    if not user or not check_password_hash(user[1], password):
        return jsonify({'message': 'Invalid credentials'}), 401

    user_id = user[0]

    # Fetch roles
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT r.name FROM roles r
            JOIN user_roles ur ON ur.role_id = r.id
            WHERE ur.user_id = ?
        ''', (user_id,))
        roles = [row[0] for row in cursor.fetchall()]

    token = jwt.encode({
        'email': email,
        'user_id': user_id,
        'roles': roles,
        'exp': datetime.now(timezone.utc) + timedelta(hours=1)
    }, app.config['SECRET_KEY'], algorithm="HS256")
    response = make_response(jsonify({'message': 'Login successful!', 'redirect': '/dashboard'}))
    response.set_cookie('authToken', token, httponly=True, samesite='Strict', secure=True)
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

# app.py - calculation_page route
@app.route('/calculation', methods=['GET'])
@token_required
def calculation_page():
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT r.name FROM roles r
            JOIN user_roles ur ON ur.role_id = r.id
            WHERE ur.user_id = ?
        ''', (request.user_id,))
        roles = [row[0] for row in cursor.fetchall()]

    return render_template('calculation.html',
        current_user={
            'roles': roles,
            'email': request.user_email,
            'raw_roles': ','.join(roles)  # Add this line
        }
    )

# app.py - Add profile endpoint
@app.route('/api/profile', methods=['GET'])
@token_required
def get_profile():
    return jsonify({
        'email': request.user_email,
        'roles': request.user_roles
    })

@app.route('/')
def home():
    return render_template('index.html')

# Location and Haulage Endpoints
@app.route('/api/locations', methods=['GET'])
def get_locations():
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT zone, region FROM locations')
        locations = [{'zone': row[0], 'region': row[1]} for row in cursor.fetchall()]
    return jsonify(locations)

@app.route('/api/haulage-cost', methods=['POST'])
@role_required('professional', 'firm')
def calculate_haulage():
    data = request.json
    project_loc = data.get('project_location')
    supplier_loc = data.get('supplier_location')

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        
        # Get regions for locations
        cursor.execute('SELECT region FROM locations WHERE zone = ?', (project_loc,))
        project_region = cursor.fetchone()[0]
        cursor.execute('SELECT region FROM locations WHERE zone = ?', (supplier_loc,))
        supplier_region = cursor.fetchone()[0]

    # Calculate approximate distance
    if project_region == supplier_region:
        distance = 3  # Same region
    elif supplier_region in get_neighboring_regions(project_region):
        distance = 10  # Adjacent regions
    else:
        distance = 20  # Non-adjacent regions

    # Get haulage band
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT label, multiplier FROM HaulageBands
            WHERE ? >= min_km AND ? < max_km
        ''', (distance, distance))
        band = cursor.fetchone()

    return jsonify({
        'band': band[0],
        'multiplier': band[1],
        'distance_km': distance
    })

# GET /projects
@app.route('/projects', methods=['GET'])
@token_required
def get_projects():
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM Projects')
        projects = cursor.fetchall()
    return jsonify({'projects': projects})

# POST /projects (legacy, logs activity)
@app.route('/projects', methods=['POST'])
@token_required
@log_activity("Created new project (legacy endpoint)")
def legacy_create_project():
    data = request.json
    project_name = data.get('project_name')
    total_cost = data.get('total_cost', 0)

    if not project_name:
        return jsonify({'message': 'Project name is required'}), 400

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('INSERT INTO Projects (project_name, total_cost) VALUES (?, ?)', (project_name, total_cost))
        conn.commit()
    return jsonify({'message': 'Project created successfully'}), 201

# Project Management Endpoints (logs activity)
@app.route('/api/projects', methods=['POST'])
@role_required('professional', 'firm')
@log_activity("Created new project")
def api_create_project():
    data = request.json
    project_name = data.get('project_name')
    project_loc = data.get('project_location')
    supplier_loc = data.get('supplier_location')

    if not project_name:
        return jsonify({'message': 'Project name required'}), 400

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO Projects (user_id, project_name, project_location, supplier_location)
            VALUES (?, ?, ?, ?)
        ''', (request.user_id, project_name, project_loc, supplier_loc))
        conn.commit()

    return jsonify({'message': 'Project created'}), 201

# Supplier Management Endpoints
@app.route('/api/suppliers', methods=['POST'])
@role_required('professional', 'firm')
def add_supplier():
    data = request.json
    name = data.get('name')
    region = data.get('region')

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO Sources (name, type, region)
            VALUES (?, 'supplier', ?)
        ''', (name, region))
        conn.commit()

    return jsonify({'message': 'Supplier added'}), 201

@app.route('/materials', methods=['GET'])
@token_required
def get_materials():
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM MaterialPrices')
        materials = cursor.fetchall()
    return jsonify({'materials': materials})

@app.route('/labor-rates', methods=['GET'])
@token_required
def get_labor_rates():
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM LaborRates')
        labor_rates = cursor.fetchall()
    return jsonify({'labor_rates': labor_rates})

# Consolidated Pricing Endpoint
@app.route('/api/pricing-bundle', methods=['GET'])
@token_required
def get_pricing_bundle():
    region = request.args.get('region', 'default')
    
    with sqlite3.connect('users.db') as conn:
        # Materials
        cursor = conn.cursor()
        cursor.execute('''
            SELECT material, unit_cost 
            FROM MaterialPrices
            WHERE source_id IN (
                SELECT id FROM Sources WHERE region = ?
            )
        ''', (region,))
        materials = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Labor
        cursor.execute('''
            SELECT task, rate 
            FROM LaborRates
            WHERE source_id IN (
                SELECT id FROM Sources WHERE region = ?
            )
        ''', (region,))
        labor = {row[0]: row[1] for row in cursor.fetchall()}
        
    return jsonify({
        'materials': materials,
        'labor': labor,
        'region': region,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/smm-rules', methods=['GET'])
@token_required
def get_smm_rules():
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM SMMRules')
        smm_rules = cursor.fetchall()
    return jsonify({'smm_rules': smm_rules})

# GET /api/prices/:material
@app.route('/api/prices/<material>', methods=['GET'])
@token_required
def get_material_price(material):
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT unit_cost, valid_from, valid_to FROM MaterialPrices WHERE material = ?', (material,))
        result = cursor.fetchone()

    if not result:
        return jsonify({'message': f'Price for material "{material}" not found'}), 404

    unit_cost, valid_from, valid_to = result
    return jsonify({
        'material': material,
        'unit_cost': unit_cost,
        'valid_from': valid_from,
        'valid_to': valid_to
    })

# GET /api/labor/:trade
@app.route('/api/labor/<trade>', methods=['GET'])
@token_required
def get_labor_rate(trade):
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        # Use the correct column name 'task' instead of 'trade'
        cursor.execute('SELECT rate, valid_from, valid_to FROM LaborRates WHERE task = ?', (trade,))
        result = cursor.fetchone()

    if not result:
        return jsonify({'message': f'Labor rate for task "{trade}" not found'}), 404

    rate, valid_from, valid_to = result
    return jsonify({
        'trade': trade,
        'rate': rate,
        'valid_from': valid_from,
        'valid_to': valid_to
    })

@app.route('/api/plants', methods=['GET'])
@token_required
def get_plants():
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT equipment, daily_rate, duration_per_unit FROM Plants')
        plants = cursor.fetchall()

    if not plants:
        return jsonify({'message': 'No plant data found'}), 404

    return jsonify([
        {'equipment': plant[0], 'dailyRate': plant[1], 'durationPerUnit': plant[2]}
        for plant in plants
    ])

@app.route('/api/verify-auth', methods=['GET'])
@token_required
def verify_auth():
    return jsonify({'valid': True})

#@app.route('/logout', methods=['POST'])
#def logout():
 #   response = make_response(jsonify({'message': 'Logged out successfully'}))
  #  response.set_cookie('authToken', '', expires=0)
   # return response

# app.py updates
@app.route('/dashboard')
@token_required
def dashboard():
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        # Get user profile
        cursor.execute('SELECT verified FROM users WHERE id = ?', (request.user_id,))
        user = cursor.fetchone()
        # Get projects count
        cursor.execute('SELECT COUNT(*) FROM Projects WHERE user_id = ?', (request.user_id,))
        project_count = cursor.fetchone()[0]
        # Get subscription info
        subscription = None
        if 'professional' in request.user_roles or 'firm' in request.user_roles:
            cursor.execute('''
                SELECT plan_name, end_date FROM subscriptions 
                WHERE user_id = ? AND end_date > CURRENT_TIMESTAMP
                ORDER BY end_date DESC LIMIT 1
            ''', (request.user_id,))
            subscription = cursor.fetchone()
        # Get recent activity
        cursor.execute('''
            SELECT activity_type, description, timestamp 
            FROM user_activity WHERE user_id = ? ORDER BY timestamp DESC LIMIT 5
        ''', (request.user_id,))
        activities = cursor.fetchall()
    return render_template('dashboard.html',
        current_user={
            'email': request.user_email,
            'roles': request.user_roles,
            'verified': user[0]
        },
        project_count=project_count,
        subscription=subscription,
        activities=activities
    )

@app.route('/api/activity', methods=['GET'])
@token_required
def get_activity():
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT activity_type, description, timestamp 
            FROM user_activity WHERE user_id = ? ORDER BY timestamp DESC LIMIT 5
        ''', (request.user_id,))
        activities = [dict(zip(('type', 'description', 'timestamp'), row)) for row in cursor.fetchall()]
    return jsonify(activities)

@app.route('/logout', methods=['POST'])
def logout():
    response = make_response(jsonify({'message': 'Logged out successfully'}))
    response.set_cookie('authToken', '', expires=0)
    return response

@app.route('/api/fx-rates', methods=['GET'])
def get_fx_rates():
    API_KEY = os.getenv('EXCHANGERATE_API_KEY')
    if not API_KEY:
        return jsonify({'error': 'FX API key not set'}), 500
    BASE_CURRENCY = request.args.get('base', 'GHS')
    url = f'https://v6.exchangerate-api.com/v6/{API_KEY}/latest/{BASE_CURRENCY}'

    try:
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            return jsonify({'error': 'Failed to fetch FX rates'}), 502
        data = response.json()
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)