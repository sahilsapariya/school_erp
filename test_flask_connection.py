#!/usr/bin/env python3
"""
Quick test script to verify Flask server is accessible
Run this to test if your Flask server is running and reachable
"""
import requests
import sys

def test_flask_server(base_url="http://localhost:5001"):
    """Test if Flask server is running and accessible"""
    try:
        print(f"Testing Flask server at {base_url}...")
        
        # Test health check endpoint
        response = requests.get(f"{base_url}/api", timeout=5)
        print(f"✅ Health check successful! Status: {response.status_code}")
        print(f"   Response: {response.text}")
        
        # Test auth endpoint (should return error, but confirms server is reachable)
        try:
            response = requests.post(
                f"{base_url}/api/auth/login",
                json={"email": "test@test.com", "password": "test"},
                timeout=5
            )
            print(f"✅ Auth endpoint reachable! Status: {response.status_code}")
            print(f"   Response: {response.json()}")
        except Exception as e:
            print(f"⚠️  Auth endpoint test failed: {e}")
        
        print("\n✅ Flask server is running and accessible!")
        return True
        
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to {base_url}")
        print("   Make sure Flask server is running: python app.py")
        return False
    except requests.exceptions.Timeout:
        print(f"❌ Connection to {base_url} timed out")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    # Test localhost
    print("=" * 50)
    print("Testing Flask Server Connection")
    print("=" * 50)
    print()
    
    localhost_ok = test_flask_server("http://localhost:5001")
    
    print()
    print("=" * 50)
    if localhost_ok:
        print("✅ Server is accessible on localhost")
        print("\nFor Android Emulator: Use http://10.0.2.2:5001")
        print("For Physical Device: Use your computer's local IP with port 5001")
    else:
        print("❌ Server is NOT accessible")
        print("\nMake sure to:")
        print("1. Start Flask: python app.py")
        print("2. Check that it's running on port 5000")
        print("3. Verify no firewall is blocking connections")
    print("=" * 50)

