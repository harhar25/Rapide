import React, { useState, useEffect } from 'react';
import { fetchJson } from '../utils/fetchJson';
import { EnterpriseTable, Modal, Alert } from './EnterpriseComponents';

// ==================== SERVICE CATALOG MANAGER ====================
export const ServiceCatalogManager = ({ user }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ service_name: '', category: 'PMS', vehicle_type: 'All', base_price: 0, labor_hours: 1, description: '' });

  useEffect(() => { loadServices(); }, []);

  const loadServices = async () => {
    setLoading(true);
    try {
      const res = await fetchJson('/api/admin/services', { headers: authHeader(user) });
      if (res.success) setServices(res.data);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editing ? `/api/admin/services/${editing.id}` : '/api/admin/services';
    const method = editing ? 'PUT' : 'POST';
    
    // Validate numbers
    const payload = {
       ...form,
       base_price: parseFloat(form.base_price),
       labor_hours: parseFloat(form.labor_hours)
    };

    const res = await fetchJson(url, {
      method,
      headers: { ...authHeader(user), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.success) {
      setShowModal(false);
      setEditing(null);
      setForm({ service_name: '', category: 'PMS', vehicle_type: 'All', base_price: 0, labor_hours: 1, description: '' });
      loadServices();
    } else {
      alert(res.error || 'Operation failed');
    }
  };

  const handleEdit = (svc) => {
    setEditing(svc);
    setForm(svc);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this service?')) return;
    const res = await fetchJson(`/api/admin/services/${id}`, { method: 'DELETE', headers: authHeader(user) });
    if (res.success) loadServices();
  };

  const openNew = () => {
      setEditing(null);
      setForm({ service_name: '', category: 'PMS', vehicle_type: 'All', base_price: 0, labor_hours: 1, description: '' });
      setShowModal(true);
  };

  return (
    <div className="animate-in">
      <div style={styles.flexHeader}>
        <div>
          <h2 style={styles.subTitle}>Service Catalog</h2>
          <p style={styles.desc}>Standardized jobs and pricing</p>
        </div>
        <button style={styles.primaryButton} onClick={openNew}>+ New Service</button>
      </div>

      <EnterpriseTable
        data={services}
        columns={[
          { key: 'category', label: 'CATEGORY', render: v => <span style={styles.badge}>{v}</span> },
          { key: 'service_name', label: 'SERVICE NAME', render: (v,r) => <div><strong>{v}</strong><div style={{fontSize:11, color:'#64748b'}}>{r.description}</div></div> },
          { key: 'vehicle_type', label: 'VEHICLE', render: v => <span style={{textTransform:'uppercase', fontSize:11}}>{v}</span> },
          { key: 'base_price', label: 'PRICE', render: v => `₱${Number(v).toLocaleString()}` },
          { key: 'labor_hours', label: 'HOURS', render: v => `${v} hrs` },
          { key: 'act', label: '', render: (_, r) => (
             <div style={{display:'flex', gap:8}}>
               <button style={styles.textBtn} onClick={() => handleEdit(r)}>Edit</button>
               <button style={styles.textBtnDanger} onClick={() => handleDelete(r.id)}>Delete</button>
             </div>
          )}
        ]}
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Service" : "New Service"}>
        <form onSubmit={handleSubmit} style={styles.formStack}>
          <div style={styles.row}>
            <div style={{flex:1}}>
                <label style={styles.label}>Service Name</label>
                <input style={styles.input} required value={form.service_name} onChange={e => setForm({...form, service_name: e.target.value})} />
            </div>
            <div style={{width: 120}}>
                <label style={styles.label}>Category</label>
                <select style={styles.input} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="PMS">PMS</option>
                    <option value="General Repair">General Repair</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Body">Body/Paint</option>
                    <option value="Detailing">Detailing</option>
                    <option value="Tires & Wheels">Tires & Wheels</option>
                    <option value="A/C & Cooling">A/C & Cooling</option>
                    <option value="Brakes">Brakes</option>
                    <option value="Transmission">Transmission</option>
                    <option value="Diagnosis">Diagnosis</option>
                    <option value="Accessories">Accessories</option>
                </select>
            </div>
          </div>
          
          <div style={styles.row}>
             <div style={{flex:1}}>
                <label style={styles.label}>Vehicle Type</label>
                <input style={styles.input} placeholder="e.g. Sedan, SUV, Any" value={form.vehicle_type} onChange={e => setForm({...form, vehicle_type: e.target.value})} />
             </div>
             <div style={{flex:1}}>
                <label style={styles.label}>Est. Labor (Hrs)</label>
                <input style={styles.input} type="number" step="0.1" value={form.labor_hours} onChange={e => setForm({...form, labor_hours: e.target.value})} />
             </div>
             <div style={{flex:1}}>
                <label style={styles.label}>Base Price (₱)</label>
                <input style={styles.input} type="number" step="100" value={form.base_price} onChange={e => setForm({...form, base_price: e.target.value})} />
             </div>
          </div>

          <label style={styles.label}>Description</label>
          <textarea style={{...styles.input, height:80}} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />

          <div style={styles.modalActions}>
            <button type="button" style={styles.secondaryButton} onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" style={styles.primaryButton}>Save Service</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ==================== TECHNICIAN MANAGER ====================
export const TechnicianManager = ({ user }) => {
  const [techs, setTechs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', employee_id: '', specialization: 'General', contact_no: '', status: 'active' });

  useEffect(() => { loadTechs(); }, []);

  const generateEmployeeId = () => {
    const prefix = 'TECH';
    const num = String(techs.length + 1).padStart(4, '0');
    let id = `${prefix}-${num}`;
    // Avoid collisions
    const existing = new Set(techs.map(t => t.employee_id));
    let counter = techs.length + 1;
    while (existing.has(id)) {
      counter++;
      id = `${prefix}-${String(counter).padStart(4, '0')}`;
    }
    return id;
  };

  const loadTechs = async () => {
    const res = await fetchJson('/api/admin/technicians', { headers: authHeader(user) });
    if (res.success) setTechs(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = form.id ? '/api/admin/technicians/update' : '/api/admin/technicians';
    const res = await fetchJson(url, {
      method: 'POST',
      headers: { ...authHeader(user), 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (res.success) {
      setShowModal(false);
      loadTechs();
    }
  };

  return (
    <div className="animate-in">
        <div style={styles.flexHeader}>
            <div>
            <h2 style={styles.subTitle}>Technician Roster</h2>
            <p style={styles.desc}>Manage shop floor personnel</p>
            </div>
            <button style={styles.primaryButton} onClick={() => { setForm({ name: '', employee_id: generateEmployeeId(), specialization: 'General', contact_no: '', status: 'active'}); setShowModal(true); }}>
            + Add Tech
            </button>
        </div>
        <EnterpriseTable 
            data={techs}
            columns={[
                { key: 'name', label: 'NAME', render: v => <strong>{v}</strong> },
                { key: 'employee_id', label: 'ID', render: v => <span style={styles.mono}>{v}</span> },
                { key: 'specialization', label: 'SKILL', render: v => <span style={styles.badge}>{v}</span> },
                { key: 'status', label: 'STATUS', render: v => <span style={{...styles.badge, background: v==='active'?'#dcfce7':'#f1f5f9', color: v==='active'?'#166534':'#64748b'}}>{v}</span> },
                { key: 'act', label: '', render: (_, r) => <button style={styles.textBtn} onClick={() => { setForm(r); setShowModal(true); }}>Edit</button> }
            ]}
        />
        
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Technician Details">
             <form onSubmit={handleSubmit} style={styles.formStack}>
                 <label style={styles.label}>Full Name</label>
                 <input style={styles.input} required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                 
                 <div style={styles.row}>
                    <div style={{flex:1}}>
                        <label style={styles.label}>Employee ID</label>
                        <input style={{...styles.input, ...(form.id ? {} : {background: '#f1f5f9', color: '#64748b'})}} required readOnly={!form.id} value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} />
                    </div>
                    <div style={{flex:1}}>
                        <label style={styles.label}>Specialization</label>
                        <select style={styles.input} value={form.specialization} onChange={e => setForm({...form, specialization: e.target.value})}>
                            <option value="General">General</option>
                            <option value="Engine">Engine</option>
                            <option value="Electrical">Electrical</option>
                            <option value="AC">AC</option>
                            <option value="Underchassis">Underchassis</option>
                        </select>
                    </div>
                 </div>
                 
                 <div style={styles.row}>
                    <div style={{flex:1}}>
                        <label style={styles.label}>Contact No.</label>
                        <input style={styles.input} value={form.contact_no} onChange={e => setForm({...form, contact_no: e.target.value})} />
                    </div>
                    <div style={{flex:1}}>
                        <label style={styles.label}>Status</label>
                        <select style={styles.input} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="on-leave">On Leave</option>
                        </select>
                    </div>
                 </div>

                 <div style={styles.modalActions}>
                    <button type="button" style={styles.secondaryButton} onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" style={styles.primaryButton}>Save</button>
                 </div>
             </form>
        </Modal>
    </div>
  );
};

// ==================== BAY MANAGER ====================
export const BayManager = ({ user }) => {
    const [bays, setBays] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ bay_name: '', bay_type: 'general', status: 'active' });
  
    useEffect(() => { loadBays(); }, []);
  
    const loadBays = async () => {
      const res = await fetchJson('/api/admin/bays', { headers: authHeader(user) });
      if (res.success) setBays(res.data);
    };
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      const url = form.id ? '/api/admin/bays/update' : '/api/admin/bays';
      const res = await fetchJson(url, { method: 'POST', headers: { ...authHeader(user), 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.success) { setShowModal(false); loadBays(); }
    };

    return (
        <div className="animate-in">
            <div style={styles.flexHeader}>
                <div>
                <h2 style={styles.subTitle}>Service Bays</h2>
                <p style={styles.desc}>Manage workshop capacity</p>
                </div>
                <button style={styles.primaryButton} onClick={() => { setForm({ bay_name: '', bay_type: 'general', status: 'active'}); setShowModal(true); }}>
                + Add Bay
                </button>
            </div>
            
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
                {bays.map(bay => (
                    <div key={bay.id} style={{
                        border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, background: '#fff',
                        opacity: bay.status === 'active' ? 1 : 0.6
                    }}>
                        <div style={{fontWeight: 700, fontSize: 16, marginBottom: 4}}>{bay.bay_name}</div>
                        <div style={{fontSize: 11, color: '#64748b', textTransform: 'uppercase', marginBottom: 12}}>{bay.bay_type}</div>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: bay.status === 'active' ? '#dcfce7':'#fee2e2', color: bay.status==='active'?'#166534':'#991b1b' }}>
                                {bay.status}
                            </span>
                            <button style={{border:'none', background:'none', color:'#3b82f6', fontSize: 12, cursor:'pointer'}} 
                                onClick={() => { setForm(bay); setShowModal(true); }}>Edit</button>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Bay Configuration">
                <form onSubmit={handleSubmit} style={styles.formStack}>
                    <label style={styles.label}>Bay Name</label>
                    <input style={styles.input} required value={form.bay_name} onChange={e => setForm({...form, bay_name: e.target.value})} placeholder="e.g. Bay 1" />
                    
                    <label style={styles.label}>Type</label>
                    <select style={styles.input} value={form.bay_type} onChange={e => setForm({...form, bay_type: e.target.value})}>
                        <option value="general">General</option>
                        <option value="ac">AC</option>
                        <option value="electrical">Electrical</option>
                        <option value="paint">Paint/Body</option>
                    </select>

                    <label style={styles.label}>Status</label>
                    <select style={styles.input} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                        <option value="active">Active</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    
                    <div style={styles.modalActions}>
                        <button type="button" style={styles.secondaryButton} onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" style={styles.primaryButton}>Save</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};


// HELPERS
const authHeader = (user) => ({
  'X-Admin-Username': user.username,
  'X-Admin-Password': localStorage.getItem('admin_password')
});

const styles = {
  flexHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '0 4px' },
  subTitle: { fontSize: 20, fontWeight: 700, color: '#0f172a', margin:0 },
  desc: { fontSize: 13, color: '#64748b', margin:0, marginTop: 4 },
  primaryButton: { padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  secondaryButton: { padding: '8px 16px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  textBtn: { background:'none', border:'none', color: '#3b82f6', fontWeight: 600, cursor: 'pointer', fontSize: 12 },
  textBtnDanger: { background:'none', border:'none', color: '#ef4444', fontWeight: 600, cursor: 'pointer', fontSize: 12 },
  badge: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 10, background: '#f1f5f9', color: '#475569' },
  mono: { fontFamily: 'monospace', fontSize: 12, color: '#64748b' },
  formStack: { display: 'flex', flexDirection: 'column', gap: 16 },
  row: { display: 'flex', gap: 12 },
  label: { fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4, display: 'block' },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, outline: 'none' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }
};
