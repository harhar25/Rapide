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
