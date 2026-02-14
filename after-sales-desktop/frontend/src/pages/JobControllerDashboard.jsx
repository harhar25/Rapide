import React, { useState, useEffect, useCallback } from 'react';
import '../styles/job-controller-dashboard.css';
import '../styles/enterprise-ui.css';
import '../styles/dashboard-common.css';
import { fetchJson } from '../utils/fetchJson';
import { useAutoRefresh } from '../hooks/useRealtimeUpdates';
import { 
  StatCard, 
  EnterpriseCard, 
  StatusBadge, 
  EnterpriseTabs, 
  EnterpriseTable, 
  LoadingSpinner, 
  EmptyState, 
  ModuleLayout,
  EnterpriseButton,
  EnterpriseFormGroup,
  SearchBar
} from '../components/EnterpriseComponents';
import AnvilJobOrderForm from '../components/AnvilJobOrderForm';

const JobControllerDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('pending-orders');
  const [pendingOrders, setPendingOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [availableTechs, setAvailableTechs] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedTech, setSelectedTech] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const [laborSummary, setLaborSummary] = useState(null);
  const [clockRecords, setClockRecords] = useState([]);
  const [showJobOrderForm, setShowJobOrderForm] = useState(false);
  const [selectedJobOrder, setSelectedJobOrder] = useState(null);
  const [techSearchTerm, setTechSearchTerm] = useState('');
  const [partsRequests, setPartsRequests] = useState([]);
  const [showPartsForm, setShowPartsForm] = useState(false);
  const [newRequestDraft, setNewRequestDraft] = useState({
      soId: '',
      techId: '',
      notes: '',
      items: [{ productId: '', quantity: 1 }]
  });

  const API_BASE = '/api/job-controller';

  // Load data on mount
  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 3000); // Refresh every 3s
    return () => clearInterval(interval);
  }, []);

  // Real-time updates - refresh when service-advisor creates new orders
  const handleRealtimeUpdate = useCallback(() => {
    refreshAll();
  }, []);

  useAutoRefresh(['service-advisor', 'job-controller', 'warehouse'], handleRealtimeUpdate);

  const loadPartsRequests = async () => {
    try {
      const data = await fetchJson(`${API_BASE}/parts-requests/pending`);
      if (data.success) {
        setPartsRequests(data.data || []);
      }
    } catch (error) {
      console.error('Error loading parts requests:', error);
    }
  };
  
  const handleApprovePartRequest = async (id) => {
    if (!window.confirm('Approve this request and send to Warehouse?')) return;
    try {
      const resp = await fetchJson(`${API_BASE}/parts-requests/${id}/approve`, { method: 'POST' });
      if (resp.success) {
        alert('Request approved.');
        loadPartsRequests();
      }
    } catch (e) {
      alert('Error approving request: ' + e);
    }
  };

  const handleSubmitPartsRequest = async () => {
      if (!newRequestDraft.soId) return alert('Select a Service Order');
      if (newRequestDraft.items.some(i => !i.productId)) return alert('Enter valid Product IDs');
      
      try {
          const res = await fetchJson(`${API_BASE}/parts-requests`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  service_order_id: newRequestDraft.soId,
                  technician_id: newRequestDraft.techId,
                  notes: newRequestDraft.notes,
                  items: newRequestDraft.items.map(i => ({ 
                      product_id: parseInt(i.productId), 
                      quantity: parseInt(i.quantity) 
                  }))
              })
          });
          if (res.success) {
              alert('Parts Request Sent to Warehouse');
              setShowPartsForm(false);
              setNewRequestDraft({ soId: '', techId: '', notes: '', items: [{ productId: '', quantity: 1 }] });
              loadPartsRequests();
          } else {
              alert(res.error || 'Failed');
          }
      } catch (e) {
          alert('Error: ' + e.message);
      }
  };

  const loadPendingOrders = async (setSpinner = true) => {
    if (setSpinner) setLoading(true);
    try {
      const data = await fetchJson(`${API_BASE}/service-orders/pending`);
      if (data.success) {
        setPendingOrders(data.data || []);
      }
    } catch (error) {
      console.error('Error loading pending orders:', error);
    }
    if (setSpinner) setLoading(false);
  };

  const loadActiveOrders = async () => {
    try {
      const data = await fetchJson(`${API_BASE}/service-orders/active`);
      if (data.success) {
        setActiveOrders(data.data || []);
      }
    } catch (error) {
      console.error('Error loading active orders:', error);
    }
  };

  const loadAvailableTechs = async () => {
    try {
      const data = await fetchJson(`${API_BASE}/technicians/available`);
      if (data.success) {
        setAvailableTechs(data.data || []);
      }
    } catch (error) {
      console.error('Error loading technicians:', error);
    }
  };

  const refreshAll = async () => {
    if (!initialLoadDone) setLoading(true);
    try {
      await Promise.all([
        loadPendingOrders(false),
        loadActiveOrders(),
        loadAvailableTechs(),
        loadPartsRequests()
      ]);
    } finally {
      if (!initialLoadDone) {
        setLoading(false);
        setInitialLoadDone(true);
      }
    }
  };

  const handleAssignTechnician = async () => {
    if (!selectedOrder || !selectedTech) {
      alert('Please select order and technician');
      return;
    }

    try {
      const data = await fetchJson(`${API_BASE}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_order_id: selectedOrder[0],
          technician_id: selectedTech[0],
          assigned_by: user?.name
        })
      });
      if (data.success) {
        alert('Technician assigned successfully');
        loadPendingOrders();
        loadActiveOrders();
        loadAvailableTechs();
        setSelectedOrder(null);
        setSelectedTech(null);
      }
    } catch (error) {
      console.error('Error assigning technician:', error);
    }
  };

  const handleClockIn = async (assignmentId) => {
    try {
      const data = await fetchJson(`${API_BASE}/clock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: assignmentId })
      });
      if (data.success) {
        alert('Technician clocked in');
        loadActiveOrders();
      }
    } catch (error) {
      console.error('Error clocking in:', error);
    }
  };

  const handleClockOut = async (assignmentId) => {
    try {
      const data = await fetchJson(`${API_BASE}/clock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: assignmentId })
      });
      if (data.success) {
        alert('✅ Technician clocked out successfully!\n\n📋 Job has been sent to Foreman for QC inspection.');
        loadActiveOrders();
      }
    } catch (error) {
      console.error('Error clocking out:', error);
    }
  };

  const loadLaborSummary = async (techId) => {
    try {
      const data = await fetchJson(`${API_BASE}/labor-summary/${techId}`);
      if (data.success) {
        setLaborSummary(data.data);
      }
    } catch (error) {
      console.error('Error loading labor summary:', error);
    }
  };

  const loadClockRecords = async (techId) => {
    try {
      const data = await fetchJson(`${API_BASE}/clock-records/${techId}?days=7`);
      if (data.success) {
        setClockRecords(data.data || []);
      }
    } catch (error) {
      console.error('Error loading clock records:', error);
    }
  };

  const tabs = [
    { id: 'pending-orders', label: 'Pending Orders', icon: '⏳' },
    { id: 'parts-requests', label: 'Parts Requests', icon: '📦' },
    { id: 'active-orders', label: 'Active Orders', icon: '🛠️' },
    { id: 'assignment', label: 'Technician Assignment', icon: '👷' },
    { id: 'job-order-print', label: 'Print Job Order', icon: '🖨️' },
    { id: 'resources', label: 'Resources', icon: '📊' }
  ];

  const formatSo = (id) => `SO-${String(id).padStart(5, '0')}`;

  const calculatedStats = [
      { label: 'Pending Orders', value: pendingOrders.length, sub: "Awaiting assignment", color: '#f59e0b', icon: '⏳' },
      { label: 'Parts Requests', value: partsRequests.length, sub: "Needs approval", color: '#ef4444', icon: '📦' },
      { label: 'Active Jobs', value: activeOrders.length, sub: "Technicians working", color: '#3b82f6', icon: '🛠️' },
      { label: 'Tech Availability', value: availableTechs.length, sub: "Ready for dispatch", color: '#10b981', icon: '👷' }
  ];

  /* Columns for Pending Orders Table */
  const pendingColumns = [
    { label: 'SO ID', render: (_, v) => <strong>{formatSo(v[0])}</strong> },
    { label: 'Customer', render: (_, v) => v[1] },
    { label: 'Contact', render: (_, v) => v[2] },
    { label: 'Vehicle', render: (_, v) => v[3] },
    { label: 'Service Type', render: (_, v) => v[4] },
    { label: 'Check-In', render: (_, v) => v[5] },
    { label: 'Status', render: (_, v) => <StatusBadge status={v[6]}>{v[6]}</StatusBadge> },
    { label: 'Assigned', render: (_, v) => (Number(v[8]) > 0 ? `${v[8]} tech` : 'None') }
  ];

  /* Columns for Active Orders Table */
  const activeColumns = [
    { label: 'SO ID', render: (_, v) => <strong>{formatSo(v[0])}</strong> },
    { label: 'Customer', render: (_, v) => v[1] },
    { label: 'Vehicle', render: (_, v) => v[2] },
    { label: 'Service Type', render: (_, v) => v[3] },
    { label: 'Technician', render: (_, v) => v[4] },
    { label: 'Status', render: (_, v) => <StatusBadge status={v[5]}>{v[5]}</StatusBadge> },
    { label: 'Clock In', render: (_, v) => (v[6] ? new Date(v[6]).toLocaleTimeString() : 'N/A') },
    { label: 'Labor Hrs', render: (_, v) => (v[7] || 0) },
    {
      label: 'Action',
      render: (_, row) => {
        const assignmentId = row?.[9];
        if (!assignmentId) return <span className="text-muted">Unavailable</span>;

        if (row[5] === 'assigned') {
          return (
            <EnterpriseButton
              variant="success"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleClockIn(assignmentId);
              }}
            >
              Clock In
            </EnterpriseButton>
          );
        }
        if (row[5] === 'in-progress') {
          return (
            <EnterpriseButton
              variant="danger"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleClockOut(assignmentId);
              }}
            >
              Clock Out
            </EnterpriseButton>
          );
        }
        return <span className="text-muted">Done</span>;
      }
    }
  ];

  /* Columns for Parts Requests */
  const partsRequestColumns = [
    { label: 'Date', render: (_, r) => <small>{new Date(r.created_at).toLocaleString()}</small> },
    { label: 'SO ID', render: (_, r) => <strong>{formatSo(r.service_order_id)}</strong> },
    { label: 'Technician', render: (_, r) => r.technician_name || <span className="text-muted">Unknown</span> },
    { label: 'Vehicle', render: (_, r) => r.vehicle },
    { label: 'Items', render: (_, r) => (
       <div style={{fontSize:'0.85rem'}}>
          {(r.items || []).map((i, idx) => (
             <div key={idx} style={{ marginBottom: '2px' }}>
                • {i.quantity_requested}x <strong>{i.product_name || `Prod #${i.product_id}`}</strong>
             </div>
          ))}
          {r.notes && <div style={{fontStyle:'italic', color:'#6b7280', marginTop:'4px', fontSize:'0.8rem'}}>"{r.notes}"</div>}
       </div>
    )},
    { label: 'Status', render: (_, r) => <StatusBadge status={r.status}>{r.status}</StatusBadge> },
    { label: 'Action', render: (_, r) => (
       <EnterpriseButton variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); handleApprovePartRequest(r.id); }}>
          Approve
       </EnterpriseButton>
    )}
  ];

  const handleProductSearch = async (query, index) => {
    // 1. Update text immediately (controlled input)
    setNewRequestDraft(prev => {
        const nextItems = [...prev.items];
        nextItems[index] = { ...nextItems[index], _query: query };
        
        // If query is short, clear results but keep query text
        if (!query || query.length < 2) {
            nextItems[index]._results = [];
            nextItems[index]._loading = false;
        } else {
            nextItems[index]._loading = true; // Show loading spinner
            nextItems[index]._results = [];   // Clear old results while typing
        }
        return { ...prev, items: nextItems };
    });

    if (!query || query.length < 2) return;

    // 2. Debounce/Fetch
    // Simple implementation: just fetch (race conditions possible but low impact here)
    try {
        const res = await fetchJson(`/api/job-controller/products/search?q=${encodeURIComponent(query)}`);
        setNewRequestDraft(prev => {
            const nextItems = [...prev.items];
            // Only update if the query matches what triggered the search (basic consistency check)
            // or just update latest.
            if (nextItems[index]) {
                // Handle different response formats (raw array vs {success:true, data:[]})
                let results = [];
                if (Array.isArray(res)) {
                    results = res;
                } else if (res && res.data && Array.isArray(res.data)) {
                    results = res.data;
                }
                nextItems[index] = { ...nextItems[index], _results: results, _loading: false };
            }
            return { ...prev, items: nextItems };
        });
    } catch (e) {
        console.error("Search failed", e);
        setNewRequestDraft(prev => {
            const nextItems = [...prev.items];
            if (nextItems[index]) {
                nextItems[index] = { ...nextItems[index], _loading: false, _results: [] };
            }
            return { ...prev, items: nextItems };
        });
    }
  };

  return (
    <ModuleLayout
      title="Job Controller"
      description="Manage technician assignments, parts delivery, and service execution."
      user={user}
      onLogout={onLogout}
      hideStats={true}
    >
      <div className="jc-container">
          
          {/* Top Stats Row */}
          <div className="jc-header-stats">
              {calculatedStats.map((stat, i) => (
                  <div key={i} className="jc-stat-card" style={{'--stat-color': stat.color}}>
                      <div className="jc-stat-icon">
                          {stat.icon}
                      </div>
                      <div className="jc-stat-content">
                          <h3>{stat.value}</h3>
                          <p>{stat.label}</p>
                      </div>
                  </div>
              ))}
          </div>

          <EnterpriseTabs 
            tabs={tabs} 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
          />
          
          <div style={{ marginTop: '24px' }}>


            <span className="module-title-icon">�️</span>
      
            {/* TAB 1: Pending Orders */}
            {activeTab === 'pending-orders' && (
              <EnterpriseCard title="Pending Service Orders" subtitle="Orders checked in but not yet assigned to a technician">
                {loading ? (
                   <div className="jc-loading">
                       <LoadingSpinner size={32} />
                       <span style={{marginLeft:'12px'}}>Loading orders...</span>
                   </div>
                ) : (
                   <>
                     <EnterpriseTable columns={pendingColumns} data={pendingOrders} onRowClick={r => { setSelectedOrder(r); setActiveTab('assignment'); }} />
                     {pendingOrders.length === 0 && <EmptyState icon="✨" title="No Pending Orders" description="All orders have been assigned." />}
                   </>
                )}
              </EnterpriseCard>
            )}

        {/* TAB 2: Parts Requests */}
        {activeTab === 'parts-requests' && (
              <div className="jc-fade-in">
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
                      <div>
                          <h2 style={{fontSize:'1.5rem', fontWeight:'700', color:'#1e293b', margin:0}}>Parts Requests</h2>
                          <p style={{margin:0, color:'#64748b'}}>Manage warehouse requests from the floor</p>
                      </div>
                      <EnterpriseButton variant="primary" onClick={() => setShowPartsForm(!showPartsForm)}>
                          {showPartsForm ? 'Hide Form' : '+ New Parts Request'}
                      </EnterpriseButton>
                  </div>

                  {showPartsForm && (
                      <div className="jc-parts-form">
                          <div className="jc-parts-form-header">
                              <h4>Create New Request</h4>
                              <button onClick={() => setShowPartsForm(false)} style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem', color:'#94a3b8'}}>✕</button>
                          </div>
                          <div className="jc-parts-form-body">
                              <div className="jc-grid-2" style={{marginBottom:'24px'}}>
                                  <div>
                                      <label className="jc-field-label">Service Order</label>
                                      <select 
                                          className="enterprise-select" 
                                          value={newRequestDraft.soId}
                                          onChange={e => setNewRequestDraft({...newRequestDraft, soId: e.target.value})}
                                      >
                                          <option value="">-- Select Active Job --</option>
                                          {activeOrders.map(o => (
                                              <option key={o[0]} value={o[0]}>{formatSo(o[0])} - {o[1]} ({o[2]})</option>
                                          ))}
                                      </select>
                                  </div>
                                  <div>
                                      <label className="jc-field-label">Technician</label>
                                      <select 
                                          className="enterprise-select"
                                          value={newRequestDraft.techId}
                                          onChange={e => setNewRequestDraft({...newRequestDraft, techId: e.target.value})}
                                      >
                                          <option value="">-- Select Tech --</option>
                                          {availableTechs.map(t => (
                                              <option key={t[0]} value={t[0]}>{t[1]}</option>
                                          ))}
                                      </select>
                                  </div>
                              </div>
                              
                              <label className="jc-field-label">Items Needed</label>
                              {newRequestDraft.items.map((item, idx) => (
                                  <div key={idx} className="jc-item-row">
                                      <div style={{position: 'relative'}}>
                                          {item.productId ? (
                                              <div style={{
                                                  padding: '10px', 
                                                  borderRadius: '8px', 
                                                  background: '#fff', 
                                                  border: '1px solid #cbd5e1',
                                                  display:'flex', 
                                                  justifyContent:'space-between', 
                                                  alignItems:'center'
                                              }}>
                                                  <div>
                                                      <div style={{fontWeight:'600', color:'#334155'}}>{item._selectedName || `Item #${item.productId}`}</div>
                                                      <div style={{fontSize:'0.75rem', color:'#64748b'}}>Stock: {item._stock ?? '?'}</div>
                                                  </div>
                                                  <button onClick={() => {
                                                      const newItems = [...newRequestDraft.items];
                                                      newItems[idx] = {...newItems[idx], productId:'', _query:'', _selectedName:'', _stock:null};
                                                      setNewRequestDraft({...newRequestDraft, items: newItems});
                                                  }} style={{color:'#ef4444', fontWeight:'bold', background:'none', border:'none', cursor:'pointer'}}>Change</button>
                                              </div>
                                          ) : (
                                              <>
                                                  <input 
                                                      type="text"
                                                      placeholder="Search part..." 
                                                      className="ent-input"
                                                      value={item._query || ''}
                                                      onChange={(e) => handleProductSearch(e.target.value, idx)}
                                                      autoComplete="off"
                                                      style={{width:'100%'}}
                                                  />
                                                  {/* Search Dropdown */}
                                                  {(item._loading || (item._results && item._results.length > 0) || (item._query && item._query.length >= 2)) && (
                                                      <div style={{
                                                          position: 'absolute', top: '100%', left: 0, right: 0, 
                                                          background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', 
                                                          maxHeight: '280px', overflowY: 'auto', zIndex: 50, 
                                                          marginTop:'8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
                                                      }}>
                                                          {item._loading && <div style={{padding:'12px', textAlign:'center', color:'#64748b'}}>Searching inventory...</div>}
                                                          {!item._loading && item._results && item._results.length === 0 && (
                                                              <div style={{padding:'12px', textAlign:'center', color:'#ef4444'}}>No parts found.</div>
                                                          )}
                                                          {!item._loading && item._results && item._results.map(prod => (
                                                              <div key={prod.id} 
                                                                  onClick={() => {
                                                                      const newItems = [...newRequestDraft.items];
                                                                      newItems[idx] = {
                                                                          ...newItems[idx],
                                                                          productId: prod.id,
                                                                          _selectedName: prod.product_name,
                                                                          _stock: prod.quantity_in_stock,
                                                                          _results: [],
                                                                          _query: '',
                                                                          _loading: false
                                                                      };
                                                                      setNewRequestDraft({...newRequestDraft, items: newItems});
                                                                  }}
                                                                  className="dropdown-item"
                                                                  style={{
                                                                      padding: '12px 16px', 
                                                                      borderBottom: '1px solid #f1f5f9', 
                                                                      cursor: 'pointer',
                                                                      display: 'flex', 
                                                                      justifyContent: 'space-between',
                                                                      alignItems: 'center'
                                                                  }}
                                                                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                                              >
                                                                  <div>
                                                                      <div style={{fontWeight:'600', color:'#1e293b'}}>{prod.product_name}</div>
                                                                      <div style={{fontSize:'0.8rem', color:'#94a3b8'}}>{prod.product_code}</div>
                                                                  </div>
                                                                  <div style={{textAlign:'right'}}>
                                                                      <div style={{fontWeight:'700', color: prod.quantity_in_stock > 0 ? '#10b981' : '#ef4444'}}>
                                                                          {prod.quantity_in_stock}
                                                                      </div>
                                                                      <div style={{fontSize:'0.7rem', color:'#64748b'}}>In Stock</div>
                                                                  </div>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  )}
                                              </>
                                          )}
                                      </div>
                                      
                                      <input 
                                          type="number" 
                                          placeholder="Qty" 
                                          className="ent-input" 
                                          value={item.quantity}
                                          onChange={(e) => {
                                             const newItems = [...newRequestDraft.items];
                                             newItems[idx].quantity = e.target.value;
                                             setNewRequestDraft({...newRequestDraft, items: newItems});
                                          }}
                                      />
                                      
                                      <button 
                                          className="btn-enterprise btn-danger btn-icon" 
                                          onClick={() => {
                                              if(newRequestDraft.items.length > 1) {
                                                  const newItems = newRequestDraft.items.filter((_, i) => i !== idx);
                                                  setNewRequestDraft({...newRequestDraft, items: newItems});
                                              }
                                          }}
                                          disabled={newRequestDraft.items.length <= 1}
                                          style={{height: '42px', width: '42px', display:'flex', alignItems:'center', justifyContent:'center'}}
                                      >✕</button>
                                  </div>
                              ))}
                              
                              <button className="link-btn" style={{marginTop:'8px', display:'flex', alignItems:'center', gap:'6px'}} 
                                  onClick={() => setNewRequestDraft({...newRequestDraft, items: [...newRequestDraft.items, {productId:'', quantity:1}]})}>
                                  <span style={{fontSize:'1.2rem', fontWeight:'bold'}}>+</span> Add Another Item
                              </button>
  
                              <div style={{marginTop:'24px'}}>
                                  <label className="jc-field-label">Notes (Optional)</label>
                                  <textarea className="ent-textarea" rows={2} value={newRequestDraft.notes} onChange={e => setNewRequestDraft({...newRequestDraft, notes:e.target.value})} />
                              </div>
  
                              <div style={{display:'flex', justifyContent:'flex-end', gap:'12px', marginTop:'24px'}}>
                                  <EnterpriseButton variant="secondary" onClick={() => setShowPartsForm(false)}>Cancel</EnterpriseButton>
                                  <EnterpriseButton variant="primary" onClick={handleSubmitPartsRequest}>Submit Request</EnterpriseButton>
                              </div>
                          </div>
                      </div>
                  )}

                  <EnterpriseCard>
                      <EnterpriseTable
                        columns={partsRequestColumns}
                        data={partsRequests}
                      />
                      {partsRequests.length === 0 && (
                        <EmptyState icon="📦" title="No pending requests" description="Technician parts requests will appear here." />
                      )}
                  </EnterpriseCard>
              </div>
        )}

        {/* TAB 3: Active Orders */}
        {activeTab === 'active-orders' && (
              <EnterpriseCard title="Active Service Orders" subtitle="Track assigned and in-progress jobs">
                <EnterpriseTable columns={activeColumns} data={activeOrders} />
                {activeOrders.length === 0 && <EmptyState icon="🛠️" title="No Active jobs" description="Dispatch technicians to start jobs." />}
              </EnterpriseCard>
        )}

        {/* TAB 3: Technician Assignment */}
        {activeTab === 'assignment' && (
          <div className="jc-fade-in">
            <EnterpriseCard title="Technician Assignment" subtitle="Directly assign jobs to technicians">
              
              {/* Step 1: Select Order */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{fontSize:'1.1rem', fontWeight:'600', color:'#334155', marginBottom:'16px'}}>1. Select Pending Job</h3>
                
                {!selectedOrder ? (
                  <div className="jc-form-group">
                    <label className="jc-field-label">Pending Order</label>
                    <select
                      value=""
                      onChange={(e) => {
                        const order = pendingOrders.find(o => o[0] == e.target.value);
                        setSelectedOrder(order);
                      }}
                      className="enterprise-select"
                      style={{ maxWidth: '600px' }}
                    >
                      <option value="">-- Choose a Pending Order --</option>
                      {pendingOrders.map(order => (
                        <option key={order[0]} value={order[0]}>
                          {formatSo(order[0])} — {order[1]} — {order[4]}
                        </option>
                      ))}
                    </select>
                    <p style={{ marginTop: '8px', fontSize: '0.9rem', color: '#64748b' }}>
                      {pendingOrders.length} orders waiting for assignment.
                    </p>
                  </div>
                ) : (
                  <div style={{ 
                    border: '1px solid #3b82f6', 
                    borderRadius: '8px', 
                    padding: '20px', 
                    backgroundColor: '#eff6ff', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                         <span style={{background:'#3b82f6', color:'white', fontSize:'0.75rem', padding:'2px 6px', borderRadius:'4px', fontWeight:'600'}}>SELECTED</span>
                         <strong style={{ fontSize: '1.25rem', color: '#1e293b' }}>{formatSo(selectedOrder[0])}</strong>
                      </div>
                      <div style={{ color:'#475569'}}>
                        {selectedOrder[1]} • {selectedOrder[3]} • {selectedOrder[4]}
                      </div>
                    </div>
                    <button 
                        onClick={() => setSelectedOrder(null)}
                        style={{background:'white', border:'1px solid #cbd5e1', padding:'8px 16px', borderRadius:'6px', cursor:'pointer', fontWeight:'500', color:'#475569'}}
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: Select Tech */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{fontSize:'1.1rem', fontWeight:'600', color:'#334155', margin:0}}>2. Select Technician</h3>
                  <div style={{ width: '280px' }}>
                    <SearchBar 
                      value={techSearchTerm} 
                      onChange={setTechSearchTerm} 
                      placeholder="Search technicians..." 
                    />
                  </div>
                </div>

                <div className="jc-grid-3">
                  {availableTechs
                    .filter(tech => {
                      if (!techSearchTerm) return true;
                      const term = techSearchTerm.toLowerCase();
                      return (tech[1]||'').toLowerCase().includes(term) || (tech[5]||'').toLowerCase().includes(term);
                    })
                    .map(tech => {
                      const isSelected = selectedTech && selectedTech[0] === tech[0];
                      const jobCount = Number(tech[4] || 0);
                      
                      return (
                        <div
                          key={tech[0]}
                          onClick={() => setSelectedTech(tech)}
                          className={`jc-tech-card ${isSelected ? 'selected' : ''}`}
                        >
                          <div className="jc-tech-header">
                            <div className="jc-tech-avatar">
                                {tech[1].charAt(0)}
                            </div>
                            <div>
                              <div className="jc-tech-name">{tech[1]}</div>
                              <div className="jc-tech-role">ID: {tech[0]}</div>
                            </div>
                            <div className={`jc-status-dot ${jobCount > 1 ? 'busy' : 'available'}`} title={jobCount > 1 ? 'Busy' : 'Available'} />
                          </div>
                          
                          <div className="jc-tech-load">
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px', fontSize:'0.75rem'}}>
                                <span>Current Load</span>
                                <span>{jobCount} active</span>
                            </div>
                            <div className="jc-load-bar">
                                <div className="jc-load-fill" style={{ 
                                  width: `${Math.min(jobCount * 33, 100)}%`,
                                  backgroundColor: jobCount > 2 ? '#ef4444' : jobCount > 0 ? '#f59e0b' : '#10b981'
                                }} />
                            </div>
                          </div>

                          <div className="jc-tech-skills">
                             {tech[5] ? tech[5].split(',').slice(0, 3).map((skill, i) => (
                               <span key={i} className="jc-skill-tag">{skill.trim()}</span>
                             )) : <span style={{color:'#cbd5e1', fontSize:'0.75rem'}}>No skills listed</span>}
                          </div>
                        </div>
                      );
                    })}
                </div>
                
                {availableTechs.length === 0 && <EmptyState icon="👷" title="No technicians found" />}
              </div>

              {/* Action Bar */}
              <div style={{ 
                marginTop: '32px', 
                paddingTop: '20px', 
                borderTop: '1px solid #e2e8f0',
                display: 'flex', 
                justifyContent: 'flex-end', 
                alignItems: 'center',
                gap: '12px'
              }}>
                {selectedOrder && selectedTech && (
                    <div style={{marginRight:'auto', color:'#059669', display:'flex', alignItems:'center', gap:'8px'}}>
                        <span style={{fontSize:'1.2rem'}}>✓</span>
                        <span>Assigning <strong>{selectedTech[1]}</strong> to <strong>{formatSo(selectedOrder[0])}</strong></span>
                    </div>
                )}
                
                <EnterpriseButton variant="secondary" onClick={() => { setSelectedOrder(null); setSelectedTech(null); }}>
                  Clear
                </EnterpriseButton>
                <EnterpriseButton
                  variant="primary"
                  onClick={handleAssignTechnician}
                  disabled={!selectedOrder || !selectedTech}
                  style={{ minWidth: '180px' }}
                >
                  Confirm Assignment
                </EnterpriseButton>
              </div>
            </EnterpriseCard>
          </div>
        )}

        {/* TAB 5: Print Job Order Form */}
        {activeTab === 'job-order-print' && (
          <div className="jc-fade-in">
              {!showJobOrderForm ? (
                <EnterpriseCard title="Job Order Printing" subtitle="Generate printable job orders for the workshop">
                  <div style={{display:'grid', gridTemplateColumns:'1fr 300px', gap:'24px'}}>
                      <div>
                          <h4 style={{fontSize:'1rem', color:'#475569', marginBottom:'16px'}}>Pending Orders</h4>
                          {pendingOrders.length > 0 ? (
                            <EnterpriseTable
                               columns={[
                                  { header: 'SO ID', accessor: (v) => <strong>{formatSo(v[0])}</strong> },
                                  { header: 'Customer', accessor: (v) => v[1] },
                                  { header: 'Vehicle', accessor: (v) => v[3] },
                                  { header: 'Action', accessor: (order) => (
                                     <button 
                                        onClick={() => { setSelectedJobOrder(order); setShowJobOrderForm(true); }}
                                        style={{background:'#3b82f6', color:'white', border:'none', padding:'6px 12px', borderRadius:'4px', cursor:'pointer', fontWeight:'500'}}
                                     >
                                        Print
                                     </button>
                                  )}
                               ]}
                               data={pendingOrders}
                            />
                          ) : (
                            <EmptyState icon="🖨️" title="No Pending Orders" description="All orders have been printed or processed." />
                          )}
                      </div>
                      
                      <div className="jc-gray-panel">
                          <h4 style={{marginTop:0, color:'#334155'}}>Manual Entry</h4>
                          <p style={{fontSize:'0.9rem', color:'#64748b'}}>Create a blank job order manually if needed.</p>
                          <EnterpriseButton variant="primary" style={{width:'100%'}} onClick={() => {
                              setSelectedJobOrder(null);
                              setShowJobOrderForm(true);
                          }}>
                              + Create Blank Order
                          </EnterpriseButton>
                      </div>
                  </div>
                </EnterpriseCard>
              ) : (
                <div style={{background:'white', borderRadius:'8px', padding:'24px', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'16px'}}>
                        <h2 style={{margin:0}}>Job Order Preview</h2>
                        <button 
                            onClick={() => { setShowJobOrderForm(false); setSelectedJobOrder(null); }}
                            style={{background:'#f1f5f9', border:'none', padding:'8px 16px', borderRadius:'6px', cursor:'pointer'}}
                        >Close Preview</button>
                    </div>
                    <AnvilJobOrderForm 
                        jobOrder={selectedJobOrder}
                        onClose={() => {
                          setShowJobOrderForm(false);
                          setSelectedJobOrder(null);
                        }}
                    />
                </div>
              )}
          </div>
        )}

        {/* TAB 6: Resource Management */}
        {activeTab === 'resources' && (
          <div className="jc-fade-in">
              <div className="jc-grid-3" style={{marginBottom:'24px'}}>
                  <div className="jc-stat-card">
                      <div className="jc-stat-label">Available Techs</div>
                      <div className="jc-stat-value">{availableTechs.length}</div>
                  </div>
                  <div className="jc-stat-card">
                      <div className="jc-stat-label">Active Jobs</div>
                      <div className="jc-stat-value">{activeOrders.length}</div>
                  </div>
                  <div className="jc-stat-card">
                      <div className="jc-stat-label">Pending Orders</div>
                      <div className="jc-stat-value">{pendingOrders.length}</div>
                  </div>
              </div>

              <div className="jc-grid-2">
                 <EnterpriseCard title="Technician Performance" subtitle="Select a technician to view details">
                    <div className="jc-form-group">
                        <label className="jc-field-label">Select Technician</label>
                        <select
                          className="enterprise-select"
                          onChange={(e) => {
                            const tech = availableTechs.find(t => t[0] == e.target.value);
                            if (tech) {
                              loadLaborSummary(tech[0]);
                              loadClockRecords(tech[0]);
                            }
                          }}
                        >
                          <option value="">-- Choose Tech --</option>
                          {availableTechs.map(tech => (
                            <option key={tech[0]} value={tech[0]}>{tech[1]}</option>
                          ))}
                        </select>
                    </div>

                    {laborSummary ? (
                       <div style={{marginTop:'24px'}}>
                           <h4 style={{borderBottom:'1px solid #e2e8f0', paddingBottom:'8px', marginBottom:'16px'}}>Performance (30 Days)</h4>
                           <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', textAlign:'center'}}>
                               <div style={{background:'#f8fafc', padding:'12px', borderRadius:'8px'}}>
                                   <div style={{fontSize:'1.5rem', fontWeight:'700', color:'#3b82f6'}}>{laborSummary.jobs_completed || 0}</div>
                                   <div style={{fontSize:'0.8rem', color:'#64748b'}}>Jobs Done</div>
                               </div>
                               <div style={{background:'#f8fafc', padding:'12px', borderRadius:'8px'}}>
                                   <div style={{fontSize:'1.5rem', fontWeight:'700', color:'#10b981'}}>{laborSummary.total_hours || 0}</div>
                                   <div style={{fontSize:'0.8rem', color:'#64748b'}}>Total Hours</div>
                               </div>
                               <div style={{background:'#f8fafc', padding:'12px', borderRadius:'8px'}}>
                                   <div style={{fontSize:'1.5rem', fontWeight:'700', color:'#f59e0b'}}>
                                       {laborSummary.avg_hours_per_job ? Number(laborSummary.avg_hours_per_job).toFixed(1) : 0}
                                   </div>
                                   <div style={{fontSize:'0.8rem', color:'#64748b'}}>Avg Hrs/Job</div>
                               </div>
                           </div>
                       </div>
                    ) : (
                        <div style={{padding:'32px', textAlign:'center', color:'#94a3b8', fontStyle:'italic'}}>
                            Select a technician to view performance stats.
                        </div>
                    )}
                 </EnterpriseCard>

                 <EnterpriseCard title="Recent Activity" subtitle="Clock-in/out records (Last 7 Days)">
                    {clockRecords.length > 0 ? (
                        <EnterpriseTable
                          columns={[
                            { header: 'Date', accessor: (row) => (row[2] ? new Date(row[2]).toLocaleDateString() : 'N/A') },
                            { header: 'Vehicle', accessor: (row) => row[1] },
                            { header: 'Duration', accessor: (row) => <span style={{fontWeight:'600'}}>{row[4] || 0}m</span> }
                          ]}
                          data={clockRecords}
                        />
                    ) : (
                        <EmptyState icon="⏱️" title="No Records" description="No recent clock-in activity found." />
                    )}
                 </EnterpriseCard>
              </div>
          </div>
        )}
      </div>
      </div>
    </ModuleLayout>
  );
};

export default JobControllerDashboard;
