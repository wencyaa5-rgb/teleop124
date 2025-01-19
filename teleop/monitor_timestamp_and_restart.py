import time
import subprocess
import requests
import logging
import json

from util import BUBBLE_API_GET_TIMESTAMP_URL, BUBBLE_API_GET_ROBOT_URL, generate_robot_id, get_mac_address

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# TODO: move bearer token to a secure source
BEARER_TOKEN = 'fb4a1a4c486cec5708f906e90b7c040d'
MAC_ADDRESS = get_mac_address()
ROBOT_ID = generate_robot_id(MAC_ADDRESS)
GSTREAMER_SCRIPT = 'gstreamer_webrtc.py'
JOYSTICK_SCRIPT = 'joystick_webrtc.js'

ROBOT_JSON_FILE = 'robot.json'


def get_last_request_time():
    """Fetches the last peer connection request timestamp from the Bubble API."""
    headers = {
        'Authorization': f'Bearer {BEARER_TOKEN}',
        'Content-Type': 'application/json'
    }
    params = {'id': ROBOT_ID}
    try:
        response = requests.get(BUBBLE_API_GET_TIMESTAMP_URL, headers=headers, params=params)
        if response.status_code == 200:
            data = response.json()
            if not data['response']:
                # This means no request had been made yet
                logger.info(f"No request found for ROBOT_ID: {ROBOT_ID}")
                return None
            return data['response']['last_request_time']  # Adjust this if the field name is different
        else:
            logger.error(f"Failed to retrieve last request time: {response.status_code} {response.text}")
            return None
    except Exception as e:
        logger.error(f"Error fetching last request time: {e}")
        return None

def get_robot(robot_id):
    """Fetches the Robot object from the API."""
    headers = {
        "Authorization": f"Bearer {BEARER_TOKEN}",
        # "Content-Type": "application/json"
    }
    url = f"{BUBBLE_API_GET_ROBOT_URL}/robot"
    constraints = [
        {
        "key": "id_text",                # The field in Bubble you want to match
        "constraint_type": "equals",
        "value": robot_id
        }
    ]
    params = {
        "constraints": json.dumps(constraints)
    }
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()  # Raise error for HTTP codes 4xx/5xx
        data = response.json()  # Parse JSON response

        # Check if the response contains items
        results = data.get("response", {}).get("results", [])
        if results:
            return results[0]  # Return the first item
        else:
            print("No results found.")
            return None
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err} - Response: {response.text}")
    except Exception as err:
        print(f"An error occurred: {err}")
    return None

def restart_gstreamer_script():
    """Restarts the GStreamer script."""
    try:
        logger.info("Restarting GStreamer script...")
        # Terminating the existing script will trigger supervisord to repawn the process
        subprocess.run(['pkill', '-f', GSTREAMER_SCRIPT], check=False)
        logger.info("GStreamer script restarted.")
    except Exception as e:
        logger.error(f"Error restarting GStreamer script: {e}")

def restart_joystick_script():
    """Restarts the Joystick script."""
    try:
        logger.info("Restarting Joystick script...")
        # Terminating the existing script will trigger supervisord to repawn the process
        subprocess.run(['pkill', '-f', JOYSTICK_SCRIPT], check=False)
        logger.info("Joystick script restarted.")
    except Exception as e:
        logger.error(f"Error restarting Joystick script: {e}")

def write_robot_to_file(robot_data):
    """Writes the robot object to a JSON file."""
    try:
        with open(ROBOT_JSON_FILE, 'w') as file:
            json.dump(robot_data, file, indent=4)
        logger.info(f"Robot data written to {ROBOT_JSON_FILE}.")
    except Exception as e:
        logger.error(f"Error writing robot data to file: {e}")

def monitor_timestamp():
    """Monitors the timestamp and restarts the GStreamer and Joystick scripts if the timestamp changes."""
    previous_timestamp = None
    while True:
        current_timestamp = get_last_request_time()
        if current_timestamp is not None:
            if current_timestamp != previous_timestamp:
                logger.info(f"Timestamp changed to {current_timestamp}. Restarting GStreamer and Joystick scripts.")
                restart_gstreamer_script()
                time.sleep(1)
                restart_joystick_script()

                # Fetch robot workspace_pixels and write to file
                robot_data = get_robot(ROBOT_ID)
                write_robot_to_file(robot_data)

                previous_timestamp = current_timestamp
        time.sleep(10)  # Check the timestamp every 10 seconds

if __name__ == "__main__":
    monitor_timestamp()
