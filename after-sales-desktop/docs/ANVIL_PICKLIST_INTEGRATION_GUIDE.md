# Anvil Picklist Integration Guide

## Quick Start: Creating a Picklist from Job Controller

This guide shows how to integrate the Anvil Picklist system with the Job Controller to send parts requests to the warehouse.

## Integration Flow

```
1. Job Controller creates service order
2. Job Controller collects parts requirement
3. Job Controller sends parts request to warehouse API
4. Warehouse receives picklist in "Parts Picklist" tab
5. Warehouse staff picks items using AnvilPicklist
6. Warehouse completes picklist
7. Job Controller receives notification (implement polling or websocket)
8. Job Controller retrieves picked items for technician
```

## Implementation Steps

### Step 1: Add "Request Parts" Feature to Job Controller

In your JobControllerDashboard, add a function to create a picklist:

```javascript
// In JobControllerDashboard.jsx

const requestPartsFromWarehouse = async (jobOrder, requiredParts) => {
  try {
    const picklistData = {
      jobOrderNumber: jobOrder.jobOrderNumber,
      customer: jobOrder.customer,
      vehicle: jobOrder.vehicle,
      priorityLevel: jobOrder.priorityLevel || 'normal',
      requestedBy: user.name,
      items: requiredParts.map(part => ({
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

    const result = await response.json();
    
    if (result.success) {
      alert(`Picklist created: ${result.picklist_id}`);
      return result.picklist_id;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error creating picklist:', error);
    setErrorMessage('Failed to send parts request to warehouse');
  }
};
```

### Step 2: Call from Job Order Form

Add a button to request parts:

```jsx
<button 
  className="btn-primary"
  onClick={() => {
    // Collect required parts from form
    const requiredParts = [
      {
        id: 1,
        code: 'FLT-OIL-5W30',
        description: 'Engine Oil 5W-30 (5L)',
        quantity: 1
      },
      {
        id: 2,
        code: 'AIR-FLT-001',
        description: 'Air Filter',
        quantity: 1
      }
    ];
    
    requestPartsFromWarehouse(jobOrder, requiredParts);
  }}
>
  📦 Request Parts from Warehouse
</button>
```

### Step 3: Monitor Picklist Status (Optional)

Poll the warehouse API to check if picklist is completed:

```javascript
const checkPicklistStatus = async (picklistId) => {
  try {
    const response = await fetch(`/api/warehouse/picklists/${picklistId}`);
    const result = await response.json();
    
    if (result.success) {
      const picklist = result.data;
      
      console.log(`Picklist Status: ${picklist.status}`);
      console.log(`Items Picked: ${picklist.items.length}`);
      
      if (picklist.status === 'completed') {
        // Parts are ready, retrieve them
        return picklist.items;
      }
    }
  } catch (error) {
    console.error('Error checking picklist status:', error);
  }
};

// Poll every 30 seconds
setInterval(() => {
  checkPicklistStatus(picklistId);
}, 30000);
```

### Step 4: Update Inventory When Picklist Completes

Add automatic inventory adjustment in warehouse service:

```python
# In warehouse_service.py

def complete_picklist(self, picklist_id, picklist_data):
    """Mark picklist as completed and adjust inventory"""
    
    # Mark picklist as completed
    query = """
    UPDATE warehouse_picklists
    SET status = 'completed'
    WHERE id = %s
    """
    result = db.execute_update(query, (picklist_id,))
    
    if result['success']:
        # Get all items from picklist
        items = self._get_picklist_items(picklist_id)
        
        # Reduce inventory for each picked item
        for item in items:
            self.remove_inventory(
                product_id=item['itemId'],
                quantity=item['pickedQuantity'],
                reference_no=f"PICK-{picklist_data['picklistNumber']}",
                reference_type='parts-request',
                notes=f"Parts picked for Job Order {picklist_data['jobOrderNumber']}",
                created_by='SYSTEM'
            )
    
    return result['success']
```

## API Reference

### Create Picklist
```
POST /api/warehouse/picklists

Request Body:
{
  "jobOrderNumber": "JO-2025-001",
  "customer": "John Smith",
  "vehicle": "Toyota Corolla 2020",
  "priorityLevel": "normal",  // normal, urgent, high
  "requestedBy": "Controller User",
  "items": [
    {
      "id": 1,
      "code": "FLT-OIL-5W30",
      "description": "Engine Oil 5W-30 (5L)",
      "quantity": 1
    }
  ]
}

Response (Success):
{
  "success": true,
  "picklist_id": 123,
  "message": "Picklist created successfully"
}

Response (Error):
{
  "success": false,
  "error": "Field name is required"
}
```

