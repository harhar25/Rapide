import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import CROModule from '../pages/CROModule';
import TechnicianDashboard from '../pages/TechnicianDashboard';
import WarehouseDashboard from '../pages/WarehouseDashboard';
import Login from '../pages/Login';
import '../styles/app.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    const user = {
      id: Math.random(),
      name: userData.name,
      role: userData.role,
      username: userData.username
    };
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '18px', color: '#667eea' }}>Loading...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Render different interfaces based on role
  switch (user.role) {
    case 'cro':
      return (
        <Layout onLogout={handleLogout} user={user}>
          <CROModule user={user} />
        </Layout>
      );
    case 'technician':
      return <TechnicianDashboard user={user} onLogout={handleLogout} />;
    case 'warehouse':
      return <WarehouseDashboard user={user} onLogout={handleLogout} />;
    case 'manager':
      return (
        <Layout onLogout={handleLogout} user={user}>
          <div style={{ padding: '40px', textAlign: 'center', fontSize: '24px' }}>
            👔 Service Manager Dashboard (Coming Soon)
          </div>
        </Layout>
      );
    case 'advisor':
      return (
        <Layout onLogout={handleLogout} user={user}>
          <div style={{ padding: '40px', textAlign: 'center', fontSize: '24px' }}>
            💼 Service Advisor Dashboard (Coming Soon)
          </div>
        </Layout>
      );
    default:
      return <Login onLogin={handleLogin} />;
  }
}

            <input
              type="password"
              className="form-input"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              placeholder="Enter password"
            />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <button type="submit" className="btn btn-primary" style={{width: '100%'}}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div>
      <h2>Dashboard</h2>
      <p>Welcome to After-Sales Service Management System</p>
    </div>
  );
}
