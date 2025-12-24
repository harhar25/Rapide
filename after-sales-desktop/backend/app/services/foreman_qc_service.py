from database import db
from datetime import datetime

class ForemanQCService:
    """Quality Control inspection service for Foreman module"""
    
    def get_pending_qc_jobs(self):
        """Get service orders pending quality inspection"""
        query = """
        SELECT so.id, CONCAT('SO-', LPAD(so.id, 6, '0')) as service_order_no, c.name, c.plate_no, so.created_at
        FROM scheduling_orders so
        JOIN customers c ON so.customer_id = c.id
        WHERE so.status = 'job-completed' AND so.id NOT IN (
            SELECT service_order_id FROM qc_inspections WHERE overall_status != 'failed'
        )
        ORDER BY so.created_at DESC
        """
        results = db.execute_query(query) or []
        return [tuple(r.values()) for r in results]
    
    def get_active_qc_inspections(self):
        """Get active QC inspections in progress"""
        query = """
        SELECT qi.id, qi.service_order_id, CONCAT('SO-', LPAD(so.id, 6, '0')) as service_order_no, c.name, qi.overall_status, 
               qi.inspection_date, qi.created_at
        FROM qc_inspections qi
        JOIN scheduling_orders so ON qi.service_order_id = so.id
        JOIN customers c ON so.customer_id = c.id
        WHERE qi.overall_status IN ('pending', 'rework-required')
        ORDER BY qi.created_at DESC
        """
        results = db.execute_query(query) or []
        return [tuple(r.values()) for r in results]
    
    def create_qc_inspection(self, service_order_id, foreman_id, inspection_data):
        """Create new QC inspection"""
        query = """
        INSERT INTO qc_inspections
        (service_order_id, foreman_id, inspection_date, exterior_condition, engine_condition,
         interior_cleanliness, parts_installed, fluid_levels_ok, electrical_systems_ok,
         safety_features_ok, overall_status, failed_items, inspection_notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        params = (
            service_order_id,
            foreman_id,
            inspection_data.get('inspection_date', datetime.now().date()),
            inspection_data.get('exterior_condition'),
            inspection_data.get('engine_condition'),
            inspection_data.get('interior_cleanliness'),
            inspection_data.get('parts_installed', ''),
            inspection_data.get('fluid_levels_ok', True),
            inspection_data.get('electrical_systems_ok', True),
            inspection_data.get('safety_features_ok', True),
            inspection_data.get('overall_status', 'pending'),
            inspection_data.get('failed_items', ''),
            inspection_data.get('inspection_notes', '')
        )
        
        result = db.execute_update(query, params)
        return result.get('last_id') if result['success'] else None
    
    def update_qc_inspection(self, qc_inspection_id, inspection_data):
        """Update QC inspection details"""
        query = """
        UPDATE qc_inspections
        SET exterior_condition = %s, engine_condition = %s, interior_cleanliness = %s,
            parts_installed = %s, fluid_levels_ok = %s, electrical_systems_ok = %s,
            safety_features_ok = %s, overall_status = %s, failed_items = %s,
            inspection_notes = %s, photos_attached = %s
        WHERE id = %s
        """
        
        params = (
            inspection_data.get('exterior_condition'),
            inspection_data.get('engine_condition'),
            inspection_data.get('interior_cleanliness'),
            inspection_data.get('parts_installed'),
            inspection_data.get('fluid_levels_ok', True),
            inspection_data.get('electrical_systems_ok', True),
            inspection_data.get('safety_features_ok', True),
            inspection_data.get('overall_status'),
            inspection_data.get('failed_items', ''),
            inspection_data.get('inspection_notes', ''),
            inspection_data.get('photos_attached', 0),
            qc_inspection_id
        )
        
        result = db.execute_update(query, params)
        return result['success']
    
    def get_qc_inspection_details(self, qc_inspection_id):
        """Get QC inspection details with related data"""
        query = """
        SELECT qi.id, qi.service_order_id, qi.foreman_id, qi.inspection_date,
               qi.exterior_condition, qi.engine_condition, qi.interior_cleanliness,
               qi.parts_installed, qi.fluid_levels_ok, qi.electrical_systems_ok,
               qi.safety_features_ok, qi.overall_status, qi.failed_items,
               qi.inspection_notes, qi.photos_attached, qi.created_at
        FROM qc_inspections qi
        WHERE qi.id = %s
        """
        result = db.execute_query(query, (qc_inspection_id,))
        if result and len(result) > 0:
            return tuple(result[0].values())
        return None
    
    def create_road_test(self, qc_inspection_id, service_order_id, road_test_data):
        """Create road test record"""
        query = """
        INSERT INTO road_tests
        (qc_inspection_id, service_order_id, road_test_date, tested_by, test_distance_km,
         engine_sound, acceleration_smooth, braking_effective, steering_responsive,
         electrical_functions_ok, air_conditioning_ok, overall_performance, issues_found,
         road_test_notes, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        params = (
            qc_inspection_id,
            service_order_id,
            road_test_data.get('road_test_date', datetime.now().date()),
            road_test_data.get('tested_by'),
            road_test_data.get('test_distance_km', 0),
            road_test_data.get('engine_sound'),
            road_test_data.get('acceleration_smooth', True),
            road_test_data.get('braking_effective', True),
            road_test_data.get('steering_responsive', True),
            road_test_data.get('electrical_functions_ok', True),
            road_test_data.get('air_conditioning_ok', True),
            road_test_data.get('overall_performance', 'good'),
            road_test_data.get('issues_found', ''),
            road_test_data.get('road_test_notes', ''),
            road_test_data.get('status', 'pending')
        )
        
        result = db.execute_update(query, params)
        return result.get('last_id') if result['success'] else None
    
    def get_road_test_details(self, road_test_id):
        """Get road test record details"""
        query = """
        SELECT rt.id, rt.qc_inspection_id, rt.service_order_id, rt.road_test_date,
               rt.tested_by, rt.test_distance_km, rt.engine_sound, rt.acceleration_smooth,
               rt.braking_effective, rt.steering_responsive, rt.electrical_functions_ok,
               rt.air_conditioning_ok, rt.overall_performance, rt.issues_found,
               rt.road_test_notes, rt.test_video_attached, rt.status, rt.created_at
        FROM road_tests rt
        WHERE rt.id = %s
        """
        result = db.execute_query(query, (road_test_id,))
        if result and len(result) > 0:
            return tuple(result[0].values())
        return None
    
    def get_road_tests_for_qc(self, qc_inspection_id):
        """Get all road tests for a QC inspection"""
        query = """
        SELECT id, qc_inspection_id, service_order_id, road_test_date, tested_by,
               test_distance_km, overall_performance, status, created_at
        FROM road_tests
        WHERE qc_inspection_id = %s
        ORDER BY created_at DESC
        """
        results = db.execute_query(query, (qc_inspection_id,)) or []
        return [tuple(r.values()) for r in results]
    
    def mark_inspection_passed(self, qc_inspection_id):
        """Mark inspection as passed"""
        query = "UPDATE qc_inspections SET overall_status = 'passed' WHERE id = %s"
        result = db.execute_update(query, (qc_inspection_id,))
        return result['success']
    
    def mark_inspection_failed(self, qc_inspection_id, failed_items):
        """Mark inspection as failed with reasons"""
        query = """
        UPDATE qc_inspections
        SET overall_status = 'failed', failed_items = %s
        WHERE id = %s
        """
        result = db.execute_update(query, (failed_items, qc_inspection_id))
        return result['success']
    
    def get_qc_summary(self):
        """Get QC summary statistics"""
        query = """
        SELECT
            COUNT(*) as total_inspections,
            COUNT(CASE WHEN overall_status = 'passed' THEN 1 END) as passed_count,
            COUNT(CASE WHEN overall_status = 'failed' THEN 1 END) as failed_count,
            COUNT(CASE WHEN overall_status = 'pending' THEN 1 END) as pending_count,
            COUNT(CASE WHEN overall_status = 'rework-required' THEN 1 END) as rework_count
        FROM qc_inspections
        WHERE DATE(inspection_date) = CURDATE()
        """
        result = db.execute_query(query)
        if result and len(result) > 0:
            data = result[0]
            return (
                data.get('total_inspections', 0) or 0,
                data.get('passed_count', 0) or 0,
                data.get('failed_count', 0) or 0,
                data.get('pending_count', 0) or 0,
                data.get('rework_count', 0) or 0
            )
        return (0, 0, 0, 0, 0)
