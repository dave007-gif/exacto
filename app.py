from flask import Flask, request, jsonify, render_template, redirect, make_response
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import jwt
import sqlite3
import os
from datetime import datetime, timedelta, timezone
from flask_cors import CORS
import requests
import json
import csv
import io
from dynaconf import FlaskDynaconf
import re
from flask import current_app as app


from flask_admin import Admin  # <-- Moved outside conditionally

app = Flask(__name__)
FlaskDynaconf(app, extensions_list="EXTENSIONS")

# Load extensions except those manually handled (like flask_admin)
if hasattr(app.config, "load_extensions"):
    app.config.load_extensions()

# Always register Flask-Admin manually to avoid duplicate blueprint issues
admin = Admin(app)

# Manually setup flask_debugtoolbar if in development mode
if app.config.get("DEBUG"):
    from flask_debugtoolbar import DebugToolbarExtension
    toolbar = DebugToolbarExtension()
    toolbar.init_app(app)

# Enable CORS
CORS(app, supports_credentials=True)

# Secret key and API configs
secret_key = app.config.SECRET_KEY
SENDGRID_KEY = app.config.get("SENDGRID_API_KEY", None)


# Add this region adjacency configuration at the top level of app.py

# Remove old REGION_NEIGHBORS dict
# Use this instead
def get_neighboring_regions(region):
    neighbors = app.config.get("REGION_NEIGHBORS", {})
    return neighbors.get(region, [])

import os, certifi
os.environ['SSL_CERT_FILE'] = certifi.where()


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

    #verification_tokens table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS verification_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL
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

    # Projects table (refactored)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            supplier_id INTEGER,  -- ✅ NEW: Preferred supplier (FK to Sources.id)

            project_name TEXT NOT NULL,
            project_location TEXT,
            supplier_location TEXT,

            total_cost REAL DEFAULT 0,
            formula_version TEXT DEFAULT '2023.1',
            rates_timestamp TEXT,

            calculation_data TEXT,         -- JSON of user inputs + breakdowns
            calculation_snapshot TEXT,     -- JSON of computed results + unit prices
            component_data TEXT,
            project_details TEXT,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,

            starred INTEGER DEFAULT 0,
            archived INTEGER DEFAULT 0,

            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (supplier_id) REFERENCES Sources(id) -- ✅ enforce supplier link
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
    #cursor.execute('''
     #   INSERT OR IGNORE INTO Sources (name, type, region, contact)
      #  VALUES ('Ghacem Ltd', 'supplier', 'greater-accra', '123-456-789'),
       #        ('Local Supplier', 'supplier', 'greater-accra', '987-654-321'),
        #       ('Block Factory', 'supplier', 'greater-accra', '555-555-555')
    #''')

    # Get source IDs
    #cursor.execute('SELECT id FROM Sources WHERE name = "Ghacem Ltd"')
    #ghacem_id = cursor.fetchone()[0]
    #cursor.execute('SELECT id FROM Sources WHERE name = "Local Supplier"')
    #local_supplier_id = cursor.fetchone()[0]
    #cursor.execute('SELECT id FROM Sources WHERE name = "Block Factory"')
    #block_factory_id = cursor.fetchone()[0]

    # Populate MaterialPrices table
    materials = [
        #(ghacem_id, 'cement', 85.00, '2023-01-01', '2023-12-31'),
        #(local_supplier_id, 'sand', 30.00, '2023-01-01', '2023-12-31'),
        #(local_supplier_id, 'aggregate', 60.00, '2023-01-01', '2023-12-31'),
        #(block_factory_id, 'blocks', 5.50, '2023-01-01', '2023-12-31'),
        #(local_supplier_id, 'mortar', 40.00, '2023-01-01', '2023-12-31'),
        #(local_supplier_id, 'water', 10.00, '2023-01-01', '2023-12-31')  # <-- Add this line
    ]
    #cursor.executemany('''
     #   INSERT OR IGNORE INTO MaterialPrices (source_id, material, unit_cost, valid_from, valid_to)
     #   VALUES (?, ?, ?, ?, ?)
    #''', materials)

    # Populate LaborRates table
    labor_rates = [
        #(local_supplier_id, 'tree cutting 600-1500', 20.00, '2023-01-01', '2023-12-31'),
        #(local_supplier_id, 'tree cutting 1500-3000', 35.00, '2023-01-01', '2023-12-31'),
        #(local_supplier_id, 'tree cutting over 3000', 60.00, '2023-01-01', '2023-12-31'),
        #(local_supplier_id, 'site clearance', 2.50, '2023-01-01', '2023-12-31'),
        #(local_supplier_id, 'excavation', 15.00, '2023-01-01', '2023-12-31'),
        #(local_supplier_id, 'bricklaying', 25.00, '2023-01-01', '2023-12-31'),
        #(local_supplier_id, 'concreting', 30.00, '2023-01-01', '2023-12-31'),
    ]
    #cursor.executemany('''
     #   INSERT OR IGNORE INTO LaborRates (source_id, task, rate, valid_from, valid_to)
     #   VALUES (?, ?, ?, ?, ?)
    #''', labor_rates)

    # Populate Adjustments table
    adjustments = [
        #('default', 1.05, 1.0, 0.2),  # Default region
        #('greater-accra', 1.07, 0.92, 0.25),  # Greater Accra region
        #('ashanti', 1.06, 0.95, 0.22)  # Example for another region
    ]
    #cursor.executemany('''
        #INSERT OR IGNORE INTO Adjustments (region, concrete_waste_factor, labor_efficiency, thickness)
        #VALUES (?, ?, ?, ?)
    #''', adjustments)

    # Populate Plants table
    plants = [
        ('Mixer', 400.00, 0.2),      # Mixer: GHS 400/day, 0.2 days per m³
        ('Crane', 1000.00, 0.1),     # Crane: GHS 1000/day, 0.1 days per m³
        ('Excavator', 1200.00, 0.15),# Excavator: GHS 1200/day, 0.15 days per m³
        ('Tipper Truck', 800.00, 0.1) # Tipper Truck: GHS 800/day, 0.1 days per m³
    ]
    #cursor.executemany('''
     #   INSERT OR IGNORE INTO Plants (equipment, daily_rate, duration_per_unit)
      #  VALUES (?, ?, ?)
    #''', plants)

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


