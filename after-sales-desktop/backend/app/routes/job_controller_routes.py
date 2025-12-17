from flask import Blueprint, jsonify, request
from app.services.job_controller_service import JobControllerService
from datetime import datetime, timedelta

job_controller_bp = Blueprint('job_controller', __name__, url_prefix='/api/job-controller')
job_controller_service = JobControllerService()

# ==================== SERVICE ORDERS ====================

@job_controller_bp.route('/service-orders/pending', methods=['GET'])
def get_pending_service_orders():
    """Get all pending service orders ready for assignment"""
    try:
        orders = job_controller_service.get_pending_service_orders()
        return jsonify({
            'success': True,
            'data': orders,
            'count': len(orders)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_controller_bp.route('/service-orders/active', methods=['GET'])
def get_active_service_orders():
    """Get all active service orders with technician assignments"""
    try:
        orders = job_controller_service.get_active_service_orders()
        return jsonify({
            'success': True,
            'data': orders,
            'count': len(orders)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== TECHNICIAN ASSIGNMENT ====================

@job_controller_bp.route('/assign', methods=['POST'])
def assign_technician():
    """Assign technician to service order"""
    try:
        data = request.json
        service_order_id = data.get('service_order_id')
        technician_id = data.get('technician_id')
        assigned_by = data.get('assigned_by')
        
        if not all([service_order_id, technician_id, assigned_by]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        assignment_id = job_controller_service.assign_technician_to_order(
            service_order_id, technician_id, assigned_by
        )
        
        if assignment_id:
            return jsonify({
                'success': True,
                'assignment_id': assignment_id,
                'message': 'Technician assigned successfully'
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Assignment failed or already exists'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_controller_bp.route('/assignments/<int:service_order_id>', methods=['GET'])
def get_assignments(service_order_id):
    """Get all assignments for a service order"""
    try:
        assignments = job_controller_service.get_assignments_for_so(service_order_id)
        return jsonify({
            'success': True,
            'data': assignments,
            'count': len(assignments)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== CLOCK IN/OUT ====================

@job_controller_bp.route('/clock-in', methods=['POST'])
def clock_in():
    """Clock in technician - start work"""
    try:
        data = request.json
        assignment_id = data.get('assignment_id')
        
        if not assignment_id:
            return jsonify({'success': False, 'error': 'assignment_id required'}), 400
        
        success = job_controller_service.clock_in_technician(assignment_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Technician clocked in',
                'timestamp': datetime.now().isoformat()
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Clock in failed'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_controller_bp.route('/clock-out', methods=['POST'])
def clock_out():
    """Clock out technician - end work"""
    try:
        data = request.json
        assignment_id = data.get('assignment_id')
        
        if not assignment_id:
            return jsonify({'success': False, 'error': 'assignment_id required'}), 400
        
        success = job_controller_service.clock_out_technician(assignment_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Technician clocked out',
                'timestamp': datetime.now().isoformat()
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Clock out failed'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== CLOCK RECORDS ====================

@job_controller_bp.route('/clock-records/<int:technician_id>', methods=['GET'])
def get_clock_records(technician_id):
    """Get clock records for technician"""
    try:
        days = request.args.get('days', 7, type=int)
        records = job_controller_service.get_clock_records(technician_id, days)
        return jsonify({
            'success': True,
            'data': records,
            'count': len(records)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== TECHNICIAN AVAILABILITY ====================

@job_controller_bp.route('/technicians/available', methods=['GET'])
def get_available_technicians():
    """Get list of available technicians"""
    try:
        technicians = job_controller_service.get_available_technicians()
        return jsonify({
            'success': True,
            'data': technicians,
            'count': len(technicians)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_controller_bp.route('/technicians/<int:technician_id>/skills', methods=['GET'])
def get_technician_skills(technician_id):
    """Get technician skills"""
    try:
        skills = job_controller_service.get_technician_skills(technician_id)
        return jsonify({
            'success': True,
            'data': skills,
            'count': len(skills)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_controller_bp.route('/technicians/<int:technician_id>/skills', methods=['POST'])
def add_skill(technician_id):
    """Add skill to technician"""
    try:
        data = request.json
        skill_name = data.get('skill_name')
        verified_by = data.get('verified_by')
        
        if not skill_name or not verified_by:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        success = job_controller_service.add_technician_skill(technician_id, skill_name, verified_by)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Skill added successfully'
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Failed to add skill'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== LABOR TRACKING ====================

@job_controller_bp.route('/labor-summary/<int:technician_id>', methods=['GET'])
def get_labor_summary(technician_id):
    """Get labor summary for technician"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date or not end_date:
            # Default to last 30 days
            end_date = datetime.now().strftime('%Y-%m-%d')
            start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        
        summary = job_controller_service.get_technician_labor_summary(technician_id, start_date, end_date)
        
        if summary:
            return jsonify({
                'success': True,
                'data': summary
            }), 200
        else:
            return jsonify({
                'success': True,
                'data': {
                    'jobs_completed': 0,
                    'total_hours': 0,
                    'avg_hours_per_job': 0
                }
            }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_controller_bp.route('/service-orders/<int:service_order_id>/status', methods=['GET'])
def get_service_order_status(service_order_id):
    """Get service order status"""
    try:
        status = job_controller_service.get_service_order_status(service_order_id)
        if status:
            return jsonify({'success': True, 'data': status}), 200
        return jsonify({'success': False, 'error': 'Service order not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== PROCESS 3.1: TECHNICIAN ASSIGNMENT WITH SKILLS ====================

@job_controller_bp.route('/technicians/available/with-skills', methods=['GET'])
def get_technicians_availability_with_skills():
    """Get available technicians with detailed skills and workload (Process 3.1)"""
    try:
        technicians = job_controller_service.get_technician_availability_with_skills()
        return jsonify({
            'success': True,
            'data': technicians,
            'count': len(technicians)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_controller_bp.route('/technicians/match-skills', methods=['POST'])
def get_technicians_by_skills():
    """Get technicians filtered by required skills (Process 3.1 - Skill Matching)"""
    try:
        data = request.json
        required_skills = data.get('required_skills', [])
        
        technicians = job_controller_service.get_technician_with_skill_match(required_skills)
        return jsonify({
            'success': True,
            'data': technicians,
            'count': len(technicians)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_controller_bp.route('/assign-with-confirmation', methods=['POST'])
def assign_technician_with_confirmation():
    """Assign technician with timestamp confirmation (Process 3.1 - Enhanced)"""
    try:
        data = request.json
        service_order_id = data.get('service_order_id')
        technician_id = data.get('technician_id')
        assigned_by = data.get('assigned_by')
        assignment_notes = data.get('assignment_notes')
        
        if not all([service_order_id, technician_id, assigned_by]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        result = job_controller_service.assign_technician_with_confirmation(
            service_order_id, technician_id, assigned_by, assignment_notes
        )
        
        if result['success']:
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== PROCESS 4.1: PARTS REQUEST ====================

@job_controller_bp.route('/service-orders/<int:service_order_id>/picklist', methods=['GET'])
def get_digital_service_picklist(service_order_id):
    """Get digital service picklist for technician (Process 4.1)"""
    try:
        picklist = job_controller_service.get_digital_service_picklist(service_order_id)
        if picklist:
            return jsonify({'success': True, 'data': picklist}), 200
        return jsonify({'success': False, 'error': 'Picklist not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_controller_bp.route('/service-orders/<int:service_order_id>/parts-request', methods=['POST'])
def request_parts_from_warehouse(service_order_id):
    """Technician requests parts from warehouse (Process 4.1)"""
    try:
        data = request.json
        technician_id = data.get('technician_id')
        requested_parts = data.get('requested_parts', [])
        notes = data.get('notes')
        
        if not technician_id or not requested_parts:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        result = job_controller_service.request_parts_from_warehouse(
            service_order_id, technician_id, requested_parts, notes
        )
        
        if result['success']:
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_controller_bp.route('/service-orders/<int:service_order_id>/parts-request/status', methods=['GET'])
def get_parts_request_status(service_order_id):
    """Get status of parts request (Process 4.1 - Tracking)"""
    try:
        status = job_controller_service.get_parts_request_status(service_order_id)
        if status:
            return jsonify({'success': True, 'data': status}), 200
        return jsonify({'success': False, 'error': 'No parts request found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== PROCESS 4.2: PARTS WAREHOUSE ISSUANCE ====================

@job_controller_bp.route('/service-orders/<int:service_order_id>/parts-prepare', methods=['POST'])
def prepare_parts_for_issuance(service_order_id):
    """Warehouse prepares parts for issuance (Process 4.2)"""
    try:
        data = request.json
        parts_list = data.get('parts_list', [])
        prepared_by = data.get('prepared_by')
        
        if not prepared_by or not parts_list:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        result = job_controller_service.prepare_parts_for_issuance(
            service_order_id, parts_list, prepared_by
        )
        
        if result['success']:
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_controller_bp.route('/service-orders/<int:service_order_id>/parts-issue', methods=['POST'])
def issue_parts_with_signature(service_order_id):
    """Issue parts with digital signature capture (Process 4.2)"""
    try:
        data = request.json
        technician_id = data.get('technician_id')
        parts_issued = data.get('parts_issued', [])
        signature_data = data.get('signature_data')
        issued_by = data.get('issued_by')
        
        if not all([technician_id, parts_issued, signature_data, issued_by]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        result = job_controller_service.issue_parts_with_signature(
            service_order_id, technician_id, parts_issued, signature_data, issued_by
        )
        
        if result['success']:
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_controller_bp.route('/service-orders/<int:service_order_id>/parts-issued/confirmation', methods=['GET'])
def get_parts_issued_confirmation(service_order_id):
    """Get parts issuance confirmation details (Process 4.2)"""
    try:
        confirmation = job_controller_service.get_parts_issued_confirmation(service_order_id)
        if confirmation:
            return jsonify({'success': True, 'data': confirmation}), 200
        return jsonify({'success': False, 'error': 'No parts issuance found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== PROCESS 4.3: SERVICE EXECUTION ====================

@job_controller_bp.route('/service-orders/<int:service_order_id>/additional-repair', methods=['POST'])
def request_additional_repair_approval(service_order_id):
    """Technician requests additional repair approval from SA (Process 4.3)"""
    try:
        data = request.json
        technician_id = data.get('technician_id')
        repair_description = data.get('repair_description')
        estimated_cost = data.get('estimated_cost')
        urgent = data.get('urgent', False)
        
        if not all([technician_id, repair_description, estimated_cost]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        result = job_controller_service.request_additional_repair_approval(
            service_order_id, technician_id, repair_description, estimated_cost, urgent
        )
        
        if result['success']:
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_controller_bp.route('/service-orders/<int:service_order_id>/repair-approvals/pending', methods=['GET'])
def get_pending_repair_approvals(service_order_id):
    """Get pending repair approval requests (Process 4.3)"""
    try:
        approvals = job_controller_service.get_pending_repair_approvals(service_order_id)
        return jsonify({
            'success': True,
            'data': approvals,
            'count': len(approvals)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_controller_bp.route('/service-orders/<int:service_order_id>/repair-approve', methods=['POST'])
def approve_additional_repair(service_order_id):
    """SA approves additional repair (Process 4.3)"""
    try:
        data = request.json
        repair_request_id = data.get('repair_request_id')
        approved_by = data.get('approved_by')
        approval_notes = data.get('approval_notes')
        
        if not all([repair_request_id, approved_by]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        result = job_controller_service.approve_additional_repair(
            service_order_id, repair_request_id, approved_by, approval_notes
        )
        
        if result['success']:
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_controller_bp.route('/service-orders/<int:service_order_id>/request-qc', methods=['POST'])
def request_foreman_qc(service_order_id):
    """Technician requests Foreman QC (Process 4.3)"""
    try:
        data = request.json
        technician_id = data.get('technician_id')
        service_notes = data.get('service_notes')
        
        if not technician_id:
            return jsonify({'success': False, 'error': 'Missing technician_id'}), 400
        
        result = job_controller_service.request_foreman_qc(
            service_order_id, technician_id, service_notes
        )
        
        if result['success']:
            return jsonify(result), 200
        return jsonify(result), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_controller_bp.route('/service-orders/<int:service_order_id>/qc-status', methods=['GET'])
def get_qc_request_status(service_order_id):
    """Get QC request status (Process 4.3)"""
    try:
        status = job_controller_service.get_qc_request_status(service_order_id)
        if status:
            return jsonify({'success': True, 'data': status}), 200
        return jsonify({'success': False, 'error': 'No QC request found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_controller_bp.route('/service-orders/<int:service_order_id>/execution-summary', methods=['GET'])
def get_service_execution_summary(service_order_id):
    """Get complete service execution summary (Process 4.3)"""
    try:
        summary = job_controller_service.get_service_execution_summary(service_order_id)
        if summary:
            return jsonify({'success': True, 'data': summary}), 200
        return jsonify({'success': False, 'error': 'Service order not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
