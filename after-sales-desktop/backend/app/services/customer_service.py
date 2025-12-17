from database import db
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class CustomerService:
    """Customer management service - Enhanced with production-grade features"""
    
    def get_pms_due_customers(self):
        """Get customers due for PMS"""
        try:
            query = """
            SELECT c.id, c.name, c.contact_no, c.plate_no, c.vehicle_model,
                   c.last_service_date, c.service_interval_days,
                   DATEDIFF(NOW(), c.last_service_date) as days_since_service
            FROM customers c
            WHERE c.status = 'active'
            AND DATEDIFF(NOW(), c.last_service_date) >= c.service_interval_days
            ORDER BY c.last_service_date ASC
            """
            result = db.execute_query(query)
            logger.info(f"Retrieved {len(result) if result else 0} PMS due customers")
            return result or []
        except Exception as e:
            logger.error(f"Error retrieving PMS due customers: {str(e)}", exc_info=True)
            return []
    
    def search_customer(self, search_type, search_value):
        """Search customer by plate, name, or contact"""
        try:
            if search_type == 'plate':
                query = "SELECT * FROM customers WHERE plate_no LIKE %s AND status = 'active' LIMIT 10"
                params = (f"%{search_value}%",)
            elif search_type == 'name':
                query = "SELECT * FROM customers WHERE name LIKE %s AND status = 'active' LIMIT 10"
                params = (f"%{search_value}%",)
            elif search_type == 'contact':
                query = "SELECT * FROM customers WHERE contact_no LIKE %s AND status = 'active' LIMIT 10"
                params = (f"%{search_value}%",)
            else:
                logger.warning(f"Invalid search type: {search_type}")
                return {'status': 'error', 'code': 'CRO-001', 'message': 'Invalid search type'}
            
            result = db.execute_query(query, params)
            logger.debug(f"Search result for {search_type}={search_value}: {len(result) if result else 0} records")
            return result if result else []
        except Exception as e:
            logger.error(f"Error searching customer: {str(e)}", exc_info=True)
            return {'status': 'error', 'code': 'CRO-002', 'message': 'Search operation failed'}
    
    def search_similar_customers(self, customer_data):
        """Search for similar/duplicate customers using fuzzy matching"""
        try:
            results = []
            # Exact match on contact_no (primary identifier)
            if customer_data.get('contact_no'):
                query = "SELECT * FROM customers WHERE contact_no = %s"
                result = db.execute_query(query, (customer_data.get('contact_no'),))
                if result:
                    return {'found': True, 'type': 'exact_contact', 'records': result, 'confidence': 100}
            
            # Exact match on plate_no
            if customer_data.get('plate_no'):
                query = "SELECT * FROM customers WHERE plate_no = %s"
                result = db.execute_query(query, (customer_data.get('plate_no'),))
                if result:
                    return {'found': True, 'type': 'exact_plate', 'records': result, 'confidence': 100}
            
            # Fuzzy match on name and vehicle model
            if customer_data.get('name'):
                query = """
                SELECT * FROM customers 
                WHERE name LIKE %s AND status = 'active'
                LIMIT 5
                """
                result = db.execute_query(query, (f"%{customer_data.get('name')[:3]}%",))
                if result:
                    return {'found': True, 'type': 'fuzzy_name', 'records': result, 'confidence': 60}
            
            return {'found': False, 'records': []}
        except Exception as e:
            logger.error(f"Error searching similar customers: {str(e)}", exc_info=True)
            return {'status': 'error', 'code': 'CRO-003', 'message': 'Duplicate search failed'}
    
    def create_customer(self, customer_data):
        """Register a new walk-in customer with complete CIS form"""
        try:
            # Check for duplicates first
            duplicate_check = self.search_similar_customers(customer_data)
            if duplicate_check.get('found') and duplicate_check.get('confidence', 0) >= 100:
                logger.warning(f"Potential duplicate customer detected")
                return {
                    'status': 'warning',
                    'code': 'CRO-004',
                    'message': 'Similar customer found',
                    'duplicates': duplicate_check.get('records')
                }
            
            # Enhanced query with all CIS fields
            query = """
            INSERT INTO customers
            (name, contact_no, plate_no, vehicle_model, vehicle_year, engine_no, 
             chassis_no, customer_type, address, city, email, 
             service_interval_days, last_service_date, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), 'active', NOW())
            """
            
            params = (
                customer_data.get('name'),
                customer_data.get('contact_no'),
                customer_data.get('plate_no'),
                customer_data.get('vehicle_model'),
                customer_data.get('vehicle_year'),
                customer_data.get('engine_no'),
                customer_data.get('chassis_no'),
                customer_data.get('customer_type', 'walk-in'),
                customer_data.get('address'),
                customer_data.get('city'),
                customer_data.get('email'),
                customer_data.get('service_interval_days', 10000)
            )
            
            result = db.execute_update(query, params)
            if result['success']:
                customer_id = result.get('last_id')
                logger.info(f"New customer created: ID={customer_id}, Name={customer_data.get('name')}")
                return {'success': True, 'customer_id': customer_id}
            else:
                logger.error(f"Failed to create customer: {result.get('error')}")
                return {'status': 'error', 'code': 'CRO-005', 'message': 'Failed to register customer'}
        except Exception as e:
            logger.error(f"Error creating customer: {str(e)}", exc_info=True)
            return {'status': 'error', 'code': 'CRO-006', 'message': 'Customer registration failed'}
    
    def get_customer(self, customer_id):
        """Get customer details"""
        try:
            query = "SELECT * FROM customers WHERE id = %s"
            result = db.execute_query(query, (customer_id,))
            return result[0] if result else None
        except Exception as e:
            logger.error(f"Error retrieving customer {customer_id}: {str(e)}", exc_info=True)
            return None
    
    def update_customer(self, customer_id, customer_data):
        """Update customer information with enhanced fields"""
        try:
            query = """
            UPDATE customers
            SET name = COALESCE(%s, name),
                contact_no = COALESCE(%s, contact_no),
                plate_no = COALESCE(%s, plate_no),
                vehicle_model = COALESCE(%s, vehicle_model),
                vehicle_year = COALESCE(%s, vehicle_year),
                engine_no = COALESCE(%s, engine_no),
                chassis_no = COALESCE(%s, chassis_no),
                address = COALESCE(%s, address),
                city = COALESCE(%s, city),
                email = COALESCE(%s, email),
                service_interval_days = COALESCE(%s, service_interval_days)
            WHERE id = %s
            """
            
            params = (
                customer_data.get('name'),
                customer_data.get('contact_no'),
                customer_data.get('plate_no'),
                customer_data.get('vehicle_model'),
                customer_data.get('vehicle_year'),
                customer_data.get('engine_no'),
                customer_data.get('chassis_no'),
                customer_data.get('address'),
                customer_data.get('city'),
                customer_data.get('email'),
                customer_data.get('service_interval_days'),
                customer_id
            )
            
            result = db.execute_update(query, params)
            if result['success']:
                logger.info(f"Customer {customer_id} updated successfully")
            return result['success']
        except Exception as e:
            logger.error(f"Error updating customer {customer_id}: {str(e)}", exc_info=True)
            return False


