# Anvil Job Order Form - Quick Start Guide

## 🚀 Quick Start

### Installation & Setup

1. **Backend Setup** - Print service is already integrated
   ```bash
   cd backend
   pip install -r requirements.txt  # Already includes dependencies
   python run.py
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install  # Already installed
   npm run dev  # Or npm start for production
   ```

3. **Electron Integration** - Already configured in:
   - `frontend/preload.js` - IPC bridges
   - `frontend/src/main.js` - IPC handlers

### Accessing the Feature

1. Open Job Controller Dashboard
2. Click **"Print Job Order"** tab
3. Select an order or create new entry
4. Fill in details and click **"Print Job Order"**
5. Select printer and confirm

## 📋 Form Sections

| Section | Fields | Required |
|---------|--------|----------|
| Job Order Details | Number, Date | ✅ |
| Customer Info | Name, Contact | ✅ |
| Vehicle Info | Make/Model/Year, Registration | ✅ |
| Service Details | Description, Additional Services | ✅ |
| Assignment | Technician Name | ✅ |
| Estimates | Hours, Cost | ❌ |
| Notes | Special Instructions | ❌ |

## 🖨️ Printer Selection

- **Automatic Detection**: Lists all connected printers
- **Default Printer**: Auto-selected on modal open
- **Custom Selection**: Choose any available printer
- **Status Indicator**: Shows printer name and description

## 📁 Key Files

| File | Purpose |
|------|---------|
| `AnvilJobOrderForm.jsx` | Main form component |
| `PrinterSelector.jsx` | Printer selection modal |
| `printService.js` | Printer/print operations |
| `anvil-job-order.css` | Styling & print layout |
| `print_service_routes.py` | Backend API endpoints |

## 💻 API Endpoints

### Log Print Event
```bash
POST /api/print/job-order
Content-Type: application/json

{
  "jobOrder": { /* form data */ },
  "printerName": "Printer Name"
}
```

### Get Print History
```bash
GET /api/print/history
```

## 🔧 Common Customizations

### Change Form Fields
**File**: `AnvilJobOrderForm.jsx`
```jsx
// Add to formData state:
const [formData, setFormData] = useState({
  // ... existing
  myField: ''
});

// Add to form JSX:
<div className="form-group">
  <label>My Field</label>
  <input name="myField" ... />
</div>
```

### Modify Print Layout
**File**: `AnvilJobOrderForm.jsx`
```jsx
// Edit generatePrintContent() method
const generatePrintContent = () => {
  return `<!DOCTYPE html>...<your HTML>...</html>`;
};
```

### Update Styling
**File**: `anvil-job-order.css`
```css
.anvil-job-order-container {
  /* Your custom styles */
}
```

## ✅ Testing Checklist

- [ ] Form loads without errors
- [ ] Fields populate from service orders
- [ ] Manual entry works correctly
- [ ] Printer list appears on print click
- [ ] Print preview opens in new window
- [ ] Printer selection sends to correct printer
- [ ] Form clear button resets all fields
- [ ] Responsive on mobile/tablet
- [ ] Print layout looks professional
- [ ] Signature lines are properly spaced

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| No printers detected | Check OS printer settings, restart app |
| Form won't populate | Verify service order data structure |
| Print dialog not showing | Check browser console, test fallback |
| Printer selection failing | Verify Electron IPC in main.js |
| Styles not applying | Clear cache, rebuild CSS |

## 📊 Component Structure

```
JobControllerDashboard
├── "Print Job Order" Tab
│   ├── Order Selection View
│   │   ├── Pending Orders Grid
│   │   └── Create New Button
│   └── AnvilJobOrderForm
│       ├── Form Sections
│       ├── Preview Button
│       ├── Print Button
│       └── PrinterSelector Modal
│           └── Printer List
│               └── Print Action
```

## 🎯 Key Features Summary

✅ Professional form design  
✅ Automatic printer detection  
✅ Print preview functionality  
✅ Direct printer output  
✅ Pre-populated from service orders  
✅ Manual data entry  
✅ Responsive design  
✅ Print history logging  
✅ Multiple printer support  
✅ Signature lines for approvals  

## 📞 Support

For issues or questions:
1. Check the full documentation: `ANVIL_JOB_ORDER_PRINT_FEATURE.md`
2. Review console errors (F12)
3. Test with sample data
4. Contact development team

---

**Last Updated**: January 22, 2026  
**Quick Reference Version**: 1.0
