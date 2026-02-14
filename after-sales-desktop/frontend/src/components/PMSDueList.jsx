import React, { useState } from 'react';
import { fetchJson } from '../utils/fetchJson';
import { EnterpriseTable, StatusBadge, Modal, EmptyState, LoadingSpinner } from './EnterpriseComponents';

const API_BASE = '/api';

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

  const columns = [
    { key: 'name', label: 'Customer Name', render: (val) => <span className="font-medium">{val}</span> },
    { key: 'contact_no', label: 'Contact', render: (val) => <span className="text-secondary">{val || '—'}</span> },
    { key: 'plate_no', label: 'Plate No.', render: (val) => <code className="enterprise-badge badge-neutral">{val}</code> },
    { key: 'vehicle_model', label: 'Vehicle' },
    { 
      key: 'days_since_service', 
      label: 'Elapsed',
      render: (val) => <StatusBadge status="warning">{val} days</StatusBadge>
    },
    {
      key: 'actions',
      label: 'Action',
      render: (_, row) => (
        <button
          className="btn-enterprise btn-sm btn-primary"
          onClick={() => handleContactCustomer(row)}
        >
          Contact
        </button>
      )
    }
  ];

  if (loading) return <LoadingSpinner />;

  if (!customers || customers.length === 0) {
    return <EmptyState icon="📅" title="No PMS Due" description="No customers are currently due for maintenance." />;
  }

  return (
    <>
      <EnterpriseTable columns={columns} data={customers} />

      <Modal 
        isOpen={contactModal && !!selectedCustomer}
        onClose={() => setContactModal(false)}
        title={`Contact ${selectedCustomer?.name}`}
        footer={
           <button className="btn-enterprise btn-secondary" onClick={() => setContactModal(false)}>
              Cancel
           </button>
        }
      >
        <div style={{ display: 'grid', gap: '1rem' }}>
            <p className="text-secondary">Choose a communication channel to reach this customer.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <button
                  className="btn-enterprise btn-secondary"
                  style={{ flexDirection: 'column', padding: '1.5rem', gap: '0.5rem' }}
                  onClick={() => handleContactSubmit('call')}
                >
                  <span style={{ fontSize: '1.5rem' }}>☎️</span>
                  <span>Call</span>
                </button>
                <button
                  className="btn-enterprise btn-secondary"
                  style={{ flexDirection: 'column', padding: '1.5rem', gap: '0.5rem' }}
                  onClick={() => handleContactSubmit('sms')}
                >
                  <span style={{ fontSize: '1.5rem' }}>📱</span>
                  <span>SMS</span>
                </button>
                <button
                  className="btn-enterprise btn-secondary"
                  style={{ flexDirection: 'column', padding: '1.5rem', gap: '0.5rem' }}
                  onClick={() => handleContactSubmit('email')}
                >
                  <span style={{ fontSize: '1.5rem' }}>📧</span>
                  <span>Email</span>
                </button>
            </div>
        </div>
      </Modal>
    </>
  );
}
