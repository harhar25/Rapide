from flask import Blueprint, jsonify, request
from app.services.warehouse_service import WarehouseService


def _parse_int(value, field_name, *, min_value=None):
    if value is None or value == '':
        raise ValueError(f"{field_name} is required")
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be an integer")
    if min_value is not None and parsed < min_value:
        raise ValueError(f"{field_name} must be at least {min_value}")
    return parsed


def _parse_float(value, field_name, *, min_value=None):
    if value is None or value == '':
        raise ValueError(f"{field_name} is required")
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a number")
    if min_value is not None and parsed < min_value:
        raise ValueError(f"{field_name} must be at least {min_value}")
    return parsed

warehouse_bp = Blueprint('warehouse', __name__, url_prefix='/api/warehouse')
warehouse_service = WarehouseService()

# ==================== PRODUCT ROUTES ====================

@warehouse_bp.route('/products', methods=['GET'])
def get_products():
    """Get all products"""
    try:
        products = warehouse_service.get_all_products()
        return jsonify({
            'success': True,
            'data': products,
            'count': len(products)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@warehouse_bp.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    """Get product details"""
    try:
        product = warehouse_service.get_product_by_id(product_id)
        if product:
            return jsonify({'success': True, 'data': product}), 200
        return jsonify({'success': False, 'error': 'Product not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@warehouse_bp.route('/products', methods=['POST'])
def create_product():
    """Create new product"""
    try:
        data = request.json
        
        required_fields = ['product_code', 'product_name', 'category', 'unit_price', 'quantity_in_stock']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'{field} is required'}), 400

        data['unit_price'] = _parse_float(data.get('unit_price'), 'unit_price', min_value=0)
        data['quantity_in_stock'] = _parse_int(data.get('quantity_in_stock'), 'quantity_in_stock', min_value=0)
        if data.get('reorder_level') is not None and data.get('reorder_level') != '':
            data['reorder_level'] = _parse_int(data.get('reorder_level'), 'reorder_level', min_value=0)
        
        product_id = warehouse_service.create_product(data)
        
        if product_id:
            return jsonify({
                'success': True,
                'product_id': product_id,
                'message': 'Product created successfully'
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Failed to create product'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@warehouse_bp.route('/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    """Update product"""
    try:
        data = request.json
        success = warehouse_service.update_product(product_id, data)
        
        if success:
            return jsonify({'success': True, 'message': 'Product updated'}), 200
        else:
            return jsonify({'success': False, 'error': 'Failed to update product'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@warehouse_bp.route('/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    """Delete product"""
    try:
        success = warehouse_service.delete_product(product_id)
        
        if success:
            return jsonify({'success': True, 'message': 'Product deleted'}), 200
        else:
            return jsonify({'success': False, 'error': 'Failed to delete product'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== INVENTORY ROUTES ====================

@warehouse_bp.route('/inventory/add', methods=['POST'])
def add_stock():
    """Add inventory"""
    try:
        data = request.json
        
        required_fields = ['product_id', 'quantity', 'reference_no', 'reference_type']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'{field} is required'}), 400

        product_id = _parse_int(data.get('product_id'), 'product_id', min_value=1)
        quantity = _parse_int(data.get('quantity'), 'quantity', min_value=1)
        
        history_id = warehouse_service.add_inventory(
            product_id,
            quantity,
            data.get('reference_no'),
            data.get('reference_type'),
            data.get('notes', ''),
            data.get('created_by', 'SYSTEM')
        )
        
        return jsonify({
            'success': True,
            'history_id': history_id,
            'message': 'Inventory added successfully'
        }), 201
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@warehouse_bp.route('/inventory/remove', methods=['POST'])
def remove_stock():
    """Remove inventory"""
    try:
        data = request.json
        
        required_fields = ['product_id', 'quantity', 'reference_no', 'reference_type']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'{field} is required'}), 400

        product_id = _parse_int(data.get('product_id'), 'product_id', min_value=1)
        quantity = _parse_int(data.get('quantity'), 'quantity', min_value=1)
        
        history_id = warehouse_service.remove_inventory(
            product_id,
            quantity,
            data.get('reference_no'),
            data.get('reference_type'),
            data.get('notes', ''),
            data.get('created_by', 'SYSTEM')
        )
        
        return jsonify({
            'success': True,
            'history_id': history_id,
            'message': 'Inventory removed successfully'
        }), 201
    except ValueError as e:
        # Catch specific validation errors (insufficient stock, product not found)
        error_msg = str(e)
        status_code = 400 if "Insufficient" in error_msg else 404
        return jsonify({'success': False, 'error': error_msg}), status_code
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@warehouse_bp.route('/inventory/history', methods=['GET'])
def get_history():
    """Get inventory history"""
    try:
        product_id = request.args.get('product_id', type=int)
        limit = request.args.get('limit', 100, type=int)
        
        history = warehouse_service.get_inventory_history(product_id, limit)
        
        return jsonify({
            'success': True,
            'data': history,
            'count': len(history)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@warehouse_bp.route('/low-stock', methods=['GET'])
def get_low_stock():
    """Get low stock products"""
    try:
        products = warehouse_service.get_low_stock_products()
        return jsonify({
            'success': True,
            'data': products,
            'count': len(products)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@warehouse_bp.route('/inventory/low-stock', methods=['GET'])
def get_inventory_low_stock():
    """Get low stock products (alternate path)"""
    try:
        products = warehouse_service.get_low_stock_products()
        return jsonify({
            'success': True,
            'data': products,
            'count': len(products)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@warehouse_bp.route('/summary', methods=['GET'])
def get_summary():
    """Get warehouse summary"""
    try:
        summary = warehouse_service.get_inventory_summary()
        return jsonify({
            'success': True,
            'data': {
                'total_products': summary[0],
                'total_quantity': summary[1],
                'total_value': float(summary[2]) if summary[2] else 0,
                'low_stock_count': summary[3]
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@warehouse_bp.route('/inventory/summary', methods=['GET'])
def get_inventory_summary():
    """Get warehouse inventory summary (alternate path)"""
    try:
        summary = warehouse_service.get_inventory_summary()
        return jsonify({
            'success': True,
            'data': {
                'total_products': summary[0],
                'total_quantity': summary[1],
                'total_value': float(summary[2]) if summary[2] else 0,
                'low_stock_count': summary[3]
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== PROCESS 4.1 & 4.2: PARTS REQUEST & ISSUANCE ====================

@warehouse_bp.route('/parts-requests/pending', methods=['GET'])
def get_pending_parts_requests():
    """Get all pending parts requests from technicians (Process 4.1 - Warehouse View)"""
    try:
        requests = warehouse_service.get_pending_parts_requests()
        return jsonify({
            'success': True,
            'data': requests,
            'count': len(requests)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@warehouse_bp.route('/parts-availability/check', methods=['POST'])
def check_parts_availability():
    """Check if all parts in list are available in stock (Process 4.2 - Validation)"""
    try:
        data = request.json
        parts_list = data.get('parts_list', [])
        
        if not parts_list:
            return jsonify({'success': False, 'error': 'parts_list is required'}), 400
        
        availability = warehouse_service.check_parts_availability(parts_list)
        
        return jsonify({
            'success': True,
            'data': availability
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@warehouse_bp.route('/parts-requests/<int:service_order_id>/for-approval', methods=['GET'])
def get_parts_request_for_approval(service_order_id):
    """Get parts request details ready for warehouse approval (Process 4.2)"""
    try:
        request_data = warehouse_service.get_parts_request_for_approval(service_order_id)
        if request_data:
            return jsonify({'success': True, 'data': request_data}), 200
        return jsonify({'success': False, 'error': 'No parts request found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@warehouse_bp.route('/parts/ready-for-release', methods=['GET'])
def get_parts_ready_for_release():
    """Get all parts prepared and ready for technician pickup (Process 4.2 - Ready to Release)"""
    try:
        parts = warehouse_service.get_parts_ready_for_release()
        return jsonify({
            'success': True,
            'data': parts,
            'count': len(parts)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@warehouse_bp.route('/parts-issuance/history', methods=['GET'])
def get_parts_issuance_history():
    """Get history of parts issued to technicians (Process 4.2 - Audit)"""
    try:
        limit = request.args.get('limit', 50, type=int)
        history = warehouse_service.get_parts_issuance_history(limit)
        return jsonify({
            'success': True,
            'data': history,
            'count': len(history)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== PICKLIST ROUTES ====================

@warehouse_bp.route('/picklists', methods=['GET'])
def get_picklists():
    """Get all active picklists"""
    try:
        picklists = warehouse_service.get_active_picklists()
        return jsonify({
            'success': True,
            'data': picklists,
            'count': len(picklists)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@warehouse_bp.route('/picklists/<int:picklist_id>', methods=['GET'])
def get_picklist(picklist_id):
    """Get specific picklist details"""
    try:
        picklist = warehouse_service.get_picklist_by_id(picklist_id)
        if picklist:
            return jsonify({'success': True, 'data': picklist}), 200
        return jsonify({'success': False, 'error': 'Picklist not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@warehouse_bp.route('/picklists', methods=['POST'])
def create_picklist():
    """Create a new picklist from job controller request"""
    try:
        data = request.json
        
        required_fields = ['jobOrderNumber', 'customer', 'vehicle', 'items']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'{field} is required'}), 400
        
        picklist_id = warehouse_service.create_picklist(data)
        
        if picklist_id:
            return jsonify({
                'success': True,
                'picklist_id': picklist_id,
                'message': 'Picklist created successfully'
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Failed to create picklist'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@warehouse_bp.route('/picklists/<int:picklist_id>/items/<int:item_id>', methods=['PUT'])
def update_picked_item(picklist_id, item_id):
    """Update picked quantity and location for an item"""
    try:
        data = request.json
        
        picked_qty = data.get('pickedQuantity', 0)
        location = data.get('location', '')
        notes = data.get('notes', '')
        
        success = warehouse_service.update_picked_item(picklist_id, item_id, picked_qty, location, notes)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Item pick updated'
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Failed to update pick'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@warehouse_bp.route('/picklists/<int:picklist_id>/complete', methods=['PUT'])
def complete_picklist(picklist_id):
    """Mark a picklist as completed"""
    try:
        data = request.json
        
        success = warehouse_service.complete_picklist(picklist_id, data)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Picklist completed successfully'
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Failed to complete picklist'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500