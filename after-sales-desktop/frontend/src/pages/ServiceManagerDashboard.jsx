import React, { useState, useEffect } from 'react';
import '../styles/enterprise-ui.css';
import { fetchJson } from '../utils/fetchJson';
import { 
  ModuleLayout, 
  EnterpriseTable, 
  EnterpriseButton, 
  EnterpriseCard, 
  EnterpriseTabs, 
  StatCard, 
  StatusBadge, 
  EmptyState, 
  LoadingSpinner 
} from '../components/EnterpriseComponents';

export default function ServiceManagerDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [overallStats, setOverallStats] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 3000); // Refresh every 3s
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    if (!initialLoadDone) setLoading(true);
    try {
      await Promise.all([
        loadOverallStats(),
        loadPendingApprovals(),
        loadRecentActivity()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      if (!initialLoadDone) {
        setLoading(false);
        setInitialLoadDone(true);
      }
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

  // Columns for Approvals Table
  const approvalColumns = [
    { label: 'ID', key: 'gatepass_number', render: (val) => <strong>{val}</strong> },
    { label: 'Customer', key: 'customer_name' },
    { label: 'Plate', key: 'vehicle_plate_no' },
    { 
      label: 'Status', 
      key: 'status', 
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {row.cashier_signed && <StatusBadge status="success">Cashier</StatusBadge>}
            {row.accounting_signed && <StatusBadge status="success">Accounting</StatusBadge>}
            {row.warranty_signed && <StatusBadge status="success">Warranty</StatusBadge>}
            {!row.manager_signed && <StatusBadge status="pending">Manager Pending</StatusBadge>}
        </div>
      )
    },
    { 
      label: 'Actions', 
      key: 'actions', 
      render: (_, row) => (
        !row.manager_signed ? (
            <EnterpriseButton 
                variant="success" 
                size="sm"
                onClick={() => handleApproveGatepass(row.gatepass_id)}
            >
                Approve
            </EnterpriseButton>
        ) : (
            <StatusBadge status="success">Approved</StatusBadge>
        )
      )
    }
  ];

  // Columns for Activity Table
  const activityColumns = [
    { label: 'Date', key: 'date', render: (_, row) => new Date(row[3]).toLocaleDateString() },
    { label: 'Type', key: 'type', render: (_, row) => row[5] },
    { label: 'Customer', key: 'customer', render: (_, row) => row[1] },
    { label: 'Status', key: 'status', render: (_, row) => <StatusBadge status={row[6]}>{row[6]}</StatusBadge> },
    { label: 'Details', key: 'details', render: (_, row) => row[7] ? 'Has feedback' : 'Pending' }
  ];

  return (
    <ModuleLayout
      title="Service Manager"
      description="Operational Overview & Approvals"
      icon="👨‍💼"
      user={user}
      onLogout={onLogout}
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <EnterpriseButton variant="secondary" onClick={loadDashboardData} disabled={loading} size="sm">
            {loading ? <LoadingSpinner size={16} /> : '🔄 Refresh'}
          </EnterpriseButton>
           {user?.role !== 'admin' && (
             <EnterpriseButton variant="secondary" onClick={onLogout} size="sm">Logout</EnterpriseButton>
           )}
        </div>
      }
    >
      <EnterpriseTabs
        tabs={[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'approvals', label: 'Approvals', icon: '✓' },
            { id: 'activity', label: 'Activity', icon: '📋' }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div style={{ marginTop: '20px' }}>
        {activeTab === 'overview' && overallStats && (
            <div className="dashboard-grid" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <StatCard value={formatMoney(overallStats.total_revenue)} label="Total Revenue" icon="💰" />
                    <StatCard value={overallStats.pending_invoices} label="Pending Invoices" icon="📄" />
                    <StatCard value={overallStats.qc_passed} label="QC Passed Today" icon="✓" />
                    <StatCard value={overallStats.qc_pending} label="QC Pending" icon="⏳" />
                    <StatCard value={overallStats.active_jobs} label="Active Jobs" icon="🔧" />
                    <StatCard value={overallStats.pending_followups} label="Pending Follow-Ups" icon="📞" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
                            <EnterpriseButton variant="primary" onClick={() => setActiveTab('approvals')}>
                                Review Pending Approvals ({pendingApprovals.length})
                            </EnterpriseButton>
                            <EnterpriseButton variant="secondary" onClick={() => setActiveTab('activity')}>
                                View Recent Activity
                            </EnterpriseButton>
                        </div>
                    </EnterpriseCard>
                </div>
            </div>
        )}

        {activeTab === 'approvals' && (
            <EnterpriseCard title="Pending Gatepass Approvals">
                {pendingApprovals.length === 0 ? (
                    <EmptyState icon="✓" title="No Pending Approvals" description="All gatepasses have been processed" />
                ) : (
                    <EnterpriseTable 
                        columns={approvalColumns}
                        data={pendingApprovals}
                    />
                )}
            </EnterpriseCard>
        )}

        {activeTab === 'activity' && (
            <EnterpriseCard title="Recent Activity">
                 {recentActivity.length === 0 ? (
                    <EmptyState icon="📋" title="No Recent Activity" description="No recent follow-ups or activities" />
                ) : (
                    <EnterpriseTable 
                        columns={activityColumns}
                        data={recentActivity}
                    />
                )}
            </EnterpriseCard>
        )}
      </div>
    </ModuleLayout>
  );
}
