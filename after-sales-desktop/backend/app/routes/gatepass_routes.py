from flask import Blueprint, jsonify, request
from app.services.gatepass_service import gatepass_service
from app.services.audit_service import AuditService

gatepass_bp = Blueprint('gatepass', __name__, url_prefix='/api/gatepass')
audit_service = AuditService()

# ==================== GATEPASS CREATION ====================

@gatepass_bp.route('/create', methods=['POST'])
def create_gatepass():
    """
    Create gatepass after payment is processed
    Process 9: Cashier signs Gatepass digitally
    """
    try:
        data = request.json
        
        service_order_id = data.get('service_order_id')
        invoice_id = data.get('invoice_id')
        cashier_id = data.get('cashier_id')
        
        if not service_order_id or not invoice_id or not cashier_id:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        result = gatepass_service.create_gatepass(service_order_id, invoice_id, cashier_id)
        
        audit_service.log(
            operation_type='GATEPASS_CREATED',
            entity_type='service_order_documents',
            entity_id=result.get('gatepass_id') if result.get('success') else None,
            user_name=f"CASHIER-{cashier_id}",
            ip_address=request.remote_addr,
            new_values={'gatepass_number': result.get('gatepass_number')},
            status='success' if result.get('success') else 'failure'
        )
        
        return jsonify(result), 201 if result.get('success') else 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== SIGNATURE MANAGEMENT ====================

@gatepass_bp.route('/sign', methods=['POST'])
def add_signature():
    """
    Add signature to gatepass (Accounting, Warranty, Manager)
    Process 10: SA secures Manager approval for gatepass (system-logged)
    """
    try:
        data = request.json
        
        gatepass_id = data.get('gatepass_id')
        signature_type = data.get('signature_type')  # 'accounting', 'warranty', 'manager'
        signed_by = data.get('signed_by')
        
        if not gatepass_id or not signature_type or not signed_by:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        valid_types = ['accounting', 'warranty', 'manager']
        if signature_type not in valid_types:
            return jsonify({'success': False, 'error': f'Invalid signature type. Must be one of: {valid_types}'}), 400
        
        result = gatepass_service.add_signature_to_gatepass(gatepass_id, signature_type, signed_by)
        
        audit_service.log(
            operation_type=f'GATEPASS_{signature_type.upper()}_SIGNED',
            entity_type='service_order_documents',
            entity_id=gatepass_id,
            user_name=signed_by,
            ip_address=request.remote_addr,
            new_values={'signature_type': signature_type, 'all_complete': result.get('all_signatures_complete')},
            status='success' if result.get('success') else 'failure'
        )
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== GATEPASS VALIDATION ====================

@gatepass_bp.route('/validate/<gatepass_number>', methods=['GET'])
def validate_gatepass(gatepass_number):
    """
    Validate gatepass has all required signatures
    Process 11: Security scans gatepass barcode, system checks required signatures
    """
    try:
        validation = gatepass_service.validate_gatepass_signatures(gatepass_number)
        
        audit_service.log(
            operation_type='GATEPASS_VALIDATED',
            entity_type='service_order_documents',
            entity_id=validation.get('gatepass_id'),
            user_name=request.args.get('operator_id', 'SECURITY'),
            ip_address=request.remote_addr,
            operation_details=f"Validation result: {validation.get('valid')}",
            status='success' if validation.get('valid') else 'failure',
            error_message=f"Missing signatures: {validation.get('missing_signatures')}" if not validation.get('valid') else None
        )
        
        return jsonify(validation), 200
    except Exception as e:
        return jsonify({'valid': False, 'error': str(e)}), 500


@gatepass_bp.route('/pending', methods=['GET'])
def get_pending_gatepasses():
    """Get gatepasses pending manager approval"""
    try:
        gatepasses = gatepass_service.get_pending_gatepasses()
        
        return jsonify({
            'success': True,
            'data': gatepasses,
            'count': len(gatepasses)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== VEHICLE RELEASE ====================

@gatepass_bp.route('/release', methods=['POST'])
def release_vehicle():
    """
    Release vehicle after gatepass validation
    Process 11: If valid → system logs Vehicle Released
    """
    try:
        data = request.json
        
        service_order_id = data.get('service_order_id')
        gatepass_number = data.get('gatepass_number')
        gate_operator_id = data.get('gate_operator_id')
        
        if not service_order_id or not gatepass_number or not gate_operator_id:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        result = gatepass_service.log_vehicle_release(service_order_id, gatepass_number, gate_operator_id)
        
        audit_service.log(
            operation_type='VEHICLE_RELEASED',
            entity_type='service_orders',
            entity_id=service_order_id,
            user_name=f"SECURITY-{gate_operator_id}",
            ip_address=request.remote_addr,
            new_values={'gatepass_number': gatepass_number, 'status': 'released'},
            status='success' if result.get('success') else 'failure',
            error_message=result.get('error') if not result.get('success') else None
        )
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== GATEPASS WITH PROCESS TRACKING ====================

@gatepass_bp.route('/process-status/<int:service_order_id>', methods=['GET'])
def get_gatepass_with_processes(service_order_id):
    """
    Get gatepass along with complete process tracking
    Shows all processes: not catered, skipped, completed, etc.
    Used for printing gatepass with process history
    """
    try:
        result = gatepass_service.get_service_order_process_status(service_order_id)
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@gatepass_bp.route('/print/<int:service_order_id>', methods=['GET'])
def get_gatepass_for_printing(service_order_id):
    """
    Get formatted gatepass with process history ready for printing
    Includes all process steps, guard can see what's completed/skipped/not catered
    """
    try:
        process_status = gatepass_service.get_service_order_process_status(service_order_id)
        
        if not process_status.get('success'):
            return jsonify(process_status), 400
        
        # Add gatepass details to the process status
        from app.database import db
        
        gatepass_query = """
        SELECT sod.id, sod.file_name as gatepass_number, sod.created_at,
               sod.document_data, so.total_amount, i.invoice_no
        FROM service_order_documents sod
        JOIN service_orders so ON sod.service_order_id = so.id
        LEFT JOIN invoices i ON so.id = i.service_order_id
        WHERE sod.service_order_id = %s AND sod.document_type = 'gatepass'
        ORDER BY sod.created_at DESC
        LIMIT 1
        """
        
        gatepass_result = db.execute_query(gatepass_query, (service_order_id,))
        
        if gatepass_result:
            import json
            gatepass_data = json.loads(gatepass_result[0]['document_data'])
            process_status['gatepass_number'] = gatepass_result[0]['gatepass_number']
            process_status['gatepass_id'] = gatepass_result[0]['id']
            process_status['invoice_number'] = gatepass_result[0].get('invoice_no', 'N/A')
            process_status['total_amount'] = gatepass_result[0].get('total_amount', 0)
            process_status['gatepass_signatures'] = {
                'cashier': gatepass_data.get('cashier_signature', False),
                'accounting': gatepass_data.get('accounting_signature', False),
                'warranty': gatepass_data.get('warranty_signature', False),
                'manager': gatepass_data.get('manager_signature', False)
            }
        
        return jsonify(process_status), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
