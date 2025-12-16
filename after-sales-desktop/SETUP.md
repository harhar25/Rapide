# After-Sales Desktop Application - Setup Guide

## Prerequisites
- **Python 3.8+**
- **Node.js 14+** and npm
- **MySQL 5.7+** (via XAMPP)
- **XAMPP** running on your system

## Quick Start

### 1. Start XAMPP
- Open XAMPP Control Panel
- Start **Apache** and **MySQL** services

### 2. Create Database
```bash
# Connect to MySQL
mysql -u root

# Run schema
mysql -u root < database/schema.sql

# Verify
mysql -u root -e "USE after_sales_db; SHOW TABLES;"
```

### 3. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 4. Run Backend Server
```bash
python run.py
```

Backend runs on: `http://localhost:5000`

### 5. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 6. Run Frontend (Development)
```bash
npm start
```

### 7. Build for Production
```bash
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
├── backend/
│   ├── app/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   ├── models/        # Data models
│   ├── config.py          # Configuration
│   ├── database.py        # Database connection
│   ├── requirements.txt
│   └── run.py            # Server entry point
│
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
