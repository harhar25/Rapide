import React, { useState, useEffect, useCallback } from 'react';
import { 
  ModuleLayout, 
  EnterpriseTable, 
  EnterpriseButton, 
  EnterpriseFormGroup, 
  EnterpriseCard, 
  EnterpriseTabs, 
  StatCard, 
  StatusBadge, 
  EmptyState, 
  LoadingSpinner 
} from '../components/EnterpriseComponents';
import { fetchJson } from '../utils/fetchJson';
import { useAutoRefresh } from '../hooks/useRealtimeUpdates';
import '../styles/enterprise-ui.css';

export default function SecurityGateDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('release');
  const [entryLogs, setEntryLogs] = useState([]);
  const [exitLogs, setExitLogs] = useState([]);
  const [activeBadges, setActiveBadges] = useState([]);
  const [pendingGatepasses, setPendingGatepasses] = useState([]); // Vehicles ready to release
  const [newBadge, setNewBadge] = useState({ service_order_id: '', vehicle_plate: '', customer_name: '', customer_id: '', badge_days: 1 });
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchData(false);
    const interval = setInterval(() => fetchData(true), 5000); // Refresh every 5s (Silent)
    return () => clearInterval(interval);
  }, []);

  // --- REAL-TIME UPDATES ---
  const handleRealtimeUpdate = useCallback(() => {
    fetchData(true);
  }, []);

  useAutoRefresh(['security-gate', 'cashier', 'vehicle-handover'], handleRealtimeUpdate);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      // Fetch pending gatepasses (vehicles ready to release)
      const gatepassData = await fetchJson('/api/gatepass/pending');
      if (gatepassData.success) setPendingGatepasses(gatepassData.data || []);
      
      // Fetch entry logs
      const entryData = await fetchJson('/api/security-gate/logs/entries?date=' + new Date().toISOString().split('T')[0]);
      if (entryData.success) setEntryLogs(entryData.data || []);
      
      // Fetch exit logs
      const exitData = await fetchJson('/api/security-gate/logs/exits?date=' + new Date().toISOString().split('T')[0]);
      if (exitData.success) setExitLogs(exitData.data || []);
      
      // Fetch active badges
      const badgeData = await fetchJson('/api/security-gate/badges/active');
      if (badgeData.success) setActiveBadges(badgeData.data || badgeData.badges || []);
      
      // Fetch summary
      const summaryData = await fetchJson('/api/security-gate/summary');
      if (summaryData.success) setSummary(summaryData.data || summaryData.summary || {});
      
      if (!silent) {
        setLoading(false);
        setInitialLoadDone(true);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (!silent) {
        setLoading(false);
        setInitialLoadDone(true);
      }
    }
  };

  const handleIssueBadge = async () => {
    if (!newBadge.service_order_id || !newBadge.vehicle_plate) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const res = await fetchJson('/api/security-gate/badges/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_order_id: newBadge.service_order_id,
          vehicle_plate_no: newBadge.vehicle_plate,
          customer_name: newBadge.customer_name,
          customer_id: newBadge.customer_id,
          issued_by: user.id,
          expiry_days: newBadge.badge_days
        })
      });

      if (res.success) {
        alert('Badge issued successfully');
        setNewBadge({ service_order_id: '', vehicle_plate: '', customer_name: '', customer_id: '', badge_days: 1 });
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
        const res = await fetchJson(`/api/security-gate/badges/${badgeId}/revoke`, { method: 'POST' });
        if (res.success) {
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

    const soIdInput = prompt('Enter service order ID (optional):');
    let serviceOrderId = null;
    if (soIdInput && soIdInput.trim() !== '') {
      const parsed = parseInt(soIdInput, 10);
      serviceOrderId = Number.isFinite(parsed) ? parsed : null;
    }

    try {
      const res = await fetchJson('/api/security-gate/access/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_order_id: serviceOrderId,
          vehicle_plate_no: vehiclePlate,
          customer_name: null,
          access_type: accessType,
          gate_operator_id: user.id
        })
      });

      if (res.success) {
        alert(`${accessType} logged successfully`);
        fetchData();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleReleaseVehicle = async (gatepass) => {
    if (!window.confirm(`Release vehicle for Service Order #${gatepass.service_order_id}?`)) return;
    
    try {
      // Sign the gatepass
      const res = await fetchJson('/api/gatepass/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatepass_id: gatepass.id,
          signature_type: 'security',
          signed_by: user.id
        })
      });

      if (res.success) {
        alert('Vehicle released successfully!');
        fetchData();
      } else {
        alert('Error releasing vehicle: ' + (res.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error releasing vehicle');
    }
  };

  const entryColumns = [
    { label: 'Time', key: 'time', render: (val) => val?.substring(11, 19) || 'N/A' },
    { label: 'Plate Number', key: 'plate_no', render: (val) => val || 'N/A' },
    { label: 'Customer', key: 'customer', render: (val) => val || 'N/A' },
    { label: 'Gate Operator', key: 'operator', render: (val) => val || 'N/A' },
    { label: 'Authorization', key: 'authorized', render: (val) => (
        <StatusBadge status={val ? 'success' : 'danger'}>
            {val ? 'Authorized' : 'Not Authorized'}
        </StatusBadge>
    )}
  ];

  const exitColumns = [
    { label: 'Time', key: 'time', render: (val) => val?.substring(11, 19) || 'N/A' },
    { label: 'Plate Number', key: 'plate_no', render: (val) => val || 'N/A' },
    { label: 'Customer', key: 'customer', render: (val) => val || 'N/A' },
    { label: 'Gate Operator', key: 'operator', render: (val) => val || 'N/A' },
    { label: 'Status', key: 'status', render: () => <StatusBadge status="success">Completed</StatusBadge> }
  ];

  const badgeColumns = [
    { label: 'Badge #', key: 'badge_no' },
    { label: 'Plate Number', key: 'plate_no' },
    { label: 'Customer', key: 'customer' },
    { label: 'Issue Date', key: 'issued', render: (val) => val?.substring(0, 10) },
    { label: 'Expiry Date', key: 'expires', render: (val) => val?.substring(0, 10) },
    { label: 'Type', key: 'type' },
    { label: 'Scans', key: 'scans' },
    { label: 'Action', key: 'action', render: (_, row) => (
        <EnterpriseButton variant="danger" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleRevokeBadge(row.badge_no)}>
            Revoke
        </EnterpriseButton>
    )}
  ];

  const actions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ fontSize: '0.875rem', color: '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '8px' }}>
            <span style={{ fontWeight: '600', color: '#111827' }}>{user.name}</span>
            <span style={{ fontSize: '0.75rem' }}>{user.role}</span>
        </div>
        {user?.role !== 'admin' && (
            <EnterpriseButton variant="secondary" onClick={onLogout}>Logout</EnterpriseButton>
        )}
        <EnterpriseButton variant="primary" onClick={fetchData}>Refresh</EnterpriseButton>
    </div>
  );

  return (
    <ModuleLayout
        title="Security Gate"
        description="Access Control & Visitor Management"
        icon="🚧"
        user={user}
        onLogout={onLogout}
        actions={actions}
    >
      <div className="sg-dashboard-content">
        {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <StatCard label="Entries Today" value={summary.total_entries || 0} />
                <StatCard label="Exits Today" value={summary.total_exits || 0} />
                <StatCard label="Access Denied" value={(summary.denied_entries || 0) + (summary.denied_exits || 0)} />
                <StatCard label="Vehicles On-Site" value={summary.vehicles_processed || 0} />
            </div>
        )}

        <EnterpriseTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={[
                { id: 'release', label: `Ready for Release (${pendingGatepasses.length})`, icon: '🚗' },
                { id: 'entries', label: 'Entry Logs', icon: '📥' },
                { id: 'exits', label: 'Exit Logs', icon: '📤' },
                { id: 'badges', label: 'Badge Management', icon: '📇' },
                { id: 'issue', label: 'Issue Badge', icon: '➕' },
            ]}
        />

        <div style={{ marginTop: '1.5rem' }}>
            {activeTab === 'release' && (
                <EnterpriseCard 
                    title="Vehicles Ready for Release"
                    subtitle="Paid vehicles waiting to exit - Handover must be completed first"
                >
                    {pendingGatepasses.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {pendingGatepasses.map((gp) => {
                                const handoverComplete = gp.handover_status === 'completed';
                                return (
                                <div key={gp.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px',
                                    background: handoverComplete ? '#f0fdf4' : '#fef3c7',
                                    border: `2px solid ${handoverComplete ? '#22c55e' : '#f59e0b'}`,
                                    borderRadius: '8px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{ fontSize: '40px' }}>{handoverComplete ? '🚗' : '⏳'}</div>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '18px', color: handoverComplete ? '#166534' : '#92400e' }}>
                                                {gp.plate_no || 'Unknown Plate'}
                                            </div>
                                            <div style={{ color: '#333', fontSize: '14px' }}>
                                                {gp.customer_name || 'Walk-in'} • {gp.service_type || 'Service'}
                                            </div>
                                            <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                                                SO #{gp.service_order_id} • Gatepass #{gp.id} • {new Date(gp.created_at).toLocaleTimeString()}
                                            </div>
                                            <div style={{ 
                                                marginTop: '6px', 
                                                padding: '4px 8px', 
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                display: 'inline-block',
                                                background: handoverComplete ? '#dcfce7' : '#fef9c3',
                                                color: handoverComplete ? '#166534' : '#92400e'
                                            }}>
                                                {handoverComplete ? '✓ Handover Complete' : '⏳ Awaiting Vehicle Handover'}
                                            </div>
                                        </div>
                                    </div>
                                    {handoverComplete ? (
                                        <EnterpriseButton 
                                            variant="primary" 
                                            onClick={() => handleReleaseVehicle(gp)}
                                            style={{ background: '#22c55e', padding: '12px 24px', fontSize: '16px' }}
                                        >
                                            ✓ Release Vehicle
                                        </EnterpriseButton>
                                    ) : (
                                        <div style={{ 
                                            padding: '12px 24px', 
                                            background: '#e5e7eb', 
                                            borderRadius: '8px',
                                            color: '#6b7280',
                                            fontSize: '14px',
                                            textAlign: 'center'
                                        }}>
                                            Complete handover<br/>before release
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    ) : (
                        <EmptyState 
                            icon="✅" 
                            title="No vehicles waiting" 
                            description="All paid vehicles have been released"
                        />
                    )}
                </EnterpriseCard>
            )}

            {activeTab === 'entries' && (
                <EnterpriseCard 
                    title="Entry Logs - Today"
                    footer={
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <EnterpriseButton onClick={() => handleLogAccess('entry')}>Log Entry</EnterpriseButton>
                        </div>
                    }
                >
                    {loading ? <LoadingSpinner /> : (
                        <EnterpriseTable columns={entryColumns} data={entryLogs} />
                    )}
                </EnterpriseCard>
            )}

            {activeTab === 'exits' && (
               <EnterpriseCard 
                    title="Exit Logs - Today"
                    footer={
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <EnterpriseButton onClick={() => handleLogAccess('exit')}>Log Exit</EnterpriseButton>
                        </div>
                    }
               >
                    {loading ? <LoadingSpinner /> : (
                        <EnterpriseTable columns={exitColumns} data={exitLogs} />
                    )}
               </EnterpriseCard>
            )}

            {activeTab === 'badges' && (
                <EnterpriseCard title="Active Vehicle Badges">
                    {loading ? <LoadingSpinner /> : (
                        <EnterpriseTable columns={badgeColumns} data={activeBadges} />
                    )}
                </EnterpriseCard>
            )}

            {activeTab === 'issue' && (
                <EnterpriseCard title="Issue New Vehicle Badge" className="max-w-2xl">
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <EnterpriseFormGroup label="Service Order ID *">
                            <input
                                type="text"
                                className="enterprise-input"
                                value={newBadge.service_order_id}
                                onChange={(e) => setNewBadge({ ...newBadge, service_order_id: e.target.value })}
                                placeholder="Enter service order ID"
                            />
                        </EnterpriseFormGroup>
                        <EnterpriseFormGroup label="Vehicle Plate Number *">
                            <input
                                type="text"
                                className="enterprise-input"
                                value={newBadge.vehicle_plate}
                                onChange={(e) => setNewBadge({ ...newBadge, vehicle_plate: e.target.value })}
                                placeholder="e.g. ABC-1234"
                            />
                        </EnterpriseFormGroup>
                        <EnterpriseFormGroup label="Customer Name">
                            <input
                                type="text"
                                className="enterprise-input"
                                value={newBadge.customer_name}
                                onChange={(e) => setNewBadge({ ...newBadge, customer_name: e.target.value })}
                                placeholder="Enter customer name"
                            />
                        </EnterpriseFormGroup>
                        <EnterpriseFormGroup label="Customer ID">
                            <input
                                type="text"
                                className="enterprise-input"
                                value={newBadge.customer_id || ''}
                                onChange={(e) => setNewBadge({ ...newBadge, customer_id: e.target.value })}
                                placeholder="Customer ID"
                            />
                        </EnterpriseFormGroup>
                         <EnterpriseFormGroup label="Badge Validity (Days)">
                            <input
                                type="number"
                                className="enterprise-input"
                                min="1"
                                max="30"
                                value={newBadge.badge_days}
                                onChange={(e) => setNewBadge({ ...newBadge, badge_days: parseInt(e.target.value) })}
                            />
                        </EnterpriseFormGroup>
                     </div>
                     <div style={{ marginTop: '1.5rem' }}>
                        <EnterpriseButton variant="primary" onClick={handleIssueBadge}>
                            Issue Badge
                        </EnterpriseButton>
                     </div>
                </EnterpriseCard>
            )}
        </div>
      </div>
    </ModuleLayout>
  );
}

