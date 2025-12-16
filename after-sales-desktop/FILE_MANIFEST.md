# File Manifest - After-Sales Desktop Application

## Project Structure Map

### Root Directory Files
```
after-sales-desktop/
├── README.md                        # Project overview
├── SETUP.md                         # Detailed setup instructions
├── QUICKSTART.md                    # Quick start guide
├── PROJECT_STATUS.md                # Development status
├── PROJECT_OVERVIEW.md              # Complete overview
├── ARCHITECTURE.md                  # System architecture & data flow
├── FILE_MANIFEST.md                 # This file
└── .gitignore                       # Git ignore rules
```

---

## Backend Files (Python Flask)

### Configuration Files
```
backend/
├── config.py                        # App configuration (DB settings, env)
├── database.py                      # MySQL connection handler
├── requirements.txt                 # Python package dependencies
└── run.py                          # Server entry point (main.py)
```

**Contents**:
- `config.py`: Defines DevelopmentConfig, ProductionConfig, TestingConfig
- `database.py`: Database class with connect(), execute_query(), execute_update()
- `requirements.txt`: Flask==2.3.3, mysql-connector-python==8.0.33, etc.
- `run.py`: Starts Flask server on port 5000

### Application Package
```
backend/app/
├── __init__.py                      # Flask app factory
├── routes/
│   └── __init__.py                 # API blueprint definitions (7 endpoints)
├── services/
│   ├── __init__.py                 # Service layer exports
│   ├── customer_service.py         # Customer business logic
│   └── scheduling_service.py       # Scheduling business logic
└── models/
    └── __init__.py                 # Model exports
```

**Details**:
- `__init__.py`: create_app() factory function, CORS setup, blueprint registration
- `routes/__init__.py`: 7 routes split into customer_bp and scheduler_bp
- `services/customer_service.py`: 6 methods for customer operations
- `services/scheduling_service.py`: 5 methods for scheduling operations

---

## Frontend Files (Electron + React)

### Configuration & Build
```
frontend/
├── package.json                     # NPM dependencies & scripts
├── preload.js                       # Electron preload script (security)
├── public/
│   ├── index.html                  # HTML shell
│   └── styles.css                  # Global CSS (1000+ lines)
└── src/
    └── main.js                     # Electron main process
```

**Details**:
- `package.json`: 12 dependencies, 4 dev dependencies, npm scripts
- `preload.js`: Context bridge for secure IPC communication
- `public/index.html`: App container with root div
- `public/styles.css`: Complete UI system (buttons, forms, tables, etc.)
- `src/main.js`: Electron window creation, menu, dev tools

### React Components
```
frontend/src/
├── components/
│   ├── App.jsx                      # Main app component + login
│   ├── Layout.jsx                  # Sidebar + header wrapper
│   ├── PMSDueList.jsx              # PMS due list display + contact modal
│   ├── AppointmentSetting.jsx      # Appointment scheduling form
│   └── WalkInRegistration.jsx      # Walk-in registration workflow
│
├── pages/
│   └── CROModule.jsx               # CRO module tab container
│
├── services/
│   └── (Placeholder for API services)
│
├── styles/
│   ├── index.css                   # Global styles (forms, tables, alerts)
│   ├── layout.css                  # Sidebar, header, responsive
│   ├── cro-module.css              # Tab interface, sections
│   └── app.css                     # App container styles
│
└── index.js                         # React entry point
```

**Component Details**:
- `App.jsx`: Login page, authentication state, page routing
- `Layout.jsx`: Sidebar navigation (6 modules), logout button
- `PMSDueList.jsx`: Table with customers, contact modal
- `AppointmentSetting.jsx`: Form with availability checking
- `WalkInRegistration.jsx`: 3-step registration workflow
- `CROModule.jsx`: Tab container for 3 sections

---

## Database Files (MySQL)

```
database/
└── schema.sql                       # Complete database schema (1000+ lines)
```

**Schema Contents**:
- `customers`: 11 fields (id, name, contact_no, plate_no, vehicle_*, etc.)
- `technicians`: 7 fields (id, name, employee_id, specialization, etc.)
- `service_advisors`: 6 fields
- `service_bays`: 5 fields
- `scheduling_orders`: 12 fields
- `contact_attempts`: 8 fields
- `service_orders`: 8 fields
- `audit_logs`: 7 fields
- **Views**: pms_due_list, available_resources
- **Sample Data**: 4 customers, 4 technicians, 3 advisors, 4 bays, 3 contact attempts, 2 orders

---

## File Summary by Category

### Python Backend (11 files)
| File | Purpose | Lines |
|------|---------|-------|
| config.py | Configuration | 45 |
| database.py | DB connection | 65 |
| run.py | Server launcher | 20 |
| app/__init__.py | Flask factory | 40 |
| routes/__init__.py | API endpoints | 90 |
| services/customer_service.py | Customer logic | 85 |
| services/scheduling_service.py | Scheduling logic | 120 |
| requirements.txt | Dependencies | 4 |
| .gitignore | Git ignore | 12 |
| README.md | Project info | 40 |
| SETUP.md | Setup guide | 150 |

