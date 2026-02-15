import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import CROModule from '../pages/CROModule';
import TechnicianDashboard from '../pages/TechnicianDashboard';
import ServiceAdvisorDashboard from '../pages/ServiceAdvisorDashboard';
import JobControllerDashboard from '../pages/JobControllerDashboard';
import JobControllerModern from '../pages/JobControllerModern';
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
import ServiceManagerDashboard from '../pages/ServiceManagerDashboard';
import RecordsDashboard from '../pages/RecordsDashboard';
import RecordDetailPage from '../pages/RecordDetailPage';
import TrackingPage from '../pages/TrackingPage';
import Login from '../pages/Login';
import '../styles/app.css';
import { ADMIN_MODULES } from '../utils/roles';
import AdminSidebar from './AdminSidebar';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminModule, setAdminModule] = useState(() => localStorage.getItem('admin_module') || 'admin');
  const navigate = useNavigate();
  const location = useLocation();

  const moduleKeyToPath = useMemo(() => {
    return {
      admin: '/admin',
      cro: '/cro',
      technician: '/technician',
      advisor: '/advisor',
      controller: '/controller',
      foreman: '/foreman',
      wrapup: '/wrapup',
      jockey: '/jockey',
      billing: '/billing',
      cashier: '/cashier',
      warehouse: '/warehouse',
      security_gate: '/security-gate',
      vehicle_handover: '/vehicle-handover',
      follow_up: '/follow-up',
      manager: '/manager',
      records: '/records'
    };
  }, []);

  const pathToModuleKey = useMemo(() => {
    const entries = Object.entries(moduleKeyToPath);
    return (pathname) => {
      const normalized = pathname || '/';
      const found = entries.find(([, path]) => normalized === path || normalized.startsWith(path + '/'));
      return found?.[0] || null;
    };
  }, [moduleKeyToPath]);

  const getDefaultPathForUser = useMemo(() => {
    return (u) => {
      if (!u) return '/login';
      if (u.role === 'admin') {
        const saved = localStorage.getItem('admin_module') || 'admin';
        return moduleKeyToPath[saved] || moduleKeyToPath.admin;
      }
      return moduleKeyToPath[u.role] || '/login';
    };
  }, [moduleKeyToPath]);

  useEffect(() => {
    // Load user from localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Keep admin module selector in sync with current route
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const key = pathToModuleKey(location.pathname) || 'admin';
    if (key !== adminModule) {
      setAdminModule(key);
      localStorage.setItem('admin_module', key);
    }
  }, [adminModule, location.pathname, pathToModuleKey, user]);

  const handleLogin = (userData) => {
    const user = {
      id: userData.id,
      username: userData.username,
      name: userData.name,
      role: userData.role,
      email: userData.email,
      location: userData.location || '',
      admin_id: userData.admin_id ?? null
    };
    localStorage.setItem('user', JSON.stringify(user));
    // Store admin password temporarily if admin login
    if (user.role === 'admin') {
      localStorage.setItem('admin_password', userData.password);
    }
    setUser(user);
    navigate(getDefaultPathForUser(user), { replace: true });
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('admin_password');
    navigate('/login', { replace: true });
  };

  // ALWAYS allow tracking page - no auth required, even while loading.
  // Exception: If user is admin/logged in, we want the main layout (sidebar), so let it fall through.
  if ((location.pathname === '/track' || location.pathname.startsWith('/track/')) && (!user || user.role !== 'admin')) {
    return <TrackingPage user={user} />;
  }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '18px', color: '#667eea' }}>Loading...</div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/track" element={<TrackingPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const isAdmin = user.role === 'admin';
  const allowModule = (moduleKey) => isAdmin || user.role === moduleKey;

  const modules = ADMIN_MODULES;
  const onAdminModuleChange = (e) => {
    const next = e.target.value;
    setAdminModule(next);
    localStorage.setItem('admin_module', next);
    navigate(moduleKeyToPath[next] || moduleKeyToPath.admin);
  };

  const AdminSwitcher = isAdmin ? null : null;

  const contentStyle = isAdmin ? { paddingTop: '0', paddingLeft: '220px', transition: 'padding-left 0.2s' } : undefined;
  const DefaultRedirect = <Navigate to={getDefaultPathForUser(user)} replace />;

  return (
    <div style={contentStyle}>
      {isAdmin && <AdminSidebar user={user} onLogout={handleLogout} />}
      <Routes>
        <Route path="/login" element={DefaultRedirect} />
        <Route path="/" element={DefaultRedirect} />

        <Route
          path="/admin"
          element={allowModule('admin') ? <AdminDashboard user={user} onLogout={handleLogout} /> : DefaultRedirect}
        />
        <Route
          path="/cro/:tab?"
          element={allowModule('cro') ? <CROModule user={user} onLogout={handleLogout} /> : DefaultRedirect}
        />
        <Route
          path="/technician"
          element={allowModule('technician') ? <TechnicianDashboard user={user} onLogout={handleLogout} /> : DefaultRedirect}
        />
        <Route
          path="/advisor"
          element={allowModule('advisor') ? <ServiceAdvisorDashboard user={user} onLogout={handleLogout} /> : DefaultRedirect}
        />
        <Route
          path="/controller"
          element={allowModule('controller') ? <JobControllerModern user={user} onLogout={handleLogout} /> : DefaultRedirect}
        />
        <Route
          path="/foreman"
          element={allowModule('foreman') ? <ForemanQCDashboard user={user} onLogout={handleLogout} /> : DefaultRedirect}
        />
        <Route
          path="/wrapup"
          element={allowModule('wrapup') ? <JobWrapupDashboard user={user} onLogout={handleLogout} /> : DefaultRedirect}
        />
        <Route
          path="/jockey"
          element={allowModule('jockey') ? <CarJockeyDashboard user={user} onLogout={handleLogout} /> : DefaultRedirect}
        />
        <Route
          path="/billing"
          element={allowModule('billing') ? <BillingDashboard user={user} onLogout={handleLogout} /> : DefaultRedirect}
        />
        <Route
          path="/cashier"
          element={allowModule('cashier') ? <CashierDashboard user={user} onLogout={handleLogout} /> : DefaultRedirect}
        />
        <Route
          path="/warehouse"
          element={allowModule('warehouse') ? <WarehouseDashboard user={user} onLogout={handleLogout} /> : DefaultRedirect}
        />
        <Route
          path="/security-gate"
          element={allowModule('security_gate') ? <SecurityGateDashboard user={user} onLogout={handleLogout} /> : DefaultRedirect}
        />
        <Route
          path="/vehicle-handover"
          element={(allowModule('vehicle_handover') || allowModule('cro')) ? <VehicleHandoverDashboard user={user} onLogout={handleLogout} /> : DefaultRedirect}
        />
        <Route
          path="/follow-up"
          element={allowModule('follow_up') ? <FollowUpDashboard user={user} onLogout={handleLogout} /> : DefaultRedirect}
        />
        <Route
          path="/manager"
          element={allowModule('manager') ? <ServiceManagerDashboard user={user} onLogout={handleLogout} /> : DefaultRedirect}
        />
        <Route
          path="/records"
          element={allowModule('records') ? <RecordsDashboard user={user} onLogout={handleLogout} /> : DefaultRedirect}
        />
        <Route
          path="/records/:id"
          element={allowModule('records') ? <RecordDetailPage user={user} onLogout={handleLogout} /> : DefaultRedirect}
        />

        {/* Public tracking page - accessible by anyone */}
        <Route path="/track" element={<TrackingPage user={user} />} />

        <Route path="*" element={DefaultRedirect} />
      </Routes>
    </div>
  );
}
