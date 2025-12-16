from database import db
from datetime import datetime

class ServiceAdvisorService:
    """Service Advisor module for customer check-in, diagnosis, and service order creation"""
    
    # ==================== PENDING APPOINTMENTS ====================
    
    def get_pending_appointments(self):
        """Get all pending scheduled appointments"""
        query = """
        SELECT so.id, so.customer_id, c.name, c.contact_no, c.plate_no, c.vehicle_model,
               so.scheduled_date, so.scheduled_time, so.service_type, so.status,
               b.bay_name, t.name as technician_name, sa.name as advisor_name
        FROM scheduling_orders so
        JOIN customers c ON so.customer_id = c.id
        LEFT JOIN service_bays b ON so.bay_id = b.id
        LEFT JOIN technicians t ON so.technician_id = t.id
        LEFT JOIN service_advisors sa ON so.advisor_id = sa.id
        WHERE so.status IN ('scheduled', 'confirmed')
        ORDER BY so.scheduled_date ASC, so.scheduled_time ASC
        """
        results = db.execute_query(query) or []
        return [tuple(r.values()) for r in results]
    
    # ==================== CUSTOMER CHECK-IN ====================
    
    def check_in_customer(self, scheduling_order_id, advisor_id):
        """Mark customer as arrived - time in"""
        query = """
        UPDATE scheduling_orders
        SET status = 'in-progress'
        WHERE id = %s
        """
        result = db.execute_update(query, (scheduling_order_id,))
        
        if result['success']:
            # Create service order from scheduling order
            so = self.get_scheduling_order_details(scheduling_order_id)
            if so:
                service_order_id = self.create_service_order(
                    scheduling_order_id=scheduling_order_id,
                    customer_id=so[0],
                    vehicle_plate_no=so[2],
                    service_type=so[3],
                    advisor_id=advisor_id
                )
                return service_order_id
        
        return None
    
    def get_scheduling_order_details(self, scheduling_order_id):
        """Get scheduling order details"""
        query = """
        SELECT customer_id, id, vehicle_plate_no, service_type
        FROM scheduling_orders
        WHERE id = %s
        """
        result = db.execute_query(query, (scheduling_order_id,))
        if result:
            return tuple(result[0].values())
        return None
    
    # ==================== SERVICE ORDER CREATION ====================
    
    def create_service_order(self, scheduling_order_id, customer_id, vehicle_plate_no, service_type, advisor_id):
        """Create service order from scheduling order or walk-in"""
        query = """
        INSERT INTO service_orders
        (scheduling_order_id, customer_id, vehicle_plate_no, service_type, check_in_time, advisor_id, status)
        VALUES (%s, %s, %s, %s, NOW(), %s, 'pending')
        """
        params = (scheduling_order_id, customer_id, vehicle_plate_no, service_type, advisor_id)
        result = db.execute_update(query, params)
        return result.get('last_id') if result['success'] else None
    
    def get_service_order(self, service_order_id):
        """Get service order details"""
        query = """
        SELECT id, customer_id, vehicle_plate_no, service_type, check_in_time, advisor_id, status
        FROM service_orders
        WHERE id = %s
        """
        result = db.execute_query(query, (service_order_id,))
        if result:
            return tuple(result[0].values())
        return None
    
    def get_pending_service_orders(self):
        """Get all pending service orders"""
        query = """
        SELECT so.id, so.customer_id, c.name, c.contact_no, c.plate_no, 
               so.vehicle_plate_no, so.service_type, so.check_in_time, so.status
        FROM service_orders so
        JOIN customers c ON so.customer_id = c.id
        WHERE so.status = 'pending'
        ORDER BY so.check_in_time DESC
        """
        results = db.execute_query(query) or []
        return [tuple(r.values()) for r in results]
    
    # ==================== CUSTOMER INFO SHEET (CIS) ====================
    
    def create_or_update_cis(self, service_order_id, customer_id, cis_data):
        """Create or update Customer Info Sheet"""
        # Check if CIS exists
        check_query = "SELECT id FROM customer_info_sheets WHERE service_order_id = %s"
        existing = db.execute_query(check_query, (service_order_id,))
        
        if existing:
            # Update
            query = """
            UPDATE customer_info_sheets
            SET name = %s, contact_no = %s, email = %s, address = %s, 
                vehicle_plate_no = %s, vehicle_model = %s, vehicle_year = %s,
                engine_no = %s, chassis_no = %s, mileage_in = %s, 
                service_type = %s, notes = %s, updated_at = NOW()
            WHERE service_order_id = %s
            """
            params = (
                cis_data.get('name'),
                cis_data.get('contact_no'),
                cis_data.get('email'),
                cis_data.get('address'),
                cis_data.get('vehicle_plate_no'),
                cis_data.get('vehicle_model'),
                cis_data.get('vehicle_year'),
                cis_data.get('engine_no'),
                cis_data.get('chassis_no'),
                cis_data.get('mileage_in'),
                cis_data.get('service_type'),
                cis_data.get('notes'),
                service_order_id
            )
            result = db.execute_update(query, params)
            return result['success']
        else:
            # Create
            query = """
            INSERT INTO customer_info_sheets
            (service_order_id, customer_id, name, contact_no, email, address,
             vehicle_plate_no, vehicle_model, vehicle_year, engine_no, chassis_no,
             mileage_in, service_type, notes, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            params = (
                service_order_id,
                customer_id,
                cis_data.get('name'),
                cis_data.get('contact_no'),
                cis_data.get('email'),
                cis_data.get('address'),
                cis_data.get('vehicle_plate_no'),
                cis_data.get('vehicle_model'),
                cis_data.get('vehicle_year'),
                cis_data.get('engine_no'),
                cis_data.get('chassis_no'),
                cis_data.get('mileage_in'),
                cis_data.get('service_type'),
                cis_data.get('notes'),
                cis_data.get('created_by', 'SYSTEM')
            )
            result = db.execute_update(query, params)
            return result['success']
    
    def get_cis(self, service_order_id):
        """Get Customer Info Sheet"""
        query = """
        SELECT * FROM customer_info_sheets WHERE service_order_id = %s
        """
        result = db.execute_query(query, (service_order_id,))
        if result:
            return result[0]
        return None
    
    # ==================== VEHICLE REPORT CARD (VRC) ====================
    
    def create_or_update_vrc(self, service_order_id, customer_id, vrc_data):
        """Create or update Vehicle Report Card with 10-point diagnosis"""
        # Check if VRC exists
        check_query = "SELECT id FROM vehicle_report_cards WHERE service_order_id = %s"
        existing = db.execute_query(check_query, (service_order_id,))
        
        if existing:
            # Update
            query = """
            UPDATE vehicle_report_cards
            SET mileage_in = %s, mileage_out = %s, exterior_condition = %s, interior_condition = %s,
                checklist_1_engine_starts = %s, checklist_2_idle_smooth = %s, checklist_3_acceleration = %s,
                checklist_4_brakes = %s, checklist_5_steering = %s, checklist_6_lights = %s,
                checklist_7_air_con = %s, checklist_8_wipers = %s, checklist_9_horn = %s,
                checklist_10_handbrake = %s, additional_findings = %s, settings_restored = %s,
                diagnosis_completed_by = %s, diagnosis_date = NOW(), updated_at = NOW()
            WHERE service_order_id = %s
            """
            params = (
                vrc_data.get('mileage_in'),
                vrc_data.get('mileage_out'),
                vrc_data.get('exterior_condition'),
                vrc_data.get('interior_condition'),
                vrc_data.get('checklist_1_engine_starts'),
                vrc_data.get('checklist_2_idle_smooth'),
                vrc_data.get('checklist_3_acceleration'),
                vrc_data.get('checklist_4_brakes'),
                vrc_data.get('checklist_5_steering'),
                vrc_data.get('checklist_6_lights'),
                vrc_data.get('checklist_7_air_con'),
                vrc_data.get('checklist_8_wipers'),
                vrc_data.get('checklist_9_horn'),
                vrc_data.get('checklist_10_handbrake'),
                vrc_data.get('additional_findings'),
                vrc_data.get('settings_restored', False),
                vrc_data.get('diagnosis_completed_by'),
                service_order_id
            )
            result = db.execute_update(query, params)
            return result['success']
        else:
            # Create
            query = """
            INSERT INTO vehicle_report_cards
            (service_order_id, customer_id, mileage_in, mileage_out, exterior_condition, interior_condition,
             checklist_1_engine_starts, checklist_2_idle_smooth, checklist_3_acceleration,
             checklist_4_brakes, checklist_5_steering, checklist_6_lights,
             checklist_7_air_con, checklist_8_wipers, checklist_9_horn,
             checklist_10_handbrake, additional_findings, settings_restored,
             diagnosis_completed_by, diagnosis_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """
            params = (
                service_order_id,
                customer_id,
                vrc_data.get('mileage_in'),
                vrc_data.get('mileage_out'),
                vrc_data.get('exterior_condition'),
                vrc_data.get('interior_condition'),
                vrc_data.get('checklist_1_engine_starts'),
                vrc_data.get('checklist_2_idle_smooth'),
                vrc_data.get('checklist_3_acceleration'),
                vrc_data.get('checklist_4_brakes'),
                vrc_data.get('checklist_5_steering'),
                vrc_data.get('checklist_6_lights'),
                vrc_data.get('checklist_7_air_con'),
                vrc_data.get('checklist_8_wipers'),
                vrc_data.get('checklist_9_horn'),
                vrc_data.get('checklist_10_handbrake'),
                vrc_data.get('additional_findings'),
                vrc_data.get('settings_restored', False),
                vrc_data.get('diagnosis_completed_by')
            )
            result = db.execute_update(query, params)
            return result['success']
    
    def get_vrc(self, service_order_id):
        """Get Vehicle Report Card"""
        query = """
        SELECT * FROM vehicle_report_cards WHERE service_order_id = %s
        """
        result = db.execute_query(query, (service_order_id,))
        if result:
            return result[0]
        return None
    
    # ==================== DOCUMENT MANAGEMENT ====================
    
    def log_document_print(self, service_order_id, document_type, printed_by):
        """Log document printing"""
        query = """
        INSERT INTO service_order_documents
        (service_order_id, document_type, printed_at, printed_by)
        VALUES (%s, %s, NOW(), %s)
        """
        params = (service_order_id, document_type, printed_by)
        result = db.execute_update(query, params)
        return result['success']
    
    def get_service_order_documents(self, service_order_id):
        """Get all documents for a service order"""
        query = """
        SELECT id, document_type, printed_at, printed_by
        FROM service_order_documents
        WHERE service_order_id = %s
        ORDER BY created_at DESC
        """
        results = db.execute_query(query, (service_order_id,)) or []
        return [tuple(r.values()) for r in results]
