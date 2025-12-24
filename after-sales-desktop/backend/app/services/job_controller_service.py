from database import db
from datetime import datetime, timedelta

class JobControllerService:
    """Job Controller module for technician assignment and labor tracking"""

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

    def _ensure_technicians_from_personnel(self):
        db.execute_update(
            """
            INSERT INTO technicians (name, employee_id, email, status, hire_date, created_at)
            SELECT p.name, p.username, p.email, 'active', NULL, NOW()
            FROM personnel p
            WHERE p.role = 'technician' AND p.status = 'active'
              AND NOT EXISTS (
                SELECT 1 FROM technicians t WHERE t.employee_id = p.username
              )
            """
        )

        db.execute_update(
            """
            UPDATE technicians t
            JOIN personnel p ON p.username = t.employee_id
            SET t.status = CASE WHEN p.status = 'active' THEN 'active' ELSE 'inactive' END,
                t.name = p.name,
                t.email = COALESCE(p.email, t.email)
            WHERE p.role = 'technician'
            """
        )
    
    # ==================== VIEW SERVICE ORDERS ====================
    
    def get_pending_service_orders(self):
        """Get all service orders ready for technician assignment"""
        query = """
        SELECT so.id, c.name, c.contact_no, so.vehicle_plate_no, so.service_type,
               so.check_in_time, so.status, so.estimated_completion_time,
               COUNT(ta.id) as assigned_count
        FROM service_orders so
        JOIN customers c ON so.customer_id = c.id
        LEFT JOIN technician_assignments ta ON so.id = ta.service_order_id
        WHERE so.status IN ('pending', 'in-progress')
        GROUP BY so.id
        ORDER BY so.check_in_time ASC
        """
        results = db.execute_query(query) or []
        return [tuple(r.values()) for r in results]
    
    def get_active_service_orders(self):
        """Get all service orders with active technician assignments"""
        query = """
        SELECT so.id, c.name, so.vehicle_plate_no, so.service_type,
               t.name as technician_name, ta.status, ta.clock_in_time,
               ta.labor_hours, so.estimated_completion_time, ta.id as assignment_id
        FROM service_orders so
        JOIN customers c ON so.customer_id = c.id
        JOIN technician_assignments ta ON so.id = ta.service_order_id
        JOIN technicians t ON ta.technician_id = t.id
        WHERE ta.status IN ('assigned', 'in-progress')
        ORDER BY ta.clock_in_time DESC
        """
        results = db.execute_query(query) or []
        return [tuple(r.values()) for r in results]
    
    # ==================== TECHNICIAN ASSIGNMENT ====================
    
    def assign_technician_to_order(self, service_order_id, technician_id, assigned_by):
        """Assign technician to service order"""
        # Check if already assigned
        check_query = """
        SELECT id FROM technician_assignments 
        WHERE service_order_id = %s AND technician_id = %s AND status != 'completed'
        """
        existing = db.execute_query(check_query, (service_order_id, technician_id))
        
        if existing:
            return None  # Already assigned
        
        query = """
        INSERT INTO technician_assignments
        (service_order_id, technician_id, assigned_by, status)
        VALUES (%s, %s, %s, 'assigned')
        """
        params = (service_order_id, technician_id, assigned_by)
        result = db.execute_update(query, params)
        return result.get('last_id') if result['success'] else None
    
    def get_assignments_for_so(self, service_order_id):
        """Get all technician assignments for a service order"""
        query = """
        SELECT ta.id, ta.service_order_id, ta.technician_id, t.name, ta.status,
               ta.clock_in_time, ta.clock_out_time, ta.labor_hours, ta.assigned_at
        FROM technician_assignments ta
        JOIN technicians t ON ta.technician_id = t.id
        WHERE ta.service_order_id = %s
        ORDER BY ta.assigned_at DESC
        """
        results = db.execute_query(query, (service_order_id,)) or []
        return [tuple(r.values()) for r in results]
    
    # ==================== TECHNICIAN CLOCK IN/OUT ====================
    
    def clock_in_technician(self, assignment_id):
        """Clock in technician - start work"""
        query = """
        UPDATE technician_assignments
        SET clock_in_time = NOW(), status = 'in-progress'
        WHERE id = %s
        """
        result = db.execute_update(query, (assignment_id,))
        
        if result['success']:
            # Log clock record
            assignment = self.get_assignment_details(assignment_id)
            if assignment:
                self.log_clock_record(assignment[0], assignment[1], assignment[2], 'clock-in')
        
        return result['success']
    
    def clock_out_technician(self, assignment_id):
        """Clock out technician - end work, calculate labor hours"""
        query = """
        UPDATE technician_assignments
        SET clock_out_time = NOW(), status = 'completed',
            labor_hours = TIMESTAMPDIFF(HOUR, clock_in_time, NOW())
        WHERE id = %s
        """
        result = db.execute_update(query, (assignment_id,))
        
        if result['success']:
            assignment = self.get_assignment_details(assignment_id)
            if assignment:
                self.log_clock_record(assignment[0], assignment[1], assignment[2], 'clock-out')
        
        return result['success']
    
    def get_assignment_details(self, assignment_id):
        """Get assignment details"""
        query = """
        SELECT service_order_id, technician_id, id FROM technician_assignments WHERE id = %s
        """
        result = db.execute_query(query, (assignment_id,))
        if result:
            return tuple(result[0].values())
        return None
    
    # ==================== CLOCK RECORDS ====================
    
    def log_clock_record(self, service_order_id, technician_id, assignment_id, action):
        """Log clock in/out record"""
        query = """
        INSERT INTO job_clock_records
        (assignment_id, service_order_id, technician_id, clock_in_time, status)
        VALUES (%s, %s, %s, NOW(), %s)
        """
        params = (assignment_id, service_order_id, technician_id, 'clocked-in' if action == 'clock-in' else 'clocked-out')
        result = db.execute_update(query, params)
        return result['success']
    
    def get_clock_records(self, technician_id, days=7):
        """Get clock records for technician (last N days)"""
        query = """
        SELECT jcr.id, jcr.service_order_id, so.vehicle_plate_no, jcr.clock_in_time,
               jcr.clock_out_time, jcr.duration_minutes, jcr.actual_work_minutes, jcr.status
        FROM job_clock_records jcr
        JOIN service_orders so ON jcr.service_order_id = so.id
        WHERE jcr.technician_id = %s
        AND jcr.clock_in_time >= DATE_SUB(NOW(), INTERVAL %s DAY)
        ORDER BY jcr.clock_in_time DESC
        """
        results = db.execute_query(query, (technician_id, days)) or []
        return [tuple(r.values()) for r in results]
    
    # ==================== TECHNICIAN AVAILABILITY ====================
    
    def get_available_technicians(self):
        """Get list of available technicians"""
        self._ensure_technicians_from_personnel()
        query = """
        SELECT t.id, t.name, t.specialization, t.status,
               COUNT(DISTINCT ta.service_order_id) as current_jobs,
               GROUP_CONCAT(tr.resource_name SEPARATOR ', ') as skills
        FROM technicians t
        LEFT JOIN technician_assignments ta ON t.id = ta.technician_id AND ta.status IN ('assigned', 'in-progress')
        LEFT JOIN technician_resources tr ON t.id = tr.technician_id AND tr.resource_type = 'skill' AND tr.status = 'active'
        WHERE t.status = 'active'
        GROUP BY t.id
        ORDER BY current_jobs ASC, t.name ASC
        """
        results = db.execute_query(query) or []
        return [tuple(r.values()) for r in results]
    
    def add_technician_skill(self, technician_id, skill_name, verified_by):
        """Add skill to technician"""
        query = """
        INSERT INTO technician_resources
        (technician_id, resource_type, resource_name, status, verified_by, verified_date)
        VALUES (%s, 'skill', %s, 'active', %s, NOW())
        ON DUPLICATE KEY UPDATE status = 'active'
        """
        params = (technician_id, skill_name, verified_by)
        result = db.execute_update(query, params)
        return result['success']
    
    def get_technician_skills(self, technician_id):
        """Get all skills for technician"""
        query = """
        SELECT id, resource_name, status FROM technician_resources
        WHERE technician_id = %s AND resource_type = 'skill'
        ORDER BY resource_name ASC
        """
        results = db.execute_query(query, (technician_id,)) or []
        return [tuple(r.values()) for r in results]
    
    # ==================== LABOR TRACKING ====================
    
    def get_technician_labor_summary(self, technician_id, start_date, end_date):
        """Get labor hours summary for technician"""
        query = """
        SELECT 
            COUNT(DISTINCT ta.service_order_id) as jobs_completed,
            SUM(TIMESTAMPDIFF(HOUR, ta.clock_in_time, ta.clock_out_time)) as total_hours,
            AVG(TIMESTAMPDIFF(HOUR, ta.clock_in_time, ta.clock_out_time)) as avg_hours_per_job,
            MIN(ta.clock_in_time) as first_clock_in,
            MAX(ta.clock_out_time) as last_clock_out
        FROM technician_assignments ta
        WHERE ta.technician_id = %s
        AND ta.clock_in_time >= %s
        AND ta.clock_out_time <= %s
        AND ta.status = 'completed'
        """
        result = db.execute_query(query, (technician_id, start_date, end_date))
        if result:
            return result[0]
        return None
    
    def get_service_order_status(self, service_order_id):
        """Get current status of service order with assignment details"""
        query = """
        SELECT so.id, so.vehicle_plate_no, so.service_type, so.status,
               t.name as technician_name, ta.clock_in_time, ta.clock_out_time,
               ta.labor_hours, ta.status as assignment_status
        FROM service_orders so
        LEFT JOIN technician_assignments ta ON so.id = ta.service_order_id
        LEFT JOIN technicians t ON ta.technician_id = t.id
        WHERE so.id = %s
        """
        result = db.execute_query(query, (service_order_id,))
        if result:
            return result[0]
        return None
    
    # ==================== PROCESS 3.1: TECHNICIAN ASSIGNMENT WITH SKILLS ====================
    
    def get_technician_availability_with_skills(self):
        """Get available technicians with detailed skills and workload (Process 3.1)"""
        query = """
        SELECT t.id, t.name, t.specialization, t.status, t.contact_no, t.email,
               COUNT(DISTINCT ta.service_order_id) as current_job_count,
               GROUP_CONCAT(DISTINCT tr.resource_name SEPARATOR ', ') as skills,
               COALESCE(SUM(CASE WHEN ta.status IN ('assigned', 'in-progress') THEN 1 ELSE 0 END), 0) as active_jobs,
               GROUP_CONCAT(DISTINCT tr.resource_value SEPARATOR ', ') as certifications
        FROM technicians t
        LEFT JOIN technician_assignments ta ON t.id = ta.technician_id AND ta.status IN ('assigned', 'in-progress')
        LEFT JOIN technician_resources tr ON t.id = tr.technician_id AND tr.status = 'active'
        WHERE t.status = 'active'
        GROUP BY t.id
        ORDER BY active_jobs ASC, t.name ASC
        """
        results = db.execute_query(query) or []
        return results
    
    def get_technician_with_skill_match(self, required_skills=None):
        """Get technicians filtered by required skills (Process 3.1 - Skills Matching)"""
        query = """
        SELECT t.id, t.name, t.specialization, t.status,
               COUNT(DISTINCT ta.service_order_id) as current_job_count,
               GROUP_CONCAT(DISTINCT tr.resource_name SEPARATOR ', ') as matched_skills,
               COUNT(DISTINCT tr.id) as skill_count
        FROM technicians t
        LEFT JOIN technician_assignments ta ON t.id = ta.technician_id AND ta.status IN ('assigned', 'in-progress')
        LEFT JOIN technician_resources tr ON t.id = tr.technician_id AND tr.resource_type = 'skill'
        WHERE t.status = 'active'
        """
        
        if required_skills and len(required_skills) > 0:
            placeholders = ','.join(['%s'] * len(required_skills))
            query += f" AND tr.resource_name IN ({placeholders})"
            results = db.execute_query(query + " GROUP BY t.id ORDER BY current_job_count ASC", tuple(required_skills))
        else:
            results = db.execute_query(query + " GROUP BY t.id ORDER BY current_job_count ASC")
        
        return results or []
    
    def assign_technician_with_confirmation(self, service_order_id, technician_id, assigned_by, assignment_notes=None):
        """Assign technician with timestamp confirmation (Process 3.1 - Enhanced)"""
        # Get SO details
        so_query = "SELECT customer_id, vehicle_plate_no FROM service_orders WHERE id = %s"
        so_result = db.execute_query(so_query, (service_order_id,))
        if not so_result:
            return {'success': False, 'error': 'Service order not found'}
        
        # Assign
        assign_query = """
        INSERT INTO technician_assignments
        (service_order_id, technician_id, assigned_by, status, notes, assigned_at)
        VALUES (%s, %s, %s, 'assigned', %s, NOW())
        """
        result = db.execute_update(assign_query, (service_order_id, technician_id, assigned_by, assignment_notes))
        
        if result['success']:
            assignment_id = result.get('last_id')
            return {
                'success': True,
                'assignment_id': assignment_id,
                'timestamp': datetime.now().isoformat(),
                'assigned_by': assigned_by
            }
        
        return {'success': False, 'error': 'Assignment failed'}
    
    # ==================== PROCESS 4.1: PARTS REQUEST ====================
    
    def get_digital_service_picklist(self, service_order_id):
        """Get digital service picklist for technician (Process 4.1)"""
        query = """
        SELECT sod.id, sod.document_type, sod.file_name, sod.document_data,
               so.vehicle_plate_no, so.service_type, c.name as customer_name,
               vrc.checklist_1_engine_starts, vrc.checklist_2_idle_smooth,
               vrc.checklist_3_acceleration, vrc.checklist_4_brakes,
               vrc.checklist_5_steering, vrc.checklist_6_lights,
               vrc.checklist_7_air_con, vrc.checklist_8_wipers,
               vrc.checklist_9_horn, vrc.checklist_10_handbrake
        FROM service_order_documents sod
        JOIN service_orders so ON sod.service_order_id = so.id
        LEFT JOIN customers c ON so.customer_id = c.id
        LEFT JOIN vehicle_report_cards vrc ON so.id = vrc.service_order_id
        WHERE sod.service_order_id = %s AND sod.document_type = 'picklist'
        ORDER BY sod.created_at DESC
        LIMIT 1
        """
        result = db.execute_query(query, (service_order_id,))
        if result:
            return result[0]
        return None
    
    def request_parts_from_warehouse(self, service_order_id, technician_id, requested_parts, notes=None):
        """Technician requests parts from warehouse (Process 4.1)"""
        self.ensure_parts_requests_table()
        import json

        query = """
        INSERT INTO parts_requests
        (service_order_id, technician_id, requested_parts, notes, status, created_at)
        VALUES (%s, %s, %s, %s, 'pending', NOW())
        """

        result = db.execute_update(
            query,
            (service_order_id, technician_id, json.dumps(requested_parts), notes),
        )

        if result['success']:
            return {
                'success': True,
                'request_id': result.get('last_id'),
                'status': 'pending',
                'timestamp': datetime.now().isoformat()
            }

        return {'success': False, 'error': 'Parts request failed'}
    
    def get_parts_request_status(self, service_order_id):
        """Get status of parts request (Process 4.1 - Tracking)"""
        self.ensure_parts_requests_table()
        query = """
        SELECT id, service_order_id, technician_id, requested_parts, notes, status, created_at
        FROM parts_requests
        WHERE service_order_id = %s
        ORDER BY created_at DESC
        LIMIT 1
        """
        result = db.execute_query(query, (service_order_id,))
        if result:
            return result[0]
        return None
    
    # ==================== PROCESS 4.2: PARTS WAREHOUSE ISSUANCE ====================
    
    def prepare_parts_for_issuance(self, service_order_id, parts_list, prepared_by):
        """Warehouse prepares parts for issuance (Process 4.2)"""
        # Update picklist status to 'Ready for Release'
        query = """
        INSERT INTO service_order_documents
        (service_order_id, document_type, document_data, printed_by, created_at)
        VALUES (%s, 'parts-ready', %s, %s, NOW())
        """
        
        import json
        ready_data = json.dumps({
            'parts_prepared': parts_list,
            'prepared_by': prepared_by,
            'status': 'ready_for_release',
            'prepared_at': datetime.now().isoformat()
        })
        
        result = db.execute_update(query, (service_order_id, ready_data, prepared_by))
        
        if result['success']:
            return {
                'success': True,
                'status': 'ready_for_release',
                'timestamp': datetime.now().isoformat(),
                'prepared_by': prepared_by
            }
        
        return {'success': False, 'error': 'Failed to prepare parts'}
    
    def issue_parts_with_signature(self, service_order_id, technician_id, parts_issued, signature_data, issued_by):
        """Issue parts with digital signature capture (Process 4.2 - Digital Signature)"""
        # Log parts issuance
        query = """
        INSERT INTO service_order_documents
        (service_order_id, document_type, document_data, printed_by, created_at)
        VALUES (%s, 'parts-issued', %s, %s, NOW())
        """
        
        import json
        issued_data = json.dumps({
            'technician_id': technician_id,
            'parts_issued': parts_issued,
            'signature': signature_data,
            'issued_by': issued_by,
            'status': 'issued',
            'issued_at': datetime.now().isoformat()
        })
        
        result = db.execute_update(query, (service_order_id, issued_data, issued_by))
        
        if result['success']:
            # Adjust inventory for each issued part
            for part in parts_issued:
                self.adjust_inventory_for_parts_issued(
                    part.get('product_id'),
                    part.get('quantity'),
                    service_order_id,
                    technician_id
                )
            
            return {
                'success': True,
                'status': 'parts_issued',
                'timestamp': datetime.now().isoformat(),
                'signature_captured': True
            }
        
        return {'success': False, 'error': 'Failed to issue parts'}
    
    def adjust_inventory_for_parts_issued(self, product_id, quantity, service_order_id, technician_id):
        """Automatically adjust inventory when parts are issued (Process 4.2 - Auto Adjustment)"""
        from app.services.warehouse_service import WarehouseService
        warehouse_service = WarehouseService()
        
        try:
            warehouse_service.remove_inventory(
                product_id=product_id,
                quantity=quantity,
                reference_no=f"SO-{service_order_id}-TECH-{technician_id}",
                reference_type='repair-job',
                notes=f"Parts issued for service order {service_order_id}",
                created_by=f"TECH-{technician_id}"
            )
            return True
        except Exception as e:
            print(f"Inventory adjustment error: {str(e)}")
            return False
    
    def get_parts_issued_confirmation(self, service_order_id):
        """Get parts issuance confirmation details (Process 4.2 - Confirmation)"""
        query = """
        SELECT id, document_type, document_data, printed_by, created_at
        FROM service_order_documents
        WHERE service_order_id = %s AND document_type = 'parts-issued'
        ORDER BY created_at DESC
        LIMIT 1
        """
        result = db.execute_query(query, (service_order_id,))
        if result:
            return result[0]
        return None
    
    # ==================== PROCESS 4.3: SERVICE EXECUTION ====================
    
    def request_additional_repair_approval(self, service_order_id, technician_id, repair_description, estimated_cost, urgent=False):
        """Technician requests additional repair approval from SA (Process 4.3 - Alert)"""
        query = """
        INSERT INTO service_order_documents
        (service_order_id, document_type, document_data, printed_by, created_at)
        VALUES (%s, 'repair-request', %s, %s, NOW())
        """
        
        import json
        request_data = json.dumps({
            'technician_id': technician_id,
            'repair_description': repair_description,
            'estimated_cost': estimated_cost,
            'urgent': urgent,
            'status': 'pending_approval',
            'requested_at': datetime.now().isoformat()
        })
        
        result = db.execute_update(query, (service_order_id, request_data, f"TECH-{technician_id}"))
        
        if result['success']:
            return {
                'success': True,
                'request_id': result.get('last_id'),
                'status': 'pending_approval',
                'urgent': urgent,
                'timestamp': datetime.now().isoformat()
            }
        
        return {'success': False, 'error': 'Failed to request repair approval'}
    
    def get_pending_repair_approvals(self, service_order_id):
        """Get pending repair approval requests (Process 4.3 - SA View)"""
        query = """
        SELECT id, document_type, document_data, printed_by, created_at
        FROM service_order_documents
        WHERE service_order_id = %s AND document_type = 'repair-request' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY created_at DESC
        """
        results = db.execute_query(query, (service_order_id,)) or []
        return results
    
    def approve_additional_repair(self, service_order_id, repair_request_id, approved_by, approval_notes=None):
        """SA approves additional repair (Process 4.3 - Approval)"""
        # Log approval
        query = """
        INSERT INTO service_order_documents
        (service_order_id, document_type, document_data, printed_by, created_at)
        VALUES (%s, 'repair-approved', %s, %s, NOW())
        """
        
        import json
        approval_data = json.dumps({
            'repair_request_id': repair_request_id,
            'approved_by': approved_by,
            'approval_notes': approval_notes,
            'status': 'approved',
            'approved_at': datetime.now().isoformat()
        })
        
        result = db.execute_update(query, (service_order_id, approval_data, approved_by))
        
        if result['success']:
            return {
                'success': True,
                'status': 'approved',
                'timestamp': datetime.now().isoformat()
            }
        
        return {'success': False, 'error': 'Failed to approve repair'}
    
    def request_foreman_qc(self, service_order_id, technician_id, service_notes=None):
        """Technician requests Foreman QC after service completion (Process 4.3)"""
        query = """
        INSERT INTO service_order_documents
        (service_order_id, document_type, document_data, printed_by, created_at)
        VALUES (%s, 'qc-request', %s, %s, NOW())
        """
        
        import json
        qc_request = json.dumps({
            'technician_id': technician_id,
            'service_notes': service_notes,
            'status': 'pending_qc',
            'requested_at': datetime.now().isoformat()
        })
        
        result = db.execute_update(query, (service_order_id, qc_request, f"TECH-{technician_id}"))
        
        if result['success']:
            # Update service order status
            update_query = "UPDATE service_orders SET status = 'awaiting_qc' WHERE id = %s"
            db.execute_update(update_query, (service_order_id,))
            
            return {
                'success': True,
                'request_id': result.get('last_id'),
                'status': 'pending_qc',
                'timestamp': datetime.now().isoformat()
            }
        
        return {'success': False, 'error': 'Failed to request QC'}
    
    def get_qc_request_status(self, service_order_id):
        """Get QC request status (Process 4.3 - Tracking)"""
        query = """
        SELECT id, document_type, document_data, printed_by, created_at
        FROM service_order_documents
        WHERE service_order_id = %s AND document_type = 'qc-request'
        ORDER BY created_at DESC
        LIMIT 1
        """
        result = db.execute_query(query, (service_order_id,))
        if result:
            return result[0]
        return None
    
    def get_service_execution_summary(self, service_order_id):
        """Get complete service execution summary (Process 4.3 - Complete View)"""
        query = """
        SELECT so.id, so.vehicle_plate_no, so.service_type, so.status, so.check_in_time,
               ta.technician_id, t.name as technician_name, ta.clock_in_time, ta.clock_out_time,
               ta.labor_hours,
               GROUP_CONCAT(DISTINCT sod.document_type SEPARATOR ', ') as actions_taken
        FROM service_orders so
        LEFT JOIN technician_assignments ta ON so.id = ta.service_order_id
        LEFT JOIN technicians t ON ta.technician_id = t.id
        LEFT JOIN service_order_documents sod ON so.id = sod.service_order_id
        WHERE so.id = %s
        GROUP BY so.id
        """
        result = db.execute_query(query, (service_order_id,))
        if result:
            return result[0]
        return None
