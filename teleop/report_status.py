import requests
import json
import time
import logging
from util import get_mac_address, generate_robot_id, get_ip_address, BUBBLE_API_POST_STATUS_URL

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Function to report status to Bubble
def report_status():
    headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fb4a1a4c486cec5708f906e90b7c040d'  # Replace with your API token
    }

    mac_address = get_mac_address()
    robot_id = generate_robot_id(mac_address)
    logging.info(f"Robot ID: {robot_id}")

    while True:
        ip_address = get_ip_address()
        status = 'active'  # Replace with actual status logic
        data = {
            'id': robot_id,
            'status': status,
            'ip': ip_address,
            'site': '1720904844326x838139993909442300',  # TODO: hardcoded to Harvard, SEC for now, need to change to automatically detect geo location
        }

        try:
            response = requests.post(BUBBLE_API_POST_STATUS_URL, headers=headers, data=json.dumps(data))
            if response.status_code == 200:
                logging.info("Status reported successfully")
            else:
                logging.info(f"Failed to report status: {response.status_code} {response.text}")
        except Exception as e:
            logging.info(f"Error reporting status: {e}")

        time.sleep(60)  # Report every 60 seconds

if __name__ == "__main__":
    report_status()
