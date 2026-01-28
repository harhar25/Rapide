# Parts Request System - UI/UX Visual Guide

## Overview

The Parts Request system is integrated into the Car Jockey Dashboard with a clean, modal-based interface.

---

## Dashboard Navigation

```
┌─────────────────────────────────────────────────────────────────┐
│  🚗 Car Jockey Operations - Dashboard                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Tabs: 📋 Pending Vehicles | 🚙 Active Movements | 🅿️ Parked    │
│                                                     ^
│                                              "Request Parts" button
│                                             is in this tab only
│
└─────────────────────────────────────────────────────────────────┘
```

---

## Active Movements Tab

### Vehicle Movement Card
```
┌─────────────────────────────────────────────────────┐
│ Movement Card Example                               │
├─────────────────────────────────────────────────────┤
│                                                      │
│ SO-000123                         [Check-In Button] │
│ Customer Name                                        │
│ Plate: ABC-1234                                      │
│ From: Service Bay → To: Parking Zone A              │
│ Fuel: 50L → 48L | Mileage: 15000 → 15005 km        │
│ Started: 2024-01-15 14:30:00                        │
│                                                      │
│ ┌──────────────────────────────────────────────────┐ │
│ │ [Complete]  [Park Vehicle]  [Request Parts] ◄─────ClickMe!
│ └──────────────────────────────────────────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Parts Request Modal - Form Layout

### Modal Header
```
┌──────────────────────────────────────────────────────────┐
│ ✕  Request Parts from Warehouse                          │
├──────────────────────────────────────────────────────────┤
│ Service Order: SO-000123 | Plate: ABC-1234              │
└──────────────────────────────────────────────────────────┘
```

### Modal Content - Item Selection Table
```
┌─────────────────────────────────────────────────────────────────┐
│  Product           │  Qty  │  Remove                            │
├─────────────────────────────────────────────────────────────────┤
│  ▼ -- Select... -- │  [1]  │                                   │
├─────────────────────────────────────────────────────────────────┤
│  ▼ -- Select... -- │  [1]  │                                   │
└─────────────────────────────────────────────────────────────────┘
        ▲
    Dropdown here
```

### Product Dropdown Options
```
-- Select Product --
ABC-001 - Air Filter (Stock: 15)
XYZ-002 - Brake Pads (Stock: 8)
DEF-003 - Oil Filter (Stock: 12)
GHI-004 - Radiator Cap (Stock: 20)
JKL-005 - Spark Plugs (Stock: 50)
...
```

### After Product Selection
```
┌─────────────────────────────────────────────────────────────────┐
│  Product           │  Qty  │  Remove                            │
├─────────────────────────────────────────────────────────────────┤
│  ▼ ABC-001         │  [5]  │  ✕                                │
│     Code: ABC-001  │       │                                   │
├─────────────────────────────────────────────────────────────────┤
│  ▼ XYZ-002         │  [3]  │  ✕                                │
│     Code: XYZ-002  │       │                                   │
└─────────────────────────────────────────────────────────────────┘
    ^                   ^       ^
 Read-only       Editable      Remove row
 (from dropdown) (quantity)    (if > 1 item)
```

### Add Item Button
```
┌─────────────────────────────────────────────────────────────────┐
│  [+ Add Item]  (Green button)                                    │
└─────────────────────────────────────────────────────────────────┘
     ↓ Click to add another line
     
Item 3 will be added:
│  ▼ -- Select... -- │  [1]  │  ✕                                │
```

### Modal Footer - Action Buttons
```
┌─────────────────────────────────────────────────────────────────┐
│  [Cancel]                [Submit Request to Job Controller]      │
│  (Gray button)           (Blue button - Primary action)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Complete Modal Example

```
╔════════════════════════════════════════════════════════════════╗
║  Request Parts from Warehouse                                  ║
╠════════════════════════════════════════════════════════════════╣
║  Service Order: SO-000123 | Plate: ABC-1234                   ║
║                                                                ║
║  ┌──────────────────────────────────────────────────────────┐ ║
║  │ Product              │ Qty │ Action                     │ ║
║  ├──────────────────────────────────────────────────────────┤ ║
║  │ ▼ Air Filter         │ [5] │ ✕                          │ ║
║  │   Code: ABC-001      │     │                            │ ║
║  │   Description: High-quality air filter                  │ ║
║  ├──────────────────────────────────────────────────────────┤ ║
║  │ ▼ Brake Pads         │ [3] │ ✕                          │ ║
║  │   Code: XYZ-002      │     │                            │ ║
║  │   Description: Ceramic brake pads                       │ ║
║  └──────────────────────────────────────────────────────────┘ ║
║                                                                ║
║  [+ Add Item]                                                  ║
║                                                                ║
║  [Cancel]              [Submit Request to Job Controller]      ║
╚════════════════════════════════════════════════════════════════╝
```

