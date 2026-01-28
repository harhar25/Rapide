#!/usr/bin/env python3
"""Initialize Parts Request tables in the database"""
import sys
sys.path.insert(0, './backend')

from database import db

# SQL to create parts_requests table
create_parts_requests_sql = """
CREATE TABLE IF NOT EXISTS parts_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_order_id INT NOT NULL,
    requested_by INT,
    requested_by_role ENUM('technician', 'job_controller', 'admin') DEFAULT 'technician',
    status ENUM('pending', 'sent-to-jc', 'sent-to-warehouse', 'received', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES scheduling_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES personnel(id) ON DELETE SET NULL,
    INDEX idx_service_order_id (service_order_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
)
"""

# SQL to create parts_request_items table
create_parts_items_sql = """
CREATE TABLE IF NOT EXISTS parts_request_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parts_request_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity_requested INT NOT NULL,
    quantity_allocated INT DEFAULT 0,
    quantity_picked INT DEFAULT 0,
    quantity_received INT DEFAULT 0,
    status ENUM('pending', 'allocated', 'picked', 'delivered', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parts_request_id) REFERENCES parts_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES warehouse_products(id) ON DELETE RESTRICT,
    INDEX idx_parts_request_id (parts_request_id),
    INDEX idx_product_id (product_id),
    INDEX idx_status (status)
)
"""

try:
    print("Creating parts_requests table...")
    db.execute_update(create_parts_requests_sql, ())
    print("✓ parts_requests table created successfully")
    
    print("Creating parts_request_items table...")
    db.execute_update(create_parts_items_sql, ())
    print("✓ parts_request_items table created successfully")
    
    print("\nDatabase tables initialized successfully!")
except Exception as e:
    print(f"✗ Error initializing tables: {e}")
    sys.exit(1)
