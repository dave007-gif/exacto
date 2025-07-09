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

@main.route('/estimate')
@login_required
def estimate():
    return render_template('estimate.html')

@main.route('/estimate/preliminaries', methods=['POST'])
def estimate_preliminaries():
    data = request.get_json()

    try:
        duration = float(data.get('duration', 0))
        area = float(data.get('area', 0))
        project_type = data.get('project_type', '').lower()

        # Validate inputs
        if not (1 <= duration <= 60):
            return jsonify({'error': 'Duration must be between 1 and 60 months.'}), 400
        if not (50 <= area <= 50000):
            return jsonify({'error': 'Site area must be between 50 and 50,000 m².'}), 400
        if project_type not in ['residential', 'commercial', 'industrial']:
            return jsonify({'error': 'Invalid project type.'}), 400

        # Cost logic
        prelim_cost_per_m2 = 15
        total_cost = area * prelim_cost_per_m2

        breakdown = [
            f"Duration: {duration} months",
            f"Site Area: {area} m²",
            f"Project Type: {project_type.capitalize()}",
            "Temporary Site Office: 1 unit",
            f"Perimeter Fencing: {round(area * 1.2)} m",
            f"Site Staff (monthly): {int(duration)} staff-months",
            "Utilities Setup (Water & Power): 1 setup"
        ]

        return jsonify({
            'total_cost': f"${total_cost:,.2f}",
            'breakdown': breakdown
        })

    except Exception as e:
        return jsonify({'error': f"Server error: {str(e)}"}), 500
    

@main.route('/estimate/concrete', methods=['POST'])
def estimate_concrete():
    data = request.get_json()

    try:
        volume = float(data.get('volume', 0))
        grade = data.get('grade', '')
        formwork = data.get('formwork', '')

        # Input validations
        if not (0.1 <= volume <= 1000):
            return jsonify({'error': 'Volume should be between 0.1 and 1000 m³.'}), 400
        if not grade:
            return jsonify({'error': 'Select a concrete grade.'}), 400

        # Material calculations
        cement_bags = volume * 6.5
        sand_m3 = volume * 0.45
        gravel_m3 = volume * 0.85
        total_cost = volume * 500  # GHS 500 per m³ assumed

        breakdown = [
            f"Volume: {volume:.2f} m³",
            f"Concrete Grade: {grade}",
            f"Formwork Required: {formwork}",
            f"Cement (50kg bags): {round(cement_bags)}",
            f"Sand: {sand_m3:.2f} m³",
            f"Gravel: {gravel_m3:.2f} m³"
        ]

        return jsonify({
            'total_cost': f"GHS {total_cost:,.2f}",
            'breakdown': breakdown
        })

    except Exception as e:
        return jsonify({'error': f"Server error: {str(e)}"}), 500

@main.route('/estimate/masonry', methods=['POST'])
def estimate_masonry():
    data = request.get_json()

    try:
        area = float(data.get('area', 0))
        material = data.get('material', '').lower()
        thickness = data.get('thickness', '').lower()

        # Validation
        if not (1 <= area <= 10000):
            return jsonify({'error': 'Wall area should be between 1 and 10,000 m².'}), 400
        if material not in ['brick', 'block', 'stone']:
            return jsonify({'error': 'Invalid or missing masonry material.'}), 400
        if thickness not in ['150mm', '215mm']:
            return jsonify({'error': 'Invalid or missing wall thickness.'}), 400

        # Unit quantity logic
        if material == 'brick':
            units_per_m2 = 60 if thickness == '215mm' else 80
            cost_per_unit = 3
        elif material == 'block':
            units_per_m2 = 12 if thickness == '215mm' else 18
            cost_per_unit = 4
        else:  # stone
            units_per_m2 = 10
            cost_per_unit = 5

        total_units = area * units_per_m2
        total_cost = total_units * cost_per_unit

        breakdown = [
            f"Wall Area: {area:.2f} m²",
            f"Material: {material.capitalize()}",
            f"Wall Thickness: {thickness}",
            f"Material Quantity: {round(total_units)} units"
        ]

        return jsonify({
            'total_cost': f"GHS {total_cost:,.2f}",
            'breakdown': breakdown
        })

    except Exception as e:
        return jsonify({'error': f"Server error: {str(e)}"}), 500

@main.route('/estimate/carpentry', methods=['POST'])
def estimate_carpentry():
    data = request.get_json()

    try:
        carpentry_type = data.get('type', '').lower()
        quantity = int(data.get('quantity', 0))
        material = data.get('material', '').lower()

        valid_types = ['doors', 'windows', 'frames']
        valid_materials = ['wood', 'metal']

        if carpentry_type not in valid_types:
            return jsonify({'error': 'Invalid or missing carpentry work type.'}), 400
        if material not in valid_materials:
            return jsonify({'error': 'Invalid or missing carpentry material.'}), 400
        if quantity < 1:
            return jsonify({'error': 'Enter a valid quantity (at least 1).'}), 400

        cost_per_unit = {
            'wood': {'doors': 300, 'windows': 250, 'frames': 200},
            'metal': {'doors': 400, 'windows': 350, 'frames': 300}
        }

        unit_cost = cost_per_unit.get(material, {}).get(carpentry_type, 0)
        total_cost = unit_cost * quantity

        breakdown = [
            f"Work Type: {carpentry_type.capitalize()}",
            f"Material: {material.capitalize()}",
            f"Quantity: {quantity} units"
        ]

        return jsonify({
            'total_cost': f"GHS {total_cost:,.2f}",
            'breakdown': breakdown
        })

    except Exception as e:
        return jsonify({'error': f"Server error: {str(e)}"}), 500

