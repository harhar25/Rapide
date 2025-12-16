from database import db
from datetime import datetime, timedelta

class CustomerService:
    """Customer management service"""
    
    def get_pms_due_customers(self):
        """Get customers due for PMS"""
        query = """
        SELECT c.id, c.name, c.contact_no, c.plate_no, c.vehicle_model,
               c.last_service_date, c.pms_interval_months,
               DATEDIFF(NOW(), c.last_service_date) as days_since_service
        FROM customers c
        WHERE c.status = 'active'
        AND DATEDIFF(NOW(), c.last_service_date) >= (c.pms_interval_months * 30)
        ORDER BY c.last_service_date ASC
        """
        return db.execute_query(query) or []
    
    def search_customer(self, search_type, search_value):
        """Search customer by plate, name, or contact"""
        if search_type == 'plate':
            query = "SELECT * FROM customers WHERE plate_no LIKE %s AND status = 'active'"
            params = (f"%{search_value}%",)
        elif search_type == 'name':
            query = "SELECT * FROM customers WHERE name LIKE %s AND status = 'active'"
            params = (f"%{search_value}%",)
        elif search_type == 'contact':
            query = "SELECT * FROM customers WHERE contact_no LIKE %s AND status = 'active'"
            params = (f"%{search_value}%",)
        else:
            return None
        
        result = db.execute_query(query, params)
        return result if result else []
    
    def create_customer(self, customer_data):
        """Register a new walk-in customer"""
        query = """
        INSERT INTO customers
        (name, contact_no, plate_no, vehicle_model, customer_type, status, created_at)
        VALUES (%s, %s, %s, %s, %s, 'active', NOW())
        """
        
        params = (
            customer_data.get('name'),
            customer_data.get('contact_no'),
            customer_data.get('plate_no'),
            customer_data.get('vehicle_model'),
            customer_data.get('customer_type', 'walk-in')
        )
        
        result = db.execute_update(query, params)
        return result.get('last_id') if result['success'] else None
    
    def get_customer(self, customer_id):
        """Get customer details"""
        query = "SELECT * FROM customers WHERE id = %s"
        result = db.execute_query(query, (customer_id,))
        return result[0] if result else None
    
    def update_customer(self, customer_id, customer_data):
        """Update customer information"""
        query = """
        UPDATE customers
        SET name = %s, contact_no = %s, vehicle_model = %s
        WHERE id = %s
        """
        
        params = (
            customer_data.get('name'),
            customer_data.get('contact_no'),
            customer_data.get('vehicle_model'),
            customer_id
        )
        
        result = db.execute_update(query, params)
        return result['success']


class SchedulingService:
    """Scheduling and availability management service"""
    
    def check_availability(self, date, time):
        """Check bay, technician, and SA availability"""
        availability = {
            'available_bays': self._get_available_bays(date, time),
            'available_technicians': self._get_available_technicians(date, time),
            'available_advisors': self._get_available_advisors(date, time)
        }
        return availability
    
    def _get_available_bays(self, date, time):
        """Get available service bays"""
        query = """
        SELECT sb.id, sb.bay_name, sb.capacity, sb.status
        FROM service_bays sb
        WHERE sb.status = 'active'
        AND sb.id NOT IN (
            SELECT bay_id FROM scheduling_orders 
            WHERE scheduled_date = %s 
            AND CAST(scheduled_time AS TIME) = %s
            AND status NOT IN ('cancelled', 'completed')
        )
        """
        return db.execute_query(query, (date, time)) or []
    
    def _get_available_technicians(self, date, time):
        """Get available technicians"""
        query = """
        SELECT t.id, t.name, t.specialization
        FROM technicians t
        WHERE t.status = 'active'
        AND t.id NOT IN (
            SELECT technician_id FROM scheduling_orders
            WHERE scheduled_date = %s
            AND CAST(scheduled_time AS TIME) = %s
            AND status NOT IN ('cancelled', 'completed')
        )
        """
        return db.execute_query(query, (date, time)) or []
    
    def _get_available_advisors(self, date, time):
        """Get available service advisors"""
        query = """
        SELECT sa.id, sa.name
        FROM service_advisors sa
        WHERE sa.status = 'active'
        AND sa.id NOT IN (
            SELECT advisor_id FROM scheduling_orders
            WHERE scheduled_date = %s
            AND CAST(scheduled_time AS TIME) = %s
            AND status NOT IN ('cancelled', 'completed')
        )
        """
        return db.execute_query(query, (date, time)) or []
    
    def create_scheduling_order(self, order_data):
        """Create a scheduling order"""
        query = """
        INSERT INTO scheduling_orders
        (customer_id, scheduled_date, scheduled_time, bay_id, technician_id, 
         advisor_id, service_type, status, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'scheduled', NOW())
        """
        
        params = (
            order_data.get('customer_id'),
            order_data.get('scheduled_date'),
            order_data.get('scheduled_time'),
            order_data.get('bay_id'),
            order_data.get('technician_id'),
            order_data.get('advisor_id'),
            order_data.get('service_type', 'PMS')
        )
        
        result = db.execute_update(query, params)
        return result['last_id'] if result['success'] else None
    
    def log_contact_attempt(self, attempt_data):
        """Log customer contact attempt"""
        query = """
        INSERT INTO contact_attempts
        (customer_id, contact_type, attempt_date, status, notes, created_by)
        VALUES (%s, %s, NOW(), %s, %s, %s)
        """
        
        params = (
            attempt_data.get('customer_id'),
            attempt_data.get('contact_type'),  # 'call', 'sms', 'email'
            attempt_data.get('status'),  # 'attempted', 'connected', 'confirmed', 'not_available'
            attempt_data.get('notes'),
            attempt_data.get('created_by')
        )
        
        result = db.execute_update(query, params)
        return {'success': result['success'], 'attempt_id': result.get('last_id')}
    
    def get_scheduling_order(self, order_id):
        """Get scheduling order details"""
        query = """
        SELECT so.*, c.name, c.contact_no, c.plate_no, c.vehicle_model,
               sb.bay_name, t.name as technician_name, sa.name as advisor_name
        FROM scheduling_orders so
        JOIN customers c ON so.customer_id = c.id
        LEFT JOIN service_bays sb ON so.bay_id = sb.id
        LEFT JOIN technicians t ON so.technician_id = t.id
        LEFT JOIN service_advisors sa ON so.advisor_id = sa.id
        WHERE so.id = %s
        """
        result = db.execute_query(query, (order_id,))
        return result[0] if result else None
