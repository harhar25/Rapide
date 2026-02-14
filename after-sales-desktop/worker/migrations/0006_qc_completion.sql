-- Migration: QC Completion Features
-- Adds signature fields, road test authorization, and tracking fields

-- Add signature and completion fields to qc_inspections
ALTER TABLE qc_inspections ADD COLUMN foreman_signature TEXT;
ALTER TABLE qc_inspections ADD COLUMN technician_signature TEXT;
ALTER TABLE qc_inspections ADD COLUMN completed_at TEXT;
ALTER TABLE qc_inspections ADD COLUMN road_test_authorized INTEGER DEFAULT 0;
ALTER TABLE qc_inspections ADD COLUMN road_test_authorized_by TEXT;
ALTER TABLE qc_inspections ADD COLUMN road_test_authorization_note TEXT;
ALTER TABLE qc_inspections ADD COLUMN road_test_authorized_at TEXT;

-- Add road test tracking fields to qc_road_tests
ALTER TABLE qc_road_tests ADD COLUMN tester_name TEXT;
ALTER TABLE qc_road_tests ADD COLUMN start_time TEXT;
ALTER TABLE qc_road_tests ADD COLUMN end_time TEXT;
ALTER TABLE qc_road_tests ADD COLUMN route_compliance INTEGER DEFAULT 1;
ALTER TABLE qc_road_tests ADD COLUMN authorization_stamp TEXT;
ALTER TABLE qc_road_tests ADD COLUMN authorized_by TEXT;

-- Add qc_passed_at field to service_orders for tracking
ALTER TABLE service_orders ADD COLUMN qc_passed_at TEXT;
