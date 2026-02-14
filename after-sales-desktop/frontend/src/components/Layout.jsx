import React from 'react';
import '../styles/enterprise-layout.css';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Layout({ children, onLogout, user }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current active path for highlighting
  const currentPath = location.pathname.replace('/', '') || 'dashboard';

  // Helper to check active state
  const isActive = (path) => currentPath === path || (path === 'dashboard' && currentPath === '');

  const handleNavClick = (view) => {
    navigate(`/${view}`);
  };

  const getInitials = (name) => {
    return name ? name.substring(0, 2).toUpperCase() : 'UR';
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-logo">
            <span>🛡️ Rapide</span>
          </div>
        </div>

        <div className="user-profile-section">
          <div className="user-profile-card">
            <div className="user-avatar">
              {getInitials(user?.name)}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name || 'User'}</span>
              <span className="user-role-badge">{user?.role?.toUpperCase() || 'STAFF'}</span>
            </div>
          </div>
        </div>
        
        <div className="nav-scroll-area">
          <nav className="nav-menu">
            <div className="nav-section-title">Main</div>
            <li className="nav-item">
              <button 
                className={`nav-link ${isActive('dashboard') ? 'active' : ''}`}
                onClick={() => handleNavClick('dashboard')}
              >
                <span className="nav-icon">📊</span>
                Dashboard
              </button>
            </li>

            <div className="nav-divider"></div>
            <div className="nav-section-title">Operations</div>

            <li className="nav-item">
              <button 
                className={`nav-link ${isActive('job-controller') ? 'active' : ''}`}
                onClick={() => handleNavClick('job-controller')}
              >
                <span className="nav-icon">�️</span>
                Job Control
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${isActive('cro') ? 'active' : ''}`}
                onClick={() => handleNavClick('cro')}
              >
                <span className="nav-icon">👨‍💼</span>
                 CRO
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${isActive('technician') ? 'active' : ''}`}
                onClick={() => handleNavClick('technician')}
              >
                <span className="nav-icon">🔧</span>
                Technician
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${isActive('warehouse') ? 'active' : ''}`}
                onClick={() => handleNavClick('warehouse')}
              >
                <span className="nav-icon">📦</span>
                Warehouse
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${isActive('quality-control') ? 'active' : ''}`}
                onClick={() => handleNavClick('quality-control')}
              >
                <span className="nav-icon">✅</span>
                Quality Control
              </button>
            </li>

            <div className="nav-divider"></div>
            <div className="nav-section-title">Finance</div>

            <li className="nav-item">
              <button 
                className={`nav-link ${isActive('billing') ? 'active' : ''}`}
                onClick={() => handleNavClick('billing')}
              >
                <span className="nav-icon">💰</span>
                Billing
              </button>
            </li>
             <li className="nav-item">
              <button 
                className={`nav-link ${isActive('cashier') ? 'active' : ''}`}
                onClick={() => handleNavClick('cashier')}
              >
                <span className="nav-icon">💵</span>
                Cashier
              </button>
            </li>

            <div className="nav-divider"></div>
            <div className="nav-section-title">Administration</div>
            
            <li className="nav-item">
              <button 
                className={`nav-link ${isActive('admin') ? 'active' : ''}`}
                onClick={() => handleNavClick('admin')}
              >
                <span className="nav-icon">⚙️</span>
                Admin
              </button>
            </li>
          </nav>
        </div>

        <div className="sidebar-footer">
            <button className="btn-logout" onClick={onLogout}>
              <span>Sign Out</span>
            </button>
        </div>
      </aside>
      
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
