from database import db

class CustomerService:
    """Customer management service"""
    
    def get_pms_due_customers(self):
        """Get all customers due for PMS"""
        query = """
        SELECT c.id, c.name, c.plate_no, c.contact_no, c.vehicle_model,
               c.last_service_date, DATEDIFF(CURDATE(), c.last_service_date) as days_since_service
        FROM customers c
        WHERE c.last_service_date IS NOT NULL
        AND DATEDIFF(CURDATE(), c.last_service_date) >= c.service_interval_days
        ORDER BY c.last_service_date ASC
        """
        return db.execute_query(query) or []
    
    def search_customer(self, search_type, search_value):
        """Search customer by plate, name, or contact"""
        if search_type == 'plate':
            query = "SELECT * FROM customers WHERE plate_no LIKE %s"
        elif search_type == 'name':
            query = "SELECT * FROM customers WHERE name LIKE %s"
        elif search_type == 'contact':
            query = "SELECT * FROM customers WHERE contact_no LIKE %s"
        else:
            return None
        
        search_pattern = f"%{search_value}%"
        return db.execute_query(query, (search_pattern,)) or []
    
    def get_customer_by_id(self, customer_id):
        """Get customer details by ID"""
        query = "SELECT * FROM customers WHERE id = %s"
        result = db.execute_query(query, (customer_id,))
        return result[0] if result else None
    
    def create_customer(self, customer_data):
        """Create a new customer (walk-in registration)"""
        query = """
        INSERT INTO customers 
        (name, contact_no, plate_no, vehicle_model, vehicle_year, engine_no, chassis_no,
         customer_type, address, city, email, service_interval_days)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        params = (
            customer_data.get('name'),
            customer_data.get('contact_no'),
            customer_data.get('plate_no'),
            customer_data.get('vehicle_model'),
            customer_data.get('vehicle_year'),
            customer_data.get('engine_no'),
            customer_data.get('chassis_no'),
            'walk-in',
            customer_data.get('address'),
            customer_data.get('city'),
            customer_data.get('email'),
            customer_data.get('service_interval_days', 10000)  # Default interval
        )
        
        result = db.execute_update(query, params)
        return result['last_id'] if result['success'] else None
    
    def update_customer(self, customer_id, customer_data):
        """Update customer information"""
        query = """
        UPDATE customers
        SET name = %s, contact_no = %s, email = %s, address = %s, city = %s
        WHERE id = %s
        """
        
        params = (
            customer_data.get('name'),
            customer_data.get('contact_no'),
            customer_data.get('email'),
            customer_data.get('address'),
            customer_data.get('city'),
            customer_id
        )
        
        result = db.execute_update(query, params)
        return result['success']
