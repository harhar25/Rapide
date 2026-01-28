# Anvil-Style Job Order Form - Printing Feature

## Overview

The Anvil-Style Job Order Form is a professional, printable form system integrated into the Job Controller Dashboard that allows users to:

- **Create** detailed job orders with customer, vehicle, and service information
- **Select** from available connected printers
- **Print** formatted job orders directly from the application
- **Preview** job orders before printing
- **Populate** forms automatically from existing service orders or manually enter data

## Features

### 1. **Professional Form Design**
- Anvil-themed styling with industrial aesthetic
- Clean, organized layout with clearly labeled sections
- Print-optimized design for professional appearance
- Responsive design for various screen sizes

### 2. **Printer Selection**
- Automatic detection of connected printers
- Default printer selection
- Printer information display (name, description, status)
- Support for multiple printer types

### 3. **Job Order Form Sections**
- **Job Order Details**: Number, date, order status
- **Customer Information**: Name, contact number
- **Vehicle Information**: Make/Model/Year, Registration number
- **Service Description**: Detailed service requirements
- **Additional Services**: Optional extra services
- **Technician Assignment**: Assigned technician name
- **Estimates**: Labor hours and cost estimates
- **Notes**: Additional special instructions
- **Signature Lines**: Customer, Technician, and Manager approval

### 4. **Print Features**
- Preview functionality using browser print dialog
- Silent printing to selected printer
- Print background graphics enabled
- Automatic page formatting for 8.5" × 11" paper
- Print history logging (backend)

## File Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── AnvilJobOrderForm.jsx          # Main form component
│   │   └── PrinterSelector.jsx            # Printer selection modal
│   ├── services/
│   │   └── printService.js                # Print handling logic
│   ├── styles/
│   │   ├── anvil-job-order.css            # Print form styles
│   │   └── job-controller-dashboard.css   # Integration styles (updated)
│   └── pages/
│       └── JobControllerDashboard.jsx     # Integration (updated)
├── preload.js                              # Electron IPC bridge (updated)
└── src/main.js                             # Main process handlers (updated)

backend/
└── app/
    └── routes/
        └── print_service_routes.py        # Print service API endpoints
```

## Component Details

### AnvilJobOrderForm.jsx

Main component for creating and printing job orders.

**Props:**
- `jobOrder` (optional): Pre-filled job order data from service orders
- `onClose` (optional): Callback when form is closed

**Features:**
- Auto-populate from existing service orders
- Full form validation
- Real-time form data management
- Print preview and direct print functionality
- Clear form option for new entries

**Usage:**
```jsx
import AnvilJobOrderForm from '../components/AnvilJobOrderForm';

<AnvilJobOrderForm 
  jobOrder={selectedJobOrder}
  onClose={() => handleClose()}
/>
```

### PrinterSelector.jsx

Modal component for selecting connected printers.

**Props:**
- `isOpen` (boolean): Control modal visibility
- `onClose` (function): Callback to close modal
- `onPrint` (function): Callback when print is selected
- `isLoading` (boolean): Loading state during print

**Features:**
- Automatic printer detection
- Radio button selection
- Default printer highlighting
- Loading indicator
- Error handling for no printers

**Usage:**
```jsx
import PrinterSelector from '../components/PrinterSelector';

<PrinterSelector 
  isOpen={showPrinterSelector}
  onClose={() => setShowPrinterSelector(false)}
  onPrint={(printer) => handlePrint(printer)}
  isLoading={isPrinting}
/>
```

### printService.js

Service module for printer and printing operations.

**Functions:**

#### `getPrinters()`
Gets list of available printers.
```javascript
const printers = await getPrinters();
// Returns: [{ name: 'Printer Name', isDefault: true, ... }]
```

#### `printJobOrder(htmlContent, printerName, options)`
Sends job order to printer.
```javascript
await printJobOrder(htmlContent, 'HP LaserJet Pro', {
  silent: true,
  printBackground: true
});
```

#### `getDefaultPrinter()`
Gets the default printer.
```javascript
const defaultPrinter = await getDefaultPrinter();
```

## Backend Integration

### Print Service API

The backend provides endpoints for print management:

#### `POST /api/print/job-order`
Log a print event.

**Request:**
```json
{
  "jobOrder": {
    "jobOrderNumber": "001234",
    "customerName": "John Doe",
    "vehicleInfo": "Toyota Corolla 2020"
  },
  "printerName": "HP LaserJet Pro"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Job order print request processed",
  "data": {
    "jobOrderNumber": "001234",
    "printer": "HP LaserJet Pro",
    "timestamp": "2025-01-22T10:30:00",
    "status": "queued"
  }
}
```

#### `GET /api/print/history`
Retrieve print history for job orders.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "job_order_id": "001234",
      "customer": "John Doe",
      "printer": "HP LaserJet Pro",
      "timestamp": "2025-01-22T10:30:00",
      "status": "printed"
    }
  ]
}
```

