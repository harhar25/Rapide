-- D1/SQLite compatible schema generated from schema.sql
PRAGMA foreign_keys = ON;
-- After-Sales Service Management System Database Schema
-- MySQL 5.7+

-- ==================== PERSONNEL TABLE (User Authentication) ====================
CREATE TABLE IF NOT EXISTS personnel (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
role TEXT CHECK(role IN ('admin', 'cro', 'technician', 'warehouse', 'manager', 'advisor', 'controller', 'foreman', 'wrapup', 'jockey', 'billing', 'cashier', 'security_gate', 'vehicle_handover', 'follow_up')) DEFAULT 'cro',
    email VARCHAR(100),
status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_username ON personnel (username);
CREATE INDEX IF NOT EXISTS idx_role ON personnel (role);
CREATE INDEX IF NOT EXISTS idx_status ON personnel (status);

-- ==================== CUSTOMERS TABLE ====================
CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    contact_no VARCHAR(20) NOT NULL UNIQUE,
    plate_no VARCHAR(20) UNIQUE,
    vehicle_model VARCHAR(100),
    vehicle_year INTEGER,
    engine_no VARCHAR(50),
    chassis_no VARCHAR(50),
customer_type TEXT CHECK(customer_type IN ('regular', 'corporate', 'government', 'walk-in')) DEFAULT 'regular',
    address TEXT,
    city VARCHAR(100),
    email VARCHAR(100),
    service_interval_days INT DEFAULT 10000,
    last_service_date DATE,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_plate_no ON customers (plate_no);
CREATE INDEX IF NOT EXISTS idx_contact_no ON customers (contact_no);
CREATE INDEX IF NOT EXISTS idx_last_service_date ON customers (last_service_date);

-- ==================== TECHNICIANS TABLE ====================
CREATE TABLE technicians (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    specialization VARCHAR(100),
    contact_no VARCHAR(20),
    email VARCHAR(100),
status TEXT CHECK(status IN ('active', 'inactive', 'on-leave')) DEFAULT 'active',
    hire_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employee_id ON technicians (employee_id);

-- ==================== SERVICE ADVISORS TABLE ====================
CREATE TABLE service_advisors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    contact_no VARCHAR(20),
    email VARCHAR(100),
status TEXT CHECK(status IN ('active', 'inactive', 'on-leave')) DEFAULT 'active',
    hire_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employee_id ON service_advisors (employee_id);

-- ==================== SERVICE BAYS TABLE ====================
CREATE TABLE service_bays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bay_name VARCHAR(50) NOT NULL UNIQUE,
    capacity INT DEFAULT 1,
bay_type TEXT CHECK(bay_type IN ('general', 'ac', 'electrical', 'paint')) DEFAULT 'general',
status TEXT CHECK(status IN ('active', 'maintenance', 'inactive')) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== CONTACT ATTEMPTS TABLE ====================
CREATE TABLE contact_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INT NOT NULL,
contact_type TEXT CHECK(contact_type IN ('call', 'sms', 'email', 'whatsapp')) NOT NULL,
    attempt_date TIMESTAMP,
status TEXT CHECK(status IN ('attempted', 'connected', 'confirmed', 'not-available', 'declined')) DEFAULT 'attempted',
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_customer_id ON contact_attempts (customer_id);
CREATE INDEX IF NOT EXISTS idx_attempt_date ON contact_attempts (attempt_date);

-- ==================== SCHEDULING ORDERS TABLE ====================
CREATE TABLE scheduling_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INT NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    bay_id INT,
    technician_id INT,
    advisor_id INT,
service_type TEXT CHECK(service_type IN ('PMS', 'breakdown', 'warranty', 'general')) DEFAULT 'PMS',
status TEXT CHECK(status IN ('scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show')) DEFAULT 'scheduled',
priority TEXT CHECK(priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
    estimated_duration_hours REAL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (bay_id) REFERENCES service_bays(id),
    FOREIGN KEY (technician_id) REFERENCES technicians(id),
    FOREIGN KEY (advisor_id) REFERENCES service_advisors(id)
);

CREATE INDEX IF NOT EXISTS idx_customer_id ON scheduling_orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_date ON scheduling_orders (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_status ON scheduling_orders (status);
CREATE UNIQUE INDEX IF NOT EXISTS unique_slot ON scheduling_orders (bay_id, scheduled_date, scheduled_time);

-- ==================== SERVICE ORDERS TABLE ====================
CREATE TABLE service_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scheduling_order_id INT,
    customer_id INT NOT NULL,
    vehicle_plate_no VARCHAR(20),
    service_type VARCHAR(50),
    check_in_time TIMESTAMP,
    estimated_completion_time DATETIME NULL DEFAULT NULL,
    actual_completion_time DATETIME NULL DEFAULT NULL,
status TEXT CHECK(status IN ('pending', 'in-progress', 'completed', 'cancelled')) DEFAULT 'pending',
    advisor_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (advisor_id) REFERENCES service_advisors(id)
);

CREATE INDEX IF NOT EXISTS idx_customer_id ON service_orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_status ON service_orders (status);

-- ==================== CUSTOMER INFO SHEETS (CIS) TABLE ====================
CREATE TABLE IF NOT EXISTS customer_info_sheets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INT NOT NULL,
    service_order_id INT,
    name VARCHAR(255) NOT NULL,
    contact_no VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    vehicle_plate_no VARCHAR(20),
    vehicle_model VARCHAR(100),
    vehicle_year INTEGER,
    engine_no VARCHAR(50),
    chassis_no VARCHAR(50),
    mileage_in INT,
    service_type VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_customer_id ON customer_info_sheets (customer_id);
CREATE INDEX IF NOT EXISTS idx_service_order_id ON customer_info_sheets (service_order_id);

-- ==================== VEHICLE REPORT CARDS (VRC) TABLE ====================
CREATE TABLE IF NOT EXISTS vehicle_report_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_order_id INT NOT NULL,
    customer_id INT NOT NULL,
    mileage_in INT,
    mileage_out INT,
    exterior_condition VARCHAR(500),
    interior_condition VARCHAR(500),
    checklist_1_engine TEXT DEFAULT 'na',
    checklist_2_fluids TEXT DEFAULT 'na',
    checklist_3_brakes TEXT DEFAULT 'na',
    checklist_4_suspension TEXT DEFAULT 'na',
    checklist_5_battery TEXT DEFAULT 'na',
    checklist_6_tires TEXT DEFAULT 'na',
    checklist_7_lights TEXT DEFAULT 'na',
    checklist_8_body TEXT DEFAULT 'na',
    checklist_9_wipers TEXT DEFAULT 'na',
    checklist_10_handbrake TEXT DEFAULT 'na',
    additional_findings TEXT,
    settings_restored INTEGER DEFAULT FALSE,
    diagnosis_completed_by VARCHAR(100),
    diagnosis_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES service_orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_service_order_id ON vehicle_report_cards (service_order_id);
CREATE INDEX IF NOT EXISTS idx_customer_id ON vehicle_report_cards (customer_id);

-- ==================== SERVICE ORDER DOCUMENTS TABLE ====================
CREATE TABLE IF NOT EXISTS service_order_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_order_id INT NOT NULL,
document_type TEXT CHECK(document_type IN ('service-order', 'confirmation', 'picklist', 'vrc', 'cis', 'estimate', 'invoice')) NOT NULL,
    file_name VARCHAR(255),
    file_path TEXT,
    document_data TEXT,
    printed_at TIMESTAMP,
    printed_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES service_orders(id)
);

CREATE INDEX IF NOT EXISTS idx_service_order_id ON service_order_documents (service_order_id);
CREATE INDEX IF NOT EXISTS idx_document_type ON service_order_documents (document_type);

-- ==================== JOB CONTROLLER - TECHNICIAN ASSIGNMENTS ====================
CREATE TABLE IF NOT EXISTS technician_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_order_id INT NOT NULL,
    technician_id INT NOT NULL,
    assigned_by VARCHAR(100),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    clock_in_time TIMESTAMP,
    clock_out_time TIMESTAMP,
    labor_hours REAL,
status TEXT CHECK(status IN ('assigned', 'in-progress', 'completed', 'paused')) DEFAULT 'assigned',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES service_orders(id),
    FOREIGN KEY (technician_id) REFERENCES technicians(id)
);

