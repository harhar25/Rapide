import React, { useState, useEffect, useRef } from 'react';
import { useAutoRefresh } from '../hooks/useRealtimeUpdates';

const API_BASE = 'https://rapide-api.rapideph.workers.dev';

// Landscape Billing Statement Print Template
const ReceiptPrintTemplate = React.forwardRef(({ payment, companyName = "Rapide Auto Service Center" }, ref) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

  if (!payment) return null;

  const invoiceNo = payment.receipt_number || payment.invoice_number || `INV-${String(payment.id).padStart(5, '0')}`;
  const dateStr = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  const laborCost = Number(payment.labor_cost || 0);
  const partsCost = Number(payment.parts_cost || 0);
  const discount = Number(payment.discount || 0);
  const subtotal = laborCost + partsCost;
  const total = Number(payment.total_amount || subtotal - discount);

  return (
    <div ref={ref} style={{
      width: '279mm',    /* crosswise / landscape short bond */
      minHeight: '210mm',
      padding: '12mm 16mm',
      backgroundColor: '#fff',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      fontSize: '11px',
      color: '#1a1a2e',
      boxSizing: 'border-box',
    }}>
      {/* ── Header Row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10mm', paddingBottom: '6mm', borderBottom: '2.5px solid #1e40af' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#1e40af', letterSpacing: '-0.5px' }}>{companyName}</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>After-Sales Service Department</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e40af' }}>SERVICE BILLING STATEMENT</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Invoice: <strong style={{ color: '#1e40af' }}>{invoiceNo}</strong></div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Date: {dateStr} &nbsp;|&nbsp; Time: {timeStr}</div>
        </div>
      </div>

      {/* ── Customer & Vehicle Info (side by side) ── */}
      <div style={{ display: 'flex', gap: '12mm', marginBottom: '8mm' }}>
        <div style={{ flex: 1, padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: '700', fontSize: '9px', color: '#1e40af', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Customer Information</div>
          <div style={{ fontSize: '14px', fontWeight: '700' }}>{payment.customer_name || 'Walk-in Customer'}</div>
          {payment.customer_contact && <div style={{ fontSize: '11px', color: '#64748b' }}>{payment.customer_contact}</div>}
          {payment.customer_address && <div style={{ fontSize: '11px', color: '#64748b' }}>{payment.customer_address}</div>}
        </div>
        <div style={{ flex: 1, padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: '700', fontSize: '9px', color: '#1e40af', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Vehicle Details</div>
          <div style={{ fontSize: '14px', fontWeight: '700' }}>{payment.plate_number || payment.vehicle_plate_no || 'N/A'}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{payment.vehicle_model || ''} {payment.vehicle_color ? `(${payment.vehicle_color})` : ''}</div>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Service Order: SO-{payment.service_order_id || payment.id}</div>
        </div>
        <div style={{ flex: 1, padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: '700', fontSize: '9px', color: '#1e40af', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Payment Details</div>
          <div style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase' }}>{payment.payment_method || 'CASH'}</div>
          {payment.reference_number && <div style={{ fontSize: '11px', color: '#64748b' }}>Ref: {payment.reference_number}</div>}
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Processed by: {payment.processed_by || 'Cashier'}</div>
        </div>
      </div>

      {/* ── Charges Table ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm' }}>
        <thead>
          <tr style={{ background: '#1e40af' }}>
            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#fff', fontSize: '10px', fontWeight: '700', width: '50%' }}>Description</th>
            <th style={{ padding: '8px 12px', textAlign: 'center', color: '#fff', fontSize: '10px', fontWeight: '700', width: '15%' }}>Qty / Hrs</th>
            <th style={{ padding: '8px 12px', textAlign: 'right', color: '#fff', fontSize: '10px', fontWeight: '700', width: '15%' }}>Unit Price</th>
            <th style={{ padding: '8px 12px', textAlign: 'right', color: '#fff', fontSize: '10px', fontWeight: '700', width: '20%' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {laborCost > 0 && (
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px 12px', fontWeight: '500' }}>Labor Charges</td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>{payment.labor_hours || '-'}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{payment.labor_rate ? formatCurrency(payment.labor_rate) : '-'}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>{formatCurrency(laborCost)}</td>
            </tr>
          )}
          {partsCost > 0 && (
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px 12px', fontWeight: '500' }}>Parts & Components</td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>-</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>-</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>{formatCurrency(partsCost)}</td>
            </tr>
          )}
          {Number(payment.materials_cost) > 0 && (
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px 12px', fontWeight: '500' }}>Materials & Supplies</td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>-</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>-</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>{formatCurrency(payment.materials_cost)}</td>
            </tr>
          )}
          {Number(payment.parking_cost) > 0 && (
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px 12px', fontWeight: '500' }}>Parking / Storage Fee</td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>-</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>-</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>{formatCurrency(payment.parking_cost)}</td>
            </tr>
          )}
          {/* If no breakdown data, show single total line */}
          {laborCost === 0 && partsCost === 0 && (
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px 12px', fontWeight: '500' }}>Service Charges (Total)</td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>-</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>-</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>{formatCurrency(total)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ── Totals + Payment Summary (side by side) ── */}
      <div style={{ display: 'flex', gap: '12mm', marginBottom: '8mm' }}>
        {/* Payment terms */}
        <div style={{ flex: 1, padding: '8px 12px', background: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a', fontSize: '10px' }}>
          <div style={{ fontWeight: '700', marginBottom: '4px', color: '#92400e' }}>Payment Terms & Notes</div>
          <ul style={{ margin: '0', paddingLeft: '14px', lineHeight: '1.6', color: '#78716c' }}>
            <li>Payment is due upon completion of service</li>
            <li>Accepted: Cash, Card, GCash, Maya, Bank Transfer, Check</li>
            <li>For check payments, vehicle release pending clearance</li>
          </ul>
        </div>

        {/* Totals box */}
        <div style={{ width: '220px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '11px', borderBottom: '1px solid #e2e8f0' }}>
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal || total)}</span>
          </div>
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '11px', color: '#22c55e', borderBottom: '1px solid #e2e8f0' }}>
              <span>Discount:</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', fontSize: '16px', fontWeight: '800', background: '#1e40af', color: '#fff', borderRadius: '0 0 6px 6px', marginTop: '4px' }}>
            <span>TOTAL:</span>
            <span>{formatCurrency(total)}</span>
          </div>
          {payment.amount_received && Number(payment.amount_received) > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '11px', marginTop: '4px' }}>
                <span>Amount Received:</span>
                <span>{formatCurrency(payment.amount_received)}</span>
              </div>
              {Number(payment.change_amount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '11px', fontWeight: '600', color: '#f59e0b' }}>
                  <span>Change:</span>
                  <span>{formatCurrency(payment.change_amount)}</span>
                </div>
              )}
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', fontSize: '12px', fontWeight: '700', background: '#dcfce7', color: '#166534', borderRadius: '6px', marginTop: '4px' }}>
            <span>STATUS:</span>
            <span>PAID</span>
          </div>
        </div>
      </div>

      {/* ── Signature Row ── */}
      <div style={{ display: 'flex', gap: '20mm', marginTop: '12mm' }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ borderBottom: '1px solid #000', width: '80%', margin: '0 auto', paddingTop: '20mm' }}></div>
          <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: '600' }}>Customer Signature</div>
          <div style={{ fontSize: '9px', color: '#94a3b8' }}>Printed Name / Date</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ borderBottom: '1px solid #000', width: '80%', margin: '0 auto', paddingTop: '20mm' }}></div>
          <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: '600' }}>Cashier</div>
          <div style={{ fontSize: '9px', color: '#94a3b8' }}>{payment.processed_by || 'Cashier'}</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ borderBottom: '1px solid #000', width: '80%', margin: '0 auto', paddingTop: '20mm' }}></div>
          <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: '600' }}>Service Advisor</div>
          <div style={{ fontSize: '9px', color: '#94a3b8' }}>Authorized Signatory</div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ marginTop: '8mm', textAlign: 'center', fontSize: '9px', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '4mm' }}>
        <div>Thank you for choosing {companyName}!</div>
        <div>This document serves as your official billing statement and proof of payment.</div>
      </div>
    </div>
  );
});

