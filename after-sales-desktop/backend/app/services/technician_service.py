from database import db


class TechnicianService:
    def resolve_technician(self, username, name=None):
        username = str(username).strip() if username else ''
        name = str(name).strip() if name else ''

        if username:
            result = db.execute_query(
                "SELECT id, name, employee_id FROM technicians WHERE employee_id = %s LIMIT 1",
                (username,),
            )
            if result:
                row = result[0]
                return {
                    'technician_id': row.get('id'),
                    'technician_name': row.get('name'),
                    'employee_id': row.get('employee_id'),
                    'matched_by': 'employee_id'
                }

            # If technician account exists in personnel but is missing in technicians table,
            # auto-provision the technicians row to keep the system usable.
            personnel = db.execute_query(
                """
                SELECT username, name
                FROM personnel
                WHERE username = %s AND role = 'technician' AND status = 'active'
                LIMIT 1
                """,
                (username,),
            )
            if personnel:
                p = personnel[0]
                insert_name = (p.get('name') or name or username).strip()
                insert_query = """
                INSERT INTO technicians (name, employee_id, status)
                VALUES (%s, %s, 'active')
                """
                created = db.execute_update(insert_query, (insert_name, username))
                if created.get('success'):
                    tech = db.execute_query(
                        "SELECT id, name, employee_id FROM technicians WHERE employee_id = %s LIMIT 1",
                        (username,),
                    )
                    if tech:
                        row = tech[0]
                        return {
                            'technician_id': row.get('id'),
                            'technician_name': row.get('name'),
                            'employee_id': row.get('employee_id'),
                            'matched_by': 'auto_provisioned_employee_id'
                        }

        if name:
            result = db.execute_query(
                "SELECT id, name, employee_id FROM technicians WHERE name = %s LIMIT 1",
                (name,),
            )
            if result:
                row = result[0]
                return {
                    'technician_id': row.get('id'),
                    'technician_name': row.get('name'),
                    'employee_id': row.get('employee_id'),
                    'matched_by': 'name'
                }

        return None

    def get_jobs(self, technician_id, status=None):
        where = "WHERE ta.technician_id = %s"
        params = [technician_id]

        if status:
            where += " AND ta.status = %s"
            params.append(status)

        query = f"""
        SELECT 
            ta.id as assignment_id,
            ta.service_order_id,
            ta.technician_id,
            ta.status as assignment_status,
            ta.assigned_at,
            ta.clock_in_time,
            ta.clock_out_time,
            ta.labor_hours,
            ta.notes,
            so.vehicle_plate_no,
            so.service_type,
            so.status as service_order_status,
            so.estimated_completion_time,
            c.name as customer_name,
            c.vehicle_model
        FROM technician_assignments ta
        JOIN service_orders so ON ta.service_order_id = so.id
        LEFT JOIN customers c ON so.customer_id = c.id
        {where}
        ORDER BY ta.assigned_at DESC
        """

        results = db.execute_query(query, tuple(params)) or []
        return results

    def update_assignment_notes(self, assignment_id, technician_id, notes):
        assignment_id = int(assignment_id)
        technician_id = int(technician_id)
        notes = str(notes) if notes is not None else ''

        query = """
        UPDATE technician_assignments
        SET notes = %s
        WHERE id = %s AND technician_id = %s
        """
        result = db.execute_update(query, (notes, assignment_id, technician_id))
        return result.get('success') and (result.get('affected_rows', 0) != 0)