---

## User Interaction Flow

### Step 1: Initiate Request
```
Vehicle Card
    ↓
[Request Parts Button]
    ↓
Modal Opens
```

### Step 2: Select Products
```
Modal Visible
    ↓
Click Dropdown (Row 1)
    ↓
Select Product from List
    ↓
Product Details Auto-filled
    ↓
[Optional] Adjust Quantity
```

### Step 3: Add More Items
```
[+ Add Item Button]
    ↓
New Row Added
    ↓
Repeat Selection Process
```

### Step 4: Submit Request
```
All Products Selected
    ↓
Quantities Entered
    ↓
[Submit Request to Job Controller] Button
    ↓
Request Sent to Backend
    ↓
Success Message
    ↓
Modal Closes
```

---

## Field Behavior

### Product Dropdown
- **Type:** SELECT element
- **Editable:** YES (user selects from list)
- **Auto-fills:** Code, Description
- **Appearance:** Professional dropdown with chevron
- **Keyboard:** Supports arrow keys + enter
- **Mouse:** Click or scroll to select

### Quantity Field
- **Type:** Number input
- **Editable:** YES (user can type)
- **Range:** 1 - 9999
- **Default:** 1
- **Validation:** Must be > 0
- **Appearance:** Standard numeric input box

### Product Code Field
- **Type:** Text display
- **Editable:** NO (read-only)
- **Source:** Auto-filled from dropdown
- **Appearance:** Disabled/grayed out

### Description Field
- **Type:** Text display (on separate row)
- **Editable:** NO (read-only)
- **Source:** Auto-filled from dropdown
- **Appearance:** Smaller font, secondary text color

---

## Message Displays

### Success Message
```
┌─────────────────────────────────────────┐
│ ✓ Parts request submitted to Job        │
│   Controller                             │
└─────────────────────────────────────────┘
(Green background, white text, auto-dismiss in 2s)
```

### Error Message
```
┌─────────────────────────────────────────┐
│ ✗ Please select a product for all items │
└─────────────────────────────────────────┘
(Red background, white text, requires user to close)
```

### Validation Error
```
┌─────────────────────────────────────────┐
│ ✗ Quantity must be at least 1           │
└─────────────────────────────────────────┘
```

---

## Responsive Behavior

### Desktop (1200px+)
```
Modal: 700px wide
Products Table: Full width
Buttons: Side by side
```

### Tablet (768px - 1199px)
```
Modal: 80% width
Products Table: Scrollable horizontally
Buttons: Full width, stacked
```

### Mobile (< 768px)
```
Modal: 95% width, 80% max-height
Products Table: Single column or scrollable
Buttons: Full width, stacked
```

---

## Color Scheme

| Element | Color | Usage |
|---------|-------|-------|
| Primary Button | #007BFF (Blue) | Submit action |
| Secondary Button | #6C757D (Gray) | Cancel action |
| Success Message | #28A745 (Green) | Positive feedback |
| Error Message | #DC3545 (Red) | Error feedback |
| Modal Background | White | Main content area |
| Modal Overlay | rgba(0,0,0,0.5) | Backdrop |
| Text Primary | #212529 (Dark) | Headings, labels |
| Text Secondary | #6C757D (Gray) | Helper text |
| Border | #DEE2E6 (Light Gray) | Form elements |

---

## Accessibility Features

- ✅ Proper form labels (associated with inputs)
- ✅ Keyboard navigation support
- ✅ Tab order optimization
- ✅ Color not sole indicator (text + icons)
- ✅ Clear focus indicators
- ✅ ARIA labels where needed
- ✅ Error messages linked to fields
- ✅ Sufficient color contrast

---

## Performance Indicators

### Loading State
```
Modal Loading:
┌─────────────────────────────┐
│  Loading warehouse inventory │
│  [spinner] ...              │
└─────────────────────────────┘
(Shows briefly during product fetch)
```

### Disabled States
- Submit button disabled until > 0 items with products selected
- Remove button disabled when only 1 item exists

---

## Print Layout

When printed, the modal displays:
- Service order number
- Requested items with quantities
- Timestamp
- No action buttons (not relevant for print)

---

## Accessibility Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Tab | Move to next field |
| Shift+Tab | Move to previous field |
| Enter | Submit form |
| Escape | Close modal |
| Space | Toggle dropdown |
| Arrow Keys | Navigate dropdown options |

---

**UI Version:** 1.0  
**Last Updated:** [Current Date]  
**Compatibility:** All modern browsers (Chrome, Firefox, Safari, Edge)