CREATE INDEX IF NOT EXISTS idx_service_order_id ON technician_assignments (service_order_id);
CREATE INDEX IF NOT EXISTS idx_technician_id ON technician_assignments (technician_id);
CREATE INDEX IF NOT EXISTS idx_status ON technician_assignments (status);
CREATE UNIQUE INDEX IF NOT EXISTS unique_assignment ON technician_assignments (service_order_id, technician_id);

-- ==================== JOB CLOCK RECORDS ====================
CREATE TABLE IF NOT EXISTS job_clock_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INT NOT NULL,
    service_order_id INT NOT NULL,
    technician_id INT NOT NULL,
    clock_in_time TIMESTAMP NOT NULL,
    clock_out_time TIMESTAMP,
    duration_minutes INT,
    break_minutes INT DEFAULT 0,
    actual_work_minutes INT,
status TEXT CHECK(status IN ('clocked-in', 'clocked-out', 'on-break')) DEFAULT 'clocked-in',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES technician_assignments(id),
    FOREIGN KEY (service_order_id) REFERENCES service_orders(id),
    FOREIGN KEY (technician_id) REFERENCES technicians(id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_id ON job_clock_records (assignment_id);
CREATE INDEX IF NOT EXISTS idx_technician_id ON job_clock_records (technician_id);
CREATE INDEX IF NOT EXISTS idx_clock_in_time ON job_clock_records (clock_in_time);

-- ==================== TECHNICIAN AVAILABILITY/RESOURCES ====================
CREATE TABLE IF NOT EXISTS technician_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    technician_id INT NOT NULL,
resource_type TEXT CHECK(resource_type IN ('skill', 'tool', 'certification')) NOT NULL,
    resource_name VARCHAR(100) NOT NULL,
    resource_value VARCHAR(255),
status TEXT CHECK(status IN ('active', 'inactive', 'expired')) DEFAULT 'active',
    expiry_date DATE,
    verified_date DATE,
    verified_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (technician_id) REFERENCES technicians(id)
);

