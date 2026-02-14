-- Migration: Expand service_orders status values to support full workflow
-- The existing CHECK constraint only allows: pending, in-progress, completed, cancelled
-- We need to add: qc-passed, ready-for-billing, billed

-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table
-- Disable FK checks temporarily
PRAGMA foreign_keys = OFF;

-- Step 1: Create new table with expanded CHECK constraint
CREATE TABLE IF NOT EXISTS service_orders_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scheduling_order_id INT REFERENCES scheduling_orders(id) ON DELETE SET NULL,
    customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    vehicle_plate_no VARCHAR(20),
    service_type VARCHAR(50),
    check_in_time TIMESTAMP,
    estimated_completion_time DATETIME DEFAULT NULL,
    actual_completion_time DATETIME DEFAULT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in-progress', 'qc-pending', 'qc-passed', 'ready-for-billing', 'billed', 'completed', 'cancelled')),
    advisor_id INT REFERENCES service_advisors(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    qc_passed_at TEXT
);

-- Step 2: Copy data from old table
INSERT INTO service_orders_new 
SELECT * FROM service_orders;

-- Step 3: Drop old table
DROP TABLE service_orders;

-- Step 4: Rename new table
ALTER TABLE service_orders_new RENAME TO service_orders;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_customer ON service_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_plate ON service_orders(vehicle_plate_no);

-- Re-enable FK checks
PRAGMA foreign_keys = ON;
