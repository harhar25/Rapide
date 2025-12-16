# SQL Reference - Warehouse System Queries

## Quick Database Checks

### Verify Tables Exist
```sql
USE after_sales_db;
SHOW TABLES;

-- Should show these warehouse tables:
-- warehouse_products
-- warehouse_inventory_history
```

### Check Product Count
```sql
SELECT COUNT(*) AS total_products FROM warehouse_products;
```

### View All Products
```sql
SELECT id, product_code, product_name, category, unit_price, quantity_in_stock, reorder_level 
FROM warehouse_products 
ORDER BY id;
```

### View All Transactions
```sql
SELECT 
    h.id, 
    p.product_name,
    h.transaction_type,
    h.quantity,
    h.previous_quantity,
    h.new_quantity,
    h.reference_no,
    h.created_by,
    h.created_at
FROM warehouse_inventory_history h
JOIN warehouse_products p ON h.product_id = p.id
ORDER BY h.created_at DESC;
```

---

## Product Queries

### Get Specific Product
```sql
SELECT * FROM warehouse_products WHERE product_code = 'OIL-5L';
```

### Find Low Stock Products
```sql
SELECT 
    product_code,
    product_name,
    quantity_in_stock,
    reorder_level,
    (reorder_level - quantity_in_stock) AS need_to_reorder
FROM warehouse_products 
WHERE quantity_in_stock <= reorder_level
ORDER BY quantity_in_stock ASC;
```

### Calculate Inventory Value
```sql
SELECT 
    SUM(quantity_in_stock) AS total_units,
    SUM(quantity_in_stock * unit_price) AS total_value,
    COUNT(*) AS product_count
FROM warehouse_products;
```

### Products by Category
```sql
SELECT 
    category,
    COUNT(*) AS product_count,
    SUM(quantity_in_stock) AS total_units,
    SUM(quantity_in_stock * unit_price) AS category_value
FROM warehouse_products
GROUP BY category
ORDER BY category_value DESC;
```

### Products Sorted by Stock Level
```sql
SELECT 
    product_code,
    product_name,
    quantity_in_stock,
    reorder_level,
    CASE 
        WHEN quantity_in_stock <= reorder_level THEN 'LOW'
        WHEN quantity_in_stock <= reorder_level * 1.5 THEN 'MEDIUM'
        ELSE 'HIGH'
    END AS stock_status
FROM warehouse_products
ORDER BY quantity_in_stock ASC;
```

---

## Inventory Transaction Queries

### Transactions by Type
```sql
SELECT 
    transaction_type,
    COUNT(*) AS transaction_count,
    SUM(quantity) AS total_quantity
FROM warehouse_inventory_history
GROUP BY transaction_type;
```

### Stock In Transactions (Purchases)
```sql
SELECT 
    h.created_at,
    p.product_name,
    h.quantity,
    h.reference_no,
    h.created_by
FROM warehouse_inventory_history h
JOIN warehouse_products p ON h.product_id = p.id
WHERE h.transaction_type = 'in'
ORDER BY h.created_at DESC;
```

### Stock Out Transactions (Usage)
```sql
SELECT 
    h.created_at,
    p.product_name,
    h.quantity,
    h.reference_no,
    h.reference_type,
    h.created_by
FROM warehouse_inventory_history h
JOIN warehouse_products p ON h.product_id = p.id
WHERE h.transaction_type = 'out'
ORDER BY h.created_at DESC;
```

### Transactions by User
```sql
SELECT 
    created_by,
    transaction_type,
    COUNT(*) AS transactions
FROM warehouse_inventory_history
GROUP BY created_by, transaction_type
ORDER BY created_by;
```

### Transactions for Specific Date
```sql
SELECT 
    DATE(created_at) AS transaction_date,
    COUNT(*) AS total_transactions,
    SUM(quantity) AS total_quantity
FROM warehouse_inventory_history
WHERE DATE(created_at) = '2024-01-15'
GROUP BY DATE(created_at);
```

