/**
 * Invoice/Service Billing Print Template
 * Per SOP Step 8.1: SA prints Service Billing for customer
 */

import React from 'react';

const InvoicePrintTemplate = ({ data, onClose }) => {
  if (!data) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>No invoice data available</div>;
  }

  const {
    invoice_id,
    invoice_number,
    service_order_id,
    customer_name,
    customer_contact,
    customer_address,
    vehicle_plate_no,
    vehicle_model,
    vehicle_color,
    labor_hours,
    labor_rate,
    labor_total,
    parts_cost,
    materials_cost,
    parking_cost,
    discount,
    warranty_deduction,
    total_amount,
    paid_amount,
    balance,
    status,
    due_date,
    created_at,
    line_items
  } = data;

  const formatMoney = (value) => {
    const num = Number(value || 0);
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const laborTotal = Number(labor_hours || 0) * Number(labor_rate || 0);
  const subtotal = laborTotal + Number(parts_cost || 0) + Number(materials_cost || 0) + Number(parking_cost || 0);
  const totalDeductions = Number(discount || 0) + Number(warranty_deduction || 0);
  const grandTotal = subtotal - totalDeductions;

  return (
    <div style={{ background: 'white', minHeight: '100vh' }}>
      {/* Print Controls - Hidden when printing */}
      <div className="no-print" style={{ 
        padding: '16px', 
        background: '#f1f5f9', 
        display: 'flex', 
        gap: '12px', 
        justifyContent: 'center',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <button 
          onClick={handlePrint}
          style={{
            padding: '12px 32px',
            fontSize: '16px',
            fontWeight: 'bold',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          🖨️ Print Invoice
        </button>
        {onClose && (
          <button 
            onClick={onClose}
            style={{
              padding: '12px 32px',
              fontSize: '16px',
              background: '#e2e8f0',
              color: '#334155',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        )}
      </div>

      {/* Invoice Content */}
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto', 
        padding: '40px',
        fontFamily: 'Arial, sans-serif'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '30px',
          paddingBottom: '20px',
          borderBottom: '3px solid #1e40af'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', color: '#1e40af' }}>SERVICE BILLING</h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>After-Sales Service Center</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', color: '#64748b' }}>Invoice #</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e40af' }}>
              {invoice_number || `INV-${String(invoice_id || service_order_id).padStart(5, '0')}`}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Date: {formatDate(created_at)}
            </div>
          </div>
        </div>

        {/* Customer & Vehicle Info */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '24px',
          marginBottom: '30px'
        }}>
          <div style={{ 
            background: '#f8fafc', 
            padding: '16px', 
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#1e40af' }}>BILL TO:</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{customer_name || 'Walk-in Customer'}</div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>{customer_contact || ''}</div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>{customer_address || ''}</div>
          </div>
          <div style={{ 
            background: '#f8fafc', 
            padding: '16px', 
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#1e40af' }}>VEHICLE:</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{vehicle_plate_no || 'N/A'}</div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>{vehicle_model || ''}</div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>{vehicle_color || ''}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              Service Order: SO-{String(service_order_id).padStart(5, '0')}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          marginBottom: '24px'
        }}>
          <thead>
            <tr style={{ background: '#1e40af', color: 'white' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '12px', textAlign: 'center', width: '80px' }}>Qty/Hrs</th>
              <th style={{ padding: '12px', textAlign: 'right', width: '120px' }}>Rate</th>
              <th style={{ padding: '12px', textAlign: 'right', width: '120px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {/* Labor */}
            {Number(labor_hours) > 0 && (
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px' }}>Labor Charges</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{labor_hours} hrs</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>{formatMoney(labor_rate)}/hr</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{formatMoney(laborTotal)}</td>
              </tr>
            )}
            
            {/* Parts */}
            {Number(parts_cost) > 0 && (
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px' }}>Parts & Components</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>-</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>-</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{formatMoney(parts_cost)}</td>
              </tr>
            )}
            
            {/* Materials */}
            {Number(materials_cost) > 0 && (
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px' }}>Materials & Supplies</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>-</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>-</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{formatMoney(materials_cost)}</td>
              </tr>
            )}
            
            {/* Parking */}
            {Number(parking_cost) > 0 && (
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px' }}>Parking/Storage Fee</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>-</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>-</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{formatMoney(parking_cost)}</td>
              </tr>
            )}

            {/* Line Items if available */}
            {line_items && line_items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '12px' }}>{item.description}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{item.quantity || '-'}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>{item.unit_price ? formatMoney(item.unit_price) : '-'}</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{formatMoney(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end'
        }}>
          <div style={{ width: '300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
              <span>Subtotal:</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            
            {Number(discount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0', color: '#22c55e' }}>
                <span>Discount:</span>
                <span>-{formatMoney(discount)}</span>
              </div>
            )}
            
            {Number(warranty_deduction) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0', color: '#22c55e' }}>
                <span>Warranty Deduction:</span>
                <span>-{formatMoney(warranty_deduction)}</span>
              </div>
            )}
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '12px 0', 
              fontSize: '20px', 
              fontWeight: 'bold',
              background: '#1e40af',
              color: 'white',
              margin: '8px -12px -12px',
              padding: '16px 12px',
              borderRadius: '0 0 8px 8px'
            }}>
              <span>TOTAL DUE:</span>
              <span>{formatMoney(total_amount || grandTotal)}</span>
            </div>

            {Number(paid_amount) > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: '16px', color: '#22c55e' }}>
                  <span>Amount Paid:</span>
                  <span>{formatMoney(paid_amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 'bold' }}>
                  <span>Balance:</span>
                  <span>{formatMoney(balance || (Number(total_amount || grandTotal) - Number(paid_amount)))}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment Terms */}
        <div style={{ 
          marginTop: '40px', 
          padding: '16px', 
          background: '#fef3c7', 
          borderRadius: '8px',
          border: '1px solid #fbbf24'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Payment Terms:</div>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
            <li>Payment is due upon completion of service</li>
            <li>Accepted: Cash, Credit/Debit Card, Check, Online Transfer</li>
            <li>For check payments, vehicle release pending clearance</li>
          </ul>
        </div>

        {/* Signature Section */}
        <div style={{ 
          marginTop: '40px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '40px'
        }}>
          <div>
            <div style={{ borderBottom: '1px solid #000', width: '200px', marginBottom: '8px', paddingTop: '40px' }}></div>
            <div style={{ fontSize: '14px' }}>Customer Signature</div>
          </div>
          <div>
            <div style={{ borderBottom: '1px solid #000', width: '200px', marginBottom: '8px', paddingTop: '40px' }}></div>
            <div style={{ fontSize: '14px' }}>Service Advisor</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: '40px', 
          textAlign: 'center', 
          fontSize: '12px', 
          color: '#94a3b8',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '20px'
        }}>
          <p>Thank you for choosing our service center!</p>
          <p>For inquiries, please contact our Customer Relations Office</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          @page { margin: 0.5in; }
        }
      `}</style>
    </div>
  );
};

export default InvoicePrintTemplate;
