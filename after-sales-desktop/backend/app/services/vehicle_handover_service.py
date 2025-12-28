from database import db
from datetime import datetime, timedelta

class VehicleHandoverService:
    
    @staticmethod
    def create_handover(service_order_id, job_wrapup_id, technician_id, customer_id, final_inspection_notes):
        """Create a new vehicle handover record"""
        try:
            handover_date = datetime.now()
            
            query = """
            INSERT INTO vehicle_handovers 
            (service_order_id, job_wrapup_id, handover_date, technician_id, customer_id, final_inspection_notes, handover_status)
            VALUES (%s, %s, %s, %s, %s, %s, 'pending')
            """
            result = db.execute_update(query, (service_order_id, job_wrapup_id, handover_date, technician_id, customer_id, final_inspection_notes))
            
            if result['success']:
                handover_id = result.get('last_id')
                return {
                    'handover_id': handover_id,
                    'service_order_id': service_order_id,
                    'job_wrapup_id': job_wrapup_id,
                    'status': 'pending',
                    'created_at': handover_date.isoformat()
                }
            raise Exception("Failed to create handover")
        except Exception as e:
            raise Exception(f"Error creating handover: {str(e)}")
    
    @staticmethod
    def add_handover_item(handover_id, item_type, item_description, quantity, condition_before):
        """Add an item to the handover checklist"""
        try:
            query = """
            INSERT INTO handover_items 
            (handover_id, item_type, item_description, quantity, condition_before, item_verified)
            VALUES (%s, %s, %s, %s, %s, FALSE)
            """
            result = db.execute_update(query, (handover_id, item_type, item_description, quantity, condition_before))
            
            if result['success']:
                item_id = result.get('last_id')
                return {
                    'item_id': item_id,
                    'handover_id': handover_id,
                    'item_type': item_type,
                    'quantity': quantity,
                    'status': 'pending'
                }
            raise Exception("Failed to add handover item")
        except Exception as e:
            raise Exception(f"Error adding handover item: {str(e)}")
    
    @staticmethod
    def record_signature(handover_id, signatory_type, signatory_name, signatory_role, signature_image, printed_name, id_reference):
        """Record digital signature for handover"""
        try:
            signature_timestamp = datetime.now()
            
            query = """
            INSERT INTO handover_signatures 
            (handover_id, signatory_type, signatory_name, signatory_role, signature_image, signature_timestamp, printed_name, id_or_reference)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            result = db.execute_update(query, (handover_id, signatory_type, signatory_name, signatory_role, signature_image, signature_timestamp, printed_name, id_reference))
            
            if result['success']:
                signature_id = result.get('last_id')
                return {
                    'signature_id': signature_id,
                    'handover_id': handover_id,
                    'signatory_type': signatory_type,
                    'signature_timestamp': signature_timestamp.isoformat()
                }
            raise Exception("Failed to record signature")
        except Exception as e:
            raise Exception(f"Error recording signature: {str(e)}")
    
    @staticmethod
    def verify_handover_item(item_id, condition_after, verified_by):
        """Verify and mark handover item as complete"""
        try:
            query = """
            UPDATE handover_items 
            SET item_verified = TRUE, condition_after = %s, verified_by = %s
            WHERE id = %s
            """
            result = db.execute_update(query, (condition_after, verified_by, item_id))
            
            if result['success']:
                return {
                    'item_id': item_id,
                    'status': 'verified',
                    'verified_at': datetime.now().isoformat()
                }
            raise Exception("Failed to verify item")
        except Exception as e:
            raise Exception(f"Error verifying item: {str(e)}")
    
    @staticmethod
    def complete_handover(handover_id, vehicle_cleanliness, fuel_level_final, mileage_final, overall_condition, all_items_returned):
        """Mark handover as completed"""
        try:
            completion_date = datetime.now()
            
            query = """
            UPDATE vehicle_handovers 
            SET handover_status = 'completed', 
                customer_signature_date = %s,
                vehicle_cleanliness = %s,
                fuel_level_final = %s,
                mileage_final = %s,
                overall_condition = %s,
                all_items_returned = %s
            WHERE id = %s
            """
            result = db.execute_update(query, (completion_date, vehicle_cleanliness, fuel_level_final, mileage_final, overall_condition, all_items_returned, handover_id))
            
            if result['success']:
                return {
                    'handover_id': handover_id,
                    'status': 'completed',
                    'completion_date': completion_date.isoformat()
                }
            raise Exception("Failed to complete handover")
        except Exception as e:
            raise Exception(f"Error completing handover: {str(e)}")
    
    @staticmethod
    def get_pending_handovers(date_from=None):
        """Get all pending handovers"""
        try:
            if date_from:
                query = """
                SELECT vh.id, vh.service_order_id, vh.handover_date, vh.technician_id, 
                       vh.customer_id, vh.handover_status, vh.final_inspection_notes
                FROM vehicle_handovers vh
                WHERE vh.handover_status = 'pending' AND DATE(vh.handover_date) >= %s
                ORDER BY vh.handover_date DESC
                """
                handovers = db.execute_query(query, (date_from,)) or []
            else:
                query = """
                SELECT vh.id, vh.service_order_id, vh.handover_date, vh.technician_id, 
                       vh.customer_id, vh.handover_status, vh.final_inspection_notes
                FROM vehicle_handovers vh
                WHERE vh.handover_status = 'pending'
                ORDER BY vh.handover_date DESC
                """
                handovers = db.execute_query(query) or []
            
            return [tuple(h.values()) if isinstance(h, dict) else tuple(h) for h in handovers]
        except Exception as e:
            raise Exception(f"Error fetching pending handovers: {str(e)}")
    
    @staticmethod
    def get_completed_handovers(date_from=None, date_to=None):
        """Get all completed handovers"""
        try:
            query = """
            SELECT vh.id, vh.service_order_id, vh.handover_date, vh.technician_id, 
                   vh.customer_id, vh.handover_status, vh.final_inspection_notes,
                   vh.vehicle_cleanliness, vh.mileage_final, vh.customer_signature_date
            FROM vehicle_handovers vh
            WHERE vh.handover_status = 'completed'
            """
            conditions = []
            params = []
            
            if date_from:
                conditions.append("DATE(vh.handover_date) >= %s")
                params.append(date_from)
            if date_to:
                conditions.append("DATE(vh.handover_date) <= %s")
                params.append(date_to)
            
            if conditions:
                query += " AND " + " AND ".join(conditions)
            
            query += " ORDER BY vh.handover_date DESC"
            
            handovers = db.execute_query(query, tuple(params)) if params else db.execute_query(query)
            handovers = handovers or []
            
            return [tuple(h.values()) if isinstance(h, dict) else tuple(h) for h in handovers]
        except Exception as e:
            raise Exception(f"Error fetching completed handovers: {str(e)}")
    
    @staticmethod
    def get_handover_details(handover_id):
        """Get complete handover details with items and signatures"""
        try:
            # Get handover details
            query = """
            SELECT id, service_order_id, job_wrapup_id, handover_date, technician_id, customer_id,
                   final_inspection_notes, vehicle_cleanliness, fuel_level_final, mileage_final,
                   overall_condition, all_items_returned, handover_status
            FROM vehicle_handovers
            WHERE id = %s
            """
            handover_result = db.execute_query(query, (handover_id,))
            
            if not handover_result:
                raise Exception("Handover not found")
            
            handover = handover_result[0]
            
            # Get items
            query = """
            SELECT id, item_type, item_description, quantity, condition_before, 
                   condition_after, item_verified, verified_by
            FROM handover_items
            WHERE handover_id = %s
            ORDER BY id
            """
            items = db.execute_query(query, (handover_id,)) or []
            
            # Get signatures
            query = """
            SELECT id, signatory_type, signatory_name, signatory_role, 
                   signature_timestamp, printed_name
            FROM handover_signatures
            WHERE handover_id = %s
            ORDER BY signature_timestamp
            """
            signatures = db.execute_query(query, (handover_id,)) or []
            
            return {
                'handover': tuple(handover.values()) if isinstance(handover, dict) else tuple(handover),
                'items': [tuple(item.values()) if isinstance(item, dict) else tuple(item) for item in items],
                'signatures': [tuple(sig.values()) if isinstance(sig, dict) else tuple(sig) for sig in signatures]
            }
        except Exception as e:
            raise Exception(f"Error fetching handover details: {str(e)}")
    
    @staticmethod
    def get_handover_summary(date_from=None, date_to=None):
        """Get handover summary statistics"""
        try:
            query = "SELECT COUNT(*) as total, handover_status FROM vehicle_handovers"
            conditions = []
            params = []
            
            if date_from:
                conditions.append("DATE(handover_date) >= %s")
                params.append(date_from)
            if date_to:
                conditions.append("DATE(handover_date) <= %s")
                params.append(date_to)
            
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            
            query += " GROUP BY handover_status"
            stats = db.execute_query(query, tuple(params)) or []
            
            # Get total items verified
            query = "SELECT COUNT(*) as total FROM handover_items WHERE item_verified = TRUE"
            verified_result = db.execute_query(query) or []
            verified_items = verified_result[0] if verified_result else {'total': 0}
            
            return {
                'by_status': [tuple(stat.values()) if isinstance(stat, dict) else tuple(stat) for stat in stats],
                'total_verified_items': verified_items.get('total', 0) if isinstance(verified_items, dict) else verified_items[0]
            }
        except Exception as e:
            raise Exception(f"Error fetching handover summary: {str(e)}")