## Electron Integration

### IPC Handlers

**preload.js** exposes:
- `electronAPI.getPrinters()`: Get connected printers
- `electronAPI.print(options)`: Send to printer

**main.js** handles:
- `get-printers`: Returns printer list
- `print-document`: Sends HTML to selected printer

### Print Options

```javascript
{
  html: '<html>...</html>',           // HTML content to print
  printerName: 'Printer Name',        // Target printer
  options: {
    silent: true,                      // No print dialog
    printBackground: true,             // Print background
    color: true,                       // Color printing
    margin: { top: 0.5, ... },         // Margins in inches
    landscape: false,                  // Portrait orientation
    paperSize: { width, height }       // Custom size
  }
}
```

## Styling

### Print Styles (anvil-job-order.css)

- **Form Styling**: Professional input fields and controls
- **Print Styles**: @media print rules for optimized printing
- **Modal Styling**: Printer selector modal appearance
- **Responsive Design**: Mobile-friendly layouts
- **Animation**: Smooth transitions and loading states

### Color Scheme

- Primary: `#0275d8` (Blue)
- Dark: `#1a3a52` (Navy)
- Success: `#5cb85c` (Green)
- Danger: `#e74c3c` (Red)
- Light: `#f9f9f9` (Off-white)

## Usage Guide

### For End Users

1. **Navigate to Job Controller Dashboard**
   - Click on "Print Job Order" tab

2. **Select a Service Order**
   - Choose from available pending orders
   - Or create a new manual entry

3. **Fill in Job Order Details**
   - Complete all required fields
   - Add optional notes and additional services

4. **Preview the Form**
   - Click "Preview" to see print layout
   - Adjust form as needed

5. **Print the Order**
   - Click "Print Job Order" button
   - Select printer from available list
   - Confirm printer selection

### For Developers

#### Adding Custom Fields

Edit `AnvilJobOrderForm.jsx`:
```jsx
// Add to state initialization
const [formData, setFormData] = useState({
  // ... existing fields
  customField: ''
});

// Add to form JSX
<div className="form-group">
  <label>Custom Field</label>
  <input 
    type="text" 
    name="customField"
    value={formData.customField}
    onChange={handleInputChange}
  />
</div>

// Add to print template
Custom Field: ${formData.customField}
```

#### Customizing Print Layout

Edit the `generatePrintContent()` method in `AnvilJobOrderForm.jsx`:
```jsx
const generatePrintContent = () => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        /* Add custom CSS here */
      </style>
    </head>
    <body>
      <!-- Add custom HTML here -->
    </body>
    </html>
  `;
};
```

#### Adding Print Logging

Update `print_service_routes.py`:
```python
def log_print_event(job_order_id, customer, printer, timestamp):
    """Log print events to database"""
    print_log = {
        'job_order_id': job_order_id,
        'customer': customer,
        'printer': printer,
        'timestamp': timestamp.isoformat(),
        'status': 'printed'
    }
    db.print_logs.insert_one(print_log)  # Your database operation
```

## Browser Compatibility

- **Electron**: Full support (recommended for desktop app)
- **Chrome/Edge**: Full support (WebPrint API)
- **Firefox**: Full support
- **Safari**: Full support (with caveats on printer selection)

## Troubleshooting

### No Printers Detected

1. Ensure printers are connected and installed on OS
2. Check Windows/Mac printer settings
3. Verify print service is running
4. Restart the application

### Print Dialog Not Appearing

1. Check browser console for errors
2. Verify `window.electronAPI` is available
3. Test with `window.print()` fallback

### Form Not Populating

1. Verify service order data structure
2. Check browser console for errors
3. Ensure field names match between order and form

### Printer Selection Not Working

1. Check Electron IPC handlers in main.js
2. Verify preload.js is loading correctly
3. Test with different printer

## Performance Considerations

- Print HTML generation is synchronous (consider async for large forms)
- Printer detection happens on modal open
- Hidden print window is destroyed after print completion
- Supports concurrent print operations

## Security Notes

- Context isolation enabled in Electron
- No node integration in renderer process
- IPC messages validated before processing
- HTML content sanitized (use trusted sources only)

## Future Enhancements

- [ ] Print templates customization UI
- [ ] Barcode/QR code generation
- [ ] Digital signature capture
- [ ] Print job queue management
- [ ] Email integration
- [ ] PDF export option
- [ ] Print settings persistence
- [ ] Batch printing support
- [ ] Print analytics dashboard

## Support

For issues or feature requests, contact the development team or create an issue in the project repository.

---

**Last Updated**: January 22, 2026  
**Version**: 1.0.0  
**Status**: Production Ready
