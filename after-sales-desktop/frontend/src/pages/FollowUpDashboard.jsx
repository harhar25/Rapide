import React, { useState, useEffect } from 'react';
import '../styles/follow-up-dashboard.css';

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
    const interval = setInterval(fetchData, 60000); // Refresh every 60 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch pending follow-ups
      const pendingRes = await fetch('/api/follow-up/followups/pending');
      const pendingData = await pendingRes.json();
      if (pendingData.status === 'success') setPendingFollowups(pendingData.followups || []);
      
      // Fetch open issues
      const issuesRes = await fetch('/api/follow-up/issues');
      const issuesData = await issuesRes.json();
      if (issuesData.status === 'success') setOpenIssues(issuesData.issues || []);
      
      // Fetch summary
      const summaryRes = await fetch('/api/follow-up/summary');
      const summaryData = await summaryRes.json();
      if (summaryData.status === 'success') setSummary(summaryData.summary || {});
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleSelectFollowup = async (followupId) => {
    try {
      const res = await fetch(`/api/follow-up/followups/${followupId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setSelectedFollowup(followupId);
        setFollowupDetails(data.details);
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
      const res = await fetch('/api/follow-up/followups', {
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

      if (res.ok) {
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
      const res = await fetch(`/api/follow-up/followups/${selectedFollowup}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overall_experience: feedback.overall_experience,
          would_recommend: feedback.would_recommend,
          comments: feedback.comments
        })
      });

      if (res.ok) {
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
      const res = await fetch(`/api/follow-up/followups/${selectedFollowup}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue_category: newIssue.category,
          issue_description: newIssue.description,
          severity: newIssue.severity
        })
      });

      if (res.ok) {
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
      const res = await fetch(`/api/follow-up/followups/${selectedFollowup}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          completed_by: user.id,
          contact_person_name: prompt('Contact person name:') || 'Not recorded',
          notes: prompt('Additional notes:') || ''
        })
      });

      if (res.ok) {
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
      const res = await fetch(`/api/follow-up/issues/${issueId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution_type: resolutionType,
          resolution_notes: prompt('Resolution notes:') || ''
        })
      });

      if (res.ok) {
        alert('Issue resolved successfully');
        fetchData();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="followup-container">
      <div className="fu-header">
        <div className="fu-title">
          📞 Customer Follow-Up Management
        </div>
        <div className="fu-user-info">
          <span>{user.name} ({user.role})</span>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="fu-summary">
        {summary && (
          <>
            <div className="summary-card">
              <div className="summary-value">{summary.by_status?.filter(s => s[1] === 'pending')[0]?.[0] || 0}</div>
              <div className="summary-label">Pending Follow-ups</div>
            </div>
            <div className="summary-card success">
              <div className="summary-value">{summary.by_status?.filter(s => s[1] === 'completed')[0]?.[0] || 0}</div>
              <div className="summary-label">Completed Today</div>
            </div>
            <div className="summary-card warning">
              <div className="summary-value">{summary.issues_by_status?.filter(s => s[1] === 'open')[0]?.[0] || 0}</div>
              <div className="summary-label">Open Issues</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">{summary.issues_by_status?.filter(s => s[1] === 'resolved')[0]?.[0] || 0}</div>
              <div className="summary-label">Resolved Issues</div>
            </div>
          </>
        )}
      </div>

      <div className="fu-tabs">
        <button className={`tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>Pending Follow-ups</button>
        <button className={`tab ${activeTab === 'process' ? 'active' : ''}`} onClick={() => setActiveTab('process')}>Process Follow-up</button>
        <button className={`tab ${activeTab === 'issues' ? 'active' : ''}`} onClick={() => setActiveTab('issues')}>Issues Management</button>
        <button className={`tab ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>Create Follow-up</button>
      </div>

      <div className="fu-content">
        {activeTab === 'pending' && (
          <div className="tab-content">
            <h2>Pending Follow-ups</h2>
            <div className="actions">
              <button onClick={fetchData} className="action-btn refresh">Refresh</button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Service Order</th>
                    <th>Date</th>
                    <th>Contact Method</th>
                    <th>Feedback</th>
                    <th>Issues</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingFollowups.map((fu, idx) => (
                    <tr key={idx}>
                      <td>{fu[0]}</td>
                      <td>SO-{fu[1]}</td>
                      <td>{fu[3]?.substring(0, 10) || 'N/A'}</td>
                      <td>{fu[5]}</td>
                      <td><span className={`badge ${fu[7] ? 'success' : ''}`}>{fu[7] ? '✓' : '✗'}</span></td>
                      <td><span className={`badge ${fu[8] ? 'warning' : ''}`}>{fu[8] ? '⚠' : '✓'}</span></td>
                      <td>
                        <button onClick={() => handleSelectFollowup(fu[0])} className="action-btn">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'process' && (
          <div className="tab-content">
            <h2>Process Follow-up</h2>
            {!selectedFollowup ? (
              <div className="info-message">Select a pending follow-up to process</div>
            ) : followupDetails ? (
              <div className="followup-process">
                <div className="section">
                  <h3>Follow-up Information</h3>
                  <div className="info-grid">
                    <div><strong>Service Order:</strong> SO-{followupDetails.followup[1]}</div>
                    <div><strong>Date:</strong> {followupDetails.followup[3]}</div>
                    <div><strong>Status:</strong> <span className="badge">{followupDetails.followup[9]}</span></div>
                  </div>
                </div>

                <div className="section">
                  <h3>Customer Feedback</h3>
                  {followupDetails.feedback ? (
                    <div className="feedback-display">
                      <div><strong>Overall Experience:</strong> {followupDetails.feedback[5]}/5</div>
                      <div><strong>Would Recommend:</strong> {followupDetails.feedback[6]}</div>
                      <div><strong>Comments:</strong> {followupDetails.feedback[7]}</div>
                    </div>
                  ) : (
                    <form className="feedback-form">
                      <div className="form-group">
                        <label>Overall Experience (1-5)</label>
                        <input 
                          type="number" 
                          min="1" 
                          max="5"
                          value={feedback.overall_experience}
                          onChange={(e) => setFeedback({ ...feedback, overall_experience: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Would Recommend</label>
                        <select 
                          value={feedback.would_recommend}
                          onChange={(e) => setFeedback({ ...feedback, would_recommend: e.target.value })}
                        >
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="maybe">Maybe</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Comments</label>
                        <textarea 
                          value={feedback.comments}
                          onChange={(e) => setFeedback({ ...feedback, comments: e.target.value })}
                          placeholder="Customer feedback comments"
                        />
                      </div>
                      <button type="button" onClick={handleRecordFeedback} className="action-btn">Record Feedback</button>
                    </form>
                  )}
                </div>

                <div className="section">
                  <h3>Issues</h3>
                  {followupDetails.issues && followupDetails.issues.length > 0 ? (
                    <div className="issues-list">
                      {followupDetails.issues.map((issue, idx) => (
                        <div key={idx} className="issue-card">
                          <div><strong>{issue[2]}</strong> - {issue[4]}</div>
                          <div>{issue[3]}</div>
                          <div><span className={`severity-badge ${issue[4]}`}>{issue[4]}</span></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="info-message">No issues reported</div>
                  )}
                  
                  <div className="issue-form">
                    <h4>Log New Issue</h4>
                    <select 
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
                    <textarea 
                      placeholder="Issue description"
                      value={newIssue.description}
                      onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                    />
                    <select 
                      value={newIssue.severity}
                      onChange={(e) => setNewIssue({ ...newIssue, severity: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    <button onClick={handleLogIssue} className="action-btn">Log Issue</button>
                  </div>
                </div>

                <div className="section">
                  <button onClick={handleCompleteFollowup} className="submit-btn">Complete Follow-up</button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {activeTab === 'issues' && (
          <div className="tab-content">
            <h2>Issues Management</h2>
            <div className="actions">
              <button onClick={fetchData} className="action-btn refresh">Refresh</button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {openIssues.map((issue, idx) => (
                    <tr key={idx}>
                      <td>{issue[0]}</td>
                      <td>{issue[2]}</td>
                      <td>{issue[3]?.substring(0, 50) || 'N/A'}</td>
                      <td><span className={`severity-badge ${issue[4]}`}>{issue[4]}</span></td>
                      <td><span className="badge">{issue[5]}</span></td>
                      <td>
                        {issue[5] !== 'resolved' && (
                          <button onClick={() => handleResolveIssue(issue[0])} className="action-btn">Resolve</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <div className="tab-content">
            <h2>Create New Follow-up</h2>
            <form className="form-container">
              <div className="form-group">
                <label>Service Order ID *</label>
                <input 
                  type="text" 
                  value={newFollowup.service_order_id}
                  onChange={(e) => setNewFollowup({ ...newFollowup, service_order_id: e.target.value })}
                  placeholder="Enter service order ID"
                />
              </div>
              <div className="form-group">
                <label>Customer ID *</label>
                <input 
                  type="text" 
                  value={newFollowup.customer_id}
                  onChange={(e) => setNewFollowup({ ...newFollowup, customer_id: e.target.value })}
                  placeholder="Enter customer ID"
                />
              </div>
              <div className="form-group">
                <label>Follow-up Date *</label>
                <input 
                  type="date" 
                  value={newFollowup.followup_date}
                  onChange={(e) => setNewFollowup({ ...newFollowup, followup_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Contact Method</label>
                <select 
                  value={newFollowup.contact_method}
                  onChange={(e) => setNewFollowup({ ...newFollowup, contact_method: e.target.value })}
                >
                  <option value="phone">Phone</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="visit">In-person Visit</option>
                </select>
              </div>
              <button type="button" onClick={handleCreateFollowup} className="submit-btn">Create Follow-up</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
