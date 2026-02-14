import React, { useState, useEffect } from 'react';
import { fetchJson } from '../utils/fetchJson';

const TrackingPage = ({ user }) => {
  const [trackingCode, setTrackingCode] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const hash = window.location.hash;
    const idx = hash.indexOf('?');
    const params = idx !== -1 ? new URLSearchParams(hash.substring(idx)) : new URLSearchParams(window.location.search);
    const code = params.get('code') || params.get('plate');
    if (code) {
      setTrackingCode(code);
      fetchTracking(code, true); // Show loading on initial fetch
    }
  }, []);

  // Auto-refresh every 3 seconds when tracking a vehicle (silent - no loading indicator)
  useEffect(() => {
    if (!trackingCode) return;
    const interval = setInterval(() => {
      fetchTracking(trackingCode, false); // Silent refresh
    }, 3000);
    return () => clearInterval(interval);
  }, [trackingCode]);

  const fetchTracking = async (code, showLoading = true) => {
    if (!code?.trim()) return;
    if (showLoading) setLoading(true);
    try {
      const res = await fetchJson(`/api/track/${encodeURIComponent(code.trim())}`);
      if (res.success) {
        setData(res.data);
        setError('');
      } else if (showLoading) {
        setError(res.error || 'Vehicle not found');
      }
    } catch {
      if (showLoading) setError('Connection error. Try again.');
    }
    if (showLoading) setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setTrackingCode(searchInput.trim());
      fetchTracking(searchInput.trim(), true);
    }
  };

  const formatDate = (str) => {
    if (!str) return '-';
    return new Date(str).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const progress = data ? Math.round((data.timeline.filter(t => t.status === 'completed').length / data.total_steps) * 100) : 0;

  // --------------------------------------------------------------------------
  // ADMIN VIEW
  // --------------------------------------------------------------------------
  if (isAdmin) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", overflow: 'hidden' }}>
        {/* Admin Header - Dark/Professional */}
        <div style={{ 
            padding: '20px 32px', 
            background: '#ffffff', 
            borderBottom: '1px solid #e2e8f0', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            zIndex: 10
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', background: '#0f172a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px' }}>
                    📡
                </div>
                <div>
                    <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0, lineHeight: 1.2 }}>Tracking Console</h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Real-time service monitoring</p>
                </div>
            </div>
            
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        placeholder="ENTER PLATE NUMBER"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                        style={{
                            border: '1px solid #e2e8f0',
                            padding: '10px 16px 10px 40px',
                            outline: 'none',
                            fontSize: '14px',
                            fontWeight: '600',
                            width: '280px',
                            borderRadius: '8px',
                            background: '#f8fafc',
                            textTransform: 'uppercase',
                            transition: 'all 0.2s',
                            color: '#334155'
                        }}
                        onFocus={(e) => {
                            e.target.style.background = '#fff';
                            e.target.style.borderColor = '#94a3b8';
                            e.target.style.boxShadow = '0 0 0 3px rgba(148, 163, 184, 0.1)';
                        }}
                        onBlur={(e) => {
                            e.target.style.background = '#f8fafc';
                            e.target.style.borderColor = '#e2e8f0';
                            e.target.style.boxShadow = 'none';
                        }}
                    />
                    <span style={{ position: 'absolute', left: '14px', top: '11px', color: '#94a3b8' }}>🔍</span>
                </div>
                <button 
                    type="submit" 
                    disabled={loading}
                    style={{
                        background: '#0f172a',
                        color: 'white',
                        border: 'none',
                        padding: '0 24px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                        opacity: loading ? 0.8 : 1
                    }}
                >
                    {loading ? 'Searching...' : 'Track'}
                </button>
            </form>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, padding: '32px', minHeight: 0, overflowY: 'auto' }}>
            {error && (
                <div style={{ maxWidth: '1200px', margin: '0 auto 24px', background: '#fef2f2', color: '#991b1b', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #fee2e2' }}>
                    <span style={{ fontSize: '18px' }}>⚠️</span>
                    {error}
                </div>
            )}

            {data ? (
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '24px', height: '100%' }}>
                    
                    {/* LEFT COLUMN */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Vehicle Header Card */}
                        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                 <div style={{ display: 'flex', gap: '20px' }}>
                                     <div style={{ width: '72px', height: '72px', background: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', border: '1px solid #dbeafe', color: '#3b82f6' }}>
                                         🚗
                                     </div>
                                     <div>
                                         <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                            <h2 style={{ fontSize: '32px', fontWeight: '800', margin: 0, color: '#0f172a', lineHeight: 1 }}>{data.vehicle.plate_number}</h2>
                                            <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>
                                                {data.vehicle.model || 'Unknown Model'}
                                            </span>
                                         </div>
                                         <div style={{ display: 'flex', gap: '24px', color: '#64748b' }}>
                                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                 <span style={{ fontSize: '14px' }}>👤</span>
                                                 <span style={{ fontSize: '15px', fontWeight: '500' }}>{data.customer_name}</span>
                                             </div>
                                             <div style={{ width: '1px', height: '20px', background: '#cbd5e1' }} />
                                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                 <span style={{ fontSize: '14px' }}>🔧</span>
                                                 <span style={{ fontSize: '15px', fontWeight: '500' }}>{data.service_type || 'General Service'}</span>
                                             </div>
                                         </div>
                                     </div>
                                 </div>

                                 <div style={{ 
                                     background: data.is_completed ? '#ecfdf5' : data.is_ready ? '#fefce8' : '#eff6ff', 
                                     color: data.is_completed ? '#166534' : data.is_ready ? '#854d0e' : '#1e40af', 
                                     padding: '8px 16px', 
                                     borderRadius: '8px', 
                                     fontWeight: '700', 
                                     fontSize: '13px', 
                                     border: `1px solid ${data.is_completed ? '#bbf7d0' : data.is_ready ? '#fef08a' : '#bfdbfe'}`,
                                     display: 'flex',
                                     alignItems: 'center',
                                     gap: '8px'
                                }}>
                                    <span style={{ 
                                        width: '8px', 
                                        height: '8px', 
                                        borderRadius: '50%', 
                                        background: 'currentColor'
                                    }} />
                                    {data.is_completed ? 'COMPLETED' : data.is_ready ? 'READY FOR PICKUP' : 'IN PROGRESS'}
                                 </div>
                             </div>
                        </div>

                        {/* Timeline */}
                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#334155', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Service Progress</h3>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                    Updates strictly monitored
                                </div>
                            </div>
                            
                            <div style={{ padding: '32px 40px', flex: 1, overflowY: 'auto' }}>
                                {data.timeline.map((ev, i) => {
                                    const isLast = i === data.timeline.length - 1;
                                    const isCompleted = ev.status === 'completed';
                                    const isCurrent = ev.status === 'current';
                                    
                                    return (
                                        <div key={i} style={{ display: 'flex', gap: '24px', position: 'relative', minHeight: '80px' }}>
                                            {/* Line Connector */}
                                            {!isLast && (
                                                <div style={{ 
                                                    position: 'absolute', 
                                                    left: '20px', 
                                                    top: '40px', 
                                                    bottom: '-10px', 
                                                    width: '2px', 
                                                    background: isCompleted ? '#22c55e' : '#e2e8f0' 
                                                }} />
                                            )}
                                            
                                            {/* Icon/Status Bubble */}
                                            <div style={{ 
                                                width: '42px', 
                                                height: '42px', 
                                                borderRadius: '50%', 
                                                background: isCompleted ? '#22c55e' : isCurrent ? '#fff' : '#f1f5f9', 
                                                border: isCompleted ? 'none' : isCurrent ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                                color: isCompleted ? 'white' : isCurrent ? '#3b82f6' : '#94a3b8',
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center',
                                                fontSize: '18px',
                                                flexShrink: 0,
                                                zIndex: 1,
                                                boxShadow: isCurrent ? '0 0 0 4px #eff6ff' : 'none'
                                            }}>
                                                {isCompleted ? '✓' : ev.icon}
                                            </div>

                                            <div style={{ flex: 1, paddingTop: '8px', paddingBottom: '32px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <h4 style={{ 
                                                        margin: 0,
                                                        fontSize: '16px', 
                                                        fontWeight: isCurrent || isCompleted ? '700' : '600', 
                                                        color: isCurrent || isCompleted ? '#0f172a' : '#94a3b8' 
                                                    }}>
                                                        {ev.title}
                                                    </h4>
                                                    {ev.timestamp && (
                                                        <span style={{ 
                                                            fontSize: '12px', 
                                                            color: '#64748b', 
                                                            fontWeight: '500',
                                                            background: '#f8fafc', 
                                                            padding: '2px 8px', 
                                                            borderRadius: '4px',
                                                            border: '1px solid #e2e8f0'
                                                        }}>
                                                            {new Date(ev.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        </span>
                                                    )}
                                                </div>
                                                <p style={{ margin: 0, fontSize: '14px', color: isCurrent ? '#334155' : '#94a3b8', lineHeight: '1.5' }}>
                                                    {ev.description}
                                                    {isCurrent && <span style={{ display: 'block', marginTop: '8px', fontSize: '12px', color: '#3b82f6', fontWeight: '600' }}>● Active Step</span>}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN - Stats & Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Progress Circle Card */}
                        <div style={{ background: 'white', borderRadius: '12px', padding: '32px 24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={progress === 100 ? '#22c55e' : '#3b82f6'} strokeWidth="2.5" strokeDasharray={`${progress}, 100`} strokeLinecap="round" />
                                </svg>
                                <div style={{ position: 'absolute', textAlign: 'center' }}>
                                    <div style={{ fontSize: '36px', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>{progress}%</div>
                                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginTop: '4px' }}>Completed</div>
                                </div>
                            </div>
                        </div>

                        {/* Details Card */}
                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                            <div style={{ background: '#f8fafc', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>Service Details</h3>
                            </div>
                            
                            <div style={{ padding: '20px' }}>
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600', marginBottom: '6px' }}>Schedule</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        📅 {data.scheduled_date || 'Walk-In'}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '24px' }}>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600', marginBottom: '6px' }}>Time In</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        ⏱️ {formatDate(data.checked_in_at).split(',')[1] || '-'}
                                    </div>
                                </div>
                                
                                <button onClick={() => fetchTracking(trackingCode)} style={{ 
                                    width: '100%', 
                                    padding: '12px', 
                                    background: 'white', 
                                    color: '#0f172a', 
                                    border: '1px solid #e2e8f0', 
                                    borderRadius: '8px', 
                                    fontWeight: '600', 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    fontSize: '13px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.background = '#f8fafc'}
                                onMouseOut={(e) => e.target.style.background = 'white'}
                                >
                                    <span>Sync Data</span>
                                    <span>↻</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // Empty State
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '24px' }}>
                        📡
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Tracking Console Ready</div>
                    <div style={{ fontSize: '15px', maxWidth: '300px', textAlign: 'center', lineHeight: '1.5' }}>Enter a vehicle plate number above to begin monitoring service progress.</div>
                </div>
            )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // PUBLIC VIEW
  // --------------------------------------------------------------------------
  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerContent}>
            <div>
                <div style={s.brand}>Rapidé</div>
                <div style={s.tagline}>BUTUAN CITY</div>
            </div>
        </div>
      </div>

      {/* Search / Status Area */}
      {/* Removed as per request */}
      
      {/* Content */}
      <div style={s.content}>
        {error && (
          <div style={s.errorBox}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <div>{error}</div>
          </div>
        )}

        {loading && !data && (
            <div style={s.loadingState}>
                <div style={s.spinner}></div>
                <span>Locating vehicle...</span>
            </div>
        )}

        {data && !loading && (
          <>
            {/* Vehicle Card */}
            <div style={s.mainCard}>
              <div style={s.cardHeader}>
                 <div style={s.plateWrapper}>
                    <div style={s.plateNumber}>{data.vehicle.plate_number}</div>
                    <div style={s.vehicleModel}>{data.vehicle.model || 'Rapidé Service'}</div>
                 </div>
                 <div style={{ 
                     ...s.statusBadge, 
                     background: data.is_completed ? '#ecfdf5' : data.is_ready ? '#fefce8' : '#f8fafc',
                     color: data.is_completed ? '#166534' : data.is_ready ? '#854d0e' : '#334155',
                     border: '1px solid #e2e8f0'
                 }}>
                    {data.is_completed ? 'Completed' : data.is_ready ? 'Ready' : 'In Progress'}
                 </div>
              </div>

              <div style={s.customerRow}>
                 <div style={s.iconGroup}>
                    <span>👤</span> {data.customer_name}
                 </div>
              </div>
              
              <div style={s.divider}></div>
              
              <div style={s.statsGrid}>
                  <div style={s.statItem}>
                      <div style={s.statLabel}>Scheduled</div>
                      <div style={s.statValue}>{data.scheduled_date || 'Walk-in'}</div>
                  </div>
                  <div style={s.statItem}>
                      <div style={s.statLabel}>Check-in</div>
                      <div style={s.statValue}>{formatDate(data.checked_in_at).split(',')[1] || '-'}</div>
                  </div>
              </div>
            </div>

            {/* Progress Section */}
            <div style={s.card}>
              <div style={s.cardTitleRow}>
                 <h3>Service Progress</h3>
                 <span>{progress}%</span>
              </div>
              <div style={s.progressBg}>
                <div style={{ ...s.progressFill, width: `${progress}%` }} />
              </div>
            </div>

            {/* Action Banners */}
            {data.is_ready && !data.is_completed && (
              <div style={s.readyBanner}>
                <div style={{ fontSize: '24px' }}>🎉</div>
                <div>
                    <strong>Ready for Pickup!</strong>
                    <div style={{ fontSize: '13px', opacity: 0.9 }}>Visit our center to retrieve your vehicle.</div>
                </div>
              </div>
            )}
            {data.is_completed && (
              <div style={s.completeBanner}>
                  <div style={{ fontSize: '24px' }}>✅</div>
                  <div>
                      <strong>Service Completed</strong>
                      <div style={{ fontSize: '13px', opacity: 0.9 }}>Thank you for choosing Rapidé!</div>
                  </div>
              </div>
            )}

            {/* Timeline */}
            <div style={s.card}>
              <div style={{...s.cardTitleRow, marginBottom: '20px'}}>
                  <h3>Timeline</h3>
              </div>
              <div style={s.timelineWrapper}>
                  {data.timeline.map((ev, i) => {
                    const isLast = i === data.timeline.length - 1;
                    const isCompleted = ev.status === 'completed';
                    const isCurrent = ev.status === 'current';
                    
                    return (
                      <div key={i} style={s.timelineItem}>
                        {/* Connector line */}
                        {!isLast && (
                          <div style={{
                            ...s.connector,
                            background: isCompleted ? '#22c55e' : '#e2e8f0'
                          }} />
                        )}
                        
                        {/* Icon Bubble */}
                        <div style={{
                          ...s.dot,
                          background: isCompleted ? '#22c55e' : isCurrent ? 'white' : '#f8fafc',
                          border: isCompleted ? 'none' : isCurrent ? '3px solid #FFE500' : '1px solid #e2e8f0',
                          color: isCompleted ? 'white' : isCurrent ? 'black' : '#94a3b8',
                          fontWeight: 'bold',
                          boxShadow: isCurrent ? '0 0 0 3px rgba(255, 229, 0, 0.2)' : 'none'
                        }}>
                          {isCompleted ? '✓' : ev.icon}
                        </div>
                        
                        <div style={s.eventInfo}>
                          <div style={{
                            ...s.eventTitle,
                            color: isCurrent || isCompleted ? '#0f172a' : '#94a3b8',
                            fontWeight: isCurrent || isCompleted ? '700' : '600'
                          }}>
                            {ev.title}
                          </div>
                          <div style={s.eventDesc}>{ev.description}</div>
                          {ev.timestamp && <div style={s.eventTime}>{new Date(ev.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <button onClick={() => fetchTracking(trackingCode)} style={s.refreshBtn}>
              Refresh Status
            </button>
            <div style={{ height: '40px' }} />
          </>
        )}
      </div>

      {/* Footer */}
      <div style={s.footer}>
        <div style={s.footerLink}>Need Help? Call (085) 123-4567</div>
      </div>

      <style>{`
        body { margin: 0; background: #f8fafc; }
        * { box-sizing: border-box; }
        input::placeholder { color: #666; font-weight: 500; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const s = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    paddingBottom: 80,
    color: '#334155'
  },
  header: {
    background: '#FFE500',
    borderBottom: '2px solid #000',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerContent: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
  },
  brand: {
    fontSize: '24px',
    fontWeight: '900',
    color: '#000',
    lineHeight: 1,
    fontStyle: 'italic',
    letterSpacing: '-1px'
  },
  tagline: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#000',
    letterSpacing: '1px',
    marginTop: '4px'
  },
  topSection: {
    padding: '24px 20px 0',
    maxWidth: '600px',
    margin: '0 auto'
  },
  form: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px'
  },
  input: {
    flex: 1,
    padding: '14px 16px',
    fontSize: '16px',
    border: '2px solid #000',
    borderRadius: '0',
    textTransform: 'uppercase',
    fontWeight: '700',
    color: '#000',
    outline: 'none',
    background: 'white',
    boxShadow: '4px 4px 0 0 rgba(0,0,0,0.1)'
  },
  btn: {
    padding: '0 24px',
    fontSize: '16px',
    fontWeight: '900',
    background: '#000',
    color: '#FFE500',
    border: 'none',
    borderRadius: '0',
    cursor: 'pointer',
    boxShadow: '4px 4px 0 0 rgba(0,0,0,0.2)'
  },
  content: {
    padding: '20px',
    maxWidth: '600px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  errorBox: {
    background: '#fee2e2',
    border: '2px solid #ef4444',
    padding: '16px',
    display: 'flex',
    gap: '12px',
    color: '#991b1b',
    fontSize: '14px',
    alignItems: 'center',
    fontWeight: '600'
  },
  loadingState: {
    padding: '60px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '600'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '4px solid #e2e8f0',
    borderTopColor: '#FFE500',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  mainCard: {
    background: 'white',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
    borderTop: '4px solid #000'
  },
  card: {
    background: 'white',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px'
  },
  plateNumber: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#000',
    lineHeight: 1,
    letterSpacing: '-1px'
  },
  vehicleModel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '600',
    marginTop: '4px'
  },
  statusBadge: {
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  divider: {
    height: '1px',
    background: '#f1f5f9',
    margin: '20px 0'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  statLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: '0.5px'
  },
  statValue: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#0f172a'
  },
  customerRow: {
    display: 'flex',
    gap: '16px'
  },
  iconGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    color: '#334155',
    fontWeight: '600'
  },
  cardTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  progressBg: {
    height: '12px',
    background: '#f1f5f9',
    borderRadius: '0',
    overflow: 'hidden',
    border: '1px solid #e2e8f0'
  },
  progressFill: {
    height: '100%',
    background: '#FFE500',
    borderRadius: '0',
    transition: 'width 0.5s ease-out'
  },
  readyBanner: {
    background: '#FFE500',
    border: '2px solid #000',
    padding: '16px',
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    color: '#000'
  },
  completeBanner: {
    background: '#000',
    border: '2px solid #000',
    padding: '16px',
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    color: '#fff'
  },
  timelineWrapper: {
    position: 'relative',
    paddingLeft: '8px'
  },
  timelineItem: {
    display: 'flex',
    gap: '20px',
    marginBottom: '28px',
    position: 'relative',
    minHeight: '60px'
  },
  connector: {
    position: 'absolute',
    left: '15px',
    top: '36px',
    bottom: '-28px',
    width: '2px',
    background: '#e2e8f0',
    zIndex: 0
  },
  dot: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    flexShrink: 0,
    zIndex: 1,
    position: 'relative'
  },
  eventInfo: {
    flex: 1,
    paddingTop: '4px'
  },
  eventTitle: {
    fontSize: '16px',
    marginBottom: '4px',
    lineHeight: 1.2
  },
  eventDesc: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: 1.5
  },
  eventTime: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '6px',
    fontWeight: '500'
  },
  refreshBtn: {
    width: '100%',
    padding: '16px',
    background: '#fff',
    border: '2px solid #000',
    color: '#000',
    fontWeight: '800',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '20px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    boxShadow: '4px 4px 0 0 rgba(0,0,0,0.1)'
  },
  footer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'white',
    borderTop: '1px solid #e2e8f0',
    padding: '16px',
    display: 'flex',
    justifyContent: 'center'
  },
  footerLink: {
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '600'
  }
};
export default TrackingPage;
