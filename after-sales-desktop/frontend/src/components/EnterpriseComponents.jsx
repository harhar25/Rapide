import React from 'react';
import '../styles/enterprise-ui.css';

export const StatCard = ({ value, label, change, icon, trend = 'neutral' }) => (
  <div className="stat-card">
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
    {change && (
      <div className={`stat-change ${trend}`}>
        {trend === 'positive' ? '↑' : trend === 'negative' ? '↓' : '•'} {change}
      </div>
    )}
  </div>
);

export const EnterpriseCard = ({ title, subtitle, children, footer, actions, className = '' }) => (
  <div className={`enterprise-card ${className}`}>
    {(title || subtitle || actions) && (
      <div className="enterprise-card-header">
        <div>
          {title && <h3 className="enterprise-card-title">{title}</h3>}
          {subtitle && <p className="enterprise-card-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="enterprise-card-actions">{actions}</div>}
      </div>
    )}
    <div className="enterprise-card-body">{children}</div>
    {footer && <div className="enterprise-card-footer">{footer}</div>}
  </div>
);

export const StatusBadge = ({ status, children }) => {
  const statusClass = String(status || '').toLowerCase().replace(/[_\s]/g, '-');
  return (
    <span className={`status-badge ${statusClass}`}>
      {children || status}
    </span>
  );
};

export const EnterpriseTabs = ({ tabs, activeTab, onTabChange }) => (
  <div className="enterprise-tabs">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        className={`enterprise-tab ${activeTab === tab.id ? 'active' : ''}`}
        onClick={() => onTabChange(tab.id)}
      >
        {tab.icon && <span>{tab.icon}</span>}
        {tab.label}
      </button>
    ))}
  </div>
);