CREATE INDEX IF NOT EXISTS idx_technician_id ON technician_resources (technician_id);
CREATE INDEX IF NOT EXISTS idx_resource_type ON technician_resources (resource_type);

-- ==================== AUDIT LOG TABLE ====================

-- ==================== WAREHOUSE PRODUCTS TABLE ====================
CREATE TABLE IF NOT EXISTS warehouse_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code VARCHAR(50) NOT NULL UNIQUE,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    unit_price REAL NOT NULL,
    quantity_in_stock INT DEFAULT 0,
    reorder_level INT DEFAULT 10,
    supplier VARCHAR(255),
    description TEXT,
status TEXT CHECK(status IN ('active', 'discontinued', 'out-of-stock')) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_product_code ON warehouse_products (product_code);
CREATE INDEX IF NOT EXISTS idx_category ON warehouse_products (category);
CREATE INDEX IF NOT EXISTS idx_status ON warehouse_products (status);

-- ==================== WAREHOUSE INVENTORY HISTORY ====================
CREATE TABLE IF NOT EXISTS warehouse_inventory_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INT NOT NULL,
transaction_type TEXT CHECK(transaction_type IN ('in', 'out', 'adjustment', 'damaged')) DEFAULT 'in',
    quantity INT NOT NULL,
    previous_quantity INT,
    new_quantity INT,
    reference_no VARCHAR(100),
reference_type TEXT CHECK(reference_type IN ('purchase', 'sale', 'repair-job', 'damage', 'adjustment')) DEFAULT 'purchase',
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES warehouse_products(id)
);

CREATE INDEX IF NOT EXISTS idx_product_id ON warehouse_inventory_history (product_id);
CREATE INDEX IF NOT EXISTS idx_transaction_type ON warehouse_inventory_history (transaction_type);
CREATE INDEX IF NOT EXISTS idx_created_at ON warehouse_inventory_history (created_at);
CREATE INDEX IF NOT EXISTS idx_reference_no ON warehouse_inventory_history (reference_no);

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
('Mr. Reyes', '09175551001', 'ABC-1234', 'Toyota Camry', 2020, 10000, date('now','-90 day'), 'active'),
('Mrs. Santos', '09175551002', 'XYZ-5678', 'Honda Civic', 2021, 10000, date('now','-95 day'), 'active'),
('Mr. Garcia', '09175551003', 'DEF-9012', 'Ford Ranger', 2019, 10000, date('now','-85 day'), 'active'),
('Ms. Cruz', '09175551004', 'GHI-3456', 'Hyundai Accent', 2022, 10000, date('now','-70 day'), 'active');

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
(1, date('now','+2 day'), '09:00:00', 1, 1, 1, 'PMS', 'scheduled', 'normal', 'CRO001'),
(3, date('now','+3 day'), '14:00:00', 2, 2, 2, 'PMS', 'scheduled', 'high', 'CRO002');

-- Create views for easier querying
CREATE VIEW pms_due_list AS
SELECT c.id, c.name, c.contact_no, c.plate_no, c.vehicle_model,
       c.last_service_date, CAST(julianday('now') - julianday(c.last_service_date) AS INTEGER) as days_since_service
FROM customers c
WHERE c.last_service_date IS NOT NULL
AND CAST(julianday('now') - julianday(c.last_service_date) AS INTEGER) >= c.service_interval_days
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_order_id INT NOT NULL,
    foreman_id INT,
    inspection_date DATE,
    exterior_condition VARCHAR(50),
    engine_condition VARCHAR(50),
    interior_cleanliness VARCHAR(50),
    parts_installed VARCHAR(255),
    fluid_levels_ok INTEGER DEFAULT TRUE,
    electrical_systems_ok INTEGER DEFAULT TRUE,
    safety_features_ok INTEGER DEFAULT TRUE,
overall_status TEXT CHECK(overall_status IN ('passed', 'failed', 'pending', 'rework-required')) DEFAULT 'pending',
    failed_items TEXT,
    inspection_notes TEXT,
    photos_attached INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id),
    FOREIGN KEY (foreman_id) REFERENCES service_advisors(id)
);

CREATE INDEX IF NOT EXISTS idx_service_order_id ON qc_inspections (service_order_id);
CREATE INDEX IF NOT EXISTS idx_foreman_id ON qc_inspections (foreman_id);
CREATE INDEX IF NOT EXISTS idx_overall_status ON qc_inspections (overall_status);
CREATE INDEX IF NOT EXISTS idx_inspection_date ON qc_inspections (inspection_date);

-- ==================== ROAD TEST TABLE ====================
CREATE TABLE IF NOT EXISTS road_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    qc_inspection_id INT NOT NULL,
    service_order_id INT NOT NULL,
    road_test_date DATE,
    tested_by INT,
    test_distance_km INT,
    engine_sound VARCHAR(100),
    acceleration_smooth INTEGER DEFAULT TRUE,
    braking_effective INTEGER DEFAULT TRUE,
    steering_responsive INTEGER DEFAULT TRUE,
    electrical_functions_ok INTEGER DEFAULT TRUE,
    air_conditioning_ok INTEGER DEFAULT TRUE,
overall_performance TEXT CHECK(overall_performance IN ('excellent', 'good', 'acceptable', 'needs-rework')) DEFAULT 'good',
    issues_found TEXT,
    road_test_notes TEXT,
    test_video_attached INT DEFAULT 0,
