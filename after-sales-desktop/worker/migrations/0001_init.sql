PRAGMA foreign_keys = ON;

-- Core auth/users
CREATE TABLE IF NOT EXISTS personnel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cro',
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_no TEXT NOT NULL UNIQUE,
  plate_no TEXT UNIQUE,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  engine_no TEXT,
  chassis_no TEXT,
  customer_type TEXT NOT NULL DEFAULT 'regular',
  address TEXT,
  city TEXT,
  email TEXT,
  service_interval_days INTEGER DEFAULT 10000,
  last_service_date TEXT,
  registration_date TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'active'
);

-- Technicians / Advisors
CREATE TABLE IF NOT EXISTS technicians (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  employee_id TEXT NOT NULL UNIQUE,
  specialization TEXT,
  contact_no TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  hire_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS service_advisors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  employee_id TEXT NOT NULL UNIQUE,
  contact_no TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  hire_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Scheduling & Service Orders
CREATE TABLE IF NOT EXISTS scheduling_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  bay_id INTEGER,
  technician_id INTEGER,
  advisor_id INTEGER,
  service_type TEXT NOT NULL DEFAULT 'PMS',
  status TEXT NOT NULL DEFAULT 'scheduled',
  priority TEXT NOT NULL DEFAULT 'normal',
  estimated_duration_hours REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  UNIQUE(bay_id, scheduled_date, scheduled_time),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS service_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scheduling_order_id INTEGER,
  customer_id INTEGER NOT NULL,
  vehicle_plate_no TEXT,
  service_type TEXT,
  check_in_time TEXT,
  estimated_completion_time TEXT,
  actual_completion_time TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  advisor_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Technician work assignments (used by Technician Dashboard)
CREATE TABLE IF NOT EXISTS technician_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_order_id INTEGER NOT NULL,
  technician_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'assigned',
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  clock_in_time TEXT,
  clock_out_time TEXT,
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (service_order_id) REFERENCES service_orders(id)
);

CREATE TABLE IF NOT EXISTS contact_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  contact_type TEXT NOT NULL,
  attempt_date TEXT,
  status TEXT NOT NULL DEFAULT 'attempted',
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- PMS due list view
CREATE VIEW IF NOT EXISTS pms_due_list AS
SELECT
  c.id,
  c.name,
  c.contact_no,
  c.plate_no,
  c.vehicle_model,
  c.last_service_date,
  CAST((julianday('now') - julianday(COALESCE(c.last_service_date, date('now', '-365 day')))) AS INTEGER) AS days_since_service
FROM customers c
WHERE c.status = 'active';

-- ==================== BILLING ====================
CREATE TABLE IF NOT EXISTS billing_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_order_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  labor_hours REAL NOT NULL DEFAULT 0,
  labor_rate REAL NOT NULL DEFAULT 0,
  materials_cost REAL NOT NULL DEFAULT 0,
  parts_cost REAL NOT NULL DEFAULT 0,
  parking_cost REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  issued_at TEXT,
  due_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (service_order_id) REFERENCES service_orders(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS billing_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  payment_amount REAL NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  reference_number TEXT,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (invoice_id) REFERENCES billing_invoices(id)
);

-- ==================== CASHIER ====================
CREATE TABLE IF NOT EXISTS cashier_drawers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cashier_id INTEGER NOT NULL,
  opening_balance REAL NOT NULL DEFAULT 0,
  opening_time TEXT NOT NULL DEFAULT (datetime('now')),
  closing_time TEXT,
  cash_counted REAL,
  closing_balance REAL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open'
);

-- ==================== SECURITY GATE ====================
CREATE TABLE IF NOT EXISTS security_gate_access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_order_id INTEGER,
  vehicle_plate_no TEXT NOT NULL,
  customer_name TEXT,
  access_type TEXT NOT NULL,
  gate_operator_id INTEGER,
  authorized INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS security_gate_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_order_id INTEGER,
  vehicle_plate_no TEXT NOT NULL,
  customer_name TEXT,
  customer_id INTEGER,
  issued_by INTEGER,
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  expiry_at TEXT,
  badge_type TEXT NOT NULL DEFAULT 'vehicle',
  status TEXT NOT NULL DEFAULT 'active',
  scan_count INTEGER NOT NULL DEFAULT 0,
  revoked_at TEXT
);

