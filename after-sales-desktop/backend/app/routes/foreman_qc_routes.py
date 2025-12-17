from flask import Blueprint, jsonify, request
from app.services.foreman_qc_service import ForemanQCService

foreman_qc_bp = Blueprint('foreman_qc', __name__, url_prefix='/api/foreman-qc')
foreman_qc_service = ForemanQCService()

# ==================== QC INSPECTION ROUTES ====================

@foreman_qc_bp.route('/jobs/pending', methods=['GET'])
def get_pending_qc_jobs():
    """Get service orders pending QC inspection"""
    try:
        jobs = foreman_qc_service.get_pending_qc_jobs()
        return jsonify({
            'success': True,
            'data': jobs,
            'count': len(jobs)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@foreman_qc_bp.route('/inspections/active', methods=['GET'])
def get_active_inspections():
    """Get active QC inspections"""
    try:
        inspections = foreman_qc_service.get_active_qc_inspections()
        return jsonify({
            'success': True,
            'data': inspections,
            'count': len(inspections)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@foreman_qc_bp.route('/inspections', methods=['POST'])
def create_inspection():
    """Create new QC inspection"""
    try:
        data = request.json
        
        required_fields = ['service_order_id', 'foreman_id']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'{field} is required'}), 400
        
        inspection_id = foreman_qc_service.create_qc_inspection(
            data.get('service_order_id'),
            data.get('foreman_id'),
            data
        )
        
        if inspection_id:
            return jsonify({
                'success': True,
                'inspection_id': inspection_id,
                'message': 'QC inspection created'
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Failed to create inspection'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@foreman_qc_bp.route('/inspections/<int:inspection_id>', methods=['GET'])
def get_inspection_details(inspection_id):
    """Get QC inspection details"""
    try:
        inspection = foreman_qc_service.get_qc_inspection_details(inspection_id)
        if inspection:
            return jsonify({'success': True, 'data': inspection}), 200
        return jsonify({'success': False, 'error': 'Inspection not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@foreman_qc_bp.route('/inspections/<int:inspection_id>', methods=['PUT'])
def update_inspection(inspection_id):
    """Update QC inspection"""
    try:
        data = request.json
        success = foreman_qc_service.update_qc_inspection(inspection_id, data)
        
        if success:
            return jsonify({'success': True, 'message': 'Inspection updated'}), 200
        else:
            return jsonify({'success': False, 'error': 'Failed to update inspection'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@foreman_qc_bp.route('/inspections/<int:inspection_id>/pass', methods=['POST'])
def mark_inspection_passed(inspection_id):
    """Mark inspection as passed"""
    try:
        success = foreman_qc_service.mark_inspection_passed(inspection_id)
        if success:
            return jsonify({'success': True, 'message': 'Inspection marked as passed'}), 200
        else:
            return jsonify({'success': False, 'error': 'Failed to mark inspection'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@foreman_qc_bp.route('/inspections/<int:inspection_id>/fail', methods=['POST'])
def mark_inspection_failed(inspection_id):
    """Mark inspection as failed"""
    try:
        data = request.json
        failed_items = data.get('failed_items', '')
        
        success = foreman_qc_service.mark_inspection_failed(inspection_id, failed_items)
        if success:
            return jsonify({'success': True, 'message': 'Inspection marked as failed'}), 200
        else:
            return jsonify({'success': False, 'error': 'Failed to mark inspection'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== ROAD TEST ROUTES ====================

@foreman_qc_bp.route('/road-tests', methods=['POST'])
def create_road_test():
    """Create road test record"""
    try:
        data = request.json
        
        required_fields = ['qc_inspection_id', 'service_order_id']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'{field} is required'}), 400
        
        road_test_id = foreman_qc_service.create_road_test(
            data.get('qc_inspection_id'),
            data.get('service_order_id'),
            data
        )
        
        if road_test_id:
            return jsonify({
                'success': True,
                'road_test_id': road_test_id,
                'message': 'Road test created'
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Failed to create road test'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@foreman_qc_bp.route('/road-tests/<int:road_test_id>', methods=['GET'])
def get_road_test_details(road_test_id):
    """Get road test details"""
    try:
        road_test = foreman_qc_service.get_road_test_details(road_test_id)
        if road_test:
            return jsonify({'success': True, 'data': road_test}), 200
        return jsonify({'success': False, 'error': 'Road test not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@foreman_qc_bp.route('/inspections/<int:inspection_id>/road-tests', methods=['GET'])
def get_inspection_road_tests(inspection_id):
    """Get all road tests for inspection"""
    try:
        road_tests = foreman_qc_service.get_road_tests_for_qc(inspection_id)
        return jsonify({
            'success': True,
            'data': road_tests,
            'count': len(road_tests)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@foreman_qc_bp.route('/summary', methods=['GET'])
def get_qc_summary():
    """Get QC summary statistics"""
    try:
        summary = foreman_qc_service.get_qc_summary()
        return jsonify({
            'success': True,
            'data': {
                'total_inspections': summary[0],
                'passed_count': summary[1],
                'failed_count': summary[2],
                'pending_count': summary[3],
                'rework_count': summary[4]
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
