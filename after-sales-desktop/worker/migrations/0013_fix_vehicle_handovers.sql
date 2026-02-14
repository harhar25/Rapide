-- Add missing columns to vehicle_handovers table
ALTER TABLE vehicle_handovers ADD COLUMN inspection_notes TEXT;
ALTER TABLE vehicle_handovers ADD COLUMN created_at TEXT DEFAULT (datetime('now'));