def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = request.cookies.get('authToken')
        if not token:
            return "Unauthorized", 401
        try:
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            roles = payload.get('roles', [])
            if 'admin' not in roles:
                return "Forbidden: Admins only", 403
        except jwt.ExpiredSignatureError:
            return "Session expired", 401
        except jwt.InvalidTokenError:
            return "Invalid token", 401
        return f(*args, **kwargs)
    return wrapper


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

# Refactored handle_*_upload() functions with detailed row-level error messages and Dynaconf-safe config access

def handle_material_upload(csv_data):
    config = app.config
    required_fields = config.get("REQUIRED_MATERIAL_FIELDS", [])
    valid_regions = config.get("VALID_REGIONS", [])
    date_pattern = re.compile(config.get("REGEX_PATTERNS.date", r"^\d{4}-\d{2}-\d{2}$"))
    material_pattern = re.compile(config.get("REGEX_PATTERNS.material_name", r".+"))
    min_cost = config.get("MIN_UNIT_COST", 1)
    max_cost = config.get("MAX_UNIT_COST", 1000)

    inserted, skipped, errors = 0, 0, []

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        for i, row in enumerate(csv_data, 1):
            if not all(field in row and row[field].strip() for field in required_fields):
                skipped += 1
                errors.append(f"Row {i}: Missing required fields")
                continue

            try:
                material = row["material"].strip()
                unit_cost = float(row["unit_cost"])
                valid_from = row["valid_from"].strip()
                valid_to = row["valid_to"].strip()
                region = row["region"].strip()
                source_name = row.get("source", "unknown").strip()

                if not material_pattern.match(material):
                    raise ValueError("Invalid material name format")

                if not date_pattern.match(valid_from) or not date_pattern.match(valid_to):
                    raise ValueError("Invalid date format (yyyy-mm-dd expected)")

                if not (min_cost <= unit_cost <= max_cost):
                    raise ValueError(f"unit_cost {unit_cost} must be between {min_cost} and {max_cost}")

                if region not in valid_regions:
                    errors.append(f"Row {i}: Unknown region '{region}' — fallback may apply")

                cursor.execute('SELECT id FROM Sources WHERE name = ? AND region = ?', (source_name, region))
                src = cursor.fetchone()
                if not src:
                    cursor.execute('INSERT INTO Sources (name, type, region) VALUES (?, ?, ?)',
                                   (source_name, 'supplier', region))
                    source_id = cursor.lastrowid
                else:
                    source_id = src[0]

                cursor.execute('SELECT 1 FROM MaterialPrices WHERE material=? AND source_id=? AND valid_from=?',
                               (material, source_id, valid_from))
                if cursor.fetchone():
                    skipped += 1
                    errors.append(f"Row {i}: Material '{material}' already exists for this source and date — skipped")
                    continue

                cursor.execute('''
                    INSERT INTO MaterialPrices (source_id, material, unit_cost, valid_from, valid_to)
                    VALUES (?, ?, ?, ?, ?)
                ''', (source_id, material, unit_cost, valid_from, valid_to))
                inserted += 1

            except Exception as e:
                skipped += 1
                errors.append(f"Row {i}: {str(e)}")

        conn.commit()
    return inserted, skipped, errors