### Transaction History for Specific Product
```sql
SELECT 
    created_at,
    transaction_type,
    quantity,
    previous_quantity,
    new_quantity,
    reference_no,
    created_by
FROM warehouse_inventory_history
WHERE product_id = 1  -- Replace 1 with actual product_id
ORDER BY created_at DESC;
```

---

## Analytical Queries

### Inventory Movement Summary (Last 30 Days)
```sql
SELECT 
    p.product_code,
    p.product_name,
    SUM(CASE WHEN h.transaction_type = 'in' THEN h.quantity ELSE 0 END) AS stock_in,
    SUM(CASE WHEN h.transaction_type = 'out' THEN h.quantity ELSE 0 END) AS stock_out,
    SUM(h.quantity) AS net_movement
FROM warehouse_inventory_history h
JOIN warehouse_products p ON h.product_id = p.id
WHERE h.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY h.product_id, p.product_code, p.product_name
ORDER BY net_movement DESC;
```

### Most Used Products (by stock out)
```sql
SELECT 
    p.product_code,
    p.product_name,
    COUNT(*) AS usage_count,
    SUM(h.quantity) AS total_used
FROM warehouse_inventory_history h
JOIN warehouse_products p ON h.product_id = p.id
WHERE h.transaction_type = 'out'
AND h.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
GROUP BY h.product_id
ORDER BY total_used DESC
LIMIT 10;
```

### Most Purchased Products (by stock in)
```sql
SELECT 
    p.product_code,
    p.product_name,
    COUNT(*) AS purchase_count,
    SUM(h.quantity) AS total_purchased
FROM warehouse_inventory_history h
JOIN warehouse_products p ON h.product_id = p.id
WHERE h.transaction_type = 'in'
AND h.reference_type = 'purchase'
AND h.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
GROUP BY h.product_id
ORDER BY total_purchased DESC
LIMIT 10;
```

### Inventory Turnover Rate (Last 90 Days)
```sql
SELECT 
    p.product_code,
    p.product_name,
    p.quantity_in_stock,
    SUM(CASE WHEN h.transaction_type = 'out' THEN h.quantity ELSE 0 END) AS used_in_90_days,
    ROUND(SUM(CASE WHEN h.transaction_type = 'out' THEN h.quantity ELSE 0 END) / 
          NULLIF(p.quantity_in_stock, 0), 2) AS turnover_ratio
FROM warehouse_inventory_history h
RIGHT JOIN warehouse_products p ON h.product_id = p.id
WHERE h.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
   OR h.created_at IS NULL
GROUP BY h.product_id
ORDER BY turnover_ratio DESC;
```

### Damaged/Defective Items Report
```sql
SELECT 
    h.created_at,
    p.product_name,
    h.quantity,
    h.notes,
    h.created_by
FROM warehouse_inventory_history h
JOIN warehouse_products p ON h.product_id = p.id
WHERE h.transaction_type = 'damaged'
   OR h.reference_type = 'damage'
ORDER BY h.created_at DESC;
```

---

## Maintenance & Data Cleaning Queries

### Reset All Stock Quantities to 0 (Careful!)
```sql
UPDATE warehouse_products SET quantity_in_stock = 0;
```

### Update Product Price
```sql
UPDATE warehouse_products 
SET unit_price = 450.00 
WHERE product_code = 'OIL-5L';
```

### Update Reorder Level
```sql
UPDATE warehouse_products 
SET reorder_level = 20 
WHERE product_code = 'AIR-FILTER';
```

### Mark Product as Inactive
```sql
UPDATE warehouse_products 
SET status = 'inactive' 
WHERE id = 1;
```

### Delete Old Transactions (Before Date)
```sql
DELETE FROM warehouse_inventory_history 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);
```

### Backup Warehouse Data to File
```sql
mysqldump -u root -p after_sales_db warehouse_products warehouse_inventory_history > warehouse_backup.sql;
```

### Restore from Backup
```sql
mysql -u root -p after_sales_db < warehouse_backup.sql;
```

