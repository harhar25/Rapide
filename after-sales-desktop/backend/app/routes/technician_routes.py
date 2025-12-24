from flask import Blueprint, jsonify, request
from app.services.technician_service import TechnicianService
from app.services.job_controller_service import JobControllerService

technician_bp = Blueprint('technician', __name__, url_prefix='/api/technician')
technician_service = TechnicianService()
job_controller_service = JobControllerService()


@technician_bp.route('/resolve', methods=['POST'])
def resolve_technician():
    try:
        data = request.json or {}
        username = data.get('username')
        name = data.get('name')

        if not username and not name:
            return jsonify({'success': False, 'error': 'username or name is required'}), 400

        resolved = technician_service.resolve_technician(username, name)
        if not resolved:
            return jsonify({'success': False, 'error': 'Technician record not found. Ensure technicians.employee_id matches personnel.username.'}), 404

        return jsonify({'success': True, 'data': resolved}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@technician_bp.route('/jobs', methods=['GET'])
def get_jobs():
    try:
        technician_id = request.args.get('technician_id', type=int)
        status = request.args.get('status')

        if not technician_id:
            return jsonify({'success': False, 'error': 'technician_id is required'}), 400

        if status not in (None, '', 'assigned', 'in-progress', 'completed', 'paused'):
            return jsonify({'success': False, 'error': 'Invalid status'}), 400

        jobs = technician_service.get_jobs(technician_id, status=status or None)
        return jsonify({'success': True, 'data': jobs, 'count': len(jobs)}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@technician_bp.route('/clock-in', methods=['POST'])
def clock_in():
    try:
        data = request.json or {}
        assignment_id = data.get('assignment_id')

        if not assignment_id:
            return jsonify({'success': False, 'error': 'assignment_id required'}), 400

        success = job_controller_service.clock_in_technician(assignment_id)
        if success:
            return jsonify({'success': True, 'message': 'Technician clocked in'}), 200
        return jsonify({'success': False, 'error': 'Clock in failed'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@technician_bp.route('/clock-out', methods=['POST'])
def clock_out():
    try:
        data = request.json or {}
        assignment_id = data.get('assignment_id')

        if not assignment_id:
            return jsonify({'success': False, 'error': 'assignment_id required'}), 400

        success = job_controller_service.clock_out_technician(assignment_id)
        if success:
            return jsonify({'success': True, 'message': 'Technician clocked out'}), 200
        return jsonify({'success': False, 'error': 'Clock out failed'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@technician_bp.route('/service-orders/<int:service_order_id>/parts-request', methods=['POST'])
def request_parts(service_order_id):
    try:
        data = request.json or {}
        technician_id = data.get('technician_id')
        requested_parts = data.get('requested_parts', [])
        notes = data.get('notes')

        if not technician_id:
            return jsonify({'success': False, 'error': 'technician_id is required'}), 400
        if not requested_parts:
            return jsonify({'success': False, 'error': 'requested_parts is required'}), 400

        result = job_controller_service.request_parts_from_warehouse(service_order_id, technician_id, requested_parts, notes)
        status_code = 200 if result.get('success') else 400
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@technician_bp.route('/assignments/<int:assignment_id>/notes', methods=['POST'])
def update_assignment_notes(assignment_id):
    try:
        data = request.json or {}
        technician_id = data.get('technician_id')
        notes = data.get('notes')

        if not technician_id:
            return jsonify({'success': False, 'error': 'technician_id is required'}), 400

        ok = technician_service.update_assignment_notes(assignment_id, technician_id, notes)
        if ok:
            return jsonify({'success': True, 'message': 'Notes updated'}), 200
        return jsonify({'success': False, 'error': 'Assignment not found for technician'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
