from flask import Blueprint, request, jsonify
from app.services.cashier_service import CashierService
from datetime import datetime

cashier_bp = Blueprint('cashier', __name__, url_prefix='/api/cashier')
service = CashierService()

@cashier_bp.route('/invoices/pending', methods=['GET'])
def get_pending():
    """Get invoices pending payment"""
    try:
        invoices = service.get_pending_invoices_for_payment()
        return jsonify({
            'success': True,
            'data': [
                {
                    'id': i[0], 'invoice_no': i[1], 'customer': i[2], 'plate_no': i[3],
                    'so_no': i[4], 'total': i[5], 'paid': i[6], 'remaining': i[7],
                    'due_date': str(i[8])
                }
                for i in invoices
            ]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@cashier_bp.route('/payments', methods=['POST'])
def process_payment():
    """Process a payment"""
    try:
        data = request.get_json()
        
        payment_id = service.process_payment(
            invoice_id=data.get('invoice_id'),
            customer_id=data['customer_id'],
            amount=data['amount'],
            payment_method=data['payment_method'],
            created_by=data['created_by'],
            reference_number=data.get('reference_number', ''),
            card_last_four=data.get('card_last_four', ''),
            bank_name=data.get('bank_name', ''),
            check_number=data.get('check_number', '')
        )
        
        return jsonify({
            'success': True,
            'message': 'Payment processed',
            'payment_id': payment_id
        }), 201
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@cashier_bp.route('/transactions/daily', methods=['GET'])
def get_daily_transactions():
    """Get daily transactions"""
    try:
        date_str = request.args.get('date')
        date = None
        if date_str:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        transactions = service.get_daily_transactions(date)
        return jsonify({
            'success': True,
            'data': [
                {
                    'id': t[0], 'reference': t[1], 'customer': t[2], 'amount': t[3],
                    'method': t[4], 'status': t[5], 'received_by': t[6],
                    'timestamp': str(t[7])
                }
                for t in transactions
            ]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@cashier_bp.route('/summary/daily', methods=['GET'])
def get_daily_summary():
    """Get daily payment summary"""
    try:
        date_str = request.args.get('date')
        date = None
        if date_str:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        summary = service.get_daily_summary(date)
        return jsonify({
            'success': True,
            'data': {
                'total_transactions': summary[0],
                'cash_count': summary[1],
                'card_count': summary[2],
                'check_count': summary[3],
                'transfer_count': summary[4],
                'mobile_count': summary[5],
                'cash_total': float(summary[6]),
                'card_total': float(summary[7]),
                'check_total': float(summary[8]),
                'transfer_total': float(summary[9]),
                'mobile_total': float(summary[10]),
                'grand_total': float(summary[11])
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@cashier_bp.route('/drawer/open', methods=['POST'])
def open_drawer():
    """Open a cash drawer"""
    try:
        data = request.get_json()
        
        drawer_id = service.open_cash_drawer(
            cashier_id=data['cashier_id'],
            opening_balance=data.get('opening_balance', 0)
        )
        
        return jsonify({
            'success': True,
            'message': 'Cash drawer opened',
            'drawer_id': drawer_id
        }), 201
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@cashier_bp.route('/drawer/<int:drawer_id>/close', methods=['POST'])
def close_drawer(drawer_id):
    """Close a cash drawer"""
    try:
        data = request.get_json()
        
        service.close_cash_drawer(
            drawer_id=drawer_id,
            cash_counted=data['cash_counted'],
            notes=data.get('notes', '')
        )
        
        return jsonify({
            'success': True,
            'message': 'Cash drawer closed'
        }), 200
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@cashier_bp.route('/drawer/active', methods=['GET'])
def get_active_drawer():
    """Get active cash drawer"""
    try:
        cashier_id = request.args.get('cashier_id')
        drawer = service.get_active_drawer(cashier_id)
        
        if drawer:
            return jsonify({
                'success': True,
                'data': {
                    'id': drawer[0],
                    'cashier_id': drawer[1],
                    'opening_balance': float(drawer[2]),
                    'opening_time': str(drawer[3]),
                    'status': drawer[4]
                }
            }), 200
        return jsonify({
            'success': True,
            'data': None,
            'message': 'No active drawer'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@cashier_bp.route('/payment-methods', methods=['GET'])
def get_methods():
    """Get enabled payment methods"""
    try:
        methods = service.get_payment_methods()
        return jsonify({
            'success': True,
            'data': [
                {
                    'type': m[0],
                    'name': m[1],
                    'requires_verification': m[2],
                    'processing_fee_percent': float(m[3])
                }
                for m in methods
            ]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@cashier_bp.route('/summary/cashier', methods=['GET'])
def get_cashier_summary():
    """Get cashier performance summary"""
    try:
        cashier_id = request.args.get('cashier_id', type=int)
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        df = datetime.strptime(date_from, '%Y-%m-%d').date() if date_from else None
        dt = datetime.strptime(date_to, '%Y-%m-%d').date() if date_to else None
        
        summary = service.get_cashier_summary(cashier_id, df, dt)
        return jsonify({
            'success': True,
            'data': {
                'days_worked': summary[0],
                'total_transactions': summary[1],
                'total_collected': float(summary[2]),
                'cash_collected': float(summary[3]),
                'drawers_handled': summary[4],
                'total_discrepancy': float(summary[5])
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
