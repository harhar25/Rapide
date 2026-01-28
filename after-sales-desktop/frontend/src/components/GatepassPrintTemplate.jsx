/**
 * Gatepass Print Template Component
 * Displays complete gatepass with process tracking for guard verification
 * Shows all process steps: completed, skipped, not catered, pending
 */

import React from 'react';
import '../styles/gatepass-print.css';

const GatepassPrintTemplate = ({ data }) => {
  if (!data) {
    return <div className="gatepass-print">No data available</div>;
  }

  const {
    gatepass_number,
    service_order_id,
    customer_name,
    vehicle_plate_no,
    vehicle_model,
    vehicle_color,
    total_amount,
    invoice_number,
    gatepass_signatures,
    processes,
    summary
  } = data;

  const getStatusColor = (status) => {
    const colorMap = {
      'completed': '#22c55e',
      'in_progress': '#f59e0b',
      'not_started': '#gray',
      'skipped': '#9ca3af',
      'not_catered': '#ef4444',
      'pending': '#f59e0b'
    };
    return colorMap[status] || '#gray';
  };

  const getStatusBgColor = (status) => {
    const bgColorMap = {
      'completed': '#dcfce7',
      'in_progress': '#fef3c7',
      'not_started': '#f3f4f6',
      'skipped': '#f3f4f6',
      'not_catered': '#fee2e2',
      'pending': '#fef3c7'
    };
    return bgColorMap[status] || '#f3f4f6';
  };

  return (
    <div className="gatepass-print">
      {/* Header */}
      <div className="gatepass-header">
        <div className="company-info">
          <h1>GATEPASS & PROCESS TRACKING</h1>
          <p className="company-name">After-Sales Service Center</p>
        </div>
        <div className="gatepass-number">
          <span className="label">Gatepass #:</span>
          <span className="value">{gatepass_number}</span>
        </div>
      </div>

      {/* Customer & Vehicle Information */}
      <div className="customer-section">
        <div className="section-title">Customer & Vehicle Information</div>
        
        <table className="info-table">
          <tbody>
            <tr>
              <td className="label">Customer Name:</td>
              <td className="value">{customer_name || 'N/A'}</td>
              <td className="label">Vehicle Plate:</td>
              <td className="value">{vehicle_plate_no || 'N/A'}</td>
            </tr>
            <tr>
              <td className="label">Vehicle Model:</td>
              <td className="value">{vehicle_model || 'N/A'}</td>
              <td className="label">Vehicle Color:</td>
              <td className="value">{vehicle_color || 'N/A'}</td>
            </tr>
            <tr>
              <td className="label">Service Order ID:</td>
              <td className="value">SO-{String(service_order_id).padStart(5, '0')}</td>
              <td className="label">Invoice Number:</td>
              <td className="value">{invoice_number || 'N/A'}</td>
            </tr>
            <tr>
              <td className="label">Total Amount:</td>
              <td className="value">₱{parseFloat(total_amount || 0).toFixed(2)}</td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Process Summary */}
      {summary && (
        <div className="summary-section">
          <div className="section-title">Service Process Progress Summary</div>
          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-label">Total Steps:</div>
              <div className="summary-value">{summary.total_steps}</div>
            </div>
            <div className="summary-item completed">
              <div className="summary-label">✅ Completed:</div>
              <div className="summary-value">{summary.completed}</div>
            </div>
            <div className="summary-item in-progress">
              <div className="summary-label">⏳ In Progress:</div>
              <div className="summary-value">{summary.in_progress}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">⭕ Not Started:</div>
              <div className="summary-value">{summary.not_started}</div>
            </div>
            <div className="summary-item skipped">
              <div className="summary-label">⏭️ Skipped:</div>
              <div className="summary-value">{summary.skipped}</div>
            </div>
            <div className="summary-item not-catered">
              <div className="summary-label">⚠️ Not Catered:</div>
              <div className="summary-value">{summary.not_catered}</div>
            </div>
            <div className="summary-item progress">
              <div className="summary-label">Progress:</div>
              <div className="summary-value">{summary.progress_percentage}%</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="progress-bar-container">
            <div className="progress-bar-label">Overall Progress</div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${summary.progress_percentage}%` }}
              ></div>
            </div>
            <div className="progress-percentage">{summary.progress_percentage}%</div>
          </div>
        </div>
      )}

      {/* Detailed Process Steps */}
      <div className="processes-section">
        <div className="section-title">Detailed Service Process Status</div>
        
        <table className="processes-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Process Step</th>
              <th>Department</th>
              <th>Status</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {processes && processes.map((process, idx) => (
              <tr key={idx} className={`status-${process.status}`}>
                <td className="step-number">{process.step}</td>
                <td className="step-name">{process.name}</td>
                <td className="step-type">{process.type}</td>
                <td className="status-cell">
                  <span 
                    className="status-badge"
                    style={{
                      backgroundColor: getStatusBgColor(process.status),
                      color: getStatusColor(process.status),
                      borderColor: getStatusColor(process.status)
                    }}
                  >
                    {process.icon} {process.status_display}
                  </span>
                </td>
                <td className="remarks">
                  {process.status === 'not_catered' && process.error ? (
                    <span className="error-note">⚠️ {process.error}</span>
                  ) : (
                    <span className="status-note">
                      {process.status === 'completed' && '✓ Done'}
                      {process.status === 'in_progress' && '⏳ In Progress'}
                      {process.status === 'skipped' && '⏭️ Not Required'}
                      {process.status === 'not_started' && '⭕ Pending'}
                      {process.status === 'not_catered' && '⚠️ Not Catered'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Gatepass Signatures */}
      {gatepass_signatures && (
        <div className="signatures-section">
          <div className="section-title">Approval Signatures</div>
          
          <div className="signatures-grid">
            <div className={`signature-box ${gatepass_signatures.cashier ? 'signed' : 'unsigned'}`}>
              <div className="signature-label">Cashier Signature</div>
              <div className="signature-status">
                {gatepass_signatures.cashier ? '✓ Signed' : '○ Pending'}
              </div>
            </div>
            
            <div className={`signature-box ${gatepass_signatures.accounting ? 'signed' : 'unsigned'}`}>
              <div className="signature-label">Accounting Signature</div>
              <div className="signature-status">
                {gatepass_signatures.accounting ? '✓ Signed' : '○ Pending'}
              </div>
            </div>
            
            <div className={`signature-box ${gatepass_signatures.warranty ? 'signed' : 'unsigned'}`}>
              <div className="signature-label">Warranty Signature</div>
              <div className="signature-status">
                {gatepass_signatures.warranty ? '✓ Signed' : '○ Pending'}
              </div>
            </div>
            
            <div className={`signature-box ${gatepass_signatures.manager ? 'signed' : 'unsigned'}`}>
              <div className="signature-label">Manager Signature</div>
              <div className="signature-status">
                {gatepass_signatures.manager ? '✓ Signed' : '○ Pending'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Notes */}
      <div className="footer-notes">
        <p><strong>Important:</strong> Guard should verify all required signatures are complete before releasing vehicle.</p>
        <p><strong>Process Status Guide:</strong></p>
        <ul>
          <li><strong>✅ Completed:</strong> Process has been fully completed</li>
          <li><strong>⏳ In Progress:</strong> Process is currently being executed</li>
          <li><strong>⭕ Not Started:</strong> Process has not yet commenced</li>
          <li><strong>⏭️ Skipped:</strong> Process was not required for this service</li>
          <li><strong>⚠️ Not Catered:</strong> Process was requested but not performed</li>
        </ul>
      </div>

      {/* Print Timestamp */}
      <div className="print-info">
        <p>Printed: {new Date().toLocaleString()}</p>
        <p>For: Security Gate Clearance & Vehicle Release</p>
      </div>
    </div>
  );
};

export default GatepassPrintTemplate;
