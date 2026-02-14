-- Fix Foreign Key for parts_requests to point to service_orders instead of scheduling_orders
-- This fixes the constraint violation when creating requests for Active Jobs

PRAGMA foreign_keys=OFF;

CREATE TABLE parts_requests_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_order_id INT NOT NULL,
    requested_by INT,
    requested_by_role TEXT CHECK(requested_by_role IN ('technician', 'job_controller', 'admin')) DEFAULT 'technician',
    status TEXT CHECK(status IN ('pending', 'sent-to-jc', 'sent-to-warehouse', 'received', 'completed', 'cancelled')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES service_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES personnel(id) ON DELETE SET NULL
);

INSERT INTO parts_requests_new SELECT * FROM parts_requests;

DROP TABLE parts_requests;

ALTER TABLE parts_requests_new RENAME TO parts_requests;

CREATE INDEX idx_parts_requests_service_order_id ON parts_requests (service_order_id);
CREATE INDEX idx_parts_requests_status ON parts_requests (status);
CREATE INDEX idx_parts_requests_created_at ON parts_requests (created_at);

PRAGMA foreign_keys=ON;
