from database import db
from datetime import datetime

class CarJockeyService:
    """Car Jockey service for vehicle movements and parking management"""
    
    def get_pending_movements(self):
        """Get vehicles waiting for movement/parking"""
        query = """
        SELECT so.id, CONCAT('SO-', LPAD(so.id, 6, '0')) as service_order_no, c.name, c.plate_no, 
               c.vehicle_model, c.vehicle_year, so.status, so.created_at
        FROM scheduling_orders so
        JOIN customers c ON so.customer_id = c.id
        WHERE so.status IN ('ready-for-sa', 'returned-to-sa') 
        AND so.id NOT IN (
            SELECT service_order_id FROM vehicle_movements 
            WHERE movement_type = 'check-out' AND status = 'completed'
        )
        ORDER BY so.created_at ASC
        """
        results = db.execute_query(query) or []
        return [tuple(r.values()) for r in results]
    
    def get_active_movements(self):
        """Get vehicles currently being moved or parked"""
        query = """
        SELECT vm.id, vm.service_order_id, CONCAT('SO-', LPAD(so.id, 6, '0')) as service_order_no, c.name, c.plate_no,
               vm.movement_type, vm.from_location, vm.to_location, vm.status, 
               vm.fuel_level_start, vm.fuel_level_end, vm.mileage_start, vm.mileage_end,
               vm.started_at, vm.completed_at
        FROM vehicle_movements vm
        JOIN scheduling_orders so ON vm.service_order_id = so.id
        JOIN customers c ON so.customer_id = c.id
        WHERE vm.status = 'in-progress'
        ORDER BY vm.started_at DESC
        """
        results = db.execute_query(query) or []
        return [tuple(r.values()) for r in results]
    
    def get_parked_vehicles(self):
        """Get all currently parked vehicles"""
        query = """
        SELECT pr.id, pr.service_order_id, CONCAT('SO-', LPAD(so.id, 6, '0')) as service_order_no, c.name, c.plate_no,
               pr.parking_slot, pr.parking_zone, pr.parking_level, pr.parked_at,
               pr.duration_hours, pr.parking_fee, pr.fee_status, pr.status
        FROM parking_records pr
        JOIN scheduling_orders so ON pr.service_order_id = so.id
        JOIN customers c ON so.customer_id = c.id
        WHERE pr.status = 'active'
        ORDER BY pr.parked_at DESC
        """
        results = db.execute_query(query) or []
        return [tuple(r.values()) for r in results]
    
    def create_vehicle_movement(self, service_order_id, jockey_id, movement_type, 
                               from_location, to_location, reason, vehicle_condition_start,
                               fuel_level_start, mileage_start):
        """Create a new vehicle movement record"""
        query = """
        INSERT INTO vehicle_movements
        (service_order_id, jockey_id, movement_type, from_location, to_location, reason,
         vehicle_condition_start, fuel_level_start, mileage_start, started_at, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), 'in-progress')
        """
        params = (service_order_id, jockey_id, movement_type, from_location, to_location,
                 reason, vehicle_condition_start, fuel_level_start, mileage_start)
        
        result = db.execute_update(query, params)
        if result['success']:
            return result.get('last_id')
        raise ValueError("Failed to create vehicle movement")
    
    def complete_vehicle_movement(self, movement_id, vehicle_condition_end, 
                                 fuel_level_end, mileage_end, notes):
        """Complete a vehicle movement"""
        query = """
        UPDATE vehicle_movements
        SET status = 'completed', vehicle_condition_end = %s, fuel_level_end = %s,
            mileage_end = %s, notes = %s, completed_at = NOW(), updated_at = NOW()
        WHERE id = %s
        """
        params = (vehicle_condition_end, fuel_level_end, mileage_end, notes, movement_id)
        result = db.execute_update(query, params)
        
        if not result['success']:
            raise ValueError("Failed to complete vehicle movement")
        return True
    
    def create_parking_record(self, service_order_id, vehicle_movement_id, 
                             parking_slot, parking_zone, parking_level, 
                             ground_condition, parking_fee=0):
        """Create a parking record for a vehicle"""
        query = """
        INSERT INTO parking_records
        (service_order_id, vehicle_movement_id, parking_slot, parking_zone, 
         parking_level, ground_condition, parking_fee, parked_at, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), 'active')
        """
        params = (service_order_id, vehicle_movement_id, parking_slot, parking_zone,
                 parking_level, ground_condition, parking_fee)
        
        result = db.execute_update(query, params)
        if result['success']:
            return result.get('last_id')
        raise ValueError("Failed to create parking record")
    
    def release_parking(self, parking_id, notes=""):
        """Release a vehicle from parking"""
        # Calculate parking duration
        query = """
        UPDATE parking_records
        SET status = 'released', retrieved_at = NOW(), 
            duration_hours = TIMESTAMPDIFF(HOUR, parked_at, NOW()),
            updated_at = NOW()
        WHERE id = %s
        """
        params = (parking_id,)
        result = db.execute_update(query, params)
        
        if not result['success']:
            raise ValueError("Failed to release parking")
        return True
    
    def get_jockey_summary(self):
        """Get daily summary statistics for Car Jockey operations"""
        query = """
        SELECT 
            COUNT(DISTINCT vm.id) as total_movements,
            SUM(CASE WHEN vm.status = 'in-progress' THEN 1 ELSE 0 END) as active_movements,
            SUM(CASE WHEN vm.status = 'completed' THEN 1 ELSE 0 END) as completed_movements,
            COUNT(DISTINCT pr.id) as total_parked,
            SUM(CASE WHEN pr.status = 'active' THEN 1 ELSE 0 END) as currently_parked,
            SUM(CASE WHEN pr.status = 'released' THEN 1 ELSE 0 END) as released_today,
            COALESCE(SUM(CASE WHEN pr.fee_status = 'paid' THEN pr.parking_fee ELSE 0 END), 0) as parking_revenue,
            COALESCE(AVG(CASE WHEN vm.status = 'completed' THEN vm.mileage_end - vm.mileage_start ELSE NULL END), 0) as avg_mileage_traveled
        FROM vehicle_movements vm
        LEFT JOIN parking_records pr ON vm.service_order_id = pr.service_order_id
        WHERE DATE(vm.created_at) = CURDATE()
        """
        result = db.execute_query(query)
        if result:
            stats = result[0]
            return tuple(stats.values())
        return (0, 0, 0, 0, 0, 0, 0, 0)
    
    def get_movement_details(self, movement_id):
        """Get detailed information about a specific movement"""
        query = """
        SELECT vm.*, 
               CONCAT(p.name, ' (', p.role, ')') as jockey_name,
               CONCAT('SO-', LPAD(so.id, 6, '0')) as service_order_no, c.name as customer_name, c.plate_no,
               pr.parking_slot, pr.parking_zone, pr.parking_level, pr.fee_status
        FROM vehicle_movements vm
        LEFT JOIN personnel p ON vm.jockey_id = p.id
        LEFT JOIN scheduling_orders so ON vm.service_order_id = so.id
        LEFT JOIN customers c ON so.customer_id = c.id
        LEFT JOIN parking_records pr ON vm.service_order_id = pr.service_order_id 
                                    AND vm.id = pr.vehicle_movement_id
        WHERE vm.id = %s
        """
        result = db.execute_query(query, (movement_id,))
        if result:
            return tuple(result[0].values())
        raise ValueError("Movement not found")
    
    def create_parts_request(self, service_order_id, jockey_id, items):
        """Create a parts request from technician (Car Jockey)
        This will be forwarded to Job Controller and then to Warehouse
        """
        try:
            # First, insert the main parts request record
            query = """
            INSERT INTO parts_requests 
            (service_order_id, requested_by, requested_by_role, status, created_at)
            VALUES (%s, %s, 'technician', 'pending', NOW())
            """
            params = (service_order_id, jockey_id)
            result = db.execute_update(query, params)
            
            if not result['success']:
                raise ValueError("Failed to create parts request")
            
            request_id = result.get('last_id')
            
            # Insert each item in the request
            for item in items:
                item_query = """
                INSERT INTO parts_request_items 
                (parts_request_id, product_id, quantity_requested, created_at)
                VALUES (%s, %s, %s, NOW())
                """
                item_params = (request_id, item['product_id'], item['quantity'])
                item_result = db.execute_update(item_query, item_params)
                
                if not item_result['success']:
                    raise ValueError(f"Failed to add item to request: {item['product_id']}")
            
            # Mark request as sent to job controller
            update_query = """
            UPDATE parts_requests 
            SET status = 'sent-to-jc', updated_at = NOW()
            WHERE id = %s
            """
            db.execute_update(update_query, (request_id,))
            
            return request_id
        except Exception as e:
            raise Exception(f"Error creating parts request: {str(e)}")
