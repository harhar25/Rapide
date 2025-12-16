import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

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

  const checkAvailability = async (date, time) => {
    try {
      const response = await fetch(`${API_BASE}/scheduler/check-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, time })
      });

      const data = await response.json();
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
      const response = await fetch(`${API_BASE}/scheduler/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          service_type: 'PMS',
          created_by: 'CRO001'
        })
      });

      const data = await response.json();
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
    <div className="appointment-section">
      <h3>📅 Contact & Appointment Setting</h3>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Customer ID</label>
              <input
                type="number"
                className="form-input"
                name="customer_id"
                value={formData.customer_id}
                onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                placeholder="Enter customer ID"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Preferred Date</label>
              <input
                type="date"
                className="form-input"
                name="scheduled_date"
                value={formData.scheduled_date}
                onChange={handleDateTimeChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Preferred Time</label>
              <input
                type="time"
                className="form-input"
                name="scheduled_time"
                value={formData.scheduled_time}
                onChange={handleDateTimeChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Service Bay</label>
              <select
                className="form-select"
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
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Technician</label>
              <select
                className="form-select"
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
            </div>

            <div className="form-group">
              <label className="form-label">Service Advisor</label>
              <select
                className="form-select"
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
            </div>
          </div>

          <div className="flex gap-10">
            <button type="submit" className="btn btn-success">
              ✓ Create Scheduling Order
            </button>
            <button
              type="button"
              className="btn btn-outline"
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
      </div>
    </div>
  );
}
