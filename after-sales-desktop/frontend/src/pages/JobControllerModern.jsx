import React, { useState, useEffect, useCallback } from 'react';
import '../styles/job-controller-modern.css';
import '../styles/job-controller-right-panel.css'; // New clean styling
import '../styles/enterprise-ui.css';
import { fetchJson } from '../utils/fetchJson';
import { useAutoRefresh } from '../hooks/useRealtimeUpdates';
import { 
  LoadingSpinner, 
  ModuleLayout,
  EmptyState
} from '../components/EnterpriseComponents';

// --- HELPER WRIDGE: LIVE TIMER ---
const JobTimer = ({ startTime, endTime }) => {
    const [duration, setDuration] = useState('0h 0m');

    useEffect(() => {
        if (!startTime) return;
        
        const update = () => {
            const start = new Date(startTime).getTime();
            const end = endTime ? new Date(endTime).getTime() : new Date().getTime();
            const diff = Math.max(0, end - start);
            
            const hrs = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            setDuration(`${hrs}h ${mins}m`);
        };

        update();
        if(!endTime) {
            const interval = setInterval(update, 3000); // Live update every 3s
            return () => clearInterval(interval);
        }
    }, [startTime, endTime]);

    return <span>{duration}</span>;
}

const JobControllerModern = ({ user, onLogout }) => {
  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Trigger auto-refresh

  // Data Buckets
  const [pendingOrders, setPendingOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [partsRequests, setPartsRequests] = useState([]);
  const [completedPartsRequests, setCompletedPartsRequests] = useState([]);
  const [inventory, setInventory] = useState([]); // Warehouse products
  const [qcPassedJobs, setQcPassedJobs] = useState([]); // QC-passed jobs ready for wrap-up
  const [stoppedWrapups, setStoppedWrapups] = useState([]); // Wrapups ready for Return to SA

  // Selection State
  const [selectedTicket, setSelectedTicket] = useState(null); // The order currently being dragged/selected
  
  // Modals
  const [showReqModal, setShowReqModal] = useState(false);
  const [reqForm, setReqForm] = useState([{ product_id: '', quantity: 1 }]);
  const [reqJob, setReqJob] = useState(null);

  // Toggle states for collapsible sections
  const [partsActivityExpanded, setPartsActivityExpanded] = useState(true);
  const [pendingExpanded, setPendingExpanded] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('pending'); // 'pending', 'parts', 'qc-done', or 'history'

  const API_BASE = '/api/job-controller';

  // --- REAL-TIME UPDATES ---
  const handleRealtimeUpdate = useCallback((event) => {
    // Trigger refresh when relevant events occur
    if (['job-controller', 'service-advisor', 'warehouse'].includes(event.module)) {
      setRefreshKey(k => k + 1);
    }
  }, []);

  // Subscribe to real-time updates for job controller and related modules
  useAutoRefresh(['job-controller', 'service-advisor', 'warehouse'], handleRealtimeUpdate);

  // --- EFFECT: DATA LOADING ---
  useEffect(() => {
    const fetchData = async () => {
      // Parallel data fetching for speed
      try {
        const [pendingRes, activeRes, techRes, partsRes, completedRes, invRes, qcPassedRes, stoppedRes] = await Promise.all([
            fetchJson(`${API_BASE}/service-orders/pending`),
            fetchJson(`${API_BASE}/service-orders/active`),
            fetchJson(`${API_BASE}/technicians/available`),
            fetchJson(`${API_BASE}/parts-requests/pending`),
            fetchJson(`${API_BASE}/parts-requests/completed?limit=20`),
            fetchJson('/api/warehouse/products'),
            fetchJson('/api/job-wrapup/jobs/ready'),      // QC-passed jobs
            fetchJson('/api/job-wrapup/wrapups/active')   // Stopped wrapups ready for return
        ]);

        if (pendingRes.success) setPendingOrders(pendingRes.data || []);
        if (activeRes.success) setActiveOrders(activeRes.data || []);
        if (techRes.success) setTechnicians(techRes.data || []);
        if (partsRes.success) setPartsRequests(partsRes.data || []);
        if (completedRes.success) setCompletedPartsRequests(completedRes.data || []);
        if (qcPassedRes.success) setQcPassedJobs(qcPassedRes.data || []);
        if (stoppedRes.success) setStoppedWrapups(stoppedRes.data || []);
        if (invRes.success) {
            // Transform tuple to object for easier usage
            // Product tuple: (id, code, name, category, price, qty, reorder, supplier, desc, status)
            const mapped = (invRes.data || []).map(p => ({
                id: p[0],
                code: p[1],
                name: p[2] + (p[3] ? ` - ${p[3]}` : ''), // Combine Name + Category for better search
                stock: p[5]
            }));
            setInventory(mapped);
        }

      } catch (err) {
        console.error("Dashboard Load Error:", err);
      } finally {
        if (!initialLoadDone) {
          setLoading(false);
          setInitialLoadDone(true);
        }
      }
    };

    fetchData();

    // Auto-refresh every 3 seconds
    const interval = setInterval(() => setRefreshKey(k => k + 1), 3000);
    return () => clearInterval(interval);
  }, [refreshKey, initialLoadDone]);


  // --- ACTIONS ---

  const handleTicketSelect = (order) => {
    if (selectedTicket && selectedTicket[0] === order[0]) {
      setSelectedTicket(null); // Deselect if clicking same
    } else {
      setSelectedTicket(order);
    }
  };

  const handleAssignToTech = async (tech) => {
    if (!selectedTicket) return;
    
    // Optimistic UI update could happen here
    const confirmMsg = `Assign ${selectedTicket[3]} (${selectedTicket[1]}) to Tech ${tech[1]}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetchJson(`${API_BASE}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_order_id: selectedTicket[0],
          technician_id: tech[0],
          assigned_by: user?.name || 'Controller'
        })
      });

      if (res.success) {
        // Success! Deselect and refresh
        setSelectedTicket(null);
        setRefreshKey(k => k + 1); // Force immediate data reload
      } else {
        alert(res.error || 'Assignment Failed');
      }
    } catch (e) {
      alert('Network Error');
    }
  };

  const handleApprovePart = async (reqId) => {
    if(!window.confirm("Approve this parts request?")) return;
    try {
        await fetchJson(`${API_BASE}/parts-requests/${reqId}/approve`, { method: 'POST' });
        setPartsRequests(prev => prev.filter(p => p.id !== reqId)); // Optimistic remove
    } catch (e) {
        alert("Error approving part");
    }
  };

  const handleClockAction = async (assignmentId, action) => {
      // action = 'clock-in' or 'clock-out'
      try {
          await fetchJson(`${API_BASE}/${action}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json'},
              body: JSON.stringify({ assignment_id: assignmentId })
          });
          setRefreshKey(k => k + 1);
      } catch(e) { console.error(e); }
  };

  // Stop Clock - creates wrapup for QC-passed job
  const handleStopClock = async (job) => {
    // job is a tuple: [service_order_id, job_order_no, customer, vehicle, tech_id, tech_name, qc_status, clock_in, clock_out]
    const serviceOrderId = job[0];
    const customer = job[2];
    const vehicle = job[3];
    
    if (!window.confirm(`Stop clock for ${customer} (${vehicle})?`)) return;
    
    try {
      const res = await fetchJson('/api/job-wrapup/wrapups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_order_id: serviceOrderId,
          job_controller_id: user?.id || null
        })
      });
      
      if (res.success) {
        setRefreshKey(k => k + 1);
      } else {
        alert(res.error || 'Failed to stop clock');
      }
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  };

  // Return to SA - marks wrapup as returned
  const handleReturnToSA = async (wrapup) => {
    const customer = wrapup.customer_name;
    const vehicle = wrapup.vehicle;
    const laborHours = wrapup.total_labor_hours?.toFixed(2) || '0';
    
    if (!window.confirm(`Return ${customer} (${vehicle}) to Service Advisor?\nLabor: ${laborHours}h`)) return;
    
    try {
      const res = await fetchJson(`/api/job-wrapup/wrapups/${wrapup.id}/return-to-sa`, {
        method: 'POST'
      });
      
      if (res.success) {
        setRefreshKey(k => k + 1);
      } else {
        alert(res.error || 'Failed to return to SA');
      }
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  };

  const [reqTechId, setReqTechId] = useState(null);

  const handleOpenReq = (job, techId) => {
      setReqJob(job);
      setReqTechId(techId);
      setReqForm([{ product_id: '', quantity: 1, searchTerm: '' }]);
      setShowReqModal(true);
  };

  const handleSubmitReq = async () => {
      if (!reqJob) return;
      if (reqForm.some(i => !i.product_id)) {
          alert("Please select a product for all rows.");
          return;
      }

      try {
          // Send request. Note: We use the car-jockey endpoint but we are the controller.
          // This creates a pending request.
          // Clean up the payload to remove UI-only fields like 'searchTerm'
          const payloadItems = reqForm.map(({ product_id, quantity }) => ({ product_id, quantity }));

          const res = await fetchJson('/api/job-controller/parts-requests', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  service_order_id: reqJob[0],
                  technician_id: reqTechId || user?.id || 1, // Prefer the actual tech, fallback to controller
                  items: payloadItems
              })
          });

          if (res.success) {
              alert("Request sent successfully!");
              setShowReqModal(false);
              setRefreshKey(k => k+1); // Refresh to see it in the "Pulse" list
          } else {
              alert("Failed to submit request: " + (res.message || "Unknown error"));
          }
      } catch (e) {
          console.error(e);
          alert("Network Error: " + e.message);
      }
  };


  // --- RENDER HELPERS ---

  const formatTime = (isoString) => {
      if (!isoString) return '--:--';
      return new Date(isoString).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  return (
    <div style={{ 
      height: '100vh', 
      overflow: 'hidden',
      background: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      
      {/* ===== TOP HEADER BAR ===== */}
      <div style={{
        background: '#fff',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            width: '42px', height: '42px', 
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', 
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', color: 'white', fontWeight: 700
          }}>JC</div>
          <div>
            <div style={{ color: '#1e293b', fontSize: '18px', fontWeight: 700 }}>Job Controller</div>
            <div style={{ color: '#64748b', fontSize: '12px' }}>Live Operations Dashboard</div>
          </div>
        </div>

        {/* Stats Pills */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '13px' }}>Pending</span>
            <span style={{ background: '#1e293b', color: '#fff', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', minWidth: '28px', textAlign: 'center' }}>{pendingOrders.length}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '13px' }}>Active</span>
            <span style={{ background: '#22c55e', color: '#fff', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', minWidth: '28px', textAlign: 'center' }}>{activeOrders.length}</span>
          </div>
          {partsRequests.filter(r => r.status === 'pending').length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: 500 }}>Parts Alert</span>
              <span style={{ background: '#dc2626', color: '#fff', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', minWidth: '28px', textAlign: 'center' }}>{partsRequests.filter(r => r.status === 'pending').length}</span>
            </div>
          )}
          {(qcPassedJobs.length + stoppedWrapups.length) > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#22c55e', fontSize: '13px', fontWeight: 500 }}>QC Done</span>
              <span style={{ background: '#22c55e', color: '#fff', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', minWidth: '28px', textAlign: 'center' }}>{qcPassedJobs.length + stoppedWrapups.length}</span>
            </div>
          )}
        </div>

        {/* User & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => setRefreshKey(k => k+1)} 
            style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
          >↻</button>
          <div style={{ color: '#475569', fontSize: '13px', fontWeight: 500 }}>{user?.name || 'Controller'}</div>
          <button 
            onClick={onLogout}
            style={{ background: '#1e293b', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
          >Logout</button>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* ===== LEFT: SHOP FLOOR (Main Area) ===== */}
        <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Selected Job Banner */}
          {selectedTicket && (
            <div style={{
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.15)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>SO</div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Ready to Assign</div>
                  <div style={{ color: '#fff', fontSize: '16px', fontWeight: 600 }}>{selectedTicket[4]} • {selectedTicket[3]}</div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>{selectedTicket[1]} • {selectedTicket[5]}</div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
              >Cancel</button>
            </div>
          )}

          {/* Technician Grid - Scrollable Area */}
          <div style={{ 
            flex: 1,
            overflowY: 'auto',
            paddingRight: '8px'
          }}>
            {/* Section Header */}
            <div style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
              marginBottom: '16px', padding: '0 4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '13px', fontWeight: 700 }}>T</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', letterSpacing: '-0.3px' }}>Shop Floor Technicians</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {technicians.filter(t => !activeOrders.find(o => o[6] === t[1])).length} available · {technicians.filter(t => activeOrders.find(o => o[6] === t[1])).length} working
                  </div>
                </div>
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: '14px' 
            }}>
            {technicians.map(tech => {
              const techId = tech[0];
              const techName = tech[1];
              const specialization = tech[5] || '';
              const currentJob = activeOrders.find(o => o[6] === techName);
              
              let status = 'available';
              let statusColor = '#16a34a';
              let statusBg = '#f0fdf4';
              let borderAccent = 'transparent';
              
              if (currentJob) {
                if (currentJob[7] === 'in-progress') {
                  status = 'working';
                  statusColor = '#d97706';
                  statusBg = '#fffbeb';
                  borderAccent = '#f59e0b';
                } else {
                  status = 'assigned';
                  statusColor = '#2563eb';
                  statusBg = '#eff6ff';
                  borderAccent = '#3b82f6';
                }
              }

              const initials = techName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              const avatarColors = [
                ['#7c3aed', '#a78bfa'], ['#2563eb', '#60a5fa'], ['#059669', '#34d399'],
                ['#d97706', '#fbbf24'], ['#dc2626', '#f87171'], ['#0891b2', '#22d3ee'],
                ['#7c3aed', '#c084fc'], ['#be185d', '#f472b6']
              ];
              const colorIdx = techName.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % avatarColors.length;
              const [avatarBg, avatarLight] = avatarColors[colorIdx];

              return (
                <div 
                  key={techId} 
                  onClick={() => { if (selectedTicket && status === 'available') handleAssignToTech(tech); }}
                  style={{
                    background: '#fff',
                    borderRadius: '14px',
                    border: selectedTicket && status === 'available' ? '2px solid #22c55e' : '1px solid #e9ecef',
                    padding: '0',
                    transition: 'all 0.2s ease',
                    cursor: selectedTicket && status === 'available' ? 'pointer' : 'default',
                    overflow: 'hidden',
                    boxShadow: currentJob 
                      ? '0 2px 12px rgba(0,0,0,0.06)' 
                      : '0 1px 4px rgba(0,0,0,0.04)',
                    borderTop: `3px solid ${currentJob ? borderAccent : 'transparent'}`,
                    position: 'relative'
                  }}
                >
                  {/* Card Header */}
                  <div style={{ 
                    padding: '16px 18px 12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px'
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: '42px', height: '42px',
                      borderRadius: '12px',
                      background: `linear-gradient(135deg, ${avatarBg} 0%, ${avatarLight} 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: '14px', fontWeight: 700,
                      letterSpacing: '0.5px',
                      flexShrink: 0,
                      boxShadow: `0 2px 8px ${avatarBg}33`
                    }}>
                      {initials}
                    </div>

                    {/* Name & Skill */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: '14px', fontWeight: 700, color: '#0f172a',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>{techName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                        {specialization ? (
                          <span style={{
                            fontSize: '10px', fontWeight: 600, 
                            color: avatarBg, 
                            background: `${avatarBg}12`,
                            padding: '2px 8px', borderRadius: '6px',
                            letterSpacing: '0.3px',
                            textTransform: 'uppercase'
                          }}>{specialization}</span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#cbd5e1' }}>No skill set</span>
                        )}
                        <span style={{ fontSize: '10px', color: '#cbd5e1' }}>•</span>
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>ID: {tech[2] || techId}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div style={{
                      background: statusBg,
                      color: statusColor,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      display: 'flex', alignItems: 'center', gap: '4px',
                      flexShrink: 0
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor, flexShrink: 0 }}></span>
                      {status}
                    </div>
                  </div>

                  {/* Content Area */}
                  {selectedTicket && status === 'available' ? (
                    <div style={{ padding: '0 18px 16px' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleAssignToTech(tech); }}
                        style={{
                          width: '100%',
                          padding: '11px',
                          background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                          border: 'none',
                          borderRadius: '10px',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          boxShadow: '0 2px 8px rgba(34,197,94,0.3)',
                          letterSpacing: '0.3px'
                        }}
                      >
                        Assign This Job
                      </button>
                    </div>
                  ) : currentJob ? (
                    <div style={{ padding: '0 18px 16px' }}>
                      {/* Active Job Info */}
                      <div style={{ 
                        background: '#f8fafc', borderRadius: '10px', 
                        padding: '12px', marginBottom: '10px',
                        border: '1px solid #f1f5f9'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ 
                            color: '#64748b', fontSize: '10px', fontWeight: 600,
                            background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px'
                          }}>SO-{String(currentJob[0]).padStart(5, '0')}</span>
                          <span style={{ 
                            color: '#0f172a', fontSize: '12px', fontWeight: 700,
                            display: 'flex', alignItems: 'center', gap: '4px'
                          }}>
                            <JobTimer startTime={currentJob[8]} endTime={currentJob[9]} />
                          </span>
                        </div>
                        <div style={{ color: '#1e293b', fontSize: '13px', fontWeight: 600 }}>{currentJob[4]}</div>
                        <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>{currentJob[5]}</div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {currentJob[7] === 'in-progress' ? (
                          <button 
                            onClick={() => handleClockAction(currentJob[11], 'clock-out')}
                            style={{ 
                              flex: 1, padding: '9px', 
                              background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', 
                              border: 'none', borderRadius: '8px', color: 'white', 
                              fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                              boxShadow: '0 2px 6px rgba(220,38,38,0.25)'
                            }}
                          >Stop Clock</button>
                        ) : (
                          <button 
                            onClick={() => handleClockAction(currentJob[11], 'clock-in')}
                            style={{ 
                              flex: 1, padding: '9px', 
                              background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', 
                              border: 'none', borderRadius: '8px', color: 'white', 
                              fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                              boxShadow: '0 2px 6px rgba(22,163,74,0.25)'
                            }}
                          >Start Clock</button>
                        )}
                        <button 
                          onClick={() => handleOpenReq(currentJob, techId)}
                          style={{ 
                            padding: '9px 14px', background: '#f1f5f9', 
                            border: '1px solid #e2e8f0', borderRadius: '8px', 
                            color: '#475569', fontSize: '12px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px'
                          }}
                          title="Request Parts"
                        >Parts</button>
                      </div>
                    </div>
                  ) : (
                    /* Idle state - subtle divider */
                    <div style={{ 
                      padding: '0 18px 14px',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                      <div style={{ 
                        width: '6px', height: '6px', borderRadius: '50%', 
                        background: '#22c55e',
                        animation: 'pulse 2s infinite'
                      }}></div>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>Ready for assignment</span>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        </div>

        {/* ===== RIGHT: SIDEBAR ===== */}
        <div style={{ 
          width: '360px', 
          background: '#fff', 
          borderLeft: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Sidebar Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <button 
              onClick={() => setSidebarTab('pending')}
              style={{ 
                flex: 1, 
                padding: '14px', 
                background: sidebarTab === 'pending' ? '#fff' : 'transparent', 
                border: 'none', 
                borderBottom: sidebarTab === 'pending' ? '2px solid #1e293b' : '2px solid transparent',
                color: sidebarTab === 'pending' ? '#1e293b' : '#64748b',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              Queue
              {pendingOrders.length > 0 && (
                <span style={{ background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>{pendingOrders.length}</span>
              )}
            </button>
            <button 
              onClick={() => setSidebarTab('parts')}
              style={{ 
                flex: 1, 
                padding: '14px', 
                background: sidebarTab === 'parts' ? '#fff' : 'transparent', 
                border: 'none', 
                borderBottom: sidebarTab === 'parts' ? '2px solid #1e293b' : '2px solid transparent',
                color: sidebarTab === 'parts' ? '#1e293b' : '#64748b',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              Parts
              {partsRequests.filter(r => r.status === 'pending').length > 0 && (
                <span style={{ background: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>{partsRequests.filter(r => r.status === 'pending').length}</span>
              )}
            </button>
            <button 
              onClick={() => setSidebarTab('qc-done')}
              style={{ 
                flex: 1, 
                padding: '14px', 
                background: sidebarTab === 'qc-done' ? '#fff' : 'transparent', 
                border: 'none', 
                borderBottom: sidebarTab === 'qc-done' ? '2px solid #22c55e' : '2px solid transparent',
                color: sidebarTab === 'qc-done' ? '#22c55e' : '#64748b',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              QC Done
              {(qcPassedJobs.length + stoppedWrapups.length) > 0 && (
                <span style={{ background: '#22c55e', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>{qcPassedJobs.length + stoppedWrapups.length}</span>
              )}
            </button>
            <button 
              onClick={() => setSidebarTab('history')}
              style={{ 
                flex: 1, 
                padding: '14px', 
                background: sidebarTab === 'history' ? '#fff' : 'transparent', 
                border: 'none', 
                borderBottom: sidebarTab === 'history' ? '2px solid #1e293b' : '2px solid transparent',
                color: sidebarTab === 'history' ? '#1e293b' : '#64748b',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              Delivered
            </button>
          </div>

          {/* Sidebar Content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            
            {/* PENDING TAB */}
            {sidebarTab === 'pending' && (
              <div style={{ padding: '12px' }}>
                {loading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading...</div>
                ) : pendingOrders.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', marginBottom: '8px', color: '#cbd5e1', fontWeight: 600 }}>—</div>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>No pending jobs</div>
                  </div>
                ) : (
                  pendingOrders.map(order => (
                    <div 
                      key={order[0]}
                      onClick={() => handleTicketSelect(order)}
                      style={{
                        background: selectedTicket && selectedTicket[0] === order[0] ? '#1e293b' : '#f8fafc',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        border: selectedTicket && selectedTicket[0] === order[0] ? '1px solid #1e293b' : '1px solid #e2e8f0',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ 
                          color: selectedTicket && selectedTicket[0] === order[0] ? '#93c5fd' : '#2563eb', 
                          fontSize: '11px', 
                          fontWeight: 700 
                        }}>SO #{order[0]}</div>
                        <div style={{ color: selectedTicket && selectedTicket[0] === order[0] ? '#94a3b8' : '#94a3b8', fontSize: '10px' }}>{formatTime(order[6])}</div>
                      </div>
                      <div style={{ color: selectedTicket && selectedTicket[0] === order[0] ? '#fff' : '#1e293b', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{order[4]} • {order[3]}</div>
                      <div style={{ color: selectedTicket && selectedTicket[0] === order[0] ? '#cbd5e1' : '#64748b', fontSize: '12px', marginBottom: '6px' }}>{order[1]}</div>
                      <div style={{ 
                        display: 'inline-block',
                        background: selectedTicket && selectedTicket[0] === order[0] ? '#334155' : '#e2e8f0', 
                        color: selectedTicket && selectedTicket[0] === order[0] ? '#cbd5e1' : '#64748b', 
                        padding: '4px 10px', 
                        borderRadius: '6px', 
                        fontSize: '11px' 
                      }}>{order[5]}</div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* PARTS TAB */}
            {sidebarTab === 'parts' && (
              <div>
                {partsRequests.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', marginBottom: '8px', color: '#cbd5e1', fontWeight: 600 }}>—</div>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>No parts requests</div>
                  </div>
                ) : (
                  <>
                    {/* Pending Approval */}
                    {partsRequests.filter(r => r.status === 'pending').length > 0 && (
                      <div>
                        <div style={{ padding: '10px 16px', background: '#fef2f2', color: '#991b1b', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', borderBottom: '1px solid #fecaca' }}>
                          NEEDS APPROVAL
                        </div>
                        {partsRequests.filter(r => r.status === 'pending').map(req => (
                          <div key={req.id} style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <div>
                                <div style={{ color: '#1e293b', fontSize: '13px', fontWeight: 500 }}>{req.technician_name}</div>
                                <div style={{ color: '#64748b', fontSize: '11px' }}>{req.vehicle}</div>
                              </div>
                              <div style={{ color: '#94a3b8', fontSize: '10px' }}>
                                {new Date(req.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                              </div>
                            </div>
                            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px', marginBottom: '10px', border: '1px solid #e2e8f0' }}>
                              {(req.items||[]).map((i,x) => (
                                <div key={x} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569', padding: '3px 0' }}>
                                  <span style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>{i.quantity_requested}×</span>
                                  <span>{i.product_name}</span>
                                </div>
                              ))}
                            </div>
                            <button 
                              onClick={() => handleApprovePart(req.id)}
                              style={{ width: '100%', padding: '10px', background: '#22c55e', border: 'none', borderRadius: '8px', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                            >Approve</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* In Warehouse */}
                    {partsRequests.filter(r => r.status !== 'pending').length > 0 && (
                      <div>
                        <div style={{ padding: '10px 16px', background: '#f0fdf4', color: '#166534', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', borderBottom: '1px solid #bbf7d0' }}>
                          IN WAREHOUSE
                        </div>
                        {partsRequests.filter(r => r.status !== 'pending').map(req => (
                          <div key={req.id} style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <div>
                                <div style={{ color: '#1e293b', fontSize: '12px', fontWeight: 500 }}>{req.technician_name || 'Unknown'}</div>
                                <div style={{ color: '#64748b', fontSize: '10px' }}>{req.vehicle}</div>
                              </div>
                              <span style={{ fontSize: '10px', background: '#dbeafe', color: '#1d4ed8', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                {req.status === 'approved' ? 'Preparing' : req.status}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {(req.items||[]).map((i,x) => (
                                <span key={x} style={{ fontSize: '10px', background: '#e2e8f0', color: '#475569', padding: '3px 6px', borderRadius: '4px' }}>
                                  {i.quantity_requested}× {i.product_name?.split(' ')[0]}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* QC DONE TAB - Job Wrap-Up */}
            {sidebarTab === 'qc-done' && (
              <div style={{ padding: '12px' }}>
                {/* Section 1: QC Passed - Need Stop Clock */}
                {qcPassedJobs.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ padding: '10px 12px', background: '#fef3c7', color: '#92400e', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      STOP CLOCK ({qcPassedJobs.length})
                    </div>
                    {qcPassedJobs.map(job => (
                      <div key={job[0]} style={{ background: '#fffbeb', borderBottom: '1px solid #fef3c7', padding: '14px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <div style={{ color: '#92400e', fontSize: '11px', fontWeight: 600 }}>{job[1]}</div>
                            <div style={{ color: '#1e293b', fontSize: '13px', fontWeight: 500 }}>{job[2]}</div>
                            <div style={{ color: '#64748b', fontSize: '11px' }}>{job[3]} • {job[5] || 'No Tech'}</div>
                          </div>
                          <span style={{ fontSize: '10px', background: '#22c55e', color: 'white', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>QC PASS</span>
                        </div>
                        <button 
                          onClick={() => handleStopClock(job)}
                          style={{ width: '100%', padding: '10px', background: '#dc2626', border: 'none', borderRadius: '6px', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Stop Clock
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Section 2: Stopped - Ready to Return to SA */}
                {stoppedWrapups.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ padding: '10px 12px', background: '#dbeafe', color: '#1d4ed8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      RETURN TO SA ({stoppedWrapups.length})
                    </div>
                    {stoppedWrapups.map(wrapup => (
                      <div key={wrapup.id} style={{ background: '#eff6ff', borderBottom: '1px solid #dbeafe', padding: '14px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <div style={{ color: '#1d4ed8', fontSize: '11px', fontWeight: 600 }}>SO #{wrapup.service_order_id}</div>
                            <div style={{ color: '#1e293b', fontSize: '13px', fontWeight: 500 }}>{wrapup.customer_name}</div>
                            <div style={{ color: '#64748b', fontSize: '11px' }}>{wrapup.vehicle} • {wrapup.technician_name || 'No Tech'}</div>
                          </div>
                          <span style={{ fontSize: '12px', background: '#334155', color: 'white', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
                            {wrapup.total_labor_hours?.toFixed(1) || '0'}h
                          </span>
                        </div>
                        <button 
                          onClick={() => handleReturnToSA(wrapup)}
                          style={{ width: '100%', padding: '10px', background: '#2563eb', border: 'none', borderRadius: '6px', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Return to Service Advisor
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {qcPassedJobs.length === 0 && stoppedWrapups.length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', marginBottom: '8px', color: '#cbd5e1', fontWeight: 600 }}>—</div>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>No jobs ready for wrap-up</div>
                    <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>QC-passed jobs will appear here</div>
                  </div>
                )}
              </div>
            )}

            {/* HISTORY TAB - Delivered Parts */}
            {sidebarTab === 'history' && (
              <div>
                {completedPartsRequests.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', marginBottom: '8px', color: '#cbd5e1', fontWeight: 600 }}>—</div>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>No delivery history yet</div>
                  </div>
                ) : (
                  <>
                    <div style={{ padding: '10px 16px', background: '#f8fafc', color: '#64748b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' }}>
                      RECENTLY DELIVERED ({completedPartsRequests.length})
                    </div>
                    {completedPartsRequests.map(req => (
                      <div key={req.id} style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <div>
                            <div style={{ color: '#1e293b', fontSize: '12px', fontWeight: 500 }}>{req.technician_name || 'Unknown'}</div>
                            <div style={{ color: '#64748b', fontSize: '10px' }}>{req.vehicle} • SO #{req.service_order_id}</div>
                          </div>
                          <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            Delivered
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                          {(req.items||[]).map((i,x) => (
                            <span key={x} style={{ fontSize: '10px', background: '#e2e8f0', color: '#475569', padding: '3px 6px', borderRadius: '4px' }}>
                              {i.quantity_requested}× {i.product_name?.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                          {req.updated_at ? new Date(req.updated_at).toLocaleString() : new Date(req.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== MODALS ===== */}

      {/* Parts Request Modal */}
      {showReqModal && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:100, display:'flex', justifyContent:'center', alignItems:'center', backdropFilter:'blur(4px)'}}>
          <div style={{background:'#fff', width:'480px', borderRadius:'16px', overflow:'hidden', maxHeight:'85vh', display:'flex', flexDirection:'column', border:'1px solid #e2e8f0', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.25)'}}>
            
            {/* Modal Header */}
            <div style={{padding:'20px 24px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                <div>
                  <div style={{fontSize:'11px', textTransform:'uppercase', letterSpacing:'1px', color:'#64748b', marginBottom:'4px'}}>Parts Request</div>
                  <div style={{fontSize:'18px', fontWeight:600, color:'#1e293b'}}>SO #{reqJob?.[0]}</div>
                </div>
                <button onClick={() => setShowReqModal(false)} style={{background:'#e2e8f0', border:'none', color:'#64748b', width:'32px', height:'32px', borderRadius:'8px', cursor:'pointer', fontSize:'16px'}}>×</button>
              </div>
              <div style={{marginTop:'8px', fontSize:'13px', color:'#64748b'}}>{reqJob?.[4]} • {reqJob?.[3]}</div>
            </div>
            
            {/* Modal Body */}
            <div style={{padding:'20px 24px', flex:1, overflowY:'auto', background:'#fff'}}>
              <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                {reqForm.map((item, idx) => {
                  const filterText = (item.searchTerm || '').toLowerCase();
                  const filteredInventory = inventory.filter(p => 
                    !filterText || p.name.toLowerCase().includes(filterText) || p.code.toLowerCase().includes(filterText)
                  ).slice(0, 10);
                  const isSelected = !!item.product_id;

                  return (
                    <div key={idx} style={{background: isSelected ? '#f0fdf4' : '#f8fafc', borderRadius:'10px', padding:'12px', border: isSelected ? '1px solid #22c55e' : '1px solid #e2e8f0', position:'relative', zIndex: 50 - idx}}>
                      <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                        <div style={{background:'#e2e8f0', color:'#64748b', width:'28px', height:'28px', borderRadius:'6px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700}}>
                          {idx + 1}
                        </div>
                        
                        <div style={{flex:1, position:'relative'}}>
                          <input 
                            type="text"
                            placeholder="Search parts..."
                            value={item.searchTerm || ''}
                            onChange={(e) => {
                              const newForm = [...reqForm];
                              newForm[idx].searchTerm = e.target.value;
                              newForm[idx].product_id = '';
                              setReqForm(newForm);
                            }}
                            style={{
                              width:'100%', padding:'10px 14px', borderRadius:'8px', border:'1px solid #e2e8f0',
                              background:'#fff', color:'#1e293b', fontSize:'13px', outline:'none'
                            }}
                          />
                          
                          {(!isSelected && filterText.length > 0) && (
                            <div style={{position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'#fff', border:'1px solid #e2e8f0', borderRadius:'8px', maxHeight:'180px', overflowY:'auto', zIndex:50, boxShadow:'0 10px 25px -5px rgba(0,0,0,0.1)'}}>
                              {filteredInventory.length === 0 ? (
                                <div style={{padding:'12px', color:'#64748b', fontSize:'12px', textAlign:'center'}}>No parts found</div>
                              ) : (
                                filteredInventory.map(p => (
                                  <div 
                                    key={p.id}
                                    onClick={() => {
                                      const newForm = [...reqForm];
                                      newForm[idx].product_id = p.id;
                                      newForm[idx].searchTerm = p.name;
                                      setReqForm(newForm);
                                    }}
                                    style={{padding:'10px 12px', cursor:'pointer', borderBottom:'1px solid #f1f5f9'}}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <div style={{color:'#1e293b', fontSize:'12px', fontWeight:500}}>{p.name}</div>
                                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'10px', color:'#64748b', marginTop:'2px'}}>
                                      <span>{p.code}</span>
                                      <span style={{color: p.stock > 0 ? '#16a34a' : '#dc2626'}}>{p.stock > 0 ? `${p.stock} avail` : 'Out'}</span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Quantity */}
                        <div style={{display:'flex', alignItems:'center', gap:'4px', background:'#f1f5f9', borderRadius:'8px', padding:'4px'}}>
                          <button onClick={() => { const f = [...reqForm]; f[idx].quantity = Math.max(1, (f[idx].quantity||1) - 1); setReqForm(f); }} style={{width:'28px', height:'28px', border:'none', background:'#e2e8f0', borderRadius:'6px', cursor:'pointer', color:'#475569', fontWeight:700}}>−</button>
                          <input type="number" min="1" value={item.quantity} onChange={(e) => { const f = [...reqForm]; f[idx].quantity = Math.max(1, Number(e.target.value)); setReqForm(f); }} style={{width:'40px', padding:'4px', border:'none', textAlign:'center', fontWeight:700, fontSize:'14px', background:'transparent', color:'#1e293b'}} />
                          <button onClick={() => { const f = [...reqForm]; f[idx].quantity = (f[idx].quantity||1) + 1; setReqForm(f); }} style={{width:'28px', height:'28px', border:'none', background:'#e2e8f0', borderRadius:'6px', cursor:'pointer', color:'#475569', fontWeight:700}}>+</button>
                        </div>
                        
                        {reqForm.length > 1 && (
                          <button onClick={() => setReqForm(reqForm.filter((_,i) => i!==idx))} style={{width:'28px', height:'28px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'6px', cursor:'pointer', color:'#dc2626', fontWeight:700}}>×</button>
                        )}
                      </div>
                      {isSelected && <div style={{marginTop:'8px', fontSize:'11px', color:'#16a34a'}}>✓ Selected</div>}
                    </div>
                  );
                })}
              </div>

              <button 
                onClick={() => setReqForm([...reqForm, {product_id:'', quantity:1, searchTerm:''}])}
                style={{marginTop:'16px', padding:'12px', width:'100%', background:'transparent', color:'#2563eb', border:'2px dashed #e2e8f0', borderRadius:'10px', cursor:'pointer', fontSize:'13px', fontWeight:500}}
              >+ Add Part</button>
            </div>
            
            {/* Modal Footer */}
            <div style={{padding:'16px 24px', background:'#f8fafc', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div style={{fontSize:'12px', color:'#64748b'}}>{reqForm.filter(r => r.product_id).length} part(s)</div>
              <div style={{display:'flex', gap:'10px'}}>
                <button onClick={() => setShowReqModal(false)} style={{padding:'10px 20px', background:'#fff', border:'1px solid #e2e8f0', borderRadius:'8px', color:'#64748b', fontSize:'13px', fontWeight:500, cursor:'pointer'}}>Cancel</button>
                <button 
                  onClick={handleSubmitReq} 
                  disabled={reqForm.filter(r => r.product_id).length === 0}
                  style={{padding:'10px 24px', background: reqForm.filter(r => r.product_id).length > 0 ? '#1e293b' : '#cbd5e1', border:'none', borderRadius:'8px', color:'white', fontSize:'13px', fontWeight:600, cursor: reqForm.filter(r => r.product_id).length > 0 ? 'pointer' : 'not-allowed'}}
                >Submit →</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobControllerModern;
