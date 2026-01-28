# Parts Request System Implementation - Car Jockey Module

## Overview
Successfully implemented a three-tier parts request workflow: **Technician → Job Controller → Warehouse**

## What Was Fixed/Added

### 1. Frontend - CarJockeyDashboard.jsx
**Status:** ✅ COMPLETE

#### New State Variables Added:
- `warehouseInventory` - Stores available products from warehouse
- `showPartsRequestModal` - Controls modal visibility
- `partsRequestForm` - Manages multi-item parts request form

#### New Functions Implemented:
- **`loadWarehouseInventory()`** - Fetches products from `/api/warehouse/products` and converts tuple format to objects
- **`handleRequestParts(movement)`** - Opens parts request modal for a specific vehicle movement
- **`handleAddPartsItem()`** - Adds a new blank line item to the request
- **`handleRemovePartsItem(index)`** - Removes a line item from the request
- **`handlePartsItemChange(index, field, value)`** - Handles dropdown selection and quantity changes
  - Auto-fills product_code and description when product is selected
  - Only allows quantity field editing (other fields are read-only from dropdown)
- **`handleSubmitPartsRequest()`** - Submits parts request to `/api/car-jockey/parts-requests`

#### UI Changes:
- Added "Request Parts" button to each vehicle card in Active Movements tab
- Created comprehensive modal with:
  - Product selection dropdown (populated from warehouse inventory)
  - Quantity input field (only writable field)
  - Auto-display of product code and category
  - "Add Item" button for multi-item requests
  - "Remove Item" buttons for each line (if multiple items)
  - "Submit Request to Job Controller" button

#### Form Structure:
```javascript
{
  items: [
    { 
      product_id: string,      // From dropdown selection
      product_code: string,    // Auto-filled, read-only
      description: string,     // Auto-filled, read-only
      quantity: number         // User-editable
    }
  ]
}
```

### 2. Backend - Car Jockey Routes & Service
**Status:** ✅ COMPLETE

#### New Endpoint Added:
```
POST /api/car-jockey/parts-requests
```

**Request Body:**
```json
{
  "service_order_id": 123,
  "jockey_id": 5,
  "items": [
    { "product_id": 1, "quantity": 5 },
    { "product_id": 2, "quantity": 3 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Parts request submitted successfully",
  "data": { "request_id": 45 }
}
```

#### Service Method - `CarJockeyService.create_parts_request()`
- Creates `parts_request` record with status = 'sent-to-jc'
- Creates `parts_request_items` for each line item
- Links request to service order for tracking
- Records jockey as requester

### 3. Database Schema
**Status:** ✅ COMPLETE

#### New Tables Created:

**Table: `parts_requests`**
```sql
- id (PK)
- service_order_id (FK → scheduling_orders.id)
- requested_by (FK → personnel.id)
- requested_by_role (ENUM: technician|job_controller|admin)
- status (ENUM: pending|sent-to-jc|sent-to-warehouse|received|completed|cancelled)
- notes (TEXT)
- created_at, updated_at (TIMESTAMPS)
- Indexes: service_order_id, status, created_at
```

**Table: `parts_request_items`**
```sql
- id (PK)
- parts_request_id (FK → parts_requests.id)
- product_id (FK → warehouse_products.id)
- quantity_requested (INT)
- quantity_allocated (INT)
- quantity_picked (INT)
- quantity_received (INT)
- status (ENUM: pending|allocated|picked|delivered|cancelled)
- notes (TEXT)
- created_at, updated_at (TIMESTAMPS)
- Indexes: parts_request_id, product_id, status
```

### 4. Data Workflow

**Flow 1: Technician Creates Request**
```
CarJockeyDashboard
  ↓
"Request Parts" button
  ↓
Modal with warehouse inventory dropdown
  ↓
Select items, enter quantity
  ↓
POST /api/car-jockey/parts-requests
  ↓
parts_requests table: status = 'sent-to-jc'
  ↓
parts_request_items table: created with pending status
```

**Flow 2: Data Collection (Ready for Job Controller Integration)**
```
parts_requests.status = 'sent-to-jc'
  ↓
Job Controller can query for new requests
  ↓
Forward to Warehouse: POST /api/warehouse/picklists
  ↓
Update parts_requests.status = 'sent-to-warehouse'
  ↓
Warehouse Dashboard displays picklist
```

## Field Requirements Met

✅ **Item selection as dropdown** - Populated from warehouse inventory  
✅ **Quantity is only writable field** - Product code and description auto-filled and read-only  
✅ **Dropdown based on warehouse inventory** - Fetches from `/api/warehouse/products`  
✅ **Request flow: Technician → Job Controller → Warehouse** - Status tracking in parts_requests table  
✅ **Multi-item support** - Can add/remove items before submitting  
✅ **Modal-based UI** - Clean interface for form interaction  

## Files Modified

1. **`frontend/src/pages/CarJockeyDashboard.jsx`** (696 lines)
   - Added state variables for parts request workflow
   - Added 6 handler functions
   - Added parts request modal component
   - Added "Request Parts" button to active movements

2. **`backend/app/routes/car_jockey_routes.py`** (226→268 lines)
   - Added POST `/api/car-jockey/parts-requests` endpoint

3. **`backend/app/services/car_jockey_service.py`** (165→203 lines)
   - Added `create_parts_request()` method with transaction handling

4. **`database/schema.sql`** (1041→1080 lines)
   - Added `parts_requests` table
   - Added `parts_request_items` table

## Testing Checklist

- [x] Modal opens when "Request Parts" button clicked
- [x] Warehouse inventory dropdown populates correctly
- [x] Product selection auto-fills code and description
- [x] Quantity field is editable, other fields read-only
- [x] Add/Remove item buttons work
- [x] Form submission creates database records
- [x] Status tracking (pending → sent-to-jc)
- [x] Multi-item requests supported

## API Integration Points

### Frontend → Backend
```
POST /api/car-jockey/parts-requests
← Creates parts request with items
```

### Warehouse Inventory
```
GET /api/warehouse/products
← Populates dropdown (already exists)
```

### Ready for Future Integration
```
Job Controller will:
- Query parts_requests where status = 'sent-to-jc'
- Forward to Warehouse: POST /api/warehouse/picklists
- Update parts_requests.status = 'sent-to-warehouse'
```

## Known Status Fields

- **parts_requests.status** progression:
  - `pending` → First created (before modal submit)
  - `sent-to-jc` → After technician submits (current)
  - `sent-to-warehouse` → After Job Controller forwards
  - `received` → Warehouse receives picklist
  - `completed` → All items picked and delivered
  - `cancelled` → Request cancelled

- **parts_request_items.status** progression:
  - `pending` → Initially created
  - `allocated` → Warehouse assigns stock
  - `picked` → Items picked from shelf
  - `delivered` → Items delivered to technician
  - `cancelled` → Item cancelled

## Database Initialization

Run included script to create tables:
```bash
python init_parts_tables.py
```

Or manually execute SQL from schema.sql

## Notes

- Warehouse inventory conversion handles tuple-to-object mapping for compatibility
- Forms use controlled components for proper React state management
- Foreign keys ensure referential integrity
- Proper error handling on both frontend and backend
- Status tracking enables full audit trail of parts requests

---

**Implementation Date:** [Current]  
**Status:** READY FOR JOB CONTROLLER INTEGRATION  
**Next Step:** Create Job Controller endpoint to receive and forward parts requests to Warehouse
