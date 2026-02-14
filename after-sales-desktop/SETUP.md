# After-Sales Desktop Application - Setup Guide

## Prerequisites
- **Node.js (v20+)** and npm
- **Cloudflare account** (Workers + D1)
- **Wrangler CLI** (installed automatically via devDependencies)

## Quick Start

### 1. Install dependencies
```bash
cd worker
npm install

cd frontend
npm install
```

### 2. Configure API base (cloud Worker)

Your deployed Worker is:

`https://rapide-api.rapideph.workers.dev`

The frontend uses `VITE_API_BASE` for all `/api/*` calls.

- Development: `frontend/.env.development`
- Production: `frontend/.env.production`

### 3. Run the app (Development)

Start the Electron + React dev stack:

```bash
cd frontend
npm run dev
```

### 4. Deploy the Worker (cloud)

Deploy:

```bash
cd worker
npx wrangler deploy
```

### 5. Build for Production
```bash
cd frontend
npm run build
npm run electron-build
```

## API Endpoints

### Customer Routes
- `GET /api/customer/pms-due-list` - Get PMS due customers
- `POST /api/customer/search` - Search customer
- `POST /api/customer/register` - Register walk-in customer
- `GET /api/customer/<id>` - Get customer details

### Scheduler Routes
- `POST /api/scheduler/check-availability` - Check resource availability
- `POST /api/scheduler/create-order` - Create scheduling order
- `POST /api/scheduler/log-contact-attempt` - Log contact attempt

## Database Tables
- `customers` - Customer information
- `technicians` - Service technicians
- `service_advisors` - Service advisors
- `service_bays` - Service bays
- `scheduling_orders` - Appointment orders
- `contact_attempts` - Call/SMS logs
- `audit_logs` - System audit trail

## Features (Interface 1 - CRO Module)

### 1.1 PMS Due List
- View customers due for maintenance
- Filter by last service date
- Display days since service

### 1.2 Contact & Appointment Setting
- Log customer contact attempts (call, SMS, email)
- Check real-time availability of:
  - Service bays
  - Technicians
  - Service advisors
- Create scheduling orders with automatic conflict detection

### 1.3 Walk-In Customer Registration
- Search existing customers by:
  - Plate number
  - Name
  - Contact number
- Register new customers with CIS form
- Capture vehicle and contact information

## Project Structure
```
after-sales-desktop/
├── worker/                # Cloudflare Worker API (D1)
├── frontend/
│   ├── public/           # Static assets
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── styles/       # CSS
│   │   └── index.js      # Entry point
│   ├── package.json
│   └── src/main.js       # Electron main process
│
├── database/
│   └── schema.sql        # MySQL schema
│
└── README.md
```

## Configuration

### MySQL Connection (backend/config.py)
```python
MYSQL_HOST = 'localhost'
MYSQL_USER = 'root'
MYSQL_PASSWORD = ''
MYSQL_DB = 'after_sales_db'
```

### Environment Variables
Create `.env` file in backend folder:
```
FLASK_ENV=development
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DB=after_sales_db
```

## Troubleshooting

### MySQL Connection Error
- Ensure XAMPP MySQL is running
- Check credentials in config.py
- Verify database exists: `CREATE DATABASE IF NOT EXISTS after_sales_db;`

### Port Already in Use
- Backend default: 5000
- Change in `backend/run.py` if needed
- React default: 3000

### Module Not Found
```bash
# Backend
pip install --upgrade pip
pip install -r requirements.txt

# Frontend
rm -rf node_modules
npm install
```

## Next Steps
- Test Interface 1 (CRO Module)
- Build Interface 2 (Service Advisor Module)
- Continue with remaining 11 interfaces
- Implement authentication system
- Add reporting and analytics

## Support
For issues or questions, check the project documentation in `/docs`
