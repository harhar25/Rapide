import os
import mysql.connector
from mysql.connector import Error
from mysql.connector.pooling import MySQLConnectionPool
import threading
from config import Config

class Database:
    """MySQL Database Connection Handler"""
    
    def __init__(self):
        self.pool = None
        self._lock = threading.Lock()
    
    def connect(self):
        """Establish connection to MySQL database"""
        try:
            pool_size = int(os.environ.get('MYSQL_POOL_SIZE', '6'))
            with self._lock:
                self.pool = MySQLConnectionPool(
                    pool_name='rapide_pool',
                    pool_size=pool_size,
                    host=Config.MYSQL_HOST,
                    user=Config.MYSQL_USER,
                    password=Config.MYSQL_PASSWORD,
                    database=Config.MYSQL_DB,
                    port=Config.MYSQL_PORT,
                    autocommit=False,
                )

            conn = self.pool.get_connection()
            conn.close()
            print(f"✓ Connected to MySQL at {Config.MYSQL_HOST}:{Config.MYSQL_PORT}")
            return True
        except Error as e:
            print(f"✗ Database connection error: {e}")
            self.pool = None
            return False
    
    def disconnect(self):
        """Close database connection"""
        with self._lock:
            self.pool = None
        print("✓ MySQL connection closed")

    def ensure_connected(self):
        """Ensure an active MySQL connection is available."""
        try:
            if self.pool:
                conn = self.pool.get_connection()
                conn.close()
                return True
        except Exception:
            pass
        return self.connect()

    def _should_retry(self, err: Exception) -> bool:
        msg = str(err or '')
        retry_phrases = (
            'Failed parsing column information',
            'MySQL Connection not available',
            'MySQL server has gone away',
            'Lost connection',
            'is not connected',
            'Connection not available',
            'weakly-referenced object no longer exists',
            'bytearray index out of range',
            'No result set to fetch from',
        )
        return any(p.lower() in msg.lower() for p in retry_phrases)

    def _reconnect(self):
        with self._lock:
            self.pool = None
        return self.connect()
    
    def execute_query(self, query, params=None):
        """Execute a query (SELECT)"""
        for attempt in range(2):
            conn = None
            cursor = None
            try:
                if not self.ensure_connected():
                    return None
                conn = self.pool.get_connection()
                cursor = conn.cursor(dictionary=True)
                cursor.execute(query, params or ())
                result = cursor.fetchall()
                cursor.close()
                conn.close()
                return result
            except Error as e:
                try:
                    if cursor:
                        cursor.close()
                except Exception:
                    pass
                try:
                    if conn:
                        conn.close()
                except Exception:
                    pass

                if attempt == 0 and self._should_retry(e):
                    self._reconnect()
                    continue

                print(f"✗ Query error: {e}")
                return None
    
    def execute_update(self, query, params=None):
        """Execute an update/insert/delete query"""
        for attempt in range(2):
            conn = None
            cursor = None
            try:
                if not self.ensure_connected():
                    return {'success': False, 'error': 'Database connection unavailable'}

                conn = self.pool.get_connection()
                cursor = conn.cursor()
                cursor.execute(query, params or ())
                conn.commit()
                affected_rows = cursor.rowcount
                last_id = cursor.lastrowid
                cursor.close()
                conn.close()
                return {'success': True, 'affected_rows': affected_rows, 'last_id': last_id}
            except Error as e:
                try:
                    if conn:
                        try:
                            conn.rollback()
                        except Exception:
                            pass
                except Exception:
                    pass
                try:
                    if cursor:
                        cursor.close()
                except Exception:
                    pass
                try:
                    if conn:
                        conn.close()
                except Exception:
                    pass

                if attempt == 0 and self._should_retry(e):
                    self._reconnect()
                    continue

                print(f"✗ Update error: {e}")
                return {'success': False, 'error': str(e)}

# Global database instance
db = Database()
