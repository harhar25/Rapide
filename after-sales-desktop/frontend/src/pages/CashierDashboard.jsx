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
      // Fetch approved/issued invoices (sent to cashier by billing)
      const res = await fetch(`${API_BASE}/api/billing/invoices?status=approved`);
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

  // Reliable polling every 5 seconds so approved invoices appear promptly
  useEffect(() => {
    fetchPaymentQueue();
    fetchCompletedToday();

    const poll = setInterval(() => {
      fetchPaymentQueue();
      fetchCompletedToday();
    }, 5000);

    return () => clearInterval(poll);
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

  // Professional color palette
  const colors = {
    dark: '#0f172a',
    darkAlt: '#1e293b',
    accent: '#1e40af',
    accentLight: '#3b82f6',
    accentBg: '#eff6ff',
    success: '#059669',
    successLight: '#d1fae5',
    successDark: '#065f46',
    danger: '#dc2626',
    warning: '#d97706',
    warningBg: '#fffbeb',
    warningBorder: '#fde68a',
    text: '#0f172a',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    bg: '#f8fafc',
    white: '#ffffff',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          padding: '14px 20px', borderRadius: '6px',
          backgroundColor: toast.type === 'error' ? colors.danger : colors.success,
          color: '#fff', fontWeight: '500', fontSize: '13px', zIndex: 1000,
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span style={{ fontWeight: '700' }}>{toast.type === 'error' ? 'Error' : 'Success'}:</span> {toast.message}
        </div>
      )}

      {/* ============ Receipt / Billing Statement Modal ============ */}
      {showReceipt && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999
        }}>
          <div style={{
            backgroundColor: colors.white, borderRadius: '8px', overflow: 'hidden',
            maxWidth: '900px', width: '95%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              padding: '16px 24px', backgroundColor: colors.success, color: '#fff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '600', letterSpacing: '-0.3px' }}>Payment Confirmed</div>
                <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '2px' }}>Billing statement ready for printing</div>
              </div>
              <button onClick={() => setShowReceipt(null)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer', opacity: 0.8 }}>&times;</button>
            </div>
            <div style={{ padding: '20px', backgroundColor: colors.bg, maxHeight: '480px', overflow: 'auto' }}>
              <div style={{ backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', transform: 'scale(0.82)', transformOrigin: 'top center' }}>
                <ReceiptPrintTemplate ref={printRef} payment={showReceipt} />
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: `1px solid ${colors.border}`, display: 'flex', gap: '10px' }}>
              <button onClick={executePrint}
                style={{
                  flex: 1, padding: '12px', backgroundColor: colors.accent, color: '#fff',
                  border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '14px'
                }}>Print Billing Statement</button>
              <button onClick={() => setShowReceipt(null)}
                style={{
                  padding: '12px 20px', backgroundColor: colors.bg, color: colors.textSecondary,
                  border: `1px solid ${colors.border}`, borderRadius: '6px', fontWeight: '500', cursor: 'pointer'
                }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ Payment History Modal ============ */}
      {showHistory && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999
        }}>
          <div style={{
            backgroundColor: colors.white, borderRadius: '8px', width: '95%', maxWidth: '1060px',
            maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              padding: '18px 24px', borderBottom: `1px solid ${colors.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: colors.dark, letterSpacing: '-0.3px' }}>Transaction History</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: colors.textSecondary }}>Complete record of processed payments</p>
              </div>
              <button onClick={() => setShowHistory(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', color: colors.textMuted, cursor: 'pointer' }}>&times;</button>
            </div>

            {/* Filters */}
            <div style={{
              padding: '14px 24px', backgroundColor: colors.bg, borderBottom: `1px solid ${colors.border}`,
              display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-end'
            }}>
              {[
                { label: 'From', type: 'date', value: historyFilter.dateFrom, key: 'dateFrom' },
                { label: 'To', type: 'date', value: historyFilter.dateTo, key: 'dateTo' }
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: '11px', color: colors.textSecondary, display: 'block', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{f.label}</label>
                  <input type={f.type} value={f.value}
                    onChange={e => setHistoryFilter({ ...historyFilter, [f.key]: e.target.value })}
                    style={{ padding: '7px 10px', borderRadius: '4px', border: `1px solid ${colors.border}`, fontSize: '13px', color: colors.text }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: '11px', color: colors.textSecondary, display: 'block', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Method</label>
                <select value={historyFilter.paymentMethod}
                  onChange={e => setHistoryFilter({ ...historyFilter, paymentMethod: e.target.value })}
                  style={{ padding: '7px 10px', borderRadius: '4px', border: `1px solid ${colors.border}`, fontSize: '13px', backgroundColor: '#fff', color: colors.text }}>
                  <option value="all">All Methods</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="gcash">GCash</option>
                  <option value="maya">Maya</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="check">Check</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label style={{ fontSize: '11px', color: colors.textSecondary, display: 'block', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Search</label>
                <input type="text" value={historyFilter.search}
                  onChange={e => setHistoryFilter({ ...historyFilter, search: e.target.value })}
                  placeholder="Name, plate, invoice..."
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: `1px solid ${colors.border}`, fontSize: '13px', boxSizing: 'border-box', color: colors.text }} />
              </div>
              <button onClick={() => setHistoryFilter({ dateFrom: '', dateTo: '', search: '', paymentMethod: 'all' })}
                style={{ padding: '7px 14px', backgroundColor: colors.white, color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                Reset
              </button>
            </div>

            {/* Summary bar */}
            <div style={{ padding: '10px 24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', gap: '28px', fontSize: '13px' }}>
              <span style={{ color: colors.textSecondary }}>Records: <strong style={{ color: colors.text }}>{getFilteredHistory().length}</strong></span>
              <span style={{ color: colors.textSecondary }}>Total: <strong style={{ color: colors.success }}>{formatCurrency(getFilteredHistory().reduce((s, p) => s + (p.total_amount || 0), 0))}</strong></span>
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {historyLoading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: colors.textMuted, fontSize: '14px' }}>Loading records...</div>
              ) : getFilteredHistory().length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: colors.textMuted }}>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>No transactions match your criteria</div>
                  <div style={{ fontSize: '12px', marginTop: '6px' }}>Try adjusting the date range or search filters</div>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: colors.bg }}>
                      {['Date / Time', 'Invoice', 'Customer', 'Plate', 'Method', 'Amount', ''].map((h, i) => (
                        <th key={i} style={{
                          textAlign: i === 5 ? 'right' : i === 4 ? 'center' : 'left',
                          padding: '10px 18px', fontSize: '10px', fontWeight: '700', color: colors.textSecondary,
                          borderBottom: `1px solid ${colors.border}`, textTransform: 'uppercase', letterSpacing: '0.5px'
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredHistory().map(payment => (
                      <tr key={payment.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.bg}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = colors.white}>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: colors.text }}>{new Date(payment.paid_at).toLocaleDateString()}</div>
                          <div style={{ fontSize: '11px', color: colors.textMuted }}>{new Date(payment.paid_at).toLocaleTimeString()}</div>
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: '13px', fontWeight: '600', color: colors.accent }}>#{payment.invoice_number || payment.id}</td>
                        <td style={{ padding: '12px 18px', fontSize: '13px', fontWeight: '500', color: colors.text }}>{payment.customer_name || 'N/A'}</td>
                        <td style={{ padding: '12px 18px', fontSize: '13px', color: colors.textSecondary }}>{payment.plate_number || 'N/A'}</td>
                        <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '3px', fontSize: '10px', fontWeight: '600', backgroundColor: colors.bg, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                            {payment.payment_method || 'cash'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: '600', fontSize: '13px', color: colors.success }}>{formatCurrency(payment.total_amount)}</td>
                        <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                          <button onClick={() => { setShowHistory(false); handlePrintReceipt(payment); }}
                            style={{ padding: '5px 12px', backgroundColor: colors.accentBg, color: colors.accent, border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}>
                            Print
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

      {/* ============ TOP BAR ============ */}
      <div style={{
        backgroundColor: colors.dark, padding: '0 28px', height: '56px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff', letterSpacing: '-0.3px' }}>CASHIER TERMINAL</div>
          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
            {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Drawer Status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px',
            backgroundColor: drawerOpen ? 'rgba(5,150,105,0.15)' : 'rgba(255,255,255,0.06)',
            borderRadius: '4px', border: `1px solid ${drawerOpen ? 'rgba(5,150,105,0.3)' : 'rgba(255,255,255,0.1)'}`
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: drawerOpen ? '#34d399' : '#64748b' }} />
            <span style={{ fontSize: '12px', color: drawerOpen ? '#34d399' : 'rgba(255,255,255,0.5)', fontWeight: '600' }}>
              Drawer {drawerOpen ? 'Open' : 'Closed'}
            </span>
          </div>
          <button onClick={() => setDrawerOpen(!drawerOpen)}
            style={{
              padding: '7px 16px', backgroundColor: drawerOpen ? 'rgba(220,38,38,0.15)' : 'rgba(5,150,105,0.15)',
              color: drawerOpen ? '#fca5a5' : '#6ee7b7', border: `1px solid ${drawerOpen ? 'rgba(220,38,38,0.3)' : 'rgba(5,150,105,0.3)'}`,
              borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px'
            }}>
            {drawerOpen ? 'Close Drawer' : 'Open Drawer'}
          </button>
          <button onClick={openHistory}
            style={{
              padding: '7px 16px', backgroundColor: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px'
            }}>
            History
          </button>
        </div>
      </div>

      {/* ============ STATS BAR ============ */}
      <div style={{
        backgroundColor: colors.white, borderBottom: `1px solid ${colors.border}`,
        padding: '0 28px', display: 'flex', height: '72px'
      }}>
        {[
          { label: 'IN QUEUE', value: stats.inQueue, color: stats.inQueue > 0 ? colors.accent : colors.textMuted },
          { label: 'PROCESSED TODAY', value: stats.completedToday, color: colors.success },
          { label: 'DRAWER BALANCE', value: formatCurrency(stats.drawerBalance), color: colors.text },
        ].map((stat, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: '0 28px', borderRight: i < 2 ? `1px solid ${colors.borderLight}` : 'none'
          }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '2px' }}>{stat.label}</div>
            <div style={{ fontSize: typeof stat.value === 'number' ? '22px' : '18px', fontWeight: '700', color: stat.color, letterSpacing: '-0.5px' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ============ MAIN LAYOUT ============ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 440px', height: 'calc(100vh - 128px)' }}>

        {/* ---- LEFT: Payment Queue ---- */}
        <div style={{ borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Queue header */}
          <div style={{
            padding: '14px 24px', borderBottom: `1px solid ${colors.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.white
          }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Payment Queue</div>
            {paymentQueue.length > 0 && (
              <span style={{
                padding: '3px 10px', backgroundColor: colors.accentBg, color: colors.accent,
                borderRadius: '3px', fontSize: '11px', fontWeight: '700'
              }}>{paymentQueue.length} pending</span>
            )}
          </div>

          {/* Queue list */}
          <div style={{ flex: 1, overflow: 'auto', backgroundColor: colors.white }}>
            {loading ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: colors.textMuted, fontSize: '13px' }}>Loading queue...</div>
            ) : paymentQueue.length === 0 ? (
              <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: colors.textSecondary }}>Queue is empty</div>
                <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>No pending invoices to process</div>
              </div>
            ) : (
              paymentQueue.map(order => {
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <div key={order.id}
                    onClick={() => {
                      setSelectedOrder(order);
                      setAmountReceived('');
                      setReferenceNumber('');
                      setPaymentMethod('cash');
                    }}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '14px 24px', cursor: 'pointer',
                      borderBottom: `1px solid ${colors.borderLight}`,
                      backgroundColor: isSelected ? colors.accentBg : colors.white,
                      borderLeft: isSelected ? `3px solid ${colors.accent}` : '3px solid transparent',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = colors.bg; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = colors.white; }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text, marginBottom: '3px' }}>
                        {order.customer_name || 'Walk-in Customer'}
                      </div>
                      <div style={{ fontSize: '12px', color: colors.textMuted }}>
                        {order.plate_number || 'N/A'} &middot; INV-{order.invoice_number || order.id}
                      </div>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: colors.text, letterSpacing: '-0.3px' }}>
                      {formatCurrency(order.total_amount)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Recent transactions section */}
          {completedToday.length > 0 && (
            <div style={{ borderTop: `2px solid ${colors.border}` }}>
              <div style={{
                padding: '12px 24px', backgroundColor: colors.bg,
                borderBottom: `1px solid ${colors.border}`
              }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recent Transactions</div>
              </div>
              <div style={{ maxHeight: '180px', overflow: 'auto', backgroundColor: colors.white }}>
                {completedToday.slice(0, 5).map(tx => (
                  <div key={tx.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 24px', borderBottom: `1px solid ${colors.borderLight}`
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: colors.text }}>{tx.customer_name || 'Customer'}</div>
                      <div style={{ fontSize: '11px', color: colors.textMuted }}>{new Date(tx.paid_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: '600', fontSize: '13px', color: colors.success }}>{formatCurrency(tx.total_amount)}</span>
                      <button onClick={() => handlePrintReceipt(tx)}
                        style={{
                          padding: '4px 10px', backgroundColor: colors.bg, color: colors.textSecondary,
                          border: `1px solid ${colors.border}`, borderRadius: '3px', fontSize: '11px',
                          cursor: 'pointer', fontWeight: '600'
                        }}>Reprint</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---- RIGHT: Payment Processing Panel ---- */}
        <div style={{ backgroundColor: colors.white, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedOrder ? (
            <>
              {/* Order Summary */}
              <div style={{ padding: '24px', borderBottom: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>Now Processing</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: colors.text, marginBottom: '4px' }}>{selectedOrder.customer_name || 'Walk-in Customer'}</div>
                <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                  {selectedOrder.plate_number} &middot; Invoice #{selectedOrder.invoice_number || selectedOrder.id}
                </div>

                {/* Breakdown */}
                <div style={{ marginTop: '16px', padding: '14px', backgroundColor: colors.bg, borderRadius: '6px', border: `1px solid ${colors.borderLight}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' }}>
                    <span style={{ color: colors.textSecondary }}>Labor</span>
                    <span style={{ fontWeight: '500', color: colors.text }}>{formatCurrency(selectedOrder.labor_cost)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' }}>
                    <span style={{ color: colors.textSecondary }}>Parts</span>
                    <span style={{ fontWeight: '500', color: colors.text }}>{formatCurrency(selectedOrder.parts_cost)}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' }}>
                      <span style={{ color: colors.danger }}>Discount</span>
                      <span style={{ fontWeight: '500', color: colors.danger }}>-{formatCurrency(selectedOrder.discount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', marginTop: '8px', borderTop: `1px solid ${colors.border}` }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: colors.text }}>Total Due</span>
                    <span style={{ fontSize: '24px', fontWeight: '800', color: colors.text, letterSpacing: '-0.5px' }}>{formatCurrency(selectedOrder.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>Payment Method</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'cash', label: 'Cash' },
                    { id: 'card', label: 'Card' },
                    { id: 'gcash', label: 'GCash' },
                    { id: 'maya', label: 'Maya' },
                    { id: 'bank', label: 'Bank' },
                    { id: 'check', label: 'Check' }
                  ].map(method => (
                    <button key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      style={{
                        padding: '10px 6px', borderRadius: '4px',
                        border: paymentMethod === method.id ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                        backgroundColor: paymentMethod === method.id ? colors.accentBg : colors.white,
                        color: paymentMethod === method.id ? colors.accent : colors.text,
                        cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                        transition: 'all 0.15s', textTransform: 'uppercase', letterSpacing: '0.3px'
                      }}>
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Input */}
              <div style={{ padding: '20px 24px', flex: 1 }}>
                {paymentMethod === 'cash' && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: colors.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Amount Received
                    </label>
                    <input type="number" value={amountReceived}
                      onChange={e => setAmountReceived(e.target.value)}
                      placeholder={formatCurrency(selectedOrder.total_amount)}
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: '4px',
                        border: `1px solid ${colors.border}`, fontSize: '20px', fontWeight: '700',
                        outline: 'none', boxSizing: 'border-box', color: colors.text,
                        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif"
                      }} />
                  </div>
                )}

                {['gcash', 'maya', 'bank', 'card', 'check'].includes(paymentMethod) && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: colors.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Reference Number
                    </label>
                    <input type="text" value={referenceNumber}
                      onChange={e => setReferenceNumber(e.target.value)}
                      placeholder="Enter transaction reference"
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: '4px',
                        border: `1px solid ${colors.border}`, fontSize: '15px',
                        outline: 'none', boxSizing: 'border-box', color: colors.text
                      }} />
                  </div>
                )}

                {/* Change */}
                {paymentMethod === 'cash' && change > 0 && (
                  <div style={{
                    backgroundColor: colors.warningBg, padding: '14px',
                    borderRadius: '4px', border: `1px solid ${colors.warningBorder}`,
                    textAlign: 'center', marginBottom: '14px'
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: colors.warning, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '2px' }}>Change Due</div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: colors.warning, letterSpacing: '-0.5px' }}>{formatCurrency(change)}</div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ padding: '16px 24px', borderTop: `1px solid ${colors.border}` }}>
                <button onClick={handleProcessPayment}
                  disabled={processing || !drawerOpen}
                  style={{
                    width: '100%', padding: '14px',
                    backgroundColor: (processing || !drawerOpen) ? colors.border : colors.success,
                    color: (processing || !drawerOpen) ? colors.textMuted : '#fff',
                    border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: '700',
                    cursor: (processing || !drawerOpen) ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.3px', textTransform: 'uppercase'
                  }}>
                  {processing ? 'Processing...' : !drawerOpen ? 'Open Drawer to Continue' : 'Confirm Payment'}
                </button>
                <button
                  onClick={() => { setSelectedOrder(null); setAmountReceived(''); setReferenceNumber(''); }}
                  style={{
                    width: '100%', padding: '10px', backgroundColor: 'transparent',
                    color: colors.textSecondary, border: `1px solid ${colors.border}`,
                    borderRadius: '4px', marginTop: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '13px'
                  }}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', backgroundColor: colors.bg,
                border: `2px dashed ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 19l-7-7 7-7" />
                </svg>
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: colors.textSecondary, marginBottom: '4px' }}>No Transaction Selected</div>
              <div style={{ fontSize: '12px', color: colors.textMuted, textAlign: 'center', lineHeight: '1.5' }}>Select an invoice from the queue to begin processing payment</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
