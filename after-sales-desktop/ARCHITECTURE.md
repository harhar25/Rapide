# System Architecture & Data Flow

## Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   ELECTRON DESKTOP APP                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           React Frontend (UI Layer)                   │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  CRO Module                                    │  │   │
│  │  │  ├─ Tab 1: PMS Due List                        │  │   │
│  │  │  ├─ Tab 2: Appointment Setting                 │  │   │
│  │  │  └─ Tab 3: Walk-In Registration                │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                        │   │
│  │  Components: PMSDueList, AppointmentSetting,          │   │
│  │             WalkInRegistration, Layout                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↕
                    HTTP/REST APIs
                           ↕
┌─────────────────────────────────────────────────────────────┐
│              FLASK BACKEND (API Layer)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Routes:                                             │   │
│  │  ├─ /api/customer/pms-due-list                       │   │
│  │  ├─ /api/customer/search                             │   │
│  │  ├─ /api/customer/register                           │   │
│  │  ├─ /api/scheduler/check-availability                │   │
│  │  ├─ /api/scheduler/create-order                      │   │
│  │  └─ /api/scheduler/log-contact-attempt               │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Services (Business Logic):                          │   │
│  │  ├─ CustomerService                                  │   │
│  │  └─ SchedulingService                                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↕
                      SQL Queries
                           ↕
┌─────────────────────────────────────────────────────────────┐
│         MYSQL DATABASE (Data Layer - XAMPP)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Tables:                                             │   │
│  │  ├─ customers (Customer data)                        │   │
│  │  ├─ technicians (Service staff)                      │   │
│  │  ├─ service_advisors (Advisors)                      │   │
│  │  ├─ service_bays (Bays)                              │   │
│  │  ├─ scheduling_orders (Appointments)                 │   │
│  │  ├─ contact_attempts (Logs)                          │   │
│  │  └─ audit_logs (Audit trail)                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow - PMS Due List

```
UI (PMS Due List Tab)
    │
    ├─→ User clicks "Refresh"
    │
    ├─→ GET /api/customer/pms-due-list
    │
    └─→ Flask Backend
        ├─→ CustomerService.get_pms_due_customers()
        │
        ├─→ Execute SQL Query:
        │   SELECT c.id, c.name, c.plate_no...
        │   FROM customers c
        │   WHERE DATEDIFF(CURDATE(), c.last_service_date) >= c.service_interval_days
        │
        └─→ Return JSON response
            │
            └─→ Display in table on UI
```

## Data Flow - Appointment Setting

```
UI (Appointment Tab)
    │
    ├─→ User enters: Date, Time
    │
    ├─→ POST /api/scheduler/check-availability
    │
    └─→ Flask Backend
        ├─→ SchedulingService.check_availability()
        │
        ├─→ Query available bays:
        │   SELECT * FROM service_bays
        │   WHERE bay_id NOT IN (scheduled slots)
        │
        ├─→ Query available technicians:
        │   SELECT * FROM technicians
        │   WHERE technician_id NOT IN (scheduled slots)
        │
        ├─→ Query available advisors:
        │   SELECT * FROM service_advisors
        │   WHERE advisor_id NOT IN (scheduled slots)
        │
        └─→ Return dropdowns to UI
            │
            └─→ User selects and submits
                ├─→ POST /api/scheduler/create-order
                │
                └─→ INSERT scheduling_order
                    └─→ Confirmation message
```

## Data Flow - Walk-In Registration

```
UI (Walk-In Tab)
    │
    ├─→ Step 1: Search
    │   ├─→ Select search type (plate/name/contact)
    │   ├─→ POST /api/customer/search
    │   │
    │   └─→ Display results
    │       ├─→ Select existing customer OR
    │       └─→ Click "Register New"
    │
    └─→ Step 2: Register (if new)
        ├─→ Fill CIS form
        ├─→ POST /api/customer/register
        │
        └─→ Flask Backend
            ├─→ CustomerService.create_customer()
            │
            ├─→ INSERT INTO customers (...)
            │
            └─→ Return customer_id
                └─→ Success message
```

## Database Entity Relationships

```
┌──────────────┐
│  customers   │
├──────────────┤
│ id (PK)      │
│ name         │
│ plate_no     │
│ contact_no   │
│ vehicle_*    │
└──────┬───────┘
       │ (1:N)
       ├─→ scheduling_orders
       │   ├─→ customer_id (FK)
       │   ├─→ bay_id (FK)
       │   ├─→ technician_id (FK)
       │   ├─→ advisor_id (FK)
       │   └─→ status
       │
       ├─→ service_orders
       │   └─→ customer_id (FK)
       │
       ├─→ contact_attempts
       │   └─→ customer_id (FK)
       │
       └─→ audit_logs
           └─→ customer_id (FK)

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ technicians  │     │service_bays  │     │ service_     │
├──────────────┤     ├──────────────┤     │  advisors    │
│ id (PK)      │     │ id (PK)      │     ├──────────────┤
│ name         │     │ bay_name     │     │ id (PK)      │
│ specializ.   │     │ status       │     │ name         │
└──────────────┘     └──────────────┘     └──────────────┘
       ↑                    ↑                     ↑
       │                    │                     │
       └────→ scheduling_orders ←─────────────────┘
             └─→ service_orders
```

