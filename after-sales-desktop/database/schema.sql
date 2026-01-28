-- After-Sales Service Management System Database Schema
-- MySQL 5.7+

CREATE DATABASE IF NOT EXISTS after_sales_db;
USE after_sales_db;

-- ==================== PERSONNEL TABLE (User Authentication) ====================
CREATE TABLE IF NOT EXISTS personnel (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'cro', 'technician', 'warehouse', 'manager', 'advisor', 'controller', 'foreman', 'wrapup', 'jockey', 'billing', 'cashier', 'security_gate', 'vehicle_handover', 'follow_up') DEFAULT 'cro',
    email VARCHAR(100),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_status (status)
);

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
    estimated_completion_time DATETIME NULL DEFAULT NULL,
    actual_completion_time DATETIME NULL DEFAULT NULL,
    status ENUM('pending', 'in-progress', 'completed', 'cancelled') DEFAULT 'pending',
    advisor_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (advisor_id) REFERENCES service_advisors(id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_status (status)
);

-- ==================== CUSTOMER INFO SHEETS (CIS) TABLE ====================
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
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_service_order_id (service_order_id)
);

-- ==================== VEHICLE REPORT CARDS (VRC) TABLE ====================
CREATE TABLE IF NOT EXISTS vehicle_report_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_order_id INT NOT NULL,
    customer_id INT NOT NULL,
    mileage_in INT,
    mileage_out INT,
    exterior_condition VARCHAR(500),
    interior_condition VARCHAR(500),
    checklist_1_engine_starts ENUM('pass', 'fail', 'na') DEFAULT 'na',
    checklist_2_idle_smooth ENUM('pass', 'fail', 'na') DEFAULT 'na',
    checklist_3_acceleration ENUM('pass', 'fail', 'na') DEFAULT 'na',
    checklist_4_brakes ENUM('pass', 'fail', 'na') DEFAULT 'na',
    checklist_5_steering ENUM('pass', 'fail', 'na') DEFAULT 'na',
    checklist_6_lights ENUM('pass', 'fail', 'na') DEFAULT 'na',
    checklist_7_air_con ENUM('pass', 'fail', 'na') DEFAULT 'na',
    checklist_8_wipers ENUM('pass', 'fail', 'na') DEFAULT 'na',
    checklist_9_horn ENUM('pass', 'fail', 'na') DEFAULT 'na',
    checklist_10_handbrake ENUM('pass', 'fail', 'na') DEFAULT 'na',
    additional_findings TEXT,
    settings_restored BOOLEAN DEFAULT FALSE,
    diagnosis_completed_by VARCHAR(100),
    diagnosis_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES service_orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    INDEX idx_service_order_id (service_order_id),
    INDEX idx_customer_id (customer_id)
);

-- ==================== SERVICE ORDER DOCUMENTS TABLE ====================
CREATE TABLE IF NOT EXISTS service_order_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_order_id INT NOT NULL,
    document_type ENUM('service-order', 'confirmation', 'picklist', 'vrc', 'cis', 'estimate', 'invoice') NOT NULL,
    file_name VARCHAR(255),
    file_path TEXT,
    document_data JSON,
    printed_at TIMESTAMP,
    printed_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES service_orders(id),
    INDEX idx_service_order_id (service_order_id),
    INDEX idx_document_type (document_type)
);

-- ==================== JOB CONTROLLER - TECHNICIAN ASSIGNMENTS ====================
CREATE TABLE IF NOT EXISTS technician_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_order_id INT NOT NULL,
    technician_id INT NOT NULL,
    assigned_by VARCHAR(100),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    clock_in_time TIMESTAMP,
    clock_out_time TIMESTAMP,
    labor_hours DECIMAL(5, 2),
    status ENUM('assigned', 'in-progress', 'completed', 'paused') DEFAULT 'assigned',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES service_orders(id),
    FOREIGN KEY (technician_id) REFERENCES technicians(id),
    INDEX idx_service_order_id (service_order_id),
    INDEX idx_technician_id (technician_id),
    INDEX idx_status (status),
    UNIQUE KEY unique_assignment (service_order_id, technician_id)
);

