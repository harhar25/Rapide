import json

from database import db


class AuditService:
    def log(self, operation_type, entity_type, entity_id=None, user_id=None, user_name=None,
            operation_details=None, old_values=None, new_values=None, status='success', error_message=None,
            ip_address=None, browser_info=None):
        if old_values is not None and not isinstance(old_values, str):
            old_values = json.dumps(old_values, default=str)

        if new_values is not None and not isinstance(new_values, str):
            new_values = json.dumps(new_values, default=str)

        query = """
        INSERT INTO audit_logs
        (operation_type, entity_type, entity_id, user_id, user_name, ip_address, browser_info,
         operation_details, old_values, new_values, status, error_message, timestamp)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """

        params = (
            operation_type,
            entity_type,
            entity_id,
            user_id,
            user_name,
            ip_address,
            browser_info,
            operation_details,
            old_values,
            new_values,
            status,
            error_message,
        )

        return db.execute_update(query, params)
