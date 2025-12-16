# After-Sales Desktop Application - Quick Start

## One-Command Start (After initial setup)

### Terminal 1 - Backend
```bash
cd backend
python run.py
```

### Terminal 2 - Frontend
```bash
cd frontend
npm start
```

## Default Credentials
- Username: `cro`
- Password: `password` (will accept any value during setup phase)

## Sample Data Loaded
The database includes sample data:
- **4 Customers** with PMS due dates
- **4 Technicians** with specializations
- **3 Service Advisors**
- **4 Service Bays** (General, AC, Electrical)
- **3 Contact Attempts** logged
- **2 Scheduling Orders** created

## Testing the CRO Module

### Test PMS Due List
1. Navigate to CRO Module > PMS Due List tab
2. See customers due for service
3. Click "Contact" to log communication

### Test Appointment Setting
1. Go to Appointment Setting tab
2. Enter customer ID (1-4)
3. Select date and time
4. System shows available resources
5. Create scheduling order

### Test Walk-In Registration
1. Go to Walk-In Registration tab
2. Search for existing customer (try plate "ABC-1234")
3. Or register new customer with CIS form
4. System assigns customer ID

## Key Endpoints to Test

### Get PMS Due List
```bash
curl http://localhost:5000/api/customer/pms-due-list
```

### Search Customer
```bash
curl -X POST http://localhost:5000/api/customer/search \
  -H "Content-Type: application/json" \
  -d '{"search_type":"plate","search_value":"ABC-1234"}'
```

### Check Availability
```bash
curl -X POST http://localhost:5000/api/scheduler/check-availability \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-12-20","time":"09:00:00"}'
```

## Next Phase
Ready to implement Interface 2 (Service Advisor Module)