-- ==================== JOB CLOCK RECORDS ====================
CREATE TABLE IF NOT EXISTS job_clock_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    service_order_id INT NOT NULL,
    technician_id INT NOT NULL,
    clock_in_time TIMESTAMP NOT NULL,
    clock_out_time TIMESTAMP,
    duration_minutes INT,
    break_minutes INT DEFAULT 0,
    actual_work_minutes INT,
    status ENUM('clocked-in', 'clocked-out', 'on-break') DEFAULT 'clocked-in',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES technician_assignments(id),
    FOREIGN KEY (service_order_id) REFERENCES service_orders(id),
    FOREIGN KEY (technician_id) REFERENCES technicians(id),
    INDEX idx_assignment_id (assignment_id),
    INDEX idx_technician_id (technician_id),
    INDEX idx_clock_in_time (clock_in_time)
);

-- ==================== TECHNICIAN AVAILABILITY/RESOURCES ====================
CREATE TABLE IF NOT EXISTS technician_resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    technician_id INT NOT NULL,
    resource_type ENUM('skill', 'tool', 'certification') NOT NULL,
    resource_name VARCHAR(100) NOT NULL,
    resource_value VARCHAR(255),
    status ENUM('active', 'inactive', 'expired') DEFAULT 'active',
    expiry_date DATE,
    verified_date DATE,
    verified_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (technician_id) REFERENCES technicians(id),
    INDEX idx_technician_id (technician_id),
    INDEX idx_resource_type (resource_type)
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

-- ==================== WAREHOUSE PRODUCTS TABLE ====================
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
    status ENUM('active', 'discontinued', 'out-of-stock') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    INDEX idx_product_code (product_code),
    INDEX idx_category (category),
    INDEX idx_status (status)
);

-- ==================== WAREHOUSE INVENTORY HISTORY ====================
CREATE TABLE IF NOT EXISTS warehouse_inventory_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    transaction_type ENUM('in', 'out', 'adjustment', 'damaged') DEFAULT 'in',
    quantity INT NOT NULL,
    previous_quantity INT,
    new_quantity INT,
    reference_no VARCHAR(100),
    reference_type ENUM('purchase', 'sale', 'repair-job', 'damage', 'adjustment') DEFAULT 'purchase',
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES warehouse_products(id),
    INDEX idx_product_id (product_id),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_created_at (created_at),
    INDEX idx_reference_no (reference_no)
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

-- Insert sample warehouse products
INSERT INTO warehouse_products (product_code, product_name, category, unit_price, quantity_in_stock, reorder_level, supplier, description, created_by) VALUES
('OIL-5L-001', 'Engine Oil 5L', 'Fluids', 450.00, 45, 20, 'Shell', 'Premium engine oil 5 liters', 'ADMIN'),
('FILTER-AIR-001', 'Air Filter', 'Filters', 350.00, 8, 15, 'Bosch', 'Standard air filter', 'ADMIN'),
('BRAKE-PAD-SET', 'Brake Pads Set', 'Brakes', 1200.00, 12, 10, 'Brembo', 'Front brake pads set', 'ADMIN'),
('SPARK-PLUG-BOX', 'Spark Plugs Box', 'Ignition', 280.00, 3, 10, 'NGK', 'Box of 4 spark plugs', 'ADMIN'),
('COOLANT-1L', 'Coolant 1L', 'Fluids', 320.00, 28, 15, 'Castrol', 'Engine coolant 1 liter', 'ADMIN'),
('BATTERY-60AH', 'Car Battery 60Ah', 'Electrical', 3500.00, 6, 5, 'Amaron', '60Ah car battery', 'ADMIN'),
('WIPER-BLADE-SET', 'Wiper Blade Set', 'Wipers', 450.00, 20, 12, 'Bosch', 'Front wiper blade set', 'ADMIN'),
('TRANSMISSION-OIL-4L', 'Transmission Oil 4L', 'Fluids', 680.00, 15, 8, 'Shell', 'ATF transmission oil 4L', 'ADMIN');

