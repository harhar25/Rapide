import React, { useState, useEffect } from 'react';
import '../styles/cashier-dashboard.css';
import { fetchJson } from '../utils/fetchJson';

export default function CashierDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('invoices');
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [dailyTransactions, setDailyTransactions] = useState([]);
  const [dailySummary, setDailySummary] = useState(null);
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDrawerModal, setShowDrawerModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: 'cash',
    reference_number: ''
  });
  
  const [drawerForm, setDrawerForm] = useState({
    opening_balance: 0,
    cash_counted: 0,
    notes: ''
  });

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      loadPendingInvoices(),
      loadDailyTransactions(),
      loadDailySummary(),
      loadActiveDrawer()
    ]);
  };

  const loadPendingInvoices = async () => {
    try {
      const result = await fetchJson('/api/cashier/invoices/pending');
      if (result.success) setPendingInvoices(result.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadDailyTransactions = async () => {
    try {
      const result = await fetchJson('/api/cashier/transactions/daily');
      if (result.success) setDailyTransactions(result.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadDailySummary = async () => {
    try {
      const result = await fetchJson('/api/cashier/summary/daily');
      if (result.success) setDailySummary(result.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadActiveDrawer = async () => {
    try {
      const result = await fetchJson(`/api/cashier/drawer/active?cashier_id=${user.id}`);
      if (result.success) setActiveDrawer(result.data);
    } catch (error) {
      setActiveDrawer(null);
    }
  };

  const handleRecordPayment = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({ amount: invoice.remaining, payment_method: 'cash', reference_number: '' });
    setShowPaymentModal(true);
  };

  const handleSubmitPayment = async () => {
    try {
      const customerId = selectedInvoice?.customer_id ?? selectedInvoice?.customerId;
      const result = await fetchJson('/api/cashier/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: selectedInvoice.id,
          customer_id: customerId,
          amount: paymentForm.amount,
          payment_method: paymentForm.payment_method,
          reference_number: paymentForm.reference_number,
          created_by: user.id
        })
      });

      if (result.success) {
        setSuccessMessage('Payment recorded');
        setShowPaymentModal(false);
        setTimeout(() => {
          setSuccessMessage('');
          loadAllData();
        }, 2000);
      } else {
        setErrorMessage(result.message);
      }
    } catch (error) {
      setErrorMessage('Error: ' + error.message);
    }
  };

  const handleOpenDrawer = async () => {
    try {
      const result = await fetchJson('/api/cashier/drawer/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashier_id: user.id,
          opening_balance: drawerForm.opening_balance
        })
      });

      if (result.success) {
        setSuccessMessage('Drawer opened');
        setShowDrawerModal(false);
        setTimeout(() => {
          setSuccessMessage('');
          loadAllData();
        }, 1500);
      }
    } catch (error) {
      setErrorMessage('Error: ' + error.message);
    }
  };

  const handleCloseDrawer = async () => {
    if (!activeDrawer) return;
    try {
      const result = await fetchJson(`/api/cashier/drawer/${activeDrawer.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cash_counted: drawerForm.cash_counted,
          notes: drawerForm.notes
        })
      });

      if (result.success) {
        setSuccessMessage('Drawer closed');
        setShowDrawerModal(false);
        setTimeout(() => {
          setSuccessMessage('');
          loadAllData();
        }, 1500);
      }
    } catch (error) {
      setErrorMessage('Error: ' + error.message);
    }
  };

  return (
    <div className="cashier-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>💳 Cashier Operations</h1>
          <p>Payment Collection & Cash Management</p>
        </div>
        {user?.role !== 'admin' && (
          <button onClick={onLogout} className="logout-btn">Logout</button>
        )}
      </div>

      {errorMessage && <div className="error-message">{errorMessage}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      {activeDrawer && (
        <div className="drawer-status">
          ✓ Cash drawer open since {new Date(activeDrawer.opening_time).toLocaleTimeString()}
          <button onClick={() => { setShowDrawerModal(true); setDrawerForm({...drawerForm}); }}>Close Drawer</button>
        </div>
      )}

      {!activeDrawer && (
        <div className="drawer-status alert">
          ⚠ No active cash drawer. 
          <button onClick={() => setShowDrawerModal(true)}>Open Drawer</button>
        </div>
      )}

      {dailySummary && (
        <div className="summary-cards">
          <div className="card total"><div className="card-value">${dailySummary.grand_total.toFixed(2)}</div><div className="card-label">Total Collected</div></div>
          <div className="card cash"><div className="card-value">${dailySummary.cash_total.toFixed(2)}</div><div className="card-label">Cash</div></div>
          <div className="card card-type"><div className="card-value">${dailySummary.card_total.toFixed(2)}</div><div className="card-label">Card</div></div>
          <div className="card check"><div className="card-value">${dailySummary.check_total.toFixed(2)}</div><div className="card-label">Check</div></div>
          <div className="card transactions"><div className="card-value">{dailySummary.total_transactions}</div><div className="card-label">Transactions</div></div>
        </div>
      )}

      <div className="dashboard-tabs">
        <button className={`tab-button ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')}>📋 Pending Invoices</button>
        <button className={`tab-button ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>🧾 Daily Transactions</button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'invoices' && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Amount Due</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingInvoices.map((inv, idx) => (
                <tr key={idx}>
                  <td>{inv.invoice_no}</td>
                  <td>{inv.customer}</td>
                  <td>${inv.total.toFixed(2)}</td>
                  <td>${inv.paid.toFixed(2)}</td>
                  <td>${inv.remaining.toFixed(2)}</td>
                  <td><button className="btn-action" onClick={() => handleRecordPayment(inv)}>Record Payment</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'transactions' && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Received By</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {dailyTransactions.map((trans, idx) => (
                <tr key={idx}>
                  <td>{trans.reference}</td>
                  <td>{trans.customer}</td>
                  <td>${trans.amount.toFixed(2)}</td>
                  <td>{trans.method}</td>
                  <td>{trans.received_by}</td>
                  <td>{new Date(trans.timestamp).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Record Payment</h2>
            <form>
              <label>Amount: <input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value)})} step="0.01" /></label>
              <label>Method: <select value={paymentForm.payment_method} onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})}>
                <option>cash</option><option>card</option><option>check</option><option>bank-transfer</option><option>mobile-money</option>
              </select></label>
              <label>Reference: <input type="text" value={paymentForm.reference_number} onChange={(e) => setPaymentForm({...paymentForm, reference_number: e.target.value})} /></label>
              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button type="button" className="btn-submit" onClick={handleSubmitPayment}>Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDrawerModal && (
        <div className="modal-overlay" onClick={() => setShowDrawerModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{activeDrawer ? 'Close Drawer' : 'Open Drawer'}</h2>
            <form>
              {!activeDrawer ? (
                <>
                  <label>Opening Balance: <input type="number" value={drawerForm.opening_balance} onChange={(e) => setDrawerForm({...drawerForm, opening_balance: parseFloat(e.target.value)})} step="0.01" /></label>
                  <div className="modal-buttons">
                    <button type="button" className="btn-cancel" onClick={() => setShowDrawerModal(false)}>Cancel</button>
                    <button type="button" className="btn-submit" onClick={handleOpenDrawer}>Open Drawer</button>
                  </div>
                </>
              ) : (
                <>
                  <label>Cash Counted: <input type="number" value={drawerForm.cash_counted} onChange={(e) => setDrawerForm({...drawerForm, cash_counted: parseFloat(e.target.value)})} step="0.01" /></label>
                  <label>Notes: <textarea value={drawerForm.notes} onChange={(e) => setDrawerForm({...drawerForm, notes: e.target.value})} rows="3" /></label>
                  <div className="modal-buttons">
                    <button type="button" className="btn-cancel" onClick={() => setShowDrawerModal(false)}>Cancel</button>
                    <button type="button" className="btn-submit" onClick={handleCloseDrawer}>Close Drawer</button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      <div className="dashboard-footer">
        <p>*Rapide Services - Cashier Module | {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}
