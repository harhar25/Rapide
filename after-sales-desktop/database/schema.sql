-- After-Sales Service Management System Database Schema
-- MySQL 5.7+

CREATE DATABASE IF NOT EXISTS after_sales_db;
USE after_sales_db;

-- ==================== CUSTOMERS TABLE ====================
CREATE TABLE customers (
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
);

-- ==================== TECHNICIANS TABLE ====================
CREATE TABLE technicians (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    specialization VARCHAR(100),
    contact_no VARCHAR(20),
    email VARCHAR(100),
    status ENUM('active', 'inactive', 'on-leave') DEFAULT 'active',
    hire_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_employee_id (employee_id)
);

-- ==================== SERVICE ADVISORS TABLE ====================
CREATE TABLE service_advisors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    contact_no VARCHAR(20),
    email VARCHAR(100),
    status ENUM('active', 'inactive', 'on-leave') DEFAULT 'active',
    hire_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_employee_id (employee_id)
);

-- ==================== SERVICE BAYS TABLE ====================
CREATE TABLE service_bays (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bay_name VARCHAR(50) NOT NULL UNIQUE,
    capacity INT DEFAULT 1,
    bay_type ENUM('general', 'ac', 'electrical', 'paint') DEFAULT 'general',
    status ENUM('active', 'maintenance', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== CONTACT ATTEMPTS TABLE ====================
CREATE TABLE contact_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    contact_type ENUM('call', 'sms', 'email', 'whatsapp') NOT NULL,
    attempt_date TIMESTAMP,
    status ENUM('attempted', 'connected', 'confirmed', 'not-available', 'declined') DEFAULT 'attempted',
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_attempt_date (attempt_date)
);

-- ==================== SCHEDULING ORDERS TABLE ====================
CREATE TABLE scheduling_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    bay_id INT,
    technician_id INT,
    advisor_id INT,
    service_type ENUM('PMS', 'breakdown', 'warranty', 'general') DEFAULT 'PMS',
    status ENUM('scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show') DEFAULT 'scheduled',
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    estimated_duration_hours DECIMAL(5, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (bay_id) REFERENCES service_bays(id),
    FOREIGN KEY (technician_id) REFERENCES technicians(id),
    FOREIGN KEY (advisor_id) REFERENCES service_advisors(id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_scheduled_date (scheduled_date),
    INDEX idx_status (status),
    UNIQUE KEY unique_slot (bay_id, scheduled_date, scheduled_time)
);

-- ==================== SERVICE ORDERS TABLE ====================
CREATE TABLE service_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scheduling_order_id INT,
    customer_id INT NOT NULL,
    vehicle_plate_no VARCHAR(20),
    service_type VARCHAR(50),
    check_in_time TIMESTAMP,
    estimated_completion_time TIMESTAMP,
    actual_completion_time TIMESTAMP,
    status ENUM('pending', 'in-progress', 'completed', 'cancelled') DEFAULT 'pending',
    advisor_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (advisor_id) REFERENCES service_advisors(id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_status (status)
);

-- ==================== AUDIT LOG TABLE ====================
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(100),
    record_id INT,
    action ENUM('insert', 'update', 'delete', 'view') NOT NULL,
    old_value JSON,
    new_value JSON,
    user_id VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_table_name (table_name),
    INDEX idx_timestamp (timestamp)
);

-- ==================== SAMPLE DATA ====================

-- Insert sample service bays
INSERT INTO service_bays (bay_name, bay_type, status) VALUES
('Bay A', 'general', 'active'),
('Bay B', 'ac', 'active'),
('Bay C', 'electrical', 'active'),
('Bay D', 'general', 'active');

-- Insert sample technicians
INSERT INTO technicians (name, employee_id, specialization, contact_no, status) VALUES
('Juan de la Cruz', 'TECH001', 'Engine Overhaul', '09175551234', 'active'),
('Maria Santos', 'TECH002', 'AC Repair', '09175555678', 'active'),
('Pedro Reyes', 'TECH003', 'Electrical', '09175559999', 'active'),
('Rosa Garcia', 'TECH004', 'General Maintenance', '09175551111', 'active');

-- Insert sample service advisors
INSERT INTO service_advisors (name, employee_id, contact_no, status) VALUES
('Ana Cruz', 'SA001', '09175552222', 'active'),
('Luis Morales', 'SA002', '09175553333', 'active'),
('Carmen Lopez', 'SA003', '09175554444', 'active');

-- Insert sample customers
INSERT INTO customers (name, contact_no, plate_no, vehicle_model, vehicle_year, service_interval_days, last_service_date, status) VALUES
('Mr. Reyes', '09175551001', 'ABC-1234', 'Toyota Camry', 2020, 10000, DATE_SUB(CURDATE(), INTERVAL 90 DAY), 'active'),
('Mrs. Santos', '09175551002', 'XYZ-5678', 'Honda Civic', 2021, 10000, DATE_SUB(CURDATE(), INTERVAL 95 DAY), 'active'),
('Mr. Garcia', '09175551003', 'DEF-9012', 'Ford Ranger', 2019, 10000, DATE_SUB(CURDATE(), INTERVAL 85 DAY), 'active'),
('Ms. Cruz', '09175551004', 'GHI-3456', 'Hyundai Accent', 2022, 10000, DATE_SUB(CURDATE(), INTERVAL 70 DAY), 'active');

-- Insert sample contact attempts
INSERT INTO contact_attempts (customer_id, contact_type, status, notes, created_by) VALUES
(1, 'call', 'confirmed', 'Customer confirmed appointment for Monday 10 AM', 'CRO001'),
(2, 'sms', 'attempted', 'No response yet', 'CRO001'),
(3, 'call', 'not-available', 'Line busy', 'CRO002');

-- Insert sample scheduling orders
INSERT INTO scheduling_orders (customer_id, scheduled_date, scheduled_time, bay_id, technician_id, advisor_id, service_type, status, priority, created_by) VALUES
(1, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '09:00:00', 1, 1, 1, 'PMS', 'scheduled', 'normal', 'CRO001'),
(3, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '14:00:00', 2, 2, 2, 'PMS', 'scheduled', 'high', 'CRO002');

-- Create views for easier querying
CREATE VIEW pms_due_list AS
SELECT c.id, c.name, c.contact_no, c.plate_no, c.vehicle_model,
       c.last_service_date, DATEDIFF(CURDATE(), c.last_service_date) as days_since_service
FROM customers c
WHERE c.last_service_date IS NOT NULL
AND DATEDIFF(CURDATE(), c.last_service_date) >= c.service_interval_days
ORDER BY c.last_service_date ASC;

CREATE VIEW available_resources AS
SELECT 
    'bay' as resource_type,
    id as resource_id,
    bay_name as resource_name,
    status
FROM service_bays
WHERE status = 'active'
UNION ALL
SELECT 
    'technician' as resource_type,
    id as resource_id,
    name as resource_name,
    status
FROM technicians
WHERE status = 'active'
UNION ALL
SELECT 
    'advisor' as resource_type,
    id as resource_id,
    name as resource_name,
    status
FROM service_advisors
WHERE status = 'active';