-- Insert sample inventory history
INSERT INTO warehouse_inventory_history (product_id, transaction_type, quantity, previous_quantity, new_quantity, reference_no, reference_type, notes, created_by) VALUES
(1, 'in', 50, 0, 50, 'PO-001', 'purchase', 'Initial stock', 'ADMIN'),
(1, 'out', 5, 50, 45, 'JOB-001', 'repair-job', 'Used in service', 'WAREHOUSE'),
(2, 'in', 25, 0, 25, 'PO-002', 'purchase', 'Initial stock', 'ADMIN'),
(2, 'out', 17, 25, 8, 'JOB-002', 'repair-job', 'Sold 17 units', 'WAREHOUSE'),
(3, 'in', 20, 0, 20, 'PO-003', 'purchase', 'Initial stock', 'ADMIN'),
(3, 'out', 8, 20, 12, 'JOB-003', 'repair-job', 'Service jobs', 'WAREHOUSE');

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

-- ==================== FOREMAN QC INSPECTION TABLE ====================
CREATE TABLE IF NOT EXISTS qc_inspections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_order_id INT NOT NULL,
    foreman_id INT,
    inspection_date DATE,
    exterior_condition VARCHAR(50),
    engine_condition VARCHAR(50),
    interior_cleanliness VARCHAR(50),
    parts_installed VARCHAR(255),
    fluid_levels_ok BOOLEAN DEFAULT TRUE,
    electrical_systems_ok BOOLEAN DEFAULT TRUE,
    safety_features_ok BOOLEAN DEFAULT TRUE,
    overall_status ENUM('passed', 'failed', 'pending', 'rework-required') DEFAULT 'pending',
    failed_items TEXT,
    inspection_notes TEXT,
    photos_attached INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id),
    FOREIGN KEY (foreman_id) REFERENCES service_advisors(id),
    INDEX idx_service_order_id (service_order_id),
    INDEX idx_foreman_id (foreman_id),
    INDEX idx_overall_status (overall_status),
    INDEX idx_inspection_date (inspection_date)
);

-- ==================== ROAD TEST TABLE ====================
CREATE TABLE IF NOT EXISTS road_tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    qc_inspection_id INT NOT NULL,
    service_order_id INT NOT NULL,
    road_test_date DATE,
    tested_by INT,
    test_distance_km INT,
    engine_sound VARCHAR(100),
    acceleration_smooth BOOLEAN DEFAULT TRUE,
    braking_effective BOOLEAN DEFAULT TRUE,
    steering_responsive BOOLEAN DEFAULT TRUE,
    electrical_functions_ok BOOLEAN DEFAULT TRUE,
    air_conditioning_ok BOOLEAN DEFAULT TRUE,
    overall_performance ENUM('excellent', 'good', 'acceptable', 'needs-rework') DEFAULT 'good',
    issues_found TEXT,
    road_test_notes TEXT,
    test_video_attached INT DEFAULT 0,
    status ENUM('passed', 'failed', 'pending') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (qc_inspection_id) REFERENCES qc_inspections(id),
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id),
    FOREIGN KEY (tested_by) REFERENCES service_advisors(id),
    INDEX idx_qc_inspection_id (qc_inspection_id),
    INDEX idx_service_order_id (service_order_id),
    INDEX idx_status (status),
    INDEX idx_test_date (road_test_date)
);

-- ==================== JOB WRAP-UP TABLE ====================
CREATE TABLE IF NOT EXISTS job_wrapups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_order_id INT NOT NULL,
    job_controller_id INT,
    qc_inspection_id INT,
    technician_id INT,
    clock_out_time DATETIME,
    total_labor_hours DECIMAL(5, 2),
    final_status ENUM('ready-for-sa', 'returned-to-sa', 'pending', 'completed') DEFAULT 'pending',
    final_notes TEXT,
    quality_check_passed BOOLEAN DEFAULT FALSE,
    job_completion_checklist TEXT,
    materials_returned INT DEFAULT 0,
    tools_returned INT DEFAULT 0,
    vehicle_condition_final VARCHAR(100),
    handover_status ENUM('pending', 'ready', 'completed') DEFAULT 'pending',
    returned_to_sa_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id),
    FOREIGN KEY (job_controller_id) REFERENCES personnel(id),
    FOREIGN KEY (qc_inspection_id) REFERENCES qc_inspections(id),
    FOREIGN KEY (technician_id) REFERENCES technicians(id),
    INDEX idx_service_order_id (service_order_id),
    INDEX idx_job_controller_id (job_controller_id),
    INDEX idx_final_status (final_status),
    INDEX idx_created_at (created_at)
);

-- ==================== CAR JOCKEY MODULE ====================
-- Vehicle movements and parking tracking for valet operations

