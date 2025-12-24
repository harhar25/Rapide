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
import CashierDashboard from '../pages/CashierDashboard';
import WarehouseDashboard from '../pages/WarehouseDashboard';
import AdminDashboard from '../pages/AdminDashboard';
import SecurityGateDashboard from '../pages/SecurityGateDashboard';
import VehicleHandoverDashboard from '../pages/VehicleHandoverDashboard';
import FollowUpDashboard from '../pages/FollowUpDashboard';
import Login from '../pages/Login';
import '../styles/app.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminModule, setAdminModule] = useState(() => localStorage.getItem('admin_module') || 'admin');

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

  if (user.role === 'admin') {
    const modules = [
      { key: 'admin', label: 'Admin' },
      { key: 'cro', label: 'CRO' },
      { key: 'advisor', label: 'Service Advisor' },
      { key: 'controller', label: 'Job Controller' },
      { key: 'foreman', label: 'Foreman QC' },
      { key: 'wrapup', label: 'Job Wrap-up' },
      { key: 'jockey', label: 'Car Jockey' },
      { key: 'warehouse', label: 'Warehouse' },
      { key: 'billing', label: 'Billing' },
      { key: 'cashier', label: 'Cashier' },
      { key: 'security_gate', label: 'Security Gate' },
      { key: 'vehicle_handover', label: 'Vehicle Handover' },
      { key: 'follow_up', label: 'Follow Up' },
      { key: 'manager', label: 'Service Manager' }
    ];

    const onAdminModuleChange = (e) => {
      const next = e.target.value;
      setAdminModule(next);
      localStorage.setItem('admin_module', next);
    };

    const AdminSwitcher = (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: '#111827', color: '#fff', padding: '8px 12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <strong>Admin</strong>
        <span style={{ opacity: 0.85 }}>Module:</span>
        <select value={adminModule} onChange={onAdminModuleChange} style={{ padding: '6px 8px' }}>
          {modules.map(m => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
        <button onClick={handleLogout} style={{ marginLeft: 'auto', padding: '6px 10px' }}>Sign Out</button>
      </div>
    );

    const contentStyle = { paddingTop: '52px' };

    let moduleView = null;
    switch (adminModule) {
      case 'admin':
        moduleView = <AdminDashboard user={user} onLogout={handleLogout} />;
        break;
      case 'cro':
        moduleView = (
          <Layout onLogout={handleLogout} user={user}>
            <CROModule user={user} />
          </Layout>
        );
        break;
      case 'technician':
        moduleView = <TechnicianDashboard user={user} onLogout={handleLogout} />;
        break;
      case 'advisor':
        moduleView = <ServiceAdvisorDashboard user={user} onLogout={handleLogout} />;
        break;
      case 'controller':
        moduleView = <JobControllerDashboard user={user} onLogout={handleLogout} />;
        break;
      case 'foreman':
        moduleView = <ForemanQCDashboard user={user} onLogout={handleLogout} />;
        break;
      case 'wrapup':
        moduleView = <JobWrapupDashboard user={user} onLogout={handleLogout} />;
        break;
      case 'jockey':
        moduleView = <CarJockeyDashboard user={user} onLogout={handleLogout} />;
        break;
      case 'billing':
        moduleView = <BillingDashboard user={user} onLogout={handleLogout} />;
        break;
      case 'cashier':
        moduleView = <CashierDashboard user={user} onLogout={handleLogout} />;
        break;
      case 'warehouse':
        moduleView = <WarehouseDashboard user={user} onLogout={handleLogout} />;
        break;
      case 'security_gate':
        moduleView = <SecurityGateDashboard user={user} onLogout={handleLogout} />;
        break;
      case 'vehicle_handover':
        moduleView = <VehicleHandoverDashboard user={user} onLogout={handleLogout} />;
        break;
      case 'follow_up':
        moduleView = <FollowUpDashboard user={user} onLogout={handleLogout} />;
        break;
      case 'manager':
        moduleView = (
          <Layout onLogout={handleLogout} user={user}>
            <div style={{ padding: '40px', textAlign: 'center', fontSize: '24px' }}>
              👔 Service Manager Dashboard (Coming Soon)
            </div>
          </Layout>
        );
        break;
      default:
        moduleView = <AdminDashboard user={user} onLogout={handleLogout} />;
    }

    return (
      <div style={contentStyle}>
        {AdminSwitcher}
        {moduleView}
      </div>
    );
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
    case 'cashier':
      return <CashierDashboard user={user} onLogout={handleLogout} />;
    case 'warehouse':
      return <WarehouseDashboard user={user} onLogout={handleLogout} />;
    case 'security_gate':
      return <SecurityGateDashboard user={user} onLogout={handleLogout} />;
    case 'vehicle_handover':
      return <VehicleHandoverDashboard user={user} onLogout={handleLogout} />;
    case 'follow_up':
      return <FollowUpDashboard user={user} onLogout={handleLogout} />;
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
