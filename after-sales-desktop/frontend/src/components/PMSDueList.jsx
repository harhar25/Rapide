import React, { useState } from 'react';

const API_BASE = 'http://localhost:5000/api';

export default function PMSDueList({ customers, loading, onRefresh }) {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [contactModal, setContactModal] = useState(false);

  const handleContactCustomer = (customer) => {
    setSelectedCustomer(customer);
    setContactModal(true);
  };

  const handleContactSubmit = async (method) => {
    try {
      const response = await fetch(`${API_BASE}/scheduler/log-contact-attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          contact_type: method,
          status: 'attempted',
          created_by: 'CRO001'
        })
      });

      if (response.ok) {
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
                  📱 SMS
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
