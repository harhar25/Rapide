from flask import Blueprint, request, jsonify
from ..services.follow_up_service import FollowUpService

follow_up_bp = Blueprint('follow_up', __name__, url_prefix='/api/follow-up')

@follow_up_bp.route('/followups/pending', methods=['GET'])
def get_pending_followups():
    """Get all pending follow-ups"""
    try:
        date_from = request.args.get('date_from', None)
        followups = FollowUpService.get_pending_followups(date_from)
        return jsonify({'success': True, 'followups': followups}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@follow_up_bp.route('/followups', methods=['POST'])
def create_followup():
    """Create a new follow-up task"""
    try:
        data = request.json
        required_fields = ['service_order_id', 'customer_id', 'followup_date', 'contact_method', 'scheduled_by']
        
        if not data or not all(field in data for field in required_fields):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        result = FollowUpService.create_followup(
            data['service_order_id'],
            data['customer_id'],
            data['followup_date'],
            data.get('followup_time', None),
            data['contact_method'],
            data['scheduled_by']
        )
        return jsonify({'success': True, 'followup': result}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@follow_up_bp.route('/followups/<int:followup_id>', methods=['GET'])
def get_followup_details(followup_id):
    """Get complete follow-up details"""
    try:
        details = FollowUpService.get_followup_details(followup_id)
        return jsonify({'success': True, 'details': details}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@follow_up_bp.route('/followups/<int:followup_id>/feedback', methods=['POST'])
def record_feedback(followup_id):
    """Record customer feedback"""
    try:
        data = request.json
        required_fields = ['overall_experience', 'would_recommend']
        
        if not data or not all(field in data for field in required_fields):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        result = FollowUpService.record_feedback(
            followup_id,
            data.get('service_quality', None),
            data.get('work_satisfaction', None),
            data.get('staff_rating', None),
            data.get('value_rating', None),
            data['overall_experience'],
            data['would_recommend'],
            data.get('comments', '')
        )
        return jsonify({'success': True, 'feedback': result}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@follow_up_bp.route('/followups/<int:followup_id>/issues', methods=['POST'])
def log_issue(followup_id):
    """Log a customer issue"""
    try:
        data = request.json
        required_fields = ['issue_category', 'issue_description', 'severity']
        
        if not data or not all(field in data for field in required_fields):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        result = FollowUpService.log_issue(
            followup_id,
            data['issue_category'],
            data['issue_description'],
            data['severity'],
            data.get('assigned_to', None)
        )
        return jsonify({'success': True, 'issue': result}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@follow_up_bp.route('/followups/<int:followup_id>/complete', methods=['POST'])
def complete_followup(followup_id):
    """Complete follow-up and update status"""
    try:
        data = request.json
        required_fields = ['status', 'completed_by']
        
        if not data or not all(field in data for field in required_fields):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        result = FollowUpService.update_followup_status(
            followup_id,
            data['status'],
            data['completed_by'],
            data.get('contact_person_name', ''),
            data.get('contact_phone', ''),
            data.get('notes', '')
        )
        return jsonify({'success': True, 'followup': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@follow_up_bp.route('/issues', methods=['GET'])
def get_open_issues():
    """Get all open issues"""
    try:
        severity = request.args.get('severity', None)
        issues = FollowUpService.get_open_issues(severity)
        return jsonify({'success': True, 'issues': issues}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@follow_up_bp.route('/issues/<int:issue_id>/resolve', methods=['POST'])
def resolve_issue(issue_id):
    """Resolve an issue"""
    try:
        data = request.json
        required_fields = ['resolution_type', 'resolution_notes']
        
        if not data or not all(field in data for field in required_fields):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        result = FollowUpService.resolve_issue(
            issue_id,
            data['resolution_type'],
            data['resolution_notes'],
            data.get('follow_up_action', '')
        )
        return jsonify({'success': True, 'issue': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@follow_up_bp.route('/feedback/summary', methods=['GET'])
def get_feedback_summary():
    """Get customer feedback statistics"""
    try:
        date_from = request.args.get('date_from', None)
        date_to = request.args.get('date_to', None)
        summary = FollowUpService.get_customer_feedback_summary(date_from, date_to)
        return jsonify({'success': True, 'summary': {
            'avg_satisfaction': summary[0],
            'would_recommend_yes': summary[1],
            'would_recommend_no': summary[2],
            'would_recommend_maybe': summary[3],
            'total_feedback': summary[4]
        }}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@follow_up_bp.route('/summary', methods=['GET'])
def get_summary():
    """Get follow-up summary statistics"""
    try:
        date_from = request.args.get('date_from', None)
        date_to = request.args.get('date_to', None)
        summary = FollowUpService.get_followup_summary(date_from, date_to)
        return jsonify({'success': True, 'summary': summary}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
