-- Migration to add 'records' role to personnel table
PRAGMA foreign_keys = OFF;

CREATE TABLE personnel_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cro' CHECK(role IN ('admin', 'cro', 'technician', 'warehouse', 'manager', 'advisor', 'controller', 'foreman', 'wrapup', 'jockey', 'billing', 'cashier', 'security_gate', 'vehicle_handover', 'follow_up', 'records')),
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO personnel_new (id, username, password, name, role, email, status, created_at, updated_at) SELECT id, username, password, name, role, email, status, created_at, updated_at FROM personnel;

DROP TABLE personnel;

ALTER TABLE personnel_new RENAME TO personnel;

PRAGMA foreign_keys = ON;
