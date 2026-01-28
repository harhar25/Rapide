from database import db
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class GatepassService:
    """Gatepass approval and signature validation service (Step 10 & 11)"""
    
    def create_gatepass(self, service_order_id, invoice_id, cashier_id):
        """
        Create gatepass after payment is processed
        Process 9: Cashier signs Gatepass digitally
        """
        try:
            # Generate gatepass number
            gatepass_number = f"GP-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            query = """
            INSERT INTO service_order_documents
            (service_order_id, document_type, file_name, document_data, printed_by, created_at)
            VALUES (%s, 'gatepass', %s, %s, %s, NOW())
            """
            
            import json
            gatepass_data = json.dumps({
                'gatepass_number': gatepass_number,
                'invoice_id': invoice_id,
                'cashier_signature': True,
                'cashier_id': cashier_id,
                'accounting_signature': False,
                'warranty_signature': False,
                'manager_signature': False,
                'status': 'pending_approval',
                'created_at': datetime.now().isoformat()
            })
            
            params = (service_order_id, gatepass_number, gatepass_data, f"CASHIER-{cashier_id}")
            result = db.execute_update(query, params)
            
            if result['success']:
                logger.info(f"Gatepass created: {gatepass_number} for SO {service_order_id}")
                return {
                    'success': True,
                    'gatepass_id': result.get('last_id'),
                    'gatepass_number': gatepass_number,
                    'status': 'pending_approval'
                }
            
            return {'success': False, 'error': 'Failed to create gatepass'}
            
        except Exception as e:
            logger.error(f"Error creating gatepass: {str(e)}", exc_info=True)
            return {'success': False, 'error': str(e)}
    
    def add_signature_to_gatepass(self, gatepass_id, signature_type, signed_by):
        """
        Add signature to gatepass (Cashier, Accounting, Warranty, Manager)
        Process 10: SA secures Manager approval for gatepass (system-logged)
        Process 11: Security checks required signatures
        """
        try:
            # Get current gatepass data
            query_get = """
            SELECT document_data FROM service_order_documents
            WHERE id = %s AND document_type = 'gatepass'
            """
            result = db.execute_query(query_get, (gatepass_id,))
            
            if not result:
                return {'success': False, 'error': 'Gatepass not found'}
            
            import json
            gatepass_data = json.loads(result[0]['document_data'])
            
            # Add signature
            signature_field = f"{signature_type}_signature"
            signer_field = f"{signature_type}_signed_by"
            timestamp_field = f"{signature_type}_signed_at"
            
            gatepass_data[signature_field] = True
            gatepass_data[signer_field] = signed_by
            gatepass_data[timestamp_field] = datetime.now().isoformat()
            
            # Check if all required signatures are present
            required_signatures = ['cashier', 'accounting', 'warranty', 'manager']
            all_signed = all(gatepass_data.get(f"{sig}_signature", False) for sig in required_signatures)
            
            if all_signed:
                gatepass_data['status'] = 'approved'
                gatepass_data['approved_at'] = datetime.now().isoformat()
            
            # Update gatepass
            query_update = """
            UPDATE service_order_documents
            SET document_data = %s, updated_at = NOW()
            WHERE id = %s
            """
            
            update_result = db.execute_update(query_update, (json.dumps(gatepass_data), gatepass_id))
            
            if update_result['success']:
                logger.info(f"Gatepass {gatepass_id}: {signature_type} signature added by {signed_by}")
                return {
                    'success': True,
                    'gatepass_id': gatepass_id,
                    'signature_type': signature_type,
                    'all_signatures_complete': all_signed,
                    'status': gatepass_data['status']
                }
            
            return {'success': False, 'error': 'Failed to add signature'}
            
        except Exception as e:
            logger.error(f"Error adding signature to gatepass: {str(e)}", exc_info=True)
            return {'success': False, 'error': str(e)}
    
    def validate_gatepass_signatures(self, gatepass_number):
        """
        Validate that gatepass has all required signatures
        Process 11: Security scans gatepass barcode, system checks required signatures
        """
        try:
            query = """
            SELECT id, document_data FROM service_order_documents
            WHERE file_name = %s AND document_type = 'gatepass'
            """
            result = db.execute_query(query, (gatepass_number,))
            
            if not result:
                return {
                    'valid': False,
                    'error': 'Gatepass not found',
                    'missing_signatures': []
                }
            
            import json
            gatepass_data = json.loads(result[0]['document_data'])
            
            # Check required signatures
            required_signatures = {
                'cashier': gatepass_data.get('cashier_signature', False),
                'accounting': gatepass_data.get('accounting_signature', False),
                'warranty': gatepass_data.get('warranty_signature', False),
                'manager': gatepass_data.get('manager_signature', False)
            }
            
            missing_signatures = [sig for sig, signed in required_signatures.items() if not signed]
            
            is_valid = len(missing_signatures) == 0
            
            logger.info(f"Gatepass {gatepass_number} validation: Valid={is_valid}, Missing={missing_signatures}")
            
            return {
                'valid': is_valid,
                'gatepass_id': result[0]['id'],
                'gatepass_number': gatepass_number,
                'signatures': required_signatures,
                'missing_signatures': missing_signatures,
                'status': gatepass_data.get('status', 'pending_approval')
            }
            
        except Exception as e:
            logger.error(f"Error validating gatepass: {str(e)}", exc_info=True)
            return {
                'valid': False,
                'error': str(e),
                'missing_signatures': []
            }
    
    def log_vehicle_release(self, service_order_id, gatepass_number, gate_operator_id):
        """
        Log vehicle release after gatepass validation
        Process 11: If valid → system logs Vehicle Released
        """
        try:
            # Validate gatepass first
            validation = self.validate_gatepass_signatures(gatepass_number)
            
            if not validation['valid']:
                logger.warning(f"Cannot release vehicle: Gatepass validation failed - {validation.get('missing_signatures')}")
                return {
                    'success': False,
                    'error': 'Gatepass validation failed',
                    'missing_signatures': validation.get('missing_signatures', [])
                }
            
            # Log gate exit
            from app.services.security_gate_service import SecurityGateService
            security_service = SecurityGateService()
            
            # Get service order details
            so_query = """
            SELECT so.id, c.name, so.vehicle_plate_no, so.customer_id
            FROM service_orders so
            JOIN customers c ON so.customer_id = c.id
            WHERE so.id = %s
            """
            so_result = db.execute_query(so_query, (service_order_id,))
            
            if not so_result:
                return {'success': False, 'error': 'Service order not found'}
            
            so_data = so_result[0]
            
            # Create gate exit log
            access_log_id = security_service.create_access_log(
                service_order_id=service_order_id,
                vehicle_plate_no=so_data['vehicle_plate_no'],
                customer_name=so_data['name'],
                access_type='exit',
                gate_operator_id=gate_operator_id,
                mileage=0,
                vehicle_condition='released',
                badge_scanned=gatepass_number,
                is_authorized=True
            )
            
            # Update service order status
            update_query = """
            UPDATE service_orders
            SET status = 'released', actual_completion_time = NOW()
            WHERE id = %s
            """
            db.execute_update(update_query, (service_order_id,))
            
            logger.info(f"Vehicle released: SO {service_order_id}, Gatepass {gatepass_number}")
            
            return {
                'success': True,
                'service_order_id': service_order_id,
                'gatepass_number': gatepass_number,
                'access_log_id': access_log_id,
                'status': 'released',
                'released_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error logging vehicle release: {str(e)}", exc_info=True)
            return {'success': False, 'error': str(e)}
    
    def get_pending_gatepasses(self):
        """Get gatepasses pending manager approval"""
        try:
            query = """
            SELECT sod.id, sod.file_name as gatepass_number, sod.service_order_id,
                   so.vehicle_plate_no, c.name as customer_name, sod.created_at,
                   sod.document_data
            FROM service_order_documents sod
            JOIN service_orders so ON sod.service_order_id = so.id
            JOIN customers c ON so.customer_id = c.id
            WHERE sod.document_type = 'gatepass'
            ORDER BY sod.created_at DESC
            """
            
            results = db.execute_query(query) or []
            
            gatepasses = []
            for row in results:
                import json
                data = json.loads(row['document_data'])
                
                gatepasses.append({
                    'gatepass_id': row['id'],
                    'gatepass_number': row['gatepass_number'],
                    'service_order_id': row['service_order_id'],
                    'vehicle_plate_no': row['vehicle_plate_no'],
                    'customer_name': row['customer_name'],
                    'created_at': row['created_at'].isoformat() if hasattr(row['created_at'], 'isoformat') else str(row['created_at']),
                    'status': data.get('status', 'pending_approval'),
                    'cashier_signed': data.get('cashier_signature', False),
                    'accounting_signed': data.get('accounting_signature', False),
                    'warranty_signed': data.get('warranty_signature', False),
                    'manager_signed': data.get('manager_signature', False)
                })
            
            return gatepasses
            
        except Exception as e:
            logger.error(f"Error retrieving pending gatepasses: {str(e)}", exc_info=True)
            return []

    def get_service_order_process_status(self, service_order_id):
        """
        Get complete process history for a service order
        Shows all process steps: not catered, skipped, in-progress, completed, pending
        """
        try:
            # Get service order details
            so_query = """
            SELECT so.id, so.status, so.created_at, so.updated_at,
                   c.name as customer_name, c.plate_no as vehicle_plate_no,
                   cv.vehicle_model, cv.color
            FROM service_orders so
            JOIN customers c ON so.customer_id = c.id
            LEFT JOIN customer_vehicles cv ON c.id = cv.customer_id
            WHERE so.id = %s
            """
            so_result = db.execute_query(so_query, (service_order_id,))
            
            if not so_result:
                return {'success': False, 'error': 'Service order not found', 'processes': []}
            
            so_data = so_result[0]
            
            # Define all standard processes in workflow order
            process_steps = [
                {'step': 1, 'name': 'CRO - Appointment & Scheduling', 'type': 'initial'},
                {'step': 2, 'name': 'Service Advisor - Customer Check-In', 'type': 'service_advisor'},
                {'step': 3, 'name': 'Service Advisor - VRC & CIS Creation', 'type': 'service_advisor'},
                {'step': 4, 'name': 'Job Controller - Technician Assignment', 'type': 'job_controller'},
                {'step': 5, 'name': 'Technician - Job Execution', 'type': 'technician'},
                {'step': 6, 'name': 'Foreman - QC Inspection', 'type': 'qc'},
                {'step': 7, 'name': 'Job Wrapup - Labor & Materials', 'type': 'wrapup'},
                {'step': 8, 'name': 'Car Jockey - Vehicle Movement', 'type': 'jockey'},
                {'step': 9, 'name': 'Billing - Invoice Creation', 'type': 'billing'},
                {'step': 10, 'name': 'Cashier - Payment Processing', 'type': 'cashier'},
                {'step': 11, 'name': 'Security Gate - Vehicle Release', 'type': 'security'},
                {'step': 12, 'name': 'Vehicle Handover - Final Delivery', 'type': 'handover'},
            ]
            
            processes_status = []
            
            # Track each process step
            for process_step in process_steps:
                step_status = self._get_process_step_status(service_order_id, process_step)
                processes_status.append(step_status)
            
            # Calculate overall progress
            completed = len([p for p in processes_status if p['status'] == 'completed'])
            skipped = len([p for p in processes_status if p['status'] == 'skipped'])
            in_progress = len([p for p in processes_status if p['status'] == 'in_progress'])
            not_started = len([p for p in processes_status if p['status'] == 'not_started'])
            not_catered = len([p for p in processes_status if p['status'] == 'not_catered'])
            
            logger.info(f"Service Order {service_order_id} Process Status: "
                       f"Completed={completed}, In Progress={in_progress}, "
                       f"Skipped={skipped}, Not Started={not_started}, Not Catered={not_catered}")
            
            return {
                'success': True,
                'service_order_id': service_order_id,
                'customer_name': so_data['customer_name'],
                'vehicle_plate_no': so_data['vehicle_plate_no'],
                'vehicle_model': so_data.get('vehicle_model', 'Unknown'),
                'vehicle_color': so_data.get('color', 'Unknown'),
                'so_status': so_data['status'],
                'processes': processes_status,
                'summary': {
                    'total_steps': len(process_steps),
                    'completed': completed,
                    'in_progress': in_progress,
                    'skipped': skipped,
                    'not_started': not_started,
                    'not_catered': not_catered,
                    'progress_percentage': int((completed / len(process_steps)) * 100) if process_steps else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting service order process status: {str(e)}", exc_info=True)
            return {'success': False, 'error': str(e), 'processes': []}

    def _get_process_step_status(self, service_order_id, process_step):
        """Determine status of a specific process step"""
        step_num = process_step['step']
        step_name = process_step['name']
        step_type = process_step['type']
        
        try:
            # Check for records in relevant tables based on process type
            if step_type == 'initial':
                query = "SELECT id, created_at FROM scheduling_orders WHERE service_order_id = %s LIMIT 1"
                result = db.execute_query(query, (service_order_id,))
                status = 'completed' if result else 'not_started'
                
            elif step_type == 'service_advisor':
                if 'VRC' in step_name:
                    query = "SELECT id, created_at FROM vehicle_report_cards WHERE service_order_id = %s LIMIT 1"
                else:
                    query = "SELECT id, created_at FROM customer_info_sheets WHERE service_order_id = %s LIMIT 1"
                result = db.execute_query(query, (service_order_id,))
                status = 'completed' if result else 'not_started'
                
            elif step_type == 'job_controller':
                query = "SELECT id, assignment_status FROM job_assignments WHERE service_order_id = %s LIMIT 1"
                result = db.execute_query(query, (service_order_id,))
                if result:
                    assignment_status = result[0].get('assignment_status', '').lower()
                    status = 'completed' if assignment_status == 'assigned' else 'in_progress'
                else:
                    status = 'not_started'
                
            elif step_type == 'technician':
                query = """SELECT id, job_status FROM job_assignments 
                          WHERE service_order_id = %s AND job_status IN ('started', 'in-progress', 'completed')
                          LIMIT 1"""
                result = db.execute_query(query, (service_order_id,))
                if result:
                    job_status = result[0].get('job_status', '').lower()
                    if job_status == 'completed':
                        status = 'completed'
                    else:
                        status = 'in_progress'
                else:
                    status = 'not_started'
                
            elif step_type == 'qc':
                query = """SELECT id, inspection_status FROM qc_inspections 
                          WHERE service_order_id = %s ORDER BY created_at DESC LIMIT 1"""
                result = db.execute_query(query, (service_order_id,))
                if result:
                    status = result[0].get('inspection_status', 'pending').lower()
                    if status == 'passed':
                        status = 'completed'
                    elif status == 'failed':
                        status = 'in_progress'
                else:
                    status = 'not_started'
                
            elif step_type == 'wrapup':
                query = "SELECT id, status FROM job_wrapups WHERE service_order_id = %s LIMIT 1"
                result = db.execute_query(query, (service_order_id,))
                if result:
                    status = result[0].get('status', 'pending').lower()
                    status = 'completed' if status == 'completed' else 'in_progress'
                else:
                    status = 'not_started'
                
            elif step_type == 'jockey':
                query = """SELECT id, movement_status FROM vehicle_movements 
                          WHERE service_order_id = %s ORDER BY created_at DESC LIMIT 1"""
                result = db.execute_query(query, (service_order_id,))
                if result:
                    movement_status = result[0].get('movement_status', '').lower()
                    status = 'completed' if movement_status == 'completed' else 'in_progress'
                else:
                    status = 'not_started'
                
            elif step_type == 'billing':
                query = "SELECT id, status FROM invoices WHERE service_order_id = %s LIMIT 1"
                result = db.execute_query(query, (service_order_id,))
                if result:
                    invoice_status = result[0].get('status', '').lower()
                    if invoice_status == 'paid':
                        status = 'completed'
                    elif invoice_status == 'issued':
                        status = 'in_progress'
                    else:
                        status = 'not_started'
                else:
                    status = 'not_started'
                
            elif step_type == 'cashier':
                query = "SELECT id, status FROM daily_transactions WHERE service_order_id = %s LIMIT 1"
                result = db.execute_query(query, (service_order_id,))
                if result:
                    status = 'completed'
                else:
                    status = 'not_started'
                
            elif step_type == 'security':
                query = "SELECT id, access_type FROM gate_access_logs WHERE service_order_id = %s AND access_type = 'exit' LIMIT 1"
                result = db.execute_query(query, (service_order_id,))
                status = 'completed' if result else 'not_started'
                
            elif step_type == 'handover':
                query = "SELECT id, status FROM vehicle_handovers WHERE service_order_id = %s LIMIT 1"
                result = db.execute_query(query, (service_order_id,))
                if result:
                    handover_status = result[0].get('status', '').lower()
                    status = 'completed' if handover_status == 'completed' else 'in_progress'
                else:
                    status = 'not_started'
            else:
                status = 'not_catered'
            
            return {
                'step': step_num,
                'name': step_name,
                'type': step_type,
                'status': status,
                'status_display': self._format_status(status),
                'icon': self._get_status_icon(status)
            }
            
        except Exception as e:
            logger.error(f"Error checking process step {step_num}: {str(e)}", exc_info=True)
            return {
                'step': step_num,
                'name': step_name,
                'type': step_type,
                'status': 'not_catered',
                'status_display': 'Not Catered',
                'icon': '⚠️',
                'error': str(e)
            }

    @staticmethod
    def _format_status(status):
        """Format status for display"""
        status_map = {
            'completed': '✅ Completed',
            'in_progress': '⏳ In Progress',
            'not_started': '⭕ Not Started',
            'skipped': '⏭️ Skipped',
            'not_catered': '⚠️ Not Catered',
            'pending': '⏳ Pending'
        }
        return status_map.get(status.lower(), status)

    @staticmethod
    def _get_status_icon(status):
        """Get status icon emoji"""
        icon_map = {
            'completed': '✅',
            'in_progress': '⏳',
            'not_started': '⭕',
            'skipped': '⏭️',
            'not_catered': '⚠️',
            'pending': '⏳'
        }
        return icon_map.get(status.lower(), '•')

gatepass_service = GatepassService()
