from flask import Blueprint, jsonify, request
from datetime import datetime
import json

print_bp = Blueprint('print_service', __name__, url_prefix='/api/print')

# ==================== PRINT SERVICES ====================

@print_bp.route('/job-order', methods=['POST'])
def print_job_order():
    """Handle job order printing requests"""
    try:
        data = request.json
        
        # Validate required fields
        job_order = data.get('jobOrder', {})
        printer_name = data.get('printerName')
        
        if not job_order:
            return jsonify({'success': False, 'error': 'Missing job order data'}), 400
        
        # Log print request
        log_print_event(
            job_order_id=job_order.get('jobOrderNumber'),
            customer=job_order.get('customerName'),
            printer=printer_name,
            timestamp=datetime.now()
        )
        
        return jsonify({
            'success': True,
            'message': 'Job order print request processed',
            'data': {
                'jobOrderNumber': job_order.get('jobOrderNumber'),
                'printer': printer_name,
                'timestamp': datetime.now().isoformat(),
                'status': 'queued'
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@print_bp.route('/history', methods=['GET'])
def get_print_history():
    """Get print history for job orders"""
    try:
        # This would typically query a database
        # For now, returning a template structure
        return jsonify({
            'success': True,
            'data': [],
            'message': 'Print history retrieved'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


def log_print_event(job_order_id, customer, printer, timestamp):
    """
    Log print events for auditing
    In production, this would write to a database
    """
    print_log = {
        'job_order_id': job_order_id,
        'customer': customer,
        'printer': printer,
        'timestamp': timestamp.isoformat(),
        'status': 'printed'
    }
    # In production: db.print_logs.insert_one(print_log)
    print(f"[PRINT LOG] {json.dumps(print_log)}")
    return True
