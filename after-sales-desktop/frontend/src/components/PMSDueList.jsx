import React, { useState } from 'react';
import { fetchJson } from '../utils/fetchJson';

const API_BASE = 'http://localhost:5000/api';

export default function PMSDueList({ customers, loading, onRefresh }) {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [contactModal, setContactModal] = useState(false);

  const getCreatedBy = () => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return 'SYSTEM';
      const user = JSON.parse(raw);
      return user?.username || user?.name || 'SYSTEM';
    } catch {
      return 'SYSTEM';
    }
  };

  const handleContactCustomer = (customer) => {
    setSelectedCustomer(customer);
    setContactModal(true);
  };

  const handleContactSubmit = async (method) => {
    try {
      const createdBy = getCreatedBy();

      if (method === 'sms') {
        const queueData = await fetchJson(`${API_BASE}/sms/queue-pms-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_ids: [selectedCustomer.id],
            created_by: createdBy
          })
        });

        if (!queueData || !queueData.success) {
          alert(`Failed to queue SMS for ${selectedCustomer.name}`);
          return;
        }

        const outboxIds = queueData.outbox_ids || [];

        await fetchJson(`${API_BASE}/scheduler/log-contact-attempt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: selectedCustomer.id,
            contact_type: 'sms',
            status: 'attempted',
            notes: `Queued SMS outbox_ids: ${outboxIds.join(', ')}`,
            created_by: createdBy
          })
        });

        alert(`SMS queued for ${selectedCustomer.name}`);
        setContactModal(false);
        setSelectedCustomer(null);
        return;
      }

      const responseData = await fetchJson(`${API_BASE}/scheduler/log-contact-attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          contact_type: method,
          status: 'attempted',
          created_by: createdBy
        })
      });

      if (responseData && responseData.success) {
        alert(`${method} attempt logged for ${selectedCustomer.name}`);
        setContactModal(false);
        setSelectedCustomer(null);
      }
    } catch (error) {
      console.error('Error logging contact:', error);
    }
  };

  return (
    <div className="pms-section">
      <div className="section-header flex-between">
        <h3>✓ PMS Due Customers</h3>
        <button className="btn btn-primary" onClick={onRefresh}>
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: '40px' }}>
          <div className="spinner"></div> Loading...
        </div>
      ) : customers.length === 0 ? (
        <div className="alert alert-info">No customers due for PMS at this time.</div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Contact</th>
                <th>Plate No.</th>
                <th>Vehicle</th>
                <th>Days Since Service</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>{customer.contact_no}</td>
                  <td>{customer.plate_no}</td>
                  <td>{customer.vehicle_model}</td>
                  <td>
                    <span className="badge badge-warning">{customer.days_since_service} days</span>
                  </td>
                  <td>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleContactCustomer(customer)}
                    >
                      📞 Contact
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {contactModal && selectedCustomer && (
        <div className="modal active">
          <div className="modal-content">
            <div className="modal-header">Contact {selectedCustomer.name}</div>
            <div className="form-group">
              <label className="form-label">Select Contact Method:</label>
              <div className="contact-methods">
                <button
                  className="btn btn-secondary btn-contact"
                  onClick={() => handleContactSubmit('call')}
                >
                  ☎️ Call
                </button>
                <button
                  className="btn btn-secondary btn-contact"
                  onClick={() => handleContactSubmit('sms')}
                >
                  📱 Queue SMS
                </button>
                <button
                  className="btn btn-secondary btn-contact"
                  onClick={() => handleContactSubmit('email')}
                >
                  📧 Email
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setContactModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
