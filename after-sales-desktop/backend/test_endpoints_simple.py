#!/usr/bin/env python
"""Simple endpoint validation using urllib"""

import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:5000/api"

def test_get(endpoint, name):
    """Test GET endpoint"""
    try:
        url = f"{BASE_URL}{endpoint}"
        req = urllib.request.Request(url, method='GET')
        with urllib.request.urlopen(req, timeout=3) as response:
            data = json.loads(response.read().decode())
            print(f"✓ {name}: {response.status}")
            return True, data
    except urllib.error.HTTPError as e:
        print(f"✗ {name}: HTTP {e.code} - {e.reason}")
        return False, None
    except urllib.error.URLError as e:
        print(f"✗ {name}: Connection failed - {e.reason}")
        return False, None
    except Exception as e:
        print(f"✗ {name}: {str(e)[:100]}")
        return False, None

def main():
    print("="*60)
    print("API ENDPOINT VALIDATION")
    print("="*60)
    
    tests = [
        ("/health", "Health Check"),
        ("/customer/pms-due-list", "PMS Due List"),
        ("/service-advisor/appointments/pending", "SA Pending Appointments"),
        ("/service-advisor/service-orders/pending", "SA Pending Service Orders"),
        ("/job-controller/service-orders/pending", "JC Pending Orders"),
        ("/job-controller/service-orders/active", "JC Active Orders"),
        ("/job-controller/technicians/available", "Available Technicians"),
        ("/warehouse/products", "Warehouse Products"),
        ("/warehouse/inventory/summary", "Inventory Summary"),
        ("/warehouse/inventory/low-stock", "Low Stock Products"),
        ("/warehouse/parts-requests/pending", "Pending Parts Requests"),
        ("/foreman-qc/jobs/pending", "Pending QC Jobs"),
        ("/foreman-qc/inspections/active", "Active QC Inspections"),
        ("/foreman-qc/summary", "QC Summary"),
        ("/job-wrapup/jobs/ready", "Jobs Ready for Wrap-Up"),
        ("/job-wrapup/wrapups/active", "Active Wrap-Ups"),
        ("/car-jockey/vehicles/parked", "Parked Vehicles"),
        ("/car-jockey/movements/recent", "Recent Movements"),
        ("/car-jockey/summary", "Car Jockey Summary"),
        ("/billing/invoices/pending", "Pending Invoices"),
        ("/billing/invoices/recent", "Recent Invoices"),
        ("/billing/summary", "Billing Summary"),
        ("/cashier/invoices/for-payment", "Invoices For Payment"),
        ("/cashier/transactions/recent", "Recent Transactions"),
        ("/cashier/drawer/status", "Cash Drawer Status"),
        ("/security-gate/badges/active", "Active Badges"),
        ("/gatepass/pending", "Pending Gatepasses"),
        ("/vehicle-handover/pending", "Pending Handovers"),
        ("/vehicle-handover/completed", "Completed Handovers"),
        ("/follow-up/followups/pending", "Pending Follow-Ups"),
        ("/follow-up/summary", "Follow-Up Summary"),
        ("/auto-followup/due-tasks", "Due Follow-Up Tasks"),
        ("/scheduler-tasks/status", "Scheduler Status"),
        ("/sms/outbox?limit=10", "SMS Outbox"),
    ]
    
    passed = 0
    failed = 0
    
    for endpoint, name in tests:
        success, _ = test_get(endpoint, name)
        if success:
            passed += 1
        else:
            failed += 1
    
    print("\n" + "="*60)
    print(f"Results: {passed} passed, {failed} failed out of {len(tests)} tests")
    print("="*60)
    
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
