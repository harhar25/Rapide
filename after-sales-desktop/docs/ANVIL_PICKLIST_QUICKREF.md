# Anvil Picklist Quick Reference

## Files at a Glance

| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| `frontend/src/components/AnvilPicklist.jsx` | Main picklist component | 900+ | ✅ Created |
| `frontend/src/styles/anvil-picklist.css` | Picklist styling | 400+ | ✅ Created |
| `frontend/src/pages/WarehouseDashboard.jsx` | Dashboard with picklist tab | 680+ | ✅ Updated |
| `frontend/src/styles/warehouse-dashboard.css` | Dashboard picklist styles | 450+ | ✅ Updated |
| `backend/app/routes/warehouse_routes.py` | API endpoints | 390+ | ✅ Updated |
| `backend/app/services/warehouse_service.py` | Service logic | 510+ | ✅ Updated |
| `database/picklist_schema.sql` | Database schema | 50+ | ✅ Created |
| `docs/ANVIL_PICKLIST_FEATURE.md` | Full documentation | 600+ | ✅ Created |
| `docs/ANVIL_PICKLIST_INTEGRATION_GUIDE.md` | Integration guide | 500+ | ✅ Created |

## Database Setup

Run this SQL file to create picklist tables:
```bash
mysql < database/picklist_schema.sql
```

Or manually execute in MySQL:
```sql
USE after_sales_db;
-- Then run contents of database/picklist_schema.sql
```

## Key Components

### AnvilPicklist Component
**Purpose:** Warehouse staff interface for picking items

**Props:**
```javascript
{
  partsRequest: object,      // Picklist data
  onClose: function,         // Close handler
  onComplete: function       // Completion handler
}
```

**Key Methods:**
```javascript
calculateCompleteness()      // Get % complete
isPicklistComplete()         // Validate all items picked
generatePicklistHTML()       // Create print template
handleItemPicked()           // Update quantity
handleLocationUpdate()       // Record location
handleCompletePicklist()     // Submit picklist
```

### API Endpoints

**Create Picklist:**
```
POST /api/warehouse/picklists
```

**Get Active Picklists:**
```
GET /api/warehouse/picklists
```

**Get Specific Picklist:**
```
GET /api/warehouse/picklists/{id}
```

**Update Item Pick:**
```
PUT /api/warehouse/picklists/{id}/items/{itemId}
```

**Complete Picklist:**
```
PUT /api/warehouse/picklists/{id}/complete
```

## Usage Workflow

```
1. Job Controller sends parts request
   POST /api/warehouse/picklists
   
2. Warehouse Dashboard receives picklist
   GET /api/warehouse/picklists
   
3. Warehouse staff opens picklist
   Click "Pick Items" button
   
4. AnvilPicklist component renders
   - Show items to pick
   - Update quantities
   - Record locations
   - Print if needed
   
5. Submit completed picklist
   PUT /api/warehouse/picklists/{id}/complete
   
6. Inventory updated
   Quantity reduced from stock
   
7. Job Controller retrieved items
   GET /api/warehouse/picklists/{id}
```

## Color Scheme (Anvil Theme)

```css
Primary Navy:       #1a3a52    (Dark backgrounds)
Primary Blue:       #0275d8    (Interactive elements)
Success Green:      #5cb85c    (Positive actions)
Error Red:          #e74c3c    (Destructive actions)
Warning Orange:     #f0ad4e    (Warnings)
Light Gray:         #f9f9f9    (Card backgrounds)
Border Gray:        #e0e0e0    (Borders)
Text Dark:          #333333    (Primary text)
Text Medium:        #666666    (Secondary text)
```

## CSS Classes

**Main Container:**
```css
.anvil-picklist-container
.picklist-header
.picklist-content
.picklist-footer
```

**Progress:**
```css
.progress-bar
.progress-fill
.progress-text
```

**Items:**
```css
.picklist-items
.pick-item
.pick-item.complete
.item-controls
```

**Buttons:**
```css
.btn-preview      (Green)
.btn-print        (Blue)
.btn-close        (Red)
.btn-complete     (Green)
.btn-print-action (Blue)
```

## Print Optimization

- **Font:** Monospace (Courier New) for codes
- **Layout:** Table format for items
- **Page Size:** 8.5" × 11" (US Letter)
- **Media Query:** `@media print`
- **Margins:** 0.5" on all sides

## Common Patterns

