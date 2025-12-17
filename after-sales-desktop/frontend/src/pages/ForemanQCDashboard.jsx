import React, { useState, useEffect } from 'react';
import '../styles/foreman-qc-dashboard.css';

const ForemanQCDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingJobs, setPendingJobs] = useState([]);
  const [activeInspections, setActiveInspections] = useState([]);
  const [roadTests, setRoadTests] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [showRoadTestForm, setShowRoadTestForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const API_BASE = 'http://localhost:5000/api/foreman-qc';

  // Load data on mount
  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    loadPendingJobs();
    loadActiveInspections();
    loadSummary();
  };

  const loadPendingJobs = async () => {
    try {
      const response = await fetch(`${API_BASE}/jobs/pending`);
      const data = await response.json();
      if (data.success) {
        setPendingJobs(data.data || []);
      }
    } catch (error) {
      console.error('Error loading pending jobs:', error);
    }
  };

  const loadActiveInspections = async () => {
    try {
      const response = await fetch(`${API_BASE}/inspections/active`);
      const data = await response.json();
      if (data.success) {
        setActiveInspections(data.data || []);
      }
    } catch (error) {
      console.error('Error loading active inspections:', error);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await fetch(`${API_BASE}/summary`);
      const data = await response.json();
      if (data.success) {
        setSummary(data.data);
      }
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const handleStartInspection = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    
    if (!selectedJob) {
      setErrorMessage('Please select a job');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_order_id: selectedJob[0],
          foreman_id: user.id,
          inspection_date: new Date().toISOString().split('T')[0],
          exterior_condition: document.getElementById('exterior')?.value,
          engine_condition: document.getElementById('engine')?.value,
          interior_cleanliness: document.getElementById('interior')?.value,
          parts_installed: document.getElementById('parts')?.value,
          fluid_levels_ok: document.getElementById('fluids')?.checked,
          electrical_systems_ok: document.getElementById('electrical')?.checked,
          safety_features_ok: document.getElementById('safety')?.checked,
          inspection_notes: document.getElementById('notes')?.value
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('QC Inspection started successfully');
        setShowInspectionForm(false);
        loadAllData();
      } else {
        setErrorMessage(data.error || 'Failed to start inspection');
      }
    } catch (error) {
      setErrorMessage('Error: ' + error.message);
    }
  };

  const handlePassInspection = async (inspectionId) => {
    try {
      const response = await fetch(`${API_BASE}/inspections/${inspectionId}/pass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Inspection passed successfully');
        loadAllData();
      } else {
        setErrorMessage(data.error || 'Failed to mark inspection');
      }
    } catch (error) {
      setErrorMessage('Error: ' + error.message);
    }
  };

  const handleFailInspection = async (inspectionId) => {
    const failedItems = prompt('Please describe the failed items:');
    if (!failedItems) return;

    try {
      const response = await fetch(`${API_BASE}/inspections/${inspectionId}/fail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failed_items: failedItems })
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Inspection marked as failed - rework required');
        loadAllData();
      } else {
        setErrorMessage(data.error || 'Failed to mark inspection');
      }
    } catch (error) {
      setErrorMessage('Error: ' + error.message);
    }
  };

  const handleStartRoadTest = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedInspection) {
      setErrorMessage('Please select an inspection');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/road-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qc_inspection_id: selectedInspection[0],
          service_order_id: selectedInspection[1],
          road_test_date: new Date().toISOString().split('T')[0],
          tested_by: user.id,
          test_distance_km: document.getElementById('distance')?.value || 0,
          engine_sound: document.getElementById('engineSound')?.value,
          acceleration_smooth: document.getElementById('acceleration')?.checked,
          braking_effective: document.getElementById('braking')?.checked,
          steering_responsive: document.getElementById('steering')?.checked,
          electrical_functions_ok: document.getElementById('elec')?.checked,
          air_conditioning_ok: document.getElementById('ac')?.checked,
          overall_performance: document.getElementById('performance')?.value,
          road_test_notes: document.getElementById('rtNotes')?.value
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Road test recorded successfully');
        setShowRoadTestForm(false);
        loadAllData();
      } else {
        setErrorMessage(data.error || 'Failed to record road test');
      }
    } catch (error) {
      setErrorMessage('Error: ' + error.message);
    }
  };

  return (
    <div className="foreman-qc-dashboard">
      <header className="qc-header">
        <div className="header-left">
          <h1>Quality Control Inspection</h1>
          <p>Welcome, {user.name}</p>
        </div>
        <button onClick={onLogout} className="logout-btn">Sign Out</button>
      </header>

      <div className="qc-content">
        {/* Summary Cards */}
        {summary && (
          <div className="summary-cards">
            <div className="summary-card">
              <h3>{summary.total_inspections}</h3>
              <p>Total Inspections</p>
            </div>
            <div className="summary-card passed">
              <h3>{summary.passed_count}</h3>
              <p>Passed</p>
            </div>
            <div className="summary-card alert">
              <h3>{summary.failed_count}</h3>
              <p>Failed</p>
            </div>
            <div className="summary-card">
              <h3>{summary.pending_count}</h3>
              <p>Pending</p>
            </div>
            <div className="summary-card warning">
              <h3>{summary.rework_count}</h3>
              <p>Rework Required</p>
            </div>
          </div>
        )}

        {/* Messages */}
        {errorMessage && <div className="error-message">{errorMessage}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}

        {/* Tabs */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Jobs
          </button>
          <button 
            className={`tab ${activeTab === 'inspections' ? 'active' : ''}`}
            onClick={() => setActiveTab('inspections')}
          >
            QC Inspections
          </button>
          <button 
            className={`tab ${activeTab === 'road-test' ? 'active' : ''}`}
            onClick={() => setActiveTab('road-test')}
          >
            Road Tests
          </button>
        </div>

        {/* Pending Jobs Tab */}
        {activeTab === 'pending' && (
          <div className="tab-content">
            {showInspectionForm && (
              <form onSubmit={handleStartInspection} className="form-modal">
                <h3>Start QC Inspection</h3>
                <div className="form-group">
                  <label>Select Job</label>
                  <select 
                    value={selectedJob ? selectedJob[0] : ''}
                    onChange={(e) => {
                      const job = pendingJobs.find(j => j[0] == e.target.value);
                      setSelectedJob(job);
                    }}
                    required
                  >
                    <option value="">Select a job</option>
                    {pendingJobs.map(job => (
                      <option key={job[0]} value={job[0]}>
                        {job[1]} - {job[2]} ({job[3]})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-section">
                  <h4>Exterior Inspection</h4>
                  <div className="form-group">
                    <label>Exterior Condition</label>
                    <select id="exterior" defaultValue="good">
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Engine & Mechanical</h4>
                  <div className="form-group">
                    <label>Engine Condition</label>
                    <select id="engine" defaultValue="good">
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Interior Cleanliness</label>
                    <select id="interior" defaultValue="good">
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                    </select>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Parts & Systems</h4>
                  <div className="form-group">
                    <label>Parts Installed</label>
                    <textarea id="parts" placeholder="List installed parts"></textarea>
                  </div>
                  <div className="form-group">
                    <label>
                      <input type="checkbox" id="fluids" defaultChecked /> Fluid Levels OK
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      <input type="checkbox" id="electrical" defaultChecked /> Electrical Systems OK
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      <input type="checkbox" id="safety" defaultChecked /> Safety Features OK
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Inspection Notes</label>
                  <textarea id="notes" placeholder="Additional notes..."></textarea>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-success">Start Inspection</button>
                  <button type="button" className="btn-cancel" onClick={() => setShowInspectionForm(false)}>Cancel</button>
                </div>
              </form>
            )}

            <div className="action-buttons">
              <button className="btn-primary" onClick={() => setShowInspectionForm(true)}>
                + Start QC Inspection
              </button>
            </div>

            {pendingJobs.length > 0 ? (
              <table className="jobs-table">
                <thead>
                  <tr>
                    <th>Order No</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingJobs.map(job => (
                    <tr key={job[0]}>
                      <td><strong>{job[1]}</strong></td>
                      <td>{job[2]}</td>
                      <td>{job[3]}</td>
                      <td><span className="badge pending">Job Completed</span></td>
                      <td>{new Date(job[4]).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">No pending jobs for QC inspection</div>
            )}
          </div>
        )}

        {/* QC Inspections Tab */}
        {activeTab === 'inspections' && (
          <div className="tab-content">
            {activeInspections.length > 0 ? (
              <table className="inspections-table">
                <thead>
                  <tr>
                    <th>Order No</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeInspections.map(insp => (
                    <tr key={insp[0]}>
                      <td><strong>{insp[2]}</strong></td>
                      <td>{insp[3]}</td>
                      <td><span className={`badge ${insp[4]}`}>{insp[4].replace('-', ' ')}</span></td>
                      <td>{new Date(insp[5]).toLocaleDateString()}</td>
                      <td>
                        <button 
                          className="btn-small pass"
                          onClick={() => handlePassInspection(insp[0])}
                        >
                          ✓ Pass
                        </button>
                        <button 
                          className="btn-small fail"
                          onClick={() => handleFailInspection(insp[0])}
                        >
                          ✗ Fail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">No active inspections</div>
            )}
          </div>
        )}

        {/* Road Test Tab */}
        {activeTab === 'road-test' && (
          <div className="tab-content">
            {showRoadTestForm && (
              <form onSubmit={handleStartRoadTest} className="form-modal">
                <h3>Record Road Test</h3>
                <div className="form-group">
                  <label>Select Inspection</label>
                  <select 
                    value={selectedInspection ? selectedInspection[0] : ''}
                    onChange={(e) => {
                      const insp = activeInspections.find(i => i[0] == e.target.value);
                      setSelectedInspection(insp);
                    }}
                    required
                  >
                    <option value="">Select an inspection</option>
                    {activeInspections.map(insp => (
                      <option key={insp[0]} value={insp[0]}>
                        {insp[2]} - {insp[3]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-section">
                  <h4>Test Details</h4>
                  <div className="form-group">
                    <label>Test Distance (km)</label>
                    <input type="number" id="distance" min="0" defaultValue="5" />
                  </div>
                  <div className="form-group">
                    <label>Engine Sound</label>
                    <input type="text" id="engineSound" placeholder="Normal, knocking, etc." />
                  </div>
                </div>

                <div className="form-section">
                  <h4>Performance Checks</h4>
                  <div className="form-group">
                    <label><input type="checkbox" id="acceleration" defaultChecked /> Acceleration Smooth</label>
                  </div>
                  <div className="form-group">
                    <label><input type="checkbox" id="braking" defaultChecked /> Braking Effective</label>
                  </div>
                  <div className="form-group">
                    <label><input type="checkbox" id="steering" defaultChecked /> Steering Responsive</label>
                  </div>
                  <div className="form-group">
                    <label><input type="checkbox" id="elec" defaultChecked /> Electrical Functions OK</label>
                  </div>
                  <div className="form-group">
                    <label><input type="checkbox" id="ac" defaultChecked /> Air Conditioning OK</label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Overall Performance</label>
                  <select id="performance" defaultValue="good">
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="acceptable">Acceptable</option>
                    <option value="needs-rework">Needs Rework</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Road Test Notes</label>
                  <textarea id="rtNotes" placeholder="Any issues or observations..."></textarea>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-success">Record Test</button>
                  <button type="button" className="btn-cancel" onClick={() => setShowRoadTestForm(false)}>Cancel</button>
                </div>
              </form>
            )}

            <div className="action-buttons">
              <button className="btn-primary" onClick={() => setShowRoadTestForm(true)}>
                + Record Road Test
              </button>
            </div>

            {activeInspections.length > 0 ? (
              <div className="empty-state">Road test records will appear here</div>
            ) : (
              <div className="empty-state">No inspections available for road testing</div>
            )}
          </div>
        )}
      </div>

      <footer className="qc-footer">
        <p>© 2025 <em>Rapide</em> Quality Control System</p>
      </footer>
    </div>
  );
};

export default ForemanQCDashboard;
