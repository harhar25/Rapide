import os
import mysql.connector
from mysql.connector import Error
from config import Config

class Database:
    """MySQL Database Connection Handler"""
    
    def __init__(self):
        self.connection = None
    
    def connect(self):
        """Establish connection to MySQL database"""
        try:
            self.connection = mysql.connector.connect(
                host=Config.MYSQL_HOST,
                user=Config.MYSQL_USER,
                password=Config.MYSQL_PASSWORD,
                database=Config.MYSQL_DB,
                port=Config.MYSQL_PORT
            )
            print(f"✓ Connected to MySQL at {Config.MYSQL_HOST}:{Config.MYSQL_PORT}")
            return True
        except Error as e:
            print(f"✗ Database connection error: {e}")
            return False
    
    def disconnect(self):
        """Close database connection"""
        if self.connection and self.connection.is_connected():
            self.connection.close()
            print("✓ MySQL connection closed")
    
    def execute_query(self, query, params=None):
        """Execute a query (SELECT)"""
        try:
            cursor = self.connection.cursor(dictionary=True)
            cursor.execute(query, params or ())
            result = cursor.fetchall()
            cursor.close()
            return result
        except Error as e:
            print(f"✗ Query error: {e}")
            return None
    
    def execute_update(self, query, params=None):
        """Execute an update/insert/delete query"""
        try:
            cursor = self.connection.cursor()
            cursor.execute(query, params or ())
            self.connection.commit()
            affected_rows = cursor.rowcount
            last_id = cursor.lastrowid
            cursor.close()
            return {'success': True, 'affected_rows': affected_rows, 'last_id': last_id}
        except Error as e:
            print(f"✗ Update error: {e}")
            return {'success': False, 'error': str(e)}

# Global database instance
db = Database()
