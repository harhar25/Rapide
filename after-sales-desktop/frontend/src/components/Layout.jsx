import React from 'react';
import '../styles/layout.css';

export default function Layout({ children, onLogout, user }) {
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
            <button className="nav-link">Dashboard</button>
          </li>
          <li className="nav-item">
            <button className="nav-link">Customers</button>
          </li>
          <li className="nav-item">
            <button className="nav-link">Scheduling</button>
          </li>
          <li className="nav-item">
            <button className="nav-link">Contacts</button>
          </li>
          <li className="nav-item">
            <button className="nav-link">Reports</button>
          </li>
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-outline" onClick={onLogout}>
            Sign Out
          </button>
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
      </div>
    </div>
  );
}
