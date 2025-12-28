import React from 'react';
import '../styles/layout.css';

export default function Layout({ children, onLogout, user, activeView, onNavigate }) {
  const [currentView, setCurrentView] = React.useState(activeView || 'dashboard');

  const handleNavClick = (view) => {
    setCurrentView(view);
    if (onNavigate) {
      onNavigate(view);
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="logo"><em>Rapide</em></div>
        <div className="user-badge">
          <span className="role-badge">{user?.role.toUpperCase()}</span>
          <p className="user-name">{user?.name}</p>
        </div>
        <nav className="nav-menu">
          <li className="nav-item">
            <button 
              className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavClick('dashboard')}
            >
              📊 Dashboard
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${currentView === 'customers' ? 'active' : ''}`}
              onClick={() => handleNavClick('customers')}
            >
              👥 Customers
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${currentView === 'scheduling' ? 'active' : ''}`}
              onClick={() => handleNavClick('scheduling')}
            >
              📅 Scheduling
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${currentView === 'contacts' ? 'active' : ''}`}
              onClick={() => handleNavClick('contacts')}
            >
              📞 Contacts
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${currentView === 'reports' ? 'active' : ''}`}
              onClick={() => handleNavClick('reports')}
            >
              📈 Reports
            </button>
          </li>
        </nav>
        <div className="sidebar-footer">
          {user?.role !== 'admin' && (
            <button className="btn btn-outline" onClick={onLogout}>
              Sign Out
            </button>
          )}
        </div>
      </aside>

      <div className="main-content">
        <header className="header">
          <h1><em>Rapide</em></h1>
          <div className="header-right">
            <span className="user-info">👤 {user?.name} · {user?.role}</span>
          </div>
        </header>
        <div className="content-area">
          {children}
        </div>
        <footer className="app-footer">
          <p>© 2025 <em>Rapide</em> After-Sales Management System. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
