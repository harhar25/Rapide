import React, { useState, useEffect } from 'react';
import '../styles/security-gate-dashboard.css';
import { fetchJson } from '../utils/fetchJson';

export default function SecurityGateDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('entries');
  const [entryLogs, setEntryLogs] = useState([]);
  const [exitLogs, setExitLogs] = useState([]);
  const [activeBadges, setActiveBadges] = useState([]);
  const [newBadge, setNewBadge] = useState({ service_order_id: '', vehicle_plate: '', customer_name: '', customer_id: '', badge_days: 1 });
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch entry logs
      const entryData = await fetchJson('/api/security-gate/logs/entries?date=' + new Date().toISOString().split('T')[0]);
      if (entryData.success) setEntryLogs(entryData.data || []);
      
      // Fetch exit logs
      const exitData = await fetchJson('/api/security-gate/logs/exits?date=' + new Date().toISOString().split('T')[0]);
      if (exitData.success) setExitLogs(exitData.data || []);
      
      // Fetch active badges
      const badgeData = await fetchJson('/api/security-gate/badges/active');
      if (badgeData.success) setActiveBadges(badgeData.data || badgeData.badges || []);
      
      // Fetch summary
      const summaryData = await fetchJson('/api/security-gate/summary');
      if (summaryData.success) setSummary(summaryData.data || summaryData.summary || {});
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleIssueBadge = async () => {
    if (!newBadge.service_order_id || !newBadge.vehicle_plate) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const res = await fetchJson('/api/security-gate/badges/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_order_id: newBadge.service_order_id,
          vehicle_plate_no: newBadge.vehicle_plate,
          customer_name: newBadge.customer_name,
          customer_id: newBadge.customer_id,
          issued_by: user.id,
          expiry_days: newBadge.badge_days
        })
      });

      if (res.success) {
        alert('Badge issued successfully');
        setNewBadge({ service_order_id: '', vehicle_plate: '', customer_name: '', customer_id: '', badge_days: 1 });
        fetchData();
      } else {
        alert('Error issuing badge');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error issuing badge');
    }
  };

  const handleRevokeBadge = async (badgeId) => {
    if (window.confirm('Revoke this badge?')) {
      try {
        const res = await fetchJson(`/api/security-gate/badges/${badgeId}/revoke`, { method: 'POST' });
        if (res.success) {
          alert('Badge revoked successfully');
          fetchData();
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const handleLogAccess = async (accessType) => {
    const vehiclePlate = prompt('Enter vehicle plate number:');
    if (!vehiclePlate) return;

    const soIdInput = prompt('Enter service order ID (optional):');
    let serviceOrderId = null;
    if (soIdInput && soIdInput.trim() !== '') {
      const parsed = parseInt(soIdInput, 10);
      serviceOrderId = Number.isFinite(parsed) ? parsed : null;
    }

    try {
      const res = await fetchJson('/api/security-gate/access/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_order_id: serviceOrderId,
          vehicle_plate_no: vehiclePlate,
          customer_name: null,
          access_type: accessType,
          gate_operator_id: user.id
        })
      });

      if (res.success) {
        alert(`${accessType} logged successfully`);
        fetchData();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="security-gate-container">
      <div className="sg-header">
        <div className="sg-title">
          🔐 Security Gate Management
        </div>
        <div className="sg-user-info">
          <span>{user.name} ({user.role})</span>
          {user?.role !== 'admin' && (
            <button onClick={onLogout} className="logout-btn">Logout</button>
          )}
        </div>
      </div>

      <div className="sg-summary">
        {summary && (
          <>
            <div className="summary-card">
              <div className="summary-value">{summary.total_entries || 0}</div>
              <div className="summary-label">Entries Today</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">{summary.total_exits || 0}</div>
              <div className="summary-label">Exits Today</div>
            </div>
            <div className="summary-card warning">
              <div className="summary-value">{(summary.denied_entries || 0) + (summary.denied_exits || 0)}</div>
              <div className="summary-label">Access Denied</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">{summary.vehicles_processed || 0}</div>
              <div className="summary-label">Vehicles On-Site</div>
            </div>
          </>
        )}
      </div>

      <div className="sg-tabs">
        <button className={`tab ${activeTab === 'entries' ? 'active' : ''}`} onClick={() => setActiveTab('entries')}>Entry Logs</button>
        <button className={`tab ${activeTab === 'exits' ? 'active' : ''}`} onClick={() => setActiveTab('exits')}>Exit Logs</button>
        <button className={`tab ${activeTab === 'badges' ? 'active' : ''}`} onClick={() => setActiveTab('badges')}>Badge Management</button>
        <button className={`tab ${activeTab === 'issue' ? 'active' : ''}`} onClick={() => setActiveTab('issue')}>Issue Badge</button>
      </div>

      <div className="sg-content">
        {activeTab === 'entries' && (
          <div className="tab-content">
            <h2>Entry Logs - Today</h2>
            <div className="actions">
              <button onClick={() => handleLogAccess('entry')} className="action-btn">Log Entry</button>
              <button onClick={fetchData} className="action-btn refresh">Refresh</button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Plate Number</th>
                    <th>Customer</th>
                    <th>Gate Operator</th>
                    <th>Authorization Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entryLogs.map((log, idx) => (
                    <tr key={idx}>
                      <td>{log.time?.substring(11, 19) || 'N/A'}</td>
                      <td>{log.plate_no || 'N/A'}</td>
                      <td>{log.customer || 'N/A'}</td>
                      <td>{log.operator || 'N/A'}</td>
                      <td><span className={`badge ${log.authorized ? 'authorized' : 'unauthorized'}`}>{log.authorized ? 'Authorized' : 'Not Authorized'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'exits' && (
          <div className="tab-content">
            <h2>Exit Logs - Today</h2>
            <div className="actions">
              <button onClick={() => handleLogAccess('exit')} className="action-btn">Log Exit</button>
              <button onClick={fetchData} className="action-btn refresh">Refresh</button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Plate Number</th>
                    <th>Customer</th>
                    <th>Gate Operator</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {exitLogs.map((log, idx) => (
                    <tr key={idx}>
                      <td>{log.time?.substring(11, 19) || 'N/A'}</td>
                      <td>{log.plate_no || 'N/A'}</td>
                      <td>{log.customer || 'N/A'}</td>
                      <td>{log.operator || 'N/A'}</td>
                      <td><span className="badge success">Completed</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'badges' && (
          <div className="tab-content">
            <h2>Active Vehicle Badges</h2>
            <div className="actions">
              <button onClick={fetchData} className="action-btn refresh">Refresh</button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Badge Number</th>
                    <th>Plate Number</th>
                    <th>Customer</th>
                    <th>Issue Date</th>
                    <th>Expiry Date</th>
                    <th>Type</th>
                    <th>Scans</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBadges.map((badge, idx) => (
                    <tr key={idx}>
                      <td>{badge.badge_no || 'N/A'}</td>
                      <td>{badge.plate_no || 'N/A'}</td>
                      <td>{badge.customer || 'N/A'}</td>
                      <td>{badge.issued?.substring(0, 10) || 'N/A'}</td>
                      <td>{badge.expires?.substring(0, 10) || 'N/A'}</td>
                      <td>{badge.type || 'N/A'}</td>
                      <td>{badge.scans ?? 0}</td>
                      <td>
                        <button onClick={() => handleRevokeBadge(badge.badge_no)} className="action-btn delete">Revoke</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'issue' && (
          <div className="tab-content">
            <h2>Issue New Vehicle Badge</h2>
            <form className="form-container">
              <div className="form-group">
                <label htmlFor="sg_service_order_id">Service Order ID *</label>
                <input 
                  id="sg_service_order_id"
                  name="service_order_id"
                  type="text" 
                  value={newBadge.service_order_id}
                  onChange={(e) => setNewBadge({ ...newBadge, service_order_id: e.target.value })}
                  placeholder="Enter service order ID"
                />
              </div>
              <div className="form-group">
                <label htmlFor="sg_vehicle_plate">Vehicle Plate Number *</label>
                <input 
                  id="sg_vehicle_plate"
                  name="vehicle_plate"
                  type="text" 
                  value={newBadge.vehicle_plate}
                  onChange={(e) => setNewBadge({ ...newBadge, vehicle_plate: e.target.value })}
                  placeholder="e.g., ABC-1234"
                />
              </div>
              <div className="form-group">
                <label htmlFor="sg_customer_name">Customer Name</label>
                <input 
                  id="sg_customer_name"
                  name="customer_name"
                  type="text" 
                  value={newBadge.customer_name}
                  onChange={(e) => setNewBadge({ ...newBadge, customer_name: e.target.value })}
                  placeholder="Customer name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="sg_customer_id">Customer ID</label>
                <input
                  id="sg_customer_id"
                  name="customer_id"
                  type="text"
                  value={newBadge.customer_id || ''}
                  onChange={(e) => setNewBadge({ ...newBadge, customer_id: e.target.value })}
                  placeholder="Customer ID"
                />
              </div>
              <div className="form-group">
                <label htmlFor="sg_badge_days">Valid for (days)</label>
                <input 
                  id="sg_badge_days"
                  name="badge_days"
                  type="number" 
                  value={newBadge.badge_days}
                  onChange={(e) => setNewBadge({ ...newBadge, badge_days: parseInt(e.target.value) })}
                  min="1"
                  max="30"
                />
              </div>
              <button type="button" onClick={handleIssueBadge} className="submit-btn">Issue Badge</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