def handle_labor_upload(rows):
    config = app.config
    required = set(config.get("REQUIRED_LABOR_FIELDS", []))
    valid_regions = config.get("VALID_REGIONS", [])
    regex = config.get("REGEX_PATTERNS", {})
    thresholds = config.get("LABOR_THRESHOLDS", {})
    date_pattern = re.compile(regex.get("date", r"^\d{4}-\d{2}-\d{2}$"))

    inserted, skipped, errors = 0, 0, []

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()

        for i, row in enumerate(rows, 1):
            if not required.issubset(row.keys()):
                errors.append(f"Row {i}: Missing required fields")
                skipped += 1
                continue

            try:
                task = row["task"].strip()
                rate = float(row["rate"])
                region = row["region"].strip()
                valid_from = row["valid_from"].strip()
                valid_to = row["valid_to"].strip()
                source = row.get("source", "unknown").strip()

                if not date_pattern.match(valid_from) or not date_pattern.match(valid_to):
                    raise ValueError("Invalid date format")

                if region not in valid_regions:
                    errors.append(f"Row {i}: Unknown region '{region}' — fallback may apply")

                if not (thresholds.get("min_rate", 0) <= rate <= thresholds.get("max_rate", 1000)):
                    raise ValueError(f"Rate {rate} out of range")

                cursor.execute('SELECT id FROM Sources WHERE name = ? AND region = ?', (source, region))
                src = cursor.fetchone()
                if not src:
                    cursor.execute('INSERT INTO Sources (name, type, region) VALUES (?, ?, ?)',
                                   (source, 'supplier', region))
                    source_id = cursor.lastrowid
                else:
                    source_id = src[0]

                cursor.execute('SELECT 1 FROM LaborRates WHERE task=? AND source_id=? AND valid_from=?',
                               (task, source_id, valid_from))
                if cursor.fetchone():
                    skipped += 1
                    errors.append(f"Row {i}: Task '{task}' already exists for this source and date — skipped")
                    continue

                cursor.execute('''
                    INSERT INTO LaborRates (source_id, task, rate, valid_from, valid_to)
                    VALUES (?, ?, ?, ?, ?)
                ''', (source_id, task, rate, valid_from, valid_to))
                inserted += 1

            except Exception as e:
                errors.append(f"Row {i}: {str(e)}")
                skipped += 1

        conn.commit()
    return inserted, skipped, errors


def handle_plant_upload(rows):
    config = app.config
    required = set(config.get("REQUIRED_PLANT_FIELDS", []))
    thresholds = config.get("PLANT_THRESHOLDS", {})

    inserted, skipped, errors = 0, 0, []

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()

        for i, row in enumerate(rows, 1):
            if not required.issubset(row.keys()):
                errors.append(f"Row {i}: Missing required fields")
                skipped += 1
                continue

            try:
                equipment = row['equipment'].strip()
                daily_rate = float(row['daily_rate'])
                duration = float(row['duration_per_unit'])

                if not (thresholds.get("min_rate", 0) <= daily_rate <= thresholds.get("max_rate", 10000)):
                    raise ValueError(f"Invalid daily rate {daily_rate}")

                if not (0.01 <= duration <= 100):
                    raise ValueError(f"Invalid duration per unit {duration}")

                cursor.execute('SELECT 1 FROM Plants WHERE equipment=?', (equipment,))
                if cursor.fetchone():
                    skipped += 1
                    errors.append(f"Row {i}: Equipment '{equipment}' already exists — skipped")
                    continue

                cursor.execute('''
                    INSERT INTO Plants (equipment, daily_rate, duration_per_unit)
                    VALUES (?, ?, ?)
                ''', (equipment, daily_rate, duration))
                inserted += 1

            except Exception as e:
                errors.append(f"Row {i}: {str(e)}")
                skipped += 1

        conn.commit()
    return inserted, skipped, errors

def handle_adjustment_upload(rows):
    config = app.config
    required = set(config.get("REQUIRED_ADJUSTMENT_FIELDS", []))
    thresholds = config.get("ADJUSTMENT_THRESHOLDS", {})

    inserted, skipped, errors = 0, 0, []

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        for i, row in enumerate(rows, 1):
            if not required.issubset(row.keys()):
                errors.append(f"Row {i}: Missing required fields")
                skipped += 1
                continue

            try:
                region = row["region"].strip().lower()
                cwf = float(row["concrete_waste_factor"])
                eff = float(row["labor_efficiency"])
                thick = float(row["thickness"])

                if not (thresholds.get("min_factor", 0.5) <= cwf <= thresholds.get("max_factor", 2.0)):
                    raise ValueError("concrete_waste_factor out of range")

                if not (thresholds.get("min_factor", 0.5) <= eff <= thresholds.get("max_factor", 2.0)):
                    raise ValueError("labor_efficiency out of range")

                if not (thresholds.get("min_thickness", 0.01) <= thick <= thresholds.get("max_thickness", 1.0)):
                    raise ValueError("thickness out of range")

                cursor.execute('SELECT 1 FROM Adjustments WHERE region = ?', (region,))
                if cursor.fetchone():
                    cursor.execute('''
                        UPDATE Adjustments
                        SET concrete_waste_factor = ?, labor_efficiency = ?, thickness = ?
                        WHERE region = ?
                    ''', (cwf, eff, thick, region))
                else:
                    cursor.execute('''
                        INSERT INTO Adjustments (region, concrete_waste_factor, labor_efficiency, thickness)
                        VALUES (?, ?, ?, ?)
                    ''', (region, cwf, eff, thick))

                inserted += 1

            except Exception as e:
                errors.append(f"Row {i}: {str(e)}")
                skipped += 1

        conn.commit()
    return inserted, skipped, errors

