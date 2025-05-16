from flask import Flask, request, jsonify, render_template, redirect, make_response
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import jwt
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

    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            user_type TEXT NOT NULL
        )
    ''')

    # Projects table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_name TEXT NOT NULL,
            total_cost REAL DEFAULT 0
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
        (local_supplier_id, 'bricklaying', 25.00, '2023-01-01', '2023-12-31'),
        (local_supplier_id, 'concreting', 30.00, '2023-01-01', '2023-12-31')
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
        ('Mixer', 400.00, 0.2),  # Mixer: GHS 400/day, 0.2 days per m³
        ('Crane', 1000.00, 0.1)  # Crane: GHS 1000/day, 0.1 days per m³
    ]
    cursor.executemany('''
        INSERT OR IGNORE INTO Plants (equipment, daily_rate, duration_per_unit)
        VALUES (?, ?, ?)
    ''', plants)

    conn.commit()
    conn.close()

# Call the function to populate the database
populate_initial_data()

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

# GET /projects
@app.route('/projects', methods=['GET'])
@token_required
def get_projects():
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM Projects')
        projects = cursor.fetchall()
    return jsonify({'projects': projects})

# POST /projects
@app.route('/projects', methods=['POST'])
@token_required
def create_project():
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

if __name__ == '__main__':
    app.run(debug=True)