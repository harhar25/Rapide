import React, { useState, useEffect, useRef } from 'react';
import PrinterSelector from './PrinterSelector';
import { printJobOrder } from '../services/printService';
import '../styles/anvil-picklist.css';

const AnvilPicklist = ({ partsRequest = null, onClose, onComplete } = {}) => {
  const [picklistData, setPicklistData] = useState({
    picklistNumber: '',
    requestDate: new Date().toISOString().split('T')[0],
    jobOrderNumber: '',
    customer: '',
    vehicle: '',
    priorityLevel: 'normal',
    requestedBy: '',
    items: [],
    status: 'pending',
    notes: ''
  });

  const [pickedItems, setPickedItems] = useState({});
  const [showPrinterSelector, setShowPrinterSelector] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const picklistRef = useRef(null);

  useEffect(() => {
    if (partsRequest) {
      setPicklistData(prev => ({
        ...prev,
        picklistNumber: partsRequest.picklistNumber || '',
        jobOrderNumber: partsRequest.jobOrderNumber || '',
        customer: partsRequest.customer || '',
        vehicle: partsRequest.vehicle || '',
        requestedBy: partsRequest.requestedBy || '',
        items: partsRequest.items || [],
        status: partsRequest.status || 'pending',
        notes: partsRequest.notes || ''
      }));
      
      // Initialize picked items tracking
      const initialPicked = {};
      (partsRequest.items || []).forEach(item => {
        initialPicked[item.id] = {
          quantity: 0,
          pickedQuantity: 0,
          location: '',
          notes: ''
        };
      });
      setPickedItems(initialPicked);
    }
  }, [partsRequest]);

  const handleItemPicked = (itemId, quantity) => {
    setPickedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        pickedQuantity: parseInt(quantity) || 0
      }
    }));
  };

  const handleLocationUpdate = (itemId, location) => {
    setPickedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        location: location
      }
    }));
  };

  const handleItemNotesUpdate = (itemId, notes) => {
    setPickedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        notes: notes
      }
    }));
  };

  const calculateCompleteness = () => {
    if (!picklistData.items.length) return 0;
    const complete = picklistData.items.filter(item => 
      pickedItems[item.id]?.pickedQuantity === item.quantity
    ).length;
    return Math.round((complete / picklistData.items.length) * 100);
  };

  const isPicklistComplete = () => {
    return picklistData.items.every(item => 
      pickedItems[item.id]?.pickedQuantity === item.quantity
    );
  };

  const generatePicklistHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Picklist - ${picklistData.picklistNumber}</title>
        <style>
          @media print {
            body { margin: 0; padding: 0; }
            .print-container { page-break-after: always; }
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            background: #f5f5f5;
            padding: 20px;
          }
          .print-container {
            max-width: 8.5in;
            height: 11in;
            background: white;
            margin: 0 auto;
            padding: 30px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            border: 1px solid #ddd;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #1a3a52;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #1a3a52;
            letter-spacing: 1px;
          }
          .company-tagline {
            font-size: 11px;
            color: #666;
            margin-top: 3px;
          }
          .picklist-number {
            text-align: right;
            font-size: 18px;
            font-weight: bold;
            color: #d9534f;
          }
          .picklist-date {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
          }
          .content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }
          .section {
            display: flex;
            flex-direction: column;
          }
          .section-title {
            font-size: 11px;
            font-weight: bold;
            color: white;
            background: #1a3a52;
            padding: 8px 12px;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-group {
            display: flex;
            flex-direction: column;
            margin-bottom: 10px;
          }
          .info-label {
            font-size: 9px;
            font-weight: 600;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 2px;
          }
          .info-value {
            font-size: 12px;
            color: #333;
            font-weight: 500;
            padding: 4px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .full-width {
            grid-column: 1 / -1;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 11px;
          }
          .items-table th {
            background: #f0f0f0;
            border: 1px solid #ddd;
            padding: 6px;
            text-align: left;
            font-weight: bold;
          }
          .items-table td {
            border: 1px solid #ddd;
            padding: 8px 6px;
          }
          .item-row {
            background: white;
          }
          .item-row:nth-child(even) {
            background: #fafafa;
          }
          .priority-high {
            background: #fff3cd !important;
            font-weight: bold;
          }
          .status-badge {
            display: inline-block;
            padding: 3px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: bold;
          }
          .status-complete {
            background: #5cb85c;
            color: white;
          }
          .status-partial {
            background: #f0ad4e;
            color: white;
          }
          .status-pending {
            background: #e0e0e0;
            color: #333;
          }
          .notes-section {
            margin-top: 15px;
            padding: 10px;
            background: #fafafa;
            border-left: 3px solid #1a3a52;
            font-size: 11px;
            min-height: 50px;
          }
          .footer {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            font-size: 11px;
          }
          .footer-section {
            text-align: center;
          }
          .footer-label {
            font-weight: 600;
            color: #666;
            margin-bottom: 20px;
            display: block;
          }
          .signature-line {
            border-top: 1px solid #000;
            padding-top: 5px;
          }
          .footer-info {
            font-size: 9px;
            color: #999;
            margin-top: 15px;
            text-align: center;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <div class="header">
            <div>
              <div class="company-name">⚒️ RAPIDE</div>
              <div class="company-tagline">Warehouse Parts Picklist</div>
            </div>
            <div>
              <div class="picklist-number">PL-${picklistData.picklistNumber}</div>
              <div class="picklist-date">${picklistData.requestDate}</div>
            </div>
          </div>

          <div class="content">
            <!-- Request Information -->
            <div class="section">
              <div class="section-title">Request Details</div>
              <div class="info-group">
                <div class="info-label">Job Order</div>
                <div class="info-value">JO-${picklistData.jobOrderNumber}</div>
              </div>
              <div class="info-group">
                <div class="info-label">Customer</div>
                <div class="info-value">${picklistData.customer}</div>
              </div>
              <div class="info-group">
                <div class="info-label">Vehicle</div>
                <div class="info-value">${picklistData.vehicle}</div>
              </div>
            </div>

            <!-- Request Metadata -->
            <div class="section">
              <div class="section-title">Picklist Information</div>
              <div class="info-group">
                <div class="info-label">Requested By</div>
                <div class="info-value">${picklistData.requestedBy}</div>
              </div>
              <div class="info-group">
                <div class="info-label">Priority</div>
                <div class="info-value">${picklistData.priorityLevel.toUpperCase()}</div>
              </div>
              <div class="info-group">
                <div class="info-label">Status</div>
                <div class="info-value">${picklistData.status.toUpperCase()}</div>
              </div>
            </div>

            <!-- Items Table -->
            <div class="section full-width">
              <div class="section-title">Items to Pick</div>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Item #</th>
                    <th>Product Code</th>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Location</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${picklistData.items.map((item, idx) => {
                    const picked = pickedItems[item.id];
                    let status = 'PENDING';
                    if (picked?.pickedQuantity === item.quantity) status = 'COMPLETE';
                    else if (picked?.pickedQuantity > 0) status = 'PARTIAL';
                    
                    return `
                      <tr class="item-row ${picklistData.priorityLevel === 'high' ? 'priority-high' : ''}">
                        <td>${idx + 1}</td>
                        <td>${item.code}</td>
                        <td>${item.description}</td>
                        <td>${picked?.pickedQuantity || 0}/${item.quantity}</td>
                        <td>${picked?.location || '____'}</td>
                        <td><span class="status-badge status-${status.toLowerCase()}">${status}</span></td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- Notes -->
            ${picklistData.notes ? `
            <div class="section full-width">
              <div class="section-title">Special Notes</div>
              <div class="notes-section">${picklistData.notes}</div>
            </div>
            ` : ''}
          </div>

          <!-- Footer -->
          <div class="footer">
            <div class="footer-section">
              <span class="footer-label">Picked By</span>
              <div class="signature-line"></div>
            </div>
            <div class="footer-section">
              <span class="footer-label">Verified By</span>
              <div class="signature-line"></div>
            </div>
          </div>

          <div class="footer-info">
            Rapide Warehouse Management System | Picklist Generated: ${new Date().toLocaleString()}
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrintClick = () => {
    setShowPrinterSelector(true);
  };

  const handlePrinterSelect = async (printer) => {
    setIsPrinting(true);
    try {
      const htmlContent = generatePicklistHTML();
      const logData = {
          service_order_id: picklistData.jobOrderNumber,
          document_type: 'picklist',
          printed_by: 'Technician/Warehouse',
          data: { picklistNumber: picklistData.picklistNumber }
      };
      await printJobOrder(htmlContent, printer.name, {}, logData);
      setShowPrinterSelector(false);
      alert('Picklist sent to printer successfully!');
    } catch (error) {
      console.error('Print error:', error);
      alert('Error printing picklist: ' + error.message);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleCompletePicklist = () => {
    if (onComplete) {
      const completedData = {
        picklistNumber: picklistData.picklistNumber,
        items: picklistData.items.map(item => ({
          ...item,
          pickedQuantity: pickedItems[item.id]?.pickedQuantity || 0,
          location: pickedItems[item.id]?.location || '',
          notes: pickedItems[item.id]?.notes || ''
        }))
      };
      onComplete(completedData);
    }
  };

  return (
    <div className="anvil-picklist-container">
      <div className="picklist-header">
        <h2>📦 Warehouse Picklist</h2>
        <div className="header-actions">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${calculateCompleteness()}%` }}></div>
            <span className="progress-text">{calculateCompleteness()}% Complete</span>
          </div>
          <button className="btn-preview" onClick={() => window.print()}>
            👁️ Preview
          </button>
          <button className="btn-print" onClick={handlePrintClick}>
            🖨️ Print
          </button>
          {onClose && (
            <button className="btn-close" onClick={onClose}>✕</button>
          )}
        </div>
      </div>

      <div className="picklist-content">
        <div className="picklist-info-section">
          <div className="info-cards">
            <div className="info-card">
              <span className="label">Picklist #</span>
              <span className="value">{picklistData.picklistNumber}</span>
            </div>
            <div className="info-card">
              <span className="label">Job Order</span>
              <span className="value">JO-{picklistData.jobOrderNumber}</span>
            </div>
            <div className="info-card">
              <span className="label">Customer</span>
              <span className="value">{picklistData.customer}</span>
            </div>
            <div className="info-card">
              <span className="label">Vehicle</span>
              <span className="value">{picklistData.vehicle}</span>
            </div>
            <div className="info-card">
              <span className="label">Priority</span>
              <span className={`value priority-${picklistData.priorityLevel}`}>
                {picklistData.priorityLevel.toUpperCase()}
              </span>
            </div>
            <div className="info-card">
              <span className="label">Status</span>
              <span className={`value status-${picklistData.status}`}>
                {picklistData.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="picklist-items">
          <h3>Items to Pick</h3>
          <div className="items-container">
            {picklistData.items.map((item) => {
              const picked = pickedItems[item.id];
              const isComplete = picked?.pickedQuantity === item.quantity;
              
              return (
                <div key={item.id} className={`pick-item ${isComplete ? 'complete' : ''}`}>
                  <div className="item-header">
                    <span className="item-code">{item.code}</span>
                    <span className={`qty-badge ${isComplete ? 'complete' : 'pending'}`}>
                      {picked?.pickedQuantity || 0}/{item.quantity}
                    </span>
                  </div>
                  
                  <div className="item-details">
                    <p className="item-name">{item.description}</p>
                    <p className="item-location">
                      Current Location: <strong>{item.location || 'N/A'}</strong>
                    </p>
                  </div>

                  <div className="item-controls">
                    <div className="control-group">
                      <label>Picked Quantity</label>
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={picked?.pickedQuantity || 0}
                        onChange={(e) => handleItemPicked(item.id, e.target.value)}
                        className="qty-input"
                      />
                    </div>

                    <div className="control-group">
                      <label>Bin Location</label>
                      <input
                        type="text"
                        placeholder="e.g., A-12-3"
                        value={picked?.location || ''}
                        onChange={(e) => handleLocationUpdate(item.id, e.target.value)}
                        className="location-input"
                      />
                    </div>

                    <div className="control-group">
                      <label>Notes</label>
                      <input
                        type="text"
                        placeholder="Additional notes..."
                        value={picked?.notes || ''}
                        onChange={(e) => handleItemNotesUpdate(item.id, e.target.value)}
                        className="notes-input"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="picklist-footer">
          <button 
            className="btn-complete"
            onClick={handleCompletePicklist}
            disabled={!isPicklistComplete()}
          >
            ✓ Ready for Release
          </button>
          <button 
            className="btn-print-action"
            onClick={handlePrintClick}
          >
            🖨️ Print Picklist
          </button>
        </div>
      </div>

      <PrinterSelector 
        isOpen={showPrinterSelector}
        onClose={() => setShowPrinterSelector(false)}
        onPrint={handlePrinterSelect}
        isLoading={isPrinting}
      />
    </div>
  );
};

export default AnvilPicklist;
