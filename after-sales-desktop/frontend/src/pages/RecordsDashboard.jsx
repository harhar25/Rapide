import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/enterprise-ui.css';
import { useAutoRefresh } from '../hooks/useRealtimeUpdates';
import { 
  ModuleLayout, 
  EnterpriseButton, 
  LoadingSpinner, 
  EmptyState
} from '../components/EnterpriseComponents';

const API_BASE = 'https://rapide-api.rapideph.workers.dev';

export default function RecordsDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('month'); // Default to this month for performance/relevance
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  
  const formatMoney = (val) => Number.isFinite(Number(val)) ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(val)) : '-';
  const formatDate = (str) => str ? new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/records/service-orders`);
      if (res.ok) {
        const data = await res.json();
        setRecords((data.data?.orders || []).sort((a, b) => b.id - a.id));
      }
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  }, []);

  useAutoRefresh(['records', 'job-order', 'cashier'], fetchRecords);
  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const getFilteredRecords = () => {
    let filtered = records;

    // 1. Status Filter
    if (activeTab === 'pending') filtered = filtered.filter(r => !['completed','cancelled'].includes(r.status) && r.invoice_status !== 'paid');
    else if (activeTab === 'completed') filtered = filtered.filter(r => r.status === 'completed' || r.invoice_status === 'paid');
    
    // 2. Date Filter
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now); 
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    if (dateFilter === 'today') {
       filtered = filtered.filter(r => new Date(r.created_at) >= todayStart);
    } else if (dateFilter === 'week') {
       filtered = filtered.filter(r => new Date(r.created_at) >= weekStart);
    } else if (dateFilter === 'month') {
       filtered = filtered.filter(r => new Date(r.created_at) >= monthStart);
    } else if (dateFilter === 'custom' && customRange.start && customRange.end) {
       const start = new Date(customRange.start);
       const end = new Date(customRange.end);
       end.setHours(23, 59, 59, 999);
       filtered = filtered.filter(r => {
          const d = new Date(r.created_at);
          return d >= start && d <= end;
       });
    }

    // 3. Search Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        (r.customer_name || '').toLowerCase().includes(q) || 
        (r.plate_no || '').toLowerCase().includes(q) || 
        String(r.id).includes(q)
      );
    }
    return filtered;
  };
  
  const filteredRecords = useMemo(() => getFilteredRecords(), [records, searchQuery, activeTab, dateFilter, customRange]);

  const getStatusDot = (row) => {
      let status = row.status;
      let label = status.replace('_', ' ');
      let color = '#94a3b8'; let bg = '#e2e8f0';

      if (row.invoice_status === 'paid') {
          status = 'paid';
          label = 'PAID';
          color = '#15803d'; 
          bg = '#dcfce7';
      }
      else if (status === 'completed') { color = '#15803d'; bg = '#dcfce7'; }
      else if (['in_progress','pending'].includes(status)) { color = '#b45309'; bg = '#fef3c7'; }
      else if (status === 'cancelled') { color = '#b91c1c'; bg = '#fee2e2'; }
      
      return (
          <span style={{ display: 'inline-flex', alignItems: 'center', background: bg, padding: '4px 10px', borderRadius: '6px', color: color, fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, marginRight: '6px' }}></span>
              {label}
          </span>
      );
  };

  return (
    <ModuleLayout
      title="Service Records"
      description="View and manage history."
      icon="📂"
      user={user}
      onLogout={onLogout}
    >
      <div style={{ padding: '0 0 60px 0' }}>

          {/* STATS ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
              {[
                { label: 'Total Records', val: records.length },
                { label: 'Pending Jobs', val: records.filter(r => !['completed','cancelled'].includes(r.status)).length },
                { label: 'Completed', val: records.filter(r => r.status === 'completed').length }
              ].map((s,i) => (
                  <div key={i} style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>{s.label}</div>
                      <div style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a' }}>{s.val}</div>
                  </div>
              ))}
          </div>

          {/* FILTERS TOOLBAR */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                   
                   {/* Status Tabs */}
                   <div style={{ display: 'flex', gap: '8px' }}>
                       {['all', 'pending', 'completed'].map(tab => (
                           <button
                              key={tab}
                              onClick={() => setActiveTab(tab)}
                              style={{
                                  background: activeTab === tab ? '#000' : 'transparent',
                                  color: activeTab === tab ? '#FFE500' : '#64748b',
                                  border: 'none',
                                  padding: '8px 16px',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  textTransform: 'capitalize',
                                  transition: 'all 0.2s'
                              }}
                           >
                               {tab}
                           </button>
                       ))}
                   </div>

                   {/* Right Side Controls */}
                   <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                       
                       <select
                          value={dateFilter}
                          onChange={(e) => setDateFilter(e.target.value)}
                          style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              fontSize: '13px',
                              fontWeight: '500',
                              color: '#0f172a',
                              cursor: 'pointer',
                              outline: 'none',
                              minWidth: '120px'
                          }}
                       >
                          <option value="all">All Time</option>
                          <option value="today">Today</option>
                          <option value="week">This Week</option>
                          <option value="month">This Month</option>
                          <option value="custom">Custom Range...</option>
                       </select>

                       <div style={{ position: 'relative' }}>
                           <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>🔍</span>
                           <input 
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Search records..."
                              style={{ 
                                  padding: '8px 12px 8px 36px', 
                                  borderRadius: '6px', 
                                  border: '1px solid #e2e8f0', 
                                  width: '240px', 
                                  fontSize: '13px', 
                                  outline: 'none',
                                  color: '#0f172a'
                              }}
                           />
                       </div>
                   </div>
               </div>

               {/* Custom Date Range Picker */}
               {dateFilter === 'custom' && (
                   <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Select Range:</span>
                       <input 
                          type="date" 
                          value={customRange.start}
                          onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                          style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                       />
                       <span style={{ color: '#94a3b8' }}>—</span>
                       <input 
                          type="date" 
                          value={customRange.end}
                          onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                          style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                       />
                   </div>
               )}
          </div>

          {/* TABLE */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
              {loading ? (
                  <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}><LoadingSpinner /></div>
              ) : filteredRecords.length === 0 ? (
                  <EmptyState message="No records found." />
              ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <tr>
                              {['ID', 'Customer', 'Vehicle', 'Status', 'Payment', 'Date', 'Amount', ''].map((h,i) => (
                                  <th key={i} style={{ textAlign: h === 'Amount' ? 'right' : 'left', padding: '16px 24px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>{h}</th>
                              ))}
                          </tr>
                      </thead>
                      <tbody>
                          {filteredRecords.map(row => (
                              <tr key={row.id} onClick={() => navigate(`/records/${row.id}`)} style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }} onMouseEnter={e => e.currentTarget.style.background = '#fefce8'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                  <td style={{ padding: '16px 24px', fontWeight: '700', fontSize: '13px' }}>#{row.id}</td>
                                  <td style={{ padding: '16px 24px' }}>
                                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#0f172a' }}>{row.customer_name}</div>
                                      <div style={{ fontSize: '12px', color: '#64748b' }}>{row.contact_no}</div>
                                  </td>
                                  <td style={{ padding: '16px 24px', fontSize: '13px', color: '#334155' }}>
                                      <div style={{ fontWeight: '500' }}>{row.plate_no}</div>
                                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{row.vehicle_model}</div>
                                  </td>
                                  <td style={{ padding: '16px 24px' }}>{getStatusDot(row)}</td>
                                  <td style={{ padding: '16px 24px', fontSize: '13px', color: '#475569', textTransform: 'uppercase', fontWeight: '600' }}>
                                    {row.payment_method ? [...new Set(row.payment_method.split(',').map(s => s.trim().toLowerCase()))].join(', ') : '-'}
                                  </td>
                                  <td style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>{formatDate(row.created_at)}</td>
                                  <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{formatMoney(row.total_amount)}</td>
                                  <td style={{ padding: '16px 24px', textAlign: 'center', color: '#cbd5e1' }}>›</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              )}
          </div>
    </div>
    </ModuleLayout>
  );
}