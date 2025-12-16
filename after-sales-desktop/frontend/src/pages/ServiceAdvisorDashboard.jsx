import React, { useState, useEffect } from 'react';
import '../styles/service-advisor-dashboard.css';

const ServiceAdvisorDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('appointments');
  const [appointments, setAppointments] = useState([]);
  const [serviceOrders, setServiceOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [cisForm, setCisForm] = useState({
    name: '',
    contact_no: '',
    email: '',
    address: '',
    vehicle_plate_no: '',
    vehicle_model: '',
    vehicle_year: '',
    engine_no: '',
    chassis_no: '',
    mileage_in: '',
    service_type: '',
    notes: ''
  });

  const [vrcForm, setVrcForm] = useState({
    mileage_in: '',
    mileage_out: '',
    exterior_condition: '',
    interior_condition: '',
    checklist_1_engine_starts: 'na',
    checklist_2_idle_smooth: 'na',
    checklist_3_acceleration: 'na',
    checklist_4_brakes: 'na',
    checklist_5_steering: 'na',
    checklist_6_lights: 'na',
    checklist_7_air_con: 'na',
    checklist_8_wipers: 'na',
    checklist_9_horn: 'na',
    checklist_10_handbrake: 'na',
    additional_findings: '',
    settings_restored: false,
    diagnosis_completed_by: user?.name || ''
  });

  const API_BASE = 'http://localhost:5000/api/service-advisor';

  // Load appointments on mount
  useEffect(() => {
    loadAppointments();
    loadServiceOrders();
  }, []);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/appointments/pending`);
      const data = await response.json();
      if (data.success) {
        setAppointments(data.data || []);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
    setLoading(false);
  };

  const loadServiceOrders = async () => {
    try {
      const response = await fetch(`${API_BASE}/service-orders/pending`);
      const data = await response.json();
      if (data.success) {
        setServiceOrders(data.data || []);
      }
    } catch (error) {
      console.error('Error loading service orders:', error);
    }
  };

  const handleCheckIn = async (appointmentId) => {
    try {
      const response = await fetch(`${API_BASE}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduling_order_id: appointmentId,
          advisor_id: user?.id || 1
        })
      });
      const data = await response.json();
      if (data.success) {
        setSelectedOrder(data.service_order_id);
        setActiveTab('check-in');
        loadAppointments();
        loadServiceOrders();
      }
    } catch (error) {
      console.error('Error checking in customer:', error);
    }
  };

  const handleSaveCIS = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/cis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...cisForm,
          service_order_id: selectedOrder,
          customer_id: 1, // Will come from selectedOrder details
          created_by: user?.name
        })
      });
      const data = await response.json();
      if (data.success) {
        setActiveTab('diagnosis');
      }
    } catch (error) {
      console.error('Error saving CIS:', error);
    }
  };

  const handleSaveVRC = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/vrc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...vrcForm,
          service_order_id: selectedOrder,
          customer_id: 1, // Will come from selectedOrder details
        })
      });
      const data = await response.json();
      if (data.success) {
        setActiveTab('service-order');
      }
    } catch (error) {
      console.error('Error saving VRC:', error);
    }
  };

  const handlePrintDocument = async (documentType) => {
    try {
      const response = await fetch(`${API_BASE}/documents/${selectedOrder}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_type: documentType,
          printed_by: user?.name
        })
      });
      const data = await response.json();
      if (data.success) {
        alert(`${documentType} printed successfully`);
      }
    } catch (error) {
      console.error('Error printing document:', error);
    }
  };

  return (
    <div className="sa-dashboard">
      <header className="sa-header">
        <div className="header-left">
          <h1>Service Advisor Module</h1>
          <p>Welcome, {user?.name}</p>
        </div>
        <button onClick={onLogout} className="logout-btn">Sign Out</button>
      </header>

      <div className="sa-content">
        {/* Tabs */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            Pending Appointments
          </button>
          <button 
            className={`tab ${activeTab === 'check-in' ? 'active' : ''}`}
            onClick={() => setActiveTab('check-in')}
          >
            Customer Check-In
          </button>
          <button 
            className={`tab ${activeTab === 'diagnosis' ? 'active' : ''}`}
            onClick={() => setActiveTab('diagnosis')}
          >
            Vehicle Diagnosis (VRC)
          </button>
          <button 
            className={`tab ${activeTab === 'service-order' ? 'active' : ''}`}
            onClick={() => setActiveTab('service-order')}
          >
            Service Order
          </button>
          <button 
            className={`tab ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            Document Management
          </button>
        </div>

        {/* TAB 1: Pending Appointments */}
        {activeTab === 'appointments' && (
          <div className="tab-content">
            <h2>Pending Scheduled Appointments</h2>
            <div className="appointments-list">
              {appointments.length > 0 ? (
                <table className="appointments-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th>Plate No.</th>
                      <th>Vehicle</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Service Type</th>
                      <th>Bay</th>
                      <th>Technician</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map(apt => (
                      <tr key={apt[0]}>
                        <td>{apt[2]}</td>
                        <td>{apt[3]}</td>
                        <td>{apt[4]}</td>
                        <td>{apt[5]}</td>
                        <td>{apt[6]}</td>
                        <td>{apt[7]}</td>
                        <td>{apt[8]}</td>
                        <td>{apt[10]}</td>
                        <td>{apt[11]}</td>
                        <td>
                          <button 
                            className="btn-check-in"
                            onClick={() => handleCheckIn(apt[0])}
                          >
                            Check In
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="empty-state">No pending appointments</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Customer Check-In & CIS */}
        {activeTab === 'check-in' && (
          <div className="tab-content">
            <h2>Customer Information Sheet (CIS)</h2>
            <form onSubmit={handleSaveCIS} className="cis-form">
              <div className="form-section">
                <h3>Customer Details</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Name *</label>
                    <input 
                      type="text" 
                      value={cisForm.name}
                      onChange={(e) => setCisForm({...cisForm, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact Number *</label>
                    <input 
                      type="tel" 
                      value={cisForm.contact_no}
                      onChange={(e) => setCisForm({...cisForm, contact_no: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input 
                      type="email" 
                      value={cisForm.email}
                      onChange={(e) => setCisForm({...cisForm, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <textarea 
                    value={cisForm.address}
                    onChange={(e) => setCisForm({...cisForm, address: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Vehicle Details</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Plate Number *</label>
                    <input 
                      type="text" 
                      value={cisForm.vehicle_plate_no}
                      onChange={(e) => setCisForm({...cisForm, vehicle_plate_no: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Model *</label>
                    <input 
                      type="text" 
                      value={cisForm.vehicle_model}
                      onChange={(e) => setCisForm({...cisForm, vehicle_model: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Year</label>
                    <input 
                      type="number" 
                      value={cisForm.vehicle_year}
                      onChange={(e) => setCisForm({...cisForm, vehicle_year: e.target.value})}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Engine No.</label>
                    <input 
                      type="text" 
                      value={cisForm.engine_no}
                      onChange={(e) => setCisForm({...cisForm, engine_no: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Chassis No.</label>
                    <input 
                      type="text" 
                      value={cisForm.chassis_no}
                      onChange={(e) => setCisForm({...cisForm, chassis_no: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Mileage In</label>
                    <input 
                      type="number" 
                      value={cisForm.mileage_in}
                      onChange={(e) => setCisForm({...cisForm, mileage_in: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Service Details</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Service Type</label>
                    <select 
                      value={cisForm.service_type}
                      onChange={(e) => setCisForm({...cisForm, service_type: e.target.value})}
                    >
                      <option value="">Select service type</option>
                      <option value="PMS">PMS</option>
                      <option value="Breakdown">Breakdown</option>
                      <option value="Warranty">Warranty</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea 
                    value={cisForm.notes}
                    onChange={(e) => setCisForm({...cisForm, notes: e.target.value})}
                  />
                </div>
              </div>

              <button type="submit" className="btn-save">Save CIS & Continue to Diagnosis</button>
            </form>
          </div>
        )}

        {/* TAB 3: Vehicle Diagnosis (VRC) */}
        {activeTab === 'diagnosis' && (
          <div className="tab-content">
            <h2>Vehicle Report Card (VRC) - 10-Point Diagnosis</h2>
            <form onSubmit={handleSaveVRC} className="vrc-form">
              <div className="form-section">
                <h3>Mileage & Condition</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Mileage In</label>
                    <input 
                      type="number" 
                      value={vrcForm.mileage_in}
                      onChange={(e) => setVrcForm({...vrcForm, mileage_in: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Mileage Out</label>
                    <input 
                      type="number" 
                      value={vrcForm.mileage_out}
                      onChange={(e) => setVrcForm({...vrcForm, mileage_out: e.target.value})}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Exterior Condition</label>
                  <textarea 
                    value={vrcForm.exterior_condition}
                    onChange={(e) => setVrcForm({...vrcForm, exterior_condition: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Interior Condition</label>
                  <textarea 
                    value={vrcForm.interior_condition}
                    onChange={(e) => setVrcForm({...vrcForm, interior_condition: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>10-Point Checklist</h3>
                <div className="checklist-items">
                  {[
                    {key: 'checklist_1_engine_starts', label: '1. Engine Starts Properly'},
                    {key: 'checklist_2_idle_smooth', label: '2. Idle Smooth'},
                    {key: 'checklist_3_acceleration', label: '3. Acceleration Normal'},
                    {key: 'checklist_4_brakes', label: '4. Brakes Function'},
                    {key: 'checklist_5_steering', label: '5. Steering Responsive'},
                    {key: 'checklist_6_lights', label: '6. All Lights Work'},
                    {key: 'checklist_7_air_con', label: '7. Air Conditioning'},
                    {key: 'checklist_8_wipers', label: '8. Wipers Function'},
                    {key: 'checklist_9_horn', label: '9. Horn Works'},
                    {key: 'checklist_10_handbrake', label: '10. Handbrake Holds'}
                  ].map(item => (
                    <div key={item.key} className="checklist-item">
                      <label>{item.label}</label>
                      <select 
                        value={vrcForm[item.key]}
                        onChange={(e) => setVrcForm({...vrcForm, [item.key]: e.target.value})}
                      >
                        <option value="na">N/A</option>
                        <option value="pass">✓ Pass</option>
                        <option value="fail">✗ Fail</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3>Additional Findings</h3>
                <div className="form-group">
                  <label>Findings</label>
                  <textarea 
                    value={vrcForm.additional_findings}
                    onChange={(e) => setVrcForm({...vrcForm, additional_findings: e.target.value})}
                    placeholder="Any additional observations or issues found..."
                  />
                </div>
                <div className="form-group">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={vrcForm.settings_restored}
                      onChange={(e) => setVrcForm({...vrcForm, settings_restored: e.target.checked})}
                    />
                    Settings Restored to Customer Defaults
                  </label>
                </div>
              </div>

              <button type="submit" className="btn-save">Save Diagnosis & Create Service Order</button>
            </form>
          </div>
        )}

        {/* TAB 4: Service Order */}
        {activeTab === 'service-order' && (
          <div className="tab-content">
            <h2>Service Orders</h2>
            {serviceOrders.length > 0 ? (
              <table className="service-orders-table">
                <thead>
                  <tr>
                    <th>SO ID</th>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Plate No.</th>
                    <th>Service Type</th>
                    <th>Check-In Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceOrders.map(so => (
                    <tr key={so[0]}>
                      <td>SO-{String(so[0]).padStart(5, '0')}</td>
                      <td>{so[2]}</td>
                      <td>{so[3]}</td>
                      <td>{so[4]}</td>
                      <td>{so[5]}</td>
                      <td>{so[7]}</td>
                      <td><span className="status-badge">{so[8]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-state">No service orders</p>
            )}
          </div>
        )}

        {/* TAB 5: Document Management */}
        {activeTab === 'documents' && (
          <div className="tab-content">
            <h2>Document Management</h2>
            <div className="documents-section">
              <h3>Available Documents to Print</h3>
              <div className="documents-grid">
                {[
                  {type: 'service-order', label: 'Service Order', icon: '📄'},
                  {type: 'confirmation', label: 'Service Confirmation', icon: '✓'},
                  {type: 'picklist', label: 'Service Picklist', icon: '📋'},
                  {type: 'vrc', label: 'Vehicle Report Card', icon: '🔍'},
                  {type: 'cis', label: 'Customer Info Sheet', icon: '👤'},
                  {type: 'estimate', label: 'Service Estimate', icon: '💰'}
                ].map(doc => (
                  <button 
                    key={doc.type}
                    className="document-card"
                    onClick={() => handlePrintDocument(doc.type)}
                  >
                    <div className="doc-icon">{doc.icon}</div>
                    <div className="doc-label">{doc.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="sa-footer">
        <p>© 2025 <em>Rapide</em> Service Advisor Module</p>
      </footer>
    </div>
  );
};

export default ServiceAdvisorDashboard;
