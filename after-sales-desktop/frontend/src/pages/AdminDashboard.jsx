import React, { useState, useEffect } from 'react';
import '../styles/admin-dashboard.css';
import { fetchJson } from '../utils/fetchJson';

const AdminDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'cro',
    email: ''
  });
  const [message, setMessage] = useState('');

  const roles = ['cro', 'technician', 'warehouse', 'manager', 'advisor'];

  useEffect(() => {
    if (activeTab === 'personnel') {
      loadPersonnel();
    }
  }, [activeTab]);

  const loadPersonnel = async () => {
    try {
      const data = await fetchJson('/api/auth/admin/personnel-list', {
        headers: {
          'X-Admin-Username': user.username,
          'X-Admin-Password': localStorage.getItem('admin_password')
        }
      });
      if (data.success) {
        setPersonnel(data.personnel || []);
      }
    } catch (err) {
      setMessage('Error loading personnel');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPersonnel = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!formData.username || !formData.password || !formData.name || !formData.role) {
      setMessage('All fields are required');
      return;
    }

    try {
      const data = await fetchJson('/api/auth/admin/register-personnel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Username': user.username,
          'X-Admin-Password': localStorage.getItem('admin_password')
        },
        body: JSON.stringify(formData)
      });
      if (data.success) {
        setMessage('✓ Personnel registered successfully');
        setFormData({ username: '', password: '', name: '', role: 'cro', email: '' });
        setShowRegisterForm(false);
        setTimeout(() => loadPersonnel(), 500); // Refresh after slight delay
      } else {
        setMessage('✗ ' + (data.error || 'Registration failed'));
      }
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const roleColor = {
    cro: '#3b82f6',
    technician: '#ef4444',
    warehouse: '#f59e0b',
    manager: '#8b5cf6',
    advisor: '#10b981'
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="header-left">
          <h1>Admin Dashboard</h1>
          <p>Welcome, {user.name}</p>
        </div>
        <button onClick={onLogout} className="logout-btn">Sign Out</button>
      </header>

      <div className="admin-content">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab ${activeTab === 'personnel' ? 'active' : ''}`}
            onClick={() => setActiveTab('personnel')}
          >
            Personnel Management
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="overview-section">
            <h2>System Overview</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">5</div>
                <div className="stat-label">Total Roles</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{personnel.length}</div>
                <div className="stat-label">Registered Personnel</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">Admin</div>
                <div className="stat-label">Your Role</div>
              </div>
            </div>

            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <button 
                className="action-btn"
                onClick={() => {
                  setActiveTab('personnel');
                  setShowRegisterForm(true);
                }}
              >
                + Register New Personnel
              </button>
            </div>
          </div>
        )}

        {activeTab === 'personnel' && (
          <div className="personnel-section">
            <div className="section-header">
              <h2>Personnel Management</h2>
              <button 
                className="btn-primary"
                onClick={() => setShowRegisterForm(!showRegisterForm)}
              >
                {showRegisterForm ? '✕ Cancel' : '+ Add Personnel'}
              </button>
            </div>

            {showRegisterForm && (
              <div className="register-form">
                <h3>Register New Personnel</h3>
                <form onSubmit={handleRegisterPersonnel}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Username *</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        placeholder="johndoe"
                      />
                    </div>
                    <div className="form-group">
                      <label>Password *</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Role *</label>
                    <select 
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                    >
                      {roles.map(role => (
                        <option key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {message && <div className="message">{message}</div>}

                  <button type="submit" className="submit-btn">Register Personnel</button>
                </form>
              </div>
            )}

            <div className="personnel-list">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                <h3>Registered Personnel</h3>
                <button 
                  onClick={loadPersonnel}
                  style={{padding: '8px 16px', background: '#212529', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'}}
                >
                  🔄 Refresh
                </button>
              </div>
              {loading ? (
                <p className="loading">Loading...</p>
              ) : personnel.length === 0 ? (
                <p className="empty">No personnel registered yet. Click refresh to reload.</p>
              ) : (
                <table className="personnel-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personnel.map(person => {
                      if (!person || !person[3]) return null;
                      const role = person[3] || 'cro';
                      const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
                      const roleColorValue = roleColor[role] || '#666';
                      
                      return (
                        <tr key={person[0]}>
                          <td><strong>{person[2] || 'N/A'}</strong></td>
                          <td>{person[1] || 'N/A'}</td>
                          <td>
                            <span className="role-badge" style={{backgroundColor: roleColorValue + '20', color: roleColorValue}}>
                              {roleDisplay}
                            </span>
                          </td>
                          <td>{person[4] || '-'}</td>
                          <td>
                            <span className={`status ${person[5]}`}>
                              {person[5] === 'active' ? '● Active' : '○ Inactive'}
                            </span>
                          </td>
                          <td className="date">{person[6]?.split(' ')[0] || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
