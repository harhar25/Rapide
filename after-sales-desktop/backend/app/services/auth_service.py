from database import db
from datetime import datetime

class AuthService:
    """Authentication and user management service"""
    
    # Default admin credentials
    ADMIN_USERNAME = 'admin'
    ADMIN_PASSWORD = 'admin123'
    
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
        query = """
        INSERT INTO personnel (username, password, name, role, email, status, created_at)
        VALUES (%s, %s, %s, %s, %s, 'active', NOW())
        """
        
        params = (
            personnel_data.get('username'),
            personnel_data.get('password'),
            personnel_data.get('name'),
            personnel_data.get('role'),
            personnel_data.get('email', '')
        )
        
        result = db.execute_update(query, params)
        return result.get('last_id') if result['success'] else None
    
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
        query = """
        UPDATE personnel
        SET name = %s, email = %s, role = %s
        WHERE id = %s
        """
        
        params = (
            personnel_data.get('name'),
            personnel_data.get('email'),
            personnel_data.get('role'),
            personnel_id
        )
        
        result = db.execute_update(query, params)
        return result['success']
    
    def deactivate_personnel(self, personnel_id):
        """Deactivate personnel"""
        query = "UPDATE personnel SET status = 'inactive' WHERE id = %s"
        result = db.execute_update(query, (personnel_id,))
        return result['success']
    
    def verify_admin(self, username, password):
        """Verify if user is admin"""
        return username == self.ADMIN_USERNAME and password == self.ADMIN_PASSWORD
