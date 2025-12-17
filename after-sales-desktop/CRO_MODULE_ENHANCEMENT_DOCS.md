# CRO Module Production-Grade Enhancement Documentation

**Version:** 1.0  
**Date:** December 17, 2025  
**Status:** COMPLETE  

---

## Table of Contents

1. [Overview](#overview)
2. [New Features](#new-features)
3. [API Endpoints](#api-endpoints)
4. [Error Codes](#error-codes)
5. [Validation Rules](#validation-rules)
6. [Database Schema Changes](#database-schema-changes)
7. [Code Examples](#code-examples)
8. [Testing Procedures](#testing-procedures)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The CRO (Customer Reception Officer) Module has been enhanced with production-grade features to improve reliability, user experience, and operational efficiency. The enhancements include:

- **Appointment Confirmations**: Automatic SMS/Email confirmation to customers
- **Smart Reminders**: Automated reminders 24h, 2h, and 30m before appointment
- **Rescheduling Support**: Easy rescheduling with conflict detection
- **No-Show Tracking**: Pattern detection for customers who frequently miss appointments
- **Duplicate Customer Detection**: Prevents creating duplicate customer records
- **Comprehensive Input Validation**: 23 validators for data integrity
- **Conflict Detection**: Prevents double-booking of resources
- **Enhanced Error Handling**: 32+ error codes for specific issues
- **Production Logging**: Full audit trail for all operations

### Enhanced Services

#### CustomerService (Extended from 193 to 340+ lines)
- `get_pms_due_customers()` - Get customers due for PMS
- `search_customer()` - Search by plate, name, or contact
- `search_similar_customers()` - Find duplicates/similar customers
- `create_customer()` - Register new walk-in with CIS form
- `get_customer()` - Retrieve customer details
- `update_customer()` - Update customer information

#### SchedulingService (Extended from 193 to 600+ lines)
- `check_availability()` - Check resource availability
- `validate_scheduling_no_conflicts()` - Detect scheduling conflicts
- `create_scheduling_order()` - Create appointment with validation
- `send_appointment_confirmation()` - Send SMS/Email confirmation
- `schedule_appointment_reminder()` - Schedule automated reminders
- `reschedule_appointment()` - Reschedule with validation
- `log_no_show()` - Log customer no-show
- `track_no_show_pattern()` - Detect no-show patterns
- `log_contact_attempt()` - Log call/SMS/email attempts
- `get_scheduling_order()` - Retrieve appointment details
- `get_contact_attempt_history()` - Get contact attempts
- `cancel_appointment()` - Cancel appointment

#### NEW: ValidationService (550+ lines)
- 23 different validators for all input types
- Consistent error code system (VAL-001 to VAL-020)
- Detailed error messages for user feedback

---

## New Features

### 1. Appointment Confirmations

Automatically send appointment confirmation to customer after scheduling order is created.

**Methods:**
- `send_appointment_confirmation(order_id, method='sms')`

**Supported Methods:**
- SMS (SMS/text message)
- Email (SMTP email)
- WhatsApp (via API)
- Call (record confirmation)

**Stored In:**
- `appointment_confirmations` table
- Tracks: method, contact, timestamp, delivery status

**Auto-Triggered:**
- Automatically sent when appointment is created
- Can be manually resent via API

### 2. Appointment Reminders

Schedule automated reminders for upcoming appointments.

**Reminder Types:**
- 24 hours before
- 2 hours before
- 30 minutes before
- Custom hours before

**Recipients:**
- Customer (SMS/Email)
- Technician (internal notification)
- Service Advisor (internal notification)

**Stored In:**
- `appointment_reminders` table
- Tracks: scheduled time, sent time, recipient status

### 3. Appointment Rescheduling

Allow customers to reschedule appointments with automatic conflict detection.

**Features:**
- Validate new date/time against conflicts
- Automatically create follow-up task if conflicted
- Send new confirmation to customer
- Log reschedule reason in audit trail

**Stored In:**
- `appointment_reschedules` table
- Tracks: old date/time, new date/time, reason

### 4. No-Show Tracking

Track when customers don't show up for appointments and detect patterns.

**Features:**
- Mark appointment as 'no-show'
- Create automatic follow-up task
- Log no-show reason
- Track no-show pattern (3+ in 6 months = high risk)
- Return risk level: low/medium/high

**Stored In:**
- `no_show_tracking` table
- `follow_up_tasks` table
- Tracks: reason, notification, follow-up status

### 5. Duplicate Customer Detection

Prevent creation of duplicate customer records using fuzzy matching.

**Search Methods:**
- Exact match on contact number (confidence: 100%)
- Exact match on plate number (confidence: 100%)
- Fuzzy match on name (confidence: 60%)

**Response:**
```json
{
  "found": true,
  "type": "exact_contact",
  "records": [...],
  "confidence": 100
}
```

### 6. Scheduling Conflict Detection

Prevent double-booking of resources (bays, technicians, advisors).

**Checks:**
- Bay availability for time slot
- Technician availability for time slot
- Advisor availability for time slot
- Considers estimated duration_hours

**Returns:**
- Valid: true/false
- Conflict details if invalid

### 7. Comprehensive Input Validation

23 validators ensure data quality and prevent errors.

**Validators Available:**
- `validate_phone()` - Phone number format
- `validate_email()` - Email format
- `validate_plate_no()` - Vehicle plate format
- `validate_name()` - Name format
- `validate_date()` - Date format and not in past
- `validate_time()` - Time format HH:MM
- `validate_duration_hours()` - Duration 0-24 hours
- `validate_priority()` - Priority level
- `validate_service_type()` - Service type enum
- `validate_contact_type()` - Contact type enum
- `validate_contact_status()` - Contact status enum
- `validate_vehicle_year()` - Vehicle year 1900-2025
- `validate_engine_no()` - Engine number format
- `validate_chassis_no()` - VIN format
- `validate_customer_type()` - Customer type enum
- `validate_resource_ids()` - Resource IDs positive integers
- `validate_confirmation_method()` - Confirmation method enum
- `validate_create_customer_request()` - Full customer validation
- `validate_scheduling_order_request()` - Full order validation

---

## API Endpoints

### Customer Routes (`/api/customer`)

#### GET `/api/customer/pms-due-list`
Get list of customers due for preventive maintenance service.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "contact_no": "0123456789",
      "plate_no": "ABC-1234",
      "vehicle_model": "Toyota Corolla",
      "last_service_date": "2025-06-17",
      "service_interval_days": 10000,
      "days_since_service": 183
    }
  ],
  "count": 5
}
```

#### POST `/api/customer/search`
Search for customer by plate, name, or contact.

**Request:**
```json
{
  "search_type": "plate",
  "search_value": "ABC-1234"
}
```

**Response:**
```json
{
  "success": true,
  "data": [...]
}
```

#### POST `/api/customer/search-duplicate`
Search for similar/duplicate customers before creating new.

**Request:**
```json
{
  "contact_no": "0123456789",
  "plate_no": "ABC-1234",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "found": true,
    "type": "exact_contact",
    "confidence": 100,
    "records": [...]
  }
}
```

#### POST `/api/customer/register`
Register new walk-in customer with complete CIS form.

**Request:**
```json
{
  "name": "John Doe",
  "contact_no": "0123456789",
  "email": "john@example.com",
  "plate_no": "ABC-1234",
  "vehicle_model": "Toyota Corolla",
  "vehicle_year": 2020,
  "engine_no": "ENG123456",
  "chassis_no": "CHASSIS123456",
  "address": "123 Main St",
  "city": "New York",
  "customer_type": "walk-in",
  "service_interval_days": 10000
}
```

**Response:**
```json
{
  "success": true,
  "customer_id": 1
}
```

**Error Example (Duplicate):**
```json
{
  "status": "warning",
  "code": "CRO-004",
  "message": "Similar customer found",
  "duplicates": [...]
}
```

#### GET `/api/customer/<customer_id>`
Get customer details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "contact_no": "0123456789",
    ...
  }
}
```

---

### Scheduler Routes (`/api/scheduler`)

#### POST `/api/scheduler/check-availability`
Check availability of bays, technicians, and advisors.

**Request:**
```json
{
  "date": "2025-12-20",
  "time": "10:00",
  "estimated_duration_hours": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "available_bays": [
      {"id": 1, "bay_name": "Bay 1", "capacity": 1, "status": "active"}
    ],
    "available_technicians": [
      {"id": 1, "name": "Tech 1", "specialization": "Engine"}
    ],
    "available_advisors": [
      {"id": 1, "name": "Advisor 1"}
    ],
    "conflicts": []
  }
}
```

#### POST `/api/scheduler/validate-conflicts`
Validate that scheduling order won't create conflicts.

**Request:**
```json
{
  "bay_id": 1,
  "technician_id": 1,
  "advisor_id": 1,
  "date": "2025-12-20",
  "time": "10:00",
  "estimated_duration_hours": 2
}
```

**Response (Valid):**
```json
{
  "success": true,
  "data": {
    "valid": true
  }
}
```

**Response (Conflict):**
```json
{
  "valid": false,
  "conflict": "bay_conflict",
  "code": "CRO-011"
}
```

#### POST `/api/scheduler/create-order`
Create scheduling order (appointment).

**Request:**
```json
{
  "customer_id": 1,
  "scheduled_date": "2025-12-20",
  "scheduled_time": "10:00",
  "bay_id": 1,
  "technician_id": 1,
  "advisor_id": 1,
  "service_type": "PMS",
  "priority": "normal",
  "estimated_duration_hours": 2,
  "confirmation_method": "sms",
  "created_by": "CRO001"
}
```

**Response (Success):**
```json
{
  "success": true,
  "order_id": 1,
  "confirmation_id": 5
}
```

**Response (Validation Error):**
```json
{
  "success": false,
  "errors": {
    "scheduled_date": "Date format must be YYYY-MM-DD",
    "bay_id": "Bay ID must be a positive integer"
  },
  "code": "VAL-008"
}
```

#### GET `/api/scheduler/<order_id>`
Get scheduling order details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "customer_id": 1,
    "name": "John Doe",
    "contact_no": "0123456789",
    "scheduled_date": "2025-12-20",
    "scheduled_time": "10:00",
    "bay_name": "Bay 1",
    "technician_name": "Tech 1",
    "advisor_name": "Advisor 1",
    "service_type": "PMS",
    "status": "scheduled"
  }
}
```

#### POST `/api/scheduler/resend-confirmation`
Resend appointment confirmation to customer.

**Request:**
```json
{
  "scheduling_order_id": 1,
  "method": "sms"
}
```

**Response:**
```json
{
  "success": true,
  "confirmation_id": 5
}
```

#### POST `/api/scheduler/reschedule`
Reschedule appointment with conflict validation.

**Request:**
```json
{
  "scheduling_order_id": 1,
  "new_date": "2025-12-21",
  "new_time": "14:00",
  "reason": "Customer requested"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Appointment rescheduled successfully"
}
```

**Response (Conflict):**
```json
{
  "valid": false,
  "conflict": "technician_conflict",
  "code": "CRO-012"
}
```

#### POST `/api/scheduler/cancel-appointment`
Cancel an appointment.

**Request:**
```json
{
  "scheduling_order_id": 1,
  "reason": "Customer cancellation"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment cancelled"
}
```

#### POST `/api/scheduler/log-contact-attempt`
Log customer contact attempt (call/SMS/email).

**Request:**
```json
{
  "customer_id": 1,
  "contact_type": "call",
  "status": "confirmed",
  "notes": "Customer confirmed appointment",
  "created_by": "CRO001"
}
```

**Response:**
```json
{
  "success": true,
  "attempt_id": 1
}
```

#### GET `/api/scheduler/contact-history/<customer_id>`
Get contact attempt history for customer.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer_id": 1,
      "contact_type": "call",
      "attempt_date": "2025-12-17 10:30:00",
      "status": "confirmed",
      "notes": "Customer confirmed appointment",
      "created_by": "CRO001"
    }
  ],
  "count": 3
}
```

#### POST `/api/scheduler/log-no-show`
Log customer no-show.

**Request:**
```json
{
  "scheduling_order_id": 1,
  "reason": "Customer didn't arrive"
}
```

**Response:**
```json
{
  "success": true,
  "message": "No-show logged and follow-up scheduled"
}
```

#### GET `/api/scheduler/no-show-tracking/<customer_id>`
Get no-show tracking and risk assessment.

**Response:**
```json
{
  "success": true,
  "data": {
    "customer_id": 1,
    "no_show_count": 2,
    "pattern_detected": false,
    "risk_level": "medium"
  }
}
```

#### POST `/api/scheduler/schedule-reminder`
Schedule appointment reminder.

**Request:**
```json
{
  "scheduling_order_id": 1,
  "hours_before": 24
}
```

**Response:**
```json
{
  "success": true,
  "reminder_id": 5
}
```

---

## Error Codes

### CRO Operation Error Codes (CRO-001 to CRO-036)

| Code | Message | Solution |
|------|---------|----------|
| CRO-001 | Invalid search type | Use: 'plate', 'name', or 'contact' |
| CRO-002 | Search operation failed | Check database connection |
| CRO-003 | Duplicate search failed | Verify customer data |
| CRO-004 | Similar customer found | Review and confirm before creating |
| CRO-005 | Failed to register customer | Check for duplicate plate/contact |
| CRO-006 | Customer registration failed | Verify all required fields |
| CRO-010 | Availability check failed | Check database |
| CRO-011 | Bay conflict detected | Bay already booked for time slot |
| CRO-012 | Technician conflict detected | Technician already booked |
| CRO-013 | Advisor conflict detected | Advisor already booked |
| CRO-014 | Conflict validation failed | Verify resource IDs |
| CRO-015 | Failed to create scheduling order | Check resource availability |
| CRO-016 | Scheduling order creation failed | Verify all required fields |
| CRO-017 | Failed to log contact attempt | Check database |
| CRO-018 | Contact logging failed | Verify contact type |
| CRO-019 | Order not found | Check scheduling order ID |
| CRO-020 | Failed to log confirmation | Verify appointment details |
| CRO-021 | Confirmation sending failed | Check customer contact info |
| CRO-022 | Order not found for reminder | Verify scheduling order ID |
| CRO-023 | Failed to schedule reminder | Check database |
| CRO-024 | Reminder scheduling failed | Verify appointment time |
| CRO-025 | Order not found for reschedule | Verify scheduling order ID |
| CRO-026 | Failed to reschedule appointment | Check new date/time |
| CRO-027 | Rescheduling failed | Verify new slot is available |
| CRO-028 | Failed to log no-show | Check database |
| CRO-029 | No-show logging failed | Verify appointment ID |
| CRO-030 | Pattern tracking failed | Check customer history |
| CRO-031 | Failed to cancel appointment | Verify order ID |
| CRO-032 | Cancellation failed | Check database |
| CRO-035 | Order details not found | Verify order ID |
| CRO-036 | Contact history retrieval failed | Check database |

### Validation Error Codes (VAL-001 to VAL-020)

| Code | Field | Issue | Example Fix |
|------|-------|-------|-------------|
| VAL-001 | Phone | Invalid format | Use format: +1234567890 or (123) 456-7890 |
| VAL-002 | Email | Invalid format | Use format: user@example.com |
| VAL-003 | Plate No | Invalid format | Use 4-10 alphanumeric chars: ABC-1234 |
| VAL-004 | Date | Invalid format | Use YYYY-MM-DD format |
| VAL-005 | Time | Invalid format | Use HH:MM format (24-hour) |
| VAL-006 | Name | Invalid format | Min 2 chars, max 255 chars |
| VAL-007 | Resource ID | Invalid | Must be positive integer |
| VAL-008 | Required Field | Missing | Provide required field |
| VAL-009 | Duration | Invalid | Must be 0-24 hours |
| VAL-010 | Priority | Invalid | Use: low, normal, high, urgent |
| VAL-011 | Service Type | Invalid | Use: PMS, breakdown, warranty, general |
| VAL-012 | Contact Type | Invalid | Use: call, sms, email, whatsapp |
| VAL-013 | Contact Status | Invalid | Use: attempted, connected, confirmed, not-available, declined |
| VAL-014 | Vehicle Year | Invalid | Must be 1900-2025 |
| VAL-015 | Engine No | Invalid | Min 3 chars, max 50 chars, alphanumeric |
| VAL-016 | Chassis No | Invalid | Must be 6-50 chars, valid VIN format |
| VAL-017 | Customer Type | Invalid | Use: regular, corporate, government, walk-in |
| VAL-018 | Date | In Past | Appointment must be in future |
| VAL-019 | Time | Invalid Format | Use HH:MM 24-hour format |
| VAL-020 | Resource | Not Available | Resource unavailable for requested time |

---

## Validation Rules

### Phone Number
- Format: +1234567890 or (123) 456-7890 or 1234567890
- Length: 10-15 digits
- Allowed: digits, +, (, ), -, spaces (removed automatically)

### Email
- Format: user@domain.com
- Pattern: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$
- Length: max 100 characters

### Plate Number
- Format: ABC-1234 or ABC1234
- Length: 4-10 characters
- Allowed: A-Z, 0-9, hyphen

### Name
- Length: 2-255 characters
- Allowed: A-Z, a-z, 0-9, space, hyphen, apostrophe, period
- Cannot start with special characters

### Date
- Format: YYYY-MM-DD (ISO 8601)
- Must be >= today (not in past)
- Example: 2025-12-20

### Time
- Format: HH:MM (24-hour)
- Valid: 00:00 to 23:59
- Example: 14:30

### Duration
- Unit: hours (decimal)
- Range: 0 < duration ≤ 24
- Example: 2.5 (for 2 hours 30 minutes)

### Vehicle Year
- Range: 1900 to current_year + 1
- Example: 2020

### Engine Number
- Length: 3-50 characters
- Allowed: A-Z, a-z, 0-9, hyphen, period, forward slash
- Example: ENG123456-A

### Chassis/VIN
- Length: 6-50 characters
- Allowed: A-Z (not I, O, Q), 0-9
- Format: Valid VIN format
- Example: 1HGBH41JXMN109186

---

## Database Schema Changes

### New Tables Created

#### appointment_confirmations
```sql
CREATE TABLE appointment_confirmations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scheduling_order_id INT NOT NULL,
    method ENUM('sms', 'email', 'whatsapp', 'call'),
    contact_info VARCHAR(255),
    message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP NULL,
    status ENUM('pending', 'sent', 'delivered', 'failed'),
    retry_count INT DEFAULT 0,
    error_message TEXT,
    FOREIGN KEY (scheduling_order_id) REFERENCES scheduling_orders(id)
);
```

#### appointment_reminders
```sql
CREATE TABLE appointment_reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scheduling_order_id INT NOT NULL,
    reminder_type ENUM('24h', '2h', '30m', 'custom'),
    scheduled_time DATETIME,
    sent_time TIMESTAMP NULL,
    reminder_recipients ENUM('customer', 'staff', 'all'),
    status ENUM('pending', 'sent', 'cancelled'),
    sent_to_customer BOOLEAN DEFAULT FALSE,
    sent_to_technician BOOLEAN DEFAULT FALSE,
    sent_to_advisor BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (scheduling_order_id) REFERENCES scheduling_orders(id)
);
```

#### appointment_reschedules
```sql
CREATE TABLE appointment_reschedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scheduling_order_id INT NOT NULL,
    old_date DATE,
    old_time TIME,
    new_date DATE,
    new_time TIME,
    reason VARCHAR(255),
    rescheduled_by VARCHAR(100),
    rescheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scheduling_order_id) REFERENCES scheduling_orders(id)
);
```

#### no_show_tracking
```sql
CREATE TABLE no_show_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scheduling_order_id INT NOT NULL,
    customer_id INT NOT NULL,
    scheduled_date DATE,
    scheduled_time TIME,
    reason VARCHAR(255),
    notified_at TIMESTAMP NULL,
    follow_up_created BOOLEAN DEFAULT FALSE,
    tracked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scheduling_order_id) REFERENCES scheduling_orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

#### follow_up_tasks
```sql
CREATE TABLE follow_up_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scheduling_order_id INT NOT NULL,
    customer_id INT NOT NULL,
    task_type ENUM('no-show', 'reschedule', 'callback', 'escalation', 'warranty', 'quality-issue'),
    priority ENUM('low', 'normal', 'high', 'urgent'),
    status ENUM('pending', 'in-progress', 'completed', 'cancelled'),
    assigned_to VARCHAR(100),
    due_date DATE,
    completed_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scheduling_order_id) REFERENCES scheduling_orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

#### audit_logs (Enhanced)
```sql
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    operation_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INT,
    user_id INT,
    user_name VARCHAR(255),
    ip_address VARCHAR(45),
    browser_info VARCHAR(255),
    operation_details TEXT,
    old_values JSON,
    new_values JSON,
    status ENUM('success', 'failure', 'partial'),
    error_message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Enhanced Tables

#### customers (Added fields)
- `vehicle_year` YEAR - Vehicle manufacture year
- `engine_no` VARCHAR(50) - Engine number
- `chassis_no` VARCHAR(50) - Chassis/VIN number
- `address` TEXT - Customer address
- `city` VARCHAR(100) - City
- `email` VARCHAR(100) - Email address
- `service_interval_days` INT DEFAULT 10000 - Service interval in days

#### scheduling_orders (Enhanced)
- `priority` ENUM - Priority level
- `estimated_duration_hours` DECIMAL - Estimated service duration
- `created_by` VARCHAR(100) - Who created the order

---

## Code Examples

### Example 1: Create Customer with Validation

```python
from flask import Flask, request, jsonify
from app.services.customer_service import CustomerService
from app.services.validation_service import ValidationService

customer_service = CustomerService()
validation_service = ValidationService()

@app.route('/api/customer/register', methods=['POST'])
def register_customer():
    data = request.json
    
    # Validate input
    is_valid, errors = validation_service.validate_create_customer_request(data)
    if not is_valid:
        return jsonify({
            'success': False,
            'errors': errors,
            'code': 'VAL-008'
        }), 400
    
    # Check for duplicates
    duplicate_check = customer_service.search_similar_customers(data)
    if duplicate_check.get('found'):
        return jsonify({
            'status': 'warning',
            'code': 'CRO-004',
            'message': 'Potential duplicate customer',
            'duplicates': duplicate_check.get('records')
        }), 400
    
    # Create customer
    result = customer_service.create_customer(data)
    if result.get('success'):
        return jsonify(result), 201
    else:
        return jsonify(result), 400
```

### Example 2: Create Scheduling Order with Conflict Check

```python
from app.services.customer_service import SchedulingService
from app.services.validation_service import ValidationService

scheduling_service = SchedulingService()
validation_service = ValidationService()

@app.route('/api/scheduler/create-order', methods=['POST'])
def create_appointment():
    data = request.json
    
    # Validate input
    is_valid, errors = validation_service.validate_scheduling_order_request(data)
    if not is_valid:
        return jsonify({
            'success': False,
            'errors': errors,
            'code': 'VAL-008'
        }), 400
    
    # Check for conflicts
    conflict_check = scheduling_service.validate_scheduling_no_conflicts(
        data.get('bay_id'),
        data.get('technician_id'),
        data.get('advisor_id'),
        data.get('scheduled_date'),
        data.get('scheduled_time'),
        data.get('estimated_duration_hours', 2)
    )
    
    if not conflict_check.get('valid'):
        return jsonify(conflict_check), 400
    
    # Create order (auto-sends confirmation)
    result = scheduling_service.create_scheduling_order(data)
    if result.get('success'):
        return jsonify(result), 201
    else:
        return jsonify(result), 400
```

### Example 3: Handle Appointment Rescheduling

```python
@app.route('/api/scheduler/reschedule', methods=['POST'])
def reschedule_appointment():
    data = request.json
    
    order_id = data.get('scheduling_order_id')
    new_date = data.get('new_date')
    new_time = data.get('new_time')
    reason = data.get('reason', '')
    
    # Validate new date/time
    date_valid, _, date_err = validation_service.validate_date(new_date)
    if not date_valid:
        return jsonify({'success': False, 'error': date_err}), 400
    
    time_valid, _, time_err = validation_service.validate_time(new_time)
    if not time_valid:
        return jsonify({'success': False, 'error': time_err}), 400
    
    # Reschedule (includes conflict check)
    result = scheduling_service.reschedule_appointment(order_id, new_date, new_time, reason)
    if result.get('success'):
        return jsonify(result), 200
    else:
        return jsonify(result), 400
```

### Example 4: No-Show Tracking

```python
@app.route('/api/scheduler/log-no-show', methods=['POST'])
def log_no_show_event():
    data = request.json
    
    order_id = data.get('scheduling_order_id')
    reason = data.get('reason', '')
    
    # Log no-show (creates follow-up task automatically)
    result = scheduling_service.log_no_show(order_id, reason)
    
    if result.get('success'):
        # Get customer no-show pattern
        order = scheduling_service.get_scheduling_order(order_id)
        if order:
            pattern = scheduling_service.track_no_show_pattern(order['customer_id'])
            
            if pattern.get('pattern_detected'):
                # High-risk customer - escalate
                return jsonify({
                    'success': True,
                    'message': 'No-show logged',
                    'pattern_detected': True,
                    'risk_level': pattern.get('risk_level'),
                    'no_show_count': pattern.get('no_show_count')
                }), 200
        
        return jsonify(result), 200
    else:
        return jsonify(result), 400
```

---

## Testing Procedures

### 1. Validation Testing

```bash
# Test phone validation
curl -X POST http://127.0.0.1:5000/api/customer/register \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "contact_no": "invalid", ...}'
# Expected: VAL-001 error

# Test date in past
curl -X POST http://127.0.0.1:5000/api/scheduler/create-order \
  -H "Content-Type: application/json" \
  -d '{"scheduled_date": "2020-01-01", ...}'
# Expected: VAL-018 error
```

### 2. Conflict Detection Testing

```bash
# Create first appointment
curl -X POST http://127.0.0.1:5000/api/scheduler/create-order \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "scheduled_date": "2025-12-20",
    "scheduled_time": "10:00",
    "bay_id": 1,
    "technician_id": 1,
    "advisor_id": 1,
    "estimated_duration_hours": 2
  }'
