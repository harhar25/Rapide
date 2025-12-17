import React, { useState, useEffect } from 'react';
import '../styles/security-gate-dashboard.css';

export default function SecurityGateDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('entries');
  const [entryLogs, setEntryLogs] = useState([]);
  const [exitLogs, setExitLogs] = useState([]);
  const [activeBadges, setActiveBadges] = useState([]);
  const [newBadge, setNewBadge] = useState({ service_order_id: '', vehicle_plate: '', customer_name: '', badge_days: 1 });
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
      const entryRes = await fetch('/api/security-gate/logs/entries?date_from=' + new Date().toISOString().split('T')[0]);
      const entryData = await entryRes.json();
      if (entryData.status === 'success') setEntryLogs(entryData.logs || []);
      
      // Fetch exit logs
      const exitRes = await fetch('/api/security-gate/logs/exits?date_from=' + new Date().toISOString().split('T')[0]);
      const exitData = await exitRes.json();
      if (exitData.status === 'success') setExitLogs(exitData.logs || []);
      
      // Fetch active badges
      const badgeRes = await fetch('/api/security-gate/badges/active');
      const badgeData = await badgeRes.json();
      if (badgeData.status === 'success') setActiveBadges(badgeData.badges || []);
      
      // Fetch summary
      const summaryRes = await fetch('/api/security-gate/summary');
      const summaryData = await summaryRes.json();
      if (summaryData.status === 'success') setSummary(summaryData.summary || {});
      
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
      const res = await fetch('/api/security-gate/badges/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_order_id: newBadge.service_order_id,
          vehicle_plate_no: newBadge.vehicle_plate,
          customer_name: newBadge.customer_name,
          badge_days: newBadge.badge_days
        })
      });

      if (res.ok) {
        alert('Badge issued successfully');
        setNewBadge({ service_order_id: '', vehicle_plate: '', customer_name: '', badge_days: 1 });
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
        const res = await fetch(`/api/security-gate/badges/${badgeId}/revoke`, { method: 'POST' });
        if (res.ok) {
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

    try {
      const res = await fetch('/api/security-gate/access/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_plate_no: vehiclePlate,
          access_type: accessType,
          gate_operator_id: user.id
        })
      });

      if (res.ok) {
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
          <button onClick={onLogout} className="logout-btn">Logout</button>
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
              <div className="summary-value">{summary.access_denied || 0}</div>
              <div className="summary-label">Access Denied</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">{summary.active_vehicles || 0}</div>
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
                      <td>{log[5]?.substring(11, 19) || 'N/A'}</td>
                      <td>{log[2] || 'N/A'}</td>
                      <td>{log[3] || 'N/A'}</td>
                      <td>Operator {log[6] || 'N/A'}</td>
                      <td><span className={`badge ${log[7] ? 'authorized' : 'unauthorized'}`}>{log[7] ? 'Authorized' : 'Not Authorized'}</span></td>
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
                      <td>{log[5]?.substring(11, 19) || 'N/A'}</td>
                      <td>{log[2] || 'N/A'}</td>
                      <td>{log[3] || 'N/A'}</td>
                      <td>Operator {log[6] || 'N/A'}</td>
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
                      <td>{badge[1] || 'N/A'}</td>
                      <td>{badge[3] || 'N/A'}</td>
                      <td>{badge[5] || 'N/A'}</td>
                      <td>{badge[6]?.substring(0, 10) || 'N/A'}</td>
                      <td>{badge[7]?.substring(0, 10) || 'N/A'}</td>
                      <td>{badge[8] || 'N/A'}</td>
                      <td>{badge[10] || 0}</td>
                      <td>
                        <button onClick={() => handleRevokeBadge(badge[0])} className="action-btn delete">Revoke</button>
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
                <label>Service Order ID *</label>
                <input 
                  type="text" 
                  value={newBadge.service_order_id}
                  onChange={(e) => setNewBadge({ ...newBadge, service_order_id: e.target.value })}
                  placeholder="Enter service order ID"
                />
              </div>
              <div className="form-group">
                <label>Vehicle Plate Number *</label>
                <input 
                  type="text" 
                  value={newBadge.vehicle_plate}
                  onChange={(e) => setNewBadge({ ...newBadge, vehicle_plate: e.target.value })}
                  placeholder="e.g., ABC-1234"
                />
              </div>
              <div className="form-group">
                <label>Customer Name</label>
                <input 
                  type="text" 
                  value={newBadge.customer_name}
                  onChange={(e) => setNewBadge({ ...newBadge, customer_name: e.target.value })}
                  placeholder="Customer name"
                />
              </div>
              <div className="form-group">
                <label>Valid for (days)</label>
                <input 
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