@main.route('/estimate/roofing', methods=['POST'])
def estimate_roofing():
    data = request.get_json()

    try:
        sheet_count = int(data.get('sheet_count', 0))
        sheet_type = data.get('sheet_type', '').lower()

        if sheet_count < 1:
            return jsonify({'error': 'Enter a valid number of roofing sheets.'}), 400
        if sheet_type not in ['metal', 'asbestos']:
            return jsonify({'error': 'Invalid or missing roofing sheet type.'}), 400

        # Example cost per sheet (GHS)
        cost_per_sheet = 150 if sheet_type == 'metal' else 100
        total_cost = cost_per_sheet * sheet_count

        breakdown = [
            f"Roofing Sheets: {sheet_count}",
            f"Sheet Type: {sheet_type.capitalize()}",
            f"Material Quantity: {sheet_count} sheets"
        ]

        return jsonify({
            'total_cost': f"GHS {total_cost:,.2f}",
            'breakdown': breakdown
        })

    except Exception as e:
        return jsonify({'error': f"Server error: {str(e)}"}), 500

@main.route('/estimate/finishes', methods=['POST'])
def estimate_finishes():
    data = request.get_json()

    try:
        paint_liters = float(data.get('paint_liters', 0))
        tile_count = int(data.get('tile_count', 0))

        if paint_liters < 0:
            return jsonify({'error': 'Enter valid paint liters.'}), 400
        if tile_count < 0:
            return jsonify({'error': 'Enter valid tile quantity.'}), 400

        # Prices per unit (GHS)
        paint_cost_per_liter = 50
        tile_cost_per_unit = 30

        total_cost = (paint_liters * paint_cost_per_liter) + (tile_count * tile_cost_per_unit)

        breakdown = [
            f"Paint: {paint_liters:.2f} liters",
            f"Tiles: {tile_count} units"
        ]

        return jsonify({
            'total_cost': f"GHS {total_cost:,.2f}",
            'breakdown': breakdown
        })

    except Exception as e:
        return jsonify({'error': f"Server error: {str(e)}"}), 500

@main.route('/estimate/mechanical', methods=['POST'])
def estimate_mechanical():
    data = request.get_json()

    try:
        hvac_units = int(data.get('hvac_units', 0))
        plumbing_fixtures = int(data.get('plumbing_fixtures', 0))

        if hvac_units < 0:
            return jsonify({'error': 'Enter valid HVAC units.'}), 400
        if plumbing_fixtures < 0:
            return jsonify({'error': 'Enter valid plumbing fixtures count.'}), 400

        # Prices (GHS)
        hvac_unit_cost = 4000
        plumbing_fixture_cost = 800

        total_cost = (hvac_units * hvac_unit_cost) + (plumbing_fixtures * plumbing_fixture_cost)

        breakdown = [
            f"HVAC Units: {hvac_units}",
            f"Plumbing Fixtures: {plumbing_fixtures}"
        ]

        return jsonify({
            'total_cost': f"GHS {total_cost:,.2f}",
            'breakdown': breakdown
        })

    except Exception as e:
        return jsonify({'error': f"Server error: {str(e)}"}), 500

@main.route('/estimate/electrical', methods=['POST'])
def estimate_electrical():
    data = request.get_json()

    try:
        lights = int(data.get('lights', 0))
        outlets = int(data.get('outlets', 0))
        security_systems = int(data.get('security_systems', 0))

        if lights < 0:
            return jsonify({'error': 'Enter valid lighting fixtures count.'}), 400
        if outlets < 0:
            return jsonify({'error': 'Enter valid power outlets count.'}), 400
        if security_systems < 0:
            return jsonify({'error': 'Enter valid security systems count.'}), 400

        # Prices (GHS)
        light_cost = 250
        outlet_cost = 150
        security_cost = 3000

        total_cost = (lights * light_cost) + (outlets * outlet_cost) + (security_systems * security_cost)

        breakdown = [
            f"Lighting Fixtures: {lights}",
            f"Power Outlets: {outlets}",
            f"Security Systems: {security_systems}"
        ]

        return jsonify({
            'total_cost': f"GHS {total_cost:,.2f}",
            'breakdown': breakdown
        })

    except Exception as e:
        return jsonify({'error': f"Server error: {str(e)}"}), 500


@main.route('/projects')
@login_required
def projects():
    return render_template('projects.html')
