from database import db
from datetime import datetime, timedelta

class VehicleHandoverService:
    
    @staticmethod
    def create_handover(service_order_id, job_wrapup_id, technician_id, customer_id, final_inspection_notes):
        """Create a new vehicle handover record"""
        try:
            cursor = db.get_cursor()
            
            handover_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            query = """
            INSERT INTO vehicle_handovers 
            (service_order_id, job_wrapup_id, handover_date, technician_id, customer_id, final_inspection_notes, handover_status)
            VALUES (%s, %s, %s, %s, %s, %s, 'pending')
            """
            cursor.execute(query, (service_order_id, job_wrapup_id, handover_date, technician_id, customer_id, final_inspection_notes))
            handover_id = cursor.lastrowid
            db.commit()
            
            return {
                'handover_id': handover_id,
                'service_order_id': service_order_id,
                'job_wrapup_id': job_wrapup_id,
                'status': 'pending',
                'created_at': handover_date
            }
        except Exception as e:
            raise Exception(f"Error creating handover: {str(e)}")
    
    @staticmethod
    def add_handover_item(handover_id, item_type, item_description, quantity, condition_before):
        """Add an item to the handover checklist"""
        try:
            cursor = db.get_cursor()
            
            query = """
            INSERT INTO handover_items 
            (handover_id, item_type, item_description, quantity, condition_before, item_verified)
            VALUES (%s, %s, %s, %s, %s, FALSE)
            """
            cursor.execute(query, (handover_id, item_type, item_description, quantity, condition_before))
            item_id = cursor.lastrowid
            db.commit()
            
            return {
                'item_id': item_id,
                'handover_id': handover_id,
                'item_type': item_type,
                'quantity': quantity,
                'status': 'pending'
            }
        except Exception as e:
            raise Exception(f"Error adding handover item: {str(e)}")
    
    @staticmethod
    def record_signature(handover_id, signatory_type, signatory_name, signatory_role, signature_image, printed_name, id_reference):
        """Record digital signature for handover"""
        try:
            cursor = db.get_cursor()
            
            signature_timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            query = """
            INSERT INTO handover_signatures 
            (handover_id, signatory_type, signatory_name, signatory_role, signature_image, signature_timestamp, printed_name, id_or_reference)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(query, (handover_id, signatory_type, signatory_name, signatory_role, signature_image, signature_timestamp, printed_name, id_reference))
            signature_id = cursor.lastrowid
            db.commit()
            
            return {
                'signature_id': signature_id,
                'handover_id': handover_id,
                'signatory_type': signatory_type,
                'signature_timestamp': signature_timestamp
            }
        except Exception as e:
            raise Exception(f"Error recording signature: {str(e)}")
    
    @staticmethod
    def verify_handover_item(item_id, condition_after, verified_by):
        """Verify and mark handover item as complete"""
        try:
            cursor = db.get_cursor()
            
            query = """
            UPDATE handover_items 
            SET item_verified = TRUE, condition_after = %s, verified_by = %s
            WHERE id = %s
            """
            cursor.execute(query, (condition_after, verified_by, item_id))
            db.commit()
            
            return {
                'item_id': item_id,
                'status': 'verified',
                'verified_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
        except Exception as e:
            raise Exception(f"Error verifying item: {str(e)}")
    
    @staticmethod
    def complete_handover(handover_id, vehicle_cleanliness, fuel_level_final, mileage_final, overall_condition, all_items_returned):
        """Mark handover as completed"""
        try:
            cursor = db.get_cursor()
            
            completion_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
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
            cursor.execute(query, (completion_date, vehicle_cleanliness, fuel_level_final, mileage_final, overall_condition, all_items_returned, handover_id))
            db.commit()
            
            return {
                'handover_id': handover_id,
                'status': 'completed',
                'completion_date': completion_date
            }
        except Exception as e:
            raise Exception(f"Error completing handover: {str(e)}")
    
    @staticmethod
    def get_pending_handovers(date_from=None):
        """Get all pending handovers"""
        try:
            cursor = db.get_cursor()
            
            if date_from:
                query = """
                SELECT vh.id, vh.service_order_id, vh.handover_date, vh.technician_id, 
                       vh.customer_id, vh.handover_status, vh.final_inspection_notes
                FROM vehicle_handovers vh
                WHERE vh.handover_status = 'pending' AND DATE(vh.handover_date) >= %s
                ORDER BY vh.handover_date DESC
                """
                cursor.execute(query, (date_from,))
            else:
                query = """
                SELECT vh.id, vh.service_order_id, vh.handover_date, vh.technician_id, 
                       vh.customer_id, vh.handover_status, vh.final_inspection_notes
                FROM vehicle_handovers vh
                WHERE vh.handover_status = 'pending'
                ORDER BY vh.handover_date DESC
                """
                cursor.execute(query)
            
            handovers = cursor.fetchall()
            
            return [tuple(handover) for handover in handovers]
        except Exception as e:
            raise Exception(f"Error fetching pending handovers: {str(e)}")
    
    @staticmethod
    def get_handover_details(handover_id):
        """Get complete handover details with items and signatures"""
        try:
            cursor = db.get_cursor()
            
            # Get handover details
            query = """
            SELECT id, service_order_id, job_wrapup_id, handover_date, technician_id, customer_id,
                   final_inspection_notes, vehicle_cleanliness, fuel_level_final, mileage_final,
                   overall_condition, all_items_returned, handover_status
            FROM vehicle_handovers
            WHERE id = %s
            """
            cursor.execute(query, (handover_id,))
            handover = cursor.fetchone()
            
            if not handover:
                raise Exception("Handover not found")
            
            # Get items
            query = """
            SELECT id, item_type, item_description, quantity, condition_before, 
                   condition_after, item_verified, verified_by
            FROM handover_items
            WHERE handover_id = %s
            ORDER BY id
            """
            cursor.execute(query, (handover_id,))
            items = cursor.fetchall()
            
            # Get signatures
            query = """
            SELECT id, signatory_type, signatory_name, signatory_role, 
                   signature_timestamp, printed_name
            FROM handover_signatures
            WHERE handover_id = %s
            ORDER BY signature_timestamp
            """
            cursor.execute(query, (handover_id,))
            signatures = cursor.fetchall()
            
            return {
                'handover': tuple(handover),
                'items': [tuple(item) for item in items],
                'signatures': [tuple(sig) for sig in signatures]
            }
        except Exception as e:
            raise Exception(f"Error fetching handover details: {str(e)}")
    
    @staticmethod
    def get_handover_summary(date_from=None, date_to=None):
        """Get handover summary statistics"""
        try:
            cursor = db.get_cursor()
            
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
            cursor.execute(query, params)
            stats = cursor.fetchall()
            
            # Get total items verified
            query = "SELECT COUNT(*) as total FROM handover_items WHERE item_verified = TRUE"
            cursor.execute(query)
            verified_items = cursor.fetchone()
            
            return {
                'by_status': [tuple(stat) for stat in stats],
                'total_verified_items': verified_items[0] if verified_items else 0
            }
        except Exception as e:
            raise Exception(f"Error fetching handover summary: {str(e)}")