### Frontend React (12 files)
| File | Purpose | Lines |
|------|---------|-------|
| package.json | Dependencies | 35 |
| preload.js | Electron security | 7 |
| public/index.html | HTML shell | 10 |
| public/styles.css | Core CSS | 450 |
| src/main.js | Electron main | 45 |
| src/index.js | React entry | 5 |
| src/index.css | Global styles | 300 |
| components/App.jsx | Main app | 90 |
| components/Layout.jsx | Sidebar | 45 |
| components/PMSDueList.jsx | PMS list | 85 |
| components/AppointmentSetting.jsx | Appointments | 140 |
| components/WalkInRegistration.jsx | Registration | 220 |

### Database (1 file)
| File | Purpose | Lines |
|------|---------|-------|
| database/schema.sql | MySQL schema | 250+ |

### Documentation (6 files)
| File | Purpose | Lines |
|------|---------|-------|
| README.md | Overview | 30 |
| SETUP.md | Setup steps | 150 |
| QUICKSTART.md | Quick start | 100 |
| PROJECT_STATUS.md | Development status | 150 |
| PROJECT_OVERVIEW.md | Complete overview | 350 |
| ARCHITECTURE.md | System architecture | 400 |

---

## Total Project Statistics

```
Backend:
  - Python files: 5
  - Config/Setup files: 4
  - Lines of code (backend): ~400

Frontend:
  - React components: 5
  - CSS files: 4
  - JavaScript files: 2
  - Config files: 1
  - Lines of code (frontend): ~600

Database:
  - SQL files: 1
  - Tables: 7
  - Views: 2
  - Lines of code: ~250

Documentation:
  - Markdown files: 6
  - Lines: ~1,200

TOTAL:
  - Files: 34
  - Lines of code: ~2,450
  - Documentation: ~1,200
  - Total lines: ~3,650
```

---

## Key File Locations

### To Start Backend
```
cd backend
python run.py
```

### To Start Frontend
```
cd frontend
npm start
```

### To Setup Database
```
mysql -u root < database/schema.sql
```

### To View System Architecture
```
Read: ARCHITECTURE.md
```

### To View Project Status
```
Read: PROJECT_STATUS.md
```

### To Understand API
```
Read: SETUP.md (API Endpoints section)
```

---

## File Dependencies

```
Frontend Dependencies:
  index.js
    └─→ components/App.jsx
        ├─→ components/Layout.jsx
        ├─→ pages/CROModule.jsx
        │   ├─→ components/PMSDueList.jsx
        │   ├─→ components/AppointmentSetting.jsx
        │   └─→ components/WalkInRegistration.jsx
        └─→ styles (all .css files)

Backend Dependencies:
  run.py
    └─→ app/__init__.py (create_app)
        ├─→ config.py (configuration)
        ├─→ database.py (db connection)
        └─→ routes/__init__.py (blueprints)
            ├─→ services/customer_service.py
            └─→ services/scheduling_service.py

Database Dependencies:
  schema.sql
    ├─→ 7 tables
    ├─→ 2 views
    └─→ Sample data
```

---

## Files to Edit for Customization

### UI Styling
```
frontend/src/styles/cro-module.css      # Tab styles
frontend/public/styles.css               # Global styles
frontend/src/index.css                   # Form/button styles
```

### Business Logic
```
backend/app/services/customer_service.py    # Customer operations
backend/app/services/scheduling_service.py  # Scheduling logic
```

### API Endpoints
```
backend/app/routes/__init__.py          # Add/modify endpoints
```

### Database
```
database/schema.sql                     # Add tables/fields
backend/config.py                       # DB connection string
```

---

## Files NOT to Edit (System Files)
```
frontend/src/main.js                    # Electron configuration
frontend/preload.js                     # Electron security
backend/run.py                          # Server startup
.gitignore                              # Git configuration
```

---

## Quick Reference

### Add New Feature
1. Add database table/fields to `database/schema.sql`
2. Add service method to `backend/app/services/`
3. Add API endpoint to `backend/app/routes/__init__.py`
4. Create React component in `frontend/src/components/`
5. Add styling to `frontend/src/styles/`
6. Add route to `frontend/src/components/Layout.jsx`

### Deploy Changes
1. Test locally: `python backend/run.py` + `npm start`
2. Build frontend: `npm run build`
3. Build desktop app: `npm run electron-build`
4. Distribute .exe/.dmg/.AppImage

---

## Support Documentation
- Architecture details: `ARCHITECTURE.md`
- Setup instructions: `SETUP.md`
- Quick start: `QUICKSTART.md`
- Status tracking: `PROJECT_STATUS.md`
- Complete overview: `PROJECT_OVERVIEW.md`

Created: December 16, 2025
Version: 1.0.0
Status: Interface 1 Complete ✅
