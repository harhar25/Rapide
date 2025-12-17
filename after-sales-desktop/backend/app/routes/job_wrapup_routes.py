from flask import Blueprint, jsonify, request
from app.services.job_wrapup_service import JobWrapupService

job_wrapup_bp = Blueprint('job_wrapup', __name__, url_prefix='/api/job-wrapup')
job_wrapup_service = JobWrapupService()

# ==================== JOB WRAP-UP ROUTES ====================

@job_wrapup_bp.route('/jobs/ready', methods=['GET'])
def get_jobs_ready():
    """Get jobs ready for wrap-up"""
    try:
        jobs = job_wrapup_service.get_jobs_ready_for_wrapup()
        return jsonify({
            'success': True,
            'data': jobs,
            'count': len(jobs)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_wrapup_bp.route('/wrapups/active', methods=['GET'])
def get_active_wrapups():
    """Get active wrap-ups"""
    try:
        wrapups = job_wrapup_service.get_active_wrapups()
        return jsonify({
            'success': True,
            'data': wrapups,
            'count': len(wrapups)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_wrapup_bp.route('/wrapups', methods=['POST'])
def create_wrapup():
    """Create job wrap-up"""
    try:
        data = request.json
        
        required_fields = ['service_order_id', 'job_controller_id', 'technician_id']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'{field} is required'}), 400
        
        wrapup_id = job_wrapup_service.create_wrapup(
            data.get('service_order_id'),
            data.get('job_controller_id'),
            data.get('technician_id'),
            data.get('qc_inspection_id')
        )
        
        if wrapup_id:
            return jsonify({
                'success': True,
                'wrapup_id': wrapup_id,
                'message': 'Job wrap-up created'
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Failed to create wrap-up'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_wrapup_bp.route('/wrapups/<int:wrapup_id>', methods=['GET'])
def get_wrapup_details(wrapup_id):
    """Get wrap-up details"""
    try:
        wrapup = job_wrapup_service.get_wrapup_details(wrapup_id)
        if wrapup:
            return jsonify({'success': True, 'data': wrapup}), 200
        return jsonify({'success': False, 'error': 'Wrap-up not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_wrapup_bp.route('/service-orders/<int:service_order_id>/wrapup', methods=['GET'])
def get_wrapup_by_so(service_order_id):
    """Get wrapup for service order"""
    try:
        wrapup = job_wrapup_service.get_wrapup_by_service_order(service_order_id)
        if wrapup:
            return jsonify({'success': True, 'data': wrapup}), 200
        return jsonify({'success': False, 'error': 'No wrap-up found for this order'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_wrapup_bp.route('/wrapups/<int:wrapup_id>/clock-out', methods=['POST'])
def clock_out_technician(wrapup_id):
    """Clock out technician and finalize labor hours"""
    try:
        data = request.json or {}
        final_notes = data.get('notes', '')
        
        labor_hours = job_wrapup_service.clock_out_technician(wrapup_id, final_notes)
        
        return jsonify({
            'success': True,
            'labor_hours': labor_hours,
            'message': f'Technician clocked out - {labor_hours:.2f} hours logged'
        }), 200
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_wrapup_bp.route('/wrapups/<int:wrapup_id>/checklist', methods=['PUT'])
def update_checklist(wrapup_id):
    """Update job completion checklist"""
    try:
        data = request.json
        
        success = job_wrapup_service.update_completion_checklist(wrapup_id, data)
        
        if success:
            return jsonify({'success': True, 'message': 'Checklist updated'}), 200
        else:
            return jsonify({'success': False, 'error': 'Failed to update checklist'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_wrapup_bp.route('/wrapups/<int:wrapup_id>/return-to-sa', methods=['POST'])
def return_to_service_advisor(wrapup_id):
    """Return completed job to Service Advisor"""
    try:
        success = job_wrapup_service.return_so_to_service_advisor(wrapup_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Job returned to Service Advisor'
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Failed to return job'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@job_wrapup_bp.route('/summary', methods=['GET'])
def get_summary():
    """Get wrapup summary"""
    try:
        summary = job_wrapup_service.get_wrapup_summary()
        return jsonify({
            'success': True,
            'data': {
                'total_wrapups': summary[0],
                'returned_count': summary[1],
                'ready_count': summary[2],
                'pending_count': summary[3],
                'avg_labor_hours': summary[4]
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