export default function CashierDashboard() {
  const [paymentQueue, setPaymentQueue] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerBalance, setDrawerBalance] = useState(0);
  const [completedToday, setCompletedToday] = useState([]);
  const [showReceipt, setShowReceipt] = useState(null);
  const [toast, setToast] = useState(null);
  const printRef = useRef();
  
  // History states
  const [showHistory, setShowHistory] = useState(false);
  const [allPayments, setAllPayments] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState({
    dateFrom: '',
    dateTo: '',
    search: '',
    paymentMethod: 'all'
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPaymentQueue = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/billing/invoices?status=pending`);
      if (res.ok) {
        const data = await res.json();
        const list = data?.data?.invoices || data?.invoices || [];
        setPaymentQueue(list);
      }
    } catch (err) {
      console.error('Failed to fetch queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedToday = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/billing/invoices?status=paid`);
      if (res.ok) {
        const data = await res.json();
        const list = data?.data?.invoices || data?.invoices || [];
        const today = new Date().toDateString();
        const todayPayments = list.filter(inv => 
          inv.paid_at && new Date(inv.paid_at).toDateString() === today
        );
        setCompletedToday(todayPayments);
        const total = todayPayments.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        setDrawerBalance(total);
      }
    } catch (err) {
      console.error('Failed to fetch completed:', err);
    }
  };

  const fetchAllPayments = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/billing/invoices?status=paid`);
      if (res.ok) {
        const data = await res.json();
        const list = data?.data?.invoices || data?.invoices || [];
        setAllPayments(list);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistory = () => {
    setShowHistory(true);
    fetchAllPayments();
  };

  const getFilteredHistory = () => {
    return allPayments.filter(payment => {
      // Date filter
      if (historyFilter.dateFrom) {
        const paymentDate = new Date(payment.paid_at).setHours(0,0,0,0);
        const fromDate = new Date(historyFilter.dateFrom).setHours(0,0,0,0);
        if (paymentDate < fromDate) return false;
      }
      if (historyFilter.dateTo) {
        const paymentDate = new Date(payment.paid_at).setHours(0,0,0,0);
        const toDate = new Date(historyFilter.dateTo).setHours(23,59,59,999);
        if (paymentDate > toDate) return false;
      }
      // Search filter
      if (historyFilter.search) {
        const q = historyFilter.search.toLowerCase();
        if (!(payment.customer_name || '').toLowerCase().includes(q) &&
            !(payment.plate_number || '').toLowerCase().includes(q) &&
            !(payment.invoice_number || '').toString().includes(q)) {
          return false;
        }
      }
      // Payment method filter
      if (historyFilter.paymentMethod !== 'all') {
        if ((payment.payment_method || 'cash') !== historyFilter.paymentMethod) return false;
      }
      return true;
    });
  };

  const handleRealtimeUpdate = () => {
    fetchPaymentQueue();
    fetchCompletedToday();
  };

  useAutoRefresh(['cashier', 'billing'], handleRealtimeUpdate);

  useEffect(() => {
    fetchPaymentQueue();
    fetchCompletedToday();
  }, []);

  const handleProcessPayment = async () => {
    if (!selectedOrder) return;
    
    const amount = parseFloat(amountReceived || selectedOrder.total_amount);
    if (paymentMethod === 'cash' && amount < selectedOrder.total_amount) {
      showToast('Insufficient amount received', 'error');
      return;
    }

    if (['gcash', 'maya', 'bank', 'card', 'check'].includes(paymentMethod) && !referenceNumber) {
      showToast('Reference number required for this payment method', 'error');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/billing/invoices/${selectedOrder.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: paymentMethod,
          amount_paid: selectedOrder.total_amount,
          reference_number: referenceNumber || null,
          processed_by: 'Cashier'
        })
      });

      if (res.ok) {
        const changeAmount = paymentMethod === 'cash' ? Math.max(0, amount - selectedOrder.total_amount) : 0;
        showToast('Payment processed successfully!');
        setShowReceipt({
          ...selectedOrder,
          payment_method: paymentMethod,
          amount_received: amount,
          change_amount: changeAmount,
          reference_number: referenceNumber,
          processed_by: 'Cashier'
        });
        setSelectedOrder(null);
        setAmountReceived('');
        setReferenceNumber('');
        setPaymentMethod('cash');
        fetchPaymentQueue();
        fetchCompletedToday();
      } else {
        showToast('Failed to process payment', 'error');
      }
    } catch (err) {
      showToast('Error processing payment', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const executePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Billing Statement - ${showReceipt?.invoice_number || showReceipt?.receipt_number || showReceipt?.id}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              display: flex;
              justify-content: center;
            }
            @page {
              size: landscape;
              margin: 8mm;
            }
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
  };

  const handlePrintReceipt = (payment) => {
    setShowReceipt({
      ...payment,
      payment_method: payment.payment_method || 'cash'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

  const change = selectedOrder && paymentMethod === 'cash' 
    ? Math.max(0, parseFloat(amountReceived || 0) - selectedOrder.total_amount)
    : 0;

  const stats = {
    inQueue: paymentQueue.length,
    completedToday: completedToday.length,
    drawerBalance: drawerBalance,
    avgTime: '2.5 min'
  };

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

      {/* Receipt Modal */}
      {showReceipt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            overflow: 'hidden',
            maxWidth: '900px',
            width: '95%'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              backgroundColor: '#28a745',
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>✓ Payment Complete!</div>
                <div style={{ fontSize: '13px', opacity: '0.9' }}>Billing statement ready to print</div>
              </div>
              <button
                onClick={() => setShowReceipt(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '24px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            {/* Receipt Preview */}
            <div style={{ padding: '20px', backgroundColor: '#f8f9fa', maxHeight: '500px', overflow: 'auto' }}>
              <div style={{ backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', transform: 'scale(0.85)', transformOrigin: 'top center' }}>
                <ReceiptPrintTemplate ref={printRef} payment={showReceipt} />
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #eee', display: 'flex', gap: '12px' }}>
              <button
                onClick={executePrint}
                style={{
                  flex: 1,
                  padding: '14px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                🖨️ Print Billing Statement
              </button>
              <button
                onClick={() => setShowReceipt(null)}
                style={{
                  padding: '14px 24px',
                  backgroundColor: '#f8f9fa',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
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
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            width: '95%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', color: '#1a1a2e' }}>📜 Payment History</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>View all past transactions</p>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                style={{ background: 'none', border: 'none', fontSize: '28px', color: '#999', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {/* Filters */}
            <div style={{
              padding: '16px 24px',
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #eee',
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>From Date</label>
                <input
                  type="date"
                  value={historyFilter.dateFrom}
                  onChange={e => setHistoryFilter({ ...historyFilter, dateFrom: e.target.value })}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>To Date</label>
                <input
                  type="date"
                  value={historyFilter.dateTo}
                  onChange={e => setHistoryFilter({ ...historyFilter, dateTo: e.target.value })}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Payment Method</label>
                <select
                  value={historyFilter.paymentMethod}
                  onChange={e => setHistoryFilter({ ...historyFilter, paymentMethod: e.target.value })}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', backgroundColor: '#fff' }}
                >
                  <option value="all">All Methods</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="gcash">GCash</option>
                  <option value="maya">Maya</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="check">Check</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Search</label>
                <input
                  type="text"
                  value={historyFilter.search}
                  onChange={e => setHistoryFilter({ ...historyFilter, search: e.target.value })}
                  placeholder="Customer name, plate number..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <button
                onClick={() => setHistoryFilter({ dateFrom: '', dateTo: '', search: '', paymentMethod: 'all' })}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#e9ecef',
                  color: '#666',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  marginTop: '18px'
                }}
              >
                Clear Filters
              </button>
            </div>

            {/* Summary */}
            <div style={{
              padding: '12px 24px',
              backgroundColor: '#fff',
              borderBottom: '1px solid #eee',
              display: 'flex',
              gap: '24px'
            }}>
              <div>
                <span style={{ fontSize: '13px', color: '#666' }}>Total Transactions: </span>
                <span style={{ fontWeight: '600' }}>{getFilteredHistory().length}</span>
              </div>
              <div>
                <span style={{ fontSize: '13px', color: '#666' }}>Total Amount: </span>
                <span style={{ fontWeight: '600', color: '#28a745' }}>
                  {formatCurrency(getFilteredHistory().reduce((sum, p) => sum + (p.total_amount || 0), 0))}
                </span>
              </div>
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {historyLoading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#999' }}>Loading...</div>
              ) : getFilteredHistory().length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#999' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
                  <div>No transactions found</div>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#fafafa' }}>
                      <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '12px', fontWeight: '600', color: '#666', borderBottom: '1px solid #eee' }}>Date & Time</th>
                      <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '12px', fontWeight: '600', color: '#666', borderBottom: '1px solid #eee' }}>Receipt #</th>
                      <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '12px', fontWeight: '600', color: '#666', borderBottom: '1px solid #eee' }}>Customer</th>
                      <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '12px', fontWeight: '600', color: '#666', borderBottom: '1px solid #eee' }}>Plate</th>
                      <th style={{ textAlign: 'center', padding: '12px 20px', fontSize: '12px', fontWeight: '600', color: '#666', borderBottom: '1px solid #eee' }}>Method</th>
                      <th style={{ textAlign: 'right', padding: '12px 20px', fontSize: '12px', fontWeight: '600', color: '#666', borderBottom: '1px solid #eee' }}>Amount</th>
                      <th style={{ textAlign: 'center', padding: '12px 20px', fontSize: '12px', fontWeight: '600', color: '#666', borderBottom: '1px solid #eee' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredHistory().map(payment => (
                      <tr key={payment.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '14px 20px', fontSize: '14px' }}>
                          <div>{new Date(payment.paid_at).toLocaleDateString()}</div>
                          <div style={{ fontSize: '12px', color: '#999' }}>{new Date(payment.paid_at).toLocaleTimeString()}</div>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: '500', color: '#007bff' }}>
                          #{payment.invoice_number || payment.id}
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: '500' }}>
                          {payment.customer_name || 'N/A'}
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: '14px', color: '#666' }}>
                          {payment.plate_number || 'N/A'}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '500',
                            backgroundColor: '#e9ecef',
                            color: '#666',
                            textTransform: 'uppercase'
                          }}>
                            {payment.payment_method || 'cash'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: '600', color: '#28a745' }}>
                          {formatCurrency(payment.total_amount)}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              setShowHistory(false);
                              handlePrintReceipt(payment);
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#e8f4fd',
                              color: '#007bff',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                          >
                            🖨️ Print
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a2e', margin: 0 }}>💵 Cashier</h1>
          <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0 0' }}>Process customer payments and print billing statements</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: drawerOpen ? '#d4edda' : '#f8f9fa',
            borderRadius: '8px',
            border: drawerOpen ? '1px solid #28a745' : '1px solid #dee2e6'
          }}>
            <span style={{ 
              width: '10px', 
              height: '10px', 
              borderRadius: '50%', 
              backgroundColor: drawerOpen ? '#28a745' : '#6c757d' 
            }} />
            <span style={{ fontSize: '14px', color: '#333' }}>
              Drawer: {drawerOpen ? 'Open' : 'Closed'}
            </span>
          </div>
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            style={{
              padding: '10px 20px',
              backgroundColor: drawerOpen ? '#dc3545' : '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            {drawerOpen ? 'Close Drawer' : 'Open Drawer'}
          </button>
          <button
            onClick={openHistory}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📜 History
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e8e8' }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>📋 In Queue</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#007bff' }}>{stats.inQueue}</div>
        </div>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e8e8' }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>✅ Completed Today</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#28a745' }}>{stats.completedToday}</div>
        </div>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e8e8' }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>💰 Drawer Balance</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#28a745' }}>{formatCurrency(stats.drawerBalance)}</div>
        </div>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e8e8' }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>⏱ Avg. Process Time</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a2e' }}>{stats.avgTime}</div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '24px' }}>
        {/* Payment Queue */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e8e8', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1a1a2e' }}>Payment Queue</h3>
            <span style={{
              padding: '4px 12px',
              backgroundColor: '#e8f4fd',
              color: '#007bff',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              {paymentQueue.length} waiting
            </span>
          </div>

          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            {loading ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#999' }}>Loading...</div>
            ) : paymentQueue.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#999' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                <div>No pending payments</div>
              </div>
            ) : (
              paymentQueue.map(order => (
                <div
                  key={order.id}
                  onClick={() => {
                    setSelectedOrder(order);
                    setAmountReceived('');
                    setReferenceNumber('');
                    setPaymentMethod('cash');
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    backgroundColor: selectedOrder?.id === order.id ? '#e8f4fd' : '#fff',
                    borderLeft: selectedOrder?.id === order.id ? '4px solid #007bff' : '4px solid transparent',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    if (selectedOrder?.id !== order.id) e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }}
                  onMouseLeave={e => {
                    if (selectedOrder?.id !== order.id) e.currentTarget.style.backgroundColor = '#fff';
                  }}
                >
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a2e', marginBottom: '4px' }}>
                      {order.customer_name || 'Customer'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      {order.plate_number || 'N/A'} • Invoice #{order.invoice_number || order.id}
                    </div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#28a745' }}>
                    {formatCurrency(order.total_amount)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Recent Transactions */}
          {completedToday.length > 0 && (
            <>
              <div style={{ padding: '16px 20px', borderTop: '2px solid #eee', borderBottom: '1px solid #eee', backgroundColor: '#fafafa' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#666' }}>Recent Transactions</h3>
              </div>
              <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                {completedToday.slice(0, 5).map(tx => (
                  <div key={tx.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 20px',
                    borderBottom: '1px solid #f0f0f0'
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>{tx.customer_name || 'Customer'}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>{new Date(tx.paid_at).toLocaleTimeString()}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: '600', color: '#28a745' }}>{formatCurrency(tx.total_amount)}</span>
                      <button
                        onClick={() => handlePrintReceipt(tx)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#e8f4fd',
                          color: '#007bff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        🖨️ Print
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Payment Panel */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8e8e8', overflow: 'hidden' }}>
          {selectedOrder ? (
            <>
              {/* Selected Customer Info */}
              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>Now Processing</div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a2e' }}>{selectedOrder.customer_name || 'Customer'}</div>
                <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                  {selectedOrder.plate_number} • Invoice #{selectedOrder.invoice_number || selectedOrder.id}
                </div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#28a745', marginTop: '12px' }}>
                  {formatCurrency(selectedOrder.total_amount)}
                </div>
              </div>

              {/* Payment Method Selection */}
              <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#333', marginBottom: '12px' }}>Payment Method</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { id: 'cash', label: '💵 Cash' },
                    { id: 'card', label: '💳 Card' },
                    { id: 'gcash', label: '📱 GCash' },
                    { id: 'maya', label: '📱 Maya' },
                    { id: 'bank', label: '🏦 Bank' },
                    { id: 'check', label: '📝 Check' }
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      style={{
                        padding: '12px 8px',
                        borderRadius: '8px',
                        border: paymentMethod === method.id ? '2px solid #007bff' : '2px solid #e0e0e0',
                        backgroundColor: paymentMethod === method.id ? '#e8f4fd' : '#fff',
                        color: paymentMethod === method.id ? '#007bff' : '#333',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Input */}
              <div style={{ padding: '20px' }}>
                {paymentMethod === 'cash' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#333', marginBottom: '6px' }}>
                      Amount Received
                    </label>
                    <input
                      type="number"
                      value={amountReceived}
                      onChange={e => setAmountReceived(e.target.value)}
                      placeholder={`Minimum: ${formatCurrency(selectedOrder.total_amount)}`}
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        fontSize: '18px',
                        fontWeight: '600',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}

                {['gcash', 'maya', 'bank', 'card', 'check'].includes(paymentMethod) && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#333', marginBottom: '6px' }}>
                      Reference Number *
                    </label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={e => setReferenceNumber(e.target.value)}
                      placeholder="Enter transaction reference"
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        fontSize: '16px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}

                {/* Change Display */}
                {paymentMethod === 'cash' && change > 0 && (
                  <div style={{
                    backgroundColor: '#fff3cd',
                    padding: '16px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    marginBottom: '16px'
                  }}>
                    <div style={{ fontSize: '12px', color: '#856404', marginBottom: '4px' }}>CHANGE</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#856404' }}>{formatCurrency(change)}</div>
                  </div>
                )}

                {/* Process Button */}
                <button
                  onClick={handleProcessPayment}
                  disabled={processing || !drawerOpen}
                  style={{
                    width: '100%',
                    padding: '16px',
                    backgroundColor: (processing || !drawerOpen) ? '#ccc' : '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: (processing || !drawerOpen) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {processing ? 'Processing...' : !drawerOpen ? 'Open Drawer First' : '✓ Complete Payment & Print Billing Statement'}
                </button>

                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setAmountReceived('');
                    setReferenceNumber('');
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: 'transparent',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    marginTop: '12px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: '80px 20px', textAlign: 'center', color: '#999' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👈</div>
              <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>Select a customer from the queue</div>
              <div style={{ fontSize: '13px' }}>Click on any pending payment to start processing</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