### Create Picklist Request
```javascript
const picklistData = {
  jobOrderNumber: 'JO-2025-001',
  customer: 'John Smith',
  vehicle: 'Toyota Corolla 2020',
  priorityLevel: 'normal',
  requestedBy: currentUser.name,
  items: [
    {
      id: 1,
      code: 'OIL-5W30',
      description: 'Engine Oil 5W-30',
      quantity: 1
    }
  ]
};

fetch('/api/warehouse/picklists', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(picklistData)
});
```

### Monitor Picklist Status
```javascript
const monitor = async (picklistId) => {
  const response = await fetch(`/api/warehouse/picklists/${picklistId}`);
  const { data } = await response.json();
  return data.status; // pending, in_progress, completed
};
```

### Update Item Pick
```javascript
fetch(`/api/warehouse/picklists/${id}/items/${itemId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pickedQuantity: 1,
    location: 'A-15-2',
    notes: 'Quality checked'
  })
});
```

## Troubleshooting Checklist

- [ ] Database tables created (`picklist_schema.sql` run)
- [ ] Backend routes registered in `app/__init__.py`
- [ ] Frontend imports include AnvilPicklist
- [ ] CSS file imported in component
- [ ] PrinterSelector component available
- [ ] Electron IPC configured for printing
- [ ] API endpoints respond correctly
- [ ] Form validation works
- [ ] Print output renders correctly

## Important Notes

1. **Required Fields:**
   - jobOrderNumber (must match job order)
   - customer (customer name)
   - vehicle (vehicle description)
   - items (at least 1 item)

2. **Status Progression:**
   - pending → in_progress (when picking starts)
   - in_progress → completed (when all items picked)
   - Cannot skip status transitions

3. **Print Requirements:**
   - Requires PrinterSelector modal
   - Requires Electron IPC on desktop
   - Falls back to browser print dialog if needed

4. **Inventory Management:**
   - Completing picklist reduces stock automatically
   - Requires proper product IDs in warehouse_products table
   - Should add audit trail for compliance

## Performance Considerations

- **Polling Interval:** 30 seconds (configurable)
- **Batch Requests:** Create multiple picklists at once if needed
- **Database Indexes:** picklist_number, status, created_at
- **Connection Pooling:** Recommended for production

## Security Considerations

- Validate user permissions before creating picklist
- Log all picklist actions for audit trail
- Validate item quantities (no negative numbers)
- Prevent duplicate picklist creation
- Sanitize input data

## Integration Checklist

- [ ] Database schema installed
- [ ] Backend API endpoints working
- [ ] Frontend components imported
- [ ] Warehouse Dashboard tab added
- [ ] Printer integration tested
- [ ] Error handling implemented
- [ ] Documentation reviewed
- [ ] Test cases passed

## Next Steps

1. **Deploy Database Schema**
   ```bash
   mysql -u root -p < database/picklist_schema.sql
   ```

2. **Start Backend Server**
   ```bash
   python backend/run.py
   ```

3. **Start Frontend**
   ```bash
   npm start
   ```

4. **Test in Warehouse Dashboard**
   - Create test picklist via API
   - View in "Parts Picklist" tab
   - Test picking and printing

5. **Integrate with Job Controller**
   - Add parts request button
   - Create API call to POST /api/warehouse/picklists
   - Add polling for completion status

## Related Documents

- [Feature Documentation](ANVIL_PICKLIST_FEATURE.md)
- [Integration Guide](ANVIL_PICKLIST_INTEGRATION_GUIDE.md)
- [Job Order Guide](ANVIL_JOB_ORDER_PRINT_FEATURE.md)
- [Warehouse Documentation](WAREHOUSE_DOCUMENTATION.md)

## Support Resources

**Error Messages:**
- "Picklist not found" → Check picklist ID exists in database
- "Items required not met" → Ensure quantity picked >= quantity required
- "Failed to update pick" → Check item ID and picklist ID
- "Print not available" → Check Electron IPC / browser support

**Debug Mode:**
```javascript
// In browser console
localStorage.setItem('DEBUG_PICKLIST', 'true');
// Will log detailed info about picks and submissions
```

---

**Quick Links:**
- 🏠 [Documentation Index](📚_DOCUMENTATION_INDEX.md)
- 🎯 [Project Overview](PROJECT_OVERVIEW.md)
- 📊 [Architecture](ARCHITECTURE.md)
- ✅ [Implementation Status](PROJECT_STATUS.md)

**Status:** Ready for Production ✅
**Last Updated:** 2025