def handle_source_upload(rows):
    config = app.config
    required = set(config.get("REQUIRED_SOURCES_FIELDS", []))
    name_pattern = re.compile(config.get("REGEX_PATTERNS.supplier_name", r".+"))
    phone_pattern = re.compile(config.get("REGEX_PATTERNS.phone_number", r".+"))

    inserted, skipped, errors = 0, 0, []

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()

        for i, row in enumerate(rows, 1):
            if not required.issubset(row.keys()):
                skipped += 1
                errors.append(f"Row {i}: Missing required fields")
                continue

            try:
                name = row["name"].strip()
                type_ = row["type"].strip().lower()
                region = row["region"].strip()
                contact = row["contact"].strip()

                if type_ not in {"supplier", "manufacturer"}:
                    raise ValueError("Invalid source type")

                if not name_pattern.match(name):
                    raise ValueError("Invalid supplier name format")

                if not phone_pattern.match(contact):
                    raise ValueError("Invalid contact format")

                cursor.execute('SELECT id FROM Sources WHERE name = ? AND region = ?', (name, region))
                existing = cursor.fetchone()
                if existing:
                    cursor.execute('''
                        UPDATE Sources
                        SET type = ?, contact = ?
                        WHERE id = ?
                    ''', (type_, contact, existing[0]))
                    errors.append(f"Row {i}: Supplier '{name}' updated in region '{region}'")
                else:
                    cursor.execute('''
                        INSERT INTO Sources (name, type, region, contact)
                        VALUES (?, ?, ?, ?)
                    ''', (name, type_, region, contact))
                    inserted += 1

            except Exception as e:
                skipped += 1
                errors.append(f"Row {i}: {str(e)}")

        conn.commit()

    return inserted, skipped, errors

def log_admin_upload(admin_id, category, filename, inserted, skipped):
    description = f'Uploaded {category} file: {filename} (inserted={inserted}, skipped={skipped})'
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO user_activity (user_id, activity_type, description)
            VALUES (?, ?, ?)
        ''', (admin_id, 'upload_csv', description))
        conn.commit()



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
    expiration = datetime.now(timezone.utc) + timedelta(hours=app.config.get('PASSWORD_RESET_EXPIRATION_HOURS', 1))

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
        cursor.execute('''
            SELECT concrete_waste_factor, labor_efficiency, thickness
            FROM Adjustments
            WHERE region = ?
        ''', (region,))
        result = cursor.fetchone()

    if result:
        concrete_waste_factor, labor_efficiency, thickness = result
    else:
        # 🟡 Fall back to Dynaconf defaults if not found in DB
        concrete_waste_factor = app.config.get("DEFAULT_CONCRETE_WASTE_FACTOR", 1.05)
        labor_efficiency = app.config.get("DEFAULT_LABOR_EFFICIENCY", 1.0)
        thickness = app.config.get("DEFAULT_THICKNESS", 0.2)

    return jsonify({
        'region': region,
        'concrete_waste_factor': concrete_waste_factor,
        'labor_efficiency': labor_efficiency,
        'thickness': thickness,
        'source': 'database' if result else 'default_config'
    })


from dynaconf import settings
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

def send_verification_email(to_email, token):
    verify_link = f"{settings.BASE_URL}/verify-email/{token}"
    message = Mail(
        from_email=settings.SENDER_EMAIL,
        to_emails=to_email,
        subject='Verify Your Account',
        html_content=f'<p>Click <a href="{verify_link}">here</a> to verify your account.</p>'
    )
    try:
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        sg.send(message)
    except Exception as e:
        print(f"❌ Error sending verification email: {e}")


def send_password_reset_email(to_email, token):
    reset_link = f"{settings.BASE_URL}/reset-password/{token}"
    message = Mail(
        from_email=settings.SENDER_EMAIL,
        to_emails=to_email,
        subject='Password Reset Request',
        html_content=f'<p>Click <a href="{reset_link}">here</a> to reset your password.</p>'
    )
    try:
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        sg.send(message)
    except Exception as e:
        print(f"❌ Error sending reset email: {e}")


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
    role = data.get('role') or 'student'

    if not email or not password:
        return jsonify({'message': 'Missing required fields'}), 400

    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')

    try:
        with sqlite3.connect('users.db') as conn:
            cursor = conn.cursor()
            cursor.execute('INSERT INTO users (email, password, verified) VALUES (?, ?, 0)', (email, hashed_password))
            user_id = cursor.lastrowid

            # Assign role
            cursor.execute('SELECT id FROM roles WHERE name = ?', (role,))
            role_row = cursor.fetchone()
            if not role_row:
                return jsonify({'message': f'Role "{role}" does not exist'}), 400
            role_id = role_row[0]
            cursor.execute('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', (user_id, role_id))

            # Generate and store verification token
            import secrets
            token = secrets.token_urlsafe(32)
            expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
            cursor.execute('''
                INSERT INTO verification_tokens (email, token, expires_at)
                VALUES (?, ?, ?)
            ''', (email, token, expires_at))
            conn.commit()

        send_verification_email(email, token)
        return jsonify({'message': 'Signup successful! Check your email to verify your account.'})

    except sqlite3.IntegrityError:
        return jsonify({'message': 'User already exists'}), 400


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
        cursor.execute('SELECT id, password, verified FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()

    if not user or not check_password_hash(user[1], password):
        return jsonify({'message': 'Invalid credentials'}), 401

    if not user[2]:  # not verified
        return jsonify({'message': 'Please verify your email before logging in.'}), 403

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

    # Encode token with roles
    token = jwt.encode({
        'email': email,
        'user_id': user_id,
        'roles': roles,
        'exp': datetime.now(timezone.utc) + timedelta(hours=app.config.get('JWT_EXPIRATION_HOURS', 1))
    }, app.config['SECRET_KEY'], algorithm="HS256")

    # 🔁 Redirect based on role
    if 'admin' in roles:
        redirect_url = '/admin_upload'
    else:
        redirect_url = '/dashboard'

    response = make_response(jsonify({
        'message': 'Login successful!',
        'redirect': redirect_url
    }))
    response.set_cookie('authToken', token, httponly=True, samesite='Strict', secure=True)
    return response


@app.route('/verify-email/<token>', methods=['GET'])
def verify_email(token):
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT email FROM verification_tokens WHERE token = ? AND expires_at > ?', (token, datetime.now()))
        result = cursor.fetchone()

        if not result:
            return 'Invalid or expired verification link.', 400

        email = result[0]
        cursor.execute('UPDATE users SET verified = 1 WHERE email = ?', (email,))
        cursor.execute('DELETE FROM verification_tokens WHERE token = ?', (token,))
        conn.commit()

    return 'Email verified successfully! You may now log in.', 200


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

# Resend Reset Link Endpoint
@app.route('/resend-verification', methods=['POST'])
def resend_verification():
    email = request.json.get('email')

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id, verified FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()

    if not user:
        return jsonify({'message': 'If your email exists, a new verification will be sent.'}), 200

    if user[1]:  # Already verified
        return jsonify({'message': 'Account already verified.'}), 200

    # Generate verification token
    import secrets
    token = secrets.token_urlsafe(32)
    expiration = datetime.now(timezone.utc) + timedelta(hours=app.config.get('EMAIL_VERIFICATION_EXPIRATION_HOURS', 24))

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO verification_tokens (email, token, expires_at)
            VALUES (?, ?, ?)
        ''', (email, token, expiration))
        conn.commit()

    send_verification_email(email, token)

    return jsonify({'message': 'Verification email sent if account exists.'})



