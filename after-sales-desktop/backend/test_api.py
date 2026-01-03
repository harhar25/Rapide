import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:5000"
API_URL = f"{BASE_URL}/api"

class APITester:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def test_endpoint(self, method, endpoint, data=None, expected_status=200, test_name=""):
        """Test a single endpoint"""
        url = f"{API_URL}{endpoint}"
        try:
            if method == "GET":
                response = requests.get(url, timeout=5)
            elif method == "POST":
                response = requests.post(url, json=data, timeout=5)
            elif method == "PUT":
                response = requests.put(url, json=data, timeout=5)
            elif method == "DELETE":
                response = requests.delete(url, timeout=5)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            if response.status_code == expected_status:
                self.passed += 1
                print(f"✓ PASS: {test_name or endpoint} [{response.status_code}]")
                return response.json() if response.content else None
            else:
                self.failed += 1
                error_msg = f"✗ FAIL: {test_name or endpoint} - Expected {expected_status}, got {response.status_code}"
                print(error_msg)
                self.errors.append({
                    'endpoint': endpoint,
                    'method': method,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200] if response.text else None
                })
                return None
        except requests.exceptions.ConnectionError:
            self.failed += 1
            error_msg = f"✗ FAIL: {test_name or endpoint} - Connection refused (server not running?)"
            print(error_msg)
            self.errors.append({'endpoint': endpoint, 'error': 'Connection refused'})
            return None
        except Exception as e:
            self.failed += 1
            error_msg = f"✗ FAIL: {test_name or endpoint} - {str(e)}"
            print(error_msg)
            self.errors.append({'endpoint': endpoint, 'error': str(e)})
            return None
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("API TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.passed + self.failed}")
        print(f"✓ Passed: {self.passed}")
        print(f"✗ Failed: {self.failed}")
        print(f"Success Rate: {(self.passed/(self.passed+self.failed)*100):.1f}%" if (self.passed+self.failed) > 0 else "N/A")
        
        if self.errors:
            print("\n" + "="*60)
            print("ERRORS FOUND:")
            print("="*60)
            for i, error in enumerate(self.errors, 1):
                print(f"\n{i}. {error.get('endpoint', 'Unknown')}")
                print(f"   Method: {error.get('method', 'N/A')}")
                print(f"   Error: {error.get('error', error.get('response', 'Unknown error'))}")
        
        return self.failed == 0

