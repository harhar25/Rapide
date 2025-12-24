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

    def ensure_core_tables(self):
        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS service_order_documents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                service_order_id INT NOT NULL,
                document_type VARCHAR(50) NOT NULL,
                file_name VARCHAR(255),
                file_path TEXT,
                document_data JSON,
                printed_at TIMESTAMP NULL,
                printed_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_service_order_id (service_order_id),
                INDEX idx_document_type (document_type)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS service_advisors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                employee_id VARCHAR(50) UNIQUE NOT NULL,
                contact_no VARCHAR(20),
                email VARCHAR(100),
                status VARCHAR(50) DEFAULT 'active',
                hire_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_employee_id (employee_id)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS service_bays (
                id INT AUTO_INCREMENT PRIMARY KEY,
                bay_name VARCHAR(50) NOT NULL UNIQUE,
                capacity INT DEFAULT 1,
                bay_type VARCHAR(50) DEFAULT 'general',
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        self.execute_update("ALTER TABLE service_orders MODIFY estimated_completion_time DATETIME NULL DEFAULT NULL")
        self.execute_update("ALTER TABLE scheduling_orders MODIFY status VARCHAR(50) DEFAULT 'scheduled'")
        self.execute_update("ALTER TABLE service_orders MODIFY status VARCHAR(50) DEFAULT 'pending'")
        self.execute_update("ALTER TABLE service_order_documents MODIFY document_type VARCHAR(50) NOT NULL")

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS technician_resources (
                id INT AUTO_INCREMENT PRIMARY KEY,
                technician_id INT NOT NULL,
                resource_type VARCHAR(50) NOT NULL,
                resource_name VARCHAR(100) NOT NULL,
                resource_value VARCHAR(255),
                status VARCHAR(50) DEFAULT 'active',
                expiry_date DATE,
                verified_date DATE,
                verified_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_technician_id (technician_id),
                INDEX idx_resource_type (resource_type)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS vehicle_movements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                service_order_id INT NOT NULL,
                jockey_id INT NOT NULL,
                movement_type VARCHAR(50) DEFAULT 'check-in',
                from_location VARCHAR(100),
                to_location VARCHAR(100),
                reason TEXT,
                vehicle_condition_start TEXT,
                vehicle_condition_end TEXT,
                fuel_level_start DECIMAL(3, 1),
                fuel_level_end DECIMAL(3, 1),
                mileage_start INT,
                mileage_end INT,
                started_at DATETIME,
                completed_at DATETIME,
                status VARCHAR(50) DEFAULT 'in-progress',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_service_order_id (service_order_id),
                INDEX idx_jockey_id (jockey_id),
                INDEX idx_movement_type (movement_type),
                INDEX idx_status (status),
                INDEX idx_started_at (started_at)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS parking_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                service_order_id INT NOT NULL,
                vehicle_movement_id INT NOT NULL,
                parking_slot VARCHAR(50),
                parking_zone VARCHAR(50),
                parking_level INT,
                parked_at DATETIME,
                retrieved_at DATETIME,
                duration_hours DECIMAL(5, 2),
                parking_fee DECIMAL(8, 2) DEFAULT 0,
                fee_status VARCHAR(50) DEFAULT 'pending',
                ground_condition TEXT,
                security_check_passed BOOLEAN DEFAULT TRUE,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_service_order_id (service_order_id),
                INDEX idx_parking_slot (parking_slot),
                INDEX idx_status (status),
                INDEX idx_parked_at (parked_at)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS gate_access_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                service_order_id INT NOT NULL,
                vehicle_plate_no VARCHAR(20),
                customer_name VARCHAR(255),
                access_type VARCHAR(50) DEFAULT 'entry',
                access_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                gate_operator_id INT,
                security_check_status VARCHAR(50) DEFAULT 'pending',
                reason_if_denied TEXT,
                mileage_at_access INT,
                vehicle_condition VARCHAR(100),
                badge_scanned VARCHAR(50),
                is_authorized BOOLEAN DEFAULT TRUE,
                notes TEXT,
                photo_captured BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_service_order_id (service_order_id),
                INDEX idx_access_type (access_type),
                INDEX idx_access_time (access_time),
                INDEX idx_is_authorized (is_authorized),
                INDEX idx_security_check_status (security_check_status)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS vehicle_badges (
                id INT AUTO_INCREMENT PRIMARY KEY,
                badge_number VARCHAR(50) UNIQUE NOT NULL,
                service_order_id INT,
                vehicle_plate_no VARCHAR(20),
                customer_id INT,
                issue_date DATE,
                expiry_date DATE,
                badge_status VARCHAR(50) DEFAULT 'active',
                badge_type VARCHAR(50) DEFAULT 'temporary',
                scans_count INT DEFAULT 0,
                issued_by INT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_badge (badge_number),
                INDEX idx_service_order_id (service_order_id),
                INDEX idx_badge_status (badge_status),
                INDEX idx_expiry_date (expiry_date)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS technician_assignments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                service_order_id INT NOT NULL,
                technician_id INT NOT NULL,
                assigned_by VARCHAR(100),
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                clock_in_time TIMESTAMP NULL,
                clock_out_time TIMESTAMP NULL,
                labor_hours DECIMAL(5, 2) NULL,
                status VARCHAR(50) DEFAULT 'assigned',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_service_order_id (service_order_id),
                INDEX idx_technician_id (technician_id),
                INDEX idx_status (status),
                UNIQUE KEY unique_assignment (service_order_id, technician_id)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS job_clock_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                assignment_id INT NOT NULL,
                service_order_id INT NOT NULL,
                technician_id INT NOT NULL,
                clock_in_time TIMESTAMP NOT NULL,
                clock_out_time TIMESTAMP NULL,
                duration_minutes INT NULL,
                break_minutes INT DEFAULT 0,
                actual_work_minutes INT NULL,
                status VARCHAR(50) DEFAULT 'clocked-in',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_assignment_id (assignment_id),
                INDEX idx_technician_id (technician_id),
                INDEX idx_clock_in_time (clock_in_time)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS qc_inspections (
                id INT AUTO_INCREMENT PRIMARY KEY,
                service_order_id INT NOT NULL,
                foreman_id INT NULL,
                inspection_date DATE NULL,
                exterior_condition VARCHAR(50),
                engine_condition VARCHAR(50),
                interior_cleanliness VARCHAR(50),
                parts_installed VARCHAR(255),
                fluid_levels_ok BOOLEAN DEFAULT TRUE,
                electrical_systems_ok BOOLEAN DEFAULT TRUE,
                safety_features_ok BOOLEAN DEFAULT TRUE,
                overall_status VARCHAR(50) DEFAULT 'pending',
                failed_items TEXT,
                inspection_notes TEXT,
                photos_attached INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_service_order_id (service_order_id),
                INDEX idx_foreman_id (foreman_id),
                INDEX idx_overall_status (overall_status),
                INDEX idx_inspection_date (inspection_date)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS road_tests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                qc_inspection_id INT NOT NULL,
                service_order_id INT NOT NULL,
                road_test_date DATE NULL,
                tested_by INT NULL,
                test_distance_km INT DEFAULT 0,
                engine_sound VARCHAR(100),
                acceleration_smooth BOOLEAN DEFAULT TRUE,
                braking_effective BOOLEAN DEFAULT TRUE,
                steering_responsive BOOLEAN DEFAULT TRUE,
                electrical_functions_ok BOOLEAN DEFAULT TRUE,
                air_conditioning_ok BOOLEAN DEFAULT TRUE,
                overall_performance VARCHAR(50) DEFAULT 'good',
                issues_found TEXT,
                road_test_notes TEXT,
                test_video_attached INT DEFAULT 0,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_qc_inspection_id (qc_inspection_id),
                INDEX idx_service_order_id (service_order_id),
                INDEX idx_status (status),
                INDEX idx_test_date (road_test_date)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS job_wrapups (
                id INT AUTO_INCREMENT PRIMARY KEY,
                service_order_id INT NOT NULL,
                job_controller_id INT NULL,
                qc_inspection_id INT NULL,
                technician_id INT NULL,
                clock_out_time DATETIME NULL,
                total_labor_hours DECIMAL(5, 2) NULL,
                final_status VARCHAR(50) DEFAULT 'pending',
                final_notes TEXT,
                quality_check_passed BOOLEAN DEFAULT FALSE,
                job_completion_checklist TEXT,
                materials_returned INT DEFAULT 0,
                tools_returned INT DEFAULT 0,
                vehicle_condition_final VARCHAR(100),
                handover_status VARCHAR(50) DEFAULT 'pending',
                returned_to_sa_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_service_order_id (service_order_id),
                INDEX idx_job_controller_id (job_controller_id),
                INDEX idx_final_status (final_status),
                INDEX idx_created_at (created_at)
            )
            """
        )

# Global database instance
db = Database()
