#!/usr/bin/env python3
"""
Environment Variable Checker for PixGone Server
Helps identify issues with environment variable values
"""

import os

def check_env_vars():
    """Check all environment variables used by the server"""
    print("🔍 PixGone Server Environment Variable Check")
    print("=" * 50)
    
    # Rate limiting variables
    print("\n📊 Rate Limiting Configuration:")
    daily_limit = os.environ.get("DAILY_LIMIT", "50")
    print(f"DAILY_LIMIT: '{daily_limit}'")
    try:
        daily_limit_int = int(daily_limit)
        print(f"✅ DAILY_LIMIT is valid: {daily_limit_int}")
    except ValueError:
        print(f"❌ DAILY_LIMIT is invalid: '{daily_limit}' - should be a number")
        print("💡 Fix: Set DAILY_LIMIT to a number like 50")
    
    abuse_threshold = os.environ.get("ABUSE_THRESHOLD", "100")
    print(f"ABUSE_THRESHOLD: '{abuse_threshold}'")
    try:
        abuse_threshold_int = int(abuse_threshold)
        print(f"✅ ABUSE_THRESHOLD is valid: {abuse_threshold_int}")
    except ValueError:
        print(f"❌ ABUSE_THRESHOLD is invalid: '{abuse_threshold}' - should be a number")
        print("💡 Fix: Set ABUSE_THRESHOLD to a number like 100")
    
    # Railway API variables
    print("\n🚂 Railway API Configuration:")
    railway_token = os.getenv("RAILWAY_API_TOKEN")
    railway_project = os.getenv("RAILWAY_PROJECT_ID")
    
    if railway_token:
        if railway_token == "*****":
            print("❌ RAILWAY_API_TOKEN is set to '*****' (hidden)")
            print("💡 This is likely a placeholder - set to your actual Railway API token")
        else:
            print(f"✅ RAILWAY_API_TOKEN is set (length: {len(railway_token)})")
    else:
        print("⚠️ RAILWAY_API_TOKEN not set - cost monitoring disabled")
    
    if railway_project:
        if railway_project == "*****":
            print("❌ RAILWAY_PROJECT_ID is set to '*****' (hidden)")
            print("💡 This is likely a placeholder - set to your actual Railway project ID")
        else:
            print(f"✅ RAILWAY_PROJECT_ID is set: {railway_project}")
    else:
        print("⚠️ RAILWAY_PROJECT_ID not set - cost monitoring disabled")
    
    # Other common variables
    print("\n⚙️ Other Configuration:")
    port = os.environ.get("PORT", "8000")
    print(f"PORT: {port}")
    
    cors_origins = os.environ.get("CORS_ORIGINS", "*")
    print(f"CORS_ORIGINS: {cors_origins}")
    
    print("\n" + "=" * 50)
    print("✅ Environment check complete!")
    
    # Summary
    issues = []
    try:
        int(os.environ.get("DAILY_LIMIT", "50"))
    except ValueError:
        issues.append("DAILY_LIMIT")
    
    try:
        int(os.environ.get("ABUSE_THRESHOLD", "100"))
    except ValueError:
        issues.append("ABUSE_THRESHOLD")
    
    if railway_token == "*****":
        issues.append("RAILWAY_API_TOKEN (placeholder)")
    
    if railway_project == "*****":
        issues.append("RAILWAY_PROJECT_ID (placeholder)")
    
    if issues:
        print(f"\n⚠️ Issues found: {', '.join(issues)}")
        print("Please fix these environment variables before starting the server.")
    else:
        print("\n🎉 All environment variables look good!")

if __name__ == "__main__":
    check_env_vars() 