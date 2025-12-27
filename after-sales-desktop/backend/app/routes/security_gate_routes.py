from flask import Blueprint, request, jsonify
from app.services.security_gate_service import SecurityGateService
from datetime import datetime

security_gate_bp = Blueprint('security_gate', __name__, url_prefix='/api/security-gate')
service = SecurityGateService()

@security_gate_bp.route('/access/log', methods=['POST'])
def log_access():
    """Log vehicle access"""
    try:
        data = request.get_json() or {}

        vehicle_plate_no = data.get('vehicle_plate_no')
        gate_operator_id = data.get('gate_operator_id')

        if not vehicle_plate_no:
            raise ValueError('vehicle_plate_no is required')
        if gate_operator_id is None or str(gate_operator_id).strip() == '':
            raise ValueError('gate_operator_id is required')

        try:
            gate_operator_id = int(gate_operator_id)
        except Exception:
            raise ValueError('gate_operator_id must be a number')

        service_order_id = data.get('service_order_id')
        if service_order_id is None or str(service_order_id).strip() == '':
            service_order_id = None
        else:
            try:
                service_order_id = int(service_order_id)
            except Exception:
                raise ValueError('service_order_id must be a number')

        log_id = service.create_access_log(
            service_order_id=service_order_id,
            vehicle_plate_no=vehicle_plate_no,
            customer_name=data.get('customer_name'),
            access_type=data.get('access_type', 'entry'),
            gate_operator_id=gate_operator_id,
            mileage=data.get('mileage', 0),
            vehicle_condition=data.get('vehicle_condition', 'Good'),
            badge_scanned=data.get('badge_scanned', ''),
            is_authorized=data.get('is_authorized', True)
        )
        
        return jsonify({
            'success': True,
            'message': 'Access logged',
            'log_id': log_id
        }), 201
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@security_gate_bp.route('/logs/entries', methods=['GET'])
def get_entries():
    """Get entry logs"""
    try:
        date_str = request.args.get('date')
        date = None
        if date_str:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        logs = service.get_entry_logs(date)
        return jsonify({
            'success': True,
            'data': [
                {
                    'id': l[0], 'so_id': l[1], 'so_no': l[2], 'plate_no': l[3],
                    'customer': l[4], 'time': str(l[5]), 'operator': l[6],
                    'condition': l[7], 'mileage': l[8], 'authorized': l[9]
                }
                for l in logs
            ]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@security_gate_bp.route('/logs/exits', methods=['GET'])
def get_exits():
    """Get exit logs"""
    try:
        date_str = request.args.get('date')
        date = None
        if date_str:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        logs = service.get_exit_logs(date)
        return jsonify({
            'success': True,
            'data': [
                {
                    'id': l[0], 'so_id': l[1], 'so_no': l[2], 'plate_no': l[3],
                    'customer': l[4], 'time': str(l[5]), 'operator': l[6],
                    'mileage': l[7], 'condition': l[8]
                }
                for l in logs
            ]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@security_gate_bp.route('/badges/issue', methods=['POST'])
def issue_badge():
    """Issue an access badge"""
    try:
        data = request.get_json() or {}

        service_order_id = data.get('service_order_id')
        vehicle_plate_no = data.get('vehicle_plate_no')
        issued_by = data.get('issued_by')

        if service_order_id is None or str(service_order_id).strip() == '':
            raise ValueError('service_order_id is required')
        if not vehicle_plate_no:
            raise ValueError('vehicle_plate_no is required')
        if issued_by is None or str(issued_by).strip() == '':
            raise ValueError('issued_by is required')

        try:
            service_order_id = int(service_order_id)
        except Exception:
            raise ValueError('service_order_id must be a number')

        try:
            issued_by = int(issued_by)
        except Exception:
            raise ValueError('issued_by must be a number')

        customer_id = data.get('customer_id')
        if customer_id is None or str(customer_id).strip() == '':
            customer_id = None
        else:
            try:
                customer_id = int(customer_id)
            except Exception:
                raise ValueError('customer_id must be a number')

        badge_number = service.issue_badge(
            service_order_id=service_order_id,
            vehicle_plate_no=vehicle_plate_no,
            customer_id=customer_id,
            badge_type=data.get('badge_type', 'temporary'),
            issued_by=issued_by,
            expiry_days=data.get('expiry_days', 1)
        )
        
        return jsonify({
            'success': True,
            'message': 'Badge issued',
            'badge_number': badge_number
        }), 201
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@security_gate_bp.route('/badges/scan', methods=['POST'])
def scan_badge():
    """Scan a badge"""
    try:
        data = request.get_json()
        
        badge_id = service.scan_badge(data['badge_number'])
        
        return jsonify({
            'success': True,
            'message': 'Badge scanned',
            'badge_id': badge_id
        }), 200
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@security_gate_bp.route('/badges/active', methods=['GET'])
def get_active_badges():
    """Get active badges"""
    try:
        badges = service.get_active_badges()
        return jsonify({
            'success': True,
            'data': [
                {
                    'id': b[0], 'badge_no': b[1], 'plate_no': b[2], 'customer': b[3],
                    'type': b[4], 'issued': str(b[5]), 'expires': str(b[6]), 'scans': b[7]
                }
                for b in badges
            ]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@security_gate_bp.route('/badges/<badge_number>/revoke', methods=['POST'])
def revoke_badge(badge_number):
    """Revoke a badge"""
    try:
        data = request.get_json() or {}
        service.revoke_badge(badge_number, data.get('reason', ''))
        
        return jsonify({
            'success': True,
            'message': 'Badge revoked'
        }), 200
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@security_gate_bp.route('/summary', methods=['GET'])
def get_summary():
    """Get gate summary"""
    try:
        date_str = request.args.get('date')
        date = None
        if date_str:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        summary = service.get_gate_summary(date)
        
        return jsonify({
            'success': True,
            'data': {
                'total_entries': summary[0],
                'total_exits': summary[1],
                'denied_entries': summary[2],
                'denied_exits': summary[3],
                'security_failures': summary[4],
                'vehicles_processed': summary[5],
                'days_active': summary[6]
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@security_gate_bp.route('/incidents', methods=['GET'])
def get_incidents():
    """Get security incidents"""
    try:
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        df = datetime.strptime(date_from, '%Y-%m-%d').date() if date_from else None
        dt = datetime.strptime(date_to, '%Y-%m-%d').date() if date_to else None
        
        incidents = service.get_security_incidents(df, dt)
        
        return jsonify({
            'success': True,
            'data': [
                {
                    'id': i[0], 'plate_no': i[1], 'customer': i[2], 'time': str(i[3]),
                    'reason': i[4], 'operator': i[5]
                }
                for i in incidents
            ]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
