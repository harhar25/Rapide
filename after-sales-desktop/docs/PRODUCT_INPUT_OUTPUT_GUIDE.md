# Product Input/Output Guide - Warehouse Module

## Where to Input/Output Products

### **Warehouse Dashboard** (Role: `warehouse`)
Access: Login as a user with role `warehouse`

#### **Tab 1: Inventory** - Add/Remove Stock
- **To ADD stock (Input/Stock In):**
  1. Click "+ Add/Remove Stock" button
  2. Select "Stock In" from Transaction Type dropdown
  3. Select product from "Product" dropdown
  4. Enter Quantity (how many units to add)
  5. Enter Reference Number (e.g., Purchase Order, Receipt Number)
  6. Select Reference Type (repair-job, maintenance, etc.)
  7. Add Notes (optional)
  8. Click "Save"
  9. System updates inventory automatically
  10. Transaction logged to I/O History

- **To REMOVE stock (Output/Stock Out):**
  1. Click "+ Add/Remove Stock" button
  2. Select "Stock Out" from Transaction Type dropdown
  3. Select product from "Product" dropdown
  4. Enter Quantity (how many units to remove)
  5. Enter Reference Number (e.g., Job Order, Work Order)
  6. Select Reference Type (repair-job, maintenance, etc.)
  7. Add Notes (optional)
  8. Click "Save"
  9. System updates inventory automatically
  10. Transaction logged to I/O History

#### **Tab 2: I/O History** - View Audit Trail
- Shows all stock in/out transactions
- Displays: Product Name, Transaction Type, Quantity, Before/After Stock, Reference, User, Timestamp
- Read-only audit trail for compliance

#### **Tab 3: Products** - Manage Product Master
- **To ADD a new product:**
  1. Click "+ Add Product" button
  2. Fill in:
     - Product Code (unique identifier)
     - Product Name
     - Category
     - Unit Price
     - Reorder Level (alert when stock falls below this)
     - Supplier
     - Description
  3. Click "Save"
  4. Product appears in inventory list

- **To EDIT an existing product:**
  1. Click "Edit" on any product card
  2. Update any field
  3. Click "Save"

- **To DELETE a product:**
  1. Click "Delete" on any product card
  2. Product marked as "discontinued" (soft delete, not removed from history)

### **Summary Cards** (Top of Warehouse Dashboard)
- Total Products: Count of active products
- Total Quantity: Sum of all stock quantities
- Inventory Value: Total ₱ value of all stock (Qty × Unit Price)
- Low Stock Items: Alert for products below reorder level

---

## Data Flow

```
CRO/Technician requests parts
        ↓
Warehouse Staff adds parts to inventory (Stock In)
        ↓
Technician picks parts from warehouse
        ↓
Warehouse Staff removes from inventory (Stock Out)
        ↓
Transaction recorded in I/O History
        ↓
Inventory levels updated automatically
        ↓
Low stock alerts generated
```

---

## For Technician Module
When Technician role needs parts:
1. Technician views parts picklist from Service Order
2. Requests parts → sends to warehouse module
3. Warehouse staff processes request
4. Marks as "Parts Issued" when technician signs
5. System auto-adjusts inventory (Stock Out)

---

## Database Tables

### `warehouse_products`
- id, product_code, product_name, category, unit_price, quantity_in_stock, reorder_level, supplier, description, status, created_at, updated_at

### `warehouse_inventory_history`
- id, product_id, transaction_type (in/out), quantity, previous_quantity, new_quantity, reference_no, reference_type, notes, created_by, created_at
