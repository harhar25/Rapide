import React, { useState, useEffect } from 'react';
import '../styles/enterprise-ui.css';
import '../styles/dashboard-common.css';
import { fetchJson } from '../utils/fetchJson';
import { StatCard, EnterpriseCard, StatusBadge, EnterpriseTabs, LoadingSpinner, EmptyState } from '../components/EnterpriseComponents';

export default function ServiceManagerDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [overallStats, setOverallStats] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadOverallStats(),
        loadPendingApprovals(),
        loadRecentActivity()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOverallStats = async () => {
    try {
      const [billing, qc, wrapup, followup] = await Promise.all([
        fetchJson('/api/billing/summary'),
        fetchJson('/api/foreman-qc/summary'),
        fetchJson('/api/job-wrapup/wrapups/active'),
        fetchJson('/api/follow-up/summary')
      ]);

      setOverallStats({
        total_revenue: billing.data?.paid_amount || 0,
        pending_invoices: billing.data?.issued_count || 0,
        qc_passed: qc.data?.[1] || 0,
        qc_pending: qc.data?.[3] || 0,
        active_jobs: wrapup.data?.length || 0,
        pending_followups: followup.data?.by_status?.find(s => s[1] === 'pending')?.[0] || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadPendingApprovals = async () => {
    try {
      const gatepasses = await fetchJson('/api/gatepass/pending');
      setPendingApprovals(gatepasses.data || []);
    } catch (error) {
      console.error('Error loading approvals:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const activity = await fetchJson('/api/follow-up/followups/pending');
      setRecentActivity(activity.data?.slice(0, 10) || []);
    } catch (error) {
      console.error('Error loading activity:', error);
    }
  };

  const formatMoney = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '₱0.00';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const handleApproveGatepass = async (gatepassId) => {
    try {
      const result = await fetchJson('/api/gatepass/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatepass_id: gatepassId,
          signature_type: 'manager',
          signed_by: user.id
        })
      });

      if (result.success) {
        alert('Gatepass approved successfully');
        loadPendingApprovals();
      }
    } catch (error) {
      alert('Error approving gatepass: ' + error.message);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper">
        {/* Enterprise Header */}
        <div className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-title-section">
              <h1 className="dashboard-title">
                <span className="dashboard-title-icon">👔</span>
                Service Manager Dashboard
              </h1>
              <p className="dashboard-subtitle">Operations Overview & Approvals Management</p>
            </div>
            <div className="dashboard-actions">
              <button onClick={loadDashboardData} className="btn-enterprise btn-secondary btn-sm" disabled={loading}>
                {loading ? <LoadingSpinner size={16} /> : '🔄'} Refresh
              </button>
              {user?.role !== 'admin' && (
                <button onClick={onLogout} className="btn-enterprise btn-secondary btn-sm">Logout</button>
              )}
            </div>
          </div>
        </div>

        {/* Overall Statistics */}
        {overallStats && (
          <div className="summary-grid stagger-children">
            <StatCard 
              value={formatMoney(overallStats.total_revenue)} 
              label="Total Revenue"
              icon="💰"
            />
            <StatCard 
              value={overallStats.pending_invoices} 
              label="Pending Invoices"
              icon="📄"
            />
            <StatCard 
              value={overallStats.qc_passed} 
              label="QC Passed Today"
              icon="✓"
            />
            <StatCard 
              value={overallStats.qc_pending} 
              label="QC Pending"
              icon="⏳"
            />
            <StatCard 
              value={overallStats.active_jobs} 
              label="Active Jobs"
              icon="🔧"
            />
            <StatCard 
              value={overallStats.pending_followups} 
              label="Pending Follow-Ups"
              icon="📞"
            />
          </div>
        )}

        {/* Enterprise Tabs */}
        <EnterpriseTabs
          tabs={[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'approvals', label: 'Pending Approvals', icon: '✓' },
            { id: 'activity', label: 'Recent Activity', icon: '📋' }
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Content */}
        <div className="content-section">
          <div className="section-body">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="dashboard-grid">
                <EnterpriseCard title="System Health" subtitle="Current operational status">
                  <div style={{ padding: '20px 0' }}>
                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Backend API</span>
                      <StatusBadge status="active">Running</StatusBadge>
                    </div>
                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Database Connection</span>
                      <StatusBadge status="active">Connected</StatusBadge>
                    </div>
                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>All Modules</span>
                      <StatusBadge status="success">Operational</StatusBadge>
                    </div>
                  </div>
                </EnterpriseCard>

                <EnterpriseCard title="Quick Actions">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button className="btn-enterprise btn-primary" onClick={() => setActiveTab('approvals')}>
                      Review Pending Approvals ({pendingApprovals.length})
                    </button>
                    <button className="btn-enterprise btn-secondary" onClick={() => setActiveTab('activity')}>
                      View Recent Activity
                    </button>
                    <button className="btn-enterprise btn-secondary" onClick={loadDashboardData}>
                      Refresh Dashboard
                    </button>
                  </div>
                </EnterpriseCard>
              </div>
            )}

            {/* Approvals Tab */}
            {activeTab === 'approvals' && (
              <div>
                <h3 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '600' }}>Pending Gatepass Approvals</h3>
                {pendingApprovals.length === 0 ? (
                  <EmptyState 
                    icon="✓" 
                    title="No Pending Approvals" 
                    description="All gatepasses have been processed"
                  />
                ) : (
                  <div className="enterprise-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Gatepass #</th>
                          <th>Service Order</th>
                          <th>Vehicle</th>
                          <th>Customer</th>
                          <th>Signatures</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingApprovals.map((gp, idx) => (
                          <tr key={idx}>
                            <td><strong>{gp.gatepass_number}</strong></td>
                            <td>SO-{gp.service_order_id}</td>
                            <td>{gp.vehicle_plate_no}</td>
                            <td>{gp.customer_name}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {gp.cashier_signed && <StatusBadge status="success">Cashier</StatusBadge>}
                                {gp.accounting_signed && <StatusBadge status="success">Accounting</StatusBadge>}
                                {gp.warranty_signed && <StatusBadge status="success">Warranty</StatusBadge>}
                                {!gp.manager_signed && <StatusBadge status="pending">Manager Pending</StatusBadge>}
                              </div>
                            </td>
                            <td>
                              {!gp.manager_signed ? (
                                <button 
                                  className="btn-enterprise btn-success btn-sm"
                                  onClick={() => handleApproveGatepass(gp.gatepass_id)}
                                >
                                  Approve
                                </button>
                              ) : (
                                <StatusBadge status="success">Approved</StatusBadge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div>
                <h3 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '600' }}>Recent Activity</h3>
                {recentActivity.length === 0 ? (
                  <EmptyState 
                    icon="📋" 
                    title="No Recent Activity" 
                    description="No recent follow-ups or activities"
                  />
                ) : (
                  <div className="enterprise-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Customer</th>
                          <th>Status</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentActivity.map((activity, idx) => (
                          <tr key={idx}>
                            <td>{new Date(activity[3]).toLocaleDateString()}</td>
                            <td>{activity[5]}</td>
                            <td>{activity[1]}</td>
                            <td><StatusBadge status={activity[6]}>{activity[6]}</StatusBadge></td>
                            <td>{activity[7] ? 'Has feedback' : 'Pending'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
