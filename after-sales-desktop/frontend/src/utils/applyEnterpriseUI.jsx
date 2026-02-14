// Utility script to help apply enterprise UI patterns
// Common imports to add to all dashboards

export const ENTERPRISE_IMPORTS = `import '../styles/enterprise-ui.css';
import '../styles/dashboard-common.css';
import { StatCard, EnterpriseCard, StatusBadge, EnterpriseTabs, ActionBar, LoadingSpinner, EmptyState } from '../components/EnterpriseComponents';`;

// Common button class mappings
export const BUTTON_CLASS_MAP = {
  'btn-action': 'btn-enterprise btn-primary btn-sm',
  'btn-start': 'btn-enterprise btn-success btn-sm',
  'btn-complete': 'btn-enterprise btn-success btn-sm',
  'btn-submit': 'btn-enterprise btn-primary',
  'btn-cancel': 'btn-enterprise btn-secondary',
  'btn-delete': 'btn-enterprise btn-danger btn-sm',
  'btn-edit': 'btn-enterprise btn-secondary btn-sm',
  'btn-view': 'btn-enterprise btn-secondary btn-sm',
  'btn-approve': 'btn-enterprise btn-success btn-sm',
  'btn-reject': 'btn-enterprise btn-danger btn-sm',
  'btn-park': 'btn-enterprise btn-primary btn-sm',
  'btn-release': 'btn-enterprise btn-success btn-sm',
  'logout-btn': 'btn-enterprise btn-secondary btn-sm',
  'action-btn': 'btn-enterprise btn-primary btn-sm',
  'primary-btn': 'btn-enterprise btn-primary',
  'secondary-btn': 'btn-enterprise btn-secondary'
};

// Dashboard header template
export const DASHBOARD_HEADER_TEMPLATE = (icon, title, subtitle) => `
<div className="dashboard-header">
  <div className="dashboard-header-content">
    <div className="dashboard-title-section">
      <h1 className="dashboard-title">
        <span className="dashboard-title-icon">${icon}</span>
        ${title}
      </h1>
      <p className="dashboard-subtitle">${subtitle}</p>
    </div>
    <div className="dashboard-actions">
      {/* Action buttons here */}
    </div>
  </div>
</div>
`;
