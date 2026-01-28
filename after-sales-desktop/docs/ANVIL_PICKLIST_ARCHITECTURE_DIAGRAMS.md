# Anvil Picklist System Architecture Diagrams

## 1. Component Hierarchy

```
WarehouseDashboard
├── Tabs Navigation
│   ├── Inventory Tab
│   ├── I/O History Tab
│   ├── Products Tab
│   └── Parts Picklist Tab (NEW)
│       ├── Picklist List View
│       │   └── Picklist Row Cards
│       │       └── "Pick Items" Button
│       └── AnvilPicklist Modal (opened on button click)
│           ├── Header
│           │   ├── Picklist Number
│           │   ├── Progress Bar
│           │   └── Action Buttons (Print, Close)
│           ├── Info Section
│           │   ├── Job Order Card
│           │   ├── Customer Card
│           │   ├── Vehicle Card
│           │   └── Priority Card
│           ├── Items Section
│           │   └── Pick Item Cards (repeated per item)
│           │       ├── Item Code & Description
│           │       ├── Quantity Input
│           │       ├── Location Input
│           │       └── Notes Input
│           ├── PrinterSelector Modal (conditionally shown)
│           │   └── Printer List
│           └── Footer
│               ├── Complete Button
│               └── Print Button
```

## 2. Data Flow Diagram

```
┌─────────────────────────────────────────┐
│ Job Controller Dashboard                │
│ (Create Job Order with Parts Request)   │
└──────────────────┬──────────────────────┘
                   │
                   │ 1. POST /api/warehouse/picklists
                   │    (jobOrderNumber, customer, vehicle, items)
                   ▼
        ┌──────────────────────┐
        │   Backend API        │
        │  warehouse_routes.py │
        │  @create_picklist    │
        └──────────┬───────────┘
                   │
                   │ 2. Call service layer
                   ▼
        ┌──────────────────────────┐
        │  warehouse_service.py    │
        │  create_picklist()       │
        └──────────┬───────────────┘
                   │
                   │ 3. INSERT INTO warehouse_picklists
                   │    INSERT INTO warehouse_picklist_items
                   ▼
        ┌──────────────────────────┐
        │   MySQL Database         │
        │  (2 new tables)          │
        │  - warehouse_picklists   │
        │  - picklist_items        │
        └──────────┬───────────────┘
                   │
                   │ 4. Return picklist_id
                   ▼
        ┌──────────────────────────┐
        │  Job Controller Response │
        │  (success, picklist_id)  │
        └──────────────────────────┘
                   │
                   │ 5. GET /api/warehouse/picklists
                   │    (polling or notification)
                   ▼
┌─────────────────────────────────────────┐
│ Warehouse Dashboard                     │
│ Parts Picklist Tab                      │
│ (Shows list of active picklists)        │
└──────────────────┬──────────────────────┘
                   │
                   │ 6. User clicks "Pick Items"
                   ▼
┌─────────────────────────────────────────┐
│ AnvilPicklist Component                 │
│ (Item Picking Interface)                │
│ State: pickedItems, picklistData        │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┬──────────────┐
        │                     │              │
        │ 7a. Update Item     │ 7b. Print    │ 7c. Complete
        │ PUT /api/.../items/ │ printHTML()  │ PUT /.../complete
        │                     │              │
        ▼                     ▼              ▼
    Update            PrinterSelector   Update Status
    Quantity          Component         in Database
    Location          (Modal)
    Notes             Select Printer
                      Send to Printer
```

## 3. State Management Flow

```
WarehouseDashboard State
├── picklists: []           ← GET /api/warehouse/picklists
├── selectedPicklist: {}    ← Set when user selects a picklist
├── showPicklist: false     ← Toggle AnvilPicklist modal
│
AnvilPicklist Component State
├── picklistData: {
│   picklistNumber: '',
│   jobOrderNumber: '',
│   customer: '',
│   vehicle: '',
│   priorityLevel: '',
│   items: [
│       { id: 1, code: '', description: '', quantity: 1 },
│       { id: 2, code: '', description: '', quantity: 1 }
│   ]
│}
│
└── pickedItems: {
    1: { pickedQuantity: 0, location: '', notes: '' },
    2: { pickedQuantity: 0, location: '', notes: '' }
}
```

## 4. API Endpoints Architecture

```
/api/warehouse
├── /picklists (GET)
│   └── Returns: [picklist_obj, ...]
│       {
│           id, picklistNumber, jobOrderNumber, customer,
│           vehicle, priorityLevel, status, items: [...]
│       }
│
├── /picklists (POST)
│   ├── Body: { jobOrderNumber, customer, vehicle, items }
│   └── Returns: { success, picklist_id }
│
├── /picklists/{id} (GET)
│   └── Returns: { id, picklist_number, ..., items: [...] }
│
├── /picklists/{id}/items/{itemId} (PUT)
│   ├── Body: { pickedQuantity, location, notes }
│   └── Returns: { success, message }
│
└── /picklists/{id}/complete (PUT)
    ├── Body: { ...picklist_data }
    └── Returns: { success, message }
```

## 5. Database Relationship Diagram

```
warehouse_picklists
├── id (PK)
├── picklist_number (UNIQUE)
├── request_date
├── job_order_number
├── customer
├── vehicle
├── priority_level
├── requested_by
├── status (pending, in_progress, completed, cancelled)
├── created_at
└── updated_at
    │
    │ 1:M Relationship
    ▼
warehouse_picklist_items
├── id (PK)
├── picklist_id (FK → warehouse_picklists.id)
├── item_id
├── product_code
├── description
├── quantity_required
├── quantity_picked
├── bin_location
├── picked_notes
├── created_at
└── updated_at
```

## 6. Component Props & Events

