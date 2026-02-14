-- Migration: Expand job_wrapups final_status to support new workflow
-- Current: ready-for-sa, returned-to-sa, pending, completed
-- Need to add: stopped, ready-for-billing

PRAGMA foreign_keys = OFF;

-- Step 1: Create new table with expanded CHECK constraint
CREATE TABLE IF NOT EXISTS job_wrapups_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_order_id INT NOT NULL,
    job_controller_id INT,
    qc_inspection_id INT,
    technician_id INT,
    clock_out_time DATETIME,
    total_labor_hours REAL,
    final_status TEXT CHECK(final_status IN ('pending', 'stopped', 'ready-for-sa', 'returned-to-sa', 'ready-for-billing', 'completed')) DEFAULT 'pending',
    final_notes TEXT,
    quality_check_passed INTEGER DEFAULT FALSE,
    job_completion_checklist TEXT,
    materials_returned INT DEFAULT 0,
    tools_returned INT DEFAULT 0,
    vehicle_condition_final VARCHAR(100),
    handover_status TEXT CHECK(handover_status IN ('pending', 'ready', 'completed')) DEFAULT 'pending',
    returned_to_sa_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Copy data from old table (if any)
INSERT INTO job_wrapups_new 
SELECT * FROM job_wrapups;

-- Step 3: Drop old table
DROP TABLE job_wrapups;

-- Step 4: Rename new table
ALTER TABLE job_wrapups_new RENAME TO job_wrapups;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_job_wrapups_service_order ON job_wrapups(service_order_id);
CREATE INDEX IF NOT EXISTS idx_job_wrapups_status ON job_wrapups(final_status);

PRAGMA foreign_keys = ON;
