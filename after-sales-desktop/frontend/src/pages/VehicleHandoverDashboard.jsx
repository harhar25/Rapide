import React, { useState, useEffect, useCallback } from 'react';
import '../styles/vehicle-handover-dashboard.css';
import '../styles/enterprise-ui.css';
import { fetchJson } from '../utils/fetchJson';
import { useAutoRefresh } from '../hooks/useRealtimeUpdates';
import ServiceDocumentBundle from '../components/ServiceDocumentBundle';
import { 
  ModuleLayout, 
  EnterpriseTable, 
  EnterpriseButton, 
  EnterpriseCard, 
  EnterpriseTabs, 
  StatusBadge, 
  EmptyState 
} from '../components/EnterpriseComponents';

// ── Inline Toast ──
function Toast({ message, type, onClose }) {
  if (!message) return null;
  const bg = type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#22c55e';
  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 99999,
      background: bg, color: '#fff', padding: '12px 20px', borderRadius: 8,
      boxShadow: '0 4px 24px rgba(0,0,0,.18)', fontSize: 14, fontWeight: 600,
      display: 'flex', alignItems: 'center', gap: 10, minWidth: 260, maxWidth: 420,
      animation: 'slideIn .25s ease-out'
    }}>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
    </div>
  );
}

export default function VehicleHandoverDashboard({ user, onLogout, embedded = false }) {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingHandovers, setPendingHandovers] = useState([]);
  const [completedHandovers, setCompletedHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [handingOver, setHandingOver] = useState(null); // tracks which handover ID is being processed
  const [printSOId, setPrintSOId] = useState(null); // service order ID for document bundle print

  // Toast state
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3500);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRealtimeUpdate = useCallback(() => { fetchData(); }, []);
  useAutoRefresh(['vehicle-handover', 'cashier', 'security-gate'], handleRealtimeUpdate);

  const fetchData = async () => {
    try {
      if (!initialLoadDone) setLoading(true);
      const [pendingData, completedData] = await Promise.all([
        fetchJson('/api/vehicle-handover/handovers/pending'),
        fetchJson('/api/vehicle-handover/handovers/completed')
      ]);
      if (pendingData.success) setPendingHandovers(pendingData.handovers || pendingData.data || []);
      if (completedData.success) setCompletedHandovers(completedData.handovers || completedData.data || []);
      if (!initialLoadDone) { setLoading(false); setInitialLoadDone(true); }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (!initialLoadDone) { setLoading(false); setInitialLoadDone(true); }
    }
  };

  // ── One-click hand over ──
  const handleHandOver = async (handoverId, e) => {
    if (e) e.stopPropagation();
    setHandingOver(handoverId);
    try {
      const res = await fetchJson(`/api/vehicle-handover/handovers/${handoverId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_cleanliness: 'good',
          fuel_level_final: 'as-is',
          mileage_final: '0',
          overall_condition: 'ready-for-delivery',
          all_items_returned: true
        })
      });
      if (res.success) {
        showToast('Vehicle handed over! Opening documents for print…');
        // Auto-open the document bundle print for this service order
        // row[0] = handover ID, row[1] = service_order_id
        const handover = pendingHandovers.find(h => h[0] === handoverId);
        if (handover) setPrintSOId(handover[1]);
        fetchData();
      } else {
        showToast(res.error || 'Failed to hand over', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('Failed to hand over', 'error');
    }
    setHandingOver(null);
  };

  // ── Header actions ──
  const headerActions = (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      <span style={{ marginRight: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        {user.name} ({user.role})
      </span>
      {user?.role !== 'admin' && (
        <EnterpriseButton variant="secondary" onClick={onLogout}>Logout</EnterpriseButton>
      )}
      <EnterpriseButton onClick={fetchData}>Refresh</EnterpriseButton>
    </div>
  );

  const tabs = [
    { id: 'pending', label: `Pending (${pendingHandovers.length})`, icon: '📋' },
    { id: 'completed', label: `Completed (${completedHandovers.length})`, icon: '✅' },
  ];

  // ── Table columns ──
  const pendingColumns = [
    { label: 'Service Order', key: 1, render: (val) => <strong>SO-{val}</strong> },
    { label: 'Customer', key: 4, render: (val) => val || 'N/A' },
    { label: 'Plate #', key: 7, render: (val) => <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>{val || '—'}</span> },
    { label: 'Vehicle', key: 10, render: (val) => val || '—' },
    { label: 'Date', key: 2, render: (val) => val && typeof val === 'string' ? val.substring(0, 10) : 'N/A' },
    { label: 'Action', key: 'action', render: (_, row) => (
      <button
        disabled={handingOver === row[0]}
        onClick={(e) => handleHandOver(row[0], e)}
        style={{
          padding: '8px 20px',
          background: handingOver === row[0] ? '#94a3b8' : '#22c55e',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: handingOver === row[0] ? 'not-allowed' : 'pointer',
          fontWeight: 700,
          fontSize: 13,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          transition: 'background .15s',
        }}
        onMouseEnter={(e) => { if (handingOver !== row[0]) e.currentTarget.style.background = '#16a34a'; }}
        onMouseLeave={(e) => { if (handingOver !== row[0]) e.currentTarget.style.background = '#22c55e'; }}
      >
        {handingOver === row[0] ? '⏳ Processing...' : '🔑 Hand Over'}
      </button>
    )}
  ];

  const completedColumns = [
    { label: 'Service Order', key: 1, render: (val) => <strong>SO-{val}</strong> },
    { label: 'Customer', key: 4, render: (val) => val || 'N/A' },
    { label: 'Plate #', key: 7, render: (val) => <span style={{ fontWeight: 700 }}>{val || '—'}</span> },
    { label: 'Vehicle', key: 10, render: (val) => val || '—' },
    { label: 'Completed', key: 2, render: (val) => val ? new Date(val).toLocaleString() : '—' },
    { label: 'Status', key: 6, render: () => <StatusBadge status="completed" /> },
    { label: 'Documents', key: 'print', render: (_, row) => (
      <button
        onClick={(e) => { e.stopPropagation(); setPrintSOId(row[1]); }}
        style={{
          padding: '6px 14px', background: '#1e40af', color: '#fff', border: 'none',
          borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12,
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#1e3a8a'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#1e40af'}
      >
        🖨️ Print All
      </button>
    )}
  ];

  const content = (
    <>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <EnterpriseTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div style={{ marginTop: '20px' }}>
        {/* ═══ PENDING TAB ═══ */}
        {activeTab === 'pending' && (
          <EnterpriseCard title="Pending Handovers">
            {pendingHandovers.length === 0 ? (
              <EmptyState 
                title="No Pending Handovers" 
                description="All vehicles have been handed over, or no service orders are ready for handover yet."
              />
            ) : (
              <EnterpriseTable columns={pendingColumns} data={pendingHandovers} />
            )}
          </EnterpriseCard>
        )}

        {/* ═══ COMPLETED TAB ═══ */}
        {activeTab === 'completed' && (
          <EnterpriseCard title="Completed Handovers">
            {completedHandovers.length === 0 ? (
              <EmptyState title="No Completed Handovers" description="Completed handovers will appear here." />
            ) : (
              <EnterpriseTable columns={completedColumns} data={completedHandovers} />
            )}
          </EnterpriseCard>
        )}
      </div>

      {/* Document Bundle Print Modal */}
      {printSOId && (
        <ServiceDocumentBundle
          serviceOrderId={printSOId}
          onClose={() => setPrintSOId(null)}
        />
      )}
    </>
  );

  if (embedded) {
    return <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>{content}</div>;
  }

  return (
    <ModuleLayout
      title="Vehicle Handover"
      description="Turnover & Client Acceptance"
      icon="🔑"
      user={user}
      onLogout={onLogout}
      actions={headerActions}
    >
      {content}
    </ModuleLayout>
  );
}