```
WarehouseDashboard
│
├── Props: { user, onLogout }
│
├── State:
│   ├── picklists: Array
│   ├── selectedPicklist: Object
│   └── showPicklist: Boolean
│
└── Event Handlers:
    ├── loadPicklists() → GET API
    ├── handlePicklistComplete(picklist) → PUT API
    └── onClick: setSelectedPicklist, setShowPicklist
        │
        └─────────────────────────────────────┐
                                               │
                                        ┌──────▼──────┐
                                        │ AnvilPicklist│
                                        └──────┬───────┘
                                               │
                                        Props:
                                        ├── partsRequest (object)
                                        ├── onClose (function)
                                        └── onComplete (function)
                                               │
                                        State:
                                        ├── picklistData (object)
                                        └── pickedItems (object)
                                               │
                                        Methods:
                                        ├── calculateCompleteness() → %
                                        ├── isPicklistComplete() → bool
                                        ├── generatePicklistHTML() → HTML
                                        ├── handleItemPicked() → void
                                        ├── handleLocationUpdate() → void
                                        ├── handleCompletePicklist() → API
                                        └── handlePrintClick() → Modal
```

## 7. Print Workflow

```
User clicks "Print" button
        │
        ▼
generatePicklistHTML()
├── Create HTML string
├── Insert picklist data
├── Insert item table
│   └── Columns: Code, Description, Required, Location, Notes
├── Add footer/signature lines
└── Return HTML string
        │
        ▼
handlePrintClick()
├── Show PrinterSelector modal
├── Load available printers
│   └── printService.getPrinters()
└── Wait for user selection
        │
        ▼
User selects printer
        │
        ▼
handlePrinterSelect(printerName)
├── Call printService.printJobOrder(html, printerName)
│   └── Uses Electron IPC to send to main process
├── Main process creates hidden window
├── Loads HTML content
├── Sends to selected printer
└── Returns success/failure
        │
        ▼
Print job sent to printer
```

## 8. Status Progression

```
Created
   │
   │ (Initial status)
   ▼
pending
   │
   │ (Warehouse staff opens picklist)
   ▼
in_progress
   │
   │ (All items picked to required quantity)
   ▼
completed
   │
   │ (Optional: cancelled by manager)
   └─────────────→ cancelled

Legend:
pending    = Waiting for warehouse to pick items
in_progress = Items being picked
completed  = All items picked, ready for technician
cancelled  = Request cancelled, items not needed
```

## 9. Item Picking Progress

```
0% Complete (No items picked)
│
├─ Item 1: Qty 0/1  ← Update when user enters quantity
├─ Item 2: Qty 0/2
└─ Item 3: Qty 0/1

Progress Bar: [░░░░░░░░░░░░░░░░░░░░] 0%

        │ (User picks Item 1)
        ▼

25% Complete
│
├─ Item 1: Qty 1/1  ✓ (Completed - green)
├─ Item 2: Qty 0/2  (In progress)
└─ Item 3: Qty 0/1

Progress Bar: [█████░░░░░░░░░░░░░░] 33%

        │ (User picks remaining items)
        ▼

100% Complete
│
├─ Item 1: Qty 1/1  ✓
├─ Item 2: Qty 2/2  ✓
└─ Item 3: Qty 1/1  ✓

Progress Bar: [██████████████████████] 100%

        │ (Complete Picklist button enabled)
        ▼

Submit
└─ PUT /api/warehouse/picklists/{id}/complete
   └─ Database status → completed
   └─ Inventory reduced
   └─ Modal closes
```

## 10. Error Handling Flow

```
User Action (Create/Update/Complete)
        │
        ▼
Validation
├── Form fields filled?
├── Quantities valid (≥ 0)?
├── All items picked?
└── Status not cancelled?
        │
    ┌───┴───┐
    │ Error │ STOP → Show error message to user
    └───────┘
        │
        │ Pass
        ▼
API Call
├── Network available?
├── Server responding?
└── Request formatted correctly?
        │
    ┌───┴───────────┐
    │ Network Error │ STOP → Show "Please try again"
    └───────────────┘
        │
        │ Success
        ▼
Response Processing
├── status === success?
└── Expected fields present?
        │
    ┌───┴───────────┐
    │ Server Error  │ STOP → Show error message
    └───────────────┘
        │
        │ Pass
        ▼
Update UI
├── Close modal
├── Refresh picklist list
└── Show success message
```

## 11. Responsive Design Breakpoints

```
Desktop (968px+)
├── Full width layout
├── Grid: 1 column for picklist
├── Items: Flex row with all controls
└── Side-by-side info cards

Tablet (640px - 968px)
├── Adjusted padding
├── Grid: 1 column items
├── Controls stack vertically
└── Responsive breakpoint applied

Mobile (< 640px)
├── Minimal padding
├── Full-width items
├── Button stack vertically
├── Reduced font sizes
└── Optimized for touch
```

## 12. Integration Points with Job Controller

```
Job Controller
    │
    ├─ Has Service Order with Parts Requirements
    │
    ├─ User clicks "Request Parts"
    │
    └─ POST /api/warehouse/picklists
        {
            jobOrderNumber: from service order
            customer: from service order
            vehicle: from service order
            items: from parts requirements
        }
        │
        ▼
    Response: { picklist_id: 123 }
        │
        ├─ Store picklist_id for tracking
        │
        ├─ Optionally: Start polling
        │  GET /api/warehouse/picklists/123
        │
        │  Loop every 30 seconds until:
        │  status === 'completed'
        │
        └─ When completed:
           Retrieve picked items from response
           Update service order with picked parts
           Notify technician parts are ready
```

---

**Diagrams Created:** 12
**Files Referenced:** 4
**Architecture Level:** Complete System View
**Status:** Ready for Implementation ✅
