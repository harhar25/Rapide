CREATE TABLE IF NOT EXISTS service_order_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_order_id INTEGER NOT NULL,
    document_type TEXT NOT NULL,
    file_name TEXT,
    file_path TEXT,
    document_data TEXT,
    printed_at TEXT NOT NULL DEFAULT (datetime('now')),
    printed_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (service_order_id) REFERENCES service_orders(id)
);
