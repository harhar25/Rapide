import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import CROModule from '../pages/CROModule';
import TechnicianDashboard from '../pages/TechnicianDashboard';
import ServiceAdvisorDashboard from '../pages/ServiceAdvisorDashboard';
import JobControllerDashboard from '../pages/JobControllerDashboard';
import ForemanQCDashboard from '../pages/ForemanQCDashboard';
import JobWrapupDashboard from '../pages/JobWrapupDashboard';
import CarJockeyDashboard from '../pages/CarJockeyDashboard';
import BillingDashboard from '../pages/BillingDashboard';
import WarehouseDashboard from '../pages/WarehouseDashboard';
import AdminDashboard from '../pages/AdminDashboard';
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
      id: userData.id,
      username: userData.username,
      name: userData.name,
      role: userData.role,
      email: userData.email
    };
    localStorage.setItem('user', JSON.stringify(user));
    // Store admin password temporarily if admin login
    if (user.role === 'admin') {
      localStorage.setItem('admin_password', userData.password);
    }
    setUser(user);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('admin_password');
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '18px', color: '#667eea' }}>Loading...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Render different interfaces based on role
  switch (user.role) {
    case 'admin':
      return <AdminDashboard user={user} onLogout={handleLogout} />;
    case 'cro':
      return (
        <Layout onLogout={handleLogout} user={user}>
          <CROModule user={user} />
        </Layout>
      );
    case 'technician':
      return <TechnicianDashboard user={user} onLogout={handleLogout} />;
    case 'advisor':
      return <ServiceAdvisorDashboard user={user} onLogout={handleLogout} />;
    case 'controller':
      return <JobControllerDashboard user={user} onLogout={handleLogout} />;
    case 'foreman':
      return <ForemanQCDashboard user={user} onLogout={handleLogout} />;
    case 'wrapup':
      return <JobWrapupDashboard user={user} onLogout={handleLogout} />;
    case 'jockey':
      return <CarJockeyDashboard user={user} onLogout={handleLogout} />;
    case 'billing':
      return <BillingDashboard user={user} onLogout={handleLogout} />;
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
    default:
      return <Login onLogin={handleLogin} />;
  }
}
