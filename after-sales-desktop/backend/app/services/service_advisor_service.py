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
    
    # ==================== WARRANTY CHECK ====================
    
    def check_warranty_status(self, customer_id, service_type):
        """Check if service falls under warranty"""
        query = """
        SELECT c.id, c.name, c.last_service_date, c.registration_date,
               DATEDIFF(NOW(), c.registration_date) as days_from_registration,
               YEAR(c.registration_date) as registration_year,
               YEAR(NOW()) as current_year
        FROM customers c
        WHERE c.id = %s
        """
        result = db.execute_query(query, (customer_id,))
        
        if not result:
            return {'warranty': False, 'reason': 'Customer not found'}
        
        customer = result[0]
        days_from_reg = customer.get('days_from_registration', 0) or 0
        
        # Warranty rules:
        # - Vehicles within 1 year (365 days) of registration are under manufacturer warranty
        # - Vehicles with scheduled maintenance (PMS) service are covered
        # - Breakdown services are checked separately
        
        is_manufacturer_warranty = days_from_reg <= 365
        is_scheduled_service = service_type == 'PMS'
        is_warranty_service = service_type == 'warranty'
        
        warranty_info = {
            'is_manufacturer_warranty': is_manufacturer_warranty,
            'is_scheduled_service': is_scheduled_service,
            'is_warranty_service': is_warranty_service,
            'warranty': is_manufacturer_warranty or is_warranty_service,
            'warranty_type': 'manufacturer' if is_manufacturer_warranty else ('warranty_claim' if is_warranty_service else 'standard'),
            'registration_date': str(customer.get('registration_date')),
            'days_from_registration': days_from_reg
        }
        
        return warranty_info
    
    # ==================== PARTS AVAILABILITY CHECK ====================
    
    def check_parts_availability(self, vrc_findings):
        """Check parts availability based on VRC findings"""
        # Common parts needed based on VRC checklist failures
        parts_map = {
            'checklist_1_engine_starts': ['Spark Plugs', 'Battery'],
            'checklist_2_idle_smooth': ['Engine Oil', 'Air Filter', 'Fuel Filter'],
            'checklist_3_acceleration': ['Fuel Injector Cleaner', 'Engine Oil'],
            'checklist_4_brakes': ['Brake Pads', 'Brake Fluid'],
            'checklist_5_steering': ['Power Steering Fluid'],
            'checklist_6_lights': ['Light Bulbs', 'Fuses'],
            'checklist_7_air_con': ['AC Refrigerant', 'AC Filter'],
            'checklist_8_wipers': ['Wiper Blades'],
            'checklist_9_horn': ['Horn Assembly'],
            'checklist_10_handbrake': ['Brake Fluid', 'Brake Cables']
        }
        
        required_parts = []
        low_stock_parts = []
        
        # Determine which parts are needed
        for check_item, parts in parts_map.items():
            if vrc_findings.get(check_item) == 'fail':
                required_parts.extend(parts)
        
        # Check warehouse inventory for required parts
        if required_parts:
            unique_parts = list(set(required_parts))
            placeholders = ','.join(['%s'] * len(unique_parts))
            query = f"""
            SELECT id, product_code, product_name, quantity_in_stock, reorder_level, unit_price, status
            FROM warehouse_products
            WHERE product_name IN ({placeholders})
            AND status = 'active'
            """
            
            results = db.execute_query(query, tuple(unique_parts)) or []
            
            parts_availability = []
            for part in results:
                is_in_stock = part.get('quantity_in_stock', 0) > 0
                is_low_stock = part.get('quantity_in_stock', 0) <= part.get('reorder_level', 10)
                
                parts_availability.append({
                    'product_id': part.get('id'),
                    'product_code': part.get('product_code'),
                    'product_name': part.get('product_name'),
                    'quantity_in_stock': part.get('quantity_in_stock', 0),
                    'reorder_level': part.get('reorder_level', 10),
                    'unit_price': part.get('unit_price'),
                    'in_stock': is_in_stock,
                    'low_stock': is_low_stock,
                    'status': part.get('status')
                })
                
                if is_low_stock:
                    low_stock_parts.append(part.get('product_name'))
            
            return {
                'required_parts': unique_parts,
                'parts_availability': parts_availability,
                'all_parts_available': all(p['in_stock'] for p in parts_availability),
                'low_stock_parts': low_stock_parts,
                'needs_special_order': len(low_stock_parts) > 0
            }
        
        return {
            'required_parts': [],
            'parts_availability': [],
            'all_parts_available': True,
            'low_stock_parts': [],
            'needs_special_order': False
        }
    
    def forecast_parts(self, service_order_id, vrc_data):
        """Forecast parts needed based on VRC and service type"""
        vrc_findings = {
            'checklist_1_engine_starts': vrc_data.get('checklist_1_engine_starts', 'na'),
            'checklist_2_idle_smooth': vrc_data.get('checklist_2_idle_smooth', 'na'),
            'checklist_3_acceleration': vrc_data.get('checklist_3_acceleration', 'na'),
            'checklist_4_brakes': vrc_data.get('checklist_4_brakes', 'na'),
            'checklist_5_steering': vrc_data.get('checklist_5_steering', 'na'),
            'checklist_6_lights': vrc_data.get('checklist_6_lights', 'na'),
            'checklist_7_air_con': vrc_data.get('checklist_7_air_con', 'na'),
            'checklist_8_wipers': vrc_data.get('checklist_8_wipers', 'na'),
            'checklist_9_horn': vrc_data.get('checklist_9_horn', 'na'),
            'checklist_10_handbrake': vrc_data.get('checklist_10_handbrake', 'na')
        }
        
        availability = self.check_parts_availability(vrc_findings)
        return availability
    
    # ==================== GENERATE DOCUMENTS ====================
    
    def generate_service_order_document(self, service_order_id):
        """Generate Service Order document (SO)"""
        query = """
        SELECT so.id, c.name, c.contact_no, c.plate_no, c.vehicle_model, 
               so.vehicle_plate_no, so.service_type, so.check_in_time, 
               vrc.mileage_in, sa.name as advisor_name
        FROM service_orders so
        JOIN customers c ON so.customer_id = c.id
        LEFT JOIN vehicle_report_cards vrc ON so.id = vrc.service_order_id
        LEFT JOIN service_advisors sa ON so.advisor_id = sa.id
        WHERE so.id = %s
        """
        result = db.execute_query(query, (service_order_id,))
        
        if result:
            so_data = result[0]
            document = {
                'document_type': 'service-order',
                'so_number': f"SO-{service_order_id}",
                'customer_name': so_data.get('name'),
                'customer_contact': so_data.get('contact_no'),
                'vehicle_plate': so_data.get('plate_no'),
                'vehicle_model': so_data.get('vehicle_model'),
                'service_type': so_data.get('service_type'),
                'check_in_time': so_data.get('check_in_time'),
                'mileage_in': so_data.get('mileage_in'),
                'advisor_name': so_data.get('advisor_name'),
                'generated_at': datetime.now().isoformat()
            }
            return document
        return None
    
    def generate_service_order_confirmation(self, service_order_id):
        """Generate Service Order Confirmation document"""
        query = """
        SELECT so.id, c.name, c.contact_no, so.vehicle_plate_no, 
               so.service_type, so.check_in_time, b.bay_name, t.name as technician_name
        FROM service_orders so
        JOIN customers c ON so.customer_id = c.id
        LEFT JOIN service_bays b ON so.id = b.id
        LEFT JOIN technicians t ON so.id = t.id
        WHERE so.id = %s
        """
        result = db.execute_query(query, (service_order_id,))
        
        if result:
            so_data = result[0]
            document = {
                'document_type': 'confirmation',
                'confirmation_number': f"CONF-{service_order_id}",
                'customer_name': so_data.get('name'),
                'service_type': so_data.get('service_type'),
                'bay_assignment': so_data.get('bay_name', 'TBD'),
                'technician_assignment': so_data.get('technician_name', 'TBD'),
                'estimated_completion': 'To be determined',
                'generated_at': datetime.now().isoformat()
            }
            return document
        return None
    
    def generate_service_picklist(self, service_order_id, parts_list):
        """Generate Service Picklist (parts and materials needed)"""
        document = {
            'document_type': 'picklist',
            'picklist_number': f"PL-{service_order_id}",
            'service_order_id': service_order_id,
            'parts_and_materials': parts_list,
            'total_items': len(parts_list),
            'warehouse_instructions': 'Please pick all items on this list and prepare for service order',
            'generated_at': datetime.now().isoformat()
        }
        return document
    
    def print_service_documents(self, service_order_id, document_types, printed_by):
        """Print all required service documents"""
        printed_documents = []
        
        for doc_type in document_types:
            success = self.log_document_print(service_order_id, doc_type, printed_by)
            if success:
                printed_documents.append({
                    'document_type': doc_type,
                    'status': 'printed',
                    'printed_by': printed_by,
                    'printed_at': datetime.now().isoformat()
                })
        
        return {
            'service_order_id': service_order_id,
            'documents_printed': printed_documents,
            'total_count': len(printed_documents)
        }