---

## Troubleshooting Queries

### Check for Missing Product References
```sql
SELECT DISTINCT product_id 
FROM warehouse_inventory_history
WHERE product_id NOT IN (SELECT id FROM warehouse_products);
```

### Find Duplicate Product Codes
```sql
SELECT product_code, COUNT(*) 
FROM warehouse_products 
GROUP BY product_code 
HAVING COUNT(*) > 1;
```

### Check for Orphaned Transactions
```sql
SELECT COUNT(*) 
FROM warehouse_inventory_history 
WHERE product_id NOT IN (SELECT id FROM warehouse_products);
```

### Verify Database Integrity
```sql
CHECK TABLE warehouse_products;
CHECK TABLE warehouse_inventory_history;
```

### Repair Corrupted Tables
```sql
REPAIR TABLE warehouse_products;
REPAIR TABLE warehouse_inventory_history;
```

---

## Performance & Optimization

### Add Missing Indexes (if not created by schema)
```sql
CREATE INDEX idx_product_code ON warehouse_products(product_code);
CREATE INDEX idx_product_status ON warehouse_products(status);
CREATE INDEX idx_transaction_type ON warehouse_inventory_history(transaction_type);
CREATE INDEX idx_product_id_history ON warehouse_inventory_history(product_id);
CREATE INDEX idx_created_at_history ON warehouse_inventory_history(created_at);
```

### View Current Indexes
```sql
SHOW INDEX FROM warehouse_products;
SHOW INDEX FROM warehouse_inventory_history;
```

### Check Query Performance
```sql
EXPLAIN SELECT * FROM warehouse_products WHERE quantity_in_stock <= reorder_level;
```

### Get Table Size
```sql
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.tables
WHERE table_schema = 'after_sales_db'
AND table_name IN ('warehouse_products', 'warehouse_inventory_history');
```

---

## Export & Import

### Export Products to CSV
```sql
SELECT * FROM warehouse_products
INTO OUTFILE '/tmp/products.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

### Export Transaction History to CSV
```sql
SELECT * FROM warehouse_inventory_history
INTO OUTFILE '/tmp/history.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

---

## Monthly Reports

### Month-End Summary
```sql
SELECT 
    DATE_TRUNC(h.created_at, MONTH) AS month,
    COUNT(DISTINCT h.product_id) AS products_moved,
    SUM(CASE WHEN h.transaction_type = 'in' THEN h.quantity ELSE 0 END) AS stock_in,
    SUM(CASE WHEN h.transaction_type = 'out' THEN h.quantity ELSE 0 END) AS stock_out,
    SUM(h.quantity) AS net_movement,
    COUNT(*) AS total_transactions
FROM warehouse_inventory_history h
GROUP BY DATE_TRUNC(h.created_at, MONTH)
ORDER BY month DESC;
```

### Inventory Variance Report
```sql
SELECT 
    p.product_code,
    p.product_name,
    p.quantity_in_stock,
    SUM(CASE WHEN h.transaction_type = 'in' THEN h.quantity ELSE 0 END) AS total_in,
    SUM(CASE WHEN h.transaction_type = 'out' THEN h.quantity ELSE 0 END) AS total_out
FROM warehouse_products p
LEFT JOIN warehouse_inventory_history h ON p.id = h.product_id
GROUP BY p.id
ORDER BY p.product_code;
```

---

## Tips

1. **Always backup before running DELETE or UPDATE**
2. **Use DATE_SUB for date calculations (compatible across MySQL versions)**
3. **Test SELECT before UPDATE to verify correct records**
4. **Use LIMIT 10 when exploring large result sets**
5. **Check indexes for slow queries with EXPLAIN**
6. **Archive old data periodically to keep tables performant**

---

**Need help?** Use these queries to:
- Monitor inventory health
- Track product movement
- Identify trends
- Generate reports
- Troubleshoot issues
- Maintain data quality

*All queries are optimized for MySQL 5.7+*
