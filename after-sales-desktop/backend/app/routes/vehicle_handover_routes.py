from flask import Blueprint, request, jsonify
from ..services.vehicle_handover_service import VehicleHandoverService

vehicle_handover_bp = Blueprint('vehicle_handover', __name__, url_prefix='/api/vehicle-handover')

@vehicle_handover_bp.route('/handovers/pending', methods=['GET'])
def get_pending_handovers():
    """Get all pending handovers"""
    try:
        date_from = request.args.get('date_from', None)
        handovers = VehicleHandoverService.get_pending_handovers(date_from)
        safe_handovers = []
        for row in handovers or []:
            safe_row = []
            for v in row:
                if v is None:
                    safe_row.append(None)
                elif hasattr(v, 'isoformat'):
                    safe_row.append(v.isoformat())
                else:
                    safe_row.append(v)
            safe_handovers.append(safe_row)
        return jsonify({'status': 'success', 'handovers': safe_handovers}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@vehicle_handover_bp.route('/handovers', methods=['POST'])
def create_handover():
    """Create a new vehicle handover"""
    try:
        data = request.json
        required_fields = ['service_order_id', 'job_wrapup_id', 'technician_id', 'customer_id']
        
        if not all(field in data for field in required_fields):
            return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400
        
        result = VehicleHandoverService.create_handover(
            data['service_order_id'],
            data['job_wrapup_id'],
            data['technician_id'],
            data['customer_id'],
            data.get('final_inspection_notes', '')
        )
        return jsonify({'status': 'success', 'handover': result}), 201
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@vehicle_handover_bp.route('/handovers/<int:handover_id>', methods=['GET'])
def get_handover_details(handover_id):
    """Get complete handover details"""
    try:
        details = VehicleHandoverService.get_handover_details(handover_id)
        handover = details.get('handover')
        items = details.get('items') or []
        signatures = details.get('signatures') or []

        def _safe_seq(seq):
            safe = []
            for v in seq:
                if v is None:
                    safe.append(None)
                elif hasattr(v, 'isoformat'):
                    safe.append(v.isoformat())
                else:
                    safe.append(v)
            return safe

        safe_details = {
            'handover': _safe_seq(handover) if handover else None,
            'items': [_safe_seq(i) for i in items],
            'signatures': [_safe_seq(s) for s in signatures],
        }
        return jsonify({'status': 'success', 'details': safe_details}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@vehicle_handover_bp.route('/handovers/<int:handover_id>/items', methods=['POST'])
def add_item(handover_id):
    """Add item to handover checklist"""
    try:
        data = request.json
        required_fields = ['item_type', 'item_description', 'quantity', 'condition_before']
        
        if not all(field in data for field in required_fields):
            return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400
        
        result = VehicleHandoverService.add_handover_item(
            handover_id,
            data['item_type'],
            data['item_description'],
            data['quantity'],
            data['condition_before']
        )
        return jsonify({'status': 'success', 'item': result}), 201
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@vehicle_handover_bp.route('/handovers/<int:handover_id>/items/<int:item_id>/verify', methods=['POST'])
def verify_item(handover_id, item_id):
    """Verify handover item"""
    try:
        data = request.json
        required_fields = ['condition_after', 'verified_by']
        
        if not all(field in data for field in required_fields):
            return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400
        
        result = VehicleHandoverService.verify_handover_item(
            item_id,
            data['condition_after'],
            data['verified_by']
        )
        return jsonify({'status': 'success', 'item': result}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@vehicle_handover_bp.route('/handovers/<int:handover_id>/signatures', methods=['POST'])
def record_signature(handover_id):
    """Record signature for handover"""
    try:
        data = request.json
        required_fields = ['signatory_type', 'signatory_name', 'signatory_role', 'printed_name']
        
        if not all(field in data for field in required_fields):
            return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400
        
        signature_image = data.get('signature_image', None)
        id_reference = data.get('id_or_reference', '')
        
        result = VehicleHandoverService.record_signature(
            handover_id,
            data['signatory_type'],
            data['signatory_name'],
            data['signatory_role'],
            signature_image,
            data['printed_name'],
            id_reference
        )
        return jsonify({'status': 'success', 'signature': result}), 201
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@vehicle_handover_bp.route('/handovers/<int:handover_id>/complete', methods=['POST'])
def complete_handover(handover_id):
    """Complete handover process"""
    try:
        data = request.json
        required_fields = ['vehicle_cleanliness', 'fuel_level_final', 'mileage_final', 'overall_condition']
        
        if not all(field in data for field in required_fields):
            return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400
        
        result = VehicleHandoverService.complete_handover(
            handover_id,
            data['vehicle_cleanliness'],
            data['fuel_level_final'],
            data['mileage_final'],
            data['overall_condition'],
            data.get('all_items_returned', True)
        )
        return jsonify({'status': 'success', 'handover': result}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@vehicle_handover_bp.route('/summary', methods=['GET'])
def get_summary():
    """Get handover summary statistics"""
    try:
        date_from = request.args.get('date_from', None)
        date_to = request.args.get('date_to', None)
        summary = VehicleHandoverService.get_handover_summary(date_from, date_to)
        return jsonify({'status': 'success', 'summary': summary}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
