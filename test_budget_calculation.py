#!/usr/bin/env python3
"""
Test script to verify budget calculation logic
"""

# Test scenarios
test_cases = [
    {
        "name": "No donations, low costs",
        "base_threshold": 5.0,
        "monthly_donations": 0.0,
        "current_cost": 0.37,
        "expected_budget": 4.63,
        "expected_enabled": True
    },
    {
        "name": "With donations, low costs",
        "base_threshold": 5.0,
        "monthly_donations": 10.0,
        "current_cost": 0.37,
        "expected_budget": 14.63,
        "expected_enabled": True
    },
    {
        "name": "No donations, high costs",
        "base_threshold": 5.0,
        "monthly_donations": 0.0,
        "current_cost": 6.0,
        "expected_budget": -1.0,
        "expected_enabled": False
    },
    {
        "name": "With donations, high costs",
        "base_threshold": 5.0,
        "monthly_donations": 10.0,
        "current_cost": 6.0,
        "expected_budget": 9.0,
        "expected_enabled": True
    }
]

def calculate_budget(base_threshold, monthly_donations, current_cost):
    """Calculate available budget"""
    return base_threshold + monthly_donations - current_cost

def is_enabled(available_budget):
    """Check if app should be enabled"""
    return available_budget > 0

def test_budget_calculation():
    """Test the budget calculation logic"""
    print("🧪 Testing Budget Calculation Logic")
    print("=" * 50)
    
    all_passed = True
    
    for test in test_cases:
        print(f"\n📋 Test: {test['name']}")
        print(f"   Base Threshold: ${test['base_threshold']}")
        print(f"   Monthly Donations: ${test['monthly_donations']}")
        print(f"   Current Cost: ${test['current_cost']}")
        
        # Calculate
        available_budget = calculate_budget(
            test['base_threshold'], 
            test['monthly_donations'], 
            test['current_cost']
        )
        enabled = is_enabled(available_budget)
        
        # Check results
        budget_correct = abs(available_budget - test['expected_budget']) < 0.01
        enabled_correct = enabled == test['expected_enabled']
        
        print(f"   Calculated Budget: ${available_budget:.2f}")
        print(f"   Expected Budget: ${test['expected_budget']:.2f}")
        print(f"   App Enabled: {enabled}")
        print(f"   Expected Enabled: {test['expected_enabled']}")
        
        if budget_correct and enabled_correct:
            print("   ✅ PASS")
        else:
            print("   ❌ FAIL")
            if not budget_correct:
                print(f"      Budget calculation incorrect")
            if not enabled_correct:
                print(f"      Enabled status incorrect")
            all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 All tests passed!")
    else:
        print("💥 Some tests failed!")
    
    return all_passed

if __name__ == "__main__":
    test_budget_calculation() 