-- ============================================================
-- Migration 0014: Truncate all tables, add location to personnel,
-- add admin_id FK to all major tables for multi-branch isolation
-- ============================================================

-- ═══════════════════════════════════════════
-- PHASE 1: TRUNCATE ALL TABLES (fresh start)
-- ═══════════════════════════════════════════
PRAGMA foreign_keys = OFF;

DELETE FROM followup_issues;
DELETE FROM followup_feedback;
DELETE FROM followups;
DELETE FROM gatepass_signatures;
DELETE FROM gatepasses;
DELETE FROM handover_signatures;
DELETE FROM handover_items;
DELETE FROM vehicle_handovers;
DELETE FROM qc_road_tests;
DELETE FROM qc_inspections;
DELETE FROM service_order_documents;
DELETE FROM vehicle_report_cards;
DELETE FROM customer_info_sheets;
DELETE FROM billing_payments;
DELETE FROM billing_invoices;
DELETE FROM cashier_drawers;
DELETE FROM warehouse_picklist_items;
DELETE FROM warehouse_picklists;
DELETE FROM warehouse_inventory_history;
DELETE FROM warehouse_products;
DELETE FROM parts_request_items;
DELETE FROM parts_requests;
DELETE FROM car_jockey_parts_requests;
DELETE FROM car_jockey_parking;
DELETE FROM car_jockey_movements;
DELETE FROM job_wrapups;
DELETE FROM job_controller_assignments;
DELETE FROM technician_assignments;
DELETE FROM contact_attempts;
DELETE FROM scheduling_orders;
DELETE FROM customer_interactions;
DELETE FROM security_gate_access_logs;
DELETE FROM security_gate_badges;
DELETE FROM service_catalog;
DELETE FROM service_orders;
DELETE FROM technicians;
DELETE FROM service_advisors;
DELETE FROM customers;
DELETE FROM personnel;

PRAGMA foreign_keys = ON;

-- ═══════════════════════════════════════════
-- PHASE 2: Add location column to personnel
-- ═══════════════════════════════════════════
ALTER TABLE personnel ADD COLUMN location TEXT DEFAULT NULL;

-- ═══════════════════════════════════════════
-- PHASE 3: Add admin_id FK to all major tables
-- ═══════════════════════════════════════════
ALTER TABLE customers ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE service_orders ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE scheduling_orders ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE billing_invoices ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE billing_payments ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE vehicle_report_cards ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE qc_inspections ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE qc_road_tests ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE job_controller_assignments ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE job_wrapups ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE vehicle_handovers ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE gatepasses ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE parts_requests ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE car_jockey_movements ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE car_jockey_parking ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE car_jockey_parts_requests ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE warehouse_products ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE warehouse_picklists ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE followups ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE customer_interactions ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE security_gate_access_logs ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE security_gate_badges ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE cashier_drawers ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE technicians ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE service_advisors ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE contact_attempts ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE customer_info_sheets ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE service_order_documents ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE service_catalog ADD COLUMN admin_id INTEGER DEFAULT NULL;
ALTER TABLE technician_assignments ADD COLUMN admin_id INTEGER DEFAULT NULL;
