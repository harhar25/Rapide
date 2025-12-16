import React, { useState, useEffect } from 'react';
import '../styles/job-controller-dashboard.css';

const JobControllerDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('pending-orders');
  const [pendingOrders, setPendingOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [availableTechs, setAvailableTechs] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedTech, setSelectedTech] = useState(null);
  const [loading, setLoading] = useState(false);

  const [laborSummary, setLaborSummary] = useState(null);
  const [clockRecords, setClockRecords] = useState([]);

  const API_BASE = 'http://localhost:5000/api/job-controller';

  // Load data on mount
  useEffect(() => {
    loadPendingOrders();
    loadActiveOrders();
    loadAvailableTechs();
  }, []);

  const loadPendingOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/service-orders/pending`);
      const data = await response.json();
      if (data.success) {
        setPendingOrders(data.data || []);
      }
    } catch (error) {
      console.error('Error loading pending orders:', error);
    }
    setLoading(false);
  };

  const loadActiveOrders = async () => {
    try {
      const response = await fetch(`${API_BASE}/service-orders/active`);
      const data = await response.json();
      if (data.success) {
        setActiveOrders(data.data || []);
      }
    } catch (error) {
      console.error('Error loading active orders:', error);
    }
  };

  const loadAvailableTechs = async () => {
    try {
      const response = await fetch(`${API_BASE}/technicians/available`);
      const data = await response.json();
      if (data.success) {
        setAvailableTechs(data.data || []);
      }
    } catch (error) {
      console.error('Error loading technicians:', error);
    }
  };

  const handleAssignTechnician = async () => {
    if (!selectedOrder || !selectedTech) {
      alert('Please select order and technician');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_order_id: selectedOrder[0],
          technician_id: selectedTech[0],
          assigned_by: user?.name
        })
      });
      const data = await response.json();
      if (data.success) {
        alert('Technician assigned successfully');
        loadPendingOrders();
        loadActiveOrders();
        loadAvailableTechs();
        setSelectedOrder(null);
        setSelectedTech(null);
      }
    } catch (error) {
      console.error('Error assigning technician:', error);
    }
  };

  const handleClockIn = async (assignmentId) => {
    try {
      const response = await fetch(`${API_BASE}/clock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: assignmentId })
      });
      const data = await response.json();
      if (data.success) {
        alert('Technician clocked in');
        loadActiveOrders();
      }
    } catch (error) {
      console.error('Error clocking in:', error);
    }
  };

  const handleClockOut = async (assignmentId) => {
    try {
      const response = await fetch(`${API_BASE}/clock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: assignmentId })
      });
      const data = await response.json();
      if (data.success) {
        alert('Technician clocked out');
        loadActiveOrders();
      }
    } catch (error) {
      console.error('Error clocking out:', error);
    }
  };

  const loadLaborSummary = async (techId) => {
    try {
      const response = await fetch(`${API_BASE}/labor-summary/${techId}`);
      const data = await response.json();
      if (data.success) {
        setLaborSummary(data.data);
      }
    } catch (error) {
      console.error('Error loading labor summary:', error);
    }
  };

  const loadClockRecords = async (techId) => {
    try {
      const response = await fetch(`${API_BASE}/clock-records/${techId}?days=7`);
      const data = await response.json();
      if (data.success) {
        setClockRecords(data.data || []);
      }
    } catch (error) {
      console.error('Error loading clock records:', error);
    }
  };

  return (
    <div className="jc-dashboard">
      <header className="jc-header">
        <div className="header-left">
          <h1>Job Controller Module</h1>
          <p>Welcome, {user?.name}</p>
        </div>
        <button onClick={onLogout} className="logout-btn">Sign Out</button>
      </header>

      <div className="jc-content">
        {/* Tabs */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'pending-orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending-orders')}
          >
            Pending Orders
          </button>
          <button 
            className={`tab ${activeTab === 'active-orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('active-orders')}
          >
            Active Orders
          </button>
          <button 
            className={`tab ${activeTab === 'assignment' ? 'active' : ''}`}
            onClick={() => setActiveTab('assignment')}
          >
            Technician Assignment
          </button>
          <button 
            className={`tab ${activeTab === 'resources' ? 'active' : ''}`}
            onClick={() => setActiveTab('resources')}
          >
            Resource Management
          </button>
        </div>

        {/* TAB 1: Pending Orders */}
        {activeTab === 'pending-orders' && (
          <div className="tab-content">
            <h2>Service Orders Awaiting Assignment</h2>
            {pendingOrders.length > 0 ? (
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>SO ID</th>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Vehicle</th>
                    <th>Service Type</th>
                    <th>Check-In Time</th>
                    <th>Status</th>
                    <th>Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingOrders.map(order => (
                    <tr key={order[0]} onClick={() => setSelectedOrder(order)}>
                      <td>SO-{String(order[0]).padStart(5, '0')}</td>
                      <td>{order[1]}</td>
                      <td>{order[2]}</td>
                      <td>{order[3]}</td>
                      <td>{order[4]}</td>
                      <td>{order[5]}</td>
                      <td><span className="status-badge">{order[6]}</span></td>
                      <td>{order[8] > 0 ? `${order[8]} tech` : 'None'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-state">No pending orders</p>
            )}
          </div>
        )}

        {/* TAB 2: Active Orders */}
        {activeTab === 'active-orders' && (
          <div className="tab-content">
            <h2>Active Service Orders</h2>
            {activeOrders.length > 0 ? (
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>SO ID</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Service Type</th>
                    <th>Technician</th>
                    <th>Status</th>
                    <th>Clock In</th>
                    <th>Labor Hrs</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrders.map(order => (
                    <tr key={order[0]}>
                      <td>SO-{String(order[0]).padStart(5, '0')}</td>
                      <td>{order[1]}</td>
                      <td>{order[2]}</td>
                      <td>{order[3]}</td>
                      <td>{order[4]}</td>
                      <td><span className="status-badge active">{order[5]}</span></td>
                      <td>{order[6] ? new Date(order[6]).toLocaleTimeString() : 'N/A'}</td>
                      <td>{order[7] || 0}</td>
                      <td>
                        {order[5] === 'assigned' ? (
                          <button className="btn-clock-in" onClick={() => handleClockIn(1)}>Clock In</button>
                        ) : order[5] === 'in-progress' ? (
                          <button className="btn-clock-out" onClick={() => handleClockOut(1)}>Clock Out</button>
                        ) : (
                          <span>Done</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-state">No active orders</p>
            )}
          </div>
        )}

        {/* TAB 3: Technician Assignment */}
        {activeTab === 'assignment' && (
          <div className="tab-content">
            <h2>Assign Technician to Service Order</h2>
            <div className="assignment-form">
              <div className="form-section">
                <h3>Select Service Order</h3>
                <select 
                  value={selectedOrder ? selectedOrder[0] : ''}
                  onChange={(e) => {
                    const order = pendingOrders.find(o => o[0] == e.target.value);
                    setSelectedOrder(order);
                  }}
                  className="form-select"
                >
                  <option value="">-- Select Service Order --</option>
                  {pendingOrders.map(order => (
                    <option key={order[0]} value={order[0]}>
                      SO-{String(order[0]).padStart(5, '0')} - {order[1]} ({order[4]})
                    </option>
                  ))}
                </select>
                {selectedOrder && (
                  <div className="order-details">
                    <p><strong>Customer:</strong> {selectedOrder[1]}</p>
                    <p><strong>Vehicle:</strong> {selectedOrder[3]}</p>
                    <p><strong>Service Type:</strong> {selectedOrder[4]}</p>
                  </div>
                )}
              </div>

              <div className="form-section">
                <h3>Select Technician</h3>
                <div className="technician-list">
                  {availableTechs.length > 0 ? (
                    availableTechs.map(tech => (
                      <div 
                        key={tech[0]} 
                        className={`tech-card ${selectedTech && selectedTech[0] === tech[0] ? 'selected' : ''}`}
                        onClick={() => setSelectedTech(tech)}
                      >
                        <div className="tech-name">{tech[1]}</div>
                        <div className="tech-spec">{tech[2]}</div>
                        <div className="tech-jobs">Current: {tech[4]} jobs</div>
                        <div className="tech-skills">{tech[5] || 'No skills listed'}</div>
                      </div>
                    ))
                  ) : (
                    <p>No available technicians</p>
                  )}
                </div>
              </div>

              <button 
                className="btn-assign"
                onClick={handleAssignTechnician}
                disabled={!selectedOrder || !selectedTech}
              >
                Assign Technician
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: Resource Management */}
        {activeTab === 'resources' && (
          <div className="tab-content">
            <h2>Resource Management</h2>
            <div className="resources-section">
              <div className="resource-card">
                <h3>📊 Available Technicians</h3>
                <p className="stat">{availableTechs.length}</p>
              </div>
              <div className="resource-card">
                <h3>⏱️ Active Assignments</h3>
                <p className="stat">{activeOrders.length}</p>
              </div>
              <div className="resource-card">
                <h3>⏳ Pending Orders</h3>
                <p className="stat">{pendingOrders.length}</p>
              </div>
            </div>

            <div className="technician-details">
              <h3>Technician Resources</h3>
              <select 
                onChange={(e) => {
                  const tech = availableTechs.find(t => t[0] == e.target.value);
                  if (tech) {
                    loadLaborSummary(tech[0]);
                    loadClockRecords(tech[0]);
                  }
                }}
                className="form-select"
              >
                <option value="">-- Select Technician --</option>
                {availableTechs.map(tech => (
                  <option key={tech[0]} value={tech[0]}>{tech[1]}</option>
                ))}
              </select>

              {laborSummary && (
                <div className="labor-summary">
                  <h4>Labor Summary (Last 30 Days)</h4>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <label>Jobs Completed</label>
                      <span>{laborSummary.jobs_completed || 0}</span>
                    </div>
                    <div className="summary-item">
                      <label>Total Hours</label>
                      <span>{laborSummary.total_hours || 0}</span>
                    </div>
                    <div className="summary-item">
                      <label>Avg Hours/Job</label>
                      <span>{laborSummary.avg_hours_per_job ? laborSummary.avg_hours_per_job.toFixed(2) : 0}</span>
                    </div>
                  </div>
                </div>
              )}

              {clockRecords.length > 0 && (
                <div className="clock-records">
                  <h4>Clock Records (Last 7 Days)</h4>
                  <table className="records-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Vehicle</th>
                        <th>Clock In</th>
                        <th>Clock Out</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clockRecords.map(record => (
                        <tr key={record[0]}>
                          <td>{new Date(record[2]).toLocaleDateString()}</td>
                          <td>{record[1]}</td>
                          <td>{record[2] ? new Date(record[2]).toLocaleTimeString() : 'N/A'}</td>
                          <td>{record[3] ? new Date(record[3]).toLocaleTimeString() : 'N/A'}</td>
                          <td>{record[4] || 0} min</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="jc-footer">
        <p>© 2025 <em>Rapide</em> Job Controller Module</p>
      </footer>
    </div>
  );
};

export default JobControllerDashboard;
