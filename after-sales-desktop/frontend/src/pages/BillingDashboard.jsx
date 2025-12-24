import React, { useState, useEffect } from 'react';
import '../styles/billing-dashboard.css';
import { fetchJson } from '../utils/fetchJson';

export default function BillingDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [paidInvoices, setPaidInvoices] = useState([]);
  const [overdueInvoices, setOverdueInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Modal states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Form states
  const [createForm, setCreateForm] = useState({
    service_order_id: '',
    customer_id: '',
    labor_hours: 0,
    labor_rate: 50,
    materials_cost: 0,
    parts_cost: 0,
    parking_cost: 0,
    discount: 0
  });
  
  const [paymentForm, setPaymentForm] = useState({
    payment_amount: 0,
    payment_method: 'cash',
    reference_number: ''
  });

  // Load data on mount
  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPendingInvoices(),
        loadPaidInvoices(),
        loadOverdueInvoices(),
        loadSummary()
      ]);
    } catch (err) {
      setErrorMessage('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingInvoices = async () => {
    try {
      const result = await fetchJson('/api/billing/invoices/pending');
      if (result.success) {
        setPendingInvoices(result.data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadPaidInvoices = async () => {
    try {
      const result = await fetchJson('/api/billing/invoices/paid');
      if (result.success) {
        setPaidInvoices(result.data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadOverdueInvoices = async () => {
    try {
      const result = await fetchJson('/api/billing/invoices/overdue');
      if (result.success) {
        setOverdueInvoices(result.data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadSummary = async () => {
    try {
      const result = await fetchJson('/api/billing/summary');
      if (result.success) {
        setSummary(result.data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadInvoiceDetails = async (invoiceId) => {
    try {
      const result = await fetchJson(`/api/billing/invoices/${invoiceId}`);
      if (result.success) {
        setInvoiceDetails(result.data);
      }
    } catch (error) {
      setErrorMessage('Failed to load invoice details');
    }
  };

  const handleViewInvoice = async (invoice) => {
    setSelectedInvoice(invoice);
    await loadInvoiceDetails(invoice.id);
    setShowInvoiceModal(true);
  };

  const handleRecordPayment = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      payment_amount: 0,
      payment_method: 'cash',
      reference_number: ''
    });
    setShowPaymentModal(true);
  };

  const handleSubmitPayment = async () => {
    try {
      const result = await fetchJson(`/api/billing/invoices/${selectedInvoice.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentForm,
          created_by: user.id
        })
      });

      if (result.success) {
        setSuccessMessage('Payment recorded successfully');
        setShowPaymentModal(false);
        setTimeout(() => {
          setSuccessMessage('');
          loadAllData();
        }, 2000);
      } else {
        setErrorMessage(result.message);
      }
    } catch (error) {
      setErrorMessage('Error recording payment: ' + error.message);
    }
  };

  const handleIssueInvoice = async (invoiceId) => {
    try {
      const result = await fetchJson(`/api/billing/invoices/${invoiceId}/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (result.success) {
        setSuccessMessage('Invoice issued');
        setTimeout(() => {
          setSuccessMessage('');
          loadAllData();
          setShowInvoiceModal(false);
        }, 1500);
      } else {
        setErrorMessage(result.message);
      }
    } catch (error) {
      setErrorMessage('Error issuing invoice: ' + error.message);
    }
  };

  const handleCreateInvoice = async () => {
    try {
      const result = await fetchJson('/api/billing/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      });

      if (result.success) {
        setSuccessMessage('Invoice created');
        setShowCreateModal(false);
        setTimeout(() => {
          setSuccessMessage('');
          loadAllData();
        }, 2000);
      } else {
        setErrorMessage(result.message);
      }
    } catch (error) {
      setErrorMessage('Error creating invoice: ' + error.message);
    }
  };

  return (
    <div className="billing-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>💰 Billing Management</h1>
          <p>Invoice Generation & Payment Tracking</p>
        </div>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>

      {/* Messages */}
      {errorMessage && <div className="error-message">{errorMessage}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      {/* Summary Cards */}
      {summary && (
        <div className="summary-cards">
          <div className="card draft">
            <div className="card-value">{summary.draft_count}</div>
            <div className="card-label">Draft Invoices</div>
          </div>
          <div className="card issued">
            <div className="card-value">{summary.issued_count}</div>
            <div className="card-label">Issued</div>
          </div>
          <div className="card partial">
            <div className="card-value">{summary.partial_paid_count}</div>
            <div className="card-label">Partial Paid</div>
          </div>
          <div className="card paid">
            <div className="card-value">{summary.paid_count}</div>
            <div className="card-label">Paid</div>
          </div>
          <div className="card pending">
            <div className="card-value">${summary.pending_amount.toFixed(2)}</div>
            <div className="card-label">Pending Amount</div>
          </div>
          <div className="card overdue">
            <div className="card-value">${summary.overdue_amount.toFixed(2)}</div>
            <div className="card-label">Overdue Amount</div>
          </div>
          <div className="card paid-total">
            <div className="card-value">${summary.paid_amount.toFixed(2)}</div>
            <div className="card-label">Total Paid</div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        <button 
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Create Invoice
        </button>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          📋 Pending ({pendingInvoices.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'overdue' ? 'active' : ''}`}
          onClick={() => setActiveTab('overdue')}
        >
          ⚠️ Overdue ({overdueInvoices.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'paid' ? 'active' : ''}`}
          onClick={() => setActiveTab('paid')}
        >
          ✓ Paid ({paidInvoices.length})
        </button>
      </div>

      {/* Content */}
      <div className="dashboard-content">
        {/* Pending Tab */}
        {activeTab === 'pending' && (
          <div className="tab-content">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Plate No</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvoices.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center' }}>No pending invoices</td></tr>
                ) : (
                  pendingInvoices.map((inv, idx) => (
                    <tr key={idx}>
                      <td><strong>{inv.invoice_no}</strong></td>
                      <td>{inv.customer}</td>
                      <td>{inv.plate_no}</td>
                      <td>${inv.total.toFixed(2)}</td>
                      <td><span className={`status-badge ${inv.status}`}>{inv.status}</span></td>
                      <td>{new Date(inv.due_date).toLocaleDateString()}</td>
                      <td>
                        <button className="btn-action btn-view" onClick={() => handleViewInvoice(inv)}>View</button>
                        <button className="btn-action btn-payment" onClick={() => handleRecordPayment(inv)}>Payment</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Overdue Tab */}
        {activeTab === 'overdue' && (
          <div className="tab-content">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Plate No</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Days Overdue</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {overdueInvoices.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center' }}>No overdue invoices</td></tr>
                ) : (
                  overdueInvoices.map((inv, idx) => (
                    <tr key={idx} className="overdue-row">
                      <td><strong>{inv.invoice_no}</strong></td>
                      <td>{inv.customer}</td>
                      <td>{inv.plate_no}</td>
                      <td>${inv.total.toFixed(2)}</td>
                      <td>{new Date(inv.due_date).toLocaleDateString()}</td>
                      <td><span className="days-overdue">{inv.days_overdue} days</span></td>
                      <td>
                        <button className="btn-action btn-view" onClick={() => handleViewInvoice(inv)}>View</button>
                        <button className="btn-action btn-payment" onClick={() => handleRecordPayment(inv)}>Payment</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Paid Tab */}
        {activeTab === 'paid' && (
          <div className="tab-content">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Plate No</th>
                  <th>Amount</th>
                  <th>Invoice Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paidInvoices.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center' }}>No paid invoices</td></tr>
                ) : (
                  paidInvoices.map((inv, idx) => (
                    <tr key={idx}>
                      <td><strong>{inv.invoice_no}</strong></td>
                      <td>{inv.customer}</td>
                      <td>{inv.plate_no}</td>
                      <td>${inv.total.toFixed(2)}</td>
                      <td>{new Date(inv.invoice_date).toLocaleDateString()}</td>
                      <td>
                        <button className="btn-action btn-view" onClick={() => handleViewInvoice(inv)}>View</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Details Modal */}
      {showInvoiceModal && invoiceDetails && (
        <div className="modal-overlay" onClick={() => setShowInvoiceModal(false)}>
          <div className="modal-content invoice-modal" onClick={e => e.stopPropagation()}>
            <h2>Invoice {invoiceDetails.invoice_no}</h2>
            
            <div className="invoice-header">
              <div className="invoice-info">
                <p><strong>Customer:</strong> {invoiceDetails.customer_name}</p>
                <p><strong>Invoice Date:</strong> {new Date(invoiceDetails.invoice_date).toLocaleDateString()}</p>
                <p><strong>Due Date:</strong> {new Date(invoiceDetails.due_date).toLocaleDateString()}</p>
                <p><strong>Status:</strong> <span className={`status-badge ${invoiceDetails.status}`}>{invoiceDetails.status}</span></p>
              </div>
            </div>

            <div className="invoice-items">
              <h3>Charges</h3>
              <table>
                <tbody>
                  {invoiceDetails.labor_hours > 0 && (
                    <tr>
                      <td>Labor ({invoiceDetails.labor_hours}h × ${invoiceDetails.labor_rate})</td>
                      <td>${invoiceDetails.labor_cost.toFixed(2)}</td>
                    </tr>
                  )}
                  {invoiceDetails.materials_cost > 0 && (
                    <tr>
                      <td>Materials</td>
                      <td>${invoiceDetails.materials_cost.toFixed(2)}</td>
                    </tr>
                  )}
                  {invoiceDetails.parts_cost > 0 && (
                    <tr>
                      <td>Parts</td>
                      <td>${invoiceDetails.parts_cost.toFixed(2)}</td>
                    </tr>
                  )}
                  {invoiceDetails.parking_cost > 0 && (
                    <tr>
                      <td>Parking</td>
                      <td>${invoiceDetails.parking_cost.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="invoice-summary">
              {invoiceDetails.discount > 0 && (
                <div><strong>Discount:</strong> -${invoiceDetails.discount.toFixed(2)}</div>
              )}
              <div><strong>Tax:</strong> ${invoiceDetails.tax.toFixed(2)}</div>
              <div className="total"><strong>Total:</strong> ${invoiceDetails.total.toFixed(2)}</div>
            </div>

            {invoiceDetails.payments.length > 0 && (
              <div className="payments-section">
                <h3>Payments</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Method</th>
                      <th>Amount</th>
                      <th>Received By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceDetails.payments.map((p, idx) => (
                      <tr key={idx}>
                        <td>{new Date(p.date).toLocaleDateString()}</td>
                        <td>{p.method}</td>
                        <td>${p.amount.toFixed(2)}</td>
                        <td>{p.received_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-buttons">
              {invoiceDetails.status === 'draft' && (
                <button 
                  className="btn-submit"
                  onClick={() => handleIssueInvoice(invoiceDetails.id)}
                >
                  Issue Invoice
                </button>
              )}
              <button 
                className="btn-cancel"
                onClick={() => setShowInvoiceModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Record Payment</h2>
            <p>Invoice: <strong>{selectedInvoice?.invoice_no}</strong> | Amount Due: <strong>${selectedInvoice?.total.toFixed(2)}</strong></p>
            
            <form>
              <label>Payment Amount:
                <input 
                  type="number"
                  value={paymentForm.payment_amount}
                  onChange={(e) => setPaymentForm({...paymentForm, payment_amount: parseFloat(e.target.value)})}
                  step="0.01"
                  min="0"
                />
              </label>
              <label>Payment Method:
                <select 
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="check">Check</option>
                  <option value="bank-transfer">Bank Transfer</option>
                  <option value="mobile-money">Mobile Money</option>
                </select>
              </label>
              <label>Reference Number:
                <input 
                  type="text"
                  value={paymentForm.reference_number}
                  onChange={(e) => setPaymentForm({...paymentForm, reference_number: e.target.value})}
                  placeholder="Receipt #, Check #, etc."
                />
              </label>
              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button type="button" className="btn-submit" onClick={handleSubmitPayment}>Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Create Invoice</h2>
            <form>
              <label>Service Order ID:
                <input 
                  type="number"
                  value={createForm.service_order_id}
                  onChange={(e) => setCreateForm({...createForm, service_order_id: parseInt(e.target.value)})}
                />
              </label>
              <label>Customer ID:
                <input 
                  type="number"
                  value={createForm.customer_id}
                  onChange={(e) => setCreateForm({...createForm, customer_id: parseInt(e.target.value)})}
                />
              </label>
              <label>Labor Hours:
                <input 
                  type="number"
                  value={createForm.labor_hours}
                  onChange={(e) => setCreateForm({...createForm, labor_hours: parseFloat(e.target.value)})}
                  step="0.5"
                />
              </label>
              <label>Labor Rate ($/hr):
                <input 
                  type="number"
                  value={createForm.labor_rate}
                  onChange={(e) => setCreateForm({...createForm, labor_rate: parseFloat(e.target.value)})}
                />
              </label>
              <label>Materials Cost:
                <input 
                  type="number"
                  value={createForm.materials_cost}
                  onChange={(e) => setCreateForm({...createForm, materials_cost: parseFloat(e.target.value)})}
                  step="0.01"
                />
              </label>
              <label>Parts Cost:
                <input 
                  type="number"
                  value={createForm.parts_cost}
                  onChange={(e) => setCreateForm({...createForm, parts_cost: parseFloat(e.target.value)})}
                  step="0.01"
                />
              </label>
              <label>Parking Cost:
                <input 
                  type="number"
                  value={createForm.parking_cost}
                  onChange={(e) => setCreateForm({...createForm, parking_cost: parseFloat(e.target.value)})}
                  step="0.01"
                />
              </label>
              <label>Discount:
                <input 
                  type="number"
                  value={createForm.discount}
                  onChange={(e) => setCreateForm({...createForm, discount: parseFloat(e.target.value)})}
                  step="0.01"
                />
              </label>
              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="button" className="btn-submit" onClick={handleCreateInvoice}>Create Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="dashboard-footer">
        <p>*Rapide Services - Billing Module | {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}
