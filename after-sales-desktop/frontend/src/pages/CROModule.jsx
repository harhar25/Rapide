import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchJson } from '../utils/fetchJson';
import { useAutoRefresh } from '../hooks/useRealtimeUpdates';

const API = '/api';

export default function CROModule({ user, onLogout }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('croActiveTab') || 'pms-due');
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false); // Separate loading for search
  const [leads, setLeads] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false); // Track if user is in search mode
  const [contactHistory, setContactHistory] = useState([]);
  const [todayStats, setTodayStats] = useState({ calls: 0, scheduled: 0, noAnswer: 0 });
  const [modal, setModal] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Forms
  const [regForm, setRegForm] = useState({
    name: '', contact_no: '', plate_no: '', vehicle_model: '', vehicle_year: new Date().getFullYear(), email: ''
  });
  const [apptForm, setApptForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    bay_id: '',
    technician_id: '',
    service_type: 'PMS',
    notes: ''
  });
  const [availability, setAvailability] = useState({ bays: [], techs: [] });
  const [serviceCatalog, setServiceCatalog] = useState([]);

  // Load data - background polling enabled
  useEffect(() => {
    loadLeads(false); // Initial load (visible loading state)
    loadRecentInteractions(); // Load recent history for stats
    loadServiceCatalog();
    
    const interval = setInterval(() => { 
      // Silent update in background
      loadLeads(true); 
      loadRecentInteractions(); 
    }, 5000);

    return () => clearInterval(interval);
  }, []); // Run once on mount

  // Fetch specific history when selecting a customer
  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerHistory(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    // Calculate stats from loaded history (approximated from recent interactions + local updates)
    // Filter for "today" in local time
    const today = new Date().toDateString();
    const historyToday = contactHistory.filter(c => new Date(c.created_at || c.date).toDateString() === today);
    
    setTodayStats({
      calls: historyToday.length,
      scheduled: historyToday.filter(c => c.outcome === 'scheduled').length,
      noAnswer: historyToday.filter(c => c.outcome === 'no-answer').length
    });
  }, [contactHistory]);

  const handleRealtimeUpdate = useCallback(() => loadLeads(true), []);
  useAutoRefresh(['cro'], handleRealtimeUpdate);

  const loadServiceCatalog = async () => {
    try {
      const res = await fetchJson('/api/services/catalog');
      if (res.success) setServiceCatalog(res.data || []);
    } catch (e) { console.error('Failed to load service catalog:', e); }
  };

  const loadLeads = async (silent = false) => {
    // Only show global loading spinner on explicit non-silent loads
    if (!silent) setLoading(true);
    
    try {
      const res = await fetchJson(`${API}/customer/pms-due-list`);
      if (res.success) {
        const sorted = (res.data || []).sort((a, b) => (b.days_since_service || 0) - (a.days_since_service || 0));
        setLeads(sorted);
      }
    } catch (e) {
      console.error('Load error:', e);
    }
    
    if (!silent) {
      setLoading(false);
      setInitialLoadDone(true);
    }
  };

  const loadRecentInteractions = async () => {
    try {
      const res = await fetchJson(`${API}/customer/interactions-recent`);
      if (res.success && Array.isArray(res.data)) {
        // Merge with existing logic if needed, but for now just replacing is safest to avoid dupes
        // We'll trust the backend returns the most relevant recent items
        // Map backend fields to frontend expected format if necessary
        const mapped = res.data.map(d => ({
          ...d,
          date: d.created_at // Map created_at to date for compatibility
        }));
        
        setContactHistory(prev => {
           // Simple merge: add new ones that don't exist
           const existingIds = new Set(prev.map(p => p.id));
           const newItems = mapped.filter(m => !existingIds.has(m.id));
           return [...newItems, ...prev].sort((a,b) => new Date(b.date) - new Date(a.date));
        });
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const loadCustomerHistory = async (customerId) => {
    try {
      const res = await fetchJson(`${API}/customer/interaction-history?customer_id=${customerId}`);
      if (res.success && Array.isArray(res.data)) {
        const mapped = res.data.map(d => ({ ...d, date: d.created_at }));
        
        setContactHistory(prev => {
          // Merge specific customer history into global state
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = mapped.filter(m => !existingIds.has(m.id));
          return [...newItems, ...prev].sort((a,b) => new Date(b.date) - new Date(a.date));
        });
      }
    } catch (e) { 
      console.error(e); 
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Log contact - Now saves to backend
  const logContact = async (outcome, notes = '') => {
    if (!selectedCustomer) return;
    
    // Optimistic UI update
    const tempId = Date.now();
    const entry = {
      id: tempId,
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.name,
      plate_no: selectedCustomer.plate_no,
      date: new Date().toISOString(),
      outcome,
      notes,
      user: user.username
    };
    
    setContactHistory(prev => [entry, ...prev]);

    try {
      const res = await fetchJson(`${API}/customer/interaction`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Auth-User': user.username 
        },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          outcome,
          notes
        })
      });
      
      if (res.success) {
        showMessage('success', `Call logged: ${outcome}`);
        // Update with real ID from backend
        setContactHistory(prev => prev.map(p => p.id === tempId ? { ...p, id: res.data.id } : p));
      } else {
        showMessage('error', 'Failed to save log');
      }
    } catch (e) {
      console.error(e);
      showMessage('error', 'Network error saving log');
    }
  };

  const handleSearch = async (term) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    setSearchLoading(true);
    
    try {
      // 1. Try the new 'all' search type (smart backend)
      let res = await fetchJson(`${API}/customer/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search_type: 'all', search_value: term })
      });

      // 2. Fallback for older backends that don't support 'all' yet
      if (!res.success && (res.error?.includes('Invalid search_type') || res.http_status === 400)) {
        console.warn("Backend 'all' search not supported, falling back to multi-query");
        
        // Execute parallel searches for Name, Plate, and Contact
        const searchTypes = ['name', 'plate', 'contact'];
        const promises = searchTypes.map(type => 
           fetchJson(`${API}/customer/search`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ search_type: type, search_value: term })
           })
        );

        const results = await Promise.all(promises);
        
        // Combine and deduplicate results
        const combined = results.flatMap(r => (r.success ? r.data : []));
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
        
        setSearchResults(unique);
      } else {
        // Standard success/fail from 'all' endpoint
        if (res.success) {
          setSearchResults(res.data);
        } else {
          setSearchResults([]);
        }
      }
    } catch (e) {
      console.error(e);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const checkAvailability = async (date, time) => {
    if (!date || !time) return;
    try {
      const res = await fetchJson(`${API}/scheduler/check-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, time })
      });
      if (res.success) {
        setAvailability({ bays: res.data.available_bays, techs: res.data.available_technicians });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    try {
      const payload = {
        customer_id: selectedCustomer.id,
        scheduled_date: apptForm.date,
        scheduled_time: apptForm.time,
        bay_id: apptForm.bay_id,
        technician_id: apptForm.technician_id,
        advisor_id: user.id || 1, // Default to current user or fallback
        service_type: apptForm.service_type,
        notes: apptForm.notes,
        created_by: user.username
      };
      
      const res = await fetchJson(`${API}/scheduler/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.success) {
        showMessage('success', 'Appointment scheduled successfully');
        logContact('scheduled', `Appt: ${apptForm.date} ${apptForm.time}`);
        setModal(null);
      } else {
        showMessage('error', res.error || 'Booking failed');
      }
    } catch (e) {
      showMessage('error', 'Network error');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchJson(`${API}/customer/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm)
      });
      
      if (res.success || res.status === 'warning') {
        showMessage('success', 'Customer registered');
        handleSearch(regForm.plate_no); // Auto search new customer
        setModal(null);
        setRegForm({
          name: '', contact_no: '', plate_no: '', vehicle_model: '', vehicle_year: new Date().getFullYear(), email: ''
        });
      } else {
        showMessage('error', res.error || 'Registration failed');
      }
    } catch (e) {
      showMessage('error', 'Network error');
    }
  };

  // Filter leads for display
  const displayList = useMemo(() => {
    if (searchTerm.length >= 2) return searchResults;
    return leads;
  }, [leads, searchResults, searchTerm]);

  return (
    <div style={styles.container}>
      {message.text && (
        <div style={styles.toast(message.type)}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>CRO</div>
          <div>
            <h1 style={styles.title}>Customer Relationship Center</h1>
            <p style={styles.subtitle}>Welcome back, {user.first_name}</p>
          </div>
        </div>
        
        <div style={styles.stats}>
          <div style={styles.stat}>
            <div style={styles.statValue}>{todayStats.calls}</div>
            <div style={styles.statLabel}>Calls Today</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statValue}>{todayStats.scheduled}</div>
            <div style={styles.statLabel}>Scheduled</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statValue}>{todayStats.noAnswer}</div>
            <div style={styles.statLabel}>No Answer</div>
          </div>
        </div>

        <div style={styles.userSection}>
          <button style={styles.logoutBtn} onClick={onLogout}>Sign Out</button>
        </div>
      </div>

      <div style={styles.main}>
        {/* Sidebar Nav */}
        <div style={styles.sidebar}>
          <div style={styles.navItem(activeTab === 'pms-due')} onClick={() => { setActiveTab('pms-due'); setSearchTerm(''); }}>
            <span>PMS Due List</span>
            <span style={styles.navBadge}>{leads.length}</span>
          </div>
          <div style={styles.navItem(activeTab === 'search')} onClick={() => { setActiveTab('search'); }}>
            <span>Search / Walk-in</span>
          </div>
        </div>

        {/* Content Area */}
        <div style={styles.content}>
            <div style={styles.splitView}>
            
            {/* List Section */}
            <div style={styles.tableSection}>
              <div style={styles.toolbar}>
                <div style={styles.pageTitle}>
                  {activeTab === 'pms-due' ? 'Upcoming Service Due' : 'Customer Search'}
                </div>
                  <input 
                    style={styles.filterInput} 
                    placeholder="Search name or plate..." 
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  {activeTab === 'search' && (
                    <button style={styles.btn('primary')} onClick={() => setModal('register')}>+ New Customer</button>
                  )}
              </div>

              <div style={styles.card}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Customer</th>
                      <th style={styles.th}>Vehicle</th>
                      <th style={styles.th}>Last Service</th>
                      <th style={styles.th}>Due Days</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && <tr><td colSpan="5" style={styles.empty}>Loading data...</td></tr>}
                    {!loading && displayList.length === 0 && (
                      <tr><td colSpan="5" style={styles.empty}>No records found</td></tr>
                    )}
                    {displayList.map(lead => (
                      <tr 
                        key={lead.id} 
                        style={styles.row(selectedCustomer?.id === lead.id)}
                        onClick={() => setSelectedCustomer(lead)}
                      >
                        <td style={styles.td}>
                          <div style={{fontWeight:'600'}}>{lead.name}</div>
                        </td>
                        <td style={styles.td}>
                          <div style={{fontWeight:'500'}}>{lead.vehicle_model}</div>
                          <div style={{fontSize:'12px', color:'#64748b', fontFamily:'monospace'}}>{lead.plate_no}</div>
                        </td>
                        <td style={styles.td}>
                          <div>{lead.last_service_date || '-'}</div>
                          {lead.last_appointment && (
                            <div style={{fontSize:'11px', color:'#3b82f6', marginTop:'2px'}}>
                              Appt: {new Date(lead.last_appointment).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td style={styles.td}>
                          {lead.days_since_service !== undefined && lead.days_since_service !== null ? (
                            lead.days_since_service > 180 ? 
                              <span style={{color:'#dc2626', fontWeight:'600'}}>{lead.days_since_service} days (Overdue)</span> : 
                              <span>{lead.days_since_service} days ago</span>
                          ) : (
                             <span style={{color:'#94a3b8'}}>-</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <span style={styles.badge('warning')}>Needs Contact</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detail / Action Panel */}
            <div style={styles.detailSection}>
              <div style={styles.card}>
                {!selectedCustomer ? (
                  <div style={styles.empty}>Select a customer to view details</div>
                ) : (
                  <>
                    <div style={styles.detailHeader}>
                      <div style={styles.avatar}>{selectedCustomer.name.charAt(0)}</div>
                      <div>
                        <h3 style={styles.detailName}>{selectedCustomer.name}</h3>
                        <p style={styles.detailMeta}>{selectedCustomer.plate_no} • {selectedCustomer.vehicle_model}</p>
                      </div>
                    </div>

                    <div style={styles.detailInfo}>
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Contact</span>
                        <span style={styles.infoValue}>{selectedCustomer.contact_no || 'No Number'}</span>
                      </div>
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Last Visit</span>
                        <span style={styles.infoValue}>{selectedCustomer.last_service_date || 'Unknown'}</span>
                      </div>
                    </div>

                    <div style={styles.detailActions}>
                      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'16px'}}>
                        <button style={styles.btn('call')} onClick={() => logContact('no-answer')}>No Answer</button>
                        <button style={styles.btn('call')} onClick={() => logContact('busy')}>Line Busy</button>
                        <button style={styles.btn('call')} onClick={() => logContact('cb-later')}>Call Later</button>
                        <button style={styles.btn('warning')} onClick={() => logContact('not-interested')}>Not Interested</button>
                      </div>
                      <button 
                        style={{...styles.btn('success'), width:'100%'}} 
                        onClick={() => {
                          setApptForm(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
                          checkAvailability(new Date().toISOString().split('T')[0], '09:00');
                          setModal('schedule');
                        }}
                      >
                        📅 Book Appointment
                      </button>
                    </div>

                    <div style={styles.historySection}>
                      <h4 style={styles.historyTitle}>Recent Interaction</h4>
                      {contactHistory
                        .filter(h => h.customer_id === selectedCustomer.id)
                        .slice(0, 5)
                        .map(h => (
                          <div key={h.id} style={styles.historyItem}>
                            <span style={{fontSize:'12px', color:'#64748b'}}>{new Date(h.date).toLocaleDateString()}</span>
                            <span style={styles.actionBtn(h.outcome === 'scheduled' ? 'success' : 'default')}>{h.outcome}</span>
                          </div>
                      ))}
                      {contactHistory.filter(h => h.customer_id === selectedCustomer.id).length === 0 && (
                        <div style={{fontSize:'12px', color:'#94a3b8', textAlign:'center'}}>No recent history</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal === 'schedule' && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Schedule Appointment</h3>
              <button style={styles.closeBtn} onClick={() => setModal(null)}>&times;</button>
            </div>
            <form onSubmit={handleSchedule}>
              <div style={styles.modalBody}>
                <div style={styles.customerBanner}>
                  Booking for: <b>{selectedCustomer?.name} ({selectedCustomer?.plate_no})</b>
                </div>
                
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Date</label>
                    <input 
                      type="date" 
                      style={styles.input} 
                      value={apptForm.date} 
                      onChange={(e) => {
                        setApptForm({ ...apptForm, date: e.target.value });
                        checkAvailability(e.target.value, apptForm.time);
                      }} 
                      required 
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Time</label>
                    <input 
                      type="time" 
                      style={styles.input} 
                      value={apptForm.time} 
                      onChange={(e) => {
                        setApptForm({ ...apptForm, time: e.target.value });
                        checkAvailability(apptForm.date, e.target.value);
                      }} 
                      required 
                    />
                  </div>
                </div>

                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Service Bay</label>
                    <select 
                      style={styles.select} 
                      value={apptForm.bay_id} 
                      onChange={(e) => setApptForm({ ...apptForm, bay_id: e.target.value })} 
                      required
                    >
                      <option value="">Select Bay...</option>
                      {availability.bays.map(b => (
                        <option key={b.id} value={b.id}>{b.bay_name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Technician</label>
                    <select 
                      style={styles.select} 
                      value={apptForm.technician_id} 
                      onChange={(e) => setApptForm({ ...apptForm, technician_id: e.target.value })} 
                      required
                    >
                      <option value="">Select Tech...</option>
                      {availability.techs.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Service Type</label>
                  <select 
                    style={styles.select}
                    value={apptForm.service_type}
                    onChange={(e) => setApptForm({ ...apptForm, service_type: e.target.value })}
                  >
                    <option value="">-- Select Service --</option>
                    {(() => {
                      const grouped = {};
                      (serviceCatalog || []).filter(s => s.status === 'active').forEach(s => {
                        const cat = s.category || 'General';
                        if (!grouped[cat]) grouped[cat] = [];
                        grouped[cat].push(s);
                      });
                      return Object.entries(grouped).map(([cat, items]) => (
                        <optgroup key={cat} label={cat}>
                          {items.map(s => (
                            <option key={s.id} value={s.service_name}>{s.service_name} — ₱{Number(s.base_price || 0).toLocaleString()}</option>
                          ))}
                        </optgroup>
                      ));
                    })()}
                    {(!serviceCatalog || serviceCatalog.length === 0) && (
                      <>
                        <option value="PMS">PMS</option>
                        <option value="General Repair">General Repair</option>
                        <option value="Check-up">Check-up / Diagnosis</option>
                      </>
                    )}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Notes / Instructions</label>
                  <textarea 
                    style={{...styles.input, height:'80px', fontFamily:'inherit'}} 
                    value={apptForm.notes} 
                    onChange={(e) => setApptForm({ ...apptForm, notes: e.target.value })} 
                    placeholder="E.g. Customer requests synthetic oil..."
                  />
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button type="button" style={styles.btn('default')} onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" style={styles.btn('primary')}>Confirm Booking</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'register' && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>New Customer Registration</h3>
              <button style={styles.closeBtn} onClick={() => setModal(null)}>&times;</button>
            </div>
            <form onSubmit={handleRegister}>
              <div style={styles.modalBody}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Full Name *</label>
                    <input style={styles.input} value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} required />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Phone Number</label>
                    <input style={styles.input} value={regForm.contact_no} onChange={(e) => setRegForm({ ...regForm, contact_no: e.target.value })} placeholder="09XX..." />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Plate Number *</label>
                    <input style={styles.input} value={regForm.plate_no} onChange={(e) => setRegForm({ ...regForm, plate_no: e.target.value })} required />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Vehicle Model</label>
                    <input style={styles.input} value={regForm.vehicle_model} onChange={(e) => setRegForm({ ...regForm, vehicle_model: e.target.value })} placeholder="e.g. Toyota Vios" />
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email</label>
                  <input style={styles.input} type="email" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} />
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button type="button" style={styles.btn('default')} onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" style={styles.btn('primary')}>Register</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== STYLES ==========
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logo: {
    width: '36px',
    height: '36px',
    background: '#0f172a',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: '700',
    fontSize: '12px'
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#0f172a',
    margin: 0
  },
  subtitle: {
    fontSize: '11px',
    color: '#64748b',
    margin: 0
  },
  stats: {
    display: 'flex',
    gap: '32px'
  },
  stat: {
    textAlign: 'center'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#0f172a'
  },
  statLabel: {
    fontSize: '10px',
    color: '#64748b',
    textTransform: 'uppercase'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logoutBtn: {
    padding: '8px 16px',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#64748b',
    cursor: 'pointer'
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  },
  sidebar: {
    width: '200px',
    background: '#fff',
    borderRight: '1px solid #e2e8f0',
    padding: '16px 0',
    flexShrink: 0
  },
  navItem: (active) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    color: active ? '#0f172a' : '#64748b',
    background: active ? '#f1f5f9' : 'transparent',
    borderLeft: active ? '3px solid #0f172a' : '3px solid transparent',
    fontSize: '13px',
    fontWeight: active ? '600' : '400',
    cursor: 'pointer',
    transition: 'all 0.15s'
  }),
  navBadge: {
    background: '#0f172a',
    color: '#fff',
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '10px',
    fontWeight: '600'
  },
  content: {
    flex: 1,
    padding: '20px 24px',
    overflowY: 'auto'
  },
  splitView: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: '20px',
    height: '100%'
  },
  tableSection: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0
  },
  detailSection: {
    display: 'flex',
    flexDirection: 'column'
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  pageTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#0f172a'
  },
  filterInput: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    width: '220px'
  },
  card: {
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0'
  },
  td: {
    padding: '12px 16px',
    fontSize: '13px',
    color: '#334155',
    borderBottom: '1px solid #f1f5f9'
  },
  row: (selected) => ({
    cursor: 'pointer',
    background: selected ? '#f1f5f9' : 'transparent',
    transition: 'background 0.15s'
  }),
  badge: (type) => ({
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    background: type === 'success' ? '#dcfce7' : type === 'warning' ? '#fef3c7' : type === 'danger' ? '#fee2e2' : '#f1f5f9',
    color: type === 'success' ? '#16a34a' : type === 'warning' ? '#d97706' : type === 'danger' ? '#dc2626' : '#64748b'
  }),
  btn: (variant) => ({
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.15s',
    ...(variant === 'primary' ? { background: '#334155', color: '#fff' } :
       variant === 'success' ? { background: '#22c55e', color: '#fff' } :
       variant === 'danger' ? { background: '#ef4444', color: '#fff' } :
       variant === 'warning' ? { background: '#f59e0b', color: '#fff' } :
       variant === 'call' ? { background: '#3b82f6', color: '#fff' } :
       { background: '#f1f5f9', color: '#475569' })
  }),
  actionBtn: (type) => ({
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    border: 'none',
    background: type === 'success' ? '#dcfce7' : type === 'warning' ? '#fef3c7' : '#f1f5f9',
    color: type === 'success' ? '#16a34a' : type === 'warning' ? '#d97706' : '#64748b'
  }),
  empty: {
    padding: '40px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '13px'
  },

  // Detail Panel
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px',
    borderBottom: '1px solid #f1f5f9'
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: '#0f172a',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '20px'
  },
  detailName: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#0f172a'
  },
  detailMeta: {
    margin: '2px 0 0',
    fontSize: '12px',
    color: '#64748b'
  },
  detailInfo: {
    padding: '16px 20px',
    borderBottom: '1px solid #f1f5f9'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0'
  },
  infoLabel: {
    fontSize: '12px',
    color: '#64748b'
  },
  infoValue: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#0f172a'
  },
  detailActions: {
    padding: '16px 20px'
  },
  historySection: {
    padding: '16px 20px',
    borderTop: '1px solid #f1f5f9'
  },
  historyTitle: {
    margin: '0 0 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase'
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0'
  },

  // Toast
  toast: (type) => ({
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    background: type === 'success' ? '#10b981' : '#ef4444',
    color: '#fff',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    zIndex: 1001
  }),

  // Modal
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(15, 23, 42, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    background: '#fff',
    borderRadius: '12px',
    width: '480px',
    maxWidth: '90vw',
    maxHeight: '85vh',
    overflow: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0'
  },
  modalTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#0f172a'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#94a3b8',
    cursor: 'pointer',
    lineHeight: 1
  },
  modalBody: {
    padding: '20px'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '16px 20px',
    borderTop: '1px solid #e2e8f0'
  },
  customerBanner: {
    background: '#f8fafc',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#0f172a'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  formGroup: {
    marginBottom: '12px'
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    color: '#64748b',
    marginBottom: '4px'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    background: '#fff'
  }
};

