from flask import Blueprint, request, jsonify
from app.services.billing_service import BillingService

billing_bp = Blueprint('billing', __name__, url_prefix='/api/billing')
service = BillingService()

@billing_bp.route('/invoices', methods=['POST'])
def create_invoice():
    """Create a new invoice"""
    try:
        data = request.get_json()
        
        invoice_id = service.create_invoice(
            service_order_id=data['service_order_id'],
            customer_id=data['customer_id'],
            job_wrapup_id=data.get('job_wrapup_id'),
            labor_hours=data.get('labor_hours', 0),
            labor_rate=data.get('labor_rate', 50),
            materials_cost=data.get('materials_cost', 0),
            parts_cost=data.get('parts_cost', 0),
            parking_cost=data.get('parking_cost', 0),
            discount=data.get('discount', 0),
            tax_rate=data.get('tax_rate', 0.1)
        )
        
        return jsonify({
            'success': True,
            'message': 'Invoice created',
            'invoice_id': invoice_id
        }), 201
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@billing_bp.route('/invoices/<int:invoice_id>/items', methods=['POST'])
def add_item(invoice_id):
    """Add a line item to invoice"""
    try:
        data = request.get_json()
        
        item_id = service.add_billing_item(
            invoice_id=invoice_id,
            item_type=data.get('item_type', 'service'),
            description=data['description'],
            quantity=data.get('quantity', 1),
            unit_price=data['unit_price'],
            notes=data.get('notes', '')
        )
        
        return jsonify({
            'success': True,
            'message': 'Item added',
            'item_id': item_id
        }), 201
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@billing_bp.route('/invoices/<int:invoice_id>/issue', methods=['POST'])
def issue_invoice(invoice_id):
    """Issue an invoice"""
    try:
        service.issue_invoice(invoice_id)
        return jsonify({
            'success': True,
            'message': 'Invoice issued'
        }), 200
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@billing_bp.route('/invoices/<int:invoice_id>/payments', methods=['POST'])
def record_payment(invoice_id):
    """Record a payment"""
    try:
        data = request.get_json()
        
        payment_id = service.record_payment(
            invoice_id=invoice_id,
            payment_amount=data['payment_amount'],
            payment_method=data.get('payment_method', 'cash'),
            created_by=data.get('created_by'),
            reference_number=data.get('reference_number', '')
        )
        
        return jsonify({
            'success': True,
            'message': 'Payment recorded',
            'payment_id': payment_id
        }), 201
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@billing_bp.route('/invoices/<int:invoice_id>', methods=['GET'])
def get_invoice(invoice_id):
    """Get invoice details"""
    try:
        invoice = service.get_invoice(invoice_id)
        items = service.get_invoice_items(invoice_id)
        payments = service.get_invoice_payments(invoice_id)
        
        return jsonify({
            'success': True,
            'data': {
                'id': invoice[0], 'so_id': invoice[1], 'invoice_no': invoice[2],
                'customer_id': invoice[3], 'customer_name': invoice[4],
                'labor_hours': invoice[5], 'labor_rate': invoice[6], 'labor_cost': invoice[7],
                'materials_cost': invoice[8], 'parts_cost': invoice[9],
                'parking_cost': invoice[10], 'discount': invoice[11], 'tax': invoice[12],
                'total': invoice[13], 'status': invoice[14],
                'invoice_date': str(invoice[15]), 'due_date': str(invoice[16]),
                'notes': invoice[17],
                'items': [
                    {
                        'id': i[0], 'type': i[1], 'description': i[2], 'code': i[3],
                        'qty': i[4], 'price': i[5], 'total': i[6], 'notes': i[7]
                    }
                    for i in items
                ],
                'payments': [
                    {
                        'id': p[0], 'amount': p[1], 'method': p[2],
                        'date': str(p[3]), 'reference': p[4], 'received_by': p[5]
                    }
                    for p in payments
                ]
            }
        }), 200
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@billing_bp.route('/invoices/pending', methods=['GET'])
def get_pending():
    """Get pending invoices"""
    try:
        invoices = service.get_pending_invoices()
        return jsonify({
            'success': True,
            'data': [
                {
                    'id': i[0], 'invoice_no': i[1], 'customer': i[2],
                    'plate_no': i[3], 'so_no': i[4], 'total': i[5],
                    'status': i[6], 'invoice_date': str(i[7]), 'due_date': str(i[8])
                }
                for i in invoices
            ]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@billing_bp.route('/invoices/paid', methods=['GET'])
def get_paid():
    """Get paid invoices"""
    try:
        invoices = service.get_paid_invoices()
        return jsonify({
            'success': True,
            'data': [
                {
                    'id': i[0], 'invoice_no': i[1], 'customer': i[2],
                    'plate_no': i[3], 'so_no': i[4], 'total': i[5],
                    'status': i[6], 'invoice_date': str(i[7])
                }
                for i in invoices
            ]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@billing_bp.route('/invoices/overdue', methods=['GET'])
def get_overdue():
    """Get overdue invoices"""
    try:
        invoices = service.get_overdue_invoices()
        return jsonify({
            'success': True,
            'data': [
                {
                    'id': i[0], 'invoice_no': i[1], 'customer': i[2],
                    'plate_no': i[3], 'total': i[4], 'status': i[5],
                    'due_date': str(i[6]), 'days_overdue': i[7]
                }
                for i in invoices
            ]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@billing_bp.route('/summary', methods=['GET'])
def get_summary():
    """Get billing summary"""
    try:
        summary = service.get_billing_summary()
        return jsonify({
            'success': True,
            'data': {
                'draft_count': summary[0],
                'issued_count': summary[1],
                'partial_paid_count': summary[2],
                'paid_count': summary[3],
                'cancelled_count': summary[4],
                'pending_amount': float(summary[5]),
                'partial_paid_amount': float(summary[6]),
                'paid_amount': float(summary[7]),
                'overdue_amount': float(summary[8])
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@billing_bp.route('/service-orders/<int:so_id>/generate-invoice', methods=['POST'])
def generate_from_so(so_id):
    """Auto-generate invoice from service order"""
    try:
        invoice_id = service.generate_invoice_from_service_order(so_id)
        return jsonify({
            'success': True,
            'message': 'Invoice generated',
            'invoice_id': invoice_id
        }), 201
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
