import requests
import socket
import json
import time
import uuid
import hashlib

# Function to get the MAC address of the robot
def get_mac_address():
    try:
        mac = open('/sys/class/net/eth0/address').readline()
    except:
        mac = open('/sys/class/net/wlan0/address').readline()
    return mac.strip()

# Function to convert MAC address to UUID
def generate_robot_id(mac_address):
    namespace = uuid.UUID('12345678-1234-5678-1234-567812345678')  # Example namespace UUID
    return str(uuid.uuid5(namespace, mac_address))

# Function to get the IP address of the robot
def get_ip_address():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.254.254.254', 1))
        ip_address = s.getsockname()[0]
    except Exception:
        ip_address = '127.0.0.1'
    finally:
        s.close()
    return ip_address

# Function to report status to Bubble
def report_status():
    url = 'https://service.intuitivemotion.ai/version-test/api/1.1/wf/robots'  # Replace with your Bubble API endpoint URL
    headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fb4a1a4c486cec5708f906e90b7c040d'
    }

    mac_address = get_mac_address()
    robot_id = generate_robot_id(mac_address)
    print(f"Robot ID: {robot_id}")

    while True:
        ip_address = get_ip_address()
        status = 'active'  # Replace with actual status logic
        data = {
            'id': robot_id,
            'status': status,
            'ip': ip_address,
            'site': '1720904844326x838139993909442300', # TODO: hardcoded to Harvard, SEC for now, need to change to automatically detect geo location
        }

        try:
            response = requests.post(url, headers=headers, data=json.dumps(data))
            if response.status_code == 200:
                print("Status reported successfully")
            else:
                print(f"Failed to report status: {response.status_code} {response.text}")
        except Exception as e:
            print(f"Error reporting status: {e}")

        time.sleep(60)  # Report every 60 seconds

if __name__ == "__main__":
    report_status()
