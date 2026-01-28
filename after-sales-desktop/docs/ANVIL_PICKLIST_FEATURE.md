# Anvil Warehouse Parts Picklist Feature Documentation

## Overview

The **Anvil Warehouse Parts Picklist** system provides warehouse staff with a professional, print-optimized interface to fulfill parts requests from the Job Controller. This feature integrates seamlessly with the existing job order system to create an efficient warehouse workflow.

**Workflow:**
```
Job Controller (Create Job Order with Parts Request)
    ↓
Job Controller (Send Parts Request to Warehouse)
    ↓
Warehouse Dashboard (Receives Picklist)
    ↓
Warehouse Staff (Uses AnvilPicklist to Pick Items)
    ↓
Warehouse Staff (Prints Picklist & Updates Inventory)
    ↓
Job Controller (Receives Parts for Service)
```

## Features

### 1. **Picklist Management**
- View all active picklists (pending and in-progress)
- Select a picklist to begin picking items
- Track multiple simultaneous picklists
- Status tracking: pending → in_progress → completed

### 2. **Item Picking Interface**
- Per-item quantity tracking
- Bin location recording
- Picking notes for quality assurance
- Visual progress indicator (percentage complete)
- Real-time completion validation

### 3. **Printer Integration**
- Print picklists with warehouse-optimized formatting
- Monospace font for easy scanning
- Includes all item details and bin locations
- Support for multiple printer selection
- Direct printer output without browser dialog