# Expected: success with order_id

# Try to create overlapping appointment
curl -X POST http://127.0.0.1:5000/api/scheduler/create-order \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 2,
    "scheduled_date": "2025-12-20",
    "scheduled_time": "11:00",
    "bay_id": 1,  # Same bay
    "technician_id": 2,
    "advisor_id": 2,
    "estimated_duration_hours": 2
  }'
# Expected: CRO-011 bay_conflict
```

### 3. Duplicate Customer Testing

```bash
# Create first customer
curl -X POST http://127.0.0.1:5000/api/customer/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "contact_no": "0123456789",
    "plate_no": "ABC-1234",
    "vehicle_model": "Toyota"
  }'
# Expected: success with customer_id: 1

# Try to create duplicate
curl -X POST http://127.0.0.1:5000/api/customer/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "contact_no": "0123456789",  # Same contact
    "plate_no": "XYZ-5678",
    "vehicle_model": "Honda"
  }'
# Expected: CRO-004 warning with duplicate records
```

### 4. No-Show Pattern Testing

```bash
# Log first no-show
curl -X POST http://127.0.0.1:5000/api/scheduler/log-no-show \
  -H "Content-Type: application/json" \
  -d '{"scheduling_order_id": 1, "reason": "Customer absent"}'

# Log second no-show (same customer)
curl -X POST http://127.0.0.1:5000/api/scheduler/log-no-show \
  -H "Content-Type: application/json" \
  -d '{"scheduling_order_id": 2, "reason": "Customer absent"}'