CREATE TABLE IF NOT EXISTS vehicle_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_order_id INT NOT NULL,
    jockey_id INT NOT NULL,
    movement_type ENUM('check-in', 'parking', 'retrieval', 'check-out', 'emergency-move') DEFAULT 'check-in',
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
    status ENUM('in-progress', 'completed', 'cancelled') DEFAULT 'in-progress',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id),
    FOREIGN KEY (jockey_id) REFERENCES personnel(id),
    INDEX idx_service_order_id (service_order_id),
    INDEX idx_jockey_id (jockey_id),
    INDEX idx_movement_type (movement_type),
    INDEX idx_status (status),
    INDEX idx_started_at (started_at)
);

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
    fee_status ENUM('pending', 'paid', 'waived') DEFAULT 'pending',
    ground_condition TEXT,
    security_check_passed BOOLEAN DEFAULT TRUE,
    status ENUM('active', 'completed', 'released') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id),
    FOREIGN KEY (vehicle_movement_id) REFERENCES vehicle_movements(id),
    INDEX idx_service_order_id (service_order_id),
    INDEX idx_parking_slot (parking_slot),
    INDEX idx_status (status),
    INDEX idx_parked_at (parked_at)
);

-- ==================== BILLING MODULE ====================
-- Invoice generation and billing management

CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_order_id INT NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    job_wrapup_id INT,
    invoice_date DATE DEFAULT CURDATE(),
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
    status ENUM('draft', 'issued', 'sent', 'partial-paid', 'paid', 'cancelled') DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (job_wrapup_id) REFERENCES job_wrapups(id),
    INDEX idx_service_order_id (service_order_id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_status (status),
    INDEX idx_invoice_date (invoice_date),
    INDEX idx_due_date (due_date)
);

CREATE TABLE IF NOT EXISTS billing_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    item_type ENUM('labor', 'material', 'part', 'parking', 'service', 'other') DEFAULT 'service',
    item_description VARCHAR(255) NOT NULL,
    item_code VARCHAR(50),
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(10, 2),
    line_total DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    INDEX idx_invoice_id (invoice_id),
    INDEX idx_item_type (item_type)
);

CREATE TABLE IF NOT EXISTS invoice_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    payment_amount DECIMAL(10, 2),
    payment_method ENUM('cash', 'card', 'check', 'bank-transfer', 'mobile-money') DEFAULT 'cash',
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    reference_number VARCHAR(100),
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (created_by) REFERENCES personnel(id),
    INDEX idx_invoice_id (invoice_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_payment_method (payment_method)
);

-- ==================== CASHIER MODULE ====================
-- Payment collection and cash drawer management

CREATE TABLE IF NOT EXISTS payment_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT,
    customer_id INT NOT NULL,
    transaction_type ENUM('payment', 'refund', 'adjustment') DEFAULT 'payment',
    amount DECIMAL(10, 2),
    payment_method ENUM('cash', 'card', 'check', 'bank-transfer', 'mobile-money') DEFAULT 'cash',
    reference_number VARCHAR(100),
    card_last_four VARCHAR(4),
    bank_name VARCHAR(100),
    check_number VARCHAR(50),
    transaction_status ENUM('pending', 'completed', 'cancelled', 'failed') DEFAULT 'pending',
    notes TEXT,
    created_by INT NOT NULL,
    processed_by INT,
    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_date DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (created_by) REFERENCES personnel(id),
    FOREIGN KEY (processed_by) REFERENCES personnel(id),
    INDEX idx_invoice_id (invoice_id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_payment_method (payment_method),
    INDEX idx_transaction_status (transaction_status),
    INDEX idx_transaction_date (transaction_date)
);

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
    drawer_status ENUM('open', 'closed', 'reconciled') DEFAULT 'open',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cashier_id) REFERENCES personnel(id),
    INDEX idx_cashier_id (cashier_id),
    INDEX idx_drawer_status (drawer_status),
    INDEX idx_opening_time (opening_time),
    INDEX idx_closing_time (closing_time)
);

CREATE TABLE IF NOT EXISTS payment_methods_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    method_type ENUM('cash', 'card', 'check', 'bank-transfer', 'mobile-money') DEFAULT 'cash',
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
);

-- ==================== SECURITY GATE MODULE ====================
-- Vehicle access control and gate logs

