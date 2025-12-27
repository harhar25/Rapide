from database import db
from datetime import datetime

class AuthService:
    """Authentication and user management service"""
    
    # Default admin credentials
    ADMIN_USERNAME = 'admin'
    ADMIN_PASSWORD = 'admin123'

    ROLE_ALIASES = {
        'job_controller': 'controller',
        'service_advisor': 'advisor',
        'service-advisor': 'advisor',
        'vehicle-handover': 'vehicle_handover',
        'security-gate': 'security_gate',
        'follow-up': 'follow_up',
    }

    ALLOWED_ROLES = {
        'admin', 'cro', 'technician', 'warehouse', 'manager', 'advisor', 'controller',
        'foreman', 'wrapup', 'jockey', 'billing', 'cashier', 'security_gate',
        'vehicle_handover', 'follow_up'
    }

    def _normalize_role(self, role):
        role = str(role).strip() if role is not None else ''
        role = self.ROLE_ALIASES.get(role, role)
        return role

    def _provision_role_records(self, role, username, name, email=None):
        role = self._normalize_role(role)
        username = str(username).strip() if username else ''
        name = str(name).strip() if name else ''
        email = str(email).strip() if email else ''

        if not username:
            return

        if role == 'technician':
            db.execute_update(
                """
                INSERT INTO technicians (name, employee_id, email, status, hire_date, created_at)
                SELECT %s, %s, %s, 'active', NULL, NOW()
                FROM DUAL
                WHERE NOT EXISTS (SELECT 1 FROM technicians t WHERE t.employee_id = %s)
                """,
                (name or username, username, email, username),
            )
            return

        if role == 'advisor':
            db.execute_update(
                """
                INSERT INTO service_advisors (name, employee_id, email, status, hire_date)
                SELECT %s, %s, %s, 'active', NULL
                FROM DUAL
                WHERE NOT EXISTS (SELECT 1 FROM service_advisors sa WHERE sa.employee_id = %s)
                """,
                (name or username, username, email, username),
            )
            return
    
    def authenticate_user(self, username, password):
        """Authenticate user and return user data with role"""
        # Trim whitespace
        username = str(username).strip() if username else ''
        password = str(password).strip() if password else ''
        
        # Check if admin
        if username == self.ADMIN_USERNAME and password == self.ADMIN_PASSWORD:
            return {
                'id': 0,
                'username': username,
                'name': 'Admin',
                'role': 'admin',
                'email': 'admin@rapide.local'
            }
        
        # Check personnel table
        query = """
        SELECT id, username, name, role, email, status
        FROM personnel
        WHERE username = %s AND password = %s AND status = 'active'
        """
        result = db.execute_query(query, (username, password))
        
        if result:
            user = result[0]
            # Handle both dict and tuple formats
            if isinstance(user, dict):
                return {
                    'id': user.get('id'),
                    'username': user.get('username'),
                    'name': user.get('name'),
                    'role': user.get('role'),
                    'email': user.get('email')
                }
            else:
                return {
                    'id': user[0],
                    'username': user[1],
                    'name': user[2],
                    'role': user[3],
                    'email': user[4]
                }
        
        return None
    
    def register_personnel(self, personnel_data):
        """Register a new personnel (admin only)"""
        role = self._normalize_role(personnel_data.get('role'))
        if not role or role not in self.ALLOWED_ROLES or role == 'admin':
            raise ValueError('Invalid role')

        query = """
        INSERT INTO personnel (username, password, name, role, email, status, created_at)
        VALUES (%s, %s, %s, %s, %s, 'active', NOW())
        """
        
        params = (
            personnel_data.get('username'),
            personnel_data.get('password'),
            personnel_data.get('name'),
            role,
            personnel_data.get('email', '')
        )
        
        result = db.execute_update(query, params)
        if not result.get('success'):
            raise ValueError(result.get('error') or 'Failed to register personnel')

        self._provision_role_records(role, personnel_data.get('username'), personnel_data.get('name'), personnel_data.get('email', ''))
        return result.get('last_id')
    
    def get_all_personnel(self):
        """Get all registered personnel"""
        query = """
        SELECT id, username, name, role, email, status, created_at
        FROM personnel
        ORDER BY created_at DESC
        """
        results = db.execute_query(query) or []
        # Convert dictionaries to tuples for frontend compatibility
        personnel_list = []
        for row in results:
            if isinstance(row, dict):
                personnel_list.append((
                    row.get('id'),
                    row.get('username'),
                    row.get('name'),
                    row.get('role'),
                    row.get('email'),
                    row.get('status'),
                    row.get('created_at')
                ))
            else:
                personnel_list.append(row)
        return personnel_list
    
    def get_personnel_by_role(self, role):
        """Get personnel by role"""
        query = """
        SELECT id, username, name, role, email, status
        FROM personnel
        WHERE role = %s AND status = 'active'
        """
        return db.execute_query(query, (role,)) or []
    
    def update_personnel(self, personnel_id, personnel_data):
        """Update personnel details"""
        role = self._normalize_role(personnel_data.get('role'))
        if not role or role not in self.ALLOWED_ROLES or role == 'admin':
            raise ValueError('Invalid role')

        query = """
        UPDATE personnel
        SET name = %s, email = %s, role = %s
        WHERE id = %s
        """
        
        params = (
            personnel_data.get('name'),
            personnel_data.get('email'),
            role,
            personnel_id
        )
        
        result = db.execute_update(query, params)
        if not result.get('success'):
            raise ValueError(result.get('error') or 'Failed to update personnel')

        u = db.execute_query("SELECT username, name, email FROM personnel WHERE id = %s LIMIT 1", (personnel_id,))
        if u:
            row = u[0]
            self._provision_role_records(role, row.get('username'), row.get('name'), row.get('email'))
        return True
    
    def deactivate_personnel(self, personnel_id):
        """Deactivate personnel"""
        query = "UPDATE personnel SET status = 'inactive' WHERE id = %s"
        result = db.execute_update(query, (personnel_id,))
        return result['success']
    
    def verify_admin(self, username, password):
        """Verify if user is admin"""
        return username == self.ADMIN_USERNAME and password == self.ADMIN_PASSWORD
