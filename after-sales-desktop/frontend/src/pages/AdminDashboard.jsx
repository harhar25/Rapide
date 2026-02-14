import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/enterprise-ui.css'; 
import { fetchJson } from '../utils/fetchJson';
import { 
  EnterpriseTable, 
  Alert,
  Modal
} from '../components/EnterpriseComponents';
import { ServiceCatalogManager, TechnicianManager, BayManager } from '../components/AdminResources';
import { PERSONNEL_ROLES, getRoleLabel } from '../utils/roles';

// MODULES DATA (For the nice grid cards)
const MODULES = [
  { id: 'cro', label: 'CRO & Sales', desc: 'Customer relations', color: '#3b82f6', path: '/cro' },
  { id: 'advisor', label: 'Service Advisor', desc: 'Job estimates', color: '#10b981', path: '/advisor' },
  { id: 'controller', label: 'Job Controller', desc: 'Bay allocation', color: '#6366f1', path: '/controller' },
  { id: 'technician', label: 'Technician', desc: 'Job execution', color: '#f59e0b', path: '/technician' },
  { id: 'foreman', label: 'Foreman / QC', desc: 'Quality control', color: '#0ea5e9', path: '/foreman' },
  { id: 'parts', label: 'Warehouse', desc: 'Inventory', color: '#f97316', path: '/warehouse' },
  { id: 'billing', label: 'Billing', desc: 'Invoicing', color: '#8b5cf6', path: '/billing' },
  { id: 'gate', label: 'Security Gate', desc: 'Logs', color: '#64748b', path: '/security-gate' },
];

const AdminDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data State
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ staff: 0, activeJobs: 0, revenue: 0 }); 
  
  // UI State
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [alert, setAlert] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  
  // Form State
  const [formData, setFormData] = useState({ username: '', password: '', name: '', role: 'cro' });

  // 1. Sync Tab from URL
  useEffect(() => {
     const params = new URLSearchParams(location.search);
     const tab = params.get('tab');
     if (tab) setActiveTab(tab);
     else setActiveTab('overview');
  }, [location.search]);

  // 2. Load Data on Mount
  useEffect(() => {
    loadPersonnel();
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await fetchJson('/api/admin/dashboard-stats', {
        headers: { 'X-Admin-Username': user.username, 'X-Admin-Password': localStorage.getItem('admin_password') }
      });
      if (data.success) {
        setStats(prev => ({ ...prev, activeJobs: data.data.activeJobs, revenue: data.data.dailyRevenue }));
      }
    } catch (err) {
      console.error("Failed to load stats", err);
    }
  };

  const loadPersonnel = async () => {
    try {
      setLoading(true);
      const data = await fetchJson('/api/auth/admin/personnel-list', {
        headers: { 'X-Admin-Username': user.username, 'X-Admin-Password': localStorage.getItem('admin_password') }
      });
      if (data.success && Array.isArray(data.personnel)) {
        setPersonnel(data.personnel);
        setStats(prev => ({ ...prev, staff: data.personnel.length }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchJson('/api/auth/admin/register-personnel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Username': user.username,
          'X-Admin-Password': localStorage.getItem('admin_password')
        },
        body: JSON.stringify(formData)
      });
      
      if (res.success) {
        setAlert({ type: 'success', text: `Created user ${formData.username}` });
        setShowRegisterForm(false);
        setFormData({ username: '', password: '', name: '', role: 'cro' });
        loadPersonnel();
      } else {
        setAlert({ type: 'error', text: res.error || 'Registration failed' });
      }
    } catch (e) {
      setAlert({ type: 'error', text: e.message });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user? Action cannot be undone.')) return;
    const res = await fetchJson(`/api/auth/admin/delete-personnel?id=${id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Username': user.username, 'X-Admin-Password': localStorage.getItem('admin_password') }
    });
    if (res.success) {
      loadPersonnel();
    }
  };

  // --- Filtering ---
  const filteredList = personnel
    .map(p => ({ id: p[0], username: p[1], name: p[2], role: p[3], status: p[5] }))
    .filter(p => {
      const matchesRole = roleFilter ? p.role === roleFilter : true;
      const matchesSearch = search ? 
        (p.name?.toLowerCase().includes(search.toLowerCase()) || p.username?.toLowerCase().includes(search.toLowerCase())) : true;
      return matchesRole && matchesSearch;
    });

  // --- VIEWS ---

  const renderOverview = () => (
    <div className="animate-in">
      <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
             {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-1px' }}>
             Welcome back, {user.username || 'Administrator'}
          </h1>
          <p style={{ marginTop: '8px', color: '#64748b', fontSize: '16px' }}>
             System Overview &bull; {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
      </div>

      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Today's Revenue</div>
          <div style={styles.kpiValue}>₱ {stats.revenue?.toLocaleString()}</div>
          <div style={styles.kpiSub}>Daily collection</div>
        </div>
        
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Active Jobs</div>
          <div style={styles.kpiValue}>{stats.activeJobs}</div>
          <div style={styles.kpiSub}>In progress</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Total Personnel</div>
          <div style={styles.kpiValue}>{stats.staff}</div>
          <div style={styles.kpiSub}>Registered users</div>
        </div>
      </div>

      <h3 style={styles.sectionHeader}>Quick Access</h3>
      <div style={styles.modulesGrid}>
        {MODULES.map(mod => (
          <button key={mod.id} style={styles.moduleCard} onClick={() => navigate(mod.path)}>
            <div style={{...styles.moduleIcon, background: mod.color}} />
            <div style={styles.moduleText}>
              <div style={styles.moduleTitle}>{mod.label}</div>
              <div style={styles.moduleDesc}>{mod.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderPersonnel = () => (
    <div className="animate-in">
      <div style={styles.flexHeader}>
        <div>
          <h1 style={styles.pageTitle}>Personnel Management</h1>
          <p style={styles.pageSubtitle}>Manage system access and roles</p>
        </div>
        <button style={styles.primaryButton} onClick={() => setShowRegisterForm(true)}>
          + New User
        </button>
      </div>

      <div style={styles.controls}>
        <input 
          style={styles.searchBar} 
          placeholder="Search by name or username..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={styles.filterDropdown} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {PERSONNEL_ROLES.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
        </select>
      </div>

      <div style={styles.tableWrapper}>
        <EnterpriseTable 
          data={filteredList}
          columns={[
            { key: 'name', label: 'NAME', render: (_, r) => <span style={{fontWeight:600}}>{r.name}</span> },
            { key: 'username', label: 'ID', render: (v) => <span style={styles.mono}>{v}</span> },
            { key: 'role', label: 'ROLE', render: (_, r) => <RoleBadge role={r.role} /> },
            { key: 'status', label: 'STATUS', render: (v) => <StatusDot status={v} /> },
            { key: 'act', label: '', render: (_, r) => <button style={styles.textBtnDanger} onClick={() => handleDelete(r.id)}>Remove</button> }
          ]}
        />
        {filteredList.length === 0 && <div style={styles.emptyState}>No users found matching query</div>}
      </div>
    </div>
  );

  const renderAudit = () => (
    <div className="animate-in">
       <div style={styles.header}>
        <h1 style={styles.pageTitle}>Security Audit</h1>
        <p style={styles.pageSubtitle}>System access logs and security events</p>
      </div>
      
      <div style={styles.emptyStateContainer}>
        <div style={{fontSize: '48px', marginBottom: '16px'}}>🔒</div>
        <h3>Security Logs - Coming Soon</h3>
        <p>This module will track login attempts and sensitive actions.</p>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      {alert && <Alert type={alert.type}>{alert.text}</Alert>}
      
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'personnel' && renderPersonnel()}
      {activeTab === 'resources' && (
        <div style={{display:'flex', flexDirection:'column', gap: 40}}>
           <TechnicianManager user={user} />
           <BayManager user={user} />
        </div>
      )}
      {activeTab === 'services' && <ServiceCatalogManager user={user} />}
      {activeTab === 'audit' && renderAudit()}

      <Modal isOpen={showRegisterForm} onClose={() => setShowRegisterForm(false)} title="Register Personnel">
        <form onSubmit={handleRegister}>
          <div style={styles.formStack}>
            <label style={styles.fieldLabel}>Full Name</label>
            <input style={styles.input} required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Juan dela Cruz" />
            
            <label style={styles.fieldLabel}>Username</label>
            <input style={styles.input} required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
            
            <label style={styles.fieldLabel}>Password</label>
            <input style={styles.input} required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            
            <label style={styles.fieldLabel}>Role</label>
            <select style={styles.input} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
              {PERSONNEL_ROLES.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
            </select>
          </div>
          <div style={styles.modalActions}>
            <button type="button" style={styles.secondaryButton} onClick={() => setShowRegisterForm(false)}>Cancel</button>
            <button type="submit" style={styles.primaryButton}>Create Account</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// --- SUB COMPONENTS ---

const RoleBadge = ({ role }) => {
  const colorMap = {
    admin: '#0f172a', cro: '#3b82f6', technician: '#f59e0b', advisor: '#10b981', 
    controller: '#6366f1', foreman: '#0ea5e9'
  };
  const c = colorMap[role] || '#64748b';
  return (
    <span style={{
      display:'inline-block', padding: '4px 10px', borderRadius: '12px', 
      fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
      color: c, border: `1px solid ${c}30`, background: `${c}10`
    }}>
      {getRoleLabel(role)}
    </span>
  );
};

const StatusDot = ({ status }) => (
  <div style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'13px', color: status==='active'?'#16a34a':'#94a3b8'}}>
    <div style={{width:'8px', height:'8px', borderRadius:'50%', background: status==='active'?'#16a34a':'#cbd5e1'}} />
    <span style={{textTransform:'capitalize'}}>{status}</span>
  </div>
);

// --- STYLES ---

const styles = {
  container: {
    padding: '40px 60px',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: { marginBottom: '40px' },
  welcomeText: { fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', color: '#64748b', marginBottom: '8px' },
  pageTitle: { fontSize: '32px', fontWeight: '800', color: '#0f172a', margin:0, letterSpacing: '-0.5px' },
  pageSubtitle: { fontSize: '16px', color: '#64748b', marginTop: '4px', margin: 0 },
  
  // KPI
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '48px' },
  kpiCard: { background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px -4px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' },
  kpiLabel: { fontSize: '12px', fontWeight: '600', color: '#64748b',  textTransform: 'uppercase', letterSpacing: '0.5px' },
  kpiValue: { fontSize: '36px', fontWeight: '800', color: '#0f172a', margin: '8px 0 4px 0', lineHeight: 1 },
  kpiSub: { fontSize: '13px', color: '#10b981', fontWeight: '500' },

  // Modules
  sectionHeader: { fontSize: '18px', fontWeight: '700', color: '#334155', marginBottom: '20px' },
  modulesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' },
  moduleCard: { 
    display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', 
    background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px',
    cursor: 'pointer', textAlign: 'left', transition: 'transform 0.1s, box-shadow 0.1s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  moduleIcon: { width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0 },
  moduleText: { overflow: 'hidden' },
  moduleTitle: { fontSize: '15px', fontWeight: '700', color: '#1e293b' },
  moduleDesc: { fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },

  // Personnel
  flexHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' },
  controls: { display: 'flex', gap: '12px', marginBottom: '24px' },
  searchBar: { flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  filterDropdown: { padding: '0 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '500' },
  tableWrapper: { background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', overflow: 'hidden' },
  primaryButton: { background: '#0f172a', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  secondaryButton: { background: 'transparent', color: '#64748b', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  textBtnDanger: { background: 'none', border: 'none', color: '#ef4444', fontWeight: '600', cursor: 'pointer', fontSize: '13px', padding: 0 },
  emptyState: { padding: '60px', textAlign: 'center', color: '#94a3b8' },
  mono: { fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' },

  // Forms & Modal
  formStack: { display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' },
  fieldLabel: { fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '-8px' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' },
  
  // Empty State Audit
  emptyStateContainer: {
    background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '16px',
    padding: '60px', textAlign: 'center', color: '#64748b'
  }
};

export default AdminDashboard;
