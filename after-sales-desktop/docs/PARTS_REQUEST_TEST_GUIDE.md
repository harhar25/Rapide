# Parts Request System - Quick Test Guide

## Testing the Implementation Locally

### Step 1: Start the Backend Server
```bash
cd c:\xampp\htdocs\Rapide\after-sales-desktop\backend
python run.py
```
Expected output:
```
✓ Connected to MySQL at localhost:3306
Running on http://127.0.0.1:5000
```

### Step 2: Test Warehouse Products API
```bash
curl http://localhost:5000/api/warehouse/products
```

Expected response (sample):
```json
{
  "success": true,
  "data": [
    [1, "FILTER-001", "Air Filter", "Filters", 250.00, 15, 5, "Supplier A", "High-quality air filter", "active"],
    [2, "BRAKE-PAD-001", "Brake Pads", "Brakes", 800.00, 8, 3, "Supplier B", "Ceramic brake pads", "active"]
  ],
  "count": 2
}
```

### Step 3: Test Parts Request Creation
```bash
curl -X POST http://localhost:5000/api/car-jockey/parts-requests \
  -H "Content-Type: application/json" \
  -d '{
    "service_order_id": 1,
    "jockey_id": 1,
    "items": [
      { "product_id": 1, "quantity": 2 },
      { "product_id": 2, "quantity": 1 }
    ]
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Parts request submitted successfully",
  "data": { "request_id": 1 }
}
```

### Step 4: Verify Database Records
```sql
-- Check the parts request
SELECT * FROM parts_requests WHERE id = 1;

-- Check the line items
SELECT * FROM parts_request_items WHERE parts_request_id = 1;
```

Expected results:
```
parts_requests:
id=1, service_order_id=1, requested_by=1, status='sent-to-jc', created_at=[timestamp]

parts_request_items:
id=1, parts_request_id=1, product_id=1, quantity_requested=2
id=2, parts_request_id=1, product_id=2, quantity_requested=1
```

### Step 5: Test in Frontend (CarJockeyDashboard)

1. Open http://localhost:3000 (or your frontend port)
2. Login as Car Jockey role
3. Go to "Active Movements" tab
4. Find any vehicle with active movement
5. Click "Request Parts" button
6. Verify:
   - Modal opens
   - Product dropdown shows items
   - Selecting product auto-fills code & description
   - Quantity field is editable
   - Add/Remove item buttons work
   - Submit button sends request

---

## Database Schema Verification

### Check if tables exist:
```sql
SHOW TABLES LIKE 'parts_%';
```

Should show:
- parts_requests
- parts_request_items

### Check table structure:
```sql
DESCRIBE parts_requests;
DESCRIBE parts_request_items;
```

### Check status progression:
```sql
SELECT id, status, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created 
FROM parts_requests 
ORDER BY created_at DESC;
```

---

## Troubleshooting

### Issue: Modal doesn't appear
**Solution:** Verify `showPartsRequestModal` state is being set correctly
```javascript
// Check browser console for errors
console.log('Modal state:', showPartsRequestModal);
```

### Issue: Dropdown is empty
**Solution:** Check warehouse inventory is loading
```javascript
// In browser console:
// Add a console.log in loadWarehouseInventory()
console.log('Warehouse inventory loaded:', warehouseInventory);
```

### Issue: API returns 400 error
**Solution:** Verify request structure matches exactly:
```json
{
  "service_order_id": <integer>,
  "jockey_id": <integer>,
  "items": [
    { "product_id": <integer>, "quantity": <integer> }
  ]
}
```

### Issue: Foreign key constraint error
**Solution:** Ensure these exist in database:
- Valid service_order_id in scheduling_orders table
- Valid product_id in warehouse_products table
- Valid jockey_id (requested_by) in personnel table

---

## Performance Testing

### Test multi-item request:
```bash
curl -X POST http://localhost:5000/api/car-jockey/parts-requests \
  -H "Content-Type: application/json" \
  -d '{
    "service_order_id": 1,
    "jockey_id": 1,
    "items": [
      { "product_id": 1, "quantity": 5 },
      { "product_id": 2, "quantity": 3 },
      { "product_id": 3, "quantity": 10 },
      { "product_id": 4, "quantity": 2 }
    ]
  }'
```

Should create 1 request with 4 items in single transaction.

### Load test warehouse inventory:
```bash
# Time how long inventory loading takes
time curl http://localhost:5000/api/warehouse/products > /dev/null
```

Should be < 100ms for typical inventory size.

---

## Feature Testing Checklist

- [ ] Warehouse inventory dropdown displays all active products
- [ ] Product selection auto-fills product_code and description
- [ ] Quantity field only accepts numbers
- [ ] Quantity cannot be 0 or negative
- [ ] Add item button adds new line with empty selection
- [ ] Remove item button removes that line (disabled if only 1 item)
- [ ] Submit button validates all products are selected
- [ ] Success message appears after submit
- [ ] Modal closes after successful submit
- [ ] Parts request appears in database with status='sent-to-jc'
- [ ] Each item creates a parts_request_items record
- [ ] Technician info is recorded as requester

---

## Integration Testing

### Ready for Job Controller Integration:
```sql
-- Job Controller queries:
SELECT pr.id, pr.service_order_id, COUNT(pri.id) as item_count
FROM parts_requests pr
LEFT JOIN parts_request_items pri ON pr.id = pri.parts_request_id
WHERE pr.status = 'sent-to-jc'
GROUP BY pr.id;
```

Then Job Controller can:
1. Review the request
2. Forward to warehouse via `/api/warehouse/picklists`
3. Update status to `sent-to-warehouse`

---

## Database Cleanup (if needed)

```sql
-- Delete all parts requests (CASCADE deletes items too)
DELETE FROM parts_requests;

-- Reset auto-increment
ALTER TABLE parts_requests AUTO_INCREMENT = 1;
ALTER TABLE parts_request_items AUTO_INCREMENT = 1;
```

---

## Version Info

- Frontend Framework: React 18.2.0
- Backend Framework: Flask 2.0+
- Database: MySQL 5.7+
- Node: 16.0+ (for frontend build)
- Python: 3.8+ (for backend)

---

## Contact & Support

For issues or questions:
1. Check browser console (F12) for frontend errors
2. Check backend terminal for API errors
3. Check MySQL error log for database issues
4. Refer to PARTS_REQUEST_IMPLEMENTATION.md for detailed docs

---

**Last Updated:** [Current Date]  
**Status:** Ready for Testing & Integration
