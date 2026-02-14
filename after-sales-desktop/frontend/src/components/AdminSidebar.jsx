import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AdminSidebar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Helper to check active state
  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };
  
  // Also check for query param for sub-sections of /admin
  const isTabActive = (tabId) => {
      const params = new URLSearchParams(location.search);
      const currentTab = params.get('tab') || 'overview';
      return location.pathname === '/admin' && currentTab === tabId;
  };

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z', path: '/admin' },
    { id: 'personnel', label: 'Personnel', icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z', path: '/admin?tab=personnel' },
    { id: 'services', label: 'Service Catalog', icon: 'M4 6h18V4H4c-1.1 0-2 .9-2 2v11H0v3h14v-3H4V6zm19 2h-6c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zm-1 9h-4v-7h4v7z', path: '/admin?tab=services' },
    { id: 'resources', label: 'Resources (Techs/Bays)', icon: 'M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z', path: '/admin?tab=resources' },
    { id: 'audit', label: 'Security Audit', icon: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-9-2c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z', path: '/admin?tab=audit' }
  ];
  
  const moduleShortcuts = [
      { id: 'record', label: 'Records', path: '/records' },
      { id: 'cro', label: 'CRO', path: '/cro' },
      { id: 'technician', label: 'Technician', path: '/technician' },
      { id: 'advisor', label: 'Advisor', path: '/advisor' },
      { id: 'controller', label: 'Controller', path: '/controller' },
      { id: 'foreman', label: 'Foreman/QC', path: '/foreman' },
      { id: 'parts', label: 'Warehouse', path: '/warehouse' },
      { id: 'billing', label: 'Billing', path: '/billing' },
      { id: 'cashier', label: 'Cashier', path: '/cashier' },
      { id: 'gate', label: 'Security', path: '/security-gate' },
      { id: 'handover', label: 'Handover', path: '/vehicle-handover' },
      { id: 'followup', label: 'Follow Up', path: '/follow-up' },
      { id: 'tracking', label: 'Tracking', path: '/track' },
  ];

  return (
    <div style={{
      width: '220px',
      background: '#0f172a',
      color: 'white',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
      boxShadow: '4px 0 10px rgba(0,0,0,0.1)'
    }}>
      {/* Brand Header */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: '#FFE500', letterSpacing: '1.5px', marginBottom: '6px' }}>RAPIDÉ</div>
        <div style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px' }}>Admin Console.</div>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, padding: '20px 12px', overflowY: 'auto' }}>
        <div style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', paddingLeft: '10px' }}>Main Menu</div>
        {menuItems.map(item => {
            const active = isTabActive(item.id);
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: active ? '#FFE500' : 'transparent',
                  color: active ? '#000' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  marginBottom: '2px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: active ? '600' : '500',
                  transition: 'all 0.2s',
                  textAlign: 'left'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d={item.icon} />
                </svg>
                {item.label}
              </button>
            );
        })}

        {/* Module Switcher Section */}
        <div style={{ marginTop: '24px' }}>
            <div style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', paddingLeft: '10px' }}>Access</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 4px' }}>
                {moduleShortcuts.map(mod => {
                    const active = isActive(mod.path);
                    return (
                        <div
                            key={mod.id}
                            onClick={() => navigate(mod.path)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 12px',
                                background: active ? '#1e293b' : 'transparent',
                                color: active ? '#FFE500' : '#94a3b8',
                                borderRadius: '6px',
                                fontSize: '12px',
                                transition: 'all 0.2s',
                                border: '1px solid transparent',
                                borderColor: active ? '#334155' : 'transparent',
                                cursor: 'pointer',
                                fontWeight: active ? '600' : '400'
                            }}
                            onMouseEnter={(e) => { 
                                if (!active) {
                                    e.currentTarget.style.color = '#fff';
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                }
                            }}
                            onMouseLeave={(e) => { 
                                if (!active) {
                                    e.currentTarget.style.color = '#94a3b8'; 
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                        >
                            <div style={{width: '6px', height:'6px', borderRadius:'50%', background: active ? '#FFE500' : '#334155'}} />
                            {mod.label}
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* User Footer */}
      <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '12px' }}>
             {user?.username?.[0]?.toUpperCase() || 'A'}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.username}</div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>System Admin</div>
          </div>
        </div>
        <button 
          onClick={onLogout}
          style={{
            width: '100%',
            padding: '6px',
            background: 'transparent',
            border: '1px solid #334155',
            color: '#cbd5e1',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.target.style.borderColor = '#ef4444'; e.target.style.color = '#ef4444'; }}
          onMouseLeave={(e) => { e.target.style.borderColor = '#334155'; e.target.style.color = '#cbd5e1'; }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}