-- ==================== VEHICLE HANDOVER ====================
CREATE TABLE IF NOT EXISTS vehicle_handovers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_order_id INTEGER,
  job_wrapup_id INTEGER,
  handover_date TEXT NOT NULL DEFAULT (date('now')),
  technician_id INTEGER,
  customer_id INTEGER,
  inspection_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  vehicle_cleanliness TEXT,
  fuel_level_final TEXT,
  mileage_final TEXT,
  overall_condition TEXT,
  all_items_returned INTEGER,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS handover_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  handover_id INTEGER NOT NULL,
  item_type TEXT NOT NULL,
  item_description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  condition_before TEXT,
  condition_after TEXT,
  item_verified INTEGER NOT NULL DEFAULT 0,
  verified_by INTEGER,
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (handover_id) REFERENCES vehicle_handovers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS handover_signatures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  handover_id INTEGER NOT NULL,
  signatory_type TEXT NOT NULL,
  signatory_name TEXT NOT NULL,
  signatory_role TEXT,
  printed_name TEXT,
  signature_image TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (handover_id) REFERENCES vehicle_handovers(id) ON DELETE CASCADE
);

-- ==================== FOREMAN QC ====================
CREATE TABLE IF NOT EXISTS qc_inspections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_order_id INTEGER NOT NULL,
  foreman_id INTEGER,
  inspection_date TEXT NOT NULL,
  exterior_condition TEXT,
  engine_condition TEXT,
  interior_cleanliness TEXT,
  parts_installed TEXT,
  fluid_levels_ok INTEGER,
  electrical_systems_ok INTEGER,
  safety_features_ok INTEGER,
  inspection_notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  failed_items TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS qc_road_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qc_inspection_id INTEGER NOT NULL,
  service_order_id INTEGER NOT NULL,
  road_test_date TEXT NOT NULL,
  tested_by INTEGER,
  test_distance_km REAL,
  engine_sound TEXT,
  acceleration_smooth INTEGER,
  braking_effective INTEGER,
  steering_responsive INTEGER,
  electrical_functions_ok INTEGER,
  air_conditioning_ok INTEGER,
  overall_performance TEXT,
  road_test_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (qc_inspection_id) REFERENCES qc_inspections(id) ON DELETE CASCADE
);

-- ==================== CAR JOCKEY ====================
CREATE TABLE IF NOT EXISTS car_jockey_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_order_id INTEGER NOT NULL,
  jockey_id INTEGER,
  movement_type TEXT NOT NULL,
  from_location TEXT,
  to_location TEXT,
  reason TEXT,
  vehicle_condition_start TEXT,
  fuel_start REAL,
  mileage_start REAL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  vehicle_condition_end TEXT,
  fuel_end REAL,
  mileage_end REAL,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS car_jockey_parking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_order_id INTEGER NOT NULL,
  vehicle_movement_id INTEGER,
  parking_slot TEXT,
  parking_zone TEXT,
  parking_level INTEGER,
  ground_condition TEXT,
  parking_fee REAL,
  parked_at TEXT NOT NULL DEFAULT (datetime('now')),
  released_at TEXT,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS car_jockey_parts_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_order_id INTEGER NOT NULL,
  requested_by INTEGER,
  document_data TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==================== JOB CONTROLLER ====================
CREATE TABLE IF NOT EXISTS job_controller_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_order_id INTEGER NOT NULL,
  technician_id INTEGER NOT NULL,
  assigned_by TEXT,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  clock_in_time TEXT,
  clock_out_time TEXT,
  labor_hours REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'assigned'
);

