# 🏭 Warehouse Dashboard - Quick Reference

## System Login

**Admin Access:**
- Username: `admin`
- Password: `admin123`
- Role: Admin (can create personnel)

**Warehouse User:**
- Contact admin to register as warehouse personnel
- Then login with assigned credentials
- Automatic redirect to Warehouse Dashboard

---

## Dashboard Tabs

| Tab | Purpose | Key Actions |
|-----|---------|------------|
| **Inventory** | Real-time stock levels | + Add/Remove Stock |
| **I/O History** | Transaction audit trail | View only |
| **Products** | Manage catalog | + Add Product, Edit |

---

## Quick Actions

### Add Stock (Stock In)
1. Click **Inventory** tab
2. Click **+ Add/Remove Stock**
3. Select **Stock In**
4. Choose product → Enter quantity
5. Fill reference (e.g., PO-001)
6. Click **Submit**

### Remove Stock (Stock Out)
1. Click **Inventory** tab
2. Click **+ Add/Remove Stock**
3. Select **Stock Out**
4. Choose product → Enter quantity
5. Link to repair job/reference
6. Click **Submit**

### Add New Product
1. Click **Products** tab
2. Click **+ Add Product**
3. Fill required fields (code, name, category, price)
4. Set reorder level
5. Click **Save**

### Edit Product
1. Click **Products** tab
2. Find product card
3. Click **Edit**
4. Modify details
5. Click **Update**

### View Transaction History
1. Click **I/O History** tab
2. Scroll to view past transactions
3. Each row shows: date, product, type, qty, user

---

## Summary Cards (Top)

- **Total Products**: Count of unique items
- **Total Quantity**: Sum of all stock
- **Inventory Value**: Total monetary value
- **Low Stock Items**: Count below reorder level (red alert)

---

## Status Indicators

| Status | Meaning | Color |
|--------|---------|-------|
| **Ok** | Stock ≥ Reorder Level | 🟢 Green |
| **Low** | Stock ≤ Reorder Level | 🔴 Red |
| **IN** | Stock received | Blue badge |
| **OUT** | Stock used | Yellow badge |

---

## Important Fields

**For Stock Transactions:**
- `Transaction Type`: Stock In or Out
- `Product`: Select from dropdown
- `Quantity`: Number of units
- `Reference No`: Unique tracking number (e.g., Job #, PO #)
- `Reference Type`: Category of transaction
  - Repair Job (most common)
  - Purchase (stock in)
  - Sale (stock out)
  - Damage (damaged stock)
  - Adjustment (corrections)
- `Notes`: Optional comments

**For Products:**
- `Product Code`: SKU or part number (required, unique)
- `Product Name`: Full product description (required)
- `Category`: Type of part/product (required)
- `Unit Price`: Cost per unit (required)
- `Reorder Level`: Trigger alert when stock falls below this
- `Supplier`: Vendor name
- `Description`: Additional details

---

## API Base URL
```
http://localhost:5000/api/warehouse
```

**Key Endpoints:**
- `GET /products` - List all products
- `POST /products` - Add new product
- `PUT /products/<id>` - Update product
- `POST /inventory/add` - Stock in
- `POST /inventory/remove` - Stock out
- `GET /inventory/history` - Transaction history
- `GET /summary` - Dashboard summary

---

## Keyboard Shortcuts

- `Tab` - Move between form fields
- `Enter` - Submit form
- `Escape` - Close modals (if implemented)

---

## Common Workflows

### Daily Shift Start
1. Check **I/O History** for yesterday's transactions
2. Review **Inventory** tab for low stock alerts
3. Add new stock received overnight
4. Update reorder levels if needed

### After Repair Job
1. Go to **Inventory** tab
2. Click **+ Add/Remove Stock**
3. Select **Stock Out**
4. Select items used
5. Reference the job number (Job #XXXX)
6. Submit to log transaction

### Monthly Stock Check
1. Review **Products** grid for missing items
2. Check **Low Stock Items** alert count
3. Cross-reference with physical inventory
4. Update quantities if discrepancies found
5. Export history for accounting

### New Supplier/Product
1. Click **Products** tab
2. Click **+ Add Product**
3. Enter all details
4. Set initial reorder level
5. First stock-in transaction creates initial quantity

---

## Troubleshooting

**Products not loading?**
- Check browser console (F12)
- Verify backend is running (http://localhost:5000)
- Try page refresh

**Can't add stock?**
- Make sure product exists in dropdown
- Check quantity is a valid number
- Verify reference number isn't empty

**Low stock not showing?**
- Confirm reorder level is set for product
- Check if quantity is actually ≤ reorder level
- Refresh page to update summary

**Edit product not working?**
- Select product first (click Edit on card)
- Fill in all required fields
- Check for duplicate product codes

---

## Best Practices

✅ **DO:**
- Log all transactions immediately
- Use meaningful reference numbers
- Set appropriate reorder levels per product
- Review transaction history weekly
- Keep supplier contact info updated
- Take regular physical inventory counts

❌ **DON'T:**
- Manually edit database instead of UI
- Leave quantity as 0 without noting why
- Create duplicate product codes
- Skip reference numbers
- Forget to log transactions
- Mix units (e.g., liters vs boxes)

---

## System Limits

- Product code: Max 50 characters
- Product name: Max 255 characters
- Quantity: Up to 999,999 units
- Price: Up to ₱999,999.99
- Transaction history: Unlimited (view last 50 by default)

---

**Need Help?** Check WAREHOUSE_IMPLEMENTATION.md for detailed documentation.
