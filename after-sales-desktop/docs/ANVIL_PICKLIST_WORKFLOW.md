# Anvil Warehouse Picklist - Complete System Workflow

## End-to-End Workflow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                    COMPLETE WORKFLOW - PHASE 2                       │
│           Anvil Warehouse Parts Picklist System                      │
└──────────────────────────────────────────────────────────────────────┘

PHASE 1: JOB CONTROLLER (Create Service Order)
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║  Job Controller Dashboard                                            ║
║  ├── Create Service Order                                           ║
║  │   ├── Customer Information                                       ║
║  │   ├── Vehicle Details                                            ║
║  │   └── Service Description                                        ║
║  │                                                                   ║
║  ├── Assign Technician                                             ║
║  │                                                                   ║
║  └── Define Parts Required ← TRIGGER: User fills out parts list    ║
║      ├── Item 1 (Quantity)                                         ║
║      ├── Item 2 (Quantity)                                         ║
║      └── Item 3 (Quantity)                                         ║
║                                                                     ║
╚═══════════════════════════════════════════════════════════════════════╝
                                │
                                │ User clicks "Request Parts"
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ ACTION: Create Picklist                                              │
│ Method: POST /api/warehouse/picklists                                │
│ Payload:                                                             │
│ {                                                                    │
│   jobOrderNumber: "JO-2025-001",                                     │
│   customer: "John Smith",                                            │
│   vehicle: "Toyota Corolla 2020",                                    │
│   priorityLevel: "normal",                                           │
│   requestedBy: "Controller User",                                    │
│   items: [                                                           │
│     { id: 1, code: "OIL-5W30", description: "Engine Oil", qty: 1 }, │
│     { id: 2, code: "AIR-FLT", description: "Air Filter", qty: 1 }   │
│   ]                                                                  │
│ }                                                                    │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                │ Backend processes request
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ DATABASE OPERATION                                                   │
│                                                                      │
│ 1. INSERT INTO warehouse_picklists                                   │
│    ├── picklist_number: "PL-20250115-A1B2C3D4"                       │
│    ├── job_order_number: "JO-2025-001"                               │
│    ├── customer: "John Smith"                                        │
│    ├── vehicle: "Toyota Corolla 2020"                                │
│    ├── priority_level: "normal"                                      │
│    ├── status: "pending"                                             │
│    └── requested_by: "Controller User"                               │
│                                                                      │
│ 2. INSERT INTO warehouse_picklist_items (for each item)              │
│    ├── picklist_id: 123                                              │
│    ├── product_code: "OIL-5W30"                                      │
│    ├── description: "Engine Oil"                                     │
│    ├── quantity_required: 1                                          │
│    ├── quantity_picked: 0                                            │
│    └── bin_location: NULL                                            │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                │ Response: { success: true, picklist_id: 123 }
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ JOB CONTROLLER                                                       │
│ ├── Display success message                                         │
│ ├── Store picklist_id: 123 for tracking                            │
│ └── (Optional) Start polling for status                            │
│     └── Every 30 seconds: GET /api/warehouse/picklists/123         │
│         └── Until status === "completed"                            │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                │ Picklist created successfully!
                                │
                                ▼

PHASE 2: WAREHOUSE DASHBOARD (Receive Picklist)
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║  Warehouse Dashboard                                                 ║
║  ├── Inventory Tab                                                  ║
║  ├── I/O History Tab                                                ║
║  ├── Products Tab                                                   ║
║  └── Parts Picklist Tab (NEW) ← Warehouse staff clicks here         ║
║                                                                     ║
║      Active Picklists List:                                         ║
║      ┌─────────────────────────────────────────────────────────┐   ║
║      │ Picklist: PL-20250115-A1B2C3D4                          │   ║
║      │ Job Order: JO-2025-001                                  │   ║
║      │ Customer: John Smith                                    │   ║
║      │ Vehicle: Toyota Corolla 2020                            │   ║
║      │ Status: pending                                         │   ║
║      │ Items: 2                                                │   ║
║      │ [Pick Items] Button                                     │   ║
║      └─────────────────────────────────────────────────────────┘   ║
║                                                                     ║
╚═══════════════════════════════════════════════════════════════════════╝
                                │
                                │ Warehouse staff clicks "Pick Items"
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ API CALL: Get Picklist Details                                       │
│ GET /api/warehouse/picklists/123                                     │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                │ Returns picklist with all items
                                │
                                ▼

