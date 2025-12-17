from flask import Blueprint, jsonify, request
from app.services.customer_service import CustomerService, SchedulingService
from app.services.validation_service import ValidationService

customer_bp = Blueprint('customer', __name__, url_prefix='/api/customer')
scheduler_bp = Blueprint('scheduler', __name__, url_prefix='/api/scheduler')

customer_service = CustomerService()
scheduling_service = SchedulingService()
validation_service = ValidationService()

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
        
        # Validate request
        is_valid, errors = validation_service.validate_create_customer_request(data)
        if not is_valid:
            return jsonify({
                'success': False,
                'errors': errors,
                'code': 'VAL-008'
            }), 400
        
        result = customer_service.create_customer(data)
        
        if result.get('success'):
            return jsonify(result), 201
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'CRO-006'
        }), 500

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
        
        # Validate request
        is_valid, errors = validation_service.validate_scheduling_order_request(data)
        if not is_valid:
            return jsonify({
                'success': False,
                'errors': errors,
                'code': 'VAL-008'
            }), 400
        
        result = scheduling_service.create_scheduling_order(data)
        
        if result.get('success'):
            return jsonify(result), 201
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'CRO-016'
        }), 500

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
# ==================== NEW PRODUCTION-GRADE ENDPOINTS ====================

@customer_bp.route('/search-duplicate', methods=['POST'])
def search_for_duplicate():
    """Search for similar/duplicate customers"""
    try:
        data = request.json
        result = customer_service.search_similar_customers(data)
        return jsonify({
            'success': True,
            'data': result
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'CRO-003'
        }), 500

@scheduler_bp.route('/resend-confirmation', methods=['POST'])
def resend_appointment_confirmation():
    """Resend appointment confirmation to customer"""
    try:
        data = request.json
        order_id = data.get('scheduling_order_id')
        method = data.get('method', 'sms')
        
        result = scheduling_service.send_appointment_confirmation(order_id, method)
        
        if result.get('success'):
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'CRO-021'
        }), 500

@scheduler_bp.route('/reschedule', methods=['POST'])
def reschedule_appointment():
    """Reschedule an appointment"""
    try:
        data = request.json
        order_id = data.get('scheduling_order_id')
        new_date = data.get('new_date')
        new_time = data.get('new_time')
        reason = data.get('reason', '')
        
        result = scheduling_service.reschedule_appointment(order_id, new_date, new_time, reason)
        
        if result.get('success'):
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'CRO-027'
        }), 500

@scheduler_bp.route('/cancel-appointment', methods=['POST'])
def cancel_appointment():
    """Cancel an appointment"""
    try:
        data = request.json
        order_id = data.get('scheduling_order_id')
        reason = data.get('reason', '')
        
        result = scheduling_service.cancel_appointment(order_id, reason)
        
        if result.get('success'):
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'CRO-032'
        }), 500

@scheduler_bp.route('/<int:order_id>', methods=['GET'])
def get_scheduling_order_details(order_id):
    """Get scheduling order details"""
    try:
        order = scheduling_service.get_scheduling_order(order_id)
        
        if order:
            return jsonify({
                'success': True,
                'data': order
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Order not found',
                'code': 'CRO-025'
            }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'CRO-035'
        }), 500

@scheduler_bp.route('/contact-history/<int:customer_id>', methods=['GET'])
def get_contact_history(customer_id):
    """Get contact attempt history for customer"""
    try:
        history = scheduling_service.get_contact_attempt_history(customer_id)
        
        return jsonify({
            'success': True,
            'data': history,
            'count': len(history)
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'CRO-036'
        }), 500

@scheduler_bp.route('/no-show-tracking/<int:customer_id>', methods=['GET'])
def get_no_show_tracking(customer_id):
    """Get no-show tracking information for customer"""
    try:
        pattern = scheduling_service.track_no_show_pattern(customer_id)
        
        if pattern.get('status') == 'error':
            return jsonify(pattern), 400
        
        return jsonify({
            'success': True,
            'data': pattern
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'CRO-030'
        }), 500

@scheduler_bp.route('/log-no-show', methods=['POST'])
def log_no_show():
    """Log a customer no-show"""
    try:
        data = request.json
        order_id = data.get('scheduling_order_id')
        reason = data.get('reason', '')
        
        result = scheduling_service.log_no_show(order_id, reason)
        
        if result.get('success'):
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'CRO-029'
        }), 500

@scheduler_bp.route('/schedule-reminder', methods=['POST'])
def schedule_reminder():
    """Schedule appointment reminder"""
    try:
        data = request.json
        order_id = data.get('scheduling_order_id')
        hours_before = data.get('hours_before', 24)
        
        result = scheduling_service.schedule_appointment_reminder(order_id, hours_before)
        
        if result.get('success'):
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'CRO-024'
        }), 500

@scheduler_bp.route('/validate-conflicts', methods=['POST'])
def validate_scheduling_conflicts():
    """Validate scheduling order doesn't create conflicts"""
    try:
        data = request.json
        bay_id = data.get('bay_id')
        tech_id = data.get('technician_id')
        advisor_id = data.get('advisor_id')
        date = data.get('date')
        time = data.get('time')
        duration = data.get('estimated_duration_hours', 2)
        
        result = scheduling_service.validate_scheduling_no_conflicts(
            bay_id, tech_id, advisor_id, date, time, duration
        )
        
        if result.get('status') == 'error':
            return jsonify(result), 400
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'code': 'CRO-014'
        }), 500