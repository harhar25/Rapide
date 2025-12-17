from database import db
from datetime import datetime, timedelta

class SecurityGateService:
    """Security gate access control and logging service"""
    
    def create_access_log(self, service_order_id, vehicle_plate_no, customer_name, 
                         access_type, gate_operator_id, mileage, vehicle_condition, 
                         badge_scanned="", is_authorized=True):
        """Log vehicle access at gate"""
        query = """
        INSERT INTO gate_access_logs
        (service_order_id, vehicle_plate_no, customer_name, access_type, access_time,
         gate_operator_id, mileage_at_access, vehicle_condition, badge_scanned,
         is_authorized, security_check_status)
        VALUES (%s, %s, %s, %s, NOW(), %s, %s, %s, %s, %s, 
                CASE WHEN %s = TRUE THEN 'passed' ELSE 'failed' END)
        """
        params = (service_order_id, vehicle_plate_no, customer_name, access_type,
                 gate_operator_id, mileage, vehicle_condition, badge_scanned,
                 is_authorized, is_authorized)
        
        result = db.execute_update(query, params)
        if result['success']:
            if not is_authorized:
                self._log_security_incident(service_order_id, vehicle_plate_no)
            return result.get('last_id')
        raise ValueError("Failed to create access log")
    
    def _log_security_incident(self, service_order_id, vehicle_plate_no):
        """Log unauthorized access attempt"""
        query = """
        INSERT INTO gate_access_logs
        (service_order_id, vehicle_plate_no, access_type, security_check_status, 
         is_authorized, reason_if_denied)
        SELECT %s, %s, 'entry', 'failed', FALSE, 
               CONCAT('Unauthorized access attempt at ', NOW())
        """
        db.execute_update(query, (service_order_id, vehicle_plate_no))
    
    def get_entry_logs(self, date=None):
        """Get vehicle entry logs for a date"""
        if not date:
            date = datetime.now().date()
        
        query = """
        SELECT gal.id, gal.service_order_id, so.service_order_no, gal.vehicle_plate_no,
               gal.customer_name, gal.access_time, CONCAT(p.name, ' (', p.role, ')') as operator,
               gal.vehicle_condition, gal.mileage_at_access, gal.is_authorized
        FROM gate_access_logs gal
        LEFT JOIN scheduling_orders so ON gal.service_order_id = so.id
        LEFT JOIN personnel p ON gal.gate_operator_id = p.id
        WHERE gal.access_type = 'entry' AND DATE(gal.access_time) = %s
        ORDER BY gal.access_time DESC
        """
        results = db.execute_query(query, (date,)) or []
        return [tuple(r.values()) for r in results]
    
    def get_exit_logs(self, date=None):
        """Get vehicle exit logs for a date"""
        if not date:
            date = datetime.now().date()
        
        query = """
        SELECT gal.id, gal.service_order_id, so.service_order_no, gal.vehicle_plate_no,
               gal.customer_name, gal.access_time, CONCAT(p.name, ' (', p.role, ')') as operator,
               gal.mileage_at_access, gal.vehicle_condition
        FROM gate_access_logs gal
        LEFT JOIN scheduling_orders so ON gal.service_order_id = so.id
        LEFT JOIN personnel p ON gal.gate_operator_id = p.id
        WHERE gal.access_type = 'exit' AND DATE(gal.access_time) = %s
        ORDER BY gal.access_time DESC
        """
        results = db.execute_query(query, (date,)) or []
        return [tuple(r.values()) for r in results]
    
    def issue_badge(self, service_order_id, vehicle_plate_no, customer_id, 
                   badge_type, issued_by, expiry_days=1):
        """Issue an access badge"""
        # Generate badge number
        badge_number = f"BDG-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        expiry_date = (datetime.now() + timedelta(days=expiry_days)).date()
        
        query = """
        INSERT INTO vehicle_badges
        (badge_number, service_order_id, vehicle_plate_no, customer_id,
         badge_type, issue_date, expiry_date, badge_status, issued_by)
        VALUES (%s, %s, %s, %s, %s, CURDATE(), %s, 'active', %s)
        """
        params = (badge_number, service_order_id, vehicle_plate_no, customer_id,
                 badge_type, expiry_date, issued_by)
        
        result = db.execute_update(query, params)
        if result['success']:
            return badge_number
        raise ValueError("Failed to issue badge")
    
    def scan_badge(self, badge_number):
        """Scan a badge and record usage"""
        # Validate badge
        query_check = """
        SELECT id, badge_status, expiry_date, scans_count
        FROM vehicle_badges
        WHERE badge_number = %s
        """
        result = db.execute_query(query_check, (badge_number,))
        if not result:
            raise ValueError("Badge not found")
        
        badge = result[0]
        if badge['badge_status'] != 'active':
            raise ValueError(f"Badge is {badge['badge_status']}")
        
        if datetime.strptime(str(badge['expiry_date']), '%Y-%m-%d').date() < datetime.now().date():
            raise ValueError("Badge expired")
        
        # Increment scan count
        query_update = """
        UPDATE vehicle_badges
        SET scans_count = scans_count + 1, updated_at = NOW()
        WHERE badge_number = %s
        """
        db.execute_update(query_update, (badge_number,))
        
        return badge['id']
    
    def revoke_badge(self, badge_number, reason=""):
        """Revoke a badge"""
        query = """
        UPDATE vehicle_badges
        SET badge_status = 'revoked', updated_at = NOW()
        WHERE badge_number = %s
        """
        result = db.execute_update(query, (badge_number,))
        if not result['success']:
            raise ValueError("Failed to revoke badge")
        return True
    
    def get_active_badges(self):
        """Get all active badges"""
        query = """
        SELECT vb.id, vb.badge_number, vb.vehicle_plate_no, c.name,
               vb.badge_type, vb.issue_date, vb.expiry_date, vb.scans_count
        FROM vehicle_badges vb
        LEFT JOIN customers c ON vb.customer_id = c.id
        WHERE vb.badge_status = 'active' AND vb.expiry_date >= CURDATE()
        ORDER BY vb.expiry_date ASC
        """
        results = db.execute_query(query) or []
        return [tuple(r.values()) for r in results]
    
    def get_gate_summary(self, date=None):
        """Get daily gate summary"""
        if not date:
            date = datetime.now().date()
        
        query = """
        SELECT 
            COUNT(DISTINCT CASE WHEN access_type = 'entry' THEN id END) as total_entries,
            COUNT(DISTINCT CASE WHEN access_type = 'exit' THEN id END) as total_exits,
            COUNT(DISTINCT CASE WHEN access_type = 'entry' AND is_authorized = FALSE THEN id END) as denied_entries,
            COUNT(DISTINCT CASE WHEN access_type = 'exit' AND is_authorized = FALSE THEN id END) as denied_exits,
            COUNT(DISTINCT CASE WHEN security_check_status = 'failed' THEN id END) as security_failures,
            COUNT(DISTINCT service_order_id) as vehicles_processed,
            COUNT(DISTINCT DATE(access_time)) as days_active
        FROM gate_access_logs
        WHERE DATE(access_time) = %s
        """
        result = db.execute_query(query, (date,))
        if result:
            return tuple(result[0].values())
        return (0, 0, 0, 0, 0, 0, 0)
    
    def get_security_incidents(self, date_from=None, date_to=None):
        """Get security incidents"""
        if not date_from:
            date_from = (datetime.now() - timedelta(days=7)).date()
        if not date_to:
            date_to = datetime.now().date()
        
        query = """
        SELECT gal.id, gal.vehicle_plate_no, gal.customer_name, gal.access_time,
               gal.reason_if_denied, CONCAT(p.name, ' (', p.role, ')') as operator
        FROM gate_access_logs gal
        LEFT JOIN personnel p ON gal.gate_operator_id = p.id
        WHERE (gal.is_authorized = FALSE OR gal.security_check_status = 'failed')
              AND DATE(gal.access_time) BETWEEN %s AND %s
        ORDER BY gal.access_time DESC
        """
        results = db.execute_query(query, (date_from, date_to)) or []
        return [tuple(r.values()) for r in results]
