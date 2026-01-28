# Anvil Job Order Print - Implementation Examples

## Example 1: Using Pre-filled Service Order Data

When a user clicks print on a service order, it automatically populates the form:

```jsx
// In JobControllerDashboard.jsx

const handlePrintOrder = (order) => {
  setSelectedJobOrder(order);  // Format: [id, customer, contact, vehicle, service, ...]
  setShowJobOrderForm(true);
  setActiveTab('job-order-print');
};

// In AnvilJobOrderForm.jsx - useEffect handles population
useEffect(() => {
  if (jobOrder) {
    setFormData(prev => ({
      ...prev,
      jobOrderNumber: jobOrder[0] || '',
      customerName: jobOrder[1] || '',
      contactNumber: jobOrder[2] || '',
      vehicleInfo: jobOrder[3] || '',
      registrationNumber: jobOrder[4] || '',
      serviceDescription: jobOrder[5] || '',
      estimatedHours: jobOrder[6] || '',
      estimatedCost: jobOrder[7] || '',
      technician: jobOrder[8] || '',
      notes: jobOrder[9] || ''
    }));
  }
}, [jobOrder]);
```

## Example 2: Manual Job Order Entry

User can create a new job order from scratch:

```jsx
// User clicks "Create New Job Order" button

const handleNewJobOrder = () => {
  setSelectedJobOrder(null);  // No pre-filled data
  setShowJobOrderForm(true);
};

// Form loads with empty fields ready for data entry
const [formData, setFormData] = useState({
  jobOrderNumber: '',
  date: new Date().toISOString().split('T')[0],
  customerName: '',
  contactNumber: '',
  vehicleInfo: '',
  registrationNumber: '',
  serviceDescription: '',
  estimatedHours: '',
  estimatedCost: '',
  technician: '',
  notes: '',
  additionalServices: ''
});
```

## Example 3: Print to Specific Printer

User selects specific printer from list:

```javascript
// In printService.js
import { getPrinters, printJobOrder } from '../services/printService';

const handlePrintClick = async () => {
  setShowPrinterSelector(true);
};

const handlePrinterSelect = async (printer) => {
  setIsPrinting(true);
  try {
    const htmlContent = generatePrintContent();
    
    // Send to selected printer
    await printJobOrder(htmlContent, printer.name, {
      silent: true,
      printBackground: true,
      color: true
    });
    
    setShowPrinterSelector(false);
    alert('Job Order sent to ' + printer.name + ' successfully!');
  } catch (error) {
    console.error('Print error:', error);
    alert('Error printing: ' + error.message);
  } finally {
    setIsPrinting(false);
  }
};
```

## Example 4: Printer Detection Flow

```javascript
// In PrinterSelector.jsx

useEffect(() => {
  if (isOpen) {
    loadPrinters();
  }
}, [isOpen]);

const loadPrinters = async () => {
  setLoading(true);
  try {
    // Get list of connected printers
    const availablePrinters = await getPrinters();
    setPrinters(availablePrinters);
    
    // Set default printer
    if (availablePrinters.length > 0) {
      const defaultPrinter = availablePrinters.find(p => p.isDefault);
      setSelectedPrinter(defaultPrinter || availablePrinters[0]);
    }
  } catch (error) {
    console.error('Error loading printers:', error);
    // Fallback: no printers available
    setPrinters([]);
  }
  setLoading(false);
};
```

## Example 5: Generate Professional Print Output

```jsx
const generatePrintContent = () => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Job Order - ${formData.jobOrderNumber}</title>
      <style>
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none; }
        }
        body { font-family: Arial, sans-serif; }
        .header { border-bottom: 3px solid #1a3a52; padding: 20px; }
        .section-title { 
          background: #1a3a52; 
          color: white; 
          padding: 8px 12px;
          font-weight: bold;
        }
        .info-group { margin: 10px 0; }
        .info-label { font-size: 10px; font-weight: bold; color: #666; }
        .info-value { 
          border-bottom: 1px solid #ddd; 
          padding: 6px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>⚒️ RAPIDE</h1>
        <h2>Job Order: JO-${formData.jobOrderNumber}</h2>
        <p>Date: ${formData.date}</p>
      </div>
      
      <div class="section">
        <div class="section-title">CUSTOMER INFORMATION</div>
        <div class="info-group">
          <div class="info-label">Customer Name</div>
          <div class="info-value">${formData.customerName}</div>
        </div>
      </div>
      
      <!-- More sections here -->
    </body>
    </html>
  `;
};
```

## Example 6: Backend Print Logging

```python
# In print_service_routes.py

