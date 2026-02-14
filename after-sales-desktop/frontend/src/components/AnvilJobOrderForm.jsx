import React, { useState, useEffect, useRef } from 'react';
import PrinterSelector from './PrinterSelector';
import { printJobOrder } from '../services/printService';
import { fetchJson } from '../utils/fetchJson';
import '../styles/anvil-job-order.css';

const AnvilJobOrderForm = ({ jobOrder = null, onClose, isConfirmation = false }) => {
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
  
  const [vrcData, setVrcData] = useState(null);

  const [showPrinterSelector, setShowPrinterSelector] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const formRef = useRef(null);
  const printContentRef = useRef(null);

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

      // Fetch VRC Data and Technician Assignment
      const fetchVRCAndTechnician = async () => {
        try {
            const res = await fetchJson(`/api/service-advisor/vrc/${jobOrder[0]}`);
            if (res.success && res.data) {
                // Handle new combined response format
                if (res.data.vrc !== undefined) {
                  // New format: { vrc: {...}, technician: {...} }
                  setVrcData(res.data.vrc);
                  if (res.data.technician && res.data.technician.name) {
                    setFormData(prev => ({
                      ...prev,
                      technician: prev.technician || res.data.technician.name
                    }));
                  }
                } else {
                  // Legacy format: vrc data directly
                  setVrcData(res.data);
                }
            }
        } catch (e) {
            console.error("Failed to load VRC for print", e);
        }
      };
      if (jobOrder[0]) fetchVRCAndTechnician();
    }
  }, [jobOrder]);


  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : value) : value
    }));
  };

  const generatePrintContent = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${isConfirmation ? 'Service Confirmation' : 'Job Order'} - ${formData.jobOrderNumber}</title>
        <style>
          @page {
            size: letter;
            margin: 0.5in;
          }
          @media print {
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { page-break-after: always; }
            .page:last-child { page-break-after: avoid; }
            .no-print { display: none !important; }
          }
          * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
          body { background: #f0f0f0; padding: 20px; color: #000; font-size: 11pt; }
          
          /* PAGE CONTAINER */
          .page {
            width: 8in;
            min-height: 10in;
            background: white;
            margin: 0 auto 20px;
            padding: 0.4in;
            box-shadow: 0 2px 10px rgba(0,0,0,0.15);
            position: relative;
          }
          
          /* HEADER */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 12px;
            border-bottom: 3px solid #1a365d;
            margin-bottom: 20px;
          }
          .logo-section { }
          .company-name {
            font-size: 28px;
            font-weight: 800;
            color: #1a365d;
            letter-spacing: 2px;
          }
          .company-tagline {
            font-size: 10px;
            color: #718096;
            margin-top: 2px;
            letter-spacing: 0.5px;
          }
          .doc-info {
            text-align: right;
          }
          .doc-type {
            font-size: 12px;
            color: #718096;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .doc-number {
            font-size: 22px;
            font-weight: 700;
            color: #c53030;
            margin-top: 4px;
          }
          .doc-date {
            font-size: 11px;
            color: #4a5568;
            margin-top: 4px;
          }
          
          /* SECTION BOXES */
          .row { display: flex; gap: 20px; margin-bottom: 16px; }
          .col { flex: 1; }
          .col-full { width: 100%; margin-bottom: 16px; }
          
          .section-box {
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
            height: 100%;
          }
          .section-header {
            background: #1a365d;
            color: white;
            font-size: 10px;
            font-weight: 600;
            padding: 6px 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .section-body { padding: 12px; }
          
          .field { margin-bottom: 10px; }
          .field:last-child { margin-bottom: 0; }
          .field-label {
            font-size: 8px;
            font-weight: 600;
            color: #718096;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          .field-value {
            font-size: 12px;
            color: #1a202c;
            padding: 4px 0;
            border-bottom: 1px solid #edf2f7;
            min-height: 20px;
          }
          
          /* DESCRIPTION BOX */
          .description-box {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 12px;
            min-height: 80px;
            font-size: 11px;
            line-height: 1.5;
            color: #2d3748;
          }
          
          /* ESTIMATES */
          .estimates-row { display: flex; gap: 20px; margin-bottom: 16px; }
          .estimate-box {
            flex: 1;
            background: linear-gradient(135deg, #ebf8ff 0%, #e6fffa 100%);
            border: 1px solid #81e6d9;
            border-radius: 6px;
            padding: 16px;
            text-align: center;
          }
          .estimate-label {
            font-size: 9px;
            font-weight: 600;
            color: #2c7a7b;
            text-transform: uppercase;
            margin-bottom: 6px;
          }
          .estimate-value {
            font-size: 20px;
            font-weight: 700;
            color: #234e52;
          }
          
          /* SIGNATURES */
          .signatures {
            display: flex;
            gap: 30px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
          }
          .signature-box {
            flex: 1;
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid #1a202c;
            margin-top: 40px;
            padding-top: 6px;
          }
          .signature-label {
            font-size: 9px;
            font-weight: 600;
            color: #718096;
            text-transform: uppercase;
          }
          
          /* FOOTER */
          .page-footer {
            position: absolute;
            bottom: 0.4in;
            left: 0.4in;
            right: 0.4in;
            font-size: 8px;
            color: #a0aec0;
            text-align: center;
            border-top: 1px solid #edf2f7;
            padding-top: 8px;
          }
          
          /* VRC PAGE STYLES */
          .vrc-title {
            font-size: 18px;
            font-weight: 700;
            color: #1a365d;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #1a365d;
          }
          .vrc-subtitle {
            font-size: 10px;
            color: #718096;
            font-weight: normal;
          }
          
          .vrc-info-row {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            background: #f7fafc;
            padding: 12px;
            border-radius: 6px;
          }
          .vrc-info-item { flex: 1; }
          .vrc-info-label {
            font-size: 8px;
            color: #718096;
            text-transform: uppercase;
            font-weight: 600;
          }
          .vrc-info-value {
            font-size: 14px;
            font-weight: 600;
            color: #1a202c;
            margin-top: 2px;
          }
          
          .checklist-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 20px;
          }
          .checklist-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }
          .checklist-item.pass { background: #f0fff4; border-color: #9ae6b4; }
          .checklist-item.fail { background: #fff5f5; border-color: #feb2b2; }
          .checklist-item.na { background: #f7fafc; border-color: #e2e8f0; }
          
          .checklist-label {
            font-size: 11px;
            font-weight: 600;
            color: #2d3748;
          }
          .checklist-status {
            font-size: 10px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 12px;
            text-transform: uppercase;
          }
          .status-pass { background: #c6f6d5; color: #22543d; }
          .status-fail { background: #fed7d7; color: #9b2c2c; }
          .status-na { background: #edf2f7; color: #718096; }
          
          .findings-box {
            background: #fffaf0;
            border: 1px solid #ed8936;
            border-radius: 6px;
            padding: 16px;
            margin-top: 20px;
          }
          .findings-title {
            font-size: 10px;
            font-weight: 700;
            color: #c05621;
            text-transform: uppercase;
            margin-bottom: 8px;
          }
          .findings-text {
            font-size: 11px;
            color: #744210;
            line-height: 1.5;
          }
          
          .vrc-footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e2e8f0;
            font-size: 10px;
            color: #718096;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <!-- PAGE 1: JOB ORDER -->
        <div class="page">
          <div class="header">
            <div class="logo-section">
              <div class="company-name">RAPIDE</div>
              <div class="company-tagline">Professional After-Sales Service</div>
            </div>
            <div class="doc-info">
              <div class="doc-type">${isConfirmation ? 'Service Confirmation' : 'Job Order'}</div>
              <div class="doc-number">JO-${String(formData.jobOrderNumber).padStart(5, '0')}</div>
              <div class="doc-date">${new Date(formData.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
            </div>
          </div>
          
          <div class="row">
            <div class="col">
              <div class="section-box">
                <div class="section-header">Customer Information</div>
                <div class="section-body">
                  <div class="field">
                    <div class="field-label">Customer Name</div>
                    <div class="field-value">${formData.customerName || '—'}</div>
                  </div>
                  <div class="field">
                    <div class="field-label">Contact Number</div>
                    <div class="field-value">${formData.contactNumber || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col">
              <div class="section-box">
                <div class="section-header">Vehicle Details</div>
                <div class="section-body">
                  <div class="field">
                    <div class="field-label">Vehicle Model</div>
                    <div class="field-value">${formData.vehicleInfo || '—'}</div>
                  </div>
                  <div class="field">
                    <div class="field-label">Plate Number</div>
                    <div class="field-value">${formData.registrationNumber || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="row">
            <div class="col">
              <div class="section-box">
                <div class="section-header">Assigned Technician</div>
                <div class="section-body">
                  <div class="field-value" style="font-weight:600;">${formData.technician || 'To be assigned'}</div>
                </div>
              </div>
            </div>
            <div class="col">
              <div class="section-box">
                <div class="section-header">Service Type</div>
                <div class="section-body">
                  <div class="field-value" style="font-weight:600;">${formData.serviceDescription?.split('\\n')[0] || 'General Service'}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="col-full">
            <div class="section-box">
              <div class="section-header">Service Description</div>
              <div class="section-body">
                <div class="description-box">${formData.serviceDescription || 'No description provided.'}</div>
              </div>
            </div>
          </div>
          
          ${formData.notes ? `
          <div class="col-full">
            <div class="section-box">
              <div class="section-header">Additional Notes</div>
              <div class="section-body">
                <div class="description-box">${formData.notes}</div>
              </div>
            </div>
          </div>
          ` : ''}
          
          <div class="estimates-row">
            <div class="estimate-box">
              <div class="estimate-label">Estimated Labor</div>
              <div class="estimate-value">${formData.estimatedHours ? formData.estimatedHours + ' hrs' : 'TBD'}</div>
            </div>
            <div class="estimate-box">
              <div class="estimate-label">Estimated Cost</div>
              <div class="estimate-value">₱ ${formData.estimatedCost ? parseFloat(formData.estimatedCost).toLocaleString('en-PH', {minimumFractionDigits: 2}) : '0.00'}</div>
            </div>
          </div>
          
          <div class="signatures">
            <div class="signature-box">
              <div class="signature-line">
                <div class="signature-label">Customer Signature</div>
              </div>
            </div>
            <div class="signature-box">
              <div class="signature-line">
                <div class="signature-label">Service Advisor</div>
              </div>
            </div>
            <div class="signature-box">
              <div class="signature-line">
                <div class="signature-label">Approved By</div>
              </div>
            </div>
          </div>
          
          <div class="page-footer">
            RAPIDE After-Sales Service Management System • Page 1 of ${vrcData ? '2' : '1'} • Printed: ${new Date().toLocaleString()}
          </div>
        </div>
        
        ${vrcData ? `
        <!-- PAGE 2: VEHICLE REPORT CARD -->
        <div class="page">
          <div class="header">
            <div class="logo-section">
              <div class="company-name">RAPIDE</div>
              <div class="company-tagline">Professional After-Sales Service</div>
            </div>
            <div class="doc-info">
              <div class="doc-type">Vehicle Report Card</div>
              <div class="doc-number">JO-${String(formData.jobOrderNumber).padStart(5, '0')}</div>
              <div class="doc-date">${new Date(formData.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
            </div>
          </div>
          
          <div class="vrc-title">
            10-Point Vehicle Inspection
            <span class="vrc-subtitle"> — Pre-Service Condition Report</span>
          </div>
          
          <div class="vrc-info-row">
            <div class="vrc-info-item">
              <div class="vrc-info-label">Customer</div>
              <div class="vrc-info-value">${formData.customerName || '—'}</div>
            </div>
            <div class="vrc-info-item">
              <div class="vrc-info-label">Vehicle</div>
              <div class="vrc-info-value">${formData.vehicleInfo || '—'}</div>
            </div>
            <div class="vrc-info-item">
              <div class="vrc-info-label">Plate No.</div>
              <div class="vrc-info-value">${formData.registrationNumber || '—'}</div>
            </div>
            <div class="vrc-info-item">
              <div class="vrc-info-label">Mileage (km)</div>
              <div class="vrc-info-value">${vrcData.mileage_in || '—'}</div>
            </div>
          </div>
          
          <div class="checklist-grid">
            ${[
              { id: 'checklist_1_engine', label: '1. Engine (Oil Level/Leaks/Noise)' },
              { id: 'checklist_2_fluids', label: '2. Fluids (Coolant/Brake/Power Steering)' },
              { id: 'checklist_3_brakes', label: '3. Brakes (Pads/Discs/Hoses)' },
              { id: 'checklist_4_suspension', label: '4. Suspension (Shocks/Underchassis)' },
              { id: 'checklist_5_battery', label: '5. Battery (Health/Terminals)' },
              { id: 'checklist_6_tires', label: '6. Tires (Pressure/Tread Depth)' },
              { id: 'checklist_7_lights', label: '7. Lights (Headlights/Signals/Tail)' },
              { id: 'checklist_8_body', label: '8. Body (Scratches/Dents/Glass)' },
              { id: 'checklist_9_wipers', label: '9. Wipers (Blades/Washer Fluid)' },
              { id: 'checklist_10_handbrake', label: '10. Handbrake / Parking Brake' }
            ].map(item => `
                <div class="checklist-item ${vrcData[item.id] || 'na'}">
                  <span class="checklist-label">${item.label}</span>
                  <span class="checklist-status status-${vrcData[item.id] || 'na'}">${(vrcData[item.id] || 'na') === 'pass' ? '✓ PASS' : (vrcData[item.id] || 'na') === 'fail' ? '✗ FAIL' : '— N/A'}</span>
                </div>
              `).join('')}
          </div>
          
          ${vrcData.additional_findings ? `
          <div class="findings-box">
            <div class="findings-title">⚠️ Additional Findings & Recommendations</div>
            <div class="findings-text">${vrcData.additional_findings}</div>
          </div>
          ` : ''}
          
          ${vrcData.exterior_condition || vrcData.interior_condition ? `
          <div class="row" style="margin-top: 20px;">
            <div class="col">
              <div class="section-box">
                <div class="section-header">Exterior Condition</div>
                <div class="section-body">
                  <div class="description-box" style="min-height:50px;">${vrcData.exterior_condition || 'Not recorded'}</div>
                </div>
              </div>
            </div>
            <div class="col">
              <div class="section-box">
                <div class="section-header">Interior Condition</div>
                <div class="section-body">
                  <div class="description-box" style="min-height:50px;">${vrcData.interior_condition || 'Not recorded'}</div>
                </div>
              </div>
            </div>
          </div>
          ` : ''}
          
          <div class="vrc-footer">
            <div>Inspected by: <strong>${vrcData.diagnosis_completed_by || 'Service Advisor'}</strong></div>
            <div>Inspection Date: <strong>${vrcData.created_at ? new Date(vrcData.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</strong></div>
            <div>Settings Restored: <strong>${vrcData.settings_restored ? 'Yes ✓' : 'No'}</strong></div>
          </div>
          
          <div class="signatures" style="margin-top:40px;">
            <div class="signature-box">
              <div class="signature-line">
                <div class="signature-label">Inspector Signature</div>
              </div>
            </div>
            <div class="signature-box">
              <div class="signature-line">
                <div class="signature-label">Customer Acknowledgment</div>
              </div>
            </div>
          </div>
          
          <div class="page-footer">
            RAPIDE After-Sales Service Management System • Page 2 of 2 • Printed: ${new Date().toLocaleString()}
          </div>
        </div>
        ` : ''}
      </body>
      </html>
    `;
  };

  const handlePreview = () => {
    try {
      const htmlContent = generatePrintContent();
      const printWindow = window.open('', '_blank', 'width=900,height=1100');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        // Optional: Trigger print dialog automatically after loading
        // printWindow.onload = () => { printWindow.print(); };
      } else {
        alert('Please allow popups to view the print preview.');
      }
    } catch (error) {
      console.error('Preview error:', error);
      alert('Error generating preview: ' + error.message);
    }
  };

  const handlePrintClick = () => {
    setShowPrinterSelector(true);
  };

  const handlePrinterSelect = async (printer) => {
    setIsPrinting(true);
    try {
      const htmlContent = generatePrintContent();
      const logData = {
          service_order_id: formData.jobOrderNumber,
          document_type: isConfirmation ? 'confirmation' : 'service-order',
          printed_by: 'ServiceAdvisor', // Ideally passed in props
          data: { ...formData, isConfirmation }
      };
      await printJobOrder(htmlContent, printer.name, {}, logData);
      setShowPrinterSelector(false);
      alert('Job Order sent to printer successfully!');
    } catch (error) {
      console.error('Print error:', error);
      alert('Error printing job order: ' + error.message);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="anvil-job-order-container">
      <div className="job-order-header">
        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <h2>📋 Job Order Form</h2>
            {vrcData && (
                <span style={{
                    fontSize:'0.75rem', 
                    background:'#dcfce7', 
                    color:'#166534', 
                    padding:'4px 8px', 
                    borderRadius:'99px',
                    fontWeight:'600',
                    border: '1px solid #bbf7d0'
                }}>
                    ✅ VRC Attached
                </span>
            )}
        </div>
        <div className="header-actions">
          <button type="button" className="btn-preview" onClick={handlePreview}>
            👁️ Preview
          </button>
          <button type="button" className="btn-print" onClick={handlePrintClick}>
            🖨️ Print
          </button>
          {onClose && (
            <button type="button" className="btn-close" onClick={onClose}>✕</button>
          )}
        </div>
      </div>

      <form ref={formRef} className="job-order-form">
        <div className="form-row">
          <div className="form-group">
            <label>Job Order Number *</label>
            <input 
              type="text" 
              name="jobOrderNumber"
              value={formData.jobOrderNumber}
              onChange={handleInputChange}
              placeholder="e.g., 001234"
              readOnly={jobOrder ? true : false}
            />
          </div>
          <div className="form-group">
            <label>Date *</label>
            <input 
              type="date" 
              name="date"
              value={formData.date}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="form-section-title">Customer Information</div>
        <div className="form-row">
          <div className="form-group">
            <label>Customer Name *</label>
            <input 
              type="text" 
              name="customerName"
              value={formData.customerName}
              onChange={handleInputChange}
              placeholder="Enter customer name"
            />
          </div>
          <div className="form-group">
            <label>Contact Number *</label>
            <input 
              type="tel" 
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleInputChange}
              placeholder="Enter contact number"
            />
          </div>
        </div>

        <div className="form-section-title">Vehicle Information</div>
        <div className="form-row">
          <div className="form-group">
            <label>Vehicle Info (Make/Model/Year) *</label>
            <input 
              type="text" 
              name="vehicleInfo"
              value={formData.vehicleInfo}
              onChange={handleInputChange}
              placeholder="e.g., Toyota Corolla 2020"
            />
          </div>
          <div className="form-group">
            <label>Registration Number *</label>
            <input 
              type="text" 
              name="registrationNumber"
              value={formData.registrationNumber}
              onChange={handleInputChange}
              placeholder="e.g., ABC-1234"
            />
          </div>
        </div>

        <div className="form-section-title">Service Details</div>
        <div className="form-group full-width">
          <label>Service Description *</label>
          <textarea 
            name="serviceDescription"
            value={formData.serviceDescription}
            onChange={handleInputChange}
            placeholder="Describe the service to be performed..."
            rows="4"
          ></textarea>
        </div>

        <div className="form-group full-width">
          <label>Additional Services (Optional)</label>
          <textarea 
            name="additionalServices"
            value={formData.additionalServices}
            onChange={handleInputChange}
            placeholder="List any additional services or recommendations..."
            rows="3"
          ></textarea>
        </div>

        <div className="form-section-title">Assignment & Estimates</div>
        <div className="form-row">
          <div className="form-group">
            <label>Assigned Technician *</label>
            <input 
              type="text" 
              name="technician"
              value={formData.technician}
              onChange={handleInputChange}
              placeholder="Enter technician name"
            />
          </div>
          <div className="form-group">
            <label>Estimated Hours</label>
            <input 
              type="number" 
              name="estimatedHours"
              value={formData.estimatedHours || ''}
              onChange={handleInputChange}
              placeholder="e.g., 2.5"
              step="0.5"
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Estimated Cost (₱)</label>
            <input 
              type="number" 
              name="estimatedCost"
              value={formData.estimatedCost || ''}
              onChange={handleInputChange}
              placeholder="e.g., 1500.00"
              step="0.01"
              min="0"
            />
          </div>
        </div>

        <div className="form-group full-width">
          <label>Notes (Optional)</label>
          <textarea 
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Any special notes or instructions..."
            rows="3"
          ></textarea>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="btn-clear" 
            onClick={() => {
              setFormData({
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
            }}
          >
            Clear Form
          </button>
          <button 
            type="button" 
            className="btn-print-primary" 
            onClick={handlePrintClick}
            disabled={isPrinting}
          >
            🖨️ Print Job Order
          </button>
        </div>
      </form>

      <PrinterSelector 
        isOpen={showPrinterSelector}
        onClose={() => setShowPrinterSelector(false)}
        onPrint={handlePrinterSelect}
        isLoading={isPrinting}
      />
    </div>
  );
};

export default AnvilJobOrderForm;