CREATE TABLE IF NOT EXISTS gate_access_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_order_id INT NULL,
    vehicle_plate_no VARCHAR(20),
    customer_name VARCHAR(255),
    access_type ENUM('entry', 'exit', 'emergency-exit') DEFAULT 'entry',
    access_time DATETIME,
    gate_operator_id INT,
    security_check_status ENUM('passed', 'failed', 'pending') DEFAULT 'pending',
    reason_if_denied TEXT,
    mileage_at_access INT,
    vehicle_condition VARCHAR(100),
    badge_scanned VARCHAR(50),
    is_authorized BOOLEAN DEFAULT TRUE,
    notes TEXT,
    photo_captured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id),
    FOREIGN KEY (gate_operator_id) REFERENCES personnel(id),
    INDEX idx_service_order_id (service_order_id),
    INDEX idx_access_type (access_type),
    INDEX idx_access_time (access_time),
    INDEX idx_is_authorized (is_authorized),
    INDEX idx_security_check_status (security_check_status)
);

CREATE TABLE IF NOT EXISTS vehicle_badges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    badge_number VARCHAR(50) UNIQUE NOT NULL,
    service_order_id INT,
    vehicle_plate_no VARCHAR(20),
    customer_id INT,
    issue_date DATE,
    expiry_date DATE,
    badge_status ENUM('active', 'inactive', 'expired', 'revoked') DEFAULT 'active',
    badge_type ENUM('temporary', 'daily', 'weekly') DEFAULT 'temporary',
    scans_count INT DEFAULT 0,
    issued_by INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (issued_by) REFERENCES personnel(id),
    UNIQUE KEY unique_badge (badge_number),
    INDEX idx_service_order_id (service_order_id),
    INDEX idx_badge_status (badge_status),
    INDEX idx_expiry_date (expiry_date)
);

-- ==================== VEHICLE HANDOVER MODULE ====================
-- Final vehicle handover and documentation

CREATE TABLE IF NOT EXISTS vehicle_handovers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_order_id INT NOT NULL,
    job_wrapup_id INT,
    handover_date DATETIME,
    technician_id INT,
    customer_id INT NOT NULL,
    final_inspection_notes TEXT,
    vehicle_cleanliness VARCHAR(50),
    fuel_level_final DECIMAL(3, 1),
    mileage_final INT,
    overall_condition VARCHAR(100),
    all_items_returned BOOLEAN DEFAULT TRUE,
    customer_signature_date DATETIME,
    customer_signature_captured BOOLEAN DEFAULT FALSE,
    handover_status ENUM('pending', 'in-progress', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id),
    FOREIGN KEY (job_wrapup_id) REFERENCES job_wrapups(id),
    FOREIGN KEY (technician_id) REFERENCES technicians(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    INDEX idx_service_order_id (service_order_id),
    INDEX idx_handover_status (handover_status),
    INDEX idx_handover_date (handover_date)
);

CREATE TABLE IF NOT EXISTS handover_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    handover_id INT NOT NULL,
    item_type ENUM('parts', 'tools', 'accessories', 'documents', 'keys', 'other') DEFAULT 'parts',
    item_description VARCHAR(255),
    quantity INT DEFAULT 1,
    condition_before VARCHAR(50),
    condition_after VARCHAR(50),
    item_verified BOOLEAN DEFAULT FALSE,
    verified_by INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (handover_id) REFERENCES vehicle_handovers(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES personnel(id),
    INDEX idx_handover_id (handover_id),
    INDEX idx_item_type (item_type)
);

CREATE TABLE IF NOT EXISTS handover_signatures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    handover_id INT NOT NULL,
    signatory_type ENUM('customer', 'technician', 'sa', 'manager') DEFAULT 'customer',
    signatory_name VARCHAR(255),
    signatory_role VARCHAR(100),
    signature_image LONGBLOB,
    signature_timestamp DATETIME,
    printed_name VARCHAR(255),
    id_or_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (handover_id) REFERENCES vehicle_handovers(id) ON DELETE CASCADE,
    INDEX idx_handover_id (handover_id),
    INDEX idx_signatory_type (signatory_type)
);

