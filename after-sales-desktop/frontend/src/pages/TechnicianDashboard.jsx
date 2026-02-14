import React, { useState, useEffect, useCallback } from 'react';
import '../styles/technician-dashboard-v2.css';
import '../styles/enterprise-ui.css';
import '../styles/dashboard-common.css';
import { fetchJson } from '../utils/fetchJson';
import { 
  StatCard, 
  EnterpriseCard, 
  StatusBadge, 
  EnterpriseTabs, 
  LoadingSpinner, 
  EmptyState,
  ModuleLayout,
  EnterpriseButton,
  EnterpriseFormGroup
} from '../components/EnterpriseComponents';

const TechnicianDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = React.useState('assigned');
  const [technician, setTechnician] = React.useState(null);
  const [jobs, setJobs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [initialLoadDone, setInitialLoadDone] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notesDraft, setNotesDraft] = React.useState({});
  
  // Modal & Form State
  const [isPartsModalOpen, setIsPartsModalOpen] = useState(false);
  const [selectedJobForParts, setSelectedJobForParts] = useState(null);
  const [partsList, setPartsList] = useState([{ productId: '', quantity: 1 }]);
  const [requestNotes, setRequestNotes] = useState('');

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
    if (!initialLoadDone) setLoading(true);
    setError('');
    try {
      const res = await fetchJson(`/api/technician/jobs?technician_id=${encodeURIComponent(technicianId)}`);
      if (!res?.success) throw new Error(res?.error || 'Failed to load jobs');
      setJobs(res.data || []);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      if (!initialLoadDone) {
        setLoading(false);
        setInitialLoadDone(true);
      }
    }
  }, [initialLoadDone]);

  React.useEffect(() => {
    let cancelled = false;
    let intervalId = null;
    (async () => {
      try {
        const resolved = await resolveTechnician();
        if (cancelled) return;
        setTechnician(resolved);
        await loadJobs(resolved.technician_id);
        // Start 3s polling after initial load
        intervalId = setInterval(() => loadJobs(resolved.technician_id), 3000);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || String(e));
      }
    })();
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [resolveTechnician, loadJobs]);

  const startJob = async (assignmentId) => {
    try {
      const res = await fetchJson('/api/technician/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: assignmentId }),
      });
      if (!res?.success) throw new Error(res?.error || 'Clock-in failed');
      if (technician?.technician_id) {
        await loadJobs(technician.technician_id);
      }
    } catch (e) {
      setError(e?.message || String(e));
    }
  };

  const completeJob = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to complete this job?')) return;
    try {
      const res = await fetchJson('/api/technician/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: assignmentId }),
      });
      if (!res?.success) throw new Error(res?.error || 'Clock-out failed');
      if (technician?.technician_id) {
        await loadJobs(technician.technician_id);
      }
    } catch (e) {
      setError(e?.message || String(e));
    }
  };

  const saveNotes = async (assignmentId) => {
    try {
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
      alert('Notes saved!');
    } catch (e) {
      setError(e?.message || String(e));
    }
  };

  // Parts Header Handling
  const openPartsModal = (job) => {
    setSelectedJobForParts(job);
    setPartsList([{ productId: '', quantity: 1 }]);
    setRequestNotes('');
    setIsPartsModalOpen(true);
  };

  const closePartsModal = () => {
    setIsPartsModalOpen(false);
    setSelectedJobForParts(null);
  };

  const handlePartChange = (index, field, value) => {
    const list = [...partsList];
    list[index][field] = value;
    setPartsList(list);
  };

  const addPartRow = () => {
    setPartsList([...partsList, { productId: '', quantity: 1 }]);
  };

  const removePartRow = (index) => {
    const list = [...partsList];
    list.splice(index, 1);
    setPartsList(list);
  };

  const submitPartsRequest = async () => {
    if (!selectedJobForParts) return;
    
    // Validation
    const validParts = partsList.filter(p => p.productId && p.quantity > 0);
    if (validParts.length === 0) {
      alert("Please add at least one valid part (ID and Quantity).");
      return;
    }

    try {
      const finalParts = validParts.map(p => ({
        product_id: parseInt(p.productId, 10),
        quantity: parseInt(p.quantity, 10)
      }));

      const res = await fetchJson(`/api/technician/service-orders/${selectedJobForParts.service_order_id}/parts-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technician_id: technician?.technician_id,
          requested_parts: finalParts,
          notes: requestNotes,
        }),
      });

      if (!res?.success) throw new Error(res?.error || 'Parts request failed');
      
      alert('Parts request sent successfully');
      closePartsModal();
      
    } catch (e) {
      alert(e?.message || String(e));
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const status = job.assignment_status;
    if (activeTab === 'assigned') return status === 'assigned';
    if (activeTab === 'in-progress') return status === 'in-progress';
    return status === 'completed';
  });

  const tabItems = [
    { id: 'assigned', label: 'Assigned', icon: '📝' },
    { id: 'in-progress', label: 'In Progress', icon: '⚡' },
    { id: 'completed', label: 'Completed', icon: '✅' }
  ];

  /* Stats for ModuleLayout */
  const techStats = [
    { label: 'Assigned', value: jobs.filter(j => j.assignment_status === 'assigned').length, icon: '📝' },
    { label: 'In Progress', value: jobs.filter(j => j.assignment_status === 'in-progress').length, icon: '⚡', status: 'warning' },
    { label: 'Completed Today', value: jobs.filter(j => j.assignment_status === 'completed').length, icon: '✅', status: 'success' }
  ];

  return (
    <ModuleLayout
      title="Technician Dashboard"
      description="View assigned jobs, track time, and request parts"
      icon="🔧"
      user={user}
      onLogout={onLogout}
      stats={techStats}
    >
      {error && (
        <div className="enterprise-alert error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}
      
      {loading && <LoadingSpinner />}

      <EnterpriseTabs
        tabs={tabItems}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="jobs-grid">
        {filteredJobs.length === 0 && !loading && (
            <EmptyState 
                title={`No ${activeTab.replace('-', ' ')} jobs`}
                description="Jobs assigned to you will appear here." 
                icon="📋"
            />
        )}
        
        {filteredJobs.map(job => (
          <div key={job.assignment_id} className={`job-card ${job.assignment_status}`}>
            <div className="job-header">
              <div>
                <span className="job-id">#{job.job_order_number || job.service_order_id}</span>
                <h3>{job.customer_name || 'Guest Customer'}</h3>
                <p className="vehicle-info">{job.vehicle_name || 'Unknown Vehicle'}</p>
              </div>
              <StatusBadge status={job.assignment_status || 'pending'} />
            </div>
            
            <div className="job-details">
              <div className="detail-row">
                <span className="label">Task:</span>
                <span className="value">{job.description || 'General Service'}</span>
              </div>
              <div className="detail-row">
                <span className="label">Time Est:</span>
                <span className="value">{job.estimated_hours ? `${job.estimated_hours} hrs` : 'N/A'}</span>
              </div>
              {job.start_time && (
                 <div className="detail-row">
                 <span className="label">Started:</span>
                 <span className="value">{new Date(job.start_time).toLocaleTimeString()}</span>
               </div>
              )}
            </div>

            {/* Work Notes Section */}
            <div className="work-notes-section">
                <label>Technician Notes</label>
                <div className="notes-input-group">
                    <textarea
                        rows="2"
                        className="ent-textarea"
                        placeholder="Update notes..."
                        value={notesDraft[job.assignment_id] ?? (job.notes || '')}
                        onChange={(e) => setNotesDraft((p) => ({ ...p, [job.assignment_id]: e.target.value }))}
                    />
                    <button 
                        className="btn-save-notes" 
                        onClick={() => saveNotes(job.assignment_id)}
                        disabled={loading}
                    >
                        Save
                    </button>
                </div>
            </div>

            <div className="job-actions-area">
                {job.assignment_status === 'assigned' && (
                    <button 
                        className="tech-btn btn-clock-in" 
                        onClick={() => startJob(job.assignment_id)}
                    >
                        ⏱️ START JOB
                    </button>
                )}
                
                {job.assignment_status === 'in-progress' && (
                    <div className="active-actions">
                        <button 
                            className="tech-btn btn-complete"
                            onClick={() => completeJob(job.assignment_id)}
                        >
                            ✅ Complete Job
                        </button>
                    </div>
                )}
            </div>
          </div>
        ))}
      </div>
    </ModuleLayout>
  );
};

export default TechnicianDashboard;