PHASE 3: ANVIL PICKLIST (Pick Items)
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║  AnvilPicklist Component (Modal Opened)                              ║
║  ╔═══════════════════════════════════════════════════════════════╗   ║
║  ║ PICKLIST: PL-20250115-A1B2C3D4                               ║   ║
║  ║ [Print] [Close]                                              ║   ║
║  ║ Progress: [████░░░░░░░░░░░░░░░░] 0% Complete               ║   ║
║  ║                                                              ║   ║
║  ║ Job Order: JO-2025-001   Customer: John Smith               ║   ║
║  ║ Vehicle: Toyota Corolla 2020    Priority: normal            ║   ║
║  ║                                                              ║   ║
║  ║ ┌─ ITEM 1 ──────────────────────────────────────┐           ║   ║
║  ║ │ Code: OIL-5W30                                 │           ║   ║
║  ║ │ Description: Engine Oil 5W-30 (5L)            │           ║   ║
║  ║ │ Required: 1    Picked: [0] ← User enters qty  │           ║   ║
║  ║ │ Location: [Enter bin location] ← A-15-2       │           ║   ║
║  ║ │ Notes: [Quality checked]                       │           ║   ║
║  ║ └────────────────────────────────────────────────┘           ║   ║
║  ║                                                              ║   ║
║  ║ ┌─ ITEM 2 ──────────────────────────────────────┐           ║   ║
║  ║ │ Code: AIR-FLT                                  │           ║   ║
║  ║ │ Description: Air Filter                        │           ║   ║
║  ║ │ Required: 1    Picked: [0] ← Waiting          │           ║   ║
║  ║ │ Location: [Enter bin location] ← Empty        │           ║   ║
║  ║ │ Notes: [No notes]                              │           ║   ║
║  ║ └────────────────────────────────────────────────┘           ║   ║
║  ║                                                              ║   ║
║  ║ [Complete Picklist] (Disabled until all picked)             ║   ║
║  ║                                                              ║   ║
║  ╚═══════════════════════════════════════════════════════════════╝   ║
║                                                                     ║
╚═══════════════════════════════════════════════════════════════════════╝
                                │
                                │ Warehouse staff enters quantities
                                │
        ┌───────────────────────┴───────────────────────┐
        │                                               │
        ▼ (Item 1 updated)                              │
