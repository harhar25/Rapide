-- D1/SQLite compatible schema generated from schema.sql
PRAGMA foreign_keys = ON;
-- After-Sales Service Management System Database Schema
-- Modified to include SOP 10-Point Checklist

-- ==================== PERSONNEL TABLE ====================
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
-- ... (Indices remain same, keeping it brief for file write) ...

-- ==================== SERVICE ORDERS ====================
CREATE TABLE IF NOT EXISTS service_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scheduling_order_id INT,
    customer_id INT NOT NULL,
    vehicle_plate_no VARCHAR(20),
    service_type VARCHAR(50),
    check_in_time TIMESTAMP,
    estimated_completion_time DATETIME NULL DEFAULT NULL,
    actual_completion_time DATETIME NULL DEFAULT NULL,
    status TEXT DEFAULT 'pending', 
    advisor_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== VEHICLE REPORT CARDS (SOP COMPLIANT) ====================
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
    settings_restored INTEGER DEFAULT 0,
    diagnosis_completed_by VARCHAR(100),
    diagnosis_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES service_orders(id)
);
