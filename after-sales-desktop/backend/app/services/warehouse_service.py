from database import db
from datetime import datetime

class WarehouseService:
    """Warehouse product and inventory management service"""
    
    def get_all_products(self):
        """Get all warehouse products - returns consistent 10-column tuple: (id, code, name, category, price, qty, reorder_level, supplier, description, status)"""
        query = """
        SELECT id, product_code, product_name, category, unit_price, 
               quantity_in_stock, reorder_level, supplier, description, status
        FROM warehouse_products
        WHERE status = 'active'
        ORDER BY product_name ASC
        """
        results = db.execute_query(query) or []
        # Convert dictionaries to tuples for frontend compatibility
        return [tuple(p.values()) for p in results]
    
    def get_product_by_id(self, product_id):
        """Get product details by ID - returns consistent 10-column tuple: (id, code, name, category, price, qty, reorder_level, supplier, description, status)"""
        query = """
        SELECT id, product_code, product_name, category, unit_price,
               quantity_in_stock, reorder_level, supplier, description, status
        FROM warehouse_products
        WHERE id = %s
        """
        result = db.execute_query(query, (product_id,))
        if result and len(result) > 0:
            p = result[0]
            return tuple(p.values())
        return None
    
    def create_product(self, product_data):
        """Create new warehouse product"""
        query = """
        INSERT INTO warehouse_products 
        (product_code, product_name, category, unit_price, reorder_level, supplier, description)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        
        params = (
            product_data.get('product_code'),
            product_data.get('product_name'),
            product_data.get('category'),
            product_data.get('unit_price'),
            product_data.get('reorder_level', 10),
            product_data.get('supplier', ''),
            product_data.get('description', '')
        )
        
        result = db.execute_update(query, params)
        return result.get('last_id') if result['success'] else None
    
    def update_product(self, product_id, product_data):
        """Update product details"""
        query = """
        UPDATE warehouse_products
        SET product_code = %s, product_name = %s, category = %s, unit_price = %s, 
            reorder_level = %s, supplier = %s, description = %s
        WHERE id = %s
        """
        
        params = (
            product_data.get('product_code'),
            product_data.get('product_name'),
            product_data.get('category'),
            product_data.get('unit_price'),
            product_data.get('reorder_level'),
            product_data.get('supplier'),
            product_data.get('description'),
            product_id
        )
        
        result = db.execute_update(query, params)
        return result['success']
    
    def delete_product(self, product_id):
        """Delete product (soft delete)"""
        query = "UPDATE warehouse_products SET status = 'discontinued' WHERE id = %s"
        result = db.execute_update(query, (product_id,))
        return result['success']
    
    def add_inventory(self, product_id, quantity, reference_no, reference_type, notes, created_by):
        """Add inventory (stock in) - returns history_id or raises error"""
        # Get current quantity
        current = self.get_product_by_id(product_id)
        if not current:
            raise ValueError(f"Product {product_id} not found")
        
        previous_qty = current[5]  # quantity_in_stock (index 5 in 10-column tuple)
        new_qty = previous_qty + quantity
        
        # Update product quantity
        update_query = "UPDATE warehouse_products SET quantity_in_stock = %s WHERE id = %s"
        db.execute_update(update_query, (new_qty, product_id))
        
        # Log transaction
        history_query = """
        INSERT INTO warehouse_inventory_history
        (product_id, transaction_type, quantity, previous_quantity, new_quantity, 
         reference_no, reference_type, notes, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        params = (product_id, 'in', quantity, previous_qty, new_qty, reference_no, reference_type, notes, created_by)
        result = db.execute_update(history_query, params)
        return result.get('last_id') if result['success'] else None
    
    def remove_inventory(self, product_id, quantity, reference_no, reference_type, notes, created_by):
        """Remove inventory (stock out) - returns history_id or raises error"""
        # Get current quantity
        current = self.get_product_by_id(product_id)
        if not current:
            raise ValueError(f"Product {product_id} not found")
        
        previous_qty = current[5]  # quantity_in_stock (index 5 in 10-column tuple)
        
        if quantity > previous_qty:
            raise ValueError(f"Insufficient stock. Available: {previous_qty}, Requested: {quantity}")
        
        new_qty = previous_qty - quantity
        
        # Update product quantity
        update_query = "UPDATE warehouse_products SET quantity_in_stock = %s WHERE id = %s"
        db.execute_update(update_query, (new_qty, product_id))
        
        # Log transaction
        history_query = """
        INSERT INTO warehouse_inventory_history
        (product_id, transaction_type, quantity, previous_quantity, new_quantity, 
         reference_no, reference_type, notes, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        params = (product_id, 'out', quantity, previous_qty, new_qty, reference_no, reference_type, notes, created_by)
        result = db.execute_update(history_query, params)
        return result.get('last_id') if result['success'] else None
    
    def get_inventory_history(self, product_id=None, limit=100):
        """Get inventory transaction history"""
        if product_id:
            query = """
            SELECT h.id, h.product_id, p.product_name, h.transaction_type, h.quantity,
                   h.previous_quantity, h.new_quantity, h.reference_no, h.reference_type,
                   h.notes, h.created_by, h.created_at
            FROM warehouse_inventory_history h
            JOIN warehouse_products p ON h.product_id = p.id
            WHERE h.product_id = %s
            ORDER BY h.created_at DESC
            LIMIT %s
            """
            results = db.execute_query(query, (product_id, limit)) or []
        else:
            query = """
            SELECT h.id, h.product_id, p.product_name, h.transaction_type, h.quantity,
                   h.previous_quantity, h.new_quantity, h.reference_no, h.reference_type,
                   h.notes, h.created_by, h.created_at
            FROM warehouse_inventory_history h
            JOIN warehouse_products p ON h.product_id = p.id
            ORDER BY h.created_at DESC
            LIMIT %s
            """
            results = db.execute_query(query, (limit,)) or []
        
        # Convert dictionaries to tuples for consistency
        return [tuple(r.values()) for r in results]
    
    def get_low_stock_products(self):
        """Get products below reorder level"""
        query = """
        SELECT id, product_code, product_name, quantity_in_stock, reorder_level
        FROM warehouse_products
        WHERE quantity_in_stock <= reorder_level AND status = 'active'
        ORDER BY quantity_in_stock ASC
        """
        results = db.execute_query(query) or []
        # Convert dictionaries to tuples for consistency
        return [tuple(r.values()) for r in results]
    
    def get_inventory_summary(self):
        """Get warehouse inventory summary"""
        query = """
        SELECT 
            COUNT(*) as total_products,
            SUM(quantity_in_stock) as total_quantity,
            SUM(quantity_in_stock * unit_price) as total_value,
            COUNT(CASE WHEN quantity_in_stock <= reorder_level THEN 1 END) as low_stock_count
        FROM warehouse_products
        WHERE status = 'active'
        """
        result = db.execute_query(query)
        if result and len(result) > 0:
            data = result[0]
            return (
                data.get('total_products', 0) or 0,
                data.get('total_quantity', 0) or 0,
                data.get('total_value', 0) or 0,
                data.get('low_stock_count', 0) or 0
            )
        return (0, 0, 0, 0)
