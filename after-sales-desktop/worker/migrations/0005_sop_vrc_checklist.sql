-- Migration to align Vehicle Report Card (VRC) with SOP 10-point checklist
-- Recreating table to ensure clean schema with correct column names

DROP TABLE IF EXISTS vehicle_report_cards;

CREATE TABLE vehicle_report_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_order_id INT NOT NULL,
    customer_id INT NOT NULL,
    mileage_in INT,
    mileage_out INT,
    
    -- General Condition
    exterior_condition VARCHAR(500),
    interior_condition VARCHAR(500),

    -- SOP 10-Point Checklist
    -- Values: 'pass', 'fail', 'na'
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
    
    -- Meta
    settings_restored INTEGER DEFAULT 0, -- boolean
    diagnosis_completed_by VARCHAR(100),
    diagnosis_date TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (service_order_id) REFERENCES service_orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX idx_vrc_so_id ON vehicle_report_cards (service_order_id);
