# Print Functions & Gatepass Process Tracking - Complete Implementation Guide

## Overview

This document describes the comprehensive enhancements made to the print functions and gatepass system to support:
1. **Advanced Printer Detection** - Detects printers on PC ports, network shares, and AirPrint-compatible devices
2. **Gatepass Process Tracking** - Displays complete service process history with status for each step
3. **Guard Gate Clearance** - Security gate personnel can see what processes have been completed, skipped, or not catered

---

## Part 1: Advanced Printer Detection System

### Features Implemented

#### 1.1 Printer Detection Service (`printerDetectionService.js`)

A new frontend service that provides comprehensive printer discovery across multiple connection types:

**Location:** `frontend/src/services/printerDetectionService.js`

**Available Functions:**

```javascript
// Detect all printers on local system (USB, LPT, COM)
detectLocalPrinters() → Promise<Array<Printer>>

// Detect network-shared printers (TCP/IP, LPD)
detectNetworkPrinters() → Promise<Array<Printer>>

// Discover AirPrint compatible printers (mDNS/Bonjour)
detectAirPrintPrinters() → Promise<Array<Printer>>

// Detect USB port printers specifically
detectUSBPrinters() → Promise<Array<Printer>>

// Comprehensive scan - combines all detection methods
detectAllPrinters() → Promise<Array<Printer>>

// Get specific printer status and capabilities
getPrinterStatus(printerName: string) → Promise<PrinterStatus>

// Get the default/preferred printer
getDefaultPrinter() → Promise<Printer|null>

// Validate printer is connected and ready
validatePrinterConnection(printerName: string) → Promise<boolean>
```

#### 1.2 Electron IPC Handlers (`src/main.js`)

Enhanced Electron main process with new IPC handlers:

```javascript
// get-printers - Get list of all available printers
ipcMain.handle('get-printers', async () => {...})

// print-document - Send document to specified printer
ipcMain.handle('print-document', async (event, options) => {...})

// discover-usb-printers - Find USB-connected printers
ipcMain.handle('discover-usb-printers', async () => {...})

// discover-network-printers - Find network printers on local network
ipcMain.handle('discover-network-printers', async () => {...})

// discover-airprint-printers - Find AirPrint devices via mDNS
ipcMain.handle('discover-airprint-printers', async () => {...})

// get-printer-status - Check if printer is online and ready
ipcMain.handle('get-printer-status', async (event, printerName) => {...})
```

#### 1.3 Preload Script Updates (`preload.js`)

Exposed APIs to React frontend:

```javascript
window.electronAPI.getPrinters()
window.electronAPI.print(options)
window.electronAPI.discoverUSBPrinters()
window.electronAPI.discoverNetworkPrinters()
window.electronAPI.discoverAirPrintPrinters()
window.electronAPI.getPrinterStatus(printerName)
```

### Supported Printer Types

| Printer Type | Connection | Protocol | Status |
|---|---|---|---|
| USB Printers | USB Port | USB Class Printer | ✅ Supported |
| Network Printers | TCP/IP | LPD/IPP (Port 515, 631) | ✅ Supported |
| AirPrint Printers | Wireless/Network | mDNS/Bonjour | ✅ Supported |
| LPT Printers | Parallel Port | Legacy LPT | ✅ Supported |
| COM Printers | Serial Port | Serial COM | ✅ Supported |
| Shared Network Printers | SMB/CIFS | Windows Sharing | ✅ Supported |

### Usage Example

```javascript
import { detectAllPrinters, getDefaultPrinter, validatePrinterConnection } from '@services/printerDetectionService';

// Find all available printers
const printers = await detectAllPrinters();
// Returns array with local, network, USB, and AirPrint printers

// Get the default printer
const defaultPrinter = await getDefaultPrinter();

// Validate printer is ready
const isReady = await validatePrinterConnection('HP LaserJet Pro');

// Print document
if (isReady) {
  await window.electronAPI.print({
    html: documentHTML,
    printerName: defaultPrinter.name,
    options: {
      printBackground: true,
      color: true
    }
  });
}
```

---

## Part 2: Gatepass Process Tracking System