CREATE TABLE follow_ups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_order_id INT NOT NULL,
    customer_id INT NOT NULL,
    followup_date DATE NOT NULL,
    followup_time TIME,
    contact_method ENUM('phone', 'sms', 'email', 'visit') DEFAULT 'phone',
    contact_person_name VARCHAR(255),
    contact_person_phone VARCHAR(20),
    followup_status ENUM('pending', 'completed', 'rescheduled', 'cancelled') DEFAULT 'pending',
    feedback_received BOOLEAN DEFAULT FALSE,
    issue_reported BOOLEAN DEFAULT FALSE,
    followup_notes LONGTEXT,
    scheduled_by INT,
    completed_by INT,
    completion_date DATETIME,
    satisfaction_rating INT DEFAULT NULL CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (scheduled_by) REFERENCES personnel(id) ON DELETE SET NULL,
    FOREIGN KEY (completed_by) REFERENCES personnel(id) ON DELETE SET NULL,
    INDEX idx_service_order_id (service_order_id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_followup_date (followup_date),
    INDEX idx_followup_status (followup_status)
);

CREATE TABLE customer_feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    followup_id INT NOT NULL,
    service_quality_rating INT DEFAULT NULL CHECK (service_quality_rating >= 1 AND service_quality_rating >= 5),
    work_done_satisfaction INT DEFAULT NULL CHECK (work_done_satisfaction >= 1 AND work_done_satisfaction <= 5),
    staff_behavior_rating INT DEFAULT NULL CHECK (staff_behavior_rating >= 1 AND staff_behavior_rating <= 5),
    value_for_money_rating INT DEFAULT NULL CHECK (value_for_money_rating >= 1 AND value_for_money_rating <= 5),
    overall_experience INT DEFAULT NULL CHECK (overall_experience >= 1 AND overall_experience <= 5),
    would_recommend ENUM('yes', 'no', 'maybe') DEFAULT NULL,
    feedback_comments LONGTEXT,
    improvement_suggestions VARCHAR(500),
    feedback_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    feedback_channel ENUM('in-person', 'phone', 'sms', 'email', 'form') DEFAULT 'form',
    FOREIGN KEY (followup_id) REFERENCES follow_ups(id) ON DELETE CASCADE,
    INDEX idx_followup_id (followup_id),
    INDEX idx_overall_experience (overall_experience)
);

CREATE TABLE issue_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    followup_id INT NOT NULL,
    issue_category ENUM('quality', 'warranty', 'damage', 'missing-parts', 'delayed', 'other') DEFAULT 'other',
    issue_description VARCHAR(500),
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    reported_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    investigation_notes LONGTEXT,
    resolution_notes LONGTEXT,
    issue_status ENUM('open', 'under-investigation', 'resolved', 'closed', 'escalated') DEFAULT 'open',
    assigned_to INT,
    resolved_date DATETIME,
    resolution_type ENUM('refund', 'rework', 'replacement', 'compensation', 'explanation', 'other') DEFAULT NULL,
    follow_up_action VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (followup_id) REFERENCES follow_ups(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES personnel(id) ON DELETE SET NULL,
    INDEX idx_followup_id (followup_id),
    INDEX idx_issue_status (issue_status),
    INDEX idx_severity (severity)
);
-- ==================== APPOINTMENT CONFIRMATIONS TABLE ====================
CREATE TABLE IF NOT EXISTS appointment_confirmations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scheduling_order_id INT NOT NULL,
    method ENUM('sms', 'email', 'whatsapp', 'call') DEFAULT 'sms',
    contact_info VARCHAR(255),
    message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP NULL,
    status ENUM('pending', 'sent', 'delivered', 'failed') DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scheduling_order_id) REFERENCES scheduling_orders(id) ON DELETE CASCADE,
    INDEX idx_scheduling_order_id (scheduling_order_id),
    INDEX idx_status (status),
    INDEX idx_sent_at (sent_at)
);

-- ==================== APPOINTMENT REMINDERS TABLE ====================
CREATE TABLE IF NOT EXISTS appointment_reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scheduling_order_id INT NOT NULL,
    reminder_type ENUM('24h', '2h', '30m', 'custom') DEFAULT '24h',
    scheduled_time DATETIME,
    sent_time TIMESTAMP NULL,
    reminder_recipients ENUM('customer', 'staff', 'all') DEFAULT 'all',
    status ENUM('pending', 'sent', 'cancelled') DEFAULT 'pending',
    sent_to_customer BOOLEAN DEFAULT FALSE,
    sent_to_technician BOOLEAN DEFAULT FALSE,
    sent_to_advisor BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scheduling_order_id) REFERENCES scheduling_orders(id) ON DELETE CASCADE,
    INDEX idx_scheduling_order_id (scheduling_order_id),
    INDEX idx_scheduled_time (scheduled_time),
    INDEX idx_status (status)
);

