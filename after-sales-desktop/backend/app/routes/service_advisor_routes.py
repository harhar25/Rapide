from flask import Blueprint, jsonify, request
from app.services.service_advisor_service import ServiceAdvisorService

service_advisor_bp = Blueprint('service_advisor', __name__, url_prefix='/api/service-advisor')
service_advisor_service = ServiceAdvisorService()

# ==================== PENDING APPOINTMENTS ====================

@service_advisor_bp.route('/appointments/pending', methods=['GET'])
def get_pending_appointments():
    """Get all pending scheduled appointments"""
    try:
        appointments = service_advisor_service.get_pending_appointments()
        return jsonify({
            'success': True,
            'data': appointments,
            'count': len(appointments)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== CUSTOMER CHECK-IN ====================

@service_advisor_bp.route('/check-in', methods=['POST'])
def check_in_customer():
    """Mark customer as arrived - create service order"""
    try:
        data = request.json
        scheduling_order_id = data.get('scheduling_order_id')
        advisor_id = data.get('advisor_id')
        
        if not scheduling_order_id or not advisor_id:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        service_order_id = service_advisor_service.check_in_customer(scheduling_order_id, advisor_id)
        
        if service_order_id:
            return jsonify({
                'success': True,
                'service_order_id': service_order_id,
                'message': 'Customer checked in successfully'
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Failed to check in customer'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== SERVICE ORDERS ====================

@service_advisor_bp.route('/service-orders/pending', methods=['GET'])
def get_pending_service_orders():
    """Get all pending service orders"""
    try:
        orders = service_advisor_service.get_pending_service_orders()
        return jsonify({
            'success': True,
            'data': orders,
            'count': len(orders)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@service_advisor_bp.route('/service-orders/<int:service_order_id>', methods=['GET'])
def get_service_order(service_order_id):
    """Get service order details"""
    try:
        order = service_advisor_service.get_service_order(service_order_id)
        if order:
            return jsonify({'success': True, 'data': order}), 200
        return jsonify({'success': False, 'error': 'Service order not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== CUSTOMER INFO SHEETS (CIS) ====================

@service_advisor_bp.route('/cis', methods=['POST'])
def create_or_update_cis():
    """Create or update Customer Info Sheet"""
    try:
        data = request.json
        service_order_id = data.get('service_order_id')
        customer_id = data.get('customer_id')
        
        if not service_order_id or not customer_id:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        success = service_advisor_service.create_or_update_cis(service_order_id, customer_id, data)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Customer Info Sheet saved successfully'
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Failed to save CIS'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@service_advisor_bp.route('/cis/<int:service_order_id>', methods=['GET'])
def get_cis(service_order_id):
    """Get Customer Info Sheet"""
    try:
        cis = service_advisor_service.get_cis(service_order_id)
        if cis:
            return jsonify({'success': True, 'data': cis}), 200
        return jsonify({'success': False, 'error': 'CIS not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== VEHICLE REPORT CARDS (VRC) ====================

@service_advisor_bp.route('/vrc', methods=['POST'])
def create_or_update_vrc():
    """Create or update Vehicle Report Card with 10-point diagnosis"""
    try:
        data = request.json
        service_order_id = data.get('service_order_id')
        customer_id = data.get('customer_id')
        
        if not service_order_id or not customer_id:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        success = service_advisor_service.create_or_update_vrc(service_order_id, customer_id, data)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Vehicle Report Card saved successfully'
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Failed to save VRC'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@service_advisor_bp.route('/vrc/<int:service_order_id>', methods=['GET'])
def get_vrc(service_order_id):
    """Get Vehicle Report Card"""
    try:
        vrc = service_advisor_service.get_vrc(service_order_id)
        if vrc:
            return jsonify({'success': True, 'data': vrc}), 200
        return jsonify({'success': False, 'error': 'VRC not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== DOCUMENT MANAGEMENT ====================

@service_advisor_bp.route('/documents/<int:service_order_id>/print', methods=['POST'])
def log_document_print(service_order_id):
    """Log document printing"""
    try:
        data = request.json
        document_type = data.get('document_type')
        printed_by = data.get('printed_by')
        
        if not document_type or not printed_by:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        success = service_advisor_service.log_document_print(service_order_id, document_type, printed_by)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Document printing logged successfully'
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Failed to log document'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@service_advisor_bp.route('/documents/<int:service_order_id>', methods=['GET'])
def get_service_order_documents(service_order_id):
    """Get all documents for a service order"""
    try:
        documents = service_advisor_service.get_service_order_documents(service_order_id)
        return jsonify({
            'success': True,
            'data': documents,
            'count': len(documents)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== WARRANTY CHECK ====================

@service_advisor_bp.route('/warranty/check', methods=['POST'])
def check_warranty():
    """Check warranty status for customer"""
    try:
        data = request.json
        customer_id = data.get('customer_id')
        service_type = data.get('service_type', 'general')
        
        if not customer_id:
            return jsonify({'success': False, 'error': 'Missing customer_id'}), 400
        
        warranty_info = service_advisor_service.check_warranty_status(customer_id, service_type)
        
        return jsonify({
            'success': True,
            'warranty_info': warranty_info
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== PARTS AVAILABILITY CHECK ====================

@service_advisor_bp.route('/parts/availability-check', methods=['POST'])
def check_parts_availability():
    """Check parts availability based on VRC findings"""
    try:
        data = request.json
        vrc_findings = data.get('vrc_findings', {})
        
        availability = service_advisor_service.check_parts_availability(vrc_findings)
        
        return jsonify({
            'success': True,
            'parts_availability': availability
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@service_advisor_bp.route('/parts/forecast/<int:service_order_id>', methods=['POST'])
def forecast_parts(service_order_id):
    """Forecast parts needed based on VRC data"""
    try:
        data = request.json
        vrc_data = data.get('vrc_data', {})
        
        forecast = service_advisor_service.forecast_parts(service_order_id, vrc_data)
        
        return jsonify({
            'success': True,
            'forecast': forecast
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== DOCUMENT GENERATION ====================

@service_advisor_bp.route('/documents/generate/service-order/<int:service_order_id>', methods=['GET'])
def generate_service_order(service_order_id):
    """Generate Service Order document"""
    try:
        document = service_advisor_service.generate_service_order_document(service_order_id)
        
        if document:
            return jsonify({
                'success': True,
                'document': document
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Service order not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@service_advisor_bp.route('/documents/generate/confirmation/<int:service_order_id>', methods=['GET'])
def generate_confirmation(service_order_id):
    """Generate Service Order Confirmation document"""
    try:
        document = service_advisor_service.generate_service_order_confirmation(service_order_id)
        
        if document:
            return jsonify({
                'success': True,
                'document': document
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Service order not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@service_advisor_bp.route('/documents/generate/picklist/<int:service_order_id>', methods=['POST'])
def generate_picklist(service_order_id):
    """Generate Service Picklist document"""
    try:
        data = request.json
        parts_list = data.get('parts_list', [])
        
        document = service_advisor_service.generate_service_picklist(service_order_id, parts_list)
        
        return jsonify({
            'success': True,
            'document': document
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@service_advisor_bp.route('/documents/print/<int:service_order_id>', methods=['POST'])
def print_documents(service_order_id):
    """Print all required service documents"""
    try:
        data = request.json
        document_types = data.get('document_types', ['service-order', 'confirmation', 'picklist', 'vrc', 'cis'])
        printed_by = data.get('printed_by', 'SYSTEM')
        
        result = service_advisor_service.print_service_documents(service_order_id, document_types, printed_by)
        
        return jsonify({
            'success': True,
            'print_result': result
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