### 2.1 Backend Service (`gatepass_service.py`)

New methods added to `GatepassService` class:

#### `get_service_order_process_status(service_order_id)`

Retrieves complete process history for a service order:

```python
def get_service_order_process_status(self, service_order_id):
    """
    Returns:
    {
        'success': True,
        'service_order_id': 123,
        'customer_name': 'John Doe',
        'vehicle_plate_no': 'ABC-1234',
        'vehicle_model': 'Toyota Camry',
        'vehicle_color': 'Silver',
        'so_status': 'completed',
        'processes': [
            {
                'step': 1,
                'name': 'CRO - Appointment & Scheduling',
                'type': 'initial',
                'status': 'completed',
                'status_display': '✅ Completed',
                'icon': '✅'
            },
            ...
        ],
        'summary': {
            'total_steps': 12,
            'completed': 8,
            'in_progress': 2,
            'skipped': 1,
            'not_started': 1,
            'not_catered': 0,
            'progress_percentage': 67
        }
    }
    """
```

#### Process Status Values

| Status | Meaning | Display |
|---|---|---|
| `completed` | Process fully completed | ✅ Completed |
| `in_progress` | Process currently being executed | ⏳ In Progress |
| `not_started` | Process has not yet begun | ⭕ Not Started |
| `skipped` | Process not required for this service | ⏭️ Skipped |
| `not_catered` | Process requested but not performed | ⚠️ Not Catered |
| `pending` | Awaiting action | ⏳ Pending |

### 2.2 API Endpoints

#### Get Process Status
```
GET /api/gatepass/process-status/<service_order_id>

Response:
{
    "success": true,
    "service_order_id": 123,
    "customer_name": "John Doe",
    "processes": [
        {
            "step": 1,
            "name": "CRO - Appointment & Scheduling",
            "status": "completed",
            "status_display": "✅ Completed",
            "icon": "✅"
        },
        ...
    ],
    "summary": {
        "total_steps": 12,
        "completed": 8,
        "progress_percentage": 67
    }
}
```

#### Get Gatepass for Printing
```
GET /api/gatepass/print/<service_order_id>

Response:
{
    "success": true,
    "gatepass_number": "GP-20260128103045",
    "customer_name": "John Doe",
    "vehicle_plate_no": "ABC-1234",
    "processes": [...],
    "gatepass_signatures": {
        "cashier": true,
        "accounting": true,
        "warranty": false,
        "manager": true
    },
    "summary": {...}
}
```

### 2.3 Process Tracking Workflow

The system tracks 12 standard process steps:

```
Step 1:  CRO - Appointment & Scheduling
         ↓
Step 2:  Service Advisor - Customer Check-In
         ↓
Step 3:  Service Advisor - VRC & CIS Creation
         ↓
Step 4:  Job Controller - Technician Assignment
         ↓
Step 5:  Technician - Job Execution
         ↓
Step 6:  Foreman - QC Inspection
         ↓
Step 7:  Job Wrapup - Labor & Materials
         ↓
Step 8:  Car Jockey - Vehicle Movement
         ↓
Step 9:  Billing - Invoice Creation
         ↓
Step 10: Cashier - Payment Processing
         ↓
Step 11: Security Gate - Vehicle Release
         ↓
Step 12: Vehicle Handover - Final Delivery
```

### 2.4 Guard Gate Clearance Information

When printing gatepass at security gate, guards will see:

1. **Customer Information**
   - Customer Name
   - Vehicle Plate Number
   - Vehicle Model & Color
   - Service Order ID
   - Invoice Number & Total Amount

2. **Process Progress Summary**
   - Total Steps: 12
   - Completed: X steps
   - In Progress: X steps
   - Not Started: X steps
   - Skipped: X steps
   - Not Catered: X steps
   - Overall Progress: X%

3. **Detailed Process Table**
   - Each of 12 steps listed with status indicator
   - Step number, name, department, and current status
   - Color-coded badges for quick visual reference

4. **Approval Signatures**
   - Cashier: ✓ Signed / ○ Pending
   - Accounting: ✓ Signed / ○ Pending
   - Warranty: ✓ Signed / ○ Pending
   - Manager: ✓ Signed / ○ Pending

