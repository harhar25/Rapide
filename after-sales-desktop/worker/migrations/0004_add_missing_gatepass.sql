-- Fix Missing Tables (implied by previous context but missing in schema_d1.sql)
-- Adding gatepasses table which is referenced in worker code but missing in schema file

PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS gatepasses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_order_id INT NOT NULL,
    customer_id INT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'printed')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES service_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gatepass_signatures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gatepass_id INT NOT NULL,
    signature_type VARCHAR(50) NOT NULL, -- 'customer', 'security', 'advisor'
    signed_by INT, -- user id if applicable, or null for customer
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    signature_data TEXT, -- base64 or blob if we store it
    FOREIGN KEY (gatepass_id) REFERENCES gatepasses(id) ON DELETE CASCADE
);

-- Also implied missing tables from previous read of worker/src/index.ts:
-- handover_items, handover_signatures, qc_inspections, qc_road_tests, billing_invoices, billing_payments, cashier_drawers

CREATE TABLE IF NOT EXISTS handover_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_order_id INT NOT NULL,
    item_name VARCHAR(100),
    checked BOOLEAN DEFAULT 0,
    FOREIGN KEY (service_order_id) REFERENCES service_orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS qc_inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_order_id INT NOT NULL,
    inspector_id INT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES service_orders(id) ON DELETE CASCADE
);

PRAGMA foreign_keys=ON;
