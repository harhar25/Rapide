import React, { useState, useEffect, useRef } from 'react';
import PrinterSelector from './PrinterSelector';
import { printJobOrder } from '../services/printService';
import '../styles/anvil-job-order.css';

const AnvilJobOrderForm = ({ jobOrder = null, onClose }) => {
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
        <title>Job Order - ${formData.jobOrderNumber}</title>
        <style>
          @media print {
            body { margin: 0; padding: 0; }
            .print-container { page-break-after: always; }
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
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
          .job-order-number {
            text-align: right;
            font-size: 18px;
            font-weight: bold;
            color: #d9534f;
          }
          .job-order-date {
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
            font-size: 12px;
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
            margin-bottom: 12px;
          }
          .info-label {
            font-size: 10px;
            font-weight: 600;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 3px;
          }
          .info-value {
            font-size: 13px;
            color: #333;
            font-weight: 500;
            padding: 6px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .full-width {
            grid-column: 1 / -1;
          }
          .service-section {
            grid-column: 1 / -1;
            margin-top: 10px;
          }
          .description-box {
            border: 1px solid #ddd;
            padding: 12px;
            background: #fafafa;
            font-size: 12px;
            line-height: 1.5;
            color: #333;
            min-height: 80px;
          }
          .additional-box {
            border: 1px solid #ddd;
            padding: 12px;
            background: #fafafa;
            font-size: 12px;
            line-height: 1.5;
            color: #333;
            min-height: 50px;
          }
          .notes-box {
            border: 1px solid #ddd;
            padding: 12px;
            background: #fafafa;
            font-size: 12px;
            line-height: 1.5;
            color: #333;
            min-height: 60px;
          }
          .estimates {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
          }
          .estimate-item {
            background: #f0f8ff;
            padding: 12px;
            border-left: 4px solid #5cb85c;
            border-radius: 2px;
          }
          .estimate-label {
            font-size: 10px;
            font-weight: 600;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .estimate-value {
            font-size: 16px;
            font-weight: bold;
            color: #1a3a52;
          }
          .footer {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
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
              <div class="company-name"> RAPIDE</div>
              <div class="company-tagline">Professional After-Sales Service</div>
            </div>
            <div>
              <div class="job-order-number">JO-${formData.jobOrderNumber}</div>
              <div class="job-order-date">${formData.date}</div>
            </div>
          </div>

          <div class="content">
            <!-- Customer Information -->
            <div class="section">
              <div class="section-title">Customer Information</div>
              <div class="info-group">
                <div class="info-label">Customer Name</div>
                <div class="info-value">${formData.customerName || '____________________________'}</div>
              </div>
              <div class="info-group">
                <div class="info-label">Contact Number</div>
                <div class="info-value">${formData.contactNumber || '____________________________'}</div>
              </div>
            </div>

            <!-- Vehicle Information -->
            <div class="section">
              <div class="section-title">Vehicle Information</div>
              <div class="info-group">
                <div class="info-label">Vehicle Details</div>
                <div class="info-value">${formData.vehicleInfo || '____________________________'}</div>
              </div>
              <div class="info-group">
                <div class="info-label">Registration #</div>
                <div class="info-value">${formData.registrationNumber || '____________________________'}</div>
              </div>
            </div>

            <!-- Assigned Technician -->
            <div class="section full-width">
              <div class="section-title">Assigned Technician</div>
              <div class="info-group">
                <div class="info-label">Technician Name</div>
                <div class="info-value">${formData.technician || '____________________________'}</div>
              </div>
            </div>

            <!-- Service Description -->
            <div class="section service-section">
              <div class="section-title">Service Description</div>
              <div class="description-box">${formData.serviceDescription || 'No description provided'}</div>
            </div>

            <!-- Additional Services -->
            ${formData.additionalServices ? `
            <div class="section service-section">
              <div class="section-title">Additional Services</div>
              <div class="additional-box">${formData.additionalServices}</div>
            </div>
            ` : ''}

            <!-- Estimates -->
            <div class="section full-width">
              <div class="section-title">Estimates</div>
              <div class="estimates">
                <div class="estimate-item">
                  <div class="estimate-label">Estimated Labor Hours</div>
                  <div class="estimate-value">${formData.estimatedHours ? formData.estimatedHours + ' hrs' : 'TBD'}</div>
                </div>
                <div class="estimate-item">
                  <div class="estimate-label">Estimated Cost</div>
                  <div class="estimate-value">₱${formData.estimatedCost ? parseFloat(formData.estimatedCost).toFixed(2) : '0.00'}</div>
                </div>
              </div>
            </div>

            <!-- Notes -->
            ${formData.notes ? `
            <div class="section full-width">
              <div class="section-title">Notes</div>
              <div class="notes-box">${formData.notes}</div>
            </div>
            ` : ''}
          </div>

          <!-- Footer -->
          <div class="footer">
            <div class="footer-section">
              <span class="footer-label">Customer Signature</span>
              <div class="signature-line"></div>
            </div>
            <div class="footer-section">
              <span class="footer-label">Technician Signature</span>
              <div class="signature-line"></div>
            </div>
            <div class="footer-section">
              <span class="footer-label">Manager Approval</span>
              <div class="signature-line"></div>
            </div>
          </div>

          <div class="footer-info">
            Rapide After-Sales Service Management System | Printed on ${new Date().toLocaleString()}
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
      const htmlContent = generatePrintContent();
      await printJobOrder(htmlContent, printer.name);
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
        <h2>📋 Job Order Form</h2>
        <div className="header-actions">
          <button type="button" className="btn-preview" onClick={() => window.print()}>
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