### 2.5 Frontend Component (`GatepassPrintTemplate.jsx`)

Print template component that formats gatepass data:

**Location:** `frontend/src/components/GatepassPrintTemplate.jsx`

**Features:**
- Professional print-ready layout (A4 format)
- Color-coded process status badges
- Progress bar with percentage
- Detailed process tracking table
- Signature verification status
- Print-optimized CSS

**Usage:**
```jsx
import GatepassPrintTemplate from '@components/GatepassPrintTemplate';

<GatepassPrintTemplate data={processData} />
```

---

## Part 3: Integration Guide

### 3.1 Using Advanced Printer Detection

#### In React Components:

```jsx
import { detectAllPrinters, getDefaultPrinter } from '@services/printerDetectionService';
import PrinterSelector from '@components/PrinterSelector';

function PrintingComponent() {
  const [showPrinterSelector, setShowPrinterSelector] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState(null);

  const handlePrint = async (printer) => {
    const result = await window.electronAPI.print({
      html: documentHTML,
      printerName: printer.name,
      options: { printBackground: true }
    });
    
    if (result.success) {
      alert('Document sent to printer!');
    }
  };

  return (
    <>
      <button onClick={() => setShowPrinterSelector(true)}>Print Document</button>
      
      <PrinterSelector
        isOpen={showPrinterSelector}
        onClose={() => setShowPrinterSelector(false)}
        onPrint={handlePrint}
      />
    </>
  );
}
```

### 3.2 Using Gatepass Process Tracking

#### In Security Gate Component:

```jsx
import GatepassPrintTemplate from '@components/GatepassPrintTemplate';

function SecurityGateDashboard() {
  const [gatepassData, setGatepassData] = useState(null);

  const loadGatepassForPrinting = async (serviceOrderId) => {
    const res = await fetch(`/api/gatepass/print/${serviceOrderId}`);
    const data = await res.json();
    setGatepassData(data);
  };

  const handlePrintGatepass = async () => {
    if (!gatepassData) return;
    
    const printWindow = window.open('', '', 'width=900,height=1200');
    printWindow.document.write(`
      <html>
        <head>
          <link rel="stylesheet" href="/styles/gatepass-print.css">
        </head>
        <body>
          <div id="root"></div>
          <script>
            const data = ${JSON.stringify(gatepassData)};
            // Render GatepassPrintTemplate here
          </script>
        </body>
      </html>
    `);
    printWindow.print();
  };

  return (
    <div>
      <button onClick={() => loadGatepassForPrinting(serviceOrderId)}>
        Load Gatepass
      </button>
      
      {gatepassData && (
        <>
          <GatepassPrintTemplate data={gatepassData} />
          <button onClick={handlePrintGatepass}>Print Gatepass</button>
        </>
      )}
    </div>
  );
}
```

### 3.3 Backend Integration

#### In Flask Routes:

```python
from app.services.gatepass_service import gatepass_service

# Add to existing routes
@app.route('/api/gatepass/process-status/<int:service_order_id>', methods=['GET'])
def get_process_status(service_order_id):
    result = gatepass_service.get_service_order_process_status(service_order_id)
    return jsonify(result)

@app.route('/api/gatepass/print/<int:service_order_id>', methods=['GET'])
def get_gatepass_for_printing(service_order_id):
    # Implementation in gatepass_routes.py
    ...
```

---

## Part 4: Database Dependencies

### Tables Used for Process Tracking

| Process Step | Table | Key Fields |
|---|---|---|
| CRO Appointment | `scheduling_orders` | `service_order_id`, `created_at` |
| SA Check-In | `customer_info_sheets` | `service_order_id`, `created_at` |
| VRC Creation | `vehicle_report_cards` | `service_order_id`, `created_at` |
| Job Assignment | `job_assignments` | `service_order_id`, `assignment_status` |
| Tech Job | `job_assignments` | `service_order_id`, `job_status` |
| QC Inspection | `qc_inspections` | `service_order_id`, `inspection_status` |
| Job Wrapup | `job_wrapups` | `service_order_id`, `status` |
| Vehicle Movement | `vehicle_movements` | `service_order_id`, `movement_status` |
| Billing | `invoices` | `service_order_id`, `status` |
| Payment | `daily_transactions` | `service_order_id` |
| Gate Release | `gate_access_logs` | `service_order_id`, `access_type = 'exit'` |
| Handover | `vehicle_handovers` | `service_order_id`, `status` |

