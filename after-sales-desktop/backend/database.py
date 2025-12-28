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
            CREATE TABLE IF NOT EXISTS personnel (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'cro',
                email VARCHAR(100),
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_username (username),
                INDEX idx_role (role),
                INDEX idx_status (status)
            )
            """
        )

        # Create warehouse tables
        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS warehouse_products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_code VARCHAR(50) NOT NULL UNIQUE,
                product_name VARCHAR(255) NOT NULL,
                category VARCHAR(100),
                unit_price DECIMAL(10, 2) NOT NULL,
                quantity_in_stock INT DEFAULT 0,
                reorder_level INT DEFAULT 10,
                supplier VARCHAR(255),
                description TEXT,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_by VARCHAR(100),
                INDEX idx_product_code (product_code),
                INDEX idx_category (category),
                INDEX idx_status (status)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS warehouse_inventory_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                transaction_type VARCHAR(50) DEFAULT 'in',
                quantity INT NOT NULL,
                previous_quantity INT,
                new_quantity INT,
                reference_no VARCHAR(100),
                reference_type VARCHAR(50) DEFAULT 'purchase',
                notes TEXT,
                created_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_product_id (product_id),
                INDEX idx_transaction_type (transaction_type),
                INDEX idx_created_at (created_at),
                INDEX idx_reference_no (reference_no)
            )
            """
        )

        # Create follow-up and feedback tables
        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS follow_ups (
                id INT AUTO_INCREMENT PRIMARY KEY,
                service_order_id INT NOT NULL,
                customer_id INT NOT NULL,
                followup_date DATE NOT NULL,
                followup_time TIME,
                contact_method VARCHAR(50) DEFAULT 'phone',
                contact_person_name VARCHAR(255),
                contact_person_phone VARCHAR(20),
                followup_status VARCHAR(50) DEFAULT 'pending',
                feedback_received BOOLEAN DEFAULT FALSE,
                issue_reported BOOLEAN DEFAULT FALSE,
                followup_notes LONGTEXT,
                scheduled_by INT,
                completed_by INT,
                completion_date DATETIME,
                satisfaction_rating INT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_service_order_id (service_order_id),
                INDEX idx_customer_id (customer_id),
                INDEX idx_followup_date (followup_date),
                INDEX idx_followup_status (followup_status)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS customer_feedback (
                id INT AUTO_INCREMENT PRIMARY KEY,
                followup_id INT NOT NULL,
                service_quality_rating INT DEFAULT NULL,
                work_done_satisfaction INT DEFAULT NULL,
                staff_behavior_rating INT DEFAULT NULL,
                value_for_money_rating INT DEFAULT NULL,
                overall_experience INT DEFAULT NULL,
                would_recommend VARCHAR(20) DEFAULT NULL,
                feedback_comments LONGTEXT,
                improvement_suggestions VARCHAR(500),
                feedback_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                feedback_channel VARCHAR(50) DEFAULT 'form',
                INDEX idx_followup_id (followup_id),
                INDEX idx_overall_experience (overall_experience)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS issue_tracking (
                id INT AUTO_INCREMENT PRIMARY KEY,
                followup_id INT NOT NULL,
                issue_category VARCHAR(50) DEFAULT 'other',
                issue_description VARCHAR(500),
                severity VARCHAR(50) DEFAULT 'medium',
                reported_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                investigation_notes LONGTEXT,
                resolution_notes LONGTEXT,
                issue_status VARCHAR(50) DEFAULT 'open',
                assigned_to INT,
                resolved_date DATETIME,
                resolution_type VARCHAR(50) DEFAULT NULL,
                follow_up_action VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_followup_id (followup_id),
                INDEX idx_issue_status (issue_status),
                INDEX idx_severity (severity)
            )
            """
        )

        # Create appointment-related tables
        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS appointment_confirmations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                scheduling_order_id INT NOT NULL,
                method VARCHAR(50) DEFAULT 'sms',
                contact_info VARCHAR(255),
                message TEXT,
                sent_at TIMESTAMP NULL,
                delivered_at TIMESTAMP NULL,
                status VARCHAR(50) DEFAULT 'pending',
                retry_count INT DEFAULT 0,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_scheduling_order_id (scheduling_order_id),
                INDEX idx_status (status),
                INDEX idx_sent_at (sent_at)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS appointment_reminders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                scheduling_order_id INT NOT NULL,
                reminder_type VARCHAR(50) DEFAULT '24h',
                scheduled_time DATETIME,
                sent_time TIMESTAMP NULL,
                reminder_recipients VARCHAR(50) DEFAULT 'all',
                status VARCHAR(50) DEFAULT 'pending',
                sent_to_customer BOOLEAN DEFAULT FALSE,
                sent_to_technician BOOLEAN DEFAULT FALSE,
                sent_to_advisor BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_scheduling_order_id (scheduling_order_id),
                INDEX idx_scheduled_time (scheduled_time),
                INDEX idx_status (status)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS appointment_reschedules (
                id INT AUTO_INCREMENT PRIMARY KEY,
                scheduling_order_id INT NOT NULL,
                old_date DATE,
                old_time TIME,
                new_date DATE,
                new_time TIME,
                reason VARCHAR(255),
                rescheduled_by VARCHAR(100),
                rescheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_scheduling_order_id (scheduling_order_id),
                INDEX idx_rescheduled_at (rescheduled_at)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS no_show_tracking (
                id INT AUTO_INCREMENT PRIMARY KEY,
                scheduling_order_id INT NOT NULL,
                customer_id INT NOT NULL,
                scheduled_date DATE,
                scheduled_time TIME,
                reason VARCHAR(255),
                notified_at TIMESTAMP NULL,
                follow_up_created BOOLEAN DEFAULT FALSE,
                tracked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_scheduling_order_id (scheduling_order_id),
                INDEX idx_customer_id (customer_id),
                INDEX idx_tracked_at (tracked_at)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS follow_up_tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                scheduling_order_id INT NOT NULL,
                customer_id INT NOT NULL,
                task_type VARCHAR(50) DEFAULT 'no-show',
                priority VARCHAR(50) DEFAULT 'normal',
                status VARCHAR(50) DEFAULT 'pending',
                assigned_to VARCHAR(100),
                due_date DATE,
                completed_at TIMESTAMP NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_scheduling_order_id (scheduling_order_id),
                INDEX idx_customer_id (customer_id),
                INDEX idx_status (status),
                INDEX idx_due_date (due_date)
            )
            """
        )

        # Create SMS outbox table
        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS sms_outbox (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT NULL,
                scheduling_order_id INT NULL,
                purpose VARCHAR(50) DEFAULT 'PMS_OUTREACH',
                phone VARCHAR(30) NOT NULL,
                message TEXT NOT NULL,
                scheduled_at DATETIME NOT NULL,
                sent_at TIMESTAMP NULL,
                delivered_at TIMESTAMP NULL,
                status VARCHAR(50) DEFAULT 'queued',
                provider_message_id VARCHAR(100) NULL,
                retry_count INT DEFAULT 0,
                error_message TEXT,
                created_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_scheduled_at (scheduled_at),
                INDEX idx_customer_id (customer_id),
                INDEX idx_scheduling_order_id (scheduling_order_id),
                INDEX idx_provider_message_id (provider_message_id)
            )
            """
        )

        self.execute_update("ALTER TABLE personnel MODIFY role VARCHAR(50) DEFAULT 'cro'")
        self.execute_update("ALTER TABLE personnel MODIFY status VARCHAR(20) DEFAULT 'active'")

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
            CREATE TABLE IF NOT EXISTS customers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                contact_no VARCHAR(20) NOT NULL UNIQUE,
                plate_no VARCHAR(20) UNIQUE,
                vehicle_model VARCHAR(100),
                vehicle_year YEAR,
                engine_no VARCHAR(50),
                chassis_no VARCHAR(50),
                customer_type ENUM('regular', 'corporate', 'government', 'walk-in') DEFAULT 'regular',
                address TEXT,
                city VARCHAR(100),
                email VARCHAR(100),
                service_interval_days INT DEFAULT 10000,
                last_service_date DATE,
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status ENUM('active', 'inactive') DEFAULT 'active',
                INDEX idx_plate_no (plate_no),
                INDEX idx_contact_no (contact_no),
                INDEX idx_last_service_date (last_service_date)
            )
            """
        )

        False and self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS customers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                contact_no VARCHAR(20) NOT NULL UNIQUE,
                plate_no VARCHAR(20) UNIQUE,
                vehicle_model VARCHAR(100),
                vehicle_year YEAR,
                engine_no VARCHAR(50),
                chassis_no VARCHAR(50),
                customer_type VARCHAR(50) DEFAULT 'regular',
                address TEXT,
                city VARCHAR(100),
                email VARCHAR(100),
                service_interval_days INT挣 INT DEFAULT, DEFAULT 100ieb10,000gers INT DEFAULT [3 eighteen-
                last_service驱动 [diesel]quenba [reps INT [fifty [eighty [twentynine [ submode [eight. [one [O] [one [ cultures, [ Onewindows/hundred [ OneyO Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney, Oney,中来, modifies, O; [0] “ [0 ; [ [ [ [ [.
                last_service 
                registration_dateCaller [ [ [ [ Wars [ [ [花儿 [ [de [ [ihan [ [indr [ [ Oney,anoth hundre [ [ famously [ [ AI [ [—who [ [ulo [ [<|code_suffix|>] [0eighty [ [ Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [Oney [O river [O 
                registration_date TIMESTAMPREFEREES DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(20) DEFAULT 'active',
                INDEX idx_plate_no (plate_no),
                INDEX idx_contact_no (contact_no),
                INDEX idx_last_service_date (last_service_date)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS technicians (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                employee_id VARCHAR(50) UNIQUE NOT NULL,
                specialization VARCHAR(100),
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
            CREATE TABLE IF NOT EXISTS contact_attempts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT NOT NULL,
                contact_type VARCHAR(50) NOT NULL,
                attempt_date TIMESTAMP,
                status VARCHAR(50) DEFAULT 'attempted',
                notes TEXT,
                created_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_customer_id (customer_id),
                INDEX idx_attempt_date (attempt_date)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS scheduling_orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT NOT NULL,
                scheduled_date DATE NOT NULL,
                scheduled_time TIME NOT NULL,
                bay_id INT,
                technician_id INT,
                advisor_id INT,
                service_type VARCHAR(50) DEFAULT 'PMS',
                status VARCHAR(50) DEFAULT 'scheduled',
                priority VARCHAR(50) DEFAULT 'normal',
                estimated_duration_hours DECIMAL(5, 2),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(100),
                INDEX idx_customer_id (customer_id),
                INDEX idx_scheduled_date (scheduled_date),
                INDEX idx_status (status),
                UNIQUE KEY unique_slot (bay_id, scheduled_date, scheduled_time)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS service_orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                scheduling_order_id INT,
                customer_id INT NOT NULL,
                vehicle_plate_no VARCHAR(20),
                service_type VARCHAR(50),
                check_in_time TIMESTAMP,
                estimated_completion_time DATETIME NULL DEFAULT NULL,
                actual_completion_time DATETIME NULL DEFAULT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                advisor_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_customer_id (customer_id),
                INDEX idx_status (status)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS customer_info_sheets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT NOT NULL,
                service_order_id INT,
                name VARCHAR(255) NOT NULL,
                contact_no VARCHAR(20) NOT NULL,
                email VARCHAR(100),
                address TEXT,
                vehicle_plate_no VARCHAR(20),
                vehicle_model VARCHAR(100),
                vehicle_year YEAR,
                engine_no VARCHAR(50),
                chassis_no VARCHAR(50),
                mileage_in INT,
                service_type VARCHAR(50),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_by VARCHAR(100),
                INDEX idx_customer_id (customer_id),
                INDEX idx_service_order_id (service_order_id)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS vehicle_report_cards (
                id INT AUTO_INCREMENT PRIMARY KEY,
                service_order_id INT NOT NULL,
                customer_id INT NOT NULL,
                mileage_in INT,
                mileage_out INT,
                exterior_condition VARCHAR(500),
                interior_condition VARCHAR(500),
                checklist_1_engine_starts VARCHAR(50) DEFAULT 'na',
                checklist_2_idle_smooth VARCHAR(50) DEFAULT 'na',
                checklist_3_acceleration VARCHAR(50) DEFAULT 'na',
                checklist_4_brakes VARCHAR(50) DEFAULT 'na',
                checklist_5_steering VARCHAR(50) DEFAULT 'na',
                checklist_6_lights VARCHAR(50) DEFAULT 'na',
                checklist_7_wipers VARCHAR(50) DEFAULT 'na',
                checklist_8_horn VARCHAR(50) DEFAULT 'na',
                checklist_9_tires VARCHAR(50) DEFAULT 'na',
                checklist_10_battery VARCHAR(50) DEFAULT 'na',
                checklist_11_fluids VARCHAR(50) DEFAULT 'na',
                checklist_12_brakes_pads VARCHAR(50) DEFAULT 'na',
                checklist_13_clutch VARCHAR(50) DEFAULT 'na',
                checklist_14_cooling VARCHAR(50) DEFAULT 'na',
                checklist_15_exhaust VARCHAR(50) DEFAULT 'na',
                checklist_16_suspension VARCHAR(50) DEFAULT 'na',
                checklist_17_aircon VARCHAR(50) DEFAULT 'na',
                checklist_18_electrical VARCHAR(50) DEFAULT 'na',
                checklist_19_safety VARCHAR(50) DEFAULT 'na',
                checklist_20_cleanliness VARCHAR(50) DEFAULT 'na',
                additional_work VARCHAR(500),
                customer_signature LONGBLOB,
                customer_signature_date DATETIME,
                service_advisor_signature LONGBLOB,
                service_advisor_signature_date DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_service_order_id (service_order_id),
                INDEX idx_customer_id (customer_id)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                table_name VARCHAR(100),
                record_id INT,
                action VARCHAR(50) NOT NULL,
                old_value JSON,
                new_value JSON,
                user_id VARCHAR(100),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_table_name (table_name),
                INDEX idx_timestamp (timestamp)
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

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS invoices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                service_order_id INT NOT NULL,
                invoice_number VARCHAR(50) UNIQUE NOT NULL,
                customer_id INT NOT NULL,
                job_wrapup_id INT,
                invoice_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                due_date DATE,
                labor_hours DECIMAL(5, 2),
                labor_rate DECIMAL(8, 2) DEFAULT 50.00,
                labor_cost DECIMAL(10, 2),
                materials_cost DECIMAL(10, 2) DEFAULT 0,
                parts_cost DECIMAL(10, 2) DEFAULT 0,
                parking_cost DECIMAL(10, 2) DEFAULT 0,
                discount_amount DECIMAL(10, 2) DEFAULT 0,
                tax_amount DECIMAL(10, 2) DEFAULT 0,
                subtotal DECIMAL(10, 2),
                total_amount DECIMAL(10, 2),
                status VARCHAR(50) DEFAULT 'draft',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_service_order_id (service_order_id),
                INDEX idx_customer_id (customer_id),
                INDEX idx_invoice_number (invoice_number),
                INDEX idx_status (status),
                INDEX idx_invoice_date (invoice_date),
                INDEX idx_due_date (due_date)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS billing_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                invoice_id INT NOT NULL,
                item_type VARCHAR(50) DEFAULT 'service',
                item_description VARCHAR(255) NOT NULL,
                item_code VARCHAR(50),
                quantity DECIMAL(10, 2) DEFAULT 1,
                unit_price DECIMAL(10, 2),
                line_total DECIMAL(10, 2),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_invoice_id (invoice_id),
                INDEX idx_item_type (item_type)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS invoice_payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                invoice_id INT NOT NULL,
                payment_amount DECIMAL(10, 2),
                payment_method VARCHAR(50) DEFAULT 'cash',
                payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                reference_number VARCHAR(100),
                notes TEXT,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_invoice_id (invoice_id),
                INDEX idx_payment_date (payment_date),
                INDEX idx_payment_method (payment_method)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS payment_transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                invoice_id INT,
                customer_id INT NOT NULL,
                transaction_type VARCHAR(50) DEFAULT 'payment',
                amount DECIMAL(10, 2),
                payment_method VARCHAR(50) DEFAULT 'cash',
                reference_number VARCHAR(100),
                card_last_four VARCHAR(4),
                bank_name VARCHAR(100),
                check_number VARCHAR(50),
                transaction_status VARCHAR(50) DEFAULT 'pending',
                notes TEXT,
                created_by INT NOT NULL,
                processed_by INT,
                transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                processed_date DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_invoice_id (invoice_id),
                INDEX idx_customer_id (customer_id),
                INDEX idx_payment_method (payment_method),
                INDEX idx_transaction_status (transaction_status),
                INDEX idx_transaction_date (transaction_date)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS cash_drawer (
                id INT AUTO_INCREMENT PRIMARY KEY,
                cashier_id INT NOT NULL,
                opening_balance DECIMAL(10, 2) DEFAULT 0,
                opening_time DATETIME,
                closing_balance DECIMAL(10, 2),
                closing_time DATETIME,
                cash_counted DECIMAL(10, 2),
                card_total DECIMAL(10, 2) DEFAULT 0,
                check_total DECIMAL(10, 2) DEFAULT 0,
                bank_transfer_total DECIMAL(10, 2) DEFAULT 0,
                mobile_money_total DECIMAL(10, 2) DEFAULT 0,
                discrepancy DECIMAL(10, 2),
                drawer_status VARCHAR(50) DEFAULT 'open',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_cashier_id (cashier_id),
                INDEX idx_drawer_status (drawer_status),
                INDEX idx_opening_time (opening_time),
                INDEX idx_closing_time (closing_time)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS payment_methods_config (
                id INT AUTO_INCREMENT PRIMARY KEY,
                method_type VARCHAR(50) DEFAULT 'cash',
                method_name VARCHAR(100),
                is_enabled BOOLEAN DEFAULT TRUE,
                requires_verification BOOLEAN DEFAULT FALSE,
                processing_fee_percent DECIMAL(5, 2) DEFAULT 0,
                daily_limit DECIMAL(12, 2),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_method_type (method_type),
                INDEX idx_is_enabled (is_enabled)
            )
            """
        )

        self.execute_update("ALTER TABLE service_orders MODIFY estimated_completion_time DATETIME NULL DEFAULT NULL, MODIFY actual_completion_time DATETIME NULL DEFAULT NULL")
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
                service_order_id INT NULL,
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

        self.execute_update("ALTER TABLE gate_access_logs MODIFY service_order_id INT NULL")

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
            CREATE TABLE IF NOT EXISTS vehicle_handovers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                service_order_id INT NOT NULL,
                job_wrapup_id INT,
                handover_date DATETIME,
                technician_id INT,
                customer_id INT NOT NULL,
                final_inspection_notes TEXT,
                vehicle_cleanliness VARCHAR(50),
                fuel_level_final VARCHAR(50),
                mileage_final INT,
                overall_condition VARCHAR(100),
                all_items_returned BOOLEAN DEFAULT TRUE,
                customer_signature_date DATETIME,
                customer_signature_captured BOOLEAN DEFAULT FALSE,
                handover_status VARCHAR(50) DEFAULT 'pending',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_service_order_id (service_order_id),
                INDEX idx_handover_status (handover_status),
                INDEX idx_handover_date (handover_date)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS handover_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                handover_id INT NOT NULL,
                item_type VARCHAR(50) DEFAULT 'parts',
                item_description VARCHAR(255),
                quantity INT DEFAULT 1,
                condition_before VARCHAR(50),
                condition_after VARCHAR(50),
                item_verified BOOLEAN DEFAULT FALSE,
                verified_by INT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_handover_id (handover_id),
                INDEX idx_item_type (item_type)
            )
            """
        )

        self.execute_update(
            """
            CREATE TABLE IF NOT EXISTS handover_signatures (
                id INT AUTO_INCREMENT PRIMARY KEY,
                handover_id INT NOT NULL,
                signatory_type VARCHAR(50) DEFAULT 'customer',
                signatory_name VARCHAR(255),
                signatory_role VARCHAR(100),
                signature_image LONGBLOB,
                signature_timestamp DATETIME,
                printed_name VARCHAR(255),
                id_or_reference VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_handover_id (handover_id),
                INDEX idx_signatory_type (signatory_type)
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