export const EnterpriseTable = ({ columns, data, onRowClick }) => (
  <div className="enterprise-table">
    <table>
      <thead>
        <tr>
          {columns.map((col, idx) => (
            <th key={idx}>{col.label || col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length}>
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-title">No data available</div>
                <div className="empty-state-description">There are no records to display</div>
              </div>
            </td>
          </tr>
        ) : (
          data.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map((col, colIdx) => {
                // Support both 'render' (legacy) and 'accessor' (new) patterns
                // render: (val, row) => component
                // accessor: (row) => component OR string key
                let cellContent;
                if (col.render) {
                    cellContent = col.render(row[col.key], row);
                } else if (typeof col.accessor === 'function') {
                    cellContent = col.accessor(row);
                } else if (typeof col.accessor === 'string') {
                    cellContent = row[col.accessor];
                } else {
                    cellContent = row[col.key];
                }

                return (
                    <td key={colIdx}>
                      {cellContent}
                    </td>
                );
              })}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export const FormGroup = ({ label, error, helper, children, required }) => (
  <div className="form-group">
    {label && (
      <label className="form-label">
        {label}
        {required && <span style={{ color: 'var(--color-error-500)' }}> *</span>}
      </label>
    )}
    {children}
    {error && <div className="form-error">⚠ {error}</div>}
    {helper && !error && <div className="form-helper">{helper}</div>}
  </div>
);

export const ActionBar = ({ leftActions, rightActions }) => (
  <div className="action-bar">
    <div className="action-bar-left">{leftActions}</div>
    <div className="action-bar-right">{rightActions}</div>
  </div>
);

export const SearchBar = ({ value, onChange, placeholder = 'Search...' }) => (
  <div className="search-bar">
    <input
      type="text"
      className="search-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

export const LoadingSpinner = ({ size = 20 }) => (
  <div className="spinner" style={{ width: size, height: size }} />
);

export const ProgressBar = ({ value, max = 100 }) => (
  <div className="progress-bar">
    <div className="progress-fill" style={{ width: `${(value / max) * 100}%` }} />
  </div>
);

export const Alert = ({ type = 'info', children }) => (
  <div className={`alert alert-${type}`}>
    <span>
      {type === 'success' && '✓'}
      {type === 'warning' && '⚠'}
      {type === 'error' && '✗'}
      {type === 'info' && 'ℹ'}
    </span>
    <div>{children}</div>
  </div>
);

export const Modal = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  if (!isOpen) return null;

  const maxWidths = {
    sm: '400px',
    md: '550px',
    lg: '850px',
    xl: '1100px',
    full: '95%'
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: maxWidths[size] || maxWidths.md, 
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div className="modal-header">
          {title && <h3>{title}</h3>}
          <button className="modal-close-btn" onClick={onClose} title="Close">×</button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto' }}>{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export const EmptyState = ({ icon = '📋', title, description, action }) => (
  <div className="empty-state">
    <div className="empty-state-icon">{icon}</div>
    <div className="empty-state-title">{title}</div>
    {description && <div className="empty-state-description">{description}</div>}
    {action && <div style={{ marginTop: 'var(--spacing-4)' }}>{action}</div>}
  </div>
);

export const Divider = ({ vertical = false }) => (
  <div className={vertical ? 'divider-vertical' : 'divider'} />
);

export const ModuleLayout = ({ title, description, icon, sidebar, children, actions, user, onLogout }) => (
  <div className="module-layout">
    <div className="module-top-nav" style={{ 
      position: 'sticky', 
      top: 0, 
      zIndex: 40, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '16px 24px', 
      background: 'white', 
      borderBottom: '1px solid #e5e7eb',
      width: '100%',
      marginBottom: '24px'
    }}>
      <div className="module-nav-content" style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
         <div className="module-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>
            {icon && (
              <span className="module-title-icon" style={{ 
                fontSize: '1.5rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: '#f3f4f6', 
                width: '40px', 
                height: '40px', 
                borderRadius: '8px', 
                color: '#4b5563' 
              }}>{icon}</span>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span>{title}</span>
              {description && <span className="module-description" style={{ fontSize: '0.875rem', fontWeight: 400, color: '#6b7280' }}>{description}</span>}
            </div>
         </div>
      </div>
      
      <div className="module-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
         {actions}
         
         {(user || onLogout) && (
            <>
              <div style={{ width: '1px', height: '24px', background: '#e5e7eb', margin: '0 8px' }} />
              
              {user && (
                <div className="module-user-info" style={{ textAlign: 'right' }}>
                   {user.role && <div className="module-user-role" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{user.role}</div>}
                   <div className="module-user-name" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{user.name}</div>
                </div>
              )}
              
              {onLogout && (
                 <button 
                    onClick={onLogout} 
                    className="btn-enterprise btn-danger btn-sm"
                    title="Sign Out"
                    style={{ padding: '6px 12px', fontSize: '0.875rem' }}
                  >
                    Sign Out
                 </button>
              )}
            </>
         )}
      </div>
    </div>

    <div className="module-content" style={{ display: 'flex', padding: '0 24px 24px' }}>
      {sidebar && <div className="module-sidebar" style={{ width: '280px', flexShrink: 0, marginRight: '24px' }}>{sidebar}</div>}
      <main className="module-body" style={{ flex: 1, minWidth: 0 }}>{children}</main>
    </div>
  </div>
);

export const EnterpriseButton = ({ onClick, children, variant = 'primary', disabled = false, className = '', type = 'button', style = {} }) => (
  <button
    type={type}
    className={`btn-enterprise btn-${variant} ${className}`}
    onClick={onClick}
    disabled={disabled}
    style={style}
  >
    {children}
  </button>
);

export const EnterpriseActionToolbar = ({ children }) => (
  <div className="enterprise-action-toolbar" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
    {children}
  </div>
);

export const EnterpriseCheckbox = ({ label, checked, onChange, disabled }) => (
    <label className={`enterprise-checkbox ${disabled ? 'disabled' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: disabled ? 'not-allowed' : 'pointer' }}>
        <input 
            type="checkbox" 
            checked={checked} 
            onChange={(e) => onChange(e.target.checked)} 
            disabled={disabled}
            style={{ width: 'auto', margin: 0 }}
        />
        <span className="checkbox-label">{label}</span>
    </label>
);

export const EnterpriseInput =React.forwardRef(({ className = '', ...props }, ref) => (
  <input ref={ref} className={`form-input ${className}`} {...props} />
));

export const EnterpriseFormGroup = FormGroup;