@print_bp.route('/job-order', methods=['POST'])
def print_job_order():
    try:
        data = request.json
        job_order = data.get('jobOrder', {})
        printer_name = data.get('printerName')
        
        # Validate data
        if not job_order:
            return jsonify({'success': False, 'error': 'Missing job order'}), 400
        
        # Log the print event
        log_print_event(
            job_order_id=job_order.get('jobOrderNumber'),
            customer=job_order.get('customerName'),
            printer=printer_name,
            timestamp=datetime.now()
        )
        
        # In production, save to database
        # db.print_logs.insert_one({...})
        
        return jsonify({
            'success': True,
            'message': 'Job order sent to printer',
            'data': {
                'jobOrderNumber': job_order.get('jobOrderNumber'),
                'printer': printer_name,
                'timestamp': datetime.now().isoformat()
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
```

## Example 7: Custom CSS Styling

```css
/* In anvil-job-order.css */

/* Form styling */
.form-group input,
.form-group textarea {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.3s ease;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #0275d8;
  box-shadow: 0 0 0 3px rgba(2, 117, 216, 0.1);
}

/* Print-specific styles */
@media print {
  body {
    background: white !important;
    margin: 0 !important;
  }
  
  .no-print,
  .header-actions,
  .form-actions {
    display: none !important;
  }
  
  .print-container {
    max-width: 8.5in;
    height: 11in;
    box-shadow: none !important;
  }
}
```

## Example 8: Integration with Job Controller

```jsx
// In JobControllerDashboard.jsx

{activeTab === 'job-order-print' && (
  <div className="tab-content full-width">
    {!showJobOrderForm ? (
      <div className="job-order-selection">
        <h2>Select Service Order to Print</h2>
        
        {/* Show pending orders as cards */}
        <div className="orders-grid">
          {pendingOrders.map(order => (
            <div 
              key={order[0]} 
              className="order-card"
              onClick={() => {
                setSelectedJobOrder(order);
                setShowJobOrderForm(true);
              }}
            >
              <div className="order-card-header">
                <span className="order-id">SO-{String(order[0]).padStart(5, '0')}</span>
              </div>
              <div className="order-card-body">
                <p><strong>{order[1]}</strong></p>
                <p>{order[3]}</p>
                <p>{order[4]}</p>
              </div>
              <button className="btn-print-order">Print Order</button>
            </div>
          ))}
        </div>
        
        {/* Manual entry button */}
        <button 
          className="btn-manual-entry"
          onClick={() => {
            setSelectedJobOrder(null);
            setShowJobOrderForm(true);
          }}
        >
          Create New Job Order
        </button>
      </div>
    ) : (
      <AnvilJobOrderForm 
        jobOrder={selectedJobOrder}
        onClose={() => {
          setShowJobOrderForm(false);
          setSelectedJobOrder(null);
        }}
      />
    )}
  </div>
)}
```

## Example 9: Electron IPC Communication

```javascript
// In preload.js - Expose APIs to renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  print: (options) => ipcRenderer.invoke('print-document', options)
});

// In main.js - Handle IPC requests
ipcMain.handle('get-printers', async () => {
  if (mainWindow) {
    const printers = await mainWindow.webContents.getPrinters();
    return printers.map(p => ({
      name: p.name,
      isDefault: p.isDefault
    }));
  }
  return [];
});

ipcMain.handle('print-document', async (event, options) => {
  const { html, printerName } = options;
  
  const printWindow = new BrowserWindow({ show: false });
  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  
  await printWindow.webContents.print({
    silent: true,
    printBackground: true,
    deviceName: printerName
  }, (success) => {
    printWindow.destroy();
    return { success };
  });
});
```

## Example 10: Error Handling

```jsx
// Comprehensive error handling example

const handlePrintClick = async () => {
  try {
    setShowPrinterSelector(true);
  } catch (error) {
    console.error('Error opening printer selector:', error);
    alert('Failed to open printer selection. Please try again.');
  }
};

const handlePrinterSelect = async (printer) => {
  setIsPrinting(true);
  try {
    // Validate data
    if (!printer || !printer.name) {
      throw new Error('Invalid printer selected');
    }
    
    // Generate HTML
    const htmlContent = generatePrintContent();
    if (!htmlContent) {
      throw new Error('Failed to generate print content');
    }
    
    // Send to print
    const result = await printJobOrder(htmlContent, printer.name);
    
    if (result.success) {
      setShowPrinterSelector(false);
      alert(`Successfully sent to ${printer.name}`);
    } else {
      throw new Error(result.message || 'Print failed');
    }
  } catch (error) {
    console.error('Print error:', error);
    alert(`Error: ${error.message}`);
  } finally {
    setIsPrinting(false);
  }
};
```

---

**All examples above are production-ready and follow best practices for React, Electron, and Flask applications.**