### 4. **Professional Design (Anvil Theme)**
- Navy (#1a3a52), Blue (#0275d8), Green (#5cb85c) color scheme
- Industrial aesthetic with clean typography
- Responsive design for desktop and tablets
- Print-optimized layouts (8.5" × 11" pages)

## Component Architecture

### Frontend Components

#### **AnvilPicklist.jsx** (900+ lines)
Located: `frontend/src/components/AnvilPicklist.jsx`

Main component for the warehouse picklist interface.

**Props:**
```javascript
{
  partsRequest: {
    picklistNumber: string,
    requestDate: string,
    jobOrderNumber: string,
    customer: string,
    vehicle: string,
    priorityLevel: 'normal' | 'urgent' | 'high',
    requestedBy: string,
    items: [
      {
        id: number,
        code: string,
        description: string,
        quantity: number,
        location?: string
      }
    ],
    status: 'pending' | 'in_progress' | 'completed'
  },
  onClose: function,
  onComplete: function
}
```

**Key Methods:**
- `calculateCompleteness()` - Returns percentage complete
- `isPicklistComplete()` - Validates all items picked to required quantity
- `generatePicklistHTML()` - Creates printable HTML template
- `handleItemPicked(itemId, quantity)` - Updates quantity picked
- `handleLocationUpdate(itemId, location)` - Records bin location
- `handleCompletePicklist()` - Submits completed picklist

**State Management:**
```javascript
// Picklist details
const [picklistData, setPicklistData] = useState({
  picklistNumber: '',
  requestDate: '',
  jobOrderNumber: '',
  customer: '',
  vehicle: '',
  priorityLevel: 'normal',
  requestedBy: '',
  items: [],
  status: 'pending'
});

// Tracking picked items
const [pickedItems, setPickedItems] = useState({
  // {itemId: {quantity, location, notes}}
});
```

#### **PrinterSelector.jsx** (150+ lines)
Located: `frontend/src/components/PrinterSelector.jsx`

Modal component for printer selection. Reused from Job Order feature.

**Features:**
- Auto-detects available printers
- Default printer highlighting
- Loading states and error handling
- Radio button selection interface

### Services

#### **printService.js**
Located: `frontend/src/services/printService.js`

Abstraction layer for printer operations.

**Methods:**
```javascript
// Get available printers
getPrinters(): Promise<Array>

// Send print job to specific printer
printJobOrder(html, printerName): Promise<boolean>

// Get default printer
getDefaultPrinter(): Promise<string>
```

### Styling

#### **anvil-picklist.css** (400+ lines)
Located: `frontend/src/styles/anvil-picklist.css`

**CSS Classes:**
- `.anvil-picklist-container` - Main container
- `.picklist-header` - Header section with progress bar
- `.picklist-info-section` - Job/customer information cards
- `.picklist-items` - Items container
- `.pick-item` - Individual item card
- `.progress-bar` & `.progress-fill` - Completion indicator
- `.status-badge` - Status labels
- Print media queries for optimization

**Color Variables (Anvil Theme):**
- Primary Navy: `#1a3a52`
- Primary Blue: `#0275d8`
- Success Green: `#5cb85c`
- Error Red: `#e74c3c`
- Light Gray: `#f9f9f9`, `#e0e0e0`

## Backend Integration

### Routes (warehouse_routes.py)

**Picklist Endpoints:**

```python
# Get all active picklists
GET /api/warehouse/picklists
Response: {
  success: boolean,
  data: [picklist...],
  count: number
}

# Get specific picklist
GET /api/warehouse/picklists/<id>
Response: {
  success: boolean,
  data: picklist_with_items
}

# Create new picklist from job controller
POST /api/warehouse/picklists
Body: {
  jobOrderNumber: string,
  customer: string,
  vehicle: string,
  priorityLevel: 'normal' | 'urgent' | 'high',
  requestedBy: string,
  items: [
    {
      id: number,
      code: string,
      description: string,
      quantity: number
    }
  ]
}
Response: {
  success: boolean,
  picklist_id: number,
  message: string
}

# Update picked item
PUT /api/warehouse/picklists/<id>/items/<itemId>
Body: {
  pickedQuantity: number,
  location: string,
  notes: string
}

# Mark picklist as completed
PUT /api/warehouse/picklists/<id>/complete
Body: {
  picklistNumber: string,
  jobOrderNumber: string,
  // ... all picklist data
}
Response: {
  success: boolean,
  message: string
}
```

### Service Methods (warehouse_service.py)

```python
# Get all active picklists
get_active_picklists() -> List[dict]

# Get picklist with items
get_picklist_by_id(picklist_id) -> dict

# Create new picklist
create_picklist(picklist_data) -> int (picklist_id)

# Update picked quantity/location
update_picked_item(picklist_id, item_id, picked_qty, location, notes) -> bool

# Mark as completed
complete_picklist(picklist_id, picklist_data) -> bool

# Get picklist items
_get_picklist_items(picklist_id) -> List[dict]
```

## Database Schema

### Tables Created

**warehouse_picklists**
```sql
CREATE TABLE warehouse_picklists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    picklist_number VARCHAR(50) NOT NULL UNIQUE,
    request_date DATE NOT NULL,
    job_order_number VARCHAR(50) NOT NULL,
    customer VARCHAR(255) NOT NULL,
    vehicle VARCHAR(255),
    priority_level ENUM('normal', 'urgent', 'high'),
    requested_by VARCHAR(100),
    status ENUM('pending', 'in_progress', 'completed', 'cancelled'),
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    INDEXES: status, job_order_number, created_at, picklist_number
);
```

**warehouse_picklist_items**
```sql
CREATE TABLE warehouse_picklist_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    picklist_id INT NOT NULL,
    item_id INT,
    product_code VARCHAR(50),
    description VARCHAR(255),
    quantity_required INT,
    quantity_picked INT,
    bin_location VARCHAR(100),
    picked_notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY: picklist_id -> warehouse_picklists(id),
    INDEXES: picklist_id, item_id
);
```

## Integration Points

### Warehouse Dashboard
Located: `frontend/src/pages/WarehouseDashboard.jsx`

**Added Tab:**
- Tab button: "Parts Picklist"
- Active tab ID: `'picklist'`
- Content view shows list of active picklists
- Click "Pick Items" to open AnvilPicklist modal

**New State:**
```javascript
const [picklists, setPicklists] = useState([]);
const [selectedPicklist, setSelectedPicklist] = useState(null);
const [showPicklist, setShowPicklist] = useState(false);
```

**New Methods:**
```javascript
// Load all active picklists
loadPicklists() -> Promise

// Handle picklist completion
handlePicklistComplete(completedPicklist) -> Promise
```

**Tab Content:**
- List view of active picklists (pending + in_progress)
- Each picklist shows: number, job order, customer, vehicle, status, item count
- "Pick Items" button opens AnvilPicklist modal
- Empty state if no active picklists

### Job Controller Integration (Future)
The Job Controller should:
1. Create job order with parts request
2. Call `POST /api/warehouse/picklists` to create picklist
3. Warehouse receives picklist in dashboard
4. Warehouse staff picks items and completes picklist
5. Job Controller polls for completed status and retrieves parts

## Printing Workflow

### Print Template
The `generatePicklistHTML()` method creates an optimized print template with:

**Header:**
- Picklist number and date
- Job order number
- Customer and vehicle information
- Priority level and status

**Item Details Table:**
```
Code    Description    Required    Location    Notes
----    -----------    --------    --------    -----
[code]  [description]  [qty]       [location]  [notes]
```

**Footer:**
- Print timestamp
- Warehouse information
- Completion signature lines

### Print Optimization
- Monospace font (Courier New) for item codes
- Print media query hiding UI controls
- Page breaks for multi-page picklists
- 8.5" × 11" US Letter sizing
- Optimized margins and spacing

## Usage Examples

### Creating a Picklist (from Job Controller)
```javascript
// In Job Controller after service request is created
const createPicklist = async (jobOrder) => {
  const picklistData = {
    jobOrderNumber: jobOrder.orderNumber,
    customer: jobOrder.customer.name,
    vehicle: jobOrder.vehicle.model,
    priorityLevel: jobOrder.priority,
    requestedBy: currentUser.name,
    items: jobOrder.partsRequired.map(part => ({
      id: part.id,
      code: part.code,
      description: part.description,
      quantity: part.quantity
    }))
  };

  const response = await fetch('/api/warehouse/picklists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(picklistData)
  });

  return response.json();
};
```

### Picking Items (in Warehouse)
```javascript
// In WarehouseDashboard
const handlePickItem = async (picklist, itemId, quantity, location) => {
  const response = await fetch(
    `/api/warehouse/picklists/${picklist.id}/items/${itemId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pickedQuantity: quantity,
        location: location,
        notes: ''
      })
    }
  );

  // Reload picklist to show progress
  const updated = await fetch(`/api/warehouse/picklists/${picklist.id}`);
  return updated.json();
};
```

### Completing a Picklist
```javascript
// Triggered when all items are picked
const completePicklist = async (picklist) => {
  const response = await fetch(
    `/api/warehouse/picklists/${picklist.id}/complete`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(picklist)
    }
  );

  if (response.ok) {
    // Close modal and reload list
    setShowPicklist(false);
    loadPicklists();
  }
};
```

## Quality Assurance

### Testing Checklist

**Functionality:**
- [ ] Create picklist from job controller request
- [ ] View all active picklists in warehouse dashboard
- [ ] Open picklist in AnvilPicklist component
- [ ] Update quantity picked for each item
- [ ] Update bin location for each item
- [ ] Add notes to items
- [ ] Progress bar updates correctly
- [ ] Cannot complete until all items picked
- [ ] Print picklist to selected printer
- [ ] Complete picklist and close modal
- [ ] Completed picklist removed from active list

**UI/UX:**
- [ ] Progress bar displays correct percentage
- [ ] Color changes indicate completion status
- [ ] Items marked complete have visual indication
- [ ] Print button is disabled if not all items picked
- [ ] All form fields are accessible and labeled
- [ ] Responsive design works on tablets
- [ ] Error messages are clear and actionable

**Printing:**
- [ ] Printer selector modal appears
- [ ] Available printers load correctly
- [ ] Default printer is highlighted
- [ ] Print output is readable
- [ ] Monospace font displays correctly
- [ ] All item details are included
- [ ] Page layout is correct (8.5" × 11")

**Database:**
- [ ] Picklists created with correct data
- [ ] Picklist items stored correctly
- [ ] Status updates reflected in database
- [ ] Completed picklists marked correctly
- [ ] Foreign keys maintain referential integrity

## Troubleshooting

### Issue: Picklists Not Loading
**Possible Causes:**
- Backend service not responding
- Database tables not created (run `picklist_schema.sql`)
- API route not registered

**Solution:**
1. Check backend logs
2. Verify `warehouse_routes.py` imported in `app/__init__.py`
3. Run SQL setup script: `mysql < database/picklist_schema.sql`

### Issue: Print Dialog Not Appearing
**Possible Causes:**
- PrinterSelector component not imported
- Electron IPC not configured
- Main process handlers not registered

**Solution:**
1. Verify `main.js` has IPC handlers for printing
2. Check `preload.js` exposes printer API
3. Verify PrinterSelector imports correctly

### Issue: Form Submission Fails
**Possible Causes:**
- Required fields not filled
- Network error
- Backend validation failure

**Solution:**
1. Check browser console for error messages
2. Verify all required fields are completed
3. Check backend logs for validation errors

## Related Documentation

- [Job Controller Dashboard Guide](ANVIL_JOB_ORDER_PRINT_FEATURE.md)
- [Print Service Architecture](ANVIL_ARCHITECTURE.md)
- [Warehouse Management System](WAREHOUSE_DOCUMENTATION.md)
- [Database Schema Reference](WAREHOUSE_SQL_REFERENCE.md)

## Version History

**v1.0.0** (Current)
- Initial release
- Picklist creation and management
- Item picking with progress tracking
- Print functionality
- Warehouse dashboard integration

## Support

For issues or feature requests:
1. Check troubleshooting section above
2. Review related documentation
3. Contact development team with:
   - Browser/system information
   - Screenshot or error message
   - Steps to reproduce

---

**Last Updated:** 2025
**Maintained By:** Development Team
**Status:** Production Ready ✅
