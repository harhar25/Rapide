from database import db
from datetime import datetime, timedelta

class JobWrapupService:
    """Job wrap-up and completion service for Job Controller"""
    
    def get_jobs_ready_for_wrapup(self):
        """Get jobs that completed QC and are ready for wrap-up"""
        query = """
        SELECT so.id, CONCAT('SO-', LPAD(so.id, 6, '0')) as service_order_no, c.name, c.plate_no, 
               ta.technician_id, t.name as tech_name, qi.overall_status, so.created_at
        FROM scheduling_orders so
        JOIN customers c ON so.customer_id = c.id
        LEFT JOIN technician_assignments ta ON so.id = ta.service_order_id
        LEFT JOIN technicians t ON ta.technician_id = t.id
        LEFT JOIN qc_inspections qi ON so.id = qi.service_order_id
        WHERE so.status = 'quality-checked' AND so.id NOT IN (
            SELECT service_order_id FROM job_wrapups WHERE final_status IN ('completed', 'returned-to-sa')
        )
        ORDER BY so.created_at DESC
        """
        results = db.execute_query(query) or []
        return [tuple(r.values()) for r in results]
    
    def get_active_wrapups(self):
        """Get active job wrap-ups in progress"""
        query = """
        SELECT jw.id, jw.service_order_id, CONCAT('SO-', LPAD(so.id, 6, '0')) as service_order_no, c.name, 
               jw.final_status, jw.total_labor_hours, jw.created_at
        FROM job_wrapups jw
        JOIN scheduling_orders so ON jw.service_order_id = so.id
        JOIN customers c ON so.customer_id = c.id
        WHERE jw.final_status IN ('pending', 'ready-for-sa')
        ORDER BY jw.created_at DESC
        """
        results = db.execute_query(query) or []
        return [tuple(r.values()) for r in results]
    
    def create_wrapup(self, service_order_id, job_controller_id, technician_id, qc_inspection_id):
        """Create new job wrap-up record"""
        query = """
        INSERT INTO job_wrapups
        (service_order_id, job_controller_id, technician_id, qc_inspection_id, final_status)
        VALUES (%s, %s, %s, %s, 'pending')
        """
        
        params = (service_order_id, job_controller_id, technician_id, qc_inspection_id)
        result = db.execute_update(query, params)
        return result.get('last_id') if result['success'] else None
    
    def clock_out_technician(self, wrapup_id, final_notes=''):
        """Clock out technician and calculate labor hours"""
        # Get the technician assignment details
        query = """
        SELECT jw.id, ta.id as assignment_id, ta.clock_in_time, ta.technician_id
        FROM job_wrapups jw
        JOIN technician_assignments ta ON jw.service_order_id = ta.service_order_id
        WHERE jw.id = %s
        """
        result = db.execute_query(query, (wrapup_id,))
        
        if not result:
            raise ValueError("Wrapup record not found")
        
        data = result[0]
        clock_in = data.get('clock_in_time')
        
        if not clock_in:
            raise ValueError("No clock-in record found")
        
        # Calculate labor hours
        clock_out = datetime.now()
        labor_duration = clock_out - clock_in
        labor_hours = labor_duration.total_seconds() / 3600
        
        # Update technician assignment
        ta_query = """
        UPDATE technician_assignments
        SET clock_out_time = %s, labor_hours = %s, status = 'completed'
        WHERE id = %s
        """
        db.execute_update(ta_query, (clock_out, labor_hours, data.get('assignment_id')))
        
        # Update job wrapup
        wrapup_query = """
        UPDATE job_wrapups
        SET clock_out_time = %s, total_labor_hours = %s, final_notes = %s, final_status = 'ready-for-sa'
        WHERE id = %s
        """
        db.execute_update(wrapup_query, (clock_out, labor_hours, final_notes, wrapup_id))
        
        return labor_hours
    
    def update_completion_checklist(self, wrapup_id, checklist_data):
        """Update job completion checklist"""
        query = """
        UPDATE job_wrapups
        SET job_completion_checklist = %s,
            materials_returned = %s,
            tools_returned = %s,
            vehicle_condition_final = %s,
            quality_check_passed = %s
        WHERE id = %s
        """
        
        params = (
            checklist_data.get('checklist_items', ''),
            checklist_data.get('materials_returned', 0),
            checklist_data.get('tools_returned', 0),
            checklist_data.get('vehicle_condition', ''),
            checklist_data.get('quality_passed', False),
            wrapup_id
        )
        
        result = db.execute_update(query, params)
        return result['success']
    
    def return_so_to_service_advisor(self, wrapup_id):
        """Return completed SO back to Service Advisor"""
        query = """
        UPDATE job_wrapups
        SET final_status = 'returned-to-sa', returned_to_sa_at = %s, handover_status = 'ready'
        WHERE id = %s
        """
        
        result = db.execute_update(query, (datetime.now(), wrapup_id))
        
        if result['success']:
            # Update SO status
            so_query = """
            SELECT service_order_id FROM job_wrapups WHERE id = %s
            """
            so_result = db.execute_query(so_query, (wrapup_id,))
            if so_result:
                so_id = so_result[0].get('service_order_id')
                so_update = "UPDATE scheduling_orders SET status = 'ready-for-sa' WHERE id = %s"
                db.execute_update(so_update, (so_id,))
        
        return result['success']
    
    def get_wrapup_details(self, wrapup_id):
        """Get job wrap-up details"""
        query = """
        SELECT jw.id, jw.service_order_id, jw.job_controller_id, jw.technician_id,
               jw.qc_inspection_id, jw.clock_out_time, jw.total_labor_hours,
               jw.final_status, jw.final_notes, jw.quality_check_passed,
               jw.job_completion_checklist, jw.materials_returned, jw.tools_returned,
               jw.vehicle_condition_final, jw.handover_status, jw.returned_to_sa_at,
               jw.created_at
        FROM job_wrapups jw
        WHERE jw.id = %s
        """
        result = db.execute_query(query, (wrapup_id,))
        if result and len(result) > 0:
            return tuple(result[0].values())
        return None
    
    def get_wrapup_by_service_order(self, service_order_id):
        """Get wrapup record for a service order"""
        query = """
        SELECT jw.id, jw.service_order_id, jw.job_controller_id, jw.technician_id,
               jw.qc_inspection_id, jw.clock_out_time, jw.total_labor_hours,
               jw.final_status, jw.final_notes, jw.quality_check_passed,
               jw.job_completion_checklist, jw.materials_returned, jw.tools_returned,
               jw.vehicle_condition_final, jw.handover_status, jw.returned_to_sa_at,
               jw.created_at
        FROM job_wrapups jw
        WHERE jw.service_order_id = %s
        LIMIT 1
        """
        result = db.execute_query(query, (service_order_id,))
        if result and len(result) > 0:
            return tuple(result[0].values())
        return None
    
    def get_wrapup_summary(self):
        """Get wrapup summary statistics"""
        query = """
        SELECT
            COUNT(*) as total_wrapups,
            COUNT(CASE WHEN final_status = 'returned-to-sa' THEN 1 END) as returned_count,
            COUNT(CASE WHEN final_status = 'ready-for-sa' THEN 1 END) as ready_count,
            COUNT(CASE WHEN final_status = 'pending' THEN 1 END) as pending_count,
            AVG(total_labor_hours) as avg_labor_hours
        FROM job_wrapups
        WHERE DATE(created_at) = CURDATE()
        """
        result = db.execute_query(query)
        if result and len(result) > 0:
            data = result[0]
            return (
                data.get('total_wrapups', 0) or 0,
                data.get('returned_count', 0) or 0,
                data.get('ready_count', 0) or 0,
                data.get('pending_count', 0) or 0,
                round(data.get('avg_labor_hours', 0) or 0, 2)
            )
        return (0, 0, 0, 0, 0)
