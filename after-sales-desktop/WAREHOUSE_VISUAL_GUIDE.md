# Warehouse Dashboard - Visual Guide & Workflows

## 🏗️ System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    RAPIDE WAREHOUSE SYSTEM                      │
└─────────────────────────────────────────────────────────────────┘

                           USER INTERFACE
┌──────────────────────────────────────────────────────────────────┐
│  React Frontend (localhost:3000)                                 │
│  ┌──────────────────────────────────────────────────────────────┐
│  │ Warehouse Dashboard                                          │
│  │                                                              │
│  │ [Summary Cards: 4 metrics]                                  │
│  │ [Tab Nav: Inventory | I/O History | Products]              │
│  │                                                              │
│  │ ┌─────────────────────────────────────────────────────────┐ │
│  │ │ INVENTORY TAB        │ I/O HISTORY TAB  │ PRODUCTS TAB  │ │
│  │ │ • Stock table        │ • Transactions   │ • Add Product │ │
│  │ │ • Add/Remove Stock   │ • Audit trail    │ • Edit cards  │ │
│  │ │ • Status indicators  │ • Date filter    │ • Grid view   │ │
│  │ └─────────────────────────────────────────────────────────┘ │
│  │                                                              │
│  └──────────────────────────────────────────────────────────────┘
└────────────┬────────────────────────────────────────────────────┘
             │ REST API (fetch/axios)
             │
                        BACKEND API LAYER
┌────────────┴───────────────────────────────────────────────────┐
│  Flask Backend (localhost:5000)                                 │
│  ┌──────────────────────────────────────────────────────────────┐
│  │ warehouse_routes.py (10 endpoints)                          │
│  │                                                              │
│  │  GET    /api/warehouse/products → List all products        │
│  │  POST   /api/warehouse/products → Create product           │
│  │  PUT    /api/warehouse/products/<id> → Update product      │
│  │  DELETE /api/warehouse/products/<id> → Delete product      │
│  │  POST   /api/warehouse/inventory/add → Stock in            │
│  │  POST   /api/warehouse/inventory/remove → Stock out        │
│  │  GET    /api/warehouse/inventory/history → Get history     │
│  │  GET    /api/warehouse/low-stock → Low stock alert        │
│  │  GET    /api/warehouse/summary → Dashboard metrics         │
│  │                                                              │
│  │  ↓ Service Layer (warehouse_service.py)                    │
│  │  • get_all_products()                                       │
│  │  • create/update/delete_product()                           │
│  │  • add/remove_inventory()                                   │
│  │  • get_inventory_history()                                  │
│  │  • get_low_stock_products()                                 │
│  └──────────────────────────────────────────────────────────────┘
└────────────┬────────────────────────────────────────────────────┘
             │ SQL Queries
             │
                        DATABASE LAYER
