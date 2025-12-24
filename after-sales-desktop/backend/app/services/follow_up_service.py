from database import db
from datetime import datetime

class FollowUpService:

    @staticmethod
    def _to_json_value(v):
        if v is None:
            return None
        try:
            # date/datetime/time
            if hasattr(v, 'isoformat'):
                return v.isoformat()
        except Exception:
            pass
        try:
            # Decimal
            if hasattr(v, 'quantize'):
                return float(v)
        except Exception:
            pass
        return v

    @staticmethod
    def _row_to_tuple(row, keys):
        if not row:
            return None
        return tuple(FollowUpService._to_json_value(row.get(k)) for k in keys)
    
    @staticmethod
    def create_followup(service_order_id, customer_id, followup_date, followup_time, contact_method, scheduled_by):
        """Create a new follow-up task"""
        try:
            query = """
            INSERT INTO follow_ups 
            (service_order_id, customer_id, followup_date, followup_time, contact_method, followup_status, scheduled_by)
            VALUES (%s, %s, %s, %s, %s, 'pending', %s)
            """
            result = db.execute_update(
                query,
                (service_order_id, customer_id, followup_date, followup_time, contact_method, scheduled_by),
            )

            if not result.get('success'):
                raise Exception(result.get('error') or 'Failed to create follow-up')

            followup_id = result.get('last_id')
            
            return {
                'followup_id': followup_id,
                'service_order_id': service_order_id,
                'customer_id': customer_id,
                'status': 'pending',
                'scheduled_for': FollowUpService._to_json_value(followup_date)
            }
        except Exception as e:
            raise Exception(f"Error creating follow-up: {str(e)}")
    
    @staticmethod
    def record_feedback(followup_id, service_quality, work_satisfaction, staff_rating, value_rating, overall_experience, would_recommend, comments):
        """Record customer feedback"""
        try:
            query = """
            INSERT INTO customer_feedback 
            (followup_id, service_quality_rating, work_done_satisfaction, staff_behavior_rating, 
             value_for_money_rating, overall_experience, would_recommend, feedback_comments)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """

            result = db.execute_update(
                query,
                (
                    followup_id,
                    service_quality,
                    work_satisfaction,
                    staff_rating,
                    value_rating,
                    overall_experience,
                    would_recommend,
                    comments,
                ),
            )

            if not result.get('success'):
                raise Exception(result.get('error') or 'Failed to record feedback')

            feedback_id = result.get('last_id')
            
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
            query = """
            INSERT INTO issue_tracking 
            (followup_id, issue_category, issue_description, severity, issue_status, assigned_to)
            VALUES (%s, %s, %s, %s, 'open', %s)
            """

            result = db.execute_update(
                query,
                (followup_id, issue_category, issue_description, severity, assigned_to),
            )

            if not result.get('success'):
                raise Exception(result.get('error') or 'Failed to log issue')

            issue_id = result.get('last_id')
            
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

            result = db.execute_update(
                query,
                (
                    status,
                    completed_by,
                    completion_date,
                    contact_person_name,
                    contact_phone,
                    notes,
                    followup_id,
                ),
            )

            if not result.get('success'):
                raise Exception(result.get('error') or 'Failed to update follow-up')
            
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
            keys = [
                'id',
                'service_order_id',
                'customer_id',
                'followup_date',
                'followup_time',
                'contact_method',
                'followup_status',
                'feedback_received',
                'issue_reported',
            ]

            if date_from:
                query = """
                SELECT f.id, f.service_order_id, f.customer_id, f.followup_date, f.followup_time,
                       f.contact_method, f.followup_status, f.feedback_received, f.issue_reported
                FROM follow_ups f
                WHERE f.followup_status = 'pending' AND DATE(f.followup_date) >= %s
                ORDER BY f.followup_date ASC
                """
                rows = db.execute_query(query, (date_from,)) or []
            else:
                query = """
                SELECT f.id, f.service_order_id, f.customer_id, f.followup_date, f.followup_time,
                       f.contact_method, f.followup_status, f.feedback_received, f.issue_reported
                FROM follow_ups f
                WHERE f.followup_status = 'pending'
                ORDER BY f.followup_date ASC
                """
                rows = db.execute_query(query) or []

            return [FollowUpService._row_to_tuple(r, keys) for r in rows]
        except Exception as e:
            raise Exception(f"Error fetching pending follow-ups: {str(e)}")
    
    @staticmethod
    def get_followup_details(followup_id):
        """Get complete follow-up details with feedback and issues"""
        try:
            # Get follow-up details
            query = """
            SELECT id, service_order_id, customer_id, followup_date, followup_time, contact_method,
                   contact_person_name, contact_person_phone, followup_status, feedback_received, 
                   issue_reported, followup_notes, satisfaction_rating
            FROM follow_ups
            WHERE id = %s
            """
            followup_rows = db.execute_query(query, (followup_id,)) or []
            followup = followup_rows[0] if followup_rows else None
            
            if not followup:
                raise Exception("Follow-up not found")
            
            # Get feedback if exists
            query = """
            SELECT id, service_quality_rating, work_done_satisfaction, staff_behavior_rating,
                   value_for_money_rating, overall_experience, would_recommend, feedback_comments
            FROM customer_feedback
            WHERE followup_id = %s
            """
            feedback_rows = db.execute_query(query, (followup_id,)) or []
            feedback = feedback_rows[0] if feedback_rows else None
            
            # Get issues
            query = """
            SELECT id, issue_category, issue_description, severity, issue_status, 
                   investigation_notes, resolution_notes, assigned_to
            FROM issue_tracking
            WHERE followup_id = %s
            ORDER BY severity DESC
            """

            issues_rows = db.execute_query(query, (followup_id,)) or []

            followup_keys = [
                'id',
                'service_order_id',
                'customer_id',
                'followup_date',
                'followup_time',
                'contact_method',
                'contact_person_name',
                'contact_person_phone',
                'followup_status',
                'feedback_received',
                'issue_reported',
                'followup_notes',
                'satisfaction_rating',
            ]
            feedback_keys = [
                'id',
                'service_quality_rating',
                'work_done_satisfaction',
                'staff_behavior_rating',
                'value_for_money_rating',
                'overall_experience',
                'would_recommend',
                'feedback_comments',
            ]
            issue_keys = [
                'id',
                'issue_category',
                'issue_description',
                'severity',
                'issue_status',
                'investigation_notes',
                'resolution_notes',
                'assigned_to',
            ]
            
            return {
                'followup': FollowUpService._row_to_tuple(followup, followup_keys),
                'feedback': FollowUpService._row_to_tuple(feedback, feedback_keys) if feedback else None,
                'issues': [FollowUpService._row_to_tuple(issue, issue_keys) for issue in issues_rows]
            }
        except Exception as e:
            raise Exception(f"Error fetching follow-up details: {str(e)}")
    
    @staticmethod
    def get_customer_feedback_summary(date_from=None, date_to=None):
        """Get customer feedback statistics"""
        try:
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

            rows = db.execute_query(query, tuple(params)) or []
            stats = rows[0] if rows else None

            if not stats:
                return (0, 0, 0, 0, 0)

            return (
                FollowUpService._to_json_value(stats.get('avg_satisfaction')),
                FollowUpService._to_json_value(stats.get('would_recommend_yes')),
                FollowUpService._to_json_value(stats.get('would_recommend_no')),
                FollowUpService._to_json_value(stats.get('would_recommend_maybe')),
                FollowUpService._to_json_value(stats.get('total_feedback')),
            )
        except Exception as e:
            raise Exception(f"Error fetching feedback summary: {str(e)}")
    
    @staticmethod
    def get_open_issues(severity_filter=None):
        """Get all open issues"""
        try:
            keys = [
                'id',
                'followup_id',
                'issue_category',
                'issue_description',
                'severity',
                'issue_status',
                'assigned_to',
                'reported_date',
            ]

            if severity_filter:
                query = """
                SELECT i.id, i.followup_id, i.issue_category, i.issue_description, i.severity,
                       i.issue_status, i.assigned_to, i.reported_date
                FROM issue_tracking i
                WHERE i.issue_status != 'closed' AND i.severity = %s
                ORDER BY i.severity DESC, i.reported_date DESC
                """
                rows = db.execute_query(query, (severity_filter,)) or []
            else:
                query = """
                SELECT i.id, i.followup_id, i.issue_category, i.issue_description, i.severity,
                       i.issue_status, i.assigned_to, i.reported_date
                FROM issue_tracking i
                WHERE i.issue_status != 'closed'
                ORDER BY i.severity DESC, i.reported_date DESC
                """

                rows = db.execute_query(query) or []

            return [FollowUpService._row_to_tuple(issue, keys) for issue in rows]
        except Exception as e:
            raise Exception(f"Error fetching open issues: {str(e)}")
    
    @staticmethod
    def resolve_issue(issue_id, resolution_type, resolution_notes, follow_up_action):
        """Resolve an issue"""
        try:
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

            result = db.execute_update(
                query,
                (resolution_type, resolution_notes, follow_up_action, resolved_date, issue_id),
            )

            if not result.get('success'):
                raise Exception(result.get('error') or 'Failed to resolve issue')
            
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

            status_rows = db.execute_query(query, tuple(params)) or []
            status_stats = [
                (FollowUpService._to_json_value(r.get('total')), FollowUpService._to_json_value(r.get('followup_status')))
                for r in status_rows
            ]
            
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

            issue_rows = db.execute_query(query, tuple(issue_params)) or []
            issue_stats = [
                (FollowUpService._to_json_value(r.get('total')), FollowUpService._to_json_value(r.get('issue_status')))
                for r in issue_rows
            ]
            
            return {
                'by_status': status_stats,
                'issues_by_status': issue_stats
            }
        except Exception as e:
            raise Exception(f"Error fetching follow-up summary: {str(e)}")
