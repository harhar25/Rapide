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

gatepass_service = GatepassService()