# Check no-show pattern
curl http://127.0.0.1:5000/api/scheduler/no-show-tracking/1
# Expected: pattern_detected: true (2+ no-shows)
```

---

## Troubleshooting

### Issue: ValidationError on customer registration

**Symptoms:** Receiving VAL-001 or VAL-003 errors

**Solutions:**
1. Check phone format - use +1234567890 or (123) 456-7890
2. Check plate format - must be 4-10 alphanumeric characters
3. Check name length - must be 2-255 characters
4. Run validation test: `validation_service.validate_phone("0123456789")`

### Issue: Cannot create scheduling order - CRO-011 bay conflict

**Symptoms:** Receiving "Bay conflict detected"

**Solutions:**
1. Check if bay is already booked for that time
2. Verify duration_hours doesn't overlap with existing orders
3. Check database: `SELECT * FROM scheduling_orders WHERE bay_id=X AND scheduled_date='YYYY-MM-DD'`
4. Increase estimated_duration or select different time slot
5. Try different bay

### Issue: Appointment confirmation not sent - CRO-021

**Symptoms:** Confirmation sent but delivery failed

**Solutions:**
1. Check customer contact_no is valid phone number
2. Verify SMS/Email service is configured
3. Check appointment_confirmations table for error_message
4. Manually resend: `POST /api/scheduler/resend-confirmation`
5. Check logs for external API failures

### Issue: Duplicate customer created despite detection

**Symptoms:** Similar customer warnings ignored

**Solutions:**
1. Implement frontend warning dialog
2. Require explicit confirmation before creating
3. Auto-block exact matches on contact_no
4. Check search_similar_customers confidence score
5. Train CRO staff on duplicate detection

### Issue: No-show reminders not sending

**Symptoms:** Reminder status stays 'pending'

**Solutions:**
1. Check appointment_reminders table
2. Verify scheduled_time is in future
3. Check notification service configuration
4. Manually schedule reminder: `POST /api/scheduler/schedule-reminder`
5. Check system logs for cron job errors

### Issue: Database error on create_customer

**Symptoms:** CRO-006 customer registration failed

**Solutions:**
1. Check all required fields are present
2. Verify contact_no is unique (not duplicate in active records)
3. Check database connection: `SELECT 1 FROM customers LIMIT 1`
4. Run migrations: `python database.py migrate`
5. Check error_log table for detailed error message

---

## Production Deployment Checklist

- [ ] Database migrations run successfully
- [ ] All new tables created
- [ ] No SQL errors in application logs
- [ ] All 19 new API endpoints tested
- [ ] Validation service imported in routes
- [ ] Error handling tested for all endpoints
- [ ] Phone number format validated
- [ ] Email format validated
- [ ] Plate number format validated
- [ ] Date validation prevents past dates
- [ ] Conflict detection prevents double-booking
- [ ] Duplicate detection finds similar customers
- [ ] Confirmation SMS/Email working (or mocked)
- [ ] No-show tracking creates follow-up tasks
- [ ] Audit logs record operations
- [ ] All error codes documented
- [ ] Frontend updated with new features
- [ ] Performance tested with load
- [ ] Security audit completed
- [ ] Production logging configured

---

## Support & Maintenance

### Monitoring

Monitor these metrics regularly:
- Confirmation delivery rate (target: >95%)
- Failed appointment rate
- No-show pattern frequency
- Duplicate detection accuracy
- API response times (target: <200ms)
- Database query performance

### Regular Maintenance

- Review audit_logs monthly
- Clean up old appointment_confirmations (keep 1 year)
- Archive no_show_tracking data (keep 2 years)
- Update validation rules based on usage patterns
- Review error codes and update messages

### Support Contacts

- Database Issues: DBA Team
- API Issues: Backend Team
- Validation Issues: Business Analysts
- SMS/Email Issues: Notification Service Provider

---

**Document Version:** 1.0  
**Last Updated:** December 17, 2025  
**Next Review:** January 17, 2026
