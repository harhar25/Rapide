-- Migration: Fix QC Inspections Schema
-- Ensures all required columns exist for the foreman QC workflow

-- Add missing columns if they don't exist (SQLite will error if column exists, we'll handle via try)
-- Note: D1 migrations run once - if columns already exist from other migrations, this will fail
-- Run this migration only if you get 500 errors on inspection creation

-- These columns may need to be added if 0004 minimal schema was used
ALTER TABLE qc_inspections ADD COLUMN foreman_id INTEGER;
ALTER TABLE qc_inspections ADD COLUMN inspection_date TEXT;
ALTER TABLE qc_inspections ADD COLUMN exterior_condition TEXT;
ALTER TABLE qc_inspections ADD COLUMN engine_condition TEXT;
ALTER TABLE qc_inspections ADD COLUMN interior_cleanliness TEXT;
ALTER TABLE qc_inspections ADD COLUMN parts_installed TEXT;
ALTER TABLE qc_inspections ADD COLUMN fluid_levels_ok INTEGER DEFAULT 0;
ALTER TABLE qc_inspections ADD COLUMN electrical_systems_ok INTEGER DEFAULT 0;
ALTER TABLE qc_inspections ADD COLUMN safety_features_ok INTEGER DEFAULT 0;
ALTER TABLE qc_inspections ADD COLUMN inspection_notes TEXT;
ALTER TABLE qc_inspections ADD COLUMN overall_status TEXT DEFAULT 'pending';
ALTER TABLE qc_inspections ADD COLUMN failed_items TEXT;