## API Request/Response Examples

### 1. Get PMS Due List
```
REQUEST:
GET /api/customer/pms-due-list

RESPONSE:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Mr. Reyes",
      "plate_no": "ABC-1234",
      "contact_no": "09175551001",
      "vehicle_model": "Toyota Camry",
      "days_since_service": 90
    }
  ],
  "count": 4
}
```

### 2. Check Availability
```
REQUEST:
POST /api/scheduler/check-availability
{
  "date": "2025-12-20",
  "time": "09:00:00"
}

RESPONSE:
{
  "success": true,
  "data": {
    "available_bays": [
      {"id": 1, "bay_name": "Bay A", "capacity": 1},
      {"id": 2, "bay_name": "Bay B", "capacity": 1}
    ],
    "available_technicians": [
      {"id": 1, "name": "Juan de la Cruz", "specialization": "Engine"},
      {"id": 2, "name": "Maria Santos", "specialization": "AC"}
    ],
    "available_advisors": [
      {"id": 1, "name": "Ana Cruz"},
      {"id": 2, "name": "Luis Morales"}
    ]
  }
}
```

### 3. Create Scheduling Order
```
REQUEST:
POST /api/scheduler/create-order
{
  "customer_id": 1,
  "scheduled_date": "2025-12-20",
  "scheduled_time": "09:00:00",
  "bay_id": 1,
  "technician_id": 1,
  "advisor_id": 1,
  "service_type": "PMS",
  "created_by": "CRO001"
}

RESPONSE:
{
  "success": true,
  "order_id": 101,
  "message": "Scheduling order created"
}
```

## User Interface Layout

```
┌─────────────┬──────────────────────────────────────────┐
│             │                                          │
│  SIDEBAR    │         HEADER                          │
│  ─────────  │      After-Sales Service System         │
│             │                                          │
│ Dashboard   ├──────────────────────────────────────────┤
│ CRO Module  │  📋 CRO Module - Customer Appt & Sched  │
│ Service Adv │  Manage PMS, appointments, walk-ins     │
│ Technician  ├──────────────────────────────────────────┤
│ Quality Chk │                                          │
│ Billing     │  Tabs:                                   │
│ ........    │  [1.1 PMS Due] [1.2 Appt] [1.3 Walk-In]│
│             │                                          │
│ Logout      │  ┌─────────────────────────────────────┐│
│             │  │ Tab Content Area                    ││
│             │  │                                     ││
│             │  │ (Dynamic based on selected tab)     ││
│             │  │                                     ││
│             │  └─────────────────────────────────────┘│
│             │                                          │
└─────────────┴──────────────────────────────────────────┘
```

## Technology Stack Summary

```
FRONTEND
├─ Framework: Electron (Desktop)
├─ UI: React 18
├─ Styling: Vanilla CSS
├─ HTTP Client: Fetch API
└─ State: React Hooks

BACKEND
├─ Framework: Flask 2.3
├─ Language: Python 3.8+
├─ Database Driver: mysql-connector
├─ CORS: Flask-CORS
└─ Config: python-dotenv

DATABASE
├─ System: MySQL 5.7+
├─ Server: XAMPP
├─ Tables: 7 main tables
├─ Views: 2 views
└─ Sample Data: Yes

DEPLOYMENT
├─ Server: Electron
├─ Platform: Windows/Mac/Linux
├─ Building: electron-builder
└─ Type: Standalone executable
```

## Development Workflow

```
PHASE 1: CRO Module ✅
├─ Database design
├─ Backend APIs
├─ Frontend UI
└─ Testing

PHASE 2-4: Additional Interfaces
├─ Service Advisor Module
├─ Job Controller
├─ Technician Module
├─ Quality Check
├─ Billing & Payment
└─ Vehicle Management

PHASE 5: Production
├─ Authentication
├─ Reporting
├─ Analytics
├─ Performance optimization
└─ Deployment
```

---

This architecture ensures:
- ✅ Clean separation of concerns
- ✅ Scalability for 13 interfaces
- ✅ Easy testing and debugging
- ✅ Professional deployment
- ✅ Real-world reliability