┌────────────┴───────────────────────────────────────────────────┐
│  MySQL Database (after_sales_db)                                │
│  ┌──────────────────────────────────────────────────────────────┐
│  │ warehouse_products                                           │
│  │ ├─ id (PK)                                                  │
│  │ ├─ product_code (UNIQUE)                                    │
│  │ ├─ product_name                                             │
│  │ ├─ category                                                 │
│  │ ├─ unit_price                                               │
│  │ ├─ quantity_in_stock ← SYNC with history                   │
│  │ ├─ reorder_level                                            │
│  │ ├─ supplier                                                 │
│  │ └─ status                                                   │
│  │                                                              │
│  │ warehouse_inventory_history                                 │
│  │ ├─ id (PK)                                                  │
│  │ ├─ product_id (FK)                                          │
│  │ ├─ transaction_type (in/out/adjustment/damaged)             │
│  │ ├─ quantity                                                 │
│  │ ├─ previous_quantity                                        │
│  │ ├─ new_quantity                                             │
│  │ ├─ reference_no (Job #, PO #, etc.)                        │
│  │ ├─ reference_type                                           │
│  │ ├─ notes                                                    │
│  │ ├─ created_by (user)                                        │
│  │ └─ created_at (timestamp)                                   │
│  └──────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Main Dashboard Layout

```
╔═════════════════════════════════════════════════════════════════╗
║                    WAREHOUSE MANAGEMENT                         ║
║  [Logo: Rapide]                                    [Sign Out]   ║
╠═════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  ┌────────────────┬──────────────┬──────────────┬────────────┐ ║
║  │ Total Products │ Total Qty    │ Inventory $  │ Low Stock  │ ║
║  │       8        │     156      │  ₱24,580    │     2 ⚠️    │ ║
║  └────────────────┴──────────────┴──────────────┴────────────┘ ║
║                                                                 ║
║  [Inventory Tab] [I/O History Tab] [Products Tab]              ║
║  ════════════════                                              ║
║                                                                 ║
║  ┌──────────────────────────────────────────────────────────┐ ║
║  │ [+ Add/Remove Stock]                                     │ ║
║  │                                                          │ ║
║  │ ┌──────┬──────┬──────┬────────┬────────┬────────┐       │ ║
║  │ │ Code │ Name │ Cat. │ Price  │ Stock  │Status  │       │ ║
║  │ ├──────┼──────┼──────┼────────┼────────┼────────┤       │ ║
║  │ │OIL-5L│Oil   │Fluid │₱850   │45     │Ok      │       │ ║
║  │ │AIR-F │Filter│Maint │₱450   │8      │⚠️ LOW  │◄ Alert  │ ║
║  │ │BRAKE │Pads  │Brake │₱1200  │12     │Ok      │       │ ║
║  │ └──────┴──────┴──────┴────────┴────────┴────────┘       │ ║
║  └──────────────────────────────────────────────────────────┘ ║
║                                                                 ║
╚═════════════════════════════════════════════════════════════════╝
```

---

## 📊 Tab Views

### Tab 1: Inventory (Default)
```
INVENTORY TAB CONTENT:

[+ Add/Remove Stock Button]

PRODUCT INVENTORY TABLE:
┌─────────────────────────────────────────────────────────┐
│ Code      │ Product       │ Category │ Price │ Qty │ St │
├─────────────────────────────────────────────────────────┤
│ OIL-5L    │ Engine Oil    │ Fluids   │ ₱850  │ 45  │ ✓  │
│ AIR-FILTER│ Air Filter    │ Filters  │ ₱450  │ 8   │ ⚠️  │◄ LOW
│ BRAKE-1   │ Brake Pads    │ Brakes   │₱1200  │ 12  │ ✓  │
│ SPARK-4   │ Spark Plugs   │ Ignition │ ₱320  │ 3   │ ⚠️  │◄ LOW
└─────────────────────────────────────────────────────────┘
```

### Tab 2: I/O History
```
I/O HISTORY TAB CONTENT:

TRANSACTION HISTORY TABLE:
┌──────────┬────────────┬──────┬───┬──────┬─────┬────────┬────┐
│ Date     │ Product    │ Type │Qty│ Prev │ New │ RefNo  │ By │
├──────────┼────────────┼──────┼───┼──────┼─────┼────────┼────┤
│ 1/15/24  │ Engine Oil │ [IN] │ 5 │ 40   │ 45  │PO-2024 │John│
│ 1/14/24  │ Brake Pads │[OUT] │ 1 │ 13   │ 12  │JOB1234 │Bob │
│ 1/14/24  │ Sparkplugs │[OUT] │ 2 │ 5    │ 3   │JOB1235 │Bob │
│ 1/13/24  │ Air Filter │ [IN] │10 │ -2   │ 8   │PO-2023 │Sarah│
│ 1/12/24  │ Coolant    │[ADJ] │-1 │ 23   │ 22  │Spill   │Tom │
└──────────┴────────────┴──────┴───┴──────┴─────┴────────┴────┘
```

### Tab 3: Products
```
PRODUCTS TAB CONTENT:

[+ Add Product Button]

PRODUCT CARDS GRID:
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ Engine Oil (5L)     │  │ Air Filter          │  │ Brake Pads          │
│ Code: OIL-5L        │  │ Code: AIR-FILTER    │  │ Code: BRAKE-1       │
│ ₱850                │  │ ₱450                │  │ ₱1,200              │
│ Category: Fluids    │  │ Category: Filters   │  │ Category: Brakes    │
│ Stock: 45           │  │ Stock: 8            │  │ Stock: 12           │
│ [Edit Button]       │  │ [Edit Button]       │  │ [Edit Button]       │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘

More cards...
```

---

## 🔄 Stock In Workflow

```
USER INITIATES STOCK IN
        ↓
    [+ Add/Remove Stock]
        ↓
    Form Opens
    ├─ Transaction Type: [Stock In ▼]
    ├─ Product: [Select Product ▼]
    ├─ Quantity: [____]
    ├─ Reference No: [____] ← PO-2024-001
    ├─ Reference Type: [Purchase ▼]
    └─ Notes: [Text...]
        ↓
    [Submit Button]
        ↓
API CALL: POST /api/warehouse/inventory/add
        ↓
BACKEND SERVICE
    ├─ Fetch current product
    ├─ Calculate new quantity
    ├─ Create history record
    └─ Update product quantity
        ↓
DATABASE UPDATE
    ├─ INSERT into warehouse_inventory_history
    ├─ UPDATE warehouse_products.quantity_in_stock
    └─ Return success
        ↓
FRONTEND UPDATE
    ├─ Reload products
    ├─ Reload summary
    ├─ Show success message
    └─ Close form
        ↓
    SUCCESS: Transaction logged, inventory updated
```

---

## 🔄 Stock Out Workflow

```
USER INITIATES STOCK OUT
        ↓
    [+ Add/Remove Stock]
        ↓
    Form Opens
    ├─ Transaction Type: [Stock Out ▼]
    ├─ Product: [Select Product ▼]
    ├─ Quantity: [____]
    ├─ Reference No: [____] ← JOB-1234
    ├─ Reference Type: [Repair Job ▼]
    └─ Notes: [Text...]
        ↓
    [Submit Button]
        ↓
API CALL: POST /api/warehouse/inventory/remove
        ↓
BACKEND SERVICE
    ├─ Fetch current product
    ├─ Validate sufficient stock
    ├─ Calculate new quantity
    ├─ Create history record
    └─ Update product quantity
        ↓
DATABASE UPDATE
    ├─ INSERT into warehouse_inventory_history
    ├─ UPDATE warehouse_products.quantity_in_stock
    └─ Check if now low stock
        ↓
FRONTEND UPDATE
    ├─ Reload products
    ├─ Reload summary
    ├─ Update low stock badge
    └─ Close form
        ↓
    SUCCESS: Parts logged as used, inventory decreased
```

---

## 📝 Add Product Workflow

```
USER CLICKS ADD PRODUCT
        ↓
    Products Tab → [+ Add Product]
        ↓
    Modal Form Opens
    ├─ Product Code: [OIL-5L]
    ├─ Product Name: [Engine Oil 5L]
    ├─ Category: [Fluids]
    ├─ Unit Price: [850.00]
    ├─ Reorder Level: [10]
    ├─ Supplier: [Shell PH]
    └─ Description: [Premium mineral oil]
        ↓
    [Save Button]
        ↓
API CALL: POST /api/warehouse/products
        ↓
BACKEND SERVICE
    ├─ Validate required fields
    ├─ Check duplicate code
    └─ Insert into database
        ↓
DATABASE INSERT
    ├─ INSERT into warehouse_products
    ├─ New ID generated
    └─ Status: active
        ↓
FRONTEND UPDATE
    ├─ Reload products
    ├─ Show in grid & inventory
    └─ Close form
        ↓
    SUCCESS: Product added to catalog, ready to use
```

---

## ✏️ Edit Product Workflow

```
USER CLICKS EDIT
        ↓
    Products Tab → Card [Edit Button]
        ↓
    Form Modal Opens (Pre-filled)
    ├─ Product Code: [OIL-5L] (locked)
    ├─ Product Name: [Engine Oil 5L]
    ├─ Category: [Fluids] ← Change to "Lubricants"
    ├─ Unit Price: [850.00] ← Change to [900.00]
    ├─ Reorder Level: [10]
    ├─ Supplier: [Shell PH]
    └─ Description: [Premium mineral oil]
        ↓
    [Update Button]
        ↓
API CALL: PUT /api/warehouse/products/1
        ↓
BACKEND SERVICE
    ├─ Validate product exists
    ├─ Validate required fields
    └─ Update database record
        ↓
DATABASE UPDATE
    ├─ UPDATE warehouse_products
    ├─ New price: 900.00
    ├─ New category: Lubricants
    └─ updated_at timestamp
        ↓
FRONTEND UPDATE
    ├─ Reload products
    ├─ Cards show new price
    ├─ Table shows new category
    └─ Close form
        ↓
    SUCCESS: Product updated, changes visible everywhere
```

---

## 📊 Daily Warehouse Tasks

```
MORNING SHIFT START:
  1. Login to warehouse role account
  2. Check [I/O History] tab - review yesterday's transactions
  3. Check summary cards - verify inventory value
  4. Look for 🔴 LOW STOCK items
  5. Plan for restocking

DURING SHIFT:
  6. When stock received → [+ Add/Remove Stock] → Stock In
  7. When parts used → [+ Add/Remove Stock] → Stock Out
  8. When adding new item → Products tab → [+ Add Product]
  9. All transactions automatically logged with timestamp

END OF SHIFT:
  10. Review [I/O History] - ensure all transactions logged
  11. Verify [Inventory] tab quantities match physical count
  12. Note any discrepancies for next shift

WEEKLY:
  13. Export [I/O History] for reporting
  14. Review [Summary] for inventory value trends
  15. Check supplier reorder status
  16. Update reorder levels if needed
```

---

## 🎨 Color Coding & Status Indicators

```
PRODUCT STATUS:

✓ OK (Green)                    ⚠️ LOW STOCK (Red)
├─ Quantity > Reorder Level     ├─ Quantity ≤ Reorder Level
├─ Green status badge           ├─ Red background on row
├─ Normal operations            └─ ACTION REQUIRED: Reorder

TRANSACTION TYPES:

[IN] Stock In (Blue)            [OUT] Stock Out (Yellow)
├─ Inventory received           ├─ Inventory used
├─ Purchases, returns           ├─ Repairs, sales
└─ Quantity increases           └─ Quantity decreases

[ADJUST] Adjustment (Cyan)      [DAMAGED] Damaged (Red)
├─ Manual corrections           ├─ Defective items
├─ Count discrepancies          ├─ Damaged in transit
└─ Minor changes                └─ Unusable stock
```

---

## 📈 Dashboard Metrics Explained

```
┌─────────────────────────────────────────────────────────┐
│ SUMMARY CARDS                                           │
├─────────────────────────────────────────────────────────┤
│ Total Products: 8                                       │
│   ↳ Count of unique product codes in inventory         │
│   ↳ Does NOT include deleted items                     │
│                                                         │
│ Total Quantity: 156                                    │
│   ↳ Sum of all quantities across all products          │
│   ↳ Stock levels from warehouse_products table         │
│                                                         │
│ Inventory Value: ₱24,580                              │
│   ↳ Total of (quantity × unit_price) for all products │
│   ↳ Used for financial reporting & insurance          │
│                                                         │
│ Low Stock Items: 2 ⚠️                                   │
│   ↳ Count of products with qty ≤ reorder_level       │
│   ↳ Click to see which items need restocking          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔗 Data Relationships

```
┌─────────────────────────────────────────────────┐
│        warehouse_products (Master)              │
├─────────────────────────────────────────────────┤
│ id (PK) = 1                                     │
│ product_code = "OIL-5L"                         │
│ quantity_in_stock = 45 ←┐                       │
└─────────────────────────────────────────────────┘
                         │ references
                         │
┌─────────────────────────────────────────────────┐
│  warehouse_inventory_history (Detail)           │
├─────────────────────────────────────────────────┤
│ product_id = 1 ┐                               │
│ previous_qty = 40 ┐ Stock In Event            │
│ new_qty = 45 ──┼─→ Updates parent table qty  │
│ quantity = 5   ┐                               │
│ reference_no = "PO-2024-001"                   │
│ created_by = "john_warehouse"                  │
│ created_at = 2024-01-15 09:30:00               │
└─────────────────────────────────────────────────┘
  ↑
  All transactions LINKED to a product
  All history TRACEABLE to a user
  All quantities AUDITABLE
```

---

## ✅ Best Practices

```
DO ✓:
  • Log all stock movements immediately
  • Use meaningful reference numbers (Job #, PO #)
  • Set appropriate reorder levels per product
  • Review history weekly for accuracy
  • Backup database regularly
  • Physical count monthly against system

DON'T ✗:
  • Delete transactions (breaks audit trail)
  • Edit database directly (breaks sync)
  • Leave quantity 0 without notes
  • Create duplicate product codes
  • Share passwords/credentials
  • Ignore low stock warnings
```

---

## 🚨 Alert Conditions

```
SYSTEM WILL ALERT YOU WHEN:

┌──────────────────────────────────────┐
│ 1. STOCK BELOW REORDER LEVEL        │
│    ├─ Row highlights RED             │
│    ├─ Summary badge shows count      │
│    └─ ACTION: Order from supplier    │
├──────────────────────────────────────┤
│ 2. INSUFFICIENT STOCK FOR OUT        │
│    ├─ Error message when trying      │
│    ├─ Transaction prevented          │
│    └─ ACTION: Check stock first      │
├──────────────────────────────────────┤
│ 3. INVALID REFERENCE NUMBER          │
│    ├─ Form validation error          │
│    ├─ Cannot submit form             │
│    └─ ACTION: Fill reference field   │
├──────────────────────────────────────┤
│ 4. PRODUCT NOT FOUND                 │
│    ├─ Error when deleting            │
│    ├─ API returns 404                │
│    └─ ACTION: Check product code    │
└──────────────────────────────────────┘
```

This visual guide complements the written documentation and helps you understand the system at a glance!
