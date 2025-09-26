#!/usr/bin/env python3
"""
Camera detection utility for teleop system.
Helps identify available video devices and their capabilities.
"""

import os
import subprocess
import logging
import json
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def detect_video_devices():
    """Detect available /dev/video* devices."""
    video_devices = []
    video_dir = Path('/dev')

    if not video_dir.exists():
        logger.warning("Could not access /dev directory")
        return video_devices

    # Find all video devices
    for device in sorted(video_dir.glob('video*')):
        if device.is_char_device():
            video_devices.append(str(device))

    return video_devices

def get_device_info(device_path):
    """Get information about a video device using v4l2-ctl."""
    try:
        # Get device info
        result = subprocess.run(
            ['v4l2-ctl', '--device', device_path, '--info'],
            capture_output=True, text=True, timeout=5
        )

        if result.returncode != 0:
            return None

        info = {}
        for line in result.stdout.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                info[key.strip()] = value.strip()

        # Get supported formats
        result = subprocess.run(
            ['v4l2-ctl', '--device', device_path, '--list-formats-ext'],
            capture_output=True, text=True, timeout=5
        )

        if result.returncode == 0:
            info['formats'] = result.stdout

        return info

    except (subprocess.TimeoutExpired, FileNotFoundError, Exception) as e:
        logger.debug(f"Could not get info for {device_path}: {e}")
        return None

def test_device_access(device_path):
    """Test if device can be opened for reading."""
    try:
        # Try to read basic info using GStreamer
        result = subprocess.run([
            'gst-launch-1.0', '--gst-debug-level=0',
            'v4l2src', f'device={device_path}', '!',
            'videoconvert', '!', 'fakesink', 'num-buffers=1'
        ], capture_output=True, timeout=10)

        return result.returncode == 0
    except Exception:
        return False

def main():
    """Main camera detection routine."""
    print("🔍 Detecting available cameras...")
    print("=" * 50)

    devices = detect_video_devices()

    if not devices:
        print("❌ No video devices found in /dev")
        return

    print(f"📹 Found {len(devices)} video device(s):")

    working_devices = []

    for device in devices:
        print(f"\n📱 {device}:")

        # Check device info
        info = get_device_info(device)
        if info:
            if 'Card' in info:
                print(f"   📝 Name: {info['Card']}")
            if 'Driver' in info:
                print(f"   🔧 Driver: {info['Driver']}")
        else:
            print("   ❌ Could not retrieve device info (may require v4l2-ctl)")

        # Test access
        if test_device_access(device):
            print("   ✅ Device accessible via GStreamer")
            working_devices.append(device)
        else:
            print("   ⚠️  Device may not be accessible or busy")

    print("\n" + "=" * 50)
    print("📋 SUMMARY:")

    if working_devices:
        print(f"✅ {len(working_devices)} working camera(s) detected:")
        for device in working_devices:
            print(f"   • {device}")

        print(f"\n🔧 Example configuration for .env:")
        print(f"CAMERA_PRIMARY_DEVICE={working_devices[0]}")
        if len(working_devices) > 1:
            print(f"CAMERA_SECONDARY_DEVICE={working_devices[1]}")
            print(f"CAMERA_NUM_STREAMS=2")
        else:
            print(f"CAMERA_NUM_STREAMS=1")
    else:
        print("❌ No working cameras detected")
        print("   Check that:")
        print("   • Camera devices are connected")
        print("   • User has permission to access /dev/video* devices")
        print("   • Run: sudo chmod a+rw /dev/video*")

if __name__ == '__main__':
    main()