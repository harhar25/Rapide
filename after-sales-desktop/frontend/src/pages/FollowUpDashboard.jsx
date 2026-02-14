import React, { useState, useEffect, useCallback } from 'react';
import '../styles/enterprise-ui.css';
import '../styles/dashboard-common.css';
import { fetchJson } from '../utils/fetchJson';
import { useAutoRefresh } from '../hooks/useRealtimeUpdates';
import { 
  ModuleLayout, 
  EnterpriseTable, 
  EnterpriseButton, 
  EnterpriseFormGroup, 
  EnterpriseCard, 
  EnterpriseTabs, 
  StatCard as StatsCard, 
  StatusBadge, 
  EmptyState, 
  LoadingSpinner 
} from '../components/EnterpriseComponents';

export default function FollowUpDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingFollowups, setPendingFollowups] = useState([]);
  const [openIssues, setOpenIssues] = useState([]);
  const [selectedFollowup, setSelectedFollowup] = useState(null);
  const [followupDetails, setFollowupDetails] = useState(null);
  const [newFollowup, setNewFollowup] = useState({ 
    service_order_id: '', 
    customer_id: '', 
    followup_date: new Date().toISOString().split('T')[0],
    contact_method: 'phone'
  });
  const [newIssue, setNewIssue] = useState({
    category: 'quality',
    description: '',
    severity: 'medium'
  });
  const [feedback, setFeedback] = useState({
    overall_experience: 5,
    would_recommend: 'yes',
    comments: ''
  });
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000); // Refresh every 3s
    return () => clearInterval(interval);
  }, []);

  // --- REAL-TIME UPDATES ---
  const handleRealtimeUpdate = useCallback(() => {
    fetchData();
  }, []);

  useAutoRefresh(['follow-up', 'vehicle-handover'], handleRealtimeUpdate);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch pending follow-ups
      const pendingData = await fetchJson('/api/follow-up/followups/pending');
      if (pendingData.success) setPendingFollowups(pendingData.followups || pendingData.data || []);
      
      // Fetch open issues
      const issuesData = await fetchJson('/api/follow-up/issues');
      if (issuesData.success) setOpenIssues(issuesData.issues || issuesData.data || []);
      
      // Fetch summary
      const summaryData = await fetchJson('/api/follow-up/summary');
      if (summaryData.success) setSummary(summaryData.summary || summaryData.data || {});
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleSelectFollowup = async (followupId) => {
    try {
      const data = await fetchJson(`/api/follow-up/followups/${followupId}`);
      if (data.success) {
        setSelectedFollowup(followupId);
        setFollowupDetails(data.details || data.data);
      }
    } catch (error) {
      console.error('Error fetching follow-up details:', error);
    }
  };

  const handleCreateFollowup = async () => {
    if (!newFollowup.service_order_id || !newFollowup.customer_id) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const data = await fetchJson('/api/follow-up/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_order_id: newFollowup.service_order_id,
          customer_id: newFollowup.customer_id,
          followup_date: newFollowup.followup_date,
          contact_method: newFollowup.contact_method,
          scheduled_by: user.id
        })
      });

      if (data.success) {
        alert('Follow-up created successfully');
        setNewFollowup({ service_order_id: '', customer_id: '', followup_date: new Date().toISOString().split('T')[0], contact_method: 'phone' });
        fetchData();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleRecordFeedback = async () => {
    if (!selectedFollowup) return;

    try {
      const data = await fetchJson(`/api/follow-up/followups/${selectedFollowup}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overall_experience: feedback.overall_experience,
          would_recommend: feedback.would_recommend,
          comments: feedback.comments
        })
      });

      if (data.success) {
        alert('Feedback recorded successfully');
        handleSelectFollowup(selectedFollowup);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleLogIssue = async () => {
    if (!selectedFollowup || !newIssue.description) {
      alert('Please enter issue description');
      return;
    }

    try {
      const data = await fetchJson(`/api/follow-up/followups/${selectedFollowup}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue_category: newIssue.category,
          issue_description: newIssue.description,
          severity: newIssue.severity
        })
      });

      if (data.success) {
        alert('Issue logged successfully');
        setNewIssue({ category: 'quality', description: '', severity: 'medium' });
        handleSelectFollowup(selectedFollowup);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCompleteFollowup = async () => {
    if (!selectedFollowup) return;

    try {
      const data = await fetchJson(`/api/follow-up/followups/${selectedFollowup}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          completed_by: user.id,
          contact_person_name: prompt('Contact person name:') || 'Not recorded',
          notes: prompt('Additional notes:') || ''
        })
      });

      if (data.success) {
        alert('Follow-up completed successfully');
        setSelectedFollowup(null);
        setFollowupDetails(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleResolveIssue = async (issueId) => {
    const resolutionType = prompt('Resolution type (refund/rework/replacement/compensation/explanation/other):');
    if (!resolutionType) return;

    try {
      const data = await fetchJson(`/api/follow-up/issues/${issueId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution_type: resolutionType,
          resolution_notes: prompt('Resolution notes:') || ''
        })
      });

      if (data.success) {
        alert('Issue resolved successfully');
        fetchData();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const pendingColumns = [
    { label: 'ID', render: (_, row) => row[0] },
    { label: 'Service Order', render: (_, row) => `SO-${row[1]}` },
    { label: 'Date', render: (_, row) => row[3]?.substring(0, 10) || 'N/A' },
    { label: 'Contact Method', render: (_, row) => row[5] },
    { label: 'Feedback', render: (_, row) => (
      <StatusBadge status={row[7] ? 'success' : 'neutral'}>
        {row[7] ? 'Received' : 'Pending'}
      </StatusBadge>
    )},
    { label: 'Issues', render: (_, row) => (
      <StatusBadge status={row[8] ? 'warning' : 'success'}>
        {row[8] ? 'Reported' : 'None'}
      </StatusBadge>
    )},
    { label: 'Action', render: (_, row) => (
      <EnterpriseButton 
        variant="neutral" 
        size="small"
        onClick={() => {
          handleSelectFollowup(row[0]);
          setActiveTab('process');
        }}
      >
        View
      </EnterpriseButton>
    )}
  ];

  const issuesColumns = [
    { label: 'ID', render: (_, row) => row[0] },
    { label: 'Category', render: (_, row) => row[2] },
    { label: 'Description', render: (_, row) => row[3]?.substring(0, 50) || 'N/A' },
    { label: 'Severity', render: (_, row) => (
      <StatusBadge status={row[4] === 'critical' ? 'danger' : row[4] === 'high' ? 'warning' : row[4] === 'medium' ? 'neutral' : 'success'}>
        {row[4]}
      </StatusBadge>
    )},
    { label: 'Status', render: (_, row) => (
      <StatusBadge status={row[5] === 'resolved' ? 'success' : 'warning'}>
        {row[5]}
      </StatusBadge>
    )},
    { label: 'Action', render: (_, row) => row[5] !== 'resolved' && (
      <EnterpriseButton 
        variant="secondary" 
        size="small"
        onClick={() => handleResolveIssue(row[0])}
      >
        Resolve
      </EnterpriseButton>
    )}
  ];

  return (
    <ModuleLayout
      title="Follow-Up & QA"
      description="Customer Feedback & Quality Assurance"
      icon="📞"
      user={user}
      onLogout={onLogout}
      actions={
        (activeTab === 'pending' || activeTab === 'issues') && (
            <EnterpriseButton onClick={fetchData} variant="secondary">
                Refresh
            </EnterpriseButton>
        )
      }
    >
      <div className="followup-dashboard-content" style={{ padding: '0' }}>
        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <StatsCard 
              label="Pending Follow-ups" 
              value={summary.by_status?.filter(s => s[1] === 'pending')[0]?.[0] || 0} 
              icon="🕒"
            />
            <StatsCard 
              label="Completed Today" 
              value={summary.by_status?.filter(s => s[1] === 'completed')[0]?.[0] || 0} 
              trend="positive" 
              icon="✓"
            />
            <StatsCard 
              label="Open Issues" 
              value={summary.issues_by_status?.filter(s => s[1] === 'open')[0]?.[0] || 0} 
              trend="negative" 
              icon="⚠"
            />
            <StatsCard 
              label="Resolved Issues" 
              value={summary.issues_by_status?.filter(s => s[1] === 'resolved')[0]?.[0] || 0} 
              trend="positive" 
              icon="🛡️"
            />
          </div>
        )}

        <EnterpriseTabs
          tabs={[
            { id: 'pending', label: 'Pending Follow-ups', icon: '🕒' },
            { id: 'process', label: 'Process Follow-up', icon: '⚙️' },
            { id: 'issues', label: 'Issues Management', icon: '⚠' },
            { id: 'create', label: 'Create Follow-up', icon: '➕' }
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div style={{ marginTop: '1.5rem' }}>
          {activeTab === 'pending' && (
            <div className="tab-content">
              <h2 style={{ marginBottom: '1rem', marginTop: 0 }}>Pending Follow-ups</h2>
              <EnterpriseTable 
                columns={pendingColumns} 
                data={pendingFollowups} 
                emptyState={
                  <EmptyState 
                    title="No Pending Follow-ups" 
                    description="Great job! All follow-ups are clear." 
                  />
                }
              />
            </div>
          )}

          {activeTab === 'process' && (
            <div className="tab-content">
              <h2 style={{ marginBottom: '1rem', marginTop: 0 }}>Process Follow-up</h2>
              {!selectedFollowup ? (
                <EmptyState 
                  title="No Follow-up Selected" 
                  description="Select a pending follow-up from the Pending tab to process." 
                  icon="👆"
                />
              ) : !followupDetails ? (
                <LoadingSpinner />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <EnterpriseCard title="Follow-up Information">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', padding: '1rem' }}>
                      <div className="info-group">
                        <label style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Service Order</label>
                        <div style={{ fontWeight: 500 }}>SO-{followupDetails.followup[1]}</div>
                      </div>
                      <div className="info-group">
                        <label style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Date</label>
                        <div style={{ fontWeight: 500 }}>{followupDetails.followup[3]}</div>
                      </div>
                      <div className="info-group">
                        <label style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Status</label>
                        <div><StatusBadge status={followupDetails.followup[9]} /></div>
                      </div>
                    </div>
                  </EnterpriseCard>

                  <EnterpriseCard title="Customer Feedback">
                    {followupDetails.feedback ? (
                      <div style={{ padding: '1rem' }}>
                        <div><strong>Overall Experience:</strong> {followupDetails.feedback[5]}/5</div>
                        <div><strong>Would Recommend:</strong> {followupDetails.feedback[6]}</div>
                        <div style={{ marginTop: '0.5rem' }}><strong>Comments:</strong> {followupDetails.feedback[7]}</div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
                        <EnterpriseFormGroup label="Overall Experience (1-5)">
                          <input 
                            type="number" 
                            min="1" 
                            max="5"
                            className="enterprise-input"
                            value={feedback.overall_experience}
                            onChange={(e) => setFeedback({ ...feedback, overall_experience: parseInt(e.target.value) })}
                          />
                        </EnterpriseFormGroup>
                        <EnterpriseFormGroup label="Would Recommend">
                          <select 
                            className="enterprise-select"
                            value={feedback.would_recommend}
                            onChange={(e) => setFeedback({ ...feedback, would_recommend: e.target.value })}
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                            <option value="maybe">Maybe</option>
                          </select>
                        </EnterpriseFormGroup>
                        <EnterpriseFormGroup label="Comments">
                          <textarea 
                            className="enterprise-textarea"
                            value={feedback.comments}
                            onChange={(e) => setFeedback({ ...feedback, comments: e.target.value })}
                            placeholder="Customer feedback comments"
                            rows={3}
                          />
                        </EnterpriseFormGroup>
                        <div>
                          <EnterpriseButton onClick={handleRecordFeedback}>Record Feedback</EnterpriseButton>
                        </div>
                      </div>
                    )}
                  </EnterpriseCard>

                  <EnterpriseCard title="Issues">
                    <div style={{ padding: '1rem' }}>
                      {followupDetails.issues && followupDetails.issues.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                          {followupDetails.issues.map((issue, idx) => (
                            <div key={idx} style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <strong>{issue[2]}</strong>
                                <StatusBadge status={issue[4]}>{issue[4]}</StatusBadge>
                              </div>
                              <div style={{ color: 'var(--color-text-secondary)' }}>{issue[3]}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ marginBottom: '1.5rem', fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>No issues reported</div>
                      )}
                      
                      <h4 style={{ margin: '0 0 1rem 0' }}>Log New Issue</h4>
                      <div style={{ display: 'grid', gap: '1rem' }}>
                        <EnterpriseFormGroup label="Category">
                          <select 
                            className="enterprise-select"
                            value={newIssue.category}
                            onChange={(e) => setNewIssue({ ...newIssue, category: e.target.value })}
                          >
                            <option value="quality">Quality</option>
                            <option value="warranty">Warranty</option>
                            <option value="damage">Damage</option>
                            <option value="missing-parts">Missing Parts</option>
                            <option value="delayed">Delayed</option>
                            <option value="other">Other</option>
                          </select>
                        </EnterpriseFormGroup>
                        <EnterpriseFormGroup label="Description">
                          <textarea 
                            className="enterprise-textarea"
                            value={newIssue.description}
                            onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                            placeholder="Issue description"
                            rows={3}
                          />
                        </EnterpriseFormGroup>
                        <EnterpriseFormGroup label="Severity">
                          <select 
                            className="enterprise-select"
                            value={newIssue.severity}
                            onChange={(e) => setNewIssue({ ...newIssue, severity: e.target.value })}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </EnterpriseFormGroup>
                        <div>
                          <EnterpriseButton onClick={handleLogIssue} variant="secondary">Log Issue</EnterpriseButton>
                        </div>
                      </div>
                    </div>
                  </EnterpriseCard>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                    <EnterpriseButton onClick={handleCompleteFollowup} variant="primary" size="large">Complete Follow-up</EnterpriseButton>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'issues' && (
            <div className="tab-content">
              <h2 style={{ marginBottom: '1rem', marginTop: 0 }}>Issues Management</h2>
              <EnterpriseTable 
                columns={issuesColumns} 
                data={openIssues} 
                emptyState={
                  <EmptyState 
                    title="No Open Issues" 
                    description="No unresolved issues found." 
                  />
                }
              />
            </div>
          )}

          {activeTab === 'create' && (
            <div className="tab-content">
              <h2 style={{ marginBottom: '1rem', marginTop: 0 }}>Create New Follow-up</h2>
              <EnterpriseCard title="New Follow-up Details">
                <div style={{ maxWidth: '600px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <EnterpriseFormGroup label="Service Order ID" required>
                    <input 
                      className="enterprise-input"
                      value={newFollowup.service_order_id}
                      onChange={(e) => setNewFollowup({ ...newFollowup, service_order_id: e.target.value })}
                      placeholder="Enter service order ID"
                    />
                  </EnterpriseFormGroup>
                  <EnterpriseFormGroup label="Customer ID" required>
                    <input 
                      className="enterprise-input"
                      value={newFollowup.customer_id}
                      onChange={(e) => setNewFollowup({ ...newFollowup, customer_id: e.target.value })}
                      placeholder="Enter customer ID"
                    />
                  </EnterpriseFormGroup>
                  <EnterpriseFormGroup label="Follow-up Date" required>
                    <input 
                      type="date"
                      className="enterprise-input"
                      value={newFollowup.followup_date}
                      onChange={(e) => setNewFollowup({ ...newFollowup, followup_date: e.target.value })}
                    />
                  </EnterpriseFormGroup>
                  <EnterpriseFormGroup label="Contact Method">
                    <select 
                      className="enterprise-select"
                      value={newFollowup.contact_method}
                      onChange={(e) => setNewFollowup({ ...newFollowup, contact_method: e.target.value })}
                    >
                      <option value="phone">Phone</option>
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                      <option value="visit">In-person Visit</option>
                    </select>
                  </EnterpriseFormGroup>
                  <div style={{ marginTop: '1rem' }}>
                    <EnterpriseButton onClick={handleCreateFollowup} variant="primary">Create Follow-up</EnterpriseButton>
                  </div>
                </div>
              </EnterpriseCard>
            </div>
          )}
        </div>
      </div>
    </ModuleLayout>
  );
}
