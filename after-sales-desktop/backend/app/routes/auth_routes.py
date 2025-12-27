from flask import Blueprint, jsonify, request
from app.services.auth_service import AuthService

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
auth_service = AuthService()

# ==================== AUTH ROUTES ====================

@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'success': False, 'error': 'Username and password required'}), 400
        
        user = auth_service.authenticate_user(username, password)
        
        if user:
            return jsonify({
                'success': True,
                'user': user
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== ADMIN ROUTES ====================

@auth_bp.route('/admin/verify', methods=['POST'])
def verify_admin():
    """Verify admin credentials"""
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        if auth_service.verify_admin(username, password):
            return jsonify({'success': True, 'message': 'Admin verified'}), 200
        else:
            return jsonify({'success': False, 'error': 'Invalid admin credentials'}), 401
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@auth_bp.route('/admin/register-personnel', methods=['POST'])
def register_personnel():
    """Register new personnel (admin only)"""
    try:
        # Verify admin first
        admin_username = request.headers.get('X-Admin-Username')
        admin_password = request.headers.get('X-Admin-Password')
        
        if not auth_service.verify_admin(admin_username, admin_password):
            return jsonify({'success': False, 'error': 'Admin verification failed'}), 401
        
        data = request.json
        required_fields = ['username', 'password', 'name', 'role']
        
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'{field} is required'}), 400
        
        personnel_id = auth_service.register_personnel(data)
        
        if personnel_id:
            return jsonify({
                'success': True,
                'personnel_id': personnel_id,
                'message': f'Personnel {data.get("name")} registered successfully'
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Failed to register personnel'}), 500

    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@auth_bp.route('/admin/personnel-list', methods=['GET'])
def get_personnel_list():
    """Get all personnel (admin only)"""
    try:
        admin_username = request.headers.get('X-Admin-Username')
        admin_password = request.headers.get('X-Admin-Password')
        
        if not auth_service.verify_admin(admin_username, admin_password):
            return jsonify({'success': False, 'error': 'Admin verification failed'}), 401
        
        personnel = auth_service.get_all_personnel()
        
        return jsonify({
            'success': True,
            'personnel': personnel,
            'count': len(personnel)
        }), 200
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@auth_bp.route('/admin/update-personnel/<int:personnel_id>', methods=['PUT'])
def update_personnel(personnel_id):
    """Update personnel details (admin only)"""
    try:
        admin_username = request.headers.get('X-Admin-Username')
        admin_password = request.headers.get('X-Admin-Password')
        
        if not auth_service.verify_admin(admin_username, admin_password):
            return jsonify({'success': False, 'error': 'Admin verification failed'}), 401
        
        data = request.json
        success = auth_service.update_personnel(personnel_id, data)
        
        if success:
            return jsonify({'success': True, 'message': 'Personnel updated'}), 200
        else:
            return jsonify({'success': False, 'error': 'Failed to update personnel'}), 500

    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@auth_bp.route('/admin/deactivate-personnel/<int:personnel_id>', methods=['POST'])
def deactivate_personnel(personnel_id):
    """Deactivate personnel (admin only)"""
    try:
        admin_username = request.headers.get('X-Admin-Username')
        admin_password = request.headers.get('X-Admin-Password')
        
        if not auth_service.verify_admin(admin_username, admin_password):
            return jsonify({'success': False, 'error': 'Admin verification failed'}), 401
        
        success = auth_service.deactivate_personnel(personnel_id)
        
        if success:
            return jsonify({'success': True, 'message': 'Personnel deactivated'}), 200
        else:
            return jsonify({'success': False, 'error': 'Failed to deactivate personnel'}), 500
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@auth_bp.route('/admin/personnel-by-role/<role>', methods=['GET'])
def get_personnel_by_role(role):
    """Get personnel by role (admin only)"""
    try:
        admin_username = request.headers.get('X-Admin-Username')
        admin_password = request.headers.get('X-Admin-Password')
        
        if not auth_service.verify_admin(admin_username, admin_password):
            return jsonify({'success': False, 'error': 'Admin verification failed'}), 401
        
        personnel = auth_service.get_personnel_by_role(role)
        
        return jsonify({
            'success': True,
            'personnel': personnel,
            'count': len(personnel)
        }), 200
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
