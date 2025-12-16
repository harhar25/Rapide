from database import db
from datetime import datetime, timedelta

class JobControllerService:
    """Job Controller module for technician assignment and labor tracking"""
    
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
               ta.labor_hours, so.estimated_completion_time
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