status TEXT CHECK(status IN ('passed', 'failed', 'pending')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (qc_inspection_id) REFERENCES qc_inspections(id),
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id),
    FOREIGN KEY (tested_by) REFERENCES service_advisors(id)
);

CREATE INDEX IF NOT EXISTS idx_qc_inspection_id ON road_tests (qc_inspection_id);
CREATE INDEX IF NOT EXISTS idx_service_order_id ON road_tests (service_order_id);
CREATE INDEX IF NOT EXISTS idx_status ON road_tests (status);
CREATE INDEX IF NOT EXISTS idx_test_date ON road_tests (road_test_date);

-- ==================== JOB WRAP-UP TABLE ====================
CREATE TABLE IF NOT EXISTS job_wrapups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_order_id INT NOT NULL,
    job_controller_id INT,
    qc_inspection_id INT,
    technician_id INT,
    clock_out_time DATETIME,
    total_labor_hours REAL,
final_status TEXT CHECK(final_status IN ('ready-for-sa', 'returned-to-sa', 'pending', 'completed')) DEFAULT 'pending',
    final_notes TEXT,
    quality_check_passed INTEGER DEFAULT FALSE,
    job_completion_checklist TEXT,
    materials_returned INT DEFAULT 0,
    tools_returned INT DEFAULT 0,
    vehicle_condition_final VARCHAR(100),
handover_status TEXT CHECK(handover_status IN ('pending', 'ready', 'completed')) DEFAULT 'pending',
    returned_to_sa_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id),
    FOREIGN KEY (job_controller_id) REFERENCES personnel(id),
    FOREIGN KEY (qc_inspection_id) REFERENCES qc_inspections(id),
    FOREIGN KEY (technician_id) REFERENCES technicians(id)
);

CREATE INDEX IF NOT EXISTS idx_service_order_id ON job_wrapups (service_order_id);
CREATE INDEX IF NOT EXISTS idx_job_controller_id ON job_wrapups (job_controller_id);
CREATE INDEX IF NOT EXISTS idx_final_status ON job_wrapups (final_status);
CREATE INDEX IF NOT EXISTS idx_created_at ON job_wrapups (created_at);

-- ==================== CAR JOCKEY MODULE ====================
-- Vehicle movements and parking tracking for valet operations

CREATE TABLE IF NOT EXISTS vehicle_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_order_id INT NOT NULL,
    jockey_id INT NOT NULL,
movement_type TEXT CHECK(movement_type IN ('check-in', 'parking', 'retrieval', 'check-out', 'emergency-move')) DEFAULT 'check-in',
    from_location VARCHAR(100),
    to_location VARCHAR(100),
    reason TEXT,
    vehicle_condition_start TEXT,
    vehicle_condition_end TEXT,
    fuel_level_start REAL,
    fuel_level_end REAL,
    mileage_start INT,
    mileage_end INT,
    started_at DATETIME,
    completed_at DATETIME,
status TEXT CHECK(status IN ('in-progress', 'completed', 'cancelled')) DEFAULT 'in-progress',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id),
    FOREIGN KEY (jockey_id) REFERENCES personnel(id)
);

CREATE INDEX IF NOT EXISTS idx_service_order_id ON vehicle_movements (service_order_id);
CREATE INDEX IF NOT EXISTS idx_jockey_id ON vehicle_movements (jockey_id);
CREATE INDEX IF NOT EXISTS idx_movement_type ON vehicle_movements (movement_type);
CREATE INDEX IF NOT EXISTS idx_status ON vehicle_movements (status);
CREATE INDEX IF NOT EXISTS idx_started_at ON vehicle_movements (started_at);

CREATE TABLE IF NOT EXISTS parking_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_order_id INT NOT NULL,
    vehicle_movement_id INT NOT NULL,
    parking_slot VARCHAR(50),
    parking_zone VARCHAR(50),
    parking_level INT,
    parked_at DATETIME,
    retrieved_at DATETIME,
    duration_hours REAL,
    parking_fee REAL DEFAULT 0,
fee_status TEXT CHECK(fee_status IN ('pending', 'paid', 'waived')) DEFAULT 'pending',
    ground_condition TEXT,
    security_check_passed INTEGER DEFAULT TRUE,
status TEXT CHECK(status IN ('active', 'completed', 'released')) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id),
    FOREIGN KEY (vehicle_movement_id) REFERENCES vehicle_movements(id)
);

CREATE INDEX IF NOT EXISTS idx_service_order_id ON parking_records (service_order_id);
CREATE INDEX IF NOT EXISTS idx_parking_slot ON parking_records (parking_slot);
CREATE INDEX IF NOT EXISTS idx_status ON parking_records (status);
CREATE INDEX IF NOT EXISTS idx_parked_at ON parking_records (parked_at);

-- ==================== BILLING MODULE ====================
-- Invoice generation and billing management

CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_order_id INT NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    job_wrapup_id INT,
    invoice_date DATE DEFAULT (date('now')),
    due_date DATE,
    labor_hours REAL,
    labor_rate REAL DEFAULT 50.00,
    labor_cost REAL,
    materials_cost REAL DEFAULT 0,
    parts_cost REAL DEFAULT 0,
    parking_cost REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    subtotal REAL,
    total_amount REAL,
