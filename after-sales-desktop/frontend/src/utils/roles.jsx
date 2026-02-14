export const ADMIN_MODULES = [
  { key: 'admin', label: 'Admin' },
  { key: 'cro', label: 'CRO' },
  { key: 'technician', label: 'Technician' },
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
  { key: 'manager', label: 'Service Manager' },
  { key: 'records', label: 'Records' }
];

export const PERSONNEL_ROLES = ADMIN_MODULES.filter(m => m.key !== 'admin').map(m => m.key);

export const ROLE_LABELS = ADMIN_MODULES.reduce((acc, m) => {
  acc[m.key] = m.label;
  return acc;
}, {});

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || role;
}
