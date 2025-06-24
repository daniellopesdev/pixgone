#!/usr/bin/env python3
import secrets
import string

def generate_webhook_secret(length=32):
    """Generate a secure webhook secret"""
    # Use letters, digits, and special characters
    characters = string.ascii_letters + string.digits + "!@#$%^&*"
    
    # Generate secure random string
    secret = ''.join(secrets.choice(characters) for _ in range(length))
    
    return secret

def generate_verification_token(length=24):
    """Generate a verification token"""
    # Use only letters and digits for verification token
    characters = string.ascii_letters + string.digits
    
    # Generate secure random string
    token = ''.join(secrets.choice(characters) for _ in range(length))
    
    return token

if __name__ == "__main__":
    print("🔐 Generating secure secrets for Ko-fi webhook...")
    print()
    
    # Generate webhook secret
    webhook_secret = generate_webhook_secret(32)
    print(f"KOFI_WEBHOOK_SECRET={webhook_secret}")
    print()
    
    # Generate verification token
    verification_token = generate_verification_token(24)
    print(f"KOFI_VERIFICATION_TOKEN={verification_token}")
    print()
    
    print("✅ Copy these values to your environment variables!")
    print("⚠️  Keep these secrets secure and never share them!")
    print()
    print("📝 Add to your .env file or Railway environment variables:")
    print(f"KOFI_WEBHOOK_SECRET={webhook_secret}")
    print(f"KOFI_VERIFICATION_TOKEN={verification_token}")
    print(f"BASE_THRESHOLD=5.0") 