def main():
    tester = APITester()
    
    print("="*60)
    print("AFTER-SALES API COMPREHENSIVE TEST")
    print("="*60)
    print(f"Testing against: {BASE_URL}")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60 + "\n")
    
    # ==================== HEALTH CHECK ====================
    print("\n[1] HEALTH CHECK")
    tester.test_endpoint("GET", "/health", test_name="Health Check")
    
    # ==================== CRO MODULE ====================
    print("\n[2] CRO MODULE - Customer & Scheduling")
    tester.test_endpoint("GET", "/customer/pms-due-list", test_name="Get PMS Due List")
    
    tester.test_endpoint("POST", "/customer/search", 
                        data={"search_type": "plate", "search_value": "ABC"},
                        test_name="Search Customer by Plate")
    
    tester.test_endpoint("POST", "/customer/search",
                        data={"search_type": "name", "search_value": "Test"},
                        test_name="Search Customer by Name")
    
    tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
    tester.test_endpoint("POST", "/scheduler/check-availability",
                        data={"date": tomorrow, "time": "10:00"},
                        test_name="Check Availability")
    
    # ==================== SERVICE ADVISOR MODULE ====================
    print("\n[3] SERVICE ADVISOR MODULE")
    tester.test_endpoint("GET", "/service-advisor/appointments/pending",
                        test_name="Get Pending Appointments")
    
    tester.test_endpoint("GET", "/service-advisor/service-orders/pending",
                        test_name="Get Pending Service Orders")
    
    # ==================== JOB CONTROLLER MODULE ====================
    print("\n[4] JOB CONTROLLER MODULE")
    tester.test_endpoint("GET", "/job-controller/service-orders/pending",
                        test_name="Get Pending Service Orders (JC)")
    
    tester.test_endpoint("GET", "/job-controller/service-orders/active",
                        test_name="Get Active Service Orders")
    
    tester.test_endpoint("GET", "/job-controller/technicians/available",
                        test_name="Get Available Technicians")
    
    # ==================== TECHNICIAN MODULE ====================
    print("\n[5] TECHNICIAN MODULE")
    tester.test_endpoint("GET", "/technician/jobs?technician_id=1",
                        test_name="Get Technician Jobs", expected_status=200)
    
    # ==================== WAREHOUSE MODULE ====================
    print("\n[6] WAREHOUSE MODULE")
    tester.test_endpoint("GET", "/warehouse/products",
                        test_name="Get All Products")
    
    tester.test_endpoint("GET", "/warehouse/inventory/summary",
                        test_name="Get Inventory Summary")
    
    tester.test_endpoint("GET", "/warehouse/inventory/low-stock",
                        test_name="Get Low Stock Products")
    
    tester.test_endpoint("GET", "/warehouse/parts-requests/pending",
                        test_name="Get Pending Parts Requests")
    
    # ==================== FOREMAN QC MODULE ====================
    print("\n[7] FOREMAN QC MODULE")
    tester.test_endpoint("GET", "/foreman-qc/jobs/pending",
                        test_name="Get Pending QC Jobs")
    
    tester.test_endpoint("GET", "/foreman-qc/inspections/active",
                        test_name="Get Active QC Inspections")
    
    tester.test_endpoint("GET", "/foreman-qc/summary",
                        test_name="Get QC Summary")
    
    # ==================== JOB WRAP-UP MODULE ====================
    print("\n[8] JOB WRAP-UP MODULE")
    tester.test_endpoint("GET", "/job-wrapup/jobs/ready",
                        test_name="Get Jobs Ready for Wrap-Up")
    
    tester.test_endpoint("GET", "/job-wrapup/wrapups/active",
                        test_name="Get Active Wrap-Ups")
    
    # ==================== CAR JOCKEY MODULE ====================
    print("\n[9] CAR JOCKEY MODULE")
    tester.test_endpoint("GET", "/car-jockey/vehicles/parked",
                        test_name="Get Parked Vehicles")
    
    tester.test_endpoint("GET", "/car-jockey/movements/recent",
                        test_name="Get Recent Vehicle Movements")
    
    tester.test_endpoint("GET", "/car-jockey/summary",
                        test_name="Get Car Jockey Summary")
    
    # ==================== BILLING MODULE ====================
    print("\n[10] BILLING MODULE")
    tester.test_endpoint("GET", "/billing/invoices/pending",
                        test_name="Get Pending Invoices")
    
    tester.test_endpoint("GET", "/billing/invoices/recent",
                        test_name="Get Recent Invoices")
    
    tester.test_endpoint("GET", "/billing/summary",
                        test_name="Get Billing Summary")
    
    # ==================== CASHIER MODULE ====================
    print("\n[11] CASHIER MODULE")
    tester.test_endpoint("GET", "/cashier/invoices/for-payment",
                        test_name="Get Invoices For Payment")
    
    tester.test_endpoint("GET", "/cashier/transactions/recent",
                        test_name="Get Recent Transactions")
    
    tester.test_endpoint("GET", "/cashier/drawer/status",
                        test_name="Get Cash Drawer Status")
    
    # ==================== SECURITY GATE MODULE ====================
    print("\n[12] SECURITY GATE MODULE")
    today = datetime.now().strftime('%Y-%m-%d')
    tester.test_endpoint("GET", f"/security-gate/entries?date={today}",
                        test_name="Get Entry Logs")
    
    tester.test_endpoint("GET", f"/security-gate/exits?date={today}",
                        test_name="Get Exit Logs")
    
    tester.test_endpoint("GET", "/security-gate/badges/active",
                        test_name="Get Active Badges")
    
    tester.test_endpoint("GET", f"/security-gate/summary?date={today}",
                        test_name="Get Security Gate Summary")
    
    # ==================== GATEPASS MODULE ====================
    print("\n[13] GATEPASS MODULE")
    tester.test_endpoint("GET", "/gatepass/pending",
                        test_name="Get Pending Gatepasses")
    
    # ==================== VEHICLE HANDOVER MODULE ====================
    print("\n[14] VEHICLE HANDOVER MODULE")
    tester.test_endpoint("GET", "/vehicle-handover/pending",
                        test_name="Get Pending Handovers")
    
    tester.test_endpoint("GET", "/vehicle-handover/completed",
                        test_name="Get Completed Handovers")
    
    # ==================== FOLLOW-UP MODULE ====================
    print("\n[15] FOLLOW-UP MODULE")
    tester.test_endpoint("GET", "/follow-up/followups/pending",
                        test_name="Get Pending Follow-Ups")
    
    tester.test_endpoint("GET", "/follow-up/summary",
                        test_name="Get Follow-Up Summary")
    
    # ==================== AUTO FOLLOW-UP MODULE ====================
    print("\n[16] AUTO FOLLOW-UP MODULE")
    tester.test_endpoint("GET", "/auto-followup/due-tasks",
                        test_name="Get Due Follow-Up Tasks")
    
    # ==================== SCHEDULER TASKS MODULE ====================
    print("\n[17] SCHEDULER TASKS MODULE")
    tester.test_endpoint("GET", "/scheduler-tasks/status",
                        test_name="Get Scheduler Status")
    
    # ==================== SMS MODULE ====================
    print("\n[18] SMS MODULE")
    tester.test_endpoint("GET", "/sms/outbox?limit=10",
                        test_name="Get SMS Outbox")
    
    # Print final summary
    success = tester.print_summary()
    
    if success:
        print("\n🎉 ALL TESTS PASSED - NO ERRORS FOUND!")
        return 0
    else:
        print(f"\n⚠️  {tester.failed} ERRORS FOUND - SEE DETAILS ABOVE")
        return 1

if __name__ == "__main__":
    exit(main())
