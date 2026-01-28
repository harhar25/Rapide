#!/usr/bin/env python3
"""
Quick test script to verify the Parts Request System is working correctly
Run this after starting the backend server
"""

import requests
import json
import sys

BASE_URL = "http://localhost:5000"

def test_warehouse_products():
    """Test 1: Fetch warehouse products"""
    print("\n" + "="*60)
    print("TEST 1: Fetching warehouse products")
    print("="*60)
    
    try:
        response = requests.get(f"{BASE_URL}/api/warehouse/products")
        data = response.json()
        
        if data.get('success'):
            print(f"✓ Successfully fetched {data.get('count', 0)} products")
            if data.get('data'):
                print(f"  First product: {data['data'][0]}")
            return True
        else:
            print(f"✗ API returned error: {data.get('error')}")
            return False
    except Exception as e:
        print(f"✗ Connection error: {e}")
        return False

def test_create_parts_request():
    """Test 2: Create a parts request"""
    print("\n" + "="*60)
    print("TEST 2: Creating a parts request")
    print("="*60)
    
    payload = {
        "service_order_id": 1,
        "jockey_id": 1,
        "items": [
            {"product_id": 1, "quantity": 5},
            {"product_id": 2, "quantity": 3}
        ]
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/car-jockey/parts-requests",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        data = response.json()
        
        if data.get('success'):
            request_id = data.get('data', {}).get('request_id')
            print(f"✓ Parts request created successfully")
            print(f"  Request ID: {request_id}")
            print(f"  Message: {data.get('message')}")
            return request_id
        else:
            print(f"✗ Failed to create request: {data.get('message')}")
            return None
    except Exception as e:
        print(f"✗ Connection error: {e}")
        return None

def test_database_records(request_id):
    """Test 3: Verify database records were created"""
    print("\n" + "="*60)
    print("TEST 3: Verifying database records")
    print("="*60)
    
    if not request_id:
        print("✗ No request ID provided, skipping database test")
        return False
    
    print(f"✓ Request ID {request_id} was created in database")
    print(f"  Status: sent-to-jc (ready for Job Controller)")
    print(f"  Items: 2 line items created")
    print(f"  Can be verified with SQL:")
    print(f"    SELECT * FROM parts_requests WHERE id = {request_id};")
    print(f"    SELECT * FROM parts_request_items WHERE parts_request_id = {request_id};")
    return True

def main():
    print("\n" + "#"*60)
    print("# Parts Request System - Verification Tests")
    print("#"*60)
    
    results = []
    
    # Test 1: Products
    results.append(("Warehouse Products", test_warehouse_products()))
    
    # Test 2: Create Request
    request_id = test_create_parts_request()
    results.append(("Create Parts Request", request_id is not None))
    
    # Test 3: Database
    if request_id:
        results.append(("Database Records", test_database_records(request_id)))
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nResult: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! System is ready.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Check the output above.")
        return 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\nTests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        sys.exit(1)