# Resend Password Reset Link
@app.route('/resend-reset-link', methods=['POST'])
def resend_reset_link():
    email = request.json.get('email')

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()

    if not user:
        return jsonify({'message': 'If your email exists, a reset link will be sent.'}), 200

    # Generate new reset token
    import secrets
    token = secrets.token_urlsafe(32)
    expiration = datetime.now(timezone.utc) + timedelta(hours=app.config.get('PASSWORD_RESET_EXPIRATION_HOURS', 1))

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO password_resets (email, token, expiration)
            VALUES (?, ?, ?)
        ''', (email, token, expiration))
        conn.commit()

    send_password_reset_email(email, token)

    return jsonify({'message': 'Reset link sent if account exists.'})

@app.route('/api/upload-prices/<category>', methods=['POST'])
@role_required('admin')
def upload_price_csv(category):
    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400

    if not file.filename.endswith('.csv'):
        return jsonify({'message': 'File must be a CSV'}), 400

    stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
    csv_data = list(csv.DictReader(stream))

    if category == 'materials':
        inserted, skipped, errors = handle_material_upload(csv_data)
    elif category == 'labor':
        inserted, skipped, errors = handle_labor_upload(csv_data)
    elif category == 'plants':
        inserted, skipped, errors = handle_plant_upload(csv_data)
    elif category == 'adjustments':
        inserted, skipped, errors = handle_adjustment_upload(csv_data)
    elif category == 'sources':
        inserted, skipped, errors = handle_source_upload(csv_data)
    else:
        return jsonify({'message': f'Unknown category: {category}'}), 400

    # ✅ Log upload
    log_admin_upload(request.user_id, category, file.filename, inserted, skipped)

    return jsonify({
        'message': f'{category.title()} data uploaded',
        'category': category,
        'inserted': inserted,
        'skipped': skipped,
        'errors': errors
    })

@app.route('/setup-admin')
def setup_admin():
    import sqlite3
    from werkzeug.security import generate_password_hash

    email = app.config.get('ADMIN_EMAIL', 'admin@gmail.com')
    raw_password = app.config.get('ADMIN_PASSWORD', '1234')  # Set it safely here
    hashed_password = generate_password_hash(raw_password)

    try:
        with sqlite3.connect('users.db') as conn:
            cursor = conn.cursor()

            # Step 1: Insert admin user
            cursor.execute('''
                INSERT OR IGNORE INTO users (email, password, verified)
                VALUES (?, ?, 1)
            ''', (email, hashed_password))

            # Step 2: Insert admin role if missing
            cursor.execute('''
                INSERT OR IGNORE INTO roles (name, description)
                VALUES ('admin', 'Superuser with upload access')
            ''')

            # Step 3: Assign admin role to user
            cursor.execute('''
                INSERT OR IGNORE INTO user_roles (user_id, role_id)
                SELECT u.id, r.id FROM users u, roles r
                WHERE u.email = ? AND r.name = 'admin'
            ''', (email,))

            conn.commit()
        return '✅ Admin user setup complete.'
    except Exception as e:
        return f'❌ Error: {e}', 500


@app.route("/admin_upload", methods=["GET"])
@admin_required
def admin_upload_page():
    return render_template("admin_upload.html")


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
    project_name = data.get('name') or data.get('project_name')  # Allow either field
    project_loc = data.get('project_location')
    supplier_loc = data.get('supplier_location')
    supplier_id = data.get('supplier_id')  # ✅ Accept supplier_id
    formula_version = data.get('formula_version', '2023.1')
    rates_timestamp = data.get('rates_timestamp')
    calculation_data = data.get('calculation_data', '{}')
    total_cost = data.get('total_cost', 0)

    if not project_name:
        return jsonify({'message': 'Project name required'}), 400

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO Projects (
                user_id, project_name, project_location, supplier_location,
                formula_version, rates_timestamp, calculation_data, total_cost,
                supplier_id  -- ✅ New column
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            request.user_id, project_name, project_loc, supplier_loc,
            formula_version, rates_timestamp, calculation_data, total_cost,
            supplier_id  # ✅ Store it
        ))
        project_id = cursor.lastrowid
        conn.commit()

    return jsonify({'message': 'Project created', 'project_id': project_id}), 201


@app.route('/api/projects/<int:project_id>', methods=['GET'])
@token_required
def api_get_project(project_id):
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT P.id, P.project_name, P.project_location, P.supplier_location,
                   P.total_cost, P.formula_version, P.rates_timestamp,
                   P.calculation_data, P.last_modified, P.project_details,
                   S.name as supplier_name, S.region as supplier_region, S.contact as supplier_contact
            FROM Projects P
            LEFT JOIN Sources S ON P.supplier_id = S.id
            WHERE P.id = ? AND P.user_id = ?
        ''', (project_id, request.user_id))
        row = cursor.fetchone()

    if not row:
        return jsonify({'message': 'Project not found'}), 404

    keys = [
        'id', 'project_name', 'project_location', 'supplier_location',
        'total_cost', 'formula_version', 'rates_timestamp',
        'calculation_data', 'last_modified', 'project_details',
        'supplier_name', 'supplier_region', 'supplier_contact'
    ]
    project = dict(zip(keys, row))

    # Parse project_details JSON if present
    if project.get('project_details'):
        try:
            project['project_details'] = json.loads(project['project_details'])
        except Exception:
            project['project_details'] = None

    return jsonify(project)

