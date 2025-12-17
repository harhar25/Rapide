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
    
    # ==================== PROCESS 4.1 & 4.2: PARTS REQUEST & ISSUANCE ====================
    
    def get_pending_parts_requests(self):
        """Get all pending parts requests from technicians (Process 4.1 - Warehouse View)"""
        query = """
        SELECT sod.id, sod.service_order_id, sod.document_data, sod.created_at,
               so.vehicle_plate_no, so.service_type, c.name as customer_name,
               ta.technician_id, t.name as technician_name
        FROM service_order_documents sod
        JOIN service_orders so ON sod.service_order_id = so.id
        LEFT JOIN customers c ON so.customer_id = c.id
        LEFT JOIN technician_assignments ta ON so.id = ta.service_order_id
        LEFT JOIN technicians t ON ta.technician_id = t.id
        WHERE sod.document_type = 'parts-request'
        ORDER BY sod.created_at DESC
        """
        results = db.execute_query(query) or []
        return results
    
    def check_parts_availability(self, parts_list):
        """Check if all parts in list are available in stock (Process 4.2 - Validation)"""
        availability = []
        total_cost = 0
        all_available = True
        
        for part in parts_list:
            product_id = part.get('product_id')
            quantity_needed = part.get('quantity', 1)
            
            # Check inventory
            query = "SELECT quantity_in_stock, unit_price FROM warehouse_products WHERE id = %s"
            result = db.execute_query(query, (product_id,))
            
            if result and len(result) > 0:
                product = result[0]
                quantity_available = product.get('quantity_in_stock', 0)
                unit_price = product.get('unit_price', 0)
                
                is_available = quantity_available >= quantity_needed
                part_cost = unit_price * quantity_needed
                total_cost += part_cost
                
                availability.append({
                    'product_id': product_id,
                    'quantity_needed': quantity_needed,
                    'quantity_available': quantity_available,
                    'is_available': is_available,
                    'part_cost': part_cost
                })
                
                if not is_available:
                    all_available = False
            else:
                availability.append({
                    'product_id': product_id,
                    'quantity_needed': quantity_needed,
                    'is_available': False,
                    'error': 'Product not found'
                })
                all_available = False
        
        return {
            'all_available': all_available,
            'parts_availability': availability,
            'total_cost': total_cost
        }
    
    def get_parts_request_for_approval(self, service_order_id):
        """Get parts request details ready for warehouse approval (Process 4.2)"""
        query = """
        SELECT id, service_order_id, document_data, created_at
        FROM service_order_documents
        WHERE service_order_id = %s AND document_type = 'parts-request'
        ORDER BY created_at DESC
        LIMIT 1
        """
        result = db.execute_query(query, (service_order_id,))
        if result:
            return result[0]
        return None
    
    def get_parts_ready_for_release(self):
        """Get all parts prepared and ready for technician pickup (Process 4.2 - Ready to Release)"""
        query = """
        SELECT id, service_order_id, document_data, printed_by, created_at
        FROM service_order_documents
        WHERE document_type = 'parts-ready'
        ORDER BY created_at DESC
        """
        results = db.execute_query(query) or []
        return results
    
    def get_parts_issuance_history(self, limit=50):
        """Get history of parts issued to technicians (Process 4.2 - Audit)"""
        query = """
        SELECT id, service_order_id, document_data, printed_by, created_at
        FROM service_order_documents
        WHERE document_type = 'parts-issued'
        ORDER BY created_at DESC
        LIMIT %s
        """
        results = db.execute_query(query, (limit,)) or []
        return results
