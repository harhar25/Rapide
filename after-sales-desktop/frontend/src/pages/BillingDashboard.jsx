import React, { useState, useEffect, useRef } from 'react';
import { useAutoRefresh } from '../hooks/useRealtimeUpdates';

const API_BASE = 'https://rapide-api.rapideph.workers.dev';

// Invoice Print Template Component
const InvoicePrintTemplate = React.forwardRef(({ invoice, companyInfo }, ref) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

  if (!invoice) return null;

  const parts = invoice._parts || [];
  const serviceType = invoice._service_type || invoice.service_type || '';
  const technicianName = invoice._technician_name || '';
  const laborHours = invoice._labor_hours || invoice.labor_hours || '';

  return (
    <div ref={ref} style={{
      width: '210mm',
      minHeight: '297mm',
      padding: '20mm',
      backgroundColor: '#fff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#333',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '3px solid #1a1a2e', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#1a1a2e', fontWeight: '800', letterSpacing: '-0.5px' }}>INVOICE</h1>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '11px' }}>Rapide After-Sales Service Center</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#333' }}>#{invoice.invoice_number || invoice.id}</div>
          <div style={{ color: '#666', marginTop: '5px', fontSize: '11px' }}>
            Date: {new Date(invoice.created_at).toLocaleDateString('en-PH', { 
              year: 'numeric', month: 'long', day: 'numeric' 
            })}
          </div>
          <div style={{
            marginTop: '8px',
            padding: '4px 14px',
            backgroundColor: invoice.status === 'paid' ? '#d4edda' : invoice.status === 'approved' ? '#fff3cd' : '#e9ecef',
            color: invoice.status === 'paid' ? '#155724' : invoice.status === 'approved' ? '#856404' : '#6c757d',
            borderRadius: '4px',
            display: 'inline-block',
            fontWeight: '700',
            textTransform: 'uppercase',
            fontSize: '10px'
          }}>
            {invoice.status === 'approved' ? 'FOR PAYMENT' : invoice.status}
          </div>
        </div>
      </div>

      {/* Bill To / Vehicle / Service Info */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
        <div style={{ flex: 1, padding: '14px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
          <div style={{ fontSize: '9px', color: '#999', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '700', letterSpacing: '0.5px' }}>Bill To</div>
          <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '2px' }}>{invoice.customer_name || 'N/A'}</div>
          <div style={{ color: '#666', fontSize: '11px' }}>{invoice.customer_address || ''}</div>
          <div style={{ color: '#666', fontSize: '11px' }}>{invoice.customer_phone || ''}</div>
        </div>
        <div style={{ flex: 1, padding: '14px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
          <div style={{ fontSize: '9px', color: '#999', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '700', letterSpacing: '0.5px' }}>Vehicle Details</div>
          <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '2px' }}>{invoice.plate_number || 'N/A'}</div>
          <div style={{ color: '#666', fontSize: '11px' }}>{invoice.vehicle_model || ''}</div>
          <div style={{ color: '#666', fontSize: '11px' }}>SO #{invoice.service_order_id || 'N/A'}</div>
        </div>
        <div style={{ flex: 1, padding: '14px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
          <div style={{ fontSize: '9px', color: '#999', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '700', letterSpacing: '0.5px' }}>Service Info</div>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>{serviceType || 'General Service'}</div>
          {technicianName && <div style={{ color: '#666', fontSize: '11px' }}>Tech: {technicianName}</div>}
          {laborHours && <div style={{ color: '#666', fontSize: '11px' }}>Labor: {laborHours}h</div>}
        </div>
      </div>

      {/* Itemized Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
        <thead>
          <tr style={{ backgroundColor: '#1a1a2e' }}>
            <th style={{ padding: '10px 12px', textAlign: 'left', color: '#fff', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>#</th>
            <th style={{ padding: '10px 12px', textAlign: 'left', color: '#fff', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</th>
            <th style={{ padding: '10px 12px', textAlign: 'center', color: '#fff', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', width: '60px' }}>Qty</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', color: '#fff', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', width: '110px' }}>Unit Price</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', color: '#fff', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', width: '110px' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {/* Labor row */}
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #eee', fontSize: '11px', color: '#999' }}>1</td>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #eee' }}>
              <div style={{ fontWeight: '600', fontSize: '12px' }}>Service Labor — {serviceType || 'General Service'}</div>
              <div style={{ fontSize: '10px', color: '#888' }}>{technicianName ? `Technician: ${technicianName}` : 'Service and repair labor'}{laborHours ? ` · ${laborHours}h` : ''}</div>
            </td>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #eee', textAlign: 'center', fontSize: '12px' }}>1</td>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #eee', textAlign: 'right', fontSize: '12px' }}>{formatCurrency(invoice.labor_cost)}</td>
            <td style={{ padding: '10px 12px', borderBottom: '1px solid #eee', textAlign: 'right', fontWeight: '600', fontSize: '12px' }}>{formatCurrency(invoice.labor_cost)}</td>
          </tr>

          {/* Itemized parts rows */}
          {parts.length > 0 ? parts.map((part, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', fontSize: '11px', color: '#999' }}>{i + 2}</td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: '500', fontSize: '12px' }}>{part.part_name || 'Part'}</div>
                {part.product_code && <div style={{ fontSize: '10px', color: '#999' }}>Code: {part.product_code}</div>}
              </td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', textAlign: 'center', fontSize: '12px' }}>{part.quantity || 1}</td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', textAlign: 'right', fontSize: '12px' }}>{formatCurrency(part.price || 0)}</td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', textAlign: 'right', fontWeight: '500', fontSize: '12px' }}>{formatCurrency(part.line_total || (part.quantity || 1) * (part.price || 0))}</td>
            </tr>
          )) : (
            <tr>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', fontSize: '11px', color: '#999' }}>2</td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: '500', fontSize: '12px' }}>Parts & Materials</div>
                <div style={{ fontSize: '10px', color: '#888' }}>Replacement parts and consumables</div>
              </td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>—</td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>—</td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', textAlign: 'right', fontWeight: '500', fontSize: '12px' }}>{formatCurrency(invoice.parts_cost)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals box */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
        <div style={{ width: '280px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <span style={{ color: '#666', fontSize: '12px' }}>Labor Subtotal</span>
            <span style={{ fontWeight: '500', fontSize: '12px' }}>{formatCurrency(invoice.labor_cost)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <span style={{ color: '#666', fontSize: '12px' }}>Parts Subtotal ({parts.length || '—'} items)</span>
            <span style={{ fontWeight: '500', fontSize: '12px' }}>{formatCurrency(invoice.parts_cost)}</span>
          </div>
          {invoice.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <span style={{ color: '#dc3545', fontSize: '12px' }}>Discount</span>
              <span style={{ fontWeight: '500', fontSize: '12px', color: '#dc3545' }}>-{formatCurrency(invoice.discount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', backgroundColor: '#1a1a2e', borderRadius: '6px', marginTop: '8px', paddingLeft: '12px', paddingRight: '12px' }}>
            <span style={{ fontWeight: '800', fontSize: '14px', color: '#fff' }}>TOTAL DUE</span>
            <span style={{ fontWeight: '800', fontSize: '18px', color: '#fff' }}>{formatCurrency(invoice.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Payment Info (if paid) */}
      {invoice.status === 'paid' && (
        <div style={{ backgroundColor: '#d4edda', padding: '14px 16px', borderRadius: '6px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '700', color: '#155724', marginBottom: '2px', fontSize: '13px' }}>✓ PAID</div>
              <div style={{ fontSize: '11px', color: '#155724' }}>
                {new Date(invoice.paid_at).toLocaleDateString('en-PH', {
                  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: '#155724' }}>Payment Method</div>
              <div style={{ fontWeight: '700', color: '#155724', textTransform: 'uppercase', fontSize: '13px' }}>
                {invoice.payment_method || 'Cash'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '9px', color: '#999', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '700', letterSpacing: '0.5px' }}>Notes</div>
          <div style={{ color: '#666', fontSize: '11px', padding: '10px 12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            {invoice.notes}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ 
        borderTop: '2px solid #1a1a2e', 
        paddingTop: '16px', 
        marginTop: 'auto',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <div style={{ fontSize: '10px', color: '#999' }}>
          <div style={{ fontWeight: '600' }}>Thank you for your business!</div>
          <div style={{ marginTop: '4px' }}>For inquiries, please contact our service center.</div>
        </div>
        <div style={{ fontSize: '10px', color: '#999', textAlign: 'right' }}>
          <div>Invoice #{invoice.invoice_number || invoice.id}</div>
          <div>Generated: {new Date().toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
});

// Invoice Detail Modal Component with itemized parts
function InvoiceDetailModal({ invoice, onClose, onPrint, onApprove, formatCurrency, formatDate, getStatusBadge, apiBase }) {
  const [parts, setParts] = useState([]);
  const [serviceType, setServiceType] = useState('');
  const [techName, setTechName] = useState('');
  const [laborHours, setLaborHours] = useState('');
  const [loadingParts, setLoadingParts] = useState(false);

  useEffect(() => {
    if (invoice?.service_order_id) {
      setLoadingParts(true);
      fetch(`${apiBase}/api/billing/service-order/${invoice.service_order_id}/details`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            const d = data?.data || data;
            setParts(d.parts || []);
            setServiceType(d.service_type || '');
            setTechName(d.technician_name || '');
            setLaborHours(d.labor_hours || '');
          }
        })
        .catch(() => {})
        .finally(() => setLoadingParts(false));
    }
  }, [invoice?.service_order_id, apiBase]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '12px', width: '100%',
        maxWidth: '580px', maxHeight: '90vh', overflow: 'auto'
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#1a1a2e' }}>Invoice #{invoice.invoice_number || invoice.id}</h3>
            <div style={{ marginTop: '6px' }}>{getStatusBadge(invoice.status)}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', color: '#999', cursor: 'pointer' }}>&times;</button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Customer</div>
              <div style={{ fontSize: '15px', fontWeight: '600' }}>{invoice.customer_name || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Plate Number</div>
              <div style={{ fontSize: '15px', fontWeight: '600' }}>{invoice.plate_number || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Service Type</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{serviceType || invoice.service_type || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Service Order</div>
              <div style={{ fontSize: '14px' }}>#{invoice.service_order_id || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Created</div>
              <div style={{ fontSize: '14px' }}>{formatDate(invoice.created_at)}</div>
            </div>
            {techName && (
              <div>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Technician</div>
                <div style={{ fontSize: '14px' }}>{techName}</div>
              </div>
            )}
          </div>

          {/* Cost breakdown */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: '16px' }}>
            {/* Labor */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
              <span style={{ color: '#444', fontWeight: '500' }}>Service Labor{serviceType ? ` — ${serviceType}` : ''}</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(invoice.labor_cost)}</span>
            </div>
            {laborHours && (
              <div style={{ fontSize: '11px', color: '#888', padding: '4px 0 8px 0' }}>
                {laborHours} hour(s) of labor
              </div>
            )}

            {/* Parts header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 6px 0' }}>
              <span style={{ color: '#444', fontWeight: '600', fontSize: '13px' }}>Warehouse Parts</span>
              <span style={{ color: '#888', fontSize: '12px' }}>{parts.length} item(s)</span>
            </div>

            {loadingParts ? (
              <div style={{ textAlign: 'center', padding: '12px', color: '#999', fontSize: '12px' }}>Loading parts...</div>
            ) : parts.length > 0 ? (
              <div style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px' }}>
                {parts.map((part, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: i < parts.length - 1 ? '1px solid #eee' : 'none'
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>{part.part_name}</div>
                      <div style={{ fontSize: '11px', color: '#999' }}>
                        {part.product_code ? `${part.product_code} · ` : ''}{part.quantity}x @ {formatCurrency(part.price || 0)}
                      </div>
                    </div>
                    <div style={{ fontWeight: '600', fontSize: '13px' }}>
                      {formatCurrency(part.line_total || (part.quantity || 1) * (part.price || 0))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '8px 0 8px 12px', color: '#999', fontSize: '12px', fontStyle: 'italic' }}>No itemized parts available</div>
            )}

            {/* Parts subtotal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #eee' }}>
              <span style={{ color: '#666' }}>Parts Subtotal</span>
              <span style={{ fontWeight: '500' }}>{formatCurrency(invoice.parts_cost)}</span>
            </div>

            {/* Discount */}
            {invoice.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                <span style={{ color: '#666' }}>Discount</span>
                <span style={{ fontWeight: '500', color: '#dc3545' }}>-{formatCurrency(invoice.discount)}</span>
              </div>
            )}

            {/* Grand total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderTop: '2px solid #1a1a2e', marginTop: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: '700' }}>Total</span>
              <span style={{ fontSize: '22px', fontWeight: '800', color: '#28a745' }}>{formatCurrency(invoice.total_amount)}</span>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Notes</div>
              <div style={{ fontSize: '13px', color: '#333' }}>{invoice.notes}</div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', gap: '12px' }}>
          <button
            onClick={() => onPrint(invoice)}
            style={{
              flex: 1, padding: '12px', backgroundColor: '#17a2b8', color: '#fff',
              border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            🖨️ Print Invoice
          </button>
          {(invoice.status === 'pending' || invoice.status === 'draft') && (
            <button
              onClick={() => onApprove(invoice)}
              style={{
                flex: 1, padding: '12px', backgroundColor: '#28a745', color: '#fff',
                border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'
              }}
            >
              ✓ Approve & Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BillingDashboard() {
  const [activeTab, setActiveTab] = useState('ready-for-billing');
  const [invoices, setInvoices] = useState([]);
  const [serviceOrders, setServiceOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(null);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const printRef = useRef();
  
  // Date filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const [newInvoice, setNewInvoice] = useState({
    service_order_id: '',
    customer_name: '',
    plate_number: '',
    vehicle_model: '',
    labor_cost: '',
    parts_cost: '',
    discount: '0',
    notes: ''
  });
  const [orderDetails, setOrderDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch billing details for a service order (service type, labor, parts with pricing)
  const fetchBillingDetails = async (serviceOrderId) => {
    if (!serviceOrderId) {
      setOrderDetails(null);
      return;
    }
    setLoadingDetails(true);
    try {
      const res = await fetch(`${API_BASE}/api/billing/service-order/${serviceOrderId}/details`);
      if (res.ok) {
        const data = await res.json();
        const details = data?.data || data;
        setOrderDetails(details);
        // Auto-fill the invoice form
        setNewInvoice(prev => ({
          ...prev,
          service_order_id: String(serviceOrderId),
          customer_name: details.customer_name || prev.customer_name,
          plate_number: details.plate_number || prev.plate_number,
          vehicle_model: details.vehicle_model || prev.vehicle_model,
          labor_cost: String(details.labor_cost || 0),
          parts_cost: String(details.parts_cost || 0),
          notes: details.service_type ? `Service: ${details.service_type}` : prev.notes
        }));
      }
    } catch (err) {
      console.error('Failed to fetch billing details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/billing/invoices`);
      if (res.ok) {
        const data = await res.json();
        const invoiceList = data?.data?.invoices || data?.invoices || [];
        setInvoices(invoiceList);
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/service-advisor/orders/ready-for-billing`);
      if (res.ok) {
        const data = await res.json();
        setServiceOrders(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch service orders:', err);
    }
  };

  const handleRealtimeUpdate = () => {
    fetchInvoices();
    fetchServiceOrders();
  };

  useAutoRefresh(['billing'], handleRealtimeUpdate);
  
  useEffect(() => {
    fetchInvoices();
    fetchServiceOrders();
  }, []);

  const handlePrint = async (invoice) => {
    // Fetch parts details for this invoice's service order
    let enrichedInvoice = { ...invoice };
    if (invoice.service_order_id) {
      try {
        const res = await fetch(`${API_BASE}/api/billing/service-order/${invoice.service_order_id}/details`);
        if (res.ok) {
          const data = await res.json();
          const details = data?.data || data;
          enrichedInvoice._parts = details.parts || [];
          enrichedInvoice._service_type = details.service_type || '';
          enrichedInvoice._technician_name = details.technician_name || '';
          enrichedInvoice._labor_hours = details.labor_hours || '';
        }
      } catch (err) {
        console.error('Failed to fetch parts for print:', err);
      }
    }
    setShowPrintPreview(enrichedInvoice);
  };

  const executePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice #${showPrintPreview?.invoice_number || showPrintPreview?.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; }
            @media print {
              body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
    setShowPrintPreview(null);
  };

  const getFilteredInvoices = () => {
    let filtered = invoices;
    
    switch (activeTab) {
      case 'ready':
        filtered = invoices.filter(inv => inv.status === 'pending' || inv.status === 'draft');
        break;
      case 'approved':
        filtered = invoices.filter(inv => inv.status === 'approved');
        break;
      case 'paid':
        filtered = invoices.filter(inv => inv.status === 'paid');
        break;
      case 'all':
        break;
    }

    // Date filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom).setHours(0, 0, 0, 0);
      filtered = filtered.filter(inv => {
        const invDate = new Date(inv.created_at).setHours(0, 0, 0, 0);
        return invDate >= fromDate;
      });
    }
    if (dateTo) {
      const toDate = new Date(dateTo).setHours(23, 59, 59, 999);
      filtered = filtered.filter(inv => {
        const invDate = new Date(inv.created_at).setHours(0, 0, 0, 0);
        return invDate <= toDate;
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(inv =>
        (inv.customer_name || '').toLowerCase().includes(q) ||
        (inv.plate_number || '').toLowerCase().includes(q) ||
        (inv.invoice_number || '').toString().toLowerCase().includes(q)
      );
    }

    return filtered;
  };

  const handleApprove = async (invoice) => {
    try {
      const res = await fetch(`${API_BASE}/api/billing/invoices/${invoice.id}/approve`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('Invoice approved! Sent to Cashier for payment.');
        fetchInvoices();
        setSelectedInvoice(null);
      } else {
        showToast('Failed to approve invoice', 'error');
      }
    } catch (err) {
      showToast('Error approving invoice', 'error');
    }
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.service_order_id) {
      showToast('Please select a service order', 'error');
      return;
    }
    if (!newInvoice.labor_cost && !newInvoice.parts_cost) {
      showToast('Please enter labor or parts cost', 'error');
      return;
    }

    try {
      // Find the service order to get customer_id
      const so = serviceOrders.find(o => String(o.id) === String(newInvoice.service_order_id));
      const customerId = so?.customer_id;
      if (!customerId) {
        showToast('Cannot resolve customer for this service order', 'error');
        return;
      }

      const laborCost = parseFloat(newInvoice.labor_cost || 0);
      const partsCost = parseFloat(newInvoice.parts_cost || 0);
      const discount = parseFloat(newInvoice.discount || 0);

      const res = await fetch(`${API_BASE}/api/billing/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_order_id: parseInt(newInvoice.service_order_id),
          customer_id: customerId,
          labor_hours: so?.total_labor_hours || 1,
          labor_rate: laborCost / (so?.total_labor_hours || 1),
          parts_cost: partsCost,
          materials_cost: 0,
          parking_cost: 0,
          discount: discount
        })
      });

      if (res.ok) {
        showToast('Invoice created successfully!');
        setShowCreateModal(false);
        setNewInvoice({
          service_order_id: '',
          customer_name: '',
          plate_number: '',
          vehicle_model: '',
          labor_cost: '',
          parts_cost: '',
          discount: '0',
          notes: ''
        });
        setOrderDetails(null);
        fetchInvoices();
        fetchServiceOrders();
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || 'Failed to create invoice', 'error');
      }
    } catch (err) {
      showToast('Error creating invoice', 'error');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      draft: { bg: '#e9ecef', color: '#6c757d', label: 'Draft' },
      pending: { bg: '#fff3cd', color: '#856404', label: 'Pending' },
      approved: { bg: '#cce5ff', color: '#004085', label: 'For Payment' },
      paid: { bg: '#d4edda', color: '#155724', label: 'Paid' }
    }[status] || { bg: '#e9ecef', color: '#6c757d', label: status };

    return (
      <span style={{
        padding: '5px 12px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: '600',
        backgroundColor: config.bg,
        color: config.color,
        textTransform: 'uppercase'
      }}>
        {config.label}
      </span>
    );
  };

  // Filter out SOs that already have an invoice
  const invoicedSOIds = new Set(invoices.map(i => i.service_order_id).filter(Boolean).map(String));
  const readyServiceOrders = serviceOrders.filter(so => !invoicedSOIds.has(String(so.id)));

  const stats = {
    readyForBilling: readyServiceOrders.length,
    pending: invoices.filter(i => i.status === 'pending' || i.status === 'draft').length,
    forPayment: invoices.filter(i => i.status === 'approved').length,
    paidToday: invoices.filter(i => i.status === 'paid' && new Date(i.paid_at).toDateString() === new Date().toDateString()).length,
    totalRevenue: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0),
    pendingAmount: invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0)
  };

  const filteredInvoices = getFilteredInvoices();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f7fa', padding: '24px' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '14px 24px',
          borderRadius: '8px',
          backgroundColor: toast.type === 'error' ? '#dc3545' : '#28a745',
          color: '#fff',
          fontWeight: '500',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {toast.message}
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          zIndex: 1000,
          padding: '40px',
          overflow: 'auto'
        }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', maxWidth: '900px' }}>
            {/* Preview Header */}
            <div style={{
              padding: '16px 24px',
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>
                Print Preview - Invoice #{showPrintPreview.invoice_number || showPrintPreview.id}
              </h3>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={executePrint}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  🖨️ Print Invoice
                </button>
                <button
                  onClick={() => setShowPrintPreview(null)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
            {/* Invoice Preview */}
            <div style={{ padding: '20px', backgroundColor: '#e9ecef' }}>
              <div style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                <InvoicePrintTemplate ref={printRef} invoice={showPrintPreview} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999
        }} onClick={() => setShowCreateModal(false)}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1a1a2e' }}>Create New Invoice</h3>
            </div>
            
            <div style={{ padding: '24px' }}>
              {/* Service Order Selection */}
              {serviceOrders.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#333' }}>
                    Select Service Order (Optional)
                  </label>
                  <select
                    value={newInvoice.service_order_id}
                    onChange={e => {
                      const val = e.target.value;
                      const order = serviceOrders.find(o => o.id.toString() === val);
                      if (order) {
                        setNewInvoice({
                          ...newInvoice,
                          service_order_id: val,
                          customer_name: order.customer_name || '',
                          plate_number: order.plate_no || '',
                          vehicle_model: order.vehicle_model || ''
                        });
                        // Auto-fetch billing details (service type, parts, pricing)
                        fetchBillingDetails(val);
                      } else {
                        setNewInvoice({ ...newInvoice, service_order_id: val });
                        setOrderDetails(null);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      fontSize: '14px',
                      backgroundColor: '#fff'
                    }}
                  >
                    <option value="">-- Select or create manual --</option>
                    {serviceOrders.map(order => (
                      <option key={order.id} value={order.id}>
                        #{order.id} - {order.customer_name} ({order.plate_number})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#333' }}>
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={newInvoice.customer_name}
                    onChange={e => setNewInvoice({ ...newInvoice, customer_name: e.target.value })}
                    placeholder="Enter customer name"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#333' }}>
                    Plate Number
                  </label>
                  <input
                    type="text"
                    value={newInvoice.plate_number}
                    onChange={e => setNewInvoice({ ...newInvoice, plate_number: e.target.value })}
                    placeholder="ABC 1234"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#333' }}>
                  Vehicle Model
                </label>
                <input
                  type="text"
                  value={newInvoice.vehicle_model}
                  onChange={e => setNewInvoice({ ...newInvoice, vehicle_model: e.target.value })}
                  placeholder="e.g. Toyota Vios 2023"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Auto-populated Service Info */}
              {loadingDetails && (
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#e8f4fd', borderRadius: '8px', textAlign: 'center', color: '#007bff', fontSize: '13px' }}>
                  ⏳ Loading service details...
                </div>
              )}

              {orderDetails && !loadingDetails && (
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#166534', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ✅ Auto-populated from Service Order
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                    <div><span style={{ color: '#666' }}>Service Type:</span> <strong>{orderDetails.service_type || 'General'}</strong></div>
                    <div><span style={{ color: '#666' }}>Technician:</span> <strong>{orderDetails.technician_name || 'N/A'}</strong></div>
                    <div><span style={{ color: '#666' }}>Labor Hours:</span> <strong>{orderDetails.labor_hours || '-'}h</strong></div>
                    {orderDetails.service_catalog && (
                      <div><span style={{ color: '#666' }}>Catalog Price:</span> <strong>{formatCurrency(orderDetails.service_catalog.base_price)}</strong></div>
                    )}
                  </div>

                  {/* Parts breakdown */}
                  {orderDetails.parts && orderDetails.parts.length > 0 ? (
                    <div style={{ marginTop: '12px', borderTop: '1px solid #bbf7d0', paddingTop: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#166534', marginBottom: '8px' }}>📦 Parts Requested from Warehouse</div>
                      <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#dcfce7' }}>
                            <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: '600' }}>Part</th>
                            <th style={{ textAlign: 'center', padding: '6px 8px', fontWeight: '600' }}>Qty</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: '600' }}>Unit Price</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: '600' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderDetails.parts.map((part, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                              <td style={{ padding: '6px 8px' }}>{part.part_name || 'Unknown'} <span style={{ color: '#999', fontSize: '11px' }}>{part.product_code || ''}</span></td>
                              <td style={{ padding: '6px 8px', textAlign: 'center' }}>{part.quantity}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(part.price || 0)}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '500' }}>{formatCurrency(part.line_total || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ backgroundColor: '#dcfce7' }}>
                            <td colSpan="3" style={{ padding: '6px 8px', fontWeight: '600' }}>Parts Subtotal</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '700' }}>{formatCurrency(orderDetails.parts_cost)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div style={{ marginTop: '12px', borderTop: '1px solid #bbf7d0', paddingTop: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📦 No parts requested from warehouse for this service order
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#333' }}>
                    Labor Cost *
                  </label>
                  <input
                    type="number"
                    value={newInvoice.labor_cost}
                    onChange={e => setNewInvoice({ ...newInvoice, labor_cost: e.target.value })}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#333' }}>
                    Parts Cost
                  </label>
                  <input
                    type="number"
                    value={newInvoice.parts_cost}
                    onChange={e => setNewInvoice({ ...newInvoice, parts_cost: e.target.value })}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#333' }}>
                    Discount
                  </label>
                  <input
                    type="number"
                    value={newInvoice.discount}
                    onChange={e => setNewInvoice({ ...newInvoice, discount: e.target.value })}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: '#333' }}>
                  Notes
                </label>
                <textarea
                  value={newInvoice.notes}
                  onChange={e => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {/* Total Preview */}
              <div style={{
                marginTop: '24px',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>Total Amount</span>
                <span style={{ fontSize: '28px', fontWeight: '700', color: '#28a745' }}>
                  {formatCurrency(
                    parseFloat(newInvoice.labor_cost || 0) +
                    parseFloat(newInvoice.parts_cost || 0) -
                    parseFloat(newInvoice.discount || 0)
                  )}
                </span>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f8f9fa',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvoice}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onPrint={handlePrint}
          onApprove={handleApprove}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          getStatusBadge={getStatusBadge}
          apiBase={API_BASE}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a2e', margin: 0 }}>📋 Billing Dashboard</h1>
          <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0 0' }}>Manage invoices, approve payments, and print receipts</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '12px 24px',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          + New Invoice
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e8e8' }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>🔔 Ready for Billing</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#e83e8c' }}>{stats.readyForBilling}</div>
        </div>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e8e8' }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>📝 Pending Review</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#ffc107' }}>{stats.pending}</div>
        </div>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e8e8' }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>💳 For Payment</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#007bff' }}>{stats.forPayment}</div>
        </div>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e8e8' }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>✅ Paid Today</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#28a745' }}>{stats.paidToday}</div>
        </div>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e8e8' }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>⏳ Pending Amount</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#ffc107' }}>{formatCurrency(stats.pendingAmount)}</div>
        </div>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e8e8' }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>💰 Total Revenue</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#28a745' }}>{formatCurrency(stats.totalRevenue)}</div>
        </div>
      </div>

      {/* Main Card */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e8e8', overflow: 'hidden' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', padding: '16px 20px', borderBottom: '1px solid #eee', backgroundColor: '#fafafa' }}>
          {[
            { id: 'ready-for-billing', label: 'Ready for Billing', count: stats.readyForBilling },
            { id: 'ready', label: 'Pending Review', count: stats.pending },
            { id: 'approved', label: 'For Payment', count: stats.forPayment },
            { id: 'paid', label: 'Paid', count: stats.paidToday },
            { id: 'all', label: 'All Invoices', count: invoices.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === tab.id ? '#007bff' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#666',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              {tab.label}
              <span style={{
                marginLeft: '8px',
                padding: '2px 8px',
                borderRadius: '10px',
                backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : '#e9ecef',
                fontSize: '12px'
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Search</label>
            <input
              type="text"
              placeholder="🔍 Customer, plate, invoice..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px'
              }}
            />
          </div>
          {(dateFrom || dateTo || searchQuery) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setSearchQuery('');
              }}
              style={{
                padding: '10px 16px',
                backgroundColor: '#e9ecef',
                color: '#666',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Results Summary */}
        {(dateFrom || dateTo || searchQuery) && (
          <div style={{ padding: '12px 20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #eee', display: 'flex', gap: '20px' }}>
            <span style={{ fontSize: '13px', color: '#666' }}>
              Found <strong>{filteredInvoices.length}</strong> invoices
            </span>
            <span style={{ fontSize: '13px', color: '#666' }}>
              Total: <strong style={{ color: '#28a745' }}>{formatCurrency(filteredInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0))}</strong>
            </span>
          </div>
        )}

        {/* Ready for Billing - Service Orders Tab */}
        {activeTab === 'ready-for-billing' && (
          <div>
            {readyServiceOrders.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#999' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                <div style={{ fontSize: '16px' }}>No service orders waiting for billing</div>
                <div style={{ fontSize: '13px', marginTop: '8px' }}>All caught up! Service orders will appear here after QC & Job Wrapup</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', borderBottom: '1px solid #eee' }}>SO #</th>
                    <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', borderBottom: '1px solid #eee' }}>Customer</th>
                    <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', borderBottom: '1px solid #eee' }}>Vehicle</th>
                    <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', borderBottom: '1px solid #eee' }}>Service Type</th>
                    <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', borderBottom: '1px solid #eee' }}>Labor Hours</th>
                    <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', borderBottom: '1px solid #eee' }}>Technician</th>
                    <th style={{ textAlign: 'right', padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', borderBottom: '1px solid #eee' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {readyServiceOrders.map(so => (
                    <tr
                      key={so.id}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                    >
                      <td style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
                        <span style={{ fontWeight: '600', color: '#e83e8c' }}>#{so.id}</span>
                      </td>
                      <td style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
                        <div style={{ fontWeight: '500' }}>{so.customer_name || 'N/A'}</div>
                        <div style={{ fontSize: '12px', color: '#999' }}>{so.contact_no || ''}</div>
                      </td>
                      <td style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', color: '#666' }}>
                        <div>{so.plate_no || 'N/A'}</div>
                        <div style={{ fontSize: '12px', color: '#999' }}>{so.vehicle_model || ''}</div>
                      </td>
                      <td style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', color: '#666' }}>
                        <span style={{ padding: '4px 10px', backgroundColor: '#e8f4fd', color: '#007bff', borderRadius: '12px', fontSize: '12px', fontWeight: '500' }}>
                          {so.service_type || 'General'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', color: '#666' }}>
                        {so.total_labor_hours ? `${so.total_labor_hours}h` : '-'}
                      </td>
                      <td style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', color: '#666' }}>
                        {so.technician_name || '-'}
                      </td>
                      <td style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setNewInvoice({
                              service_order_id: so.id.toString(),
                              customer_name: so.customer_name || '',
                              plate_number: so.plate_no || '',
                              vehicle_model: so.vehicle_model || '',
                              labor_cost: '',
                              parts_cost: '',
                              discount: '0',
                              notes: ''
                            });
                            // Auto-fetch billing details
                            fetchBillingDetails(so.id);
                            setShowCreateModal(true);
                          }}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#007bff',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          + Create Invoice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Invoices Table */}
        {activeTab !== 'ready-for-billing' && (loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#999' }}>Loading invoices...</div>
        ) : filteredInvoices.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
            <div style={{ fontSize: '16px' }}>No invoices found</div>
            <div style={{ fontSize: '13px', marginTop: '8px' }}>Create a new invoice to get started</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#fafafa' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', borderBottom: '1px solid #eee' }}>Invoice</th>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', borderBottom: '1px solid #eee' }}>Customer</th>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', borderBottom: '1px solid #eee' }}>Vehicle</th>
                <th style={{ textAlign: 'right', padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', borderBottom: '1px solid #eee' }}>Amount</th>
                <th style={{ textAlign: 'center', padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', borderBottom: '1px solid #eee' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', borderBottom: '1px solid #eee' }}>Date</th>
                <th style={{ textAlign: 'right', padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', borderBottom: '1px solid #eee' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(invoice => (
                <tr
                  key={invoice.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedInvoice(invoice)}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                >
                  <td style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ fontWeight: '600', color: '#007bff' }}>#{invoice.invoice_number || invoice.id}</span>
                  </td>
                  <td style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ fontWeight: '500' }}>{invoice.customer_name || 'N/A'}</div>
                  </td>
                  <td style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', color: '#666' }}>
                    {invoice.plate_number || 'N/A'}
                  </td>
                  <td style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
                    <span style={{ fontWeight: '600', color: '#28a745' }}>{formatCurrency(invoice.total_amount)}</span>
                  </td>
                  <td style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>
                    {getStatusBadge(invoice.status)}
                  </td>
                  <td style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', color: '#666' }}>
                    {formatDate(invoice.created_at)}
                  </td>
                  <td style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
                    <button
                      onClick={e => { e.stopPropagation(); handlePrint(invoice); }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#e8f4fd',
                        color: '#007bff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        marginRight: '8px'
                      }}
                    >
                      🖨️ Print
                    </button>
                    {(invoice.status === 'pending' || invoice.status === 'draft') && (
                      <button
                        onClick={e => { e.stopPropagation(); handleApprove(invoice); }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#d4edda',
                          color: '#155724',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        ✓ Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    </div>
  );
}