status TEXT CHECK(status IN ('draft', 'issued', 'sent', 'partial-paid', 'paid', 'cancelled')) DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (job_wrapup_id) REFERENCES job_wrapups(id)
);

CREATE INDEX IF NOT EXISTS idx_service_order_id ON invoices (service_order_id);
CREATE INDEX IF NOT EXISTS idx_customer_id ON invoices (customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_number ON invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_status ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoice_date ON invoices (invoice_date);
CREATE INDEX IF NOT EXISTS idx_due_date ON invoices (due_date);

CREATE TABLE IF NOT EXISTS billing_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INT NOT NULL,
item_type TEXT CHECK(item_type IN ('labor', 'material', 'part', 'parking', 'service', 'other')) DEFAULT 'service',
    item_description VARCHAR(255) NOT NULL,
    item_code VARCHAR(50),
    quantity REAL DEFAULT 1,
    unit_price REAL,
    line_total REAL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invoice_id ON billing_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_item_type ON billing_items (item_type);

CREATE TABLE IF NOT EXISTS invoice_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INT NOT NULL,
    payment_amount REAL,
payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'check', 'bank-transfer', 'mobile-money')) DEFAULT 'cash',
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    reference_number VARCHAR(100),
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (created_by) REFERENCES personnel(id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_id ON invoice_payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_date ON invoice_payments (payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_method ON invoice_payments (payment_method);

-- ==================== CASHIER MODULE ====================
-- Payment collection and cash drawer management

CREATE TABLE IF NOT EXISTS payment_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INT,
    customer_id INT NOT NULL,
transaction_type TEXT CHECK(transaction_type IN ('payment', 'refund', 'adjustment')) DEFAULT 'payment',
    amount REAL,
payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'check', 'bank-transfer', 'mobile-money')) DEFAULT 'cash',
    reference_number VARCHAR(100),
    card_last_four VARCHAR(4),
    bank_name VARCHAR(100),
    check_number VARCHAR(50),
transaction_status TEXT CHECK(transaction_status IN ('pending', 'completed', 'cancelled', 'failed')) DEFAULT 'pending',
    notes TEXT,
    created_by INT NOT NULL,
    processed_by INT,
    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_date DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (created_by) REFERENCES personnel(id),
    FOREIGN KEY (processed_by) REFERENCES personnel(id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_id ON payment_transactions (invoice_id);
CREATE INDEX IF NOT EXISTS idx_customer_id ON payment_transactions (customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_method ON payment_transactions (payment_method);
CREATE INDEX IF NOT EXISTS idx_transaction_status ON payment_transactions (transaction_status);
CREATE INDEX IF NOT EXISTS idx_transaction_date ON payment_transactions (transaction_date);

CREATE TABLE IF NOT EXISTS cash_drawer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cashier_id INT NOT NULL,
    opening_balance REAL DEFAULT 0,
    opening_time DATETIME,
    closing_balance REAL,
    closing_time DATETIME,
    cash_counted REAL,
    card_total REAL DEFAULT 0,
    check_total REAL DEFAULT 0,
    bank_transfer_total REAL DEFAULT 0,
    mobile_money_total REAL DEFAULT 0,
    discrepancy REAL,
drawer_status TEXT CHECK(drawer_status IN ('open', 'closed', 'reconciled')) DEFAULT 'open',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cashier_id) REFERENCES personnel(id)
);

CREATE INDEX IF NOT EXISTS idx_cashier_id ON cash_drawer (cashier_id);
CREATE INDEX IF NOT EXISTS idx_drawer_status ON cash_drawer (drawer_status);
CREATE INDEX IF NOT EXISTS idx_opening_time ON cash_drawer (opening_time);
CREATE INDEX IF NOT EXISTS idx_closing_time ON cash_drawer (closing_time);

CREATE TABLE IF NOT EXISTS payment_methods_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
method_type TEXT CHECK(method_type IN ('cash', 'card', 'check', 'bank-transfer', 'mobile-money')) DEFAULT 'cash',
    method_name VARCHAR(100),
    is_enabled INTEGER DEFAULT TRUE,
    requires_verification INTEGER DEFAULT FALSE,
    processing_fee_percent REAL DEFAULT 0,
    daily_limit REAL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_method_type ON payment_methods_config (method_type);
CREATE INDEX IF NOT EXISTS idx_is_enabled ON payment_methods_config (is_enabled);

-- ==================== SECURITY GATE MODULE ====================
-- Vehicle access control and gate logs

CREATE TABLE IF NOT EXISTS gate_access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_order_id INT NULL,
    vehicle_plate_no VARCHAR(20),
    customer_name VARCHAR(255),
access_type TEXT CHECK(access_type IN ('entry', 'exit', 'emergency-exit')) DEFAULT 'entry',
    access_time DATETIME,
    gate_operator_id INT,
security_check_status TEXT CHECK(security_check_status IN ('passed', 'failed', 'pending')) DEFAULT 'pending',
    reason_if_denied TEXT,
    mileage_at_access INT,
    vehicle_condition VARCHAR(100),
    badge_scanned VARCHAR(50),
    is_authorized INTEGER DEFAULT TRUE,
    notes TEXT,
    photo_captured INTEGER DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id),
    FOREIGN KEY (gate_operator_id) REFERENCES personnel(id)
);

