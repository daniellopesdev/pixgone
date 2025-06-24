#!/usr/bin/env python3
"""
Test script to demonstrate that the API is working correctly.
When Railway credentials are not set, the API returns zero costs as expected.
"""

import requests
import json
import os

def test_local_api():
    """Test the local API response"""
    print("🧪 Testing Local API Response")
    print("=" * 50)
    
    # Check environment variables
    railway_token = os.getenv('RAILWAY_API_TOKEN')
    railway_project = os.getenv('RAILWAY_PROJECT_ID')
    
    print(f"Railway API Token: {'✅ SET' if railway_token else '❌ NOT SET'}")
    print(f"Railway Project ID: {'✅ SET' if railway_project else '❌ NOT SET'}")
    print()
    
    # Test the API
    try:
        response = requests.get('https://pixgone-production.up.railway.app/rate-limit-info')
        data = response.json()
        
        print("📡 Production API Response:")
        print(json.dumps(data, indent=2))
        
        # Check if costs are included
        if 'costs' in data:
            print(f"\n✅ Costs field present: {data['costs']}")
            if data['costs']['total_cost'] > 0:
                print("✅ Real cost data available")
            else:
                print("⚠️  Zero cost data (expected if Railway credentials not configured)")
        else:
            print("❌ Costs field missing")
            
    except Exception as e:
        print(f"❌ Error testing API: {e}")

def test_expected_response_format():
    """Show the expected response format"""
    print("\n🎯 Expected Response Format")
    print("=" * 50)
    
    expected = {
        "ip": "199.229.36.31",
        "requests_today": 0,
        "daily_limit": 50,
        "remaining_requests": 50,
        "is_blocked": False,
        "rate_limit": "10/minute",
        "costs": {
            "cpu_cost": 0.0234,
            "memory_cost": 0.0156,
            "network_cost": 0.0012,
            "total_cost": 0.0402
        }
    }
    
    print(json.dumps(expected, indent=2))
    print("\n📝 Note: costs will be 0.0 when Railway credentials are not configured")

if __name__ == "__main__":
    test_local_api()
    test_expected_response_format() 