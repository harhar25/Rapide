from flask import Blueprint, jsonify, request
from app.services.warehouse_service import WarehouseService

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
        
        required_fields = ['product_code', 'product_name', 'category', 'unit_price']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'{field} is required'}), 400
        
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
        
        history_id = warehouse_service.add_inventory(
            data.get('product_id'),
            data.get('quantity'),
            data.get('reference_no'),
            data.get('reference_type'),
            data.get('notes', ''),
            data.get('created_by', 'SYSTEM')
        )
        
        if history_id:
            return jsonify({
                'success': True,
                'history_id': history_id,
                'message': 'Inventory added successfully'
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Failed to add inventory'}), 500
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
        
        history_id = warehouse_service.remove_inventory(
            data.get('product_id'),
            data.get('quantity'),
            data.get('reference_no'),
            data.get('reference_type'),
            data.get('notes', ''),
            data.get('created_by', 'SYSTEM')
        )
        
        if history_id:
            return jsonify({
                'success': True,
                'history_id': history_id,
                'message': 'Inventory removed successfully'
            }), 201
        elif history_id is False:
            return jsonify({'success': False, 'error': 'Insufficient stock'}), 400
        else:
            return jsonify({'success': False, 'error': 'Failed to remove inventory'}), 500
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