-- ==================== JOB WRAP-UP ====================
CREATE TABLE IF NOT EXISTS job_wrapups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_order_id INTEGER NOT NULL,
  job_controller_id INTEGER,
  technician_id INTEGER,
  qc_inspection_id INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  clock_out_time TEXT,
  labor_hours REAL DEFAULT 0,
  checklist_items TEXT,
  materials_returned INTEGER DEFAULT 0,
  tools_returned INTEGER DEFAULT 0,
  vehicle_condition TEXT,
  quality_passed INTEGER,
  returned_to_sa_at TEXT
);

-- ==================== FOLLOW UP ====================
CREATE TABLE IF NOT EXISTS followups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_order_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  followup_date TEXT NOT NULL,
  contact_method TEXT NOT NULL,
  scheduled_by INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_by INTEGER,
  contact_person_name TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS followup_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  followup_id INTEGER NOT NULL,
  overall_experience INTEGER,
  would_recommend TEXT,
  comments TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (followup_id) REFERENCES followups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS followup_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  followup_id INTEGER NOT NULL,
  issue_category TEXT,
  issue_description TEXT,
  severity TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolution_type TEXT,
  resolution_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  FOREIGN KEY (followup_id) REFERENCES followups(id) ON DELETE CASCADE
);

-- ==================== GATEPASS ====================
CREATE TABLE IF NOT EXISTS gatepasses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_order_id INTEGER,
  customer_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gatepass_signatures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gatepass_id INTEGER NOT NULL,
  signature_type TEXT NOT NULL,
  signed_by INTEGER,
  signed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (gatepass_id) REFERENCES gatepasses(id) ON DELETE CASCADE
);

-- ==================== SERVICE ADVISOR (CIS/VRC + docs) ====================
CREATE TABLE IF NOT EXISTS customer_info_sheets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  service_order_id INTEGER,
  name TEXT NOT NULL,
  contact_no TEXT NOT NULL,
  email TEXT,
  address TEXT,
  vehicle_plate_no TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  engine_no TEXT,
  chassis_no TEXT,
  mileage_in INTEGER,
  service_type TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS vehicle_report_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_order_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  mileage_in INTEGER,
  mileage_out INTEGER,
  exterior_condition TEXT,
  interior_condition TEXT,
  checklist_1_engine_starts TEXT,
  checklist_2_idle_smooth TEXT,
  checklist_3_acceleration TEXT,
  checklist_4_brakes TEXT,
  checklist_5_steering TEXT,
  checklist_6_lights TEXT,
  checklist_7_air_con TEXT,
  checklist_8_wipers TEXT,
  checklist_9_horn TEXT,
  checklist_10_handbrake TEXT,
  additional_findings TEXT,
  settings_restored INTEGER DEFAULT 0,
  diagnosis_completed_by TEXT,
  diagnosis_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==================== WAREHOUSE (inventory + history) ====================
CREATE TABLE IF NOT EXISTS warehouse_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_code TEXT UNIQUE,
  product_name TEXT NOT NULL,
  category TEXT,
  unit_price REAL NOT NULL DEFAULT 0,
  quantity_in_stock INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 0,
  supplier TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS warehouse_inventory_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  performed_by TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES warehouse_products(id)
);

-- Picklists (optional, but referenced by existing warehouse endpoints)
CREATE TABLE IF NOT EXISTS warehouse_picklists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  picklist_number TEXT NOT NULL UNIQUE,
  request_date TEXT NOT NULL,
  job_order_number TEXT NOT NULL,
  customer TEXT NOT NULL,
  vehicle TEXT,
  priority_level TEXT NOT NULL DEFAULT 'normal',
  requested_by TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS warehouse_picklist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  picklist_id INTEGER NOT NULL,
  item_id INTEGER,
  product_code TEXT,
  description TEXT,
  quantity_required INTEGER NOT NULL DEFAULT 1,
  quantity_picked INTEGER NOT NULL DEFAULT 0,
  bin_location TEXT,
  picked_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (picklist_id) REFERENCES warehouse_picklists(id) ON DELETE CASCADE
);
