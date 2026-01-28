-- Warehouse Picklist Tables
-- Add these tables to the after_sales_db database

USE after_sales_db;

-- ==================== WAREHOUSE PICKLIST TABLES ====================
CREATE TABLE IF NOT EXISTS warehouse_picklists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    picklist_number VARCHAR(50) NOT NULL UNIQUE,
    request_date DATE NOT NULL,
    job_order_number VARCHAR(50) NOT NULL,
    customer VARCHAR(255) NOT NULL,
    vehicle VARCHAR(255),
    priority_level ENUM('normal', 'urgent', 'high') DEFAULT 'normal',
    requested_by VARCHAR(100),
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_job_order_number (job_order_number),
    INDEX idx_created_at (created_at),
    INDEX idx_picklist_number (picklist_number)
);

CREATE TABLE IF NOT EXISTS warehouse_picklist_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    picklist_id INT NOT NULL,
    item_id INT,
    product_code VARCHAR(50),
    description VARCHAR(255),
    quantity_required INT NOT NULL DEFAULT 1,
    quantity_picked INT DEFAULT 0,
    bin_location VARCHAR(100),
    picked_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (picklist_id) REFERENCES warehouse_picklists(id) ON DELETE CASCADE,
    INDEX idx_picklist_id (picklist_id),
    INDEX idx_item_id (item_id)
);