┌──────────────────────────────┐                        │
│ User enters: Qty 1            │                       │
│ Location: A-15-2              │                       │
│ (Component state updated)     │                       │
│ Progress: [████░░░░░░░░░ 50%  │                       │
└──────────────────────────────┘                        │
                                                        │
                                            ▼ (Item 2 updated)
                                    ┌──────────────────────────────┐
                                    │ User enters: Qty 1            │
                                    │ Location: B-22-1              │
                                    │ (Component state updated)     │
                                    │ Progress: [██████████] 100%   │
                                    └──────────────────────────────┘
                                                        │
        ┌───────────────────────────────────────────────┘
        │
        │ All items picked! Complete button enabled.
        │
        ▼
┌──────────────────────────────────────────────────────────────────────┐
│ OPTIONAL: Print Picklist                                             │
│                                                                      │
│ User clicks "Print" button                                          │
│ │                                                                   │
│ ├─ PrinterSelector Modal appears                                   │
│ │  ├─ Load available printers (Electron IPC)                       │
│ │  └─ Display printer list with radio buttons                      │
│ │                                                                   │
│ └─ User selects printer and clicks "Print"                         │
│    │                                                               │
│    └─ generatePicklistHTML() creates print template               │
│       └─ Sends to selected printer via Electron IPC               │
│                                                                     │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                │ User clicks "Complete Picklist" button
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ ACTION: Complete Picklist                                            │
│ Method: PUT /api/warehouse/picklists/123/complete                    │
│ Payload:                                                             │
│ {                                                                    │
│   picklistNumber: "PL-20250115-A1B2C3D4",                            │
│   jobOrderNumber: "JO-2025-001",                                     │
│   customer: "John Smith",                                            │
│   vehicle: "Toyota Corolla 2020",                                    │
│   status: "completed",                                               │
│   items: [                                                           │
│     { id: 1, pickedQuantity: 1, location: "A-15-2", notes: "..." },  │
│     { id: 2, pickedQuantity: 1, location: "B-22-1", notes: "..." }   │
│   ]                                                                  │
│ }                                                                    │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                │ Backend processes completion
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ DATABASE OPERATION                                                   │
│                                                                      │
│ 1. UPDATE warehouse_picklists SET status = 'completed'              │
│                                                                      │
│ 2. UPDATE warehouse_picklist_items (for each item)                  │
│    ├── quantity_picked = 1                                           │
│    ├── bin_location = 'A-15-2'                                       │
│    └── picked_notes = 'Quality checked'                              │
│                                                                      │
│ 3. (OPTIONAL) Reduce Inventory:                                     │
│    ├── UPDATE warehouse_products SET quantity_in_stock = qty - 1    │
│    └── INSERT INTO inventory_transactions (audit trail)             │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                │ Response: { success: true }
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ WAREHOUSE DASHBOARD                                                  │
│ ├── Close AnvilPicklist modal                                       │
│ ├── Reload picklist list                                            │
│ └── Picklist disappears (status not pending/in_progress)            │
│                                                                      │
│ SUCCESS MESSAGE: "Picklist completed!"                              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                │ Picklist is now completed
                                │
                                ▼

PHASE 4: JOB CONTROLLER (Receive Parts)
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║  Job Controller (Polling)                                            ║
║  │                                                                   ║
║  ├─ Poll: GET /api/warehouse/picklists/123 (every 30s)             ║
║  │  └─ Checks: status === "completed"?                             ║
║  │                                                                   ║
║  └─ Response received:                                              ║
║     {                                                               ║
║       status: "completed",                                          ║
║       items: [                                                      ║
║         { code: "OIL-5W30", pickedQuantity: 1, location: "A-15-2" },║
║         { code: "AIR-FLT", pickedQuantity: 1, location: "B-22-1" }  ║
║       ]                                                             ║
║     }                                                               ║
║                                                                     ║
║  Update Service Order:                                             ║
║  ├── Mark parts as "received from warehouse"                      ║
║  ├── Associate picked items with service order                    ║
║  ├── Notify technician: "Parts are ready!"                        ║
║  └── Update service order status: "Ready for Service"             ║
║                                                                   ║
║  Technician receives notification:                                ║
║  ├── Parts ready to pick up from warehouse                        ║
║  ├── Location: A-15-2 (OIL-5W30), B-22-1 (AIR-FLT)               ║
║  └── Items list for verification                                  ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════════╝
                                │
                                │ Technician performs service
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ SERVICE COMPLETE                                                     │
│ ├── Use picked parts for vehicle service                             │
│ ├── Complete service tasks                                           │
│ ├── Vehicle handed over to customer                                  │
│ └── Service order marked complete                                    │
│                                                                      │
│ WORKFLOW COMPLETE! ✅                                                │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Summary of All Interactions

### API Calls Made

| # | User | Action | Endpoint | Method |
|---|------|--------|----------|--------|
| 1 | Job Controller | Create picklist | POST /api/warehouse/picklists | POST |
| 2 | Warehouse (auto) | Load picklists | GET /api/warehouse/picklists | GET |
| 3 | Warehouse (auto) | Get picklist details | GET /api/warehouse/picklists/123 | GET |
| 4 | Warehouse (auto) | Print picklist | (Electron IPC) | - |
| 5 | Warehouse | Update picked items | PUT /api/warehouse/picklists/123/items/1 | PUT |
| 6 | Warehouse | Update picked items | PUT /api/warehouse/picklists/123/items/2 | PUT |
| 7 | Warehouse | Complete picklist | PUT /api/warehouse/picklists/123/complete | PUT |
| 8 | Job Controller | Poll for status | GET /api/warehouse/picklists/123 | GET |
| 9 | Job Controller | Retrieve items | GET /api/warehouse/picklists/123 | GET |

### Database Operations

| Operation | Table | Action | Trigger |
|-----------|-------|--------|---------|
| INSERT | warehouse_picklists | Create picklist record | Job Controller request |
| INSERT | warehouse_picklist_items | Create item records (per item) | Job Controller request |
| UPDATE | warehouse_picklist_items | Update picked quantity & location | Warehouse staff update |
| UPDATE | warehouse_picklists | Update status to completed | Complete button click |
| UPDATE | warehouse_products | Reduce inventory (optional) | Picklist completion |

### State Changes

| Component | State | Value Changes |
|-----------|-------|----------------|
| AnvilPicklist | pickedItems | { itemId: { qty, location, notes } } |
| AnvilPicklist | Progress | 0% → 50% → 100% |
| Database | picklist status | pending → in_progress → completed |
| Database | item quantities | quantity_picked: 0 → 1 |
| Warehouse Dashboard | picklists list | Shows/hides completed items |

---

## Timeline Example

**10:00 AM** - Job Controller creates service order with parts request
**10:01 AM** - Picklist created in database (PL-20250115-A1B2C3D4)
**10:05 AM** - Warehouse staff sees picklist in dashboard
**10:06 AM** - Warehouse staff opens AnvilPicklist, starts picking items
**10:08 AM** - Item 1 updated: Qty 1, Location A-15-2
**10:09 AM** - Item 2 updated: Qty 1, Location B-22-1
**10:10 AM** - Warehouse staff prints picklist and completes
**10:10 AM** - Status changes to "completed"
**10:11 AM** - Inventory reduced automatically
**10:12 AM** - Job Controller detects completion, updates service order
**10:13 AM** - Technician notified: "Parts ready at A-15-2 and B-22-1"
**10:20 AM** - Service completed with picked parts

---

**This completes the entire Anvil Warehouse Picklist workflow!**
