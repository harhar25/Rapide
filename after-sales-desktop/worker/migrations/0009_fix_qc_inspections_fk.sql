-- Fix qc_inspections foreign key: should reference service_orders, not scheduling_orders
-- SQLite doesn't support ALTER TABLE to modify FK, so we need to recreate the table

-- Step 1: Create new table with correct FK
CREATE TABLE IF NOT EXISTS qc_inspections_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_order_id INT NOT NULL,
    foreman_id INT,
    inspection_date DATE,
    exterior_condition VARCHAR(50),
    engine_condition VARCHAR(50),
    interior_cleanliness VARCHAR(50),
    parts_installed VARCHAR(255),
    fluid_levels_ok INTEGER DEFAULT 1,
    electrical_systems_ok INTEGER DEFAULT 1,
    safety_features_ok INTEGER DEFAULT 1,
    overall_status TEXT CHECK(overall_status IN ('passed', 'failed', 'pending', 'rework-required')) DEFAULT 'pending',
    failed_items TEXT,
    inspection_notes TEXT,
    photos_attached INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES service_orders(id)
);

-- Step 2: Copy existing data
INSERT INTO qc_inspections_new SELECT * FROM qc_inspections;

-- Step 3: Drop old table
DROP TABLE qc_inspections;

-- Step 4: Rename new table
ALTER TABLE qc_inspections_new RENAME TO qc_inspections;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_qc_service_order_id ON qc_inspections (service_order_id);
CREATE INDEX IF NOT EXISTS idx_qc_foreman_id ON qc_inspections (foreman_id);
CREATE INDEX IF NOT EXISTS idx_qc_overall_status ON qc_inspections (overall_status);
CREATE INDEX IF NOT EXISTS idx_qc_inspection_date ON qc_inspections (inspection_date);


-- Also fix road_tests table which has the same issue
CREATE TABLE IF NOT EXISTS road_tests_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    qc_inspection_id INT NOT NULL,
    service_order_id INT NOT NULL,
    road_test_date DATE,
    tested_by INT,
    test_distance_km INT,
    engine_sound VARCHAR(100),
    acceleration_smooth INTEGER DEFAULT 1,
    braking_effective INTEGER DEFAULT 1,
    steering_responsive INTEGER DEFAULT 1,
    electrical_functions_ok INTEGER DEFAULT 1,
    air_conditioning_ok INTEGER DEFAULT 1,
    overall_performance TEXT CHECK(overall_performance IN ('excellent', 'good', 'acceptable', 'needs-rework')) DEFAULT 'good',
    issues_found TEXT,
    road_test_notes TEXT,
    test_video_attached INT DEFAULT 0,
    status TEXT CHECK(status IN ('passed', 'failed', 'pending')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (qc_inspection_id) REFERENCES qc_inspections(id),
    FOREIGN KEY (service_order_id) REFERENCES service_orders(id)
);

INSERT INTO road_tests_new SELECT * FROM road_tests;
DROP TABLE road_tests;
ALTER TABLE road_tests_new RENAME TO road_tests;

CREATE INDEX IF NOT EXISTS idx_rt_qc_inspection_id ON road_tests (qc_inspection_id);
CREATE INDEX IF NOT EXISTS idx_rt_service_order_id ON road_tests (service_order_id);