### Get Picklist Details
```
GET /api/warehouse/picklists/{picklist_id}

Response:
{
  "success": true,
  "data": {
    "id": 123,
    "picklistNumber": "PL-20250115-A1B2C3D4",
    "requestDate": "2025-01-15",
    "jobOrderNumber": "JO-2025-001",
    "customer": "John Smith",
    "vehicle": "Toyota Corolla 2020",
    "priorityLevel": "normal",
    "requestedBy": "Controller User",
    "status": "in_progress",
    "items": [
      {
        "id": 1,
        "itemId": 1,
        "code": "FLT-OIL-5W30",
        "description": "Engine Oil 5W-30 (5L)",
        "quantity": 1,
        "pickedQuantity": 1,
        "location": "A-15-2",
        "notes": "Picked successfully"
      }
    ]
  }
}
```

### Update Picked Item
```
PUT /api/warehouse/picklists/{picklist_id}/items/{item_id}

Request Body:
{
  "pickedQuantity": 1,
  "location": "A-15-2",
  "notes": "Picked successfully"
}

Response:
{
  "success": true,
  "message": "Item pick updated"
}
```

### Complete Picklist
```
PUT /api/warehouse/picklists/{picklist_id}/complete

Request Body:
{
  "picklistNumber": "PL-20250115-A1B2C3D4",
  "jobOrderNumber": "JO-2025-001",
  "customer": "John Smith",
  "status": "completed"
  // ... all picklist data
}

Response:
{
  "success": true,
  "message": "Picklist completed successfully"
}
```

## Data Flow Diagram

```
┌─────────────────────┐
│  Job Controller     │
│  Dashboard          │
└──────────┬──────────┘
           │
           │ 1. Create Service Order
           │    with Parts List
           │
           ▼
┌─────────────────────────────────────────┐
│  POST /api/warehouse/picklists          │
│  (Request Parts from Warehouse)         │
└──────────┬──────────────────────────────┘
           │
           │ 2. Create Picklist
           │    & Items Tables
           │
           ▼
┌──────────────────────────────────────────┐
│  Warehouse Dashboard                     │
│  Parts Picklist Tab                      │
│  (Shows new picklist)                    │
└──────────┬───────────────────────────────┘
           │
           │ 3. Warehouse Staff Selects
           │    "Pick Items" Button
           │
           ▼
┌──────────────────────────────────────────┐
│  AnvilPicklist Component                 │
│  (Item Picking Interface)                │
│  - Update quantities                     │
│  - Record locations                      │
│  - Add notes                             │
│  - Print picklist                        │
└──────────┬───────────────────────────────┘
           │
           │ 4. PUT /api/warehouse/picklists/..
           │    (Update picked items)
           │
           ▼
┌──────────────────────────────────────────┐
│  Database: warehouse_picklist_items      │
│  (Quantity, Location, Notes Updated)     │
└──────────┬───────────────────────────────┘
           │
           │ 5. Click "Complete Picklist"
           │
           ▼
┌──────────────────────────────────────────┐
│  PUT /api/warehouse/picklists/.../complete│
│  (Mark as Completed)                     │
└──────────┬───────────────────────────────┘
           │
           │ 6. Reduce Inventory
           │    (Automatic)
           │
           ▼
┌──────────────────────────────────────────┐
│  Database: warehouse_inventory           │
│  (Stock Quantities Updated)              │
└──────────┬───────────────────────────────┘
           │
           │ 7. Job Controller Polls
           │    or Receives Notification
           │
           ▼
┌──────────────────────────────────────────┐
│  GET /api/warehouse/picklists/{id}       │
│  (Get Picked Items Status)               │
└──────────┬───────────────────────────────┘
           │
           │ 8. Items Available
           │    for Technician
           │
           ▼
┌─────────────────────────────────────────────┐
│  Technician Assigned to Service Order       │
│  Can Retrieve Parts for Service             │
└─────────────────────────────────────────────┘
```

## Complete Example: Full Integration

Here's a complete example showing how to integrate picklist creation and tracking:

```javascript
// In JobControllerDashboard.jsx

const [activePicklists, setActivePicklists] = useState({});
const POLL_INTERVAL = 30000; // 30 seconds

// Step 1: User requests parts
const handleRequestParts = async (jobOrder, partsRequired) => {
  try {
    const picklistData = {
      jobOrderNumber: jobOrder.jobOrderNumber,
      customer: jobOrder.customer,
      vehicle: jobOrder.vehicle,
      priorityLevel: 'normal',
      requestedBy: user.name,
      items: partsRequired
    };

    const response = await fetch('/api/warehouse/picklists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(picklistData)
    });

    const result = await response.json();
    
    if (result.success) {
      // Track this picklist
      const newActivePicklists = {
        ...activePicklists,
        [result.picklist_id]: {
          jobOrderId: jobOrder.id,
          jobOrderNumber: jobOrder.jobOrderNumber,
          status: 'pending'
        }
      };
      setActivePicklists(newActivePicklists);
      
      // Start polling for completion
      startMonitoringPicklist(result.picklist_id, jobOrder.id);
      
      alert(`Parts request sent to warehouse (ID: ${result.picklist_id})`);
    }
  } catch (error) {
    console.error('Error requesting parts:', error);
  }
};

// Step 2: Poll warehouse for picklist status
const startMonitoringPicklist = (picklistId, jobOrderId) => {
  const interval = setInterval(async () => {
    try {
      const response = await fetch(`/api/warehouse/picklists/${picklistId}`);
      const result = await response.json();
      
      if (result.success) {
        const picklist = result.data;
        
        // Update tracking
        setActivePicklists(prev => ({
          ...prev,
          [picklistId]: {
            ...prev[picklistId],
            status: picklist.status,
            items: picklist.items
          }
        }));
        
        // If completed, stop polling
        if (picklist.status === 'completed') {
          clearInterval(interval);
          
          // Notify or update job order
          handlePicklistCompleted(jobOrderId, picklist);
        }
      }
    } catch (error) {
      console.error('Error polling picklist status:', error);
    }
  }, POLL_INTERVAL);
};

// Step 3: Handle completion
const handlePicklistCompleted = (jobOrderId, picklist) => {
  // Emit event or update job order state
  console.log(`Picklist completed for Job Order ${jobOrderId}`);
  console.log(`Picked items:`, picklist.items);
  
  // Update UI to show parts are ready
  // Allow technician to retrieve parts
};

// Render: Show picklist status
<div className="active-picklists">
  {Object.entries(activePicklists).map(([picklistId, info]) => (
    <div key={picklistId} className="picklist-status">
      <strong>Job Order: {info.jobOrderNumber}</strong>
      <p>Picklist Status: <span className={`status-${info.status}`}>{info.status}</span></p>
      {info.items && (
        <p>Items Picked: {info.items.filter(i => i.pickedQuantity > 0).length}/{info.items.length}</p>
      )}
    </div>
  ))}
</div>
```

## Error Handling

```javascript
const createPicklistWithErrorHandling = async (jobOrder, items) => {
  try {
    // Validate input
    if (!jobOrder.jobOrderNumber || items.length === 0) {
      throw new Error('Job order number and items are required');
    }

    const response = await fetch('/api/warehouse/picklists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobOrderNumber: jobOrder.jobOrderNumber,
        customer: jobOrder.customer,
        vehicle: jobOrder.vehicle,
        priorityLevel: jobOrder.priorityLevel,
        requestedBy: user.name,
        items: items
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Unknown error creating picklist');
    }

    return result.picklist_id;

  } catch (error) {
    console.error('Picklist creation failed:', error);
    
    // Show user-friendly error
    if (error.message.includes('required')) {
      setErrorMessage('Please fill in all required fields');
    } else if (error.message.includes('HTTP')) {
      setErrorMessage('Server error - please try again');
    } else {
      setErrorMessage(`Error: ${error.message}`);
    }
    
    return null;
  }
};
```

## Files Modified/Created

**Created:**
- `frontend/src/components/AnvilPicklist.jsx` - Main component
- `frontend/src/styles/anvil-picklist.css` - Styling
- `database/picklist_schema.sql` - Database tables
- `docs/ANVIL_PICKLIST_FEATURE.md` - Feature documentation

**Modified:**
- `frontend/src/pages/WarehouseDashboard.jsx` - Added picklist tab
- `frontend/src/styles/warehouse-dashboard.css` - Added picklist styling
- `backend/app/routes/warehouse_routes.py` - Added API endpoints
- `backend/app/services/warehouse_service.py` - Added service methods

## Testing the Integration

### 1. Test Picklist Creation
```bash
curl -X POST http://localhost:5000/api/warehouse/picklists \
  -H "Content-Type: application/json" \
  -d '{
    "jobOrderNumber": "JO-2025-001",
    "customer": "Test Customer",
    "vehicle": "Test Vehicle",
    "priorityLevel": "normal",
    "requestedBy": "Test User",
    "items": [
      {
        "id": 1,
        "code": "PART-001",
        "description": "Test Part",
        "quantity": 1
      }
    ]
  }'
```

### 2. Verify in Warehouse Dashboard
- Navigate to Warehouse Dashboard
- Click "Parts Picklist" tab
- New picklist should appear in the list

### 3. Test Item Picking
- Click "Pick Items" on the picklist
- AnvilPicklist modal should open
- Update quantities and locations
- Click "Complete Picklist"

### 4. Verify Completion
- Picklist should disappear from active list
- Status should update to 'completed'

## Next Steps

1. **Implement Websocket Notifications** (Optional)
   - Instead of polling, use websocket for real-time updates
   - Reduces server load and improves responsiveness

2. **Add Job Order Item Picker**
   - Create UI in Job Controller to select items to request
   - Validate parts are available before requesting

3. **Implement Parts Reservation**
   - Reserve items in picklist until picked
   - Prevent double-allocation to multiple job orders

4. **Add Picklist History**
   - View completed picklists
   - Track parts usage per job order
   - Generate reports

---

**Status:** Ready for Integration ✅
**Last Updated:** 2025