---

## Part 5: Testing Guide

### 5.1 Test Printer Detection

```javascript
// In browser console
(async () => {
  // Test 1: Get all printers
  const printers = await window.electronAPI.getPrinters();
  console.log('Local Printers:', printers);
  
  // Test 2: Get USB printers
  const usbPrinters = await window.electronAPI.discoverUSBPrinters();
  console.log('USB Printers:', usbPrinters);
  
  // Test 3: Get network printers
  const networkPrinters = await window.electronAPI.discoverNetworkPrinters();
  console.log('Network Printers:', networkPrinters);
  
  // Test 4: Get AirPrint printers
  const airPrintPrinters = await window.electronAPI.discoverAirPrintPrinters();
  console.log('AirPrint Printers:', airPrintPrinters);
  
  // Test 5: Check printer status
  if (printers.length > 0) {
    const status = await window.electronAPI.getPrinterStatus(printers[0].name);
    console.log('Printer Status:', status);
  }
})();
```

### 5.2 Test Gatepass Process Tracking

```bash
# Get process status for SO #123
curl http://localhost:5000/api/gatepass/process-status/123

# Expected response:
{
  "success": true,
  "service_order_id": 123,
  "processes": [
    {
      "step": 1,
      "name": "CRO - Appointment & Scheduling",
      "status": "completed",
      "icon": "✅"
    },
    ...
  ],
  "summary": {
    "total_steps": 12,
    "completed": 8,
    "progress_percentage": 67
  }
}
```

### 5.3 Test Gatepass Printing

```bash
# Get gatepass data for printing
curl http://localhost:5000/api/gatepass/print/123

# Response includes process history and signature status
```

---

## Part 6: Troubleshooting

### Issue: No Printers Detected

**Solution:**
1. Ensure printers are properly installed on Windows
2. Check printer power and connectivity
3. Verify USB cables or network connection
4. Restart the application
5. In Windows: Settings → Devices → Printers & Scanners → Refresh

### Issue: Network Printers Not Found

**Solution:**
1. Verify network printer is on same network as PC
2. Ensure printer is not in sleep mode
3. Check if printer supports mDNS/Bonjour
4. For Windows printers: Ensure network discovery is enabled
5. Check firewall settings allow printer discovery

### Issue: Process Status Shows "Not Catered"

**Solution:**
1. Check if required database tables exist and have data
2. Verify service order has progressed through workflows
3. Check database query logs for errors
4. Ensure service order ID is correct

### Issue: Gatepass Won't Print

**Solution:**
1. Verify printer is selected and online
2. Check page formatting and margins
3. Ensure print settings are correct
4. Try different printer if available
5. Check browser console for JavaScript errors

---

## Part 7: Future Enhancements

### Planned Features

1. **Printer Queue Management**
   - Track print jobs
   - Cancel/retry failed prints
   - Print history logging

2. **Advanced Process Tracking**
   - Real-time process notifications
   - Process timeline visualization
   - Service workflow optimization analytics

3. **Mobile AirPrint Support**
   - iPad/iPhone printing integration
   - QR code print scheduling
   - Mobile gatepass verification

4. **Cloud Print Support**
   - Google Cloud Print integration
   - Web-based printer management
   - Distributed facility printing

5. **Barcode/QR Integration**
   - Gatepass QR code generation
   - Process step barcode scanning
   - IoT printer integration

---

## Support & Maintenance

For issues or enhancements:
1. Review logs in browser DevTools (F12)
2. Check backend logs in `/backend/logs/`
3. Verify database connectivity
4. Test printer connectivity at OS level
5. Contact system administrator for network printer configuration

---

**Last Updated:** January 28, 2026
**Version:** 1.0
**Status:** ✅ Production Ready
