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

export const EnterpriseCard = ({ title, subtitle, children, footer, className = '' }) => (
  <div className={`enterprise-card ${className}`}>
    {(title || subtitle) && (
      <div className="enterprise-card-header">
        <div>
          {title && <h3 className="enterprise-card-title">{title}</h3>}
          {subtitle && <p className="enterprise-card-subtitle">{subtitle}</p>}
        </div>
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
            <th key={idx}>{col.label}</th>
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
              {columns.map((col, colIdx) => (
                <td key={colIdx}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
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
    <span className="search-icon">🔍</span>
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

export const Modal = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="modal-header">
            <h3>{title}</h3>
          </div>
        )}
        <div className="modal-body">{children}</div>
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
