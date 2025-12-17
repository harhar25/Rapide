from database import db
from datetime import datetime, timedelta

class FollowUpService:
    
    @staticmethod
    def create_followup(service_order_id, customer_id, followup_date, followup_time, contact_method, scheduled_by):
        """Create a new follow-up task"""
        try:
            cursor = db.get_cursor()
            
            query = """
            INSERT INTO follow_ups 
            (service_order_id, customer_id, followup_date, followup_time, contact_method, followup_status, scheduled_by)
            VALUES (%s, %s, %s, %s, %s, 'pending', %s)
            """
            cursor.execute(query, (service_order_id, customer_id, followup_date, followup_time, contact_method, scheduled_by))
            followup_id = cursor.lastrowid
            db.commit()
            
            return {
                'followup_id': followup_id,
                'service_order_id': service_order_id,
                'customer_id': customer_id,
                'status': 'pending',
                'scheduled_for': followup_date
            }
        except Exception as e:
            raise Exception(f"Error creating follow-up: {str(e)}")
    
    @staticmethod
    def record_feedback(followup_id, service_quality, work_satisfaction, staff_rating, value_rating, overall_experience, would_recommend, comments):
        """Record customer feedback"""
        try:
            cursor = db.get_cursor()
            
            query = """
            INSERT INTO customer_feedback 
            (followup_id, service_quality_rating, work_done_satisfaction, staff_behavior_rating, 
             value_for_money_rating, overall_experience, would_recommend, feedback_comments)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(query, (followup_id, service_quality, work_satisfaction, staff_rating, 
                                   value_rating, overall_experience, would_recommend, comments))
            feedback_id = cursor.lastrowid
            db.commit()
            
            return {
                'feedback_id': feedback_id,
                'followup_id': followup_id,
                'overall_rating': overall_experience,
                'recorded_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
        except Exception as e:
            raise Exception(f"Error recording feedback: {str(e)}")
    
    @staticmethod
    def log_issue(followup_id, issue_category, issue_description, severity, assigned_to):
        """Log a customer issue"""
        try:
            cursor = db.get_cursor()
            
            query = """
            INSERT INTO issue_tracking 
            (followup_id, issue_category, issue_description, severity, issue_status, assigned_to)
            VALUES (%s, %s, %s, %s, 'open', %s)
            """
            cursor.execute(query, (followup_id, issue_category, issue_description, severity, assigned_to))
            issue_id = cursor.lastrowid
            db.commit()
            
            return {
                'issue_id': issue_id,
                'followup_id': followup_id,
                'category': issue_category,
                'severity': severity,
                'status': 'open'
            }
        except Exception as e:
            raise Exception(f"Error logging issue: {str(e)}")
    
    @staticmethod
    def update_followup_status(followup_id, status, completed_by, contact_person_name, contact_phone, notes):
        """Update follow-up status after completion"""
        try:
            cursor = db.get_cursor()
            
            completion_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            query = """
            UPDATE follow_ups 
            SET followup_status = %s, 
                completed_by = %s, 
                completion_date = %s,
                contact_person_name = %s,
                contact_person_phone = %s,
                followup_notes = %s,
                feedback_received = TRUE
            WHERE id = %s
            """
            cursor.execute(query, (status, completed_by, completion_date, contact_person_name, 
                                   contact_phone, notes, followup_id))
            db.commit()
            
            return {
                'followup_id': followup_id,
                'status': status,
                'completed_at': completion_date
            }
        except Exception as e:
            raise Exception(f"Error updating follow-up status: {str(e)}")
    
    @staticmethod
    def get_pending_followups(date_from=None):
        """Get all pending follow-ups"""
        try:
            cursor = db.get_cursor()
            
            if date_from:
                query = """
                SELECT f.id, f.service_order_id, f.customer_id, f.followup_date, f.followup_time,
                       f.contact_method, f.followup_status, f.feedback_received, f.issue_reported
                FROM follow_ups f
                WHERE f.followup_status = 'pending' AND DATE(f.followup_date) >= %s
                ORDER BY f.followup_date ASC
                """
                cursor.execute(query, (date_from,))
            else:
                query = """
                SELECT f.id, f.service_order_id, f.customer_id, f.followup_date, f.followup_time,
                       f.contact_method, f.followup_status, f.feedback_received, f.issue_reported
                FROM follow_ups f
                WHERE f.followup_status = 'pending'
                ORDER BY f.followup_date ASC
                """
                cursor.execute(query)
            
            followups = cursor.fetchall()
            
            return [tuple(fu) for fu in followups]
        except Exception as e:
            raise Exception(f"Error fetching pending follow-ups: {str(e)}")
    
    @staticmethod
    def get_followup_details(followup_id):
        """Get complete follow-up details with feedback and issues"""
        try:
            cursor = db.get_cursor()
            
            # Get follow-up details
            query = """
            SELECT id, service_order_id, customer_id, followup_date, followup_time, contact_method,
                   contact_person_name, contact_person_phone, followup_status, feedback_received, 
                   issue_reported, followup_notes, satisfaction_rating
            FROM follow_ups
            WHERE id = %s
            """
            cursor.execute(query, (followup_id,))
            followup = cursor.fetchone()
            
            if not followup:
                raise Exception("Follow-up not found")
            
            # Get feedback if exists
            query = """
            SELECT id, service_quality_rating, work_done_satisfaction, staff_behavior_rating,
                   value_for_money_rating, overall_experience, would_recommend, feedback_comments
            FROM customer_feedback
            WHERE followup_id = %s
            """
            cursor.execute(query, (followup_id,))
            feedback = cursor.fetchone()
            
            # Get issues
            query = """
            SELECT id, issue_category, issue_description, severity, issue_status, 
                   investigation_notes, resolution_notes, assigned_to
            FROM issue_tracking
            WHERE followup_id = %s
            ORDER BY severity DESC
            """
            cursor.execute(query, (followup_id,))
            issues = cursor.fetchall()
            
            return {
                'followup': tuple(followup),
                'feedback': tuple(feedback) if feedback else None,
                'issues': [tuple(issue) for issue in issues]
            }
        except Exception as e:
            raise Exception(f"Error fetching follow-up details: {str(e)}")
    
    @staticmethod
    def get_customer_feedback_summary(date_from=None, date_to=None):
        """Get customer feedback statistics"""
        try:
            cursor = db.get_cursor()
            
            query = """
            SELECT 
                COALESCE(AVG(overall_experience), 0) as avg_satisfaction,
                SUM(CASE WHEN would_recommend = 'yes' THEN 1 ELSE 0 END) as would_recommend_yes,
                SUM(CASE WHEN would_recommend = 'no' THEN 1 ELSE 0 END) as would_recommend_no,
                SUM(CASE WHEN would_recommend = 'maybe' THEN 1 ELSE 0 END) as would_recommend_maybe,
                COUNT(*) as total_feedback
            FROM customer_feedback cf
            JOIN follow_ups f ON cf.followup_id = f.id
            WHERE 1=1
            """
            params = []
            
            if date_from:
                query += " AND DATE(cf.feedback_date) >= %s"
                params.append(date_from)
            if date_to:
                query += " AND DATE(cf.feedback_date) <= %s"
                params.append(date_to)
            
            cursor.execute(query, params)
            stats = cursor.fetchone()
            
            return tuple(stats) if stats else (0, 0, 0, 0, 0)
        except Exception as e:
            raise Exception(f"Error fetching feedback summary: {str(e)}")
    
    @staticmethod
    def get_open_issues(severity_filter=None):
        """Get all open issues"""
        try:
            cursor = db.get_cursor()
            
            if severity_filter:
                query = """
                SELECT i.id, i.followup_id, i.issue_category, i.issue_description, i.severity,
                       i.issue_status, i.assigned_to, i.reported_date
                FROM issue_tracking i
                WHERE i.issue_status != 'closed' AND i.severity = %s
                ORDER BY i.severity DESC, i.reported_date DESC
                """
                cursor.execute(query, (severity_filter,))
            else:
                query = """
                SELECT i.id, i.followup_id, i.issue_category, i.issue_description, i.severity,
                       i.issue_status, i.assigned_to, i.reported_date
                FROM issue_tracking i
                WHERE i.issue_status != 'closed'
                ORDER BY i.severity DESC, i.reported_date DESC
                """
                cursor.execute(query)
            
            issues = cursor.fetchall()
            
            return [tuple(issue) for issue in issues]
        except Exception as e:
            raise Exception(f"Error fetching open issues: {str(e)}")
    
    @staticmethod
    def resolve_issue(issue_id, resolution_type, resolution_notes, follow_up_action):
        """Resolve an issue"""
        try:
            cursor = db.get_cursor()
            
            resolved_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            query = """
            UPDATE issue_tracking 
            SET issue_status = 'resolved', 
                resolution_type = %s,
                resolution_notes = %s,
                follow_up_action = %s,
                resolved_date = %s
            WHERE id = %s
            """
            cursor.execute(query, (resolution_type, resolution_notes, follow_up_action, resolved_date, issue_id))
            db.commit()
            
            return {
                'issue_id': issue_id,
                'status': 'resolved',
                'resolution_type': resolution_type,
                'resolved_at': resolved_date
            }
        except Exception as e:
            raise Exception(f"Error resolving issue: {str(e)}")
    
    @staticmethod
    def get_followup_summary(date_from=None, date_to=None):
        """Get follow-up summary statistics"""
        try:
            cursor = db.get_cursor()
            
            query = "SELECT COUNT(*) as total, followup_status FROM follow_ups"
            conditions = []
            params = []
            
            if date_from:
                conditions.append("DATE(followup_date) >= %s")
                params.append(date_from)
            if date_to:
                conditions.append("DATE(followup_date) <= %s")
                params.append(date_to)
            
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            
            query += " GROUP BY followup_status"
            cursor.execute(query, params)
            status_stats = cursor.fetchall()
            
            # Get issue stats
            query = """
            SELECT COUNT(*) as total, issue_status FROM issue_tracking 
            WHERE 1=1
            """
            issue_params = []
            if date_from:
                query += " AND DATE(reported_date) >= %s"
                issue_params.append(date_from)
            if date_to:
                query += " AND DATE(reported_date) <= %s"
                issue_params.append(date_to)
            
            query += " GROUP BY issue_status"
            cursor.execute(query, issue_params)
            issue_stats = cursor.fetchall()
            
            return {
                'by_status': [tuple(stat) for stat in status_stats],
                'issues_by_status': [tuple(stat) for stat in issue_stats]
            }
        except Exception as e:
            raise Exception(f"Error fetching follow-up summary: {str(e)}")
