import React, { useState, useEffect } from 'react';
import '../styles/job-wrapup-dashboard.css';
import '../styles/enterprise-ui.css';
import '../styles/dashboard-common.css';
import { fetchJson } from '../utils/fetchJson';
import { StatCard, EnterpriseCard, StatusBadge, EnterpriseTabs, LoadingSpinner, EmptyState } from '../components/EnterpriseComponents';

const JobWrapupDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('ready');
  const [readyJobs, setReadyJobs] = useState([]);
  const [activeWrapups, setActiveWrapups] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showClockOutForm, setShowClockOutForm] = useState(false);
  const [showChecklistForm, setShowChecklistForm] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const API_BASE = '/api/job-wrapup';

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    loadReadyJobs();
    loadActiveWrapups();
    loadSummary();
  };

  const loadReadyJobs = async () => {
    try {
      const data = await fetchJson(`${API_BASE}/jobs/ready`);
      if (data.success) {
        setReadyJobs(data.data || []);
      }
    } catch (error) {
      console.error('Error loading ready jobs:', error);
    }
  };

  const loadActiveWrapups = async () => {
    try {
      const data = await fetchJson(`${API_BASE}/wrapups/active`);
      if (data.success) {
        setActiveWrapups(data.data || []);
      }
    } catch (error) {
      console.error('Error loading active wrapups:', error);
    }
  };

  const loadSummary = async () => {
    try {
      const data = await fetchJson(`${API_BASE}/summary`);
      if (data.success) {
        setSummary(data.data);
      }
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const handleStartWrapup = async (job) => {
    try {
      const data = await fetchJson(`${API_BASE}/wrapups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_order_id: job[0],
          job_controller_id: user.id,
          technician_id: job[4],
          qc_inspection_id: null
        })
      });
      if (data.success) {
        setSelectedJob({ ...job, wrapupId: data.wrapup_id });
        setSuccessMessage('Job wrap-up started');
        loadAllData();
      } else {
        setErrorMessage(data.error || 'Failed to start wrap-up');
      }
    } catch (error) {
      setErrorMessage('Error: ' + error.message);
    }
  };

  const handleClockOut = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const data = await fetchJson(`${API_BASE}/wrapups/${selectedJob.wrapupId}/clock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: document.getElementById('finalNotes')?.value || ''
        })
      });
      if (data.success) {
        setSuccessMessage(`Technician clocked out - ${data.labor_hours.toFixed(2)} hours logged`);
        setShowClockOutForm(false);
        loadAllData();
      } else {
        setErrorMessage(data.error || 'Failed to clock out');
      }
    } catch (error) {
      setErrorMessage('Error: ' + error.message);
    }
  };

  const handleUpdateChecklist = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const data = await fetchJson(`${API_BASE}/wrapups/${selectedJob.wrapupId}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist_items: document.getElementById('checklistItems')?.value || '',
          materials_returned: document.getElementById('materials')?.checked ? 1 : 0,
          tools_returned: document.getElementById('tools')?.checked ? 1 : 0,
          vehicle_condition: document.getElementById('condition')?.value,
          quality_passed: document.getElementById('qualityPassed')?.checked
        })
      });
      if (data.success) {
        setSuccessMessage('Checklist updated successfully');
        setShowChecklistForm(false);
        loadAllData();
      } else {
        setErrorMessage(data.error || 'Failed to update checklist');
      }
    } catch (error) {
      setErrorMessage('Error: ' + error.message);
    }
  };

  const handleReturnToSA = async (wrapupId) => {
    if (!window.confirm('Return this job to Service Advisor?')) return;

    try {
      const data = await fetchJson(`${API_BASE}/wrapups/${wrapupId}/return-to-sa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (data.success) {
        setSuccessMessage('Job returned to Service Advisor');
        loadAllData();
      } else {
        setErrorMessage(data.error || 'Failed to return job');
      }
    } catch (error) {
      setErrorMessage('Error: ' + error.message);
    }
  };

  return (
    <div className="job-wrapup-dashboard">
      <header className="wu-header">
        <div className="header-left">
          <h1>Job Wrap-Up Management</h1>
          <p>Welcome, {user.name}</p>
        </div>
        {user?.role !== 'admin' && (
          <button onClick={onLogout} className="logout-btn">Sign Out</button>
        )}
      </header>

      <div className="wu-content">
        {/* Summary Cards */}
        {summary && (
          <div className="summary-cards">
            <div className="summary-card">
              <h3>{summary.total_wrapups}</h3>
              <p>Total Wrap-Ups</p>
            </div>
            <div className="summary-card ready">
              <h3>{summary.ready_count}</h3>
              <p>Ready for SA</p>
            </div>
            <div className="summary-card">
              <h3>{summary.returned_count}</h3>
              <p>Returned</p>
            </div>
            <div className="summary-card pending">
              <h3>{summary.pending_count}</h3>
              <p>Pending</p>
            </div>
            <div className="summary-card">
              <h3>{summary.avg_labor_hours.toFixed(1)}h</h3>
              <p>Avg Labor Hours</p>
            </div>
          </div>
        )}

        {/* Messages */}
        {errorMessage && <div className="error-message">{errorMessage}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}

        {/* Tabs */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'ready' ? 'active' : ''}`}
            onClick={() => setActiveTab('ready')}
          >
            Ready for Wrap-Up
          </button>
          <button 
            className={`tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active Wrap-Ups
          </button>
        </div>

        {/* Ready for Wrap-Up Tab */}
        {activeTab === 'ready' && (
          <div className="tab-content">
            {readyJobs.length > 0 ? (
              <table className="jobs-table">
                <thead>
                  <tr>
                    <th>Order No</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Technician</th>
                    <th>QC Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {readyJobs.map(job => (
                    <tr key={job[0]}>
                      <td><strong>{job[1]}</strong></td>
                      <td>{job[2]}</td>
                      <td>{job[3]}</td>
                      <td>{job[5]}</td>
                      <td><span className="badge passed">{job[6]}</span></td>
                      <td>
                        <button 
                          className="btn-small primary"
                          onClick={() => handleStartWrapup(job)}
                        >
                          Start Wrap-Up
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">No jobs ready for wrap-up</div>
            )}
          </div>
        )}

        {/* Active Wrap-Ups Tab */}
        {activeTab === 'active' && (
          <div className="tab-content">
            {activeWrapups.length > 0 ? (
              <div className="wrapups-grid">
                {activeWrapups.map(wrapup => (
                  <div key={wrapup[0]} className="wrapup-card">
                    <div className="card-header">
                      <h3>{wrapup[2]}</h3>
                      <span className={`badge ${wrapup[4]}`}>{wrapup[4].replace('-', ' ')}</span>
                    </div>
                    <div className="card-content">
                      <p><strong>Customer:</strong> {wrapup[3]}</p>
                      <p><strong>Labor Hours:</strong> {wrapup[5] ? parseFloat(wrapup[5]).toFixed(2) : '-'}</p>
                      <p><strong>Started:</strong> {new Date(wrapup[6]).toLocaleDateString()}</p>
                    </div>
                    <div className="card-actions">
                      {wrapup[4] === 'pending' ? (
                        <>
                          <button 
                            className="btn-small info"
                            onClick={() => {
                              setSelectedJob({ wrapupId: wrapup[0], soId: wrapup[1] });
                              setShowChecklistForm(true);
                            }}
                          >
                            Checklist
                          </button>
                          <button 
                            className="btn-small success"
                            onClick={() => {
                              setSelectedJob({ wrapupId: wrapup[0] });
                              setShowClockOutForm(true);
                            }}
                          >
                            Clock Out
                          </button>
                        </>
                      ) : (
                        <button 
                          className="btn-small complete"
                          onClick={() => handleReturnToSA(wrapup[0])}
                        >
                          ✓ Return to SA
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No active wrap-ups</div>
            )}

            {/* Clock Out Modal */}
            {showClockOutForm && (
              <div className="modal-overlay">
                <form onSubmit={handleClockOut} className="modal-form">
                  <h3>Clock Out Technician</h3>
                  <div className="form-group">
                    <label>Final Notes</label>
                    <textarea 
                      id="finalNotes" 
                      placeholder="Any final comments or issues..."
                      rows="4"
                    ></textarea>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-success">Clock Out</button>
                    <button type="button" className="btn-cancel" onClick={() => setShowClockOutForm(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Checklist Modal */}
            {showChecklistForm && (
              <div className="modal-overlay">
                <form onSubmit={handleUpdateChecklist} className="modal-form">
                  <h3>Job Completion Checklist</h3>
                  
                  <div className="form-section">
                    <h4>Completion Items</h4>
                    <div className="form-group">
                      <label>Checklist Items</label>
                      <textarea 
                        id="checklistItems" 
                        placeholder="List all completed items..."
                        rows="4"
                      ></textarea>
                    </div>
                  </div>

                  <div className="form-section">
                    <h4>Resources</h4>
                    <div className="form-group">
                      <label>
                        <input type="checkbox" id="materials" /> Materials Returned
                      </label>
                    </div>
                    <div className="form-group">
                      <label>
                        <input type="checkbox" id="tools" /> Tools Returned
                      </label>
                    </div>
                  </div>

                  <div className="form-section">
                    <h4>Vehicle Condition</h4>
                    <div className="form-group">
                      <label>Final Condition</label>
                      <select id="condition">
                        <option value="">Select condition</option>
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-section">
                    <div className="form-group">
                      <label>
                        <input type="checkbox" id="qualityPassed" /> Quality Check Passed
                      </label>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-success">Update Checklist</button>
                    <button type="button" className="btn-cancel" onClick={() => setShowChecklistForm(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="wu-footer">
        <p>© 2025 <em>Rapide</em> Job Wrap-Up System</p>
      </footer>
    </div>
  );
};

export default JobWrapupDashboard;
