import React, { useState, useEffect } from 'react';
import '../styles/job-wrapup-dashboard.css';
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
  EnterpriseTable,
  Modal,
  EnterpriseButton,
  EnterpriseFormGroup,
  EnterpriseInput,
  EnterpriseCheckbox
} from '../components/EnterpriseComponents';

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

  // Form states
  const [finalNotes, setFinalNotes] = useState('');
  const [checklistData, setChecklistData] = useState({
    checklistItems: '',
    materialsReturned: false,
    toolsReturned: false,
    vehicleCondition: 'Good',
    qualityPassed: false
  });

  const API_BASE = '/api/job-wrapup';

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 3000); // Refresh every 3s
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
    e?.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const data = await fetchJson(`${API_BASE}/wrapups/${selectedJob.wrapupId}/clock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: finalNotes
        })
      });
      if (data.success) {
        setSuccessMessage(`Technician clocked out - ${data.labor_hours.toFixed(2)} hours logged`);
        setShowClockOutForm(false);
        setFinalNotes('');
        loadAllData();
      } else {
        setErrorMessage(data.error || 'Failed to clock out');
      }
    } catch (error) {
      setErrorMessage('Error: ' + error.message);
    }
  };

  const handleUpdateChecklist = async (e) => {
    e?.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const data = await fetchJson(`${API_BASE}/wrapups/${selectedJob.wrapupId}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist_items: checklistData.checklistItems,
          materials_returned: checklistData.materialsReturned ? 1 : 0,
          tools_returned: checklistData.toolsReturned ? 1 : 0,
          vehicle_condition: checklistData.vehicleCondition,
          quality_passed: checklistData.qualityPassed
        })
      });
      if (data.success) {
        setSuccessMessage('Checklist updated successfully');
        setShowChecklistForm(false);
        // Reset form
        setChecklistData({
          checklistItems: '',
          materialsReturned: false,
          toolsReturned: false,
          vehicleCondition: 'Good',
          qualityPassed: false
        });
        loadAllData();
      } else {
        setErrorMessage(data.error || 'Failed to update checklist');
      }
    } catch (error) {
      setErrorMessage('Error: ' + error.message);
    }
  };

  const moduleStats = summary ? [
    { label: 'Total', value: summary.total_wrapups, icon: '📋' },
    { label: 'Ready', value: summary.ready_count, icon: '⏱️', status: 'warning' },
    { label: 'Active', value: summary.pending_count, icon: '🔄', status: 'info' },
    { label: 'Returned', value: summary.returned_count, icon: '↩️', status: 'error' },
    { label: 'Avg Labor', value: `${summary.avg_labor_hours?.toFixed(1) || 0}h`, icon: '⏳' }
  ] : [];

  const tabItems = [
    { id: 'ready', label: 'Ready for Wrap-Up', icon: '⏱️' },
    { id: 'active', label: 'Active Wrap-Ups', icon: '🔄' }
  ];

  /* Prepare table data for Ready Jobs */
  // job: [id, orderNo, customer, vehicle, techId, techName, qcStatus]
  const readyJobsColumns = [
    { header: 'Order No', accessor: (job) => <strong>{job[1]}</strong> },
    { header: 'Customer', accessor: (job) => job[2] },
    { header: 'Vehicle', accessor: (job) => job[3] },
    { header: 'Technician', accessor: (job) => job[5] },
    { header: 'QC Status', accessor: (job) => <StatusBadge status="passed">{job[6]}</StatusBadge> },
    { 
      header: 'Actions', 
      accessor: (job) => (
        <EnterpriseButton 
          variant="primary" 
          size="sm"
          onClick={() => handleStartWrapup(job)}
        >
          Start Wrap-Up
        </EnterpriseButton>
      )
    }
  ];

  /* Prepare table data for Active Wrap-ups */
  // wrapup: [id, soId, orderNo, customer, status, laborHours, startedAt]
  const activeWrapupsColumns = [
    { header: 'Order No', accessor: (w) => <strong>{w[2]}</strong> },
    { header: 'Customer', accessor: (w) => w[3] },
    { header: 'Status', accessor: (w) => <StatusBadge status={w[4]}>{w[4].replace('-', ' ')}</StatusBadge> },
    { header: 'Labor Hours', accessor: (w) => w[5] ? parseFloat(w[5]).toFixed(2) : '-' },
    { header: 'Started', accessor: (w) => new Date(w[6]).toLocaleDateString() },
    { 
      header: 'Actions', 
      accessor: (w) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          {w[4] === 'pending' && (
            <>
              <EnterpriseButton 
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedJob({ wrapupId: w[0], soId: w[1] });
                  setShowChecklistForm(true);
                }}
              >
                Checklist
              </EnterpriseButton>
              <EnterpriseButton 
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedJob({ wrapupId: w[0] });
                  setShowClockOutForm(true);
                }}
              >
                Clock Out
              </EnterpriseButton>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <ModuleLayout
      title="Job Wrap-Up Management"
      description="Manage job completion, checklists and clock-outs"
      icon="🏁"
      stats={moduleStats}
      user={user}
      onLogout={onLogout}
    >
      {/* Messages */}
      {errorMessage && (
        <div className="enterprise-alert error" style={{ marginBottom: '16px' }}>
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="enterprise-alert success" style={{ marginBottom: '16px' }}>
          {successMessage}
        </div>
      )}

      {/* Tabs */}
      <EnterpriseCard>
        <EnterpriseTabs
          tabs={tabItems}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div style={{ marginTop: '20px' }}>
          {activeTab === 'ready' && (
            readyJobs.length > 0 ? (
              <EnterpriseTable
                columns={readyJobsColumns}
                data={readyJobs}
              />
            ) : (
              <EmptyState 
                icon="⏱️"
                title="No Jobs Ready"
                description="There are no jobs currently waiting for wrap-up."
              />
            )
          )}

          {activeTab === 'active' && (
            activeWrapups.length > 0 ? (
              <EnterpriseTable
                columns={activeWrapupsColumns}
                data={activeWrapups}
              />
            ) : (
              <EmptyState 
                icon="🔄"
                title="No Active Wrap-Ups"
                description="There are no active wrap-up sessions."
              />
            )
          )}
        </div>
      </EnterpriseCard>

      {/* Clock Out Modal */}
      <Modal
        isOpen={showClockOutForm}
        onClose={() => setShowClockOutForm(false)}
        title="Technician Clock Out"
        footer={
          <>
            <EnterpriseButton variant="secondary" onClick={() => setShowClockOutForm(false)}>
              Cancel
            </EnterpriseButton>
            <EnterpriseButton variant="primary" onClick={handleClockOut}>
              Confirm Clock Out
            </EnterpriseButton>
          </>
        }
      >
        <EnterpriseFormGroup label="Final Notes">
          <textarea
            className="enterprise-textarea"
            rows="3"
            value={finalNotes}
            onChange={(e) => setFinalNotes(e.target.value)}
            placeholder="Enter any final notes about the job..."
          />
        </EnterpriseFormGroup>
      </Modal>

      {/* Checklist Modal */}
      <Modal
        isOpen={showChecklistForm}
        onClose={() => setShowChecklistForm(false)}
        title="Job Wrap-Up Checklist"
        footer={
          <>
            <EnterpriseButton variant="secondary" onClick={() => setShowChecklistForm(false)}>
              Cancel
            </EnterpriseButton>
            <EnterpriseButton variant="primary" onClick={handleUpdateChecklist}>
              Save Checklist
            </EnterpriseButton>
          </>
        }
      >
        <EnterpriseFormGroup label="Checklist Items">
          <textarea
            className="enterprise-textarea"
            rows="3"
            value={checklistData.checklistItems}
            onChange={(e) => setChecklistData({ ...checklistData, checklistItems: e.target.value })}
            placeholder="List checked items..."
          />
        </EnterpriseFormGroup>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <EnterpriseCheckbox
            label="Materials Returned"
            checked={checklistData.materialsReturned}
            onChange={(checked) => setChecklistData({ ...checklistData, materialsReturned: checked })}
          />
          <EnterpriseCheckbox
            label="Tools Returned"
            checked={checklistData.toolsReturned}
            onChange={(checked) => setChecklistData({ ...checklistData, toolsReturned: checked })}
          />
          <EnterpriseCheckbox
            label="Quality Passed"
            checked={checklistData.qualityPassed}
            onChange={(checked) => setChecklistData({ ...checklistData, qualityPassed: checked })}
          />
        </div>

        <EnterpriseFormGroup label="Vehicle Condition">
          <select 
            className="enterprise-select"
            value={checklistData.vehicleCondition}
            onChange={(e) => setChecklistData({ ...checklistData, vehicleCondition: e.target.value })}
          >
            <option value="Excellent">Excellent</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Poor">Poor</option>
          </select>
        </EnterpriseFormGroup>
      </Modal>

    </ModuleLayout>
  );
};

export default JobWrapupDashboard;
