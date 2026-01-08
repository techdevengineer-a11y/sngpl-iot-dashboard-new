"""Test export functionality"""
import requests
from datetime import datetime, timedelta

# API base URL
BASE_URL = "http://localhost:8000/api/v1"

def test_export():
    """Test export endpoints"""

    # Calculate date range (last 7 days)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)

    print("Testing Export Functionality")
    print("=" * 60)
    print(f"Date Range: {start_date.date()} to {end_date.date()}")
    print()

    # Test 1: Export device data (CSV)
    print("Test 1: Exporting device data (CSV)...")
    try:
        device_id = "modem2"  # Change to an actual device ID
        url = f"{BASE_URL}/export/device/{device_id}"
        params = {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
            "format": "csv"
        }

        response = requests.get(url, params=params)

        if response.status_code == 200:
            print(f"✓ SUCCESS: Received {len(response.content)} bytes")
            print(f"  Content-Type: {response.headers.get('Content-Type')}")
            print(f"  Filename: {response.headers.get('Content-Disposition')}")

            # Save file
            filename = f"test_device_{device_id}.csv"
            with open(filename, 'wb') as f:
                f.write(response.content)
            print(f"  Saved to: {filename}")
        else:
            print(f"✗ FAILED: Status {response.status_code}")
            print(f"  Error: {response.text}")
    except Exception as e:
        print(f"✗ ERROR: {e}")

    print()

    # Test 2: Export device data (Excel)
    print("Test 2: Exporting device data (Excel)...")
    try:
        device_id = "modem2"
        url = f"{BASE_URL}/export/device/{device_id}"
        params = {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
            "format": "excel"
        }

        response = requests.get(url, params=params)

        if response.status_code == 200:
            print(f"✓ SUCCESS: Received {len(response.content)} bytes")
            print(f"  Content-Type: {response.headers.get('Content-Type')}")

            # Save file
            filename = f"test_device_{device_id}.xlsx"
            with open(filename, 'wb') as f:
                f.write(response.content)
            print(f"  Saved to: {filename}")
        else:
            print(f"✗ FAILED: Status {response.status_code}")
            print(f"  Error: {response.text}")
    except Exception as e:
        print(f"✗ ERROR: {e}")

    print()

    # Test 3: Export section data
    print("Test 3: Exporting section data (CSV)...")
    try:
        section_id = "I"
        url = f"{BASE_URL}/export/section/{section_id}"
        params = {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
            "format": "csv"
        }

        response = requests.get(url, params=params)

        if response.status_code == 200:
            print(f"✓ SUCCESS: Received {len(response.content)} bytes")

            # Save file
            filename = f"test_section_{section_id}.csv"
            with open(filename, 'wb') as f:
                f.write(response.content)
            print(f"  Saved to: {filename}")
        else:
            print(f"✗ FAILED: Status {response.status_code}")
            print(f"  Error: {response.text}")
    except Exception as e:
        print(f"✗ ERROR: {e}")

    print()
    print("=" * 60)
    print("Export tests completed!")

if __name__ == "__main__":
    test_export()
