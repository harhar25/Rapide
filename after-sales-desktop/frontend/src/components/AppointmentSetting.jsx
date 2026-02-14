import React, { useState, useEffect } from 'react';
import { fetchJson } from '../utils/fetchJson';
import { EnterpriseCard, FormGroup } from './EnterpriseComponents';

const API_BASE = '/api';

export default function AppointmentSetting() {
  const [formData, setFormData] = useState({
    customer_id: '',
    scheduled_date: '',
    scheduled_time: '',
    bay_id: '',
    technician_id: '',
    advisor_id: ''
  });

  const [availability, setAvailability] = useState({
    available_bays: [],
    available_technicians: [],
    available_advisors: []
  });

  const handleDateTimeChange = async (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);

    if (newFormData.scheduled_date && newFormData.scheduled_time) {
      await checkAvailability(newFormData.scheduled_date, newFormData.scheduled_time);
    }
  };

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

  const checkAvailability = async (date, time) => {
    try {
      const data = await fetchJson(`${API_BASE}/scheduler/check-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, time })
      });
      if (data.success) {
        setAvailability(data.data);
      }
    } catch (error) {
      console.error('Error checking availability:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer_id || !formData.bay_id || !formData.technician_id || !formData.advisor_id) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const createdBy = getCreatedBy();
      const data = await fetchJson(`${API_BASE}/scheduler/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          service_type: 'PMS',
          created_by: createdBy
        })
      });
      if (data.success) {
        alert(`✓ Scheduling Order #${data.order_id} created successfully`);
        setFormData({
          customer_id: '',
          scheduled_date: '',
          scheduled_time: '',
          bay_id: '',
          technician_id: '',
          advisor_id: ''
        });
      }
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  return (
    <EnterpriseCard title="New Appointment" subtitle="Schedule maintenance or repair for a customer">
        <form onSubmit={handleSubmit}>
          <div className="dashboard-grid dashboard-grid-2">
            <FormGroup label="Customer ID" required>
              <input
                type="number"
                className="form-input"
                name="customer_id"
                value={formData.customer_id}
                onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                placeholder="Enter customer ID"
                required
              />
            </FormGroup>

            <FormGroup label="Preferred Date" required>
              <input
                type="date"
                className="form-input"
                name="scheduled_date"
                value={formData.scheduled_date}
                onChange={handleDateTimeChange}
                required
              />
            </FormGroup>

            <FormGroup label="Preferred Time" required>
              <input
                type="time"
                className="form-input"
                name="scheduled_time"
                value={formData.scheduled_time}
                onChange={handleDateTimeChange}
                required
              />
            </FormGroup>

            <FormGroup label="Service Bay" required>
              <select
                className="form-input"
                name="bay_id"
                value={formData.bay_id}
                onChange={(e) => setFormData({...formData, bay_id: e.target.value})}
                required
              >
                <option value="">-- Select Bay --</option>
                {availability.available_bays?.map((bay) => (
                  <option key={bay.id} value={bay.id}>
                    {bay.bay_name} (Capacity: {bay.capacity})
                  </option>
                ))}
              </select>
            </FormGroup>

            <FormGroup label="Technician" required>
              <select
                className="form-input"
                name="technician_id"
                value={formData.technician_id}
                onChange={(e) => setFormData({...formData, technician_id: e.target.value})}
                required
              >
                <option value="">-- Select Technician --</option>
                {availability.available_technicians?.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name} ({tech.specialization})
                  </option>
                ))}
              </select>
            </FormGroup>

            <FormGroup label="Service Advisor" required>
              <select
                className="form-input"
                name="advisor_id"
                value={formData.advisor_id}
                onChange={(e) => setFormData({...formData, advisor_id: e.target.value})}
                required
              >
                <option value="">-- Select Advisor --</option>
                {availability.available_advisors?.map((advisor) => (
                  <option key={advisor.id} value={advisor.id}>
                    {advisor.name}
                  </option>
                ))}
              </select>
            </FormGroup>
          </div>

          <div style={{ marginTop: 'var(--spacing-6)', display: 'flex', gap: 'var(--spacing-3)' }}>
            <button type="submit" className="btn-enterprise btn-primary">
              Create Schedule
            </button>
            <button
              type="button"
              className="btn-enterprise btn-secondary"
              onClick={() =>
                setFormData({
                  customer_id: '',
                  scheduled_date: '',
                  scheduled_time: '',
                  bay_id: '',
                  technician_id: '',
                  advisor_id: ''
                })
              }
            >
              Clear
            </button>
          </div>
        </form>
    </EnterpriseCard>
  );
}