CREATE INDEX IF NOT EXISTS idx_service_order_id ON gate_access_logs (service_order_id);
CREATE INDEX IF NOT EXISTS idx_access_type ON gate_access_logs (access_type);
CREATE INDEX IF NOT EXISTS idx_access_time ON gate_access_logs (access_time);
CREATE INDEX IF NOT EXISTS idx_is_authorized ON gate_access_logs (is_authorized);
CREATE INDEX IF NOT EXISTS idx_security_check_status ON gate_access_logs (security_check_status);

CREATE TABLE IF NOT EXISTS vehicle_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    badge_number VARCHAR(50) UNIQUE NOT NULL,
    service_order_id INT,
    vehicle_plate_no VARCHAR(20),
    customer_id INT,
    issue_date DATE,
    expiry_date DATE,
badge_status TEXT CHECK(badge_status IN ('active', 'inactive', 'expired', 'revoked')) DEFAULT 'active',
badge_type TEXT CHECK(badge_type IN ('temporary', 'daily', 'weekly')) DEFAULT 'temporary',
    scans_count INT DEFAULT 0,
    issued_by INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (issued_by) REFERENCES personnel(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_badge ON vehicle_badges (badge_number);
CREATE INDEX IF NOT EXISTS idx_service_order_id ON vehicle_badges (service_order_id);
CREATE INDEX IF NOT EXISTS idx_badge_status ON vehicle_badges (badge_status);
CREATE INDEX IF NOT EXISTS idx_expiry_date ON vehicle_badges (expiry_date);

-- ==================== VEHICLE HANDOVER MODULE ====================
-- Final vehicle handover and documentation

CREATE TABLE IF NOT EXISTS vehicle_handovers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_order_id INT NOT NULL,
    job_wrapup_id INT,
    handover_date DATETIME,
    technician_id INT,
    customer_id INT NOT NULL,
    final_inspection_notes TEXT,
    vehicle_cleanliness VARCHAR(50),
    fuel_level_final REAL,
    mileage_final INT,
    overall_condition VARCHAR(100),
    all_items_returned INTEGER DEFAULT TRUE,
    customer_signature_date DATETIME,
    customer_signature_captured INTEGER DEFAULT FALSE,
handover_status TEXT CHECK(handover_status IN ('pending', 'in-progress', 'completed', 'cancelled')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id),
    FOREIGN KEY (job_wrapup_id) REFERENCES job_wrapups(id),
    FOREIGN KEY (technician_id) REFERENCES technicians(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_service_order_id ON vehicle_handovers (service_order_id);
CREATE INDEX IF NOT EXISTS idx_handover_status ON vehicle_handovers (handover_status);
CREATE INDEX IF NOT EXISTS idx_handover_date ON vehicle_handovers (handover_date);

CREATE TABLE IF NOT EXISTS handover_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    handover_id INT NOT NULL,
item_type TEXT CHECK(item_type IN ('parts', 'tools', 'accessories', 'documents', 'keys', 'other')) DEFAULT 'parts',
    item_description VARCHAR(255),
    quantity INT DEFAULT 1,
    condition_before VARCHAR(50),
    condition_after VARCHAR(50),
    item_verified INTEGER DEFAULT FALSE,
    verified_by INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (handover_id) REFERENCES vehicle_handovers(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES personnel(id)
);

CREATE INDEX IF NOT EXISTS idx_handover_id ON handover_items (handover_id);
CREATE INDEX IF NOT EXISTS idx_item_type ON handover_items (item_type);

CREATE TABLE IF NOT EXISTS handover_signatures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    handover_id INT NOT NULL,
signatory_type TEXT CHECK(signatory_type IN ('customer', 'technician', 'sa', 'manager')) DEFAULT 'customer',
    signatory_name VARCHAR(255),
    signatory_role VARCHAR(100),
    signature_image BLOB,
    signature_timestamp DATETIME,
    printed_name VARCHAR(255),
    id_or_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (handover_id) REFERENCES vehicle_handovers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_handover_id ON handover_signatures (handover_id);
CREATE INDEX IF NOT EXISTS idx_signatory_type ON handover_signatures (signatory_type);

CREATE TABLE follow_ups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_order_id INT NOT NULL,
    customer_id INT NOT NULL,
    followup_date DATE NOT NULL,
    followup_time TIME,
contact_method TEXT CHECK(contact_method IN ('phone', 'sms', 'email', 'visit')) DEFAULT 'phone',
    contact_person_name VARCHAR(255),
    contact_person_phone VARCHAR(20),
followup_status TEXT CHECK(followup_status IN ('pending', 'completed', 'rescheduled', 'cancelled')) DEFAULT 'pending',
    feedback_received INTEGER DEFAULT FALSE,
    issue_reported INTEGER DEFAULT FALSE,
    followup_notes LONGTEXT,
    scheduled_by INT,
    completed_by INT,
    completion_date DATETIME,
    satisfaction_rating INT DEFAULT NULL CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (scheduled_by) REFERENCES personnel(id) ON DELETE SET NULL,
    FOREIGN KEY (completed_by) REFERENCES personnel(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_service_order_id ON follow_ups (service_order_id);
CREATE INDEX IF NOT EXISTS idx_customer_id ON follow_ups (customer_id);
CREATE INDEX IF NOT EXISTS idx_followup_date ON follow_ups (followup_date);
CREATE INDEX IF NOT EXISTS idx_followup_status ON follow_ups (followup_status);

CREATE TABLE customer_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    followup_id INT NOT NULL,
    service_quality_rating INT DEFAULT NULL CHECK (service_quality_rating >= 1 AND service_quality_rating <= 5),
    work_done_satisfaction INT DEFAULT NULL CHECK (work_done_satisfaction >= 1 AND work_done_satisfaction <= 5),
    staff_behavior_rating INT DEFAULT NULL CHECK (staff_behavior_rating >= 1 AND staff_behavior_rating <= 5),
    value_for_money_rating INT DEFAULT NULL CHECK (value_for_money_rating >= 1 AND value_for_money_rating <= 5),
    overall_experience INT DEFAULT NULL CHECK (overall_experience >= 1 AND overall_experience <= 5),
would_recommend TEXT CHECK(would_recommend IN ('yes', 'no', 'maybe')) DEFAULT NULL,
    feedback_comments LONGTEXT,
    improvement_suggestions VARCHAR(500),
    feedback_date DATETIME DEFAULT CURRENT_TIMESTAMP,
feedback_channel TEXT CHECK(feedback_channel IN ('in-person', 'phone', 'sms', 'email', 'form')) DEFAULT 'form',
    FOREIGN KEY (followup_id) REFERENCES follow_ups(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_followup_id ON customer_feedback (followup_id);
CREATE INDEX IF NOT EXISTS idx_overall_experience ON customer_feedback (overall_experience);

CREATE TABLE issue_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    followup_id INT NOT NULL,
issue_category TEXT CHECK(issue_category IN ('quality', 'warranty', 'damage', 'missing-parts', 'delayed', 'other')) DEFAULT 'other',
    issue_description VARCHAR(500),
severity TEXT CHECK(severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    reported_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    investigation_notes LONGTEXT,
    resolution_notes LONGTEXT,
issue_status TEXT CHECK(issue_status IN ('open', 'under-investigation', 'resolved', 'closed', 'escalated')) DEFAULT 'open',
    assigned_to INT,
    resolved_date DATETIME,
resolution_type TEXT CHECK(resolution_type IN ('refund', 'rework', 'replacement', 'compensation', 'explanation', 'other')) DEFAULT NULL,
    follow_up_action VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (followup_id) REFERENCES follow_ups(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES personnel(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_followup_id ON issue_tracking (followup_id);
CREATE INDEX IF NOT EXISTS idx_issue_status ON issue_tracking (issue_status);
CREATE INDEX IF NOT EXISTS idx_severity ON issue_tracking (severity);

-- ==================== APPOINTMENT CONFIRMATIONS TABLE ====================
CREATE TABLE IF NOT EXISTS appointment_confirmations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scheduling_order_id INT NOT NULL,
method TEXT CHECK(method IN ('sms', 'email', 'whatsapp', 'call')) DEFAULT 'sms',
    contact_info VARCHAR(255),
    message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP NULL,
status TEXT CHECK(status IN ('pending', 'sent', 'delivered', 'failed')) DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scheduling_order_id) REFERENCES scheduling_orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scheduling_order_id ON appointment_confirmations (scheduling_order_id);
CREATE INDEX IF NOT EXISTS idx_status ON appointment_confirmations (status);
CREATE INDEX IF NOT EXISTS idx_sent_at ON appointment_confirmations (sent_at);

-- ==================== APPOINTMENT REMINDERS TABLE ====================
CREATE TABLE IF NOT EXISTS appointment_reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scheduling_order_id INT NOT NULL,
reminder_type TEXT CHECK(reminder_type IN ('24h', '2h', '30m', 'custom')) DEFAULT '24h',
    scheduled_time DATETIME,
    sent_time TIMESTAMP NULL,
reminder_recipients TEXT CHECK(reminder_recipients IN ('customer', 'staff', 'all')) DEFAULT 'all',
status TEXT CHECK(status IN ('pending', 'sent', 'cancelled')) DEFAULT 'pending',
    sent_to_customer INTEGER DEFAULT FALSE,
    sent_to_technician INTEGER DEFAULT FALSE,
    sent_to_advisor INTEGER DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scheduling_order_id) REFERENCES scheduling_orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scheduling_order_id ON appointment_reminders (scheduling_order_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_time ON appointment_reminders (scheduled_time);
CREATE INDEX IF NOT EXISTS idx_status ON appointment_reminders (status);

-- ==================== APPOINTMENT RESCHEDULES TABLE ====================
CREATE TABLE IF NOT EXISTS appointment_reschedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scheduling_order_id INT NOT NULL,
    old_date DATE,
    old_time TIME,
    new_date DATE,
    new_time TIME,
    reason VARCHAR(255),
    rescheduled_by VARCHAR(100),
    rescheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scheduling_order_id) REFERENCES scheduling_orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scheduling_order_id ON appointment_reschedules (scheduling_order_id);
CREATE INDEX IF NOT EXISTS idx_rescheduled_at ON appointment_reschedules (rescheduled_at);

-- ==================== NO-SHOW TRACKING TABLE ====================
CREATE TABLE IF NOT EXISTS no_show_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scheduling_order_id INT NOT NULL,
    customer_id INT NOT NULL,
    scheduled_date DATE,
    scheduled_time TIME,
    reason VARCHAR(255),
    notified_at TIMESTAMP NULL,
    follow_up_created INTEGER DEFAULT FALSE,
    tracked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scheduling_order_id) REFERENCES scheduling_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scheduling_order_id ON no_show_tracking (scheduling_order_id);
CREATE INDEX IF NOT EXISTS idx_customer_id ON no_show_tracking (customer_id);
CREATE INDEX IF NOT EXISTS idx_tracked_at ON no_show_tracking (tracked_at);

-- ==================== FOLLOW-UP TASKS TABLE ====================
CREATE TABLE IF NOT EXISTS follow_up_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scheduling_order_id INT NOT NULL,
    customer_id INT NOT NULL,
task_type TEXT CHECK(task_type IN ('no-show', 'reschedule', 'callback', 'escalation', 'warranty', 'quality-issue')) DEFAULT 'no-show',
priority TEXT CHECK(priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
status TEXT CHECK(status IN ('pending', 'in-progress', 'completed', 'cancelled')) DEFAULT 'pending',
    assigned_to VARCHAR(100),
    due_date DATE,
    completed_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scheduling_order_id) REFERENCES scheduling_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scheduling_order_id ON follow_up_tasks (scheduling_order_id);
CREATE INDEX IF NOT EXISTS idx_customer_id ON follow_up_tasks (customer_id);
CREATE INDEX IF NOT EXISTS idx_status ON follow_up_tasks (status);
CREATE INDEX IF NOT EXISTS idx_due_date ON follow_up_tasks (due_date);

-- ==================== AUDIT LOGS TABLE (Enhanced) ====================
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INT,
    user_id INT,
    user_name VARCHAR(255),
    ip_address VARCHAR(45),
    browser_info VARCHAR(255),
    operation_details TEXT,
    old_values TEXT,
    new_values TEXT,
status TEXT CHECK(status IN ('success', 'failure', 'partial')) DEFAULT 'success',
    error_message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_operation_type ON audit_logs (operation_type);
CREATE INDEX IF NOT EXISTS idx_entity_type ON audit_logs (entity_type);
CREATE INDEX IF NOT EXISTS idx_timestamp ON audit_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_entity_id ON audit_logs (entity_id);

-- ==================== PARTS REQUESTS TABLE (Technician → Job Controller → Warehouse) ====================
CREATE TABLE IF NOT EXISTS parts_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_order_id INT NOT NULL,
    requested_by INT,
requested_by_role TEXT CHECK(requested_by_role IN ('technician', 'job_controller', 'admin')) DEFAULT 'technician',
status TEXT CHECK(status IN ('pending', 'sent-to-jc', 'sent-to-warehouse', 'received', 'completed', 'cancelled')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES personnel(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_service_order_id ON parts_requests (service_order_id);
CREATE INDEX IF NOT EXISTS idx_status ON parts_requests (status);
CREATE INDEX IF NOT EXISTS idx_created_at ON parts_requests (created_at);

-- ==================== PARTS REQUEST ITEMS TABLE ====================
CREATE TABLE IF NOT EXISTS parts_request_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parts_request_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity_requested INT NOT NULL,
    quantity_allocated INT DEFAULT 0,
    quantity_picked INT DEFAULT 0,
    quantity_received INT DEFAULT 0,
status TEXT CHECK(status IN ('pending', 'allocated', 'picked', 'delivered', 'cancelled')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parts_request_id) REFERENCES parts_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES warehouse_products(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_parts_request_id ON parts_request_items (parts_request_id);
CREATE INDEX IF NOT EXISTS idx_product_id ON parts_request_items (product_id);
CREATE INDEX IF NOT EXISTS idx_status ON parts_request_items (status);

-- ==================== SMS OUTBOX TABLE (One-way Automation) ====================
CREATE TABLE IF NOT EXISTS sms_outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INT NULL,
    scheduling_order_id INT NULL,
purpose TEXT CHECK(purpose IN ('APPT_CONFIRM', 'APPT_REMINDER', 'FOLLOW_UP', 'PMS_OUTREACH')) DEFAULT 'PMS_OUTREACH',
    phone VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    scheduled_at DATETIME NOT NULL,
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
status TEXT CHECK(status IN ('queued', 'sending', 'sent', 'delivered', 'failed', 'cancelled')) DEFAULT 'queued',
    provider_message_id VARCHAR(100) NULL,
    retry_count INT DEFAULT 0,
    error_message TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (scheduling_order_id) REFERENCES scheduling_orders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_status ON sms_outbox (status);
CREATE INDEX IF NOT EXISTS idx_scheduled_at ON sms_outbox (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_customer_id ON sms_outbox (customer_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_order_id ON sms_outbox (scheduling_order_id);
CREATE INDEX IF NOT EXISTS idx_provider_message_id ON sms_outbox (provider_message_id);
