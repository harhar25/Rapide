import React, { useState, useEffect } from 'react';
import '../styles/technician-dashboard.css';
import '../styles/enterprise-ui.css';
import '../styles/dashboard-common.css';
import { fetchJson } from '../utils/fetchJson';
import { StatCard, EnterpriseCard, StatusBadge, EnterpriseTabs, LoadingSpinner, EmptyState } from '../components/EnterpriseComponents';

const TechnicianDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = React.useState('assigned');
  const [technician, setTechnician] = React.useState(null);
  const [jobs, setJobs] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notesDraft, setNotesDraft] = React.useState({});
  const [partsDraft, setPartsDraft] = React.useState({});

  const resolveTechnician = React.useCallback(async () => {
    const res = await fetchJson('/api/technician/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user?.username, name: user?.name }),
    });

    if (!res?.success) {
      throw new Error(res?.error || 'Failed to resolve technician');
    }
    return res.data;
  }, [user?.username, user?.name]);

  const loadJobs = React.useCallback(async (technicianId) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchJson(`/api/technician/jobs?technician_id=${encodeURIComponent(technicianId)}`);
      if (!res?.success) throw new Error(res?.error || 'Failed to load jobs');
      setJobs(res.data || []);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resolved = await resolveTechnician();
        if (cancelled) return;
        setTechnician(resolved);
        await loadJobs(resolved.technician_id);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolveTechnician, loadJobs]);

  const startJob = async (assignmentId) => {
    const res = await fetchJson('/api/technician/clock-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignment_id: assignmentId }),
    });
    if (!res?.success) throw new Error(res?.error || 'Clock-in failed');
    if (technician?.technician_id) {
      await loadJobs(technician.technician_id);
    }
  };

  const completeJob = async (assignmentId) => {
    const res = await fetchJson('/api/technician/clock-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignment_id: assignmentId }),
    });
    if (!res?.success) throw new Error(res?.error || 'Clock-out failed');
    if (technician?.technician_id) {
      await loadJobs(technician.technician_id);
    }
  };

  const saveNotes = async (assignmentId) => {
    const res = await fetchJson(`/api/technician/assignments/${assignmentId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        technician_id: technician?.technician_id,
        notes: notesDraft[assignmentId] || '',
      }),
    });
    if (!res?.success) throw new Error(res?.error || 'Save notes failed');
    if (technician?.technician_id) {
      await loadJobs(technician.technician_id);
    }
  };

  const requestParts = async (serviceOrderId, assignmentId) => {
    const raw = partsDraft[assignmentId] || '';
    const partsList = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [productIdStr, qtyStr] = line.split(',').map((x) => (x || '').trim());
        const product_id = parseInt(productIdStr, 10);
        const quantity = qtyStr ? parseInt(qtyStr, 10) : 1;
        return { product_id, quantity };
      })
      .filter((p) => Number.isFinite(p.product_id) && p.product_id > 0 && Number.isFinite(p.quantity) && p.quantity > 0);

    if (!partsList.length) {
      throw new Error('Please enter parts as: product_id, quantity (one per line)');
    }

    const res = await fetchJson(`/api/technician/service-orders/${serviceOrderId}/parts-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        technician_id: technician?.technician_id,
        requested_parts: partsList,
        notes: notesDraft[assignmentId] || null,
      }),
    });

    if (!res?.success) throw new Error(res?.error || 'Parts request failed');
  };

  const filteredJobs = jobs.filter((job) => {
    const status = job.assignment_status;
    if (activeTab === 'assigned') return status === 'assigned';
    if (activeTab === 'in-progress') return status === 'in-progress';
    return status === 'completed';
  });

  return (
    <div className="tech-dashboard">
      <header className="tech-header">
        <div className="header-left">
          <h1>Jobs</h1>
          <p>Welcome, {user.name}</p>
        </div>
        {user?.role !== 'admin' && (
          <button onClick={onLogout} className="logout-btn">Sign Out</button>
        )}
      </header>

      <div className="tech-content">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'assigned' ? 'active' : ''}`}
            onClick={() => setActiveTab('assigned')}
          >
            Assigned
          </button>
          <button 
            className={`tab ${activeTab === 'in-progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('in-progress')}
          >
            In Progress
          </button>
          <button 
            className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed
          </button>
        </div>

        {error ? (
          <div style={{ marginBottom: 16, color: '#b91c1c' }}>{error}</div>
        ) : null}
        {loading ? (
          <div style={{ marginBottom: 16, color: '#6c757d' }}>Loading...</div>
        ) : null}

        <div className="jobs-grid">
          {filteredJobs.map((job) => (
            <div key={job.assignment_id} className="job-card">
              <div className="job-header">
                <h3>{job.customer_name || 'Customer'}</h3>
                <span className={`status ${job.assignment_status}`}>{String(job.assignment_status).replace('-', ' ')}</span>
              </div>
              <div className="job-details">
                <p><strong>Vehicle</strong> {job.vehicle_model || job.vehicle_plate_no || '-'}</p>
                <p><strong>Service</strong> {job.service_type || '-'}</p>
                <p><strong>Plate</strong> {job.vehicle_plate_no || '-'}</p>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label htmlFor={`notes-${job.assignment_id}`} style={{ display: 'block', marginBottom: 6, color: '#495057', fontSize: '0.85em' }}>
                  Work notes
                </label>
                <textarea
                  id={`notes-${job.assignment_id}`}
                  name={`notes-${job.assignment_id}`}
                  rows={3}
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #e9ecef' }}
                  value={notesDraft[job.assignment_id] ?? (job.notes || '')}
                  onChange={(e) => setNotesDraft((p) => ({ ...p, [job.assignment_id]: e.target.value }))}
                />
                <button
                  className="btn-complete"
                  style={{ marginTop: 10 }}
                  onClick={async () => {
                    try {
                      await saveNotes(job.assignment_id);
                    } catch (e) {
                      setError(e?.message || String(e));
                    }
                  }}
                >
                  Save Notes
                </button>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label htmlFor={`parts-${job.assignment_id}`} style={{ display: 'block', marginBottom: 6, color: '#495057', fontSize: '0.85em' }}>
                  Request parts (one per line: product_id, quantity)
                </label>
                <textarea
                  id={`parts-${job.assignment_id}`}
                  name={`parts-${job.assignment_id}`}
                  rows={3}
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #e9ecef' }}
                  value={partsDraft[job.assignment_id] || ''}
                  onChange={(e) => setPartsDraft((p) => ({ ...p, [job.assignment_id]: e.target.value }))}
                />
                <button
                  className="btn-complete"
                  style={{ marginTop: 10 }}
                  onClick={async () => {
                    try {
                      await requestParts(job.service_order_id, job.assignment_id);
                    } catch (e) {
                      setError(e?.message || String(e));
                    }
                  }}
                >
                  Send Parts Request
                </button>
              </div>

              <div className="job-actions">
                {job.assignment_status === 'assigned' && (
                  <button
                    className="btn-start"
                    onClick={async () => {
                      try {
                        await startJob(job.assignment_id);
                      } catch (e) {
                        setError(e?.message || String(e));
                      }
                    }}
                  >
                    Start
                  </button>
                )}
                {job.assignment_status === 'in-progress' && (
                  <button
                    className="btn-complete"
                    onClick={async () => {
                      try {
                        await completeJob(job.assignment_id);
                      } catch (e) {
                        setError(e?.message || String(e));
                      }
                    }}
                  >
                    Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TechnicianDashboard;
