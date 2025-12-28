from flask import Blueprint, jsonify, request
from datetime import datetime
from app.services.scheduler_service import scheduler_service
from app.services.audit_service import AuditService

scheduler_task_bp = Blueprint('scheduler_task', __name__, url_prefix='/api/scheduler-tasks')
audit_service = AuditService()

# ==================== SCHEDULED TASKS ====================

@scheduler_task_bp.route('/run-daily', methods=['POST'])
def run_daily_tasks():
    """
    Run all daily automated tasks
    Should be called by external cron job or task scheduler once per day
    """
    try:
        # Verify request is from authorized source (optional security)
        api_key = request.headers.get('X-API-Key')
        # TODO: Add API key validation if needed
        
        results = scheduler_service.run_daily_tasks()
        
        audit_service.log(
            operation_type='DAILY_TASKS_EXECUTED',
            entity_type='system',
            user_name='SCHEDULER',
            operation_details=f"Executed {len(results.get('tasks_executed', []))} daily tasks",
            new_values=results,
            status='success' if not results.get('error') else 'failure',
            error_message=results.get('error')
        )
        
        return jsonify(results), 200
    except Exception as e:
        audit_service.log(
            operation_type='DAILY_TASKS_FAILED',
            entity_type='system',
            user_name='SCHEDULER',
            status='failure',
            error_message=str(e)
        )
        return jsonify({'success': False, 'error': str(e)}), 500


@scheduler_task_bp.route('/run-hourly', methods=['POST'])
def run_hourly_tasks():
    """
    Run hourly automated tasks
    Should be called by external cron job or task scheduler every hour
    """
    try:
        results = scheduler_service.run_hourly_tasks()
        
        audit_service.log(
            operation_type='HOURLY_TASKS_EXECUTED',
            entity_type='system',
            user_name='SCHEDULER',
            operation_details=f"Executed {len(results.get('tasks_executed', []))} hourly tasks",
            new_values=results,
            status='success' if not results.get('error') else 'failure'
        )
        
        return jsonify(results), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@scheduler_task_bp.route('/status', methods=['GET'])
def get_scheduler_status():
    """Get scheduler status and last run times"""
    try:
        from database import db
        
        # Get last daily task execution
        daily_query = """
        SELECT timestamp, operation_details FROM audit_logs
        WHERE operation_type = 'DAILY_TASKS_EXECUTED'
        ORDER BY timestamp DESC
        LIMIT 1
        """
        daily_result = db.execute_query(daily_query)
        
        # Get last hourly task execution
        hourly_query = """
        SELECT timestamp, operation_details FROM audit_logs
        WHERE operation_type = 'HOURLY_TASKS_EXECUTED'
        ORDER BY timestamp DESC
        LIMIT 1
        """
        hourly_result = db.execute_query(hourly_query)
        
        status = {
            'scheduler_active': True,
            'last_daily_run': daily_result[0] if daily_result else None,
            'last_hourly_run': hourly_result[0] if hourly_result else None,
            'current_time': datetime.now().isoformat()
        }
        
        return jsonify(status), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