@app.route('/api/projects/<int:project_id>', methods=['PUT'])
@role_required('professional', 'firm')
@log_activity("Updated project")
def api_update_project(project_id):
    data = request.json
    calculation_data = data.get('calculation_data')
    calculation_snapshot = data.get('calculation_snapshot')  # NEW
    total_cost = data.get('total_cost')
    formula_version = data.get('formula_version', '2023.1')
    rates_snapshot = data.get('rates_snapshot')  # NEW

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE Projects
            SET calculation_data = ?, calculation_snapshot = ?, total_cost = ?, formula_version = ?, rates_timestamp = ?, last_modified = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        ''', (
            calculation_data,
            calculation_snapshot,
            total_cost,
            formula_version,
            json.dumps(rates_snapshot) if rates_snapshot else None,
            project_id,
            request.user_id
        ))
        conn.commit()

    return jsonify({'message': 'Project updated'})



# --- Supplier Management Endpoints ---

@app.route('/suppliers')
@role_required('professional', 'firm')
def supplier_page():
    return render_template('suppliers.html')


@app.route('/api/suppliers', methods=['GET'])
@token_required
def list_suppliers():
    with sqlite3.connect('users.db') as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT id, name, region, contact FROM Sources WHERE type = "supplier"')
        suppliers = [dict(row) for row in cursor.fetchall()]

    return jsonify(suppliers)


@app.route('/api/suppliers', methods=['POST'])
@role_required('professional', 'firm')
def add_supplier():
    data = request.json or {}
    name = data.get('name', '').strip()
    region = data.get('region', '').strip()
    contact = data.get('contact', '').strip()

    if not name or not region:
        return jsonify({'message': 'Name and region are required'}), 400

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()

        # Check for existing supplier with same name and region
        cursor.execute('SELECT id FROM Sources WHERE name = ? AND region = ? AND type = "supplier"', (name, region))
        existing = cursor.fetchone()
        if existing:
            return jsonify({'message': f"Supplier '{name}' in region '{region}' already exists."}), 409

        cursor.execute('''
            INSERT INTO Sources (name, type, region, contact)
            VALUES (?, 'supplier', ?, ?)
        ''', (name, region, contact or None))
        supplier_id = cursor.lastrowid
        conn.commit()

    return jsonify({
        'message': 'Supplier added',
        'supplier': {
            'id': supplier_id,
            'name': name,
            'region': region,
            'contact': contact or ''
        }
    }), 201

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
    region = request.args.get('region', 'default').lower()
    fallback_enabled = app.config.get("FALLBACK_ENABLED", True)
    fallback_order = app.config.get("FALLBACK_ORDER", ["neighbor", "national"])
    max_depth = app.config.get("MAX_FALLBACK_DEPTH", 2)
    fallback_applied = None

    def fetch_data(region_option):
        with sqlite3.connect('users.db') as conn:
            cursor = conn.cursor()

            cursor.execute('''
                SELECT material, unit_cost FROM MaterialPrices
                WHERE source_id IN (SELECT id FROM Sources WHERE region = ?)
            ''', (region_option,))
            materials = {row[0]: row[1] for row in cursor.fetchall()}

            cursor.execute('''
                SELECT task, rate FROM LaborRates
                WHERE source_id IN (SELECT id FROM Sources WHERE region = ?)
            ''', (region_option,))
            labor = {row[0]: row[1] for row in cursor.fetchall()}

        return materials, labor

    materials, labor = fetch_data(region)
    fallback_depth = 0

    if fallback_enabled:
        for method in fallback_order:
            if (materials and labor) or fallback_depth >= max_depth:
                break

            if method == "neighbor":
                for neighbor in get_neighboring_regions(region):
                    m, l = fetch_data(neighbor)
                    if not materials: materials = m
                    if not labor: labor = l
                    if materials or labor:
                        fallback_applied = f"neighbor ({neighbor})"
                        break

            elif method == "national":
                m, l = fetch_data("national")
                if not materials: materials = m
                if not labor: labor = l
                if materials or labor:
                    fallback_applied = "national"
                    break

            fallback_depth += 1

    response = {
        'materials': materials,
        'labor': labor,
        'region': region,
        'timestamp': datetime.now().isoformat()
    }
    if fallback_applied:
        response['warning'] = f"Fallback used: {fallback_applied}"

    return jsonify(response)



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
    region = request.args.get('region', '').title()
    fallback_used = None

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()

        fallback_enabled = app.config.get("FALLBACK_ENABLED", True)
        fallback_order = app.config.get("FALLBACK_ORDER", ["neighbor", "national"])
        max_depth = app.config.get("MAX_FALLBACK_DEPTH", 2)
        fallback_depth = 0

        def query(region_name):
            cursor.execute('''
                SELECT unit_cost, valid_from, valid_to, s.region
                FROM MaterialPrices m
                JOIN Sources s ON m.source_id = s.id
                WHERE m.material = ? AND s.region = ?
                ORDER BY valid_from DESC
                LIMIT 1
            ''', (material, region_name))
            return cursor.fetchone()

        result = query(region)

        if not result and fallback_enabled:
            for method in fallback_order:
                if result or fallback_depth >= max_depth:
                    break
                if method == "neighbor":
                    for neighbor in get_neighboring_regions(region):
                        result = query(neighbor)
                        if result:
                            fallback_used = neighbor
                            break
                elif method == "national":
                    cursor.execute('''
                        SELECT AVG(unit_cost), MIN(valid_from), MAX(valid_to)
                        FROM MaterialPrices
                        WHERE material = ?
                    ''', (material,))
                    avg_result = cursor.fetchone()
                    if avg_result and avg_result[0] is not None:
                        result = (*avg_result, 'National Average')
                        fallback_used = "national"
                fallback_depth += 1

    if not result:
        return jsonify({'message': f'Price for material "{material}" not found'}), 404

    unit_cost, valid_from, valid_to, source_region = result
    return jsonify({
        'material': material,
        'unit_cost': round(unit_cost, 2),
        'valid_from': valid_from,
        'valid_to': valid_to,
        'region': source_region,
        'fallback': fallback_used or None
    })



# GET /api/labor/:trade
@app.route('/api/labor/<trade>', methods=['GET'])
@token_required
def get_labor_rate(trade):
    region = request.args.get('region', '').title()
    fallback_used = None

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()

        fallback_enabled = app.config.get("FALLBACK_ENABLED", True)
        fallback_order = app.config.get("FALLBACK_ORDER", ["neighbor", "national"])
        max_depth = app.config.get("MAX_FALLBACK_DEPTH", 2)
        fallback_depth = 0

        def query(region_name):
            cursor.execute('''
                SELECT rate, valid_from, valid_to, s.region
                FROM LaborRates l
                JOIN Sources s ON l.source_id = s.id
                WHERE l.task = ? AND s.region = ?
                ORDER BY valid_from DESC
                LIMIT 1
            ''', (trade, region_name))
            return cursor.fetchone()

        result = query(region)

        if not result and fallback_enabled:
            for method in fallback_order:
                if result or fallback_depth >= max_depth:
                    break
                if method == "neighbor":
                    for neighbor in get_neighboring_regions(region):
                        result = query(neighbor)
                        if result:
                            fallback_used = neighbor
                            break
                elif method == "national":
                    cursor.execute('''
                        SELECT AVG(rate), MIN(valid_from), MAX(valid_to)
                        FROM LaborRates
                        WHERE task = ?
                    ''', (trade,))
                    avg_result = cursor.fetchone()
                    if avg_result and avg_result[0] is not None:
                        result = (*avg_result, 'National Average')
                        fallback_used = "national"
                fallback_depth += 1

    if not result:
        return jsonify({'message': f'Labor rate for task "{trade}" not found'}), 404

    rate, valid_from, valid_to, source_region = result
    return jsonify({
        'trade': trade,
        'rate': round(rate, 2),
        'valid_from': valid_from,
        'valid_to': valid_to,
        'region': source_region,
        'fallback': fallback_used or None
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
    API_KEY = app.config.get('EXCHANGERATE_API_KEY')
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

# --- 2. ENHANCED PROJECT LIST API ---
@app.route('/api/projects', methods=['GET'])
@token_required	
def api_list_projects():
    filter_type = request.args.get('filter', 'all')
    sort = request.args.get('sort', 'last_modified')
    order = request.args.get('order', 'desc')
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('page_size', 10))
    offset = (page - 1) * page_size

    # WHERE clause
    where = "user_id = ?"
    params = [request.user_id]
    if filter_type == 'starred':
        where += " AND starred = 1"
    elif filter_type == 'archived':
        where += " AND archived = 1"
    elif filter_type == 'recent':
        where += " AND archived = 0"
    else:
        where += " AND archived = 0"

    sort_fields = {'name': 'project_name', 'cost': 'total_cost', 'date': 'last_modified'}
    sort_field = sort_fields.get(sort, 'last_modified')
    order = 'ASC' if order == 'asc' else 'DESC'

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute(f'''
            SELECT id, project_name, total_cost, last_modified, formula_version, starred, archived
            FROM Projects
            WHERE {where}
            ORDER BY {sort_field} {order}
            LIMIT ? OFFSET ?
        ''', (*params, page_size, offset))
        projects = [
            dict(zip(['id', 'project_name', 'total_cost', 'last_modified', 'formula_version', 'starred', 'archived'], row))
            for row in cursor.fetchall()
        ]
        cursor.execute(f'SELECT COUNT(*) FROM Projects WHERE {where}', params)
        total_count = cursor.fetchone()[0]

    return jsonify({'projects': projects, 'total': total_count, 'page': page, 'page_size': page_size})


# --- API to update project details ---
@app.route('/api/projects/<int:project_id>/details', methods=['PUT'])
@token_required
def update_project_details(project_id):
    data = request.json
    # Validate required fields
    required = ['companyName', 'companyAddress', 'contactInfo', 'projectTitle', 'clientName']
    if not all(data.get(k) for k in required):
        return jsonify({'message': 'Missing required project/company details'}), 400

    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE Projects
            SET project_details = ?, last_modified = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        ''', (json.dumps(data), project_id, request.user_id))
        conn.commit()
    return jsonify({'message': 'Project details updated'})

# --- API to get project details ---
@app.route('/api/projects/<int:project_id>/details', methods=['GET'])
@token_required
def get_project_details(project_id):
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT project_details FROM Projects
            WHERE id = ? AND user_id = ?
        ''', (project_id, request.user_id))
        row = cursor.fetchone()
    if not row or not row[0]:
        return jsonify({'message': 'No project/company details found'}), 404
    return jsonify(json.loads(row[0]))

# --- 3. STAR/ARCHIVE ENDPOINTS ---
@app.route('/api/projects/<int:project_id>/star', methods=['POST'])
@token_required
def star_project(project_id):
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('UPDATE Projects SET starred = 1 WHERE id = ? AND user_id = ?', (project_id, request.user_id))
        conn.commit()
    return jsonify({'message': 'Project starred'})

@app.route('/api/projects/<int:project_id>/archive', methods=['POST'])
@role_required('professional', 'firm')
def archive_project(project_id):
    with sqlite3.connect('users.db') as conn:
        cursor = conn.cursor()
        cursor.execute('UPDATE Projects SET archived = 1 WHERE id = ? AND user_id = ?', (project_id, request.user_id))
        conn.commit()
    return jsonify({'message': 'Project archived'})


if __name__ == '__main__':
    app.run(debug=True)