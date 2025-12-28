from flask import Blueprint, jsonify, request
from app.services.auto_followup_service import auto_followup_service
from app.services.audit_service import AuditService

auto_followup_bp = Blueprint('auto_followup', __name__, url_prefix='/api/auto-followup')
audit_service = AuditService()

# ==================== AUTOMATED FOLLOW-UP GENERATION ====================

@auto_followup_bp.route('/generate-3day-tasks', methods=['POST'])
def generate_3day_followup_tasks():
    """
    Generate follow-up tasks for services completed 3 days ago
    Process 13: Auto-generate Follow-Up Task 3 days after release
    """
    try:
        result = auto_followup_service.generate_3day_followup_tasks()
        
        audit_service.log(
            operation_type='AUTO_FOLLOWUP_GENERATION',
            entity_type='follow_ups',
            user_name='SYSTEM',
            operation_details=f"Generated {result.get('tasks_created', 0)} follow-up tasks",
            status='success' if result.get('success') else 'failure'
        )
        
        return jsonify(result), 200
    except Exception as e:
        audit_service.log(
            operation_type='AUTO_FOLLOWUP_GENERATION_FAILED',
            entity_type='follow_ups',
            user_name='SYSTEM',
            status='failure',
            error_message=str(e)
        )
        return jsonify({'success': False, 'error': str(e)}), 500


@auto_followup_bp.route('/due-tasks', methods=['GET'])
def get_due_followup_tasks():
    """Get follow-up tasks due today for CRO dashboard"""
    try:
        tasks = auto_followup_service.get_due_followup_tasks()
        
        safe_tasks = []
        for task in tasks:
            safe_task = {}
            for key, value in task.items():
                if hasattr(value, 'isoformat'):
                    safe_task[key] = value.isoformat()
                else:
                    safe_task[key] = value
            safe_tasks.append(safe_task)
        
        return jsonify({
            'success': True,
            'data': safe_tasks,
            'count': len(safe_tasks)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@auto_followup_bp.route('/complete-with-feedback', methods=['POST'])
def complete_followup_with_feedback():
    """
    Complete follow-up call and log customer feedback
    Process 13: CRO calls customer → logs feedback (satisfaction level, concerns)
    """
    try:
        data = request.json
        
        followup_id = data.get('followup_id')
        completed_by = data.get('completed_by')
        contact_person_name = data.get('contact_person_name')
        contact_phone = data.get('contact_phone')
        notes = data.get('notes', '')
        satisfaction_rating = data.get('satisfaction_rating')
        
        if not followup_id or not completed_by:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        result = auto_followup_service.complete_followup_with_feedback(
            followup_id, completed_by, contact_person_name, 
            contact_phone, notes, satisfaction_rating
        )
        
        audit_service.log(
            operation_type='FOLLOWUP_COMPLETED',
            entity_type='follow_ups',
            entity_id=followup_id,
            user_name=completed_by,
            ip_address=request.remote_addr,
            new_values={'satisfaction_rating': satisfaction_rating, 'notes': notes},
            status='success' if result.get('success') else 'failure'
        )
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@auto_followup_bp.route('/log-concern', methods=['POST'])
def log_customer_concern():
    """
    Log customer concern/issue during follow-up call
    Process 13: Data saved to Customer Feedback History
    """
    try:
        data = request.json
        
        followup_id = data.get('followup_id')
        issue_category = data.get('issue_category', 'other')
        issue_description = data.get('issue_description')
        severity = data.get('severity', 'medium')
        assigned_to = data.get('assigned_to')
        
        if not followup_id or not issue_description:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        result = auto_followup_service.log_customer_concern(
            followup_id, issue_category, issue_description, severity, assigned_to
        )
        
        audit_service.log(
            operation_type='CUSTOMER_CONCERN_LOGGED',
            entity_type='issue_tracking',
            entity_id=result.get('issue_id') if result.get('success') else None,
            user_name=data.get('logged_by', 'CRO'),
            ip_address=request.remote_addr,
            new_values={'category': issue_category, 'severity': severity},
            status='success' if result.get('success') else 'failure'
        )
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@auto_followup_bp.route('/mark-service-completed', methods=['POST'])
def mark_service_completed():
    """
    Mark service as completed and schedule 3-day follow-up
    Process 12: System marks SO as "Service Completed"
    """
    try:
        data = request.json
        
        service_order_id = data.get('service_order_id')
        customer_id = data.get('customer_id')
        
        if not service_order_id or not customer_id:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        result = auto_followup_service.mark_service_completed_and_schedule_followup(
            service_order_id, customer_id
        )
        
        audit_service.log(
            operation_type='SERVICE_COMPLETED',
            entity_type='service_orders',
            entity_id=service_order_id,
            user_name=data.get('completed_by', 'SA'),
            ip_address=request.remote_addr,
            new_values={'status': 'completed', 'followup_scheduled': True},
            status='success' if result.get('success') else 'failure'
        )
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