-- ==================== APPOINTMENT RESCHEDULES TABLE ====================
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
    FOREIGN KEY (scheduling_order_id) REFERENCES scheduling_orders(id) ON DELETE CASCADE,
    INDEX idx_scheduling_order_id (scheduling_order_id),
    INDEX idx_rescheduled_at (rescheduled_at)
);

-- ==================== NO-SHOW TRACKING TABLE ====================
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
    FOREIGN KEY (scheduling_order_id) REFERENCES scheduling_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_scheduling_order_id (scheduling_order_id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_tracked_at (tracked_at)
);

-- ==================== FOLLOW-UP TASKS TABLE ====================
CREATE TABLE IF NOT EXISTS follow_up_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scheduling_order_id INT NOT NULL,
    customer_id INT NOT NULL,
    task_type ENUM('no-show', 'reschedule', 'callback', 'escalation', 'warranty', 'quality-issue') DEFAULT 'no-show',
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    status ENUM('pending', 'in-progress', 'completed', 'cancelled') DEFAULT 'pending',
    assigned_to VARCHAR(100),
    due_date DATE,
    completed_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scheduling_order_id) REFERENCES scheduling_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_scheduling_order_id (scheduling_order_id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date)
);

-- ==================== AUDIT LOGS TABLE (Enhanced) ====================
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    operation_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INT,
    user_id INT,
    user_name VARCHAR(255),
    ip_address VARCHAR(45),
    browser_info VARCHAR(255),
    operation_details TEXT,
    old_values JSON,
    new_values JSON,
    status ENUM('success', 'failure', 'partial') DEFAULT 'success',
    error_message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_operation_type (operation_type),
    INDEX idx_entity_type (entity_type),
    INDEX idx_timestamp (timestamp),
    INDEX idx_user_id (user_id),
    INDEX idx_entity_id (entity_id)
);

-- ==================== PARTS REQUESTS TABLE (Technician → Job Controller → Warehouse) ====================
CREATE TABLE IF NOT EXISTS parts_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_order_id INT NOT NULL,
    requested_by INT,
    requested_by_role ENUM('technician', 'job_controller', 'admin') DEFAULT 'technician',
    status ENUM('pending', 'sent-to-jc', 'sent-to-warehouse', 'received', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES personnel(id) ON DELETE SET NULL,
    INDEX idx_service_order_id (service_order_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- ==================== PARTS REQUEST ITEMS TABLE ====================
CREATE TABLE IF NOT EXISTS parts_request_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parts_request_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity_requested INT NOT NULL,
    quantity_allocated INT DEFAULT 0,
    quantity_picked INT DEFAULT 0,
    quantity_received INT DEFAULT 0,
    status ENUM('pending', 'allocated', 'picked', 'delivered', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parts_request_id) REFERENCES parts_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES warehouse_products(id) ON DELETE RESTRICT,
    INDEX idx_parts_request_id (parts_request_id),
    INDEX idx_product_id (product_id),
    INDEX idx_status (status)
);

-- ==================== SMS OUTBOX TABLE (One-way Automation) ====================
CREATE TABLE IF NOT EXISTS sms_outbox (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NULL,
    scheduling_order_id INT NULL,
    purpose ENUM('APPT_CONFIRM', 'APPT_REMINDER', 'FOLLOW_UP', 'PMS_OUTREACH') DEFAULT 'PMS_OUTREACH',
    phone VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    scheduled_at DATETIME NOT NULL,
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    status ENUM('queued', 'sending', 'sent', 'delivered', 'failed', 'cancelled') DEFAULT 'queued',
    provider_message_id VARCHAR(100) NULL,
    retry_count INT DEFAULT 0,
    error_message TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (scheduling_order_id) REFERENCES scheduling_orders(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_scheduled_at (scheduled_at),
    INDEX idx_customer_id (customer_id),
    INDEX idx_scheduling_order_id (scheduling_order_id),
    INDEX idx_provider_message_id (provider_message_id)
);