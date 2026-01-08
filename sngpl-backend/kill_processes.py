"""
Script to kill all Python processes running mqtt_listener.py or main.py
Run this to clean up old processes before restarting
"""
import psutil
import sys

killed_count = 0

print("Searching for mqtt_listener.py and main.py processes...")
print("=" * 60)

for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
    try:
        # Check if it's a Python process
        if proc.info['name'] and 'python' in proc.info['name'].lower():
            cmdline = proc.info['cmdline']
            if cmdline:
                # Check if it's running mqtt_listener.py or main.py
                cmdline_str = ' '.join(cmdline)
                if 'mqtt_listener.py' in cmdline_str or 'main.py' in cmdline_str:
                    print(f"Found process PID {proc.info['pid']}: {cmdline_str}")
                    try:
                        proc.kill()
                        print(f"  ✓ Killed PID {proc.info['pid']}")
                        killed_count += 1
                    except Exception as e:
                        print(f"  ✗ Failed to kill PID {proc.info['pid']}: {e}")
    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
        pass

print("=" * 60)
print(f"Total processes killed: {killed_count}")
print("\nNow you can restart with:")
print("  python main.py")
print("  python mqtt_listener.py")
