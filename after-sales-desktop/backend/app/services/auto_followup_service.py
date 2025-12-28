from database import db
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class AutoFollowUpService:
    """Automated follow-up task generation service (Step 13 - CRO After-Service Follow-Up)"""
    
    def generate_3day_followup_tasks(self):
        """
        Auto-generate follow-up tasks for service orders completed 3 days ago
        Process 13: 3 days after release → system auto-generates Follow-Up Task
        """
        try:
            # Find service orders completed exactly 3 days ago that don't have follow-up tasks
            query = """
            SELECT so.id, so.customer_id, c.name, c.contact_no, c.plate_no,
                   so.vehicle_plate_no, so.service_type, so.actual_completion_time
            FROM service_orders so
            JOIN customers c ON so.customer_id = c.id
            WHERE so.status = 'completed'
            AND DATE(so.actual_completion_time) = DATE_SUB(CURDATE(), INTERVAL 3 DAY)
            AND so.id NOT IN (
                SELECT DISTINCT service_order_id 
                FROM follow_ups 
                WHERE service_order_id = so.id
            )
            """
            
            completed_orders = db.execute_query(query) or []
            
            created_count = 0
            for order in completed_orders:
                service_order_id = order.get('id')
                customer_id = order.get('customer_id')
                
                # Create follow-up task
                followup_date = (datetime.now() + timedelta(days=1)).date()
                
                followup_query = """
                INSERT INTO follow_ups
                (service_order_id, customer_id, followup_date, followup_time, 
                 contact_method, followup_status, scheduled_by, created_at)
                VALUES (%s, %s, %s, '09:00:00', 'phone', 'pending', 1, NOW())
                """
                
                result = db.execute_update(followup_query, (service_order_id, customer_id, followup_date))
                
                if result['success']:
                    created_count += 1
                    logger.info(f"Auto-generated 3-day follow-up for SO {service_order_id}, Customer {customer_id}")
            
            logger.info(f"Auto-generated {created_count} follow-up tasks for 3-day post-service")
            return {
                'success': True,
                'tasks_created': created_count,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating auto follow-up tasks: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'tasks_created': 0
            }
    
    def mark_service_completed_and_schedule_followup(self, service_order_id, customer_id):
        """
        Mark service as completed and immediately schedule 3-day follow-up
        Called when vehicle is released to customer (Step 12)
        """
        try:
            # Update service order status
            update_query = """
            UPDATE service_orders
            SET status = 'completed', actual_completion_time = NOW()
            WHERE id = %s
            """
            result = db.execute_update(update_query, (service_order_id,))
            
            if result['success']:
                # Schedule follow-up for 3 days from now
                followup_date = (datetime.now() + timedelta(days=3)).date()
                
                followup_query = """
                INSERT INTO follow_ups
                (service_order_id, customer_id, followup_date, followup_time, 
                 contact_method, followup_status, scheduled_by, created_at)
                VALUES (%s, %s, %s, '09:00:00', 'phone', 'pending', 1, NOW())
                """
                
                followup_result = db.execute_update(followup_query, (service_order_id, customer_id, followup_date))
                
                if followup_result['success']:
                    logger.info(f"Service completed and 3-day follow-up scheduled for SO {service_order_id}")
                    return {
                        'success': True,
                        'service_order_id': service_order_id,
                        'followup_id': followup_result.get('last_id'),
                        'followup_scheduled_for': followup_date.isoformat()
                    }
            
            return {'success': False, 'error': 'Failed to complete service or schedule follow-up'}
            
        except Exception as e:
            logger.error(f"Error marking service completed: {str(e)}", exc_info=True)
            return {'success': False, 'error': str(e)}
    
    def get_due_followup_tasks(self):
        """Get follow-up tasks due today for CRO dashboard"""
        try:
            query = """
            SELECT f.id, f.service_order_id, f.customer_id, c.name, c.contact_no,
                   c.plate_no, c.vehicle_model, f.followup_date, f.followup_time,
                   f.contact_method, f.followup_status, so.service_type,
                   so.actual_completion_time
            FROM follow_ups f
            JOIN customers c ON f.customer_id = c.id
            LEFT JOIN service_orders so ON f.service_order_id = so.id
            WHERE f.followup_status = 'pending'
            AND DATE(f.followup_date) <= CURDATE()
            ORDER BY f.followup_date ASC, f.followup_time ASC
            """
            
            results = db.execute_query(query) or []
            logger.debug(f"Retrieved {len(results)} due follow-up tasks")
            return results
            
        except Exception as e:
            logger.error(f"Error retrieving due follow-up tasks: {str(e)}", exc_info=True)
            return []
    
    def complete_followup_with_feedback(self, followup_id, completed_by, contact_person_name, 
                                       contact_phone, notes, satisfaction_rating=None):
        """
        Complete follow-up call and log customer feedback
        Process 13: CRO calls customer → logs feedback (satisfaction level, concerns)
        """
        try:
            completion_date = datetime.now()
            
            # Update follow-up record
            update_query = """
            UPDATE follow_ups
            SET followup_status = 'completed',
                completed_by = %s,
                completion_date = %s,
                contact_person_name = %s,
                contact_person_phone = %s,
                followup_notes = %s,
                satisfaction_rating = %s,
                feedback_received = TRUE
            WHERE id = %s
            """
            
            params = (completed_by, completion_date, contact_person_name, 
                     contact_phone, notes, satisfaction_rating, followup_id)
            
            result = db.execute_update(update_query, params)
            
            if result['success']:
                logger.info(f"Follow-up {followup_id} completed by {completed_by}")
                return {
                    'success': True,
                    'followup_id': followup_id,
                    'completed_at': completion_date.isoformat(),
                    'satisfaction_rating': satisfaction_rating
                }
            
            return {'success': False, 'error': 'Failed to complete follow-up'}
            
        except Exception as e:
            logger.error(f"Error completing follow-up: {str(e)}", exc_info=True)
            return {'success': False, 'error': str(e)}
    
    def log_customer_concern(self, followup_id, issue_category, issue_description, 
                            severity='medium', assigned_to=None):
        """
        Log customer concern/issue during follow-up call
        Process 13: Data saved to Customer Feedback History
        """
        try:
            # Update follow-up to mark issue reported
            update_followup = """
            UPDATE follow_ups
            SET issue_reported = TRUE
            WHERE id = %s
            """
            db.execute_update(update_followup, (followup_id,))
            
            # Create issue tracking record
            issue_query = """
            INSERT INTO issue_tracking
            (followup_id, issue_category, issue_description, severity, 
             issue_status, assigned_to, reported_date)
            VALUES (%s, %s, %s, %s, 'open', %s, NOW())
            """
            
            params = (followup_id, issue_category, issue_description, severity, assigned_to)
            result = db.execute_update(issue_query, params)
            
            if result['success']:
                logger.warning(f"Customer concern logged for follow-up {followup_id}: {issue_category}")
                return {
                    'success': True,
                    'issue_id': result.get('last_id'),
                    'severity': severity,
                    'status': 'open'
                }
            
            return {'success': False, 'error': 'Failed to log concern'}
            
        except Exception as e:
            logger.error(f"Error logging customer concern: {str(e)}", exc_info=True)
            return {'success': False, 'error': str(e)}

auto_followup_service = AutoFollowUpService()
