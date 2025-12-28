from flask import Blueprint, request, jsonify
from app.services.car_jockey_service import CarJockeyService

car_jockey_bp = Blueprint('car_jockey', __name__, url_prefix='/api/car-jockey')
service = CarJockeyService()

@car_jockey_bp.route('/vehicles/pending', methods=['GET'])
def get_pending_vehicles():
    """Get vehicles waiting for movement"""
    try:
        vehicles = service.get_pending_movements()
        return jsonify({
            'success': True,
            'data': [
                {
                    'id': v[0], 'so_id': v[1], 'customer_name': v[2], 
                    'plate_no': v[3], 'model': v[4], 'year': v[5], 
                    'status': v[6], 'created_at': str(v[7])
                }
                for v in vehicles
            ]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@car_jockey_bp.route('/movements/active', methods=['GET'])
def get_active_movements():
    """Get currently active vehicle movements"""
    try:
        movements = service.get_active_movements()
        return jsonify({
            'success': True,
            'data': [
                {
                    'id': m[0], 'so_id': m[1], 'so_no': m[2], 'customer': m[3],
                    'plate_no': m[4], 'type': m[5], 'from': m[6], 'to': m[7],
                    'status': m[8], 'fuel_start': m[9], 'fuel_end': m[10],
                    'mileage_start': m[11], 'mileage_end': m[12],
                    'started_at': str(m[13]), 'completed_at': str(m[14]) if m[14] else None
                }
                for m in movements
            ]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@car_jockey_bp.route('/parking/active', methods=['GET'])
def get_parked_vehicles():
    """Get all currently parked vehicles"""
    try:
        parked = service.get_parked_vehicles()
        return jsonify({
            'success': True,
            'data': [
                {
                    'id': p[0], 'so_id': p[1], 'so_no': p[2], 'customer': p[3],
                    'plate_no': p[4], 'slot': p[5], 'zone': p[6], 'level': p[7],
                    'parked_at': str(p[8]), 'duration_hrs': p[9], 'fee': p[10],
                    'fee_status': p[11], 'status': p[12]
                }
                for p in parked
            ]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@car_jockey_bp.route('/vehicles/parked', methods=['GET'])
def get_vehicles_parked():
    """Get all currently parked vehicles (alternate path)"""
    try:
        parked = service.get_parked_vehicles()
        return jsonify({
            'success': True,
            'data': [
                {
                    'id': p[0], 'so_id': p[1], 'so_no': p[2], 'customer': p[3],
                    'plate_no': p[4], 'slot': p[5], 'zone': p[6], 'level': p[7],
                    'parked_at': str(p[8]), 'duration_hrs': p[9], 'fee': p[10],
                    'fee_status': p[11], 'status': p[12]
                }
                for p in parked
            ]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@car_jockey_bp.route('/movements/recent', methods=['GET'])
def get_recent_movements():
    """Get recent vehicle movements"""
    try:
        limit = request.args.get('limit', 50, type=int)
        movements = service.get_active_movements()  # Returns recent movements
        return jsonify({
            'success': True,
            'data': [
                {
                    'id': m[0], 'so_id': m[1], 'so_no': m[2], 'customer': m[3],
                    'plate_no': m[4], 'type': m[5], 'from': m[6], 'to': m[7],
                    'status': m[8], 'fuel_start': m[9], 'fuel_end': m[10],
                    'mileage_start': m[11], 'mileage_end': m[12],
                    'started_at': str(m[13]), 'completed_at': str(m[14]) if m[14] else None
                }
                for m in movements[:limit]
            ]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@car_jockey_bp.route('/movements', methods=['POST'])
def create_movement():
    """Create a new vehicle movement"""
    try:
        data = request.get_json()
        
        movement_id = service.create_vehicle_movement(
            service_order_id=data['service_order_id'],
            jockey_id=data['jockey_id'],
            movement_type=data.get('movement_type', 'check-in'),
            from_location=data.get('from_location'),
            to_location=data.get('to_location'),
            reason=data.get('reason'),
            vehicle_condition_start=data.get('vehicle_condition'),
            fuel_level_start=data.get('fuel_level'),
            mileage_start=data.get('mileage')
        )
        
        return jsonify({
            'success': True,
            'message': 'Vehicle movement created',
            'movement_id': movement_id
        }), 201
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@car_jockey_bp.route('/movements/<int:movement_id>/complete', methods=['POST'])
def complete_movement(movement_id):
    """Complete a vehicle movement"""
    try:
        data = request.get_json()
        
        service.complete_vehicle_movement(
            movement_id=movement_id,
            vehicle_condition_end=data.get('vehicle_condition'),
            fuel_level_end=data.get('fuel_level'),
            mileage_end=data.get('mileage'),
            notes=data.get('notes')
        )
        
        return jsonify({
            'success': True,
            'message': 'Vehicle movement completed'
        }), 200
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@car_jockey_bp.route('/parking', methods=['POST'])
def create_parking():
    """Create a parking record"""
    try:
        data = request.get_json()
        
        parking_id = service.create_parking_record(
            service_order_id=data['service_order_id'],
            vehicle_movement_id=data['vehicle_movement_id'],
            parking_slot=data['parking_slot'],
            parking_zone=data['parking_zone'],
            parking_level=data.get('parking_level', 0),
            ground_condition=data.get('ground_condition'),
            parking_fee=data.get('parking_fee', 0)
        )
        
        return jsonify({
            'success': True,
            'message': 'Parking record created',
            'parking_id': parking_id
        }), 201
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@car_jockey_bp.route('/parking/<int:parking_id>/release', methods=['POST'])
def release_parking(parking_id):
    """Release a vehicle from parking"""
    try:
        data = request.get_json() or {}
        
        service.release_parking(parking_id, data.get('notes', ''))
        
        return jsonify({
            'success': True,
            'message': 'Vehicle released from parking'
        }), 200
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@car_jockey_bp.route('/summary', methods=['GET'])
def get_summary():
    """Get Car Jockey summary statistics"""
    try:
        summary = service.get_jockey_summary()
        
        return jsonify({
            'success': True,
            'data': {
                'total_movements': summary[0],
                'active_movements': summary[1],
                'completed_movements': summary[2],
                'total_parked': summary[3],
                'currently_parked': summary[4],
                'released_today': summary[5],
                'parking_revenue': float(summary[6]),
                'avg_mileage_traveled': float(summary[7])
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
