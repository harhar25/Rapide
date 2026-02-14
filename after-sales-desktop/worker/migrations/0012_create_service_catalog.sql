-- Migration: Create Service Catalog Table
CREATE TABLE IF NOT EXISTS service_catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) DEFAULT 'general', -- PMS, Repair, Detailing
    vehicle_type VARCHAR(50) DEFAULT 'sedan', -- Sedan, SUV, Van
    base_price DECIMAL(10,2) DEFAULT 0.00,
    labor_hours DECIMAL(4,2) DEFAULT 1.0,
    description TEXT,
    status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_name ON service_catalog (service_name);
CREATE INDEX IF NOT EXISTS idx_service_category ON service_catalog (category);
