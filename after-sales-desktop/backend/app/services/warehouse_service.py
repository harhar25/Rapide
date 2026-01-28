from database import db
from datetime import datetime

class WarehouseService:
    """Warehouse management service"""

    def _to_int(self, value, field_name, *, min_value=None):
        if value is None or value == '':
            raise ValueError(f"{field_name} is required")
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            raise ValueError(f"{field_name} must be an integer")
        if min_value is not None and parsed < min_value:
            raise ValueError(f"{field_name} must be at least {min_value}")
        return parsed
    
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
        (product_code, product_name, category, unit_price, quantity_in_stock, reorder_level, supplier, description, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        params = (
            product_data.get('product_code'),
            product_data.get('product_name'),
            product_data.get('category'),
            product_data.get('unit_price'),
            self._to_int(product_data.get('quantity_in_stock'), 'quantity_in_stock', min_value=0),
            product_data.get('reorder_level', 10),
            product_data.get('supplier', ''),
            product_data.get('description', ''),
            product_data.get('created_by', 'SYSTEM')
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
        product_id = self._to_int(product_id, 'product_id', min_value=1)
        quantity = self._to_int(quantity, 'quantity', min_value=1)
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
        product_id = self._to_int(product_id, 'product_id', min_value=1)
        quantity = self._to_int(quantity, 'quantity', min_value=1)
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

        history = []
        for r in results:
            if isinstance(r, dict):
                created_at = r.get('created_at')
                if hasattr(created_at, 'isoformat'):
                    r = dict(r)
                    r['created_at'] = created_at.isoformat()
                history.append(tuple(r.values()))
            else:
                vals = list(r)
                if len(vals) >= 12 and hasattr(vals[11], 'isoformat'):
                    vals[11] = vals[11].isoformat()
                history.append(tuple(vals))

        return history
    
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

    def ensure_parts_requests_table(self):
        db.execute_update(
            """
            CREATE TABLE IF NOT EXISTS parts_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                service_order_id INT NOT NULL,
                technician_id INT NOT NULL,
                requested_parts JSON NOT NULL,
                notes TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_parts_requests_service_order_id (service_order_id),
                INDEX idx_parts_requests_status (status)
            )
            """
        )
    
    # ==================== PROCESS 4.1 & 4.2: PARTS REQUEST & ISSUANCE ====================
    
    def get_pending_parts_requests(self):
        """Get all pending parts requests from technicians (Process 4.1 - Warehouse View)"""
        self.ensure_parts_requests_table()
        query = """
        SELECT pr.id, pr.service_order_id, pr.requested_parts as document_data, pr.created_at,
               so.vehicle_plate_no, so.service_type, c.name as customer_name,
               pr.technician_id, t.name as technician_name
        FROM parts_requests pr
        JOIN service_orders so ON pr.service_order_id = so.id
        LEFT JOIN customers c ON so.customer_id = c.id
        LEFT JOIN technicians t ON pr.technician_id = t.id
        WHERE pr.status = 'pending'
        ORDER BY pr.created_at DESC
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
        self.ensure_parts_requests_table()
        query = """
        SELECT id, service_order_id, requested_parts as document_data, created_at
        FROM parts_requests
        WHERE service_order_id = %s
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
    # ==================== PICKLIST METHODS ====================

    def get_active_picklists(self):
        """Get all active picklists (pending or in_progress)"""
        query = """
        SELECT id, picklist_number, request_date, job_order_number, customer, vehicle, 
               priority_level, requested_by, status, notes, created_at
        FROM warehouse_picklists
        WHERE status IN ('pending', 'in_progress')
        ORDER BY created_at DESC
        """
        results = db.execute_query(query) or []
        
        # Convert to JSON-compatible format with items
        picklists = []
        for p in results:
            picklist = {
                'id': p.get('id'),
                'picklistNumber': p.get('picklist_number'),
                'requestDate': p.get('request_date'),
                'jobOrderNumber': p.get('job_order_number'),
                'customer': p.get('customer'),
                'vehicle': p.get('vehicle'),
                'priorityLevel': p.get('priority_level'),
                'requestedBy': p.get('requested_by'),
                'status': p.get('status'),
                'notes': p.get('notes'),
                'items': self._get_picklist_items(p.get('id'))
            }
            picklists.append(picklist)
        return picklists
    
    def _get_picklist_items(self, picklist_id):
        """Get all items in a picklist"""
        query = """
        SELECT id, item_id, product_code, description, quantity_required, 
               quantity_picked, bin_location, picked_notes
        FROM warehouse_picklist_items
        WHERE picklist_id = %s
        ORDER BY item_id ASC
        """
        results = db.execute_query(query, (picklist_id,)) or []
        
        items = []
        for item in results:
            items.append({
                'id': item.get('id'),
                'itemId': item.get('item_id'),
                'code': item.get('product_code'),
                'description': item.get('description'),
                'quantity': item.get('quantity_required'),
                'pickedQuantity': item.get('quantity_picked'),
                'location': item.get('bin_location'),
                'notes': item.get('picked_notes')
            })
        return items
    
    def get_picklist_by_id(self, picklist_id):
        """Get specific picklist with all items"""
        query = """
        SELECT id, picklist_number, request_date, job_order_number, customer, vehicle,
               priority_level, requested_by, status, notes, created_at
        FROM warehouse_picklists
        WHERE id = %s
        """
        result = db.execute_query(query, (picklist_id,))
        
        if not result or len(result) == 0:
            return None
        
        p = result[0]
        picklist = {
            'id': p.get('id'),
            'picklistNumber': p.get('picklist_number'),
            'requestDate': p.get('request_date'),
            'jobOrderNumber': p.get('job_order_number'),
            'customer': p.get('customer'),
            'vehicle': p.get('vehicle'),
            'priorityLevel': p.get('priority_level'),
            'requestedBy': p.get('requested_by'),
            'status': p.get('status'),
            'notes': p.get('notes'),
            'items': self._get_picklist_items(picklist_id)
        }
        return picklist
    
    def create_picklist(self, picklist_data):
        """Create a new picklist from job controller request"""
        # Generate unique picklist number
        import uuid
        picklist_number = f"PL-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        query = """
        INSERT INTO warehouse_picklists 
        (picklist_number, request_date, job_order_number, customer, vehicle, priority_level, requested_by, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending')
        """
        
        params = (
            picklist_number,
            datetime.now().strftime('%Y-%m-%d'),
            picklist_data.get('jobOrderNumber'),
            picklist_data.get('customer'),
            picklist_data.get('vehicle'),
            picklist_data.get('priorityLevel', 'normal'),
            picklist_data.get('requestedBy', 'SYSTEM')
        )
        
        result = db.execute_update(query, params)
        picklist_id = result.get('last_id') if result['success'] else None
        
        if not picklist_id:
            return None
        
        # Add items to picklist
        items = picklist_data.get('items', [])
        for item in items:
            item_query = """
            INSERT INTO warehouse_picklist_items 
            (picklist_id, item_id, product_code, description, quantity_required)
            VALUES (%s, %s, %s, %s, %s)
            """
            item_params = (
                picklist_id,
                item.get('id'),
                item.get('code', ''),
                item.get('description', ''),
                self._to_int(item.get('quantity'), 'quantity', min_value=1)
            )
            db.execute_update(item_query, item_params)
        
        return picklist_id
    
    def update_picked_item(self, picklist_id, item_id, picked_qty, location, notes):
        """Update quantity picked and location for an item"""
        query = """
        UPDATE warehouse_picklist_items
        SET quantity_picked = %s, bin_location = %s, picked_notes = %s
        WHERE picklist_id = %s AND id = %s
        """
        
        params = (
            self._to_int(picked_qty, 'pickedQuantity', min_value=0),
            location,
            notes,
            picklist_id,
            item_id
        )
        
        result = db.execute_update(query, params)
        return result['success']
    
    def complete_picklist(self, picklist_id, picklist_data):
        """Mark picklist as completed"""
        query = """
        UPDATE warehouse_picklists
        SET status = 'completed'
        WHERE id = %s
        """
        
        result = db.execute_update(query, (picklist_id,))
        return result['success']