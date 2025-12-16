from flask import Blueprint, jsonify, request
from app.services.customer_service import CustomerService, SchedulingService

customer_bp = Blueprint('customer', __name__, url_prefix='/api/customer')
scheduler_bp = Blueprint('scheduler', __name__, url_prefix='/api/scheduler')

customer_service = CustomerService()
scheduling_service = SchedulingService()

# ==================== CUSTOMER ROUTES ====================

@customer_bp.route('/pms-due-list', methods=['GET'])
def get_pms_due_list():
    """Get list of customers due for PMS"""
    try:
        customers = customer_service.get_pms_due_customers()
        return jsonify({
            'success': True,
            'data': customers,
            'count': len(customers)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@customer_bp.route('/search', methods=['POST'])
def search_customer():
    """Search customer by plate no, name, or contact"""
    try:
        data = request.json
        search_type = data.get('search_type')  # 'plate', 'name', 'contact'
        search_value = data.get('search_value')
        
        result = customer_service.search_customer(search_type, search_value)
        return jsonify({
            'success': True,
            'data': result
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@customer_bp.route('/register', methods=['POST'])
def register_walk_in():
    """Register a walk-in customer with CIS form"""
    try:
        data = request.json
        customer_id = customer_service.create_customer(data)
        return jsonify({
            'success': True,
            'customer_id': customer_id,
            'message': 'Customer registered successfully'
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@customer_bp.route('/<int:customer_id>', methods=['GET'])
def get_customer_details(customer_id):
    """Get customer details"""
    try:
        customer = customer_service.get_customer_by_id(customer_id)
        if customer:
            return jsonify({'success': True, 'data': customer}), 200
        return jsonify({'success': False, 'error': 'Customer not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== SCHEDULER ROUTES ====================

@scheduler_bp.route('/check-availability', methods=['POST'])
def check_availability():
    """Check bay, technician, and SA availability"""
    try:
        data = request.json
        availability = scheduling_service.check_availability(
            data.get('date'),
            data.get('time')
        )
        return jsonify({
            'success': True,
            'data': availability
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@scheduler_bp.route('/create-order', methods=['POST'])
def create_scheduling_order():
    """Create a scheduling order"""
    try:
        data = request.json
        order_id = scheduling_service.create_scheduling_order(data)
        return jsonify({
            'success': True,
            'order_id': order_id,
            'message': 'Scheduling order created'
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@scheduler_bp.route('/log-contact-attempt', methods=['POST'])
def log_contact_attempt():
    """Log customer contact attempt (call/SMS)"""
    try:
        data = request.json
        result = scheduling_service.log_contact_attempt(data)
        return jsonify({
            'success': True,
            'data': result
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