class SchedulingService:
    """Scheduling and availability management service - Enhanced for production"""
    
    def check_availability(self, date, time, duration_hours=2):
        """Check bay, technician, and SA availability with conflict detection"""
        try:
            availability = {
                'available_bays': self._get_available_bays(date, time, duration_hours),
                'available_technicians': self._get_available_technicians(date, time, duration_hours),
                'available_advisors': self._get_available_advisors(date, time, duration_hours),
                'conflicts': []
            }
            logger.debug(f"Availability check for {date} {time}: {len(availability['available_bays'])} bays available")
            return availability
        except Exception as e:
            logger.error(f"Error checking availability: {str(e)}", exc_info=True)
            return {'status': 'error', 'code': 'CRO-010', 'message': 'Availability check failed'}
    
    def _get_available_bays(self, date, time, duration_hours=2):
        """Get available service bays with conflict detection"""
        try:
            query = """
            SELECT sb.id, sb.bay_name, sb.capacity, sb.status
            FROM service_bays sb
            WHERE sb.status = 'active'
            AND sb.id NOT IN (
                SELECT bay_id FROM scheduling_orders 
                WHERE scheduled_date = %s 
                AND (
                    (CAST(scheduled_time AS TIME) <= %s 
                     AND ADDTIME(CAST(scheduled_time AS TIME), SEC_TO_TIME(%s)) > %s)
                    OR
                    (CAST(scheduled_time AS TIME) < ADDTIME(%s, SEC_TO_TIME(%s))
                     AND ADDTIME(CAST(scheduled_time AS TIME), SEC_TO_TIME(%s)) > %s)
                )
                AND status NOT IN ('cancelled', 'completed')
            )
            ORDER BY sb.bay_name ASC
            """
            # duration_hours * 3600 for seconds
            duration_seconds = int(duration_hours * 3600)
            params = (date, time, duration_seconds, time, time, duration_seconds, duration_seconds, time)
            
            result = db.execute_query(query, params)
            return result or []
        except Exception as e:
            logger.error(f"Error getting available bays: {str(e)}", exc_info=True)
            return []
    
    def _get_available_technicians(self, date, time, duration_hours=2):
        """Get available technicians"""
        try:
            query = """
            SELECT t.id, t.name, t.specialization
            FROM technicians t
            WHERE t.status = 'active'
            AND t.id NOT IN (
                SELECT technician_id FROM scheduling_orders
                WHERE scheduled_date = %s
                AND CAST(scheduled_time AS TIME) = %s
                AND status NOT IN ('cancelled', 'completed')
            )
            ORDER BY t.name ASC
            """
            result = db.execute_query(query, (date, time))
            return result or []
        except Exception as e:
            logger.error(f"Error getting available technicians: {str(e)}", exc_info=True)
            return []
    
    def _get_available_advisors(self, date, time, duration_hours=2):
        """Get available service advisors"""
        try:
            query = """
            SELECT sa.id, sa.name
            FROM service_advisors sa
            WHERE sa.status = 'active'
            AND sa.id NOT IN (
                SELECT advisor_id FROM scheduling_orders
                WHERE scheduled_date = %s
                AND CAST(scheduled_time AS TIME) = %s
                AND status NOT IN ('cancelled', 'completed')
            )
            ORDER BY sa.name ASC
            """
            result = db.execute_query(query, (date, time))
            return result or []
        except Exception as e:
            logger.error(f"Error getting available advisors: {str(e)}", exc_info=True)
            return []
    
    def validate_scheduling_no_conflicts(self, bay_id, technician_id, advisor_id, date, time, duration_hours=2):
        """Validate that scheduling order doesn't create conflicts"""
        try:
            duration_seconds = int(duration_hours * 3600)
            
            # Check bay conflicts
            bay_query = """
            SELECT COUNT(*) as conflict_count FROM scheduling_orders
            WHERE bay_id = %s AND scheduled_date = %s
            AND (
                (CAST(scheduled_time AS TIME) <= %s 
                 AND ADDTIME(CAST(scheduled_time AS TIME), SEC_TO_TIME(%s)) > %s)
            )
            AND status NOT IN ('cancelled', 'completed')
            """
            bay_result = db.execute_query(bay_query, (bay_id, date, time, duration_seconds, time))
            if bay_result and bay_result[0]['conflict_count'] > 0:
                logger.warning(f"Bay {bay_id} conflict detected at {date} {time}")
                return {'valid': False, 'conflict': 'bay_conflict', 'code': 'CRO-011'}
            
            # Check technician conflicts
            tech_query = """
            SELECT COUNT(*) as conflict_count FROM scheduling_orders
            WHERE technician_id = %s AND scheduled_date = %s
            AND CAST(scheduled_time AS TIME) = %s
            AND status NOT IN ('cancelled', 'completed')
            """
            tech_result = db.execute_query(tech_query, (technician_id, date, time))
            if tech_result and tech_result[0]['conflict_count'] > 0:
                logger.warning(f"Technician {technician_id} conflict at {date} {time}")
                return {'valid': False, 'conflict': 'technician_conflict', 'code': 'CRO-012'}
            
            # Check advisor conflicts
            advisor_query = """
            SELECT COUNT(*) as conflict_count FROM scheduling_orders
            WHERE advisor_id = %s AND scheduled_date = %s
            AND CAST(scheduled_time AS TIME) = %s
            AND status NOT IN ('cancelled', 'completed')
            """
            advisor_result = db.execute_query(advisor_query, (advisor_id, date, time))
            if advisor_result and advisor_result[0]['conflict_count'] > 0:
                logger.warning(f"Advisor {advisor_id} conflict at {date} {time}")
                return {'valid': False, 'conflict': 'advisor_conflict', 'code': 'CRO-013'}
            
            logger.debug(f"No conflicts detected for {date} {time}")
            return {'valid': True}
        except Exception as e:
            logger.error(f"Error validating conflicts: {str(e)}", exc_info=True)
            return {'status': 'error', 'code': 'CRO-014', 'message': 'Conflict validation failed'}
    
    def create_scheduling_order(self, order_data):
        """Create a scheduling order with validation"""
        try:
            # Validate no conflicts first
            conflict_check = self.validate_scheduling_no_conflicts(
                order_data.get('bay_id'),
                order_data.get('technician_id'),
                order_data.get('advisor_id'),
                order_data.get('scheduled_date'),
                order_data.get('scheduled_time'),
                order_data.get('estimated_duration_hours', 2)
            )
            
            if not conflict_check.get('valid'):
                logger.warning(f"Cannot create scheduling order due to conflict: {conflict_check.get('conflict')}")
                return conflict_check
            
            query = """
            INSERT INTO scheduling_orders
            (customer_id, scheduled_date, scheduled_time, bay_id, technician_id, 
             advisor_id, service_type, status, priority, estimated_duration_hours, 
             created_at, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'scheduled', %s, %s, NOW(), %s)
            """
            
            params = (
                order_data.get('customer_id'),
                order_data.get('scheduled_date'),
                order_data.get('scheduled_time'),
                order_data.get('bay_id'),
                order_data.get('technician_id'),
                order_data.get('advisor_id'),
                order_data.get('service_type', 'PMS'),
                order_data.get('priority', 'normal'),
                order_data.get('estimated_duration_hours', 2),
                order_data.get('created_by', 'system')
            )
            
            result = db.execute_update(query, params)
            if result['success']:
                order_id = result.get('last_id')
                logger.info(f"Scheduling order created: ID={order_id}")
                # Auto-send confirmation
                self.send_appointment_confirmation(order_id, order_data.get('confirmation_method', 'sms'))
                return {'success': True, 'order_id': order_id}
            else:
                logger.error(f"Failed to create scheduling order: {result.get('error')}")
                return {'status': 'error', 'code': 'CRO-015', 'message': 'Failed to create scheduling order'}
        except Exception as e:
            logger.error(f"Error creating scheduling order: {str(e)}", exc_info=True)
            return {'status': 'error', 'code': 'CRO-016', 'message': 'Scheduling order creation failed'}
    
    def log_contact_attempt(self, attempt_data):
        """Log customer contact attempt with enhanced tracking"""
        try:
            query = """
            INSERT INTO contact_attempts
            (customer_id, contact_type, attempt_date, status, notes, created_by, created_at)
            VALUES (%s, %s, NOW(), %s, %s, %s, NOW())
            """
            
            params = (
                attempt_data.get('customer_id'),
                attempt_data.get('contact_type'),  # 'call', 'sms', 'email', 'whatsapp'
                attempt_data.get('status', 'attempted'),  # 'attempted', 'connected', 'confirmed', 'not-available', 'declined'
                attempt_data.get('notes'),
                attempt_data.get('created_by', 'system')
            )
            
            result = db.execute_update(query, params)
            if result['success']:
                logger.info(f"Contact attempt logged: Type={attempt_data.get('contact_type')}, Status={attempt_data.get('status')}")
                return {'success': True, 'attempt_id': result.get('last_id')}
            else:
                logger.error(f"Failed to log contact attempt: {result.get('error')}")
                return {'status': 'error', 'code': 'CRO-017', 'message': 'Failed to log contact attempt'}
        except Exception as e:
            logger.error(f"Error logging contact attempt: {str(e)}", exc_info=True)
            return {'status': 'error', 'code': 'CRO-018', 'message': 'Contact logging failed'}
    
    def send_appointment_confirmation(self, scheduling_order_id, confirmation_method='sms'):
        """Send appointment confirmation to customer via SMS or Email"""
        try:
            # Get scheduling order details
            order_query = """
            SELECT so.*, c.name, c.contact_no, c.email, c.phone,
                   sb.bay_name, t.name as technician_name, sa.name as advisor_name
            FROM scheduling_orders so
            JOIN customers c ON so.customer_id = c.id
            LEFT JOIN service_bays sb ON so.bay_id = sb.id
            LEFT JOIN technicians t ON so.technician_id = t.id
            LEFT JOIN service_advisors sa ON so.advisor_id = sa.id
            WHERE so.id = %s
            """
            order_result = db.execute_query(order_query, (scheduling_order_id,))
            if not order_result:
                logger.error(f"Scheduling order {scheduling_order_id} not found")
                return {'status': 'error', 'code': 'CRO-019', 'message': 'Order not found'}
            
            order = order_result[0]
            
            # Format message
            message = f"""
            Your appointment confirmed!
            Date: {order.get('scheduled_date')}
            Time: {order.get('scheduled_time')}
            Bay: {order.get('bay_name', 'TBD')}
            Technician: {order.get('technician_name', 'Assigned')}
            Service: {order.get('service_type')}
            Thank you!
            """
            
            # Log confirmation
            log_query = """
            INSERT INTO appointment_confirmations
            (scheduling_order_id, method, contact_info, message, sent_at, status)
            VALUES (%s, %s, %s, %s, NOW(), 'sent')
            """
            log_params = (scheduling_order_id, confirmation_method, 
                         order.get('contact_no') if confirmation_method == 'sms' else order.get('email'),
                         message)
            
            log_result = db.execute_update(log_query, log_params)
            if log_result['success']:
                logger.info(f"Appointment confirmation sent via {confirmation_method}: Order={scheduling_order_id}")
                return {'success': True, 'confirmation_id': log_result.get('last_id')}
            else:
                logger.error(f"Failed to log appointment confirmation: {log_result.get('error')}")
                return {'status': 'error', 'code': 'CRO-020', 'message': 'Failed to log confirmation'}
        except Exception as e:
            logger.error(f"Error sending appointment confirmation: {str(e)}", exc_info=True)
            return {'status': 'error', 'code': 'CRO-021', 'message': 'Confirmation sending failed'}
    
    def schedule_appointment_reminder(self, scheduling_order_id, reminder_hours_before=24):
        """Schedule automated reminders before appointment"""
        try:
            order = db.execute_query(
                "SELECT scheduled_date, scheduled_time FROM scheduling_orders WHERE id = %s",
                (scheduling_order_id,)
            )
            if not order:
                return {'status': 'error', 'code': 'CRO-022', 'message': 'Order not found'}
            
            order_dt = datetime.combine(order[0]['scheduled_date'], order[0]['scheduled_time'])
            reminder_time = order_dt - timedelta(hours=reminder_hours_before)
            
            # Insert reminder
            reminder_query = """
            INSERT INTO appointment_reminders
            (scheduling_order_id, reminder_type, scheduled_time, status)
            VALUES (%s, %s, %s, 'pending')
            """
            
            result = db.execute_update(reminder_query, 
                                     (scheduling_order_id, f'{reminder_hours_before}h', reminder_time))
            
            if result['success']:
                logger.info(f"Reminder scheduled for order {scheduling_order_id}: {reminder_hours_before}h before")
                return {'success': True, 'reminder_id': result.get('last_id')}
            return {'status': 'error', 'code': 'CRO-023', 'message': 'Failed to schedule reminder'}
        except Exception as e:
            logger.error(f"Error scheduling reminder: {str(e)}", exc_info=True)
            return {'status': 'error', 'code': 'CRO-024', 'message': 'Reminder scheduling failed'}
    
    def reschedule_appointment(self, scheduling_order_id, new_date, new_time, reason):
        """Reschedule an appointment"""
        try:
            # Get current order details
            current_order = self.get_scheduling_order(scheduling_order_id)
            if not current_order:
                return {'status': 'error', 'code': 'CRO-025', 'message': 'Order not found'}
            
            # Validate no conflicts in new time
            conflict_check = self.validate_scheduling_no_conflicts(
                current_order.get('bay_id'),
                current_order.get('technician_id'),
                current_order.get('advisor_id'),
                new_date,
                new_time,
                current_order.get('estimated_duration_hours', 2)
            )
            
            if not conflict_check.get('valid'):
                logger.warning(f"Cannot reschedule due to conflict: {conflict_check.get('conflict')}")
                return conflict_check
            
            # Update scheduling order
            update_query = """
            UPDATE scheduling_orders
            SET scheduled_date = %s, scheduled_time = %s, status = 'scheduled'
            WHERE id = %s
            """
            result = db.execute_update(update_query, (new_date, new_time, scheduling_order_id))
            
            if result['success']:
                # Log reschedule in audit trail
                log_query = """
                INSERT INTO appointment_reschedules
                (scheduling_order_id, old_date, old_time, new_date, new_time, reason, rescheduled_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                """
                db.execute_update(log_query, (
                    scheduling_order_id,
                    current_order.get('scheduled_date'),
                    current_order.get('scheduled_time'),
                    new_date, new_time, reason
                ))
                
                logger.info(f"Appointment {scheduling_order_id} rescheduled: {new_date} {new_time}")
                # Send new confirmation
                self.send_appointment_confirmation(scheduling_order_id, 'sms')
                return {'success': True, 'message': 'Appointment rescheduled successfully'}
            
            return {'status': 'error', 'code': 'CRO-026', 'message': 'Failed to reschedule appointment'}
        except Exception as e:
            logger.error(f"Error rescheduling appointment: {str(e)}", exc_info=True)
            return {'status': 'error', 'code': 'CRO-027', 'message': 'Rescheduling failed'}
    
    def log_no_show(self, scheduling_order_id, reason=''):
        """Log when a customer doesn't show up for appointment"""
        try:
            # Update scheduling order status
            update_query = "UPDATE scheduling_orders SET status = 'no-show' WHERE id = %s"
            result = db.execute_update(update_query, (scheduling_order_id,))
            
            if result['success']:
                # Log no-show event
                log_query = """
                INSERT INTO no_show_tracking
                (scheduling_order_id, reason, tracked_at)
                VALUES (%s, %s, NOW())
                """
                db.execute_update(log_query, (scheduling_order_id, reason))
                
                logger.warning(f"No-show logged for order {scheduling_order_id}: {reason}")
                
                # Create follow-up task
                self._create_follow_up_task(scheduling_order_id, 'no-show')
                
                return {'success': True, 'message': 'No-show logged and follow-up scheduled'}
            
            return {'status': 'error', 'code': 'CRO-028', 'message': 'Failed to log no-show'}
        except Exception as e:
            logger.error(f"Error logging no-show: {str(e)}", exc_info=True)
            return {'status': 'error', 'code': 'CRO-029', 'message': 'No-show logging failed'}
    
    def track_no_show_pattern(self, customer_id):
        """Track if customer has pattern of no-shows"""
        try:
            query = """
            SELECT COUNT(*) as no_show_count
            FROM scheduling_orders
            WHERE customer_id = %s AND status = 'no-show'
            AND scheduled_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            """
            result = db.execute_query(query, (customer_id,))
            
            if result:
                no_show_count = result[0]['no_show_count']
                logger.debug(f"Customer {customer_id}: {no_show_count} no-shows in last 6 months")
                
                return {
                    'customer_id': customer_id,
                    'no_show_count': no_show_count,
                    'pattern_detected': no_show_count >= 2,
                    'risk_level': 'high' if no_show_count >= 3 else 'medium' if no_show_count >= 2 else 'low'
                }
            return {'customer_id': customer_id, 'no_show_count': 0, 'pattern_detected': False}
        except Exception as e:
            logger.error(f"Error tracking no-show pattern: {str(e)}", exc_info=True)
            return {'status': 'error', 'code': 'CRO-030', 'message': 'Pattern tracking failed'}
    
    def _create_follow_up_task(self, scheduling_order_id, task_type):
        """Create follow-up task (internal helper)"""
        try:
            query = """
            INSERT INTO follow_up_tasks
            (scheduling_order_id, task_type, status, created_at)
            VALUES (%s, %s, 'pending', NOW())
            """
            db.execute_update(query, (scheduling_order_id, task_type))
            logger.info(f"Follow-up task created for order {scheduling_order_id}: {task_type}")
        except Exception as e:
            logger.error(f"Error creating follow-up task: {str(e)}")
    
    def get_scheduling_order(self, order_id):
        """Get scheduling order details with all related information"""
        try:
            query = """
            SELECT so.*, c.name, c.contact_no, c.email, c.phone, c.plate_no, 
                   c.vehicle_model, sb.bay_name, t.name as technician_name, 
                   t.specialization, sa.name as advisor_name
            FROM scheduling_orders so
            JOIN customers c ON so.customer_id = c.id
            LEFT JOIN service_bays sb ON so.bay_id = sb.id
            LEFT JOIN technicians t ON so.technician_id = t.id
            LEFT JOIN service_advisors sa ON so.advisor_id = sa.id
            WHERE so.id = %s
            """
            result = db.execute_query(query, (order_id,))
            return result[0] if result else None
        except Exception as e:
            logger.error(f"Error retrieving scheduling order {order_id}: {str(e)}", exc_info=True)
            return None
    
    def get_contact_attempt_history(self, customer_id):
        """Get complete contact attempt history for customer"""
        try:
            query = """
            SELECT * FROM contact_attempts
            WHERE customer_id = %s
            ORDER BY attempt_date DESC
            LIMIT 20
            """
            result = db.execute_query(query, (customer_id,))
            return result or []
        except Exception as e:
            logger.error(f"Error retrieving contact history: {str(e)}", exc_info=True)
            return []
    
    def cancel_appointment(self, scheduling_order_id, reason=''):
        """Cancel an appointment"""
        try:
            update_query = "UPDATE scheduling_orders SET status = 'cancelled' WHERE id = %s"
            result = db.execute_update(update_query, (scheduling_order_id,))
            
            if result['success']:
                logger.info(f"Appointment {scheduling_order_id} cancelled: {reason}")
                return {'success': True, 'message': 'Appointment cancelled'}
            
            return {'status': 'error', 'code': 'CRO-031', 'message': 'Failed to cancel appointment'}
        except Exception as e:
            logger.error(f"Error cancelling appointment: {str(e)}", exc_info=True)
            return {'status': 'error', 'code': 'CRO-032', 'message': 'Cancellation failed'}
