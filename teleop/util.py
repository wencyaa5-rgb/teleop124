import os
import socket
import uuid
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# TODO: enable separation of dev and live environment
# Bubble API endpoint URLs
# BUBBLE_API_GET_TIMESTAMP_URL = 'https://service.intuitivemotion.ai/version-test/api/1.1/wf/last_robot_connection_request_time'  # New endpoint
# BUBBLE_API_POST_STATUS_URL = 'https://service.intuitivemotion.ai/version-test/api/1.1/wf/robots'

BUBBLE_API_GET_TIMESTAMP_URL = 'https://service.intuitivemotion.ai/api/1.1/wf/last_robot_connection_request_time'  # New endpoint
BUBBLE_API_POST_STATUS_URL = 'https://service.intuitivemotion.ai/api/1.1/wf/robots'

# GStreamer pipeline description
# PIPELINE_DESC = '''
# v4l2src device=/dev/video4 ! videoconvert ! vp8enc target-bitrate=500000 deadline=1 cpu-used=5 ! rtpvp8pay ! application/x-rtp,media=video,encoding-name=VP8,payload=96 ! webrtcbin name=sendrecv stun-server=stun://stun.l.google.com:19302 latency=100 turn-server=turn://your.turn.server:3478?transport=udp
# '''

PIPELINE_DESC = '''
webrtcbin name=sendrecv stun-server=stun://stun.l.google.com:19302 turn-server=turn://your.turn.server:3478?transport=udp latency=100 
v4l2src device=/dev/video4 ! videoconvert ! queue ! vp8enc target-bitrate=500000 deadline=1 cpu-used=5 ! rtpvp8pay ! application/x-rtp,media=video,encoding-name=VP8,payload=96 ! sendrecv.
v4l2src device=/dev/video14 ! videoconvert ! queue ! vp8enc target-bitrate=500000 deadline=1 cpu-used=5 ! rtpvp8pay ! application/x-rtp,media=video,encoding-name=VP8,payload=97 ! sendrecv.
'''


def get_mac_address():
    try:
        mac = open('/sys/class/net/eth0/address').readline()
    except:
        mac = open('/sys/class/net/wlan0/address').readline()
    return mac.strip()

def generate_robot_id(mac_address):
    file_path = os.path.join(os.path.dirname(__file__), 'robot_id.txt')
    
    # Check if the robot_id file exists
    if os.path.exists(file_path):
        with open(file_path, 'r') as file:
            robot_id = file.read().strip()
        print(f"Using existing robot_id: {robot_id}")
        return robot_id

    # Generate new robot_id if the file does not exist
    namespace = uuid.UUID('12345678-1234-5678-1234-567812345678')
    robot_id = str(uuid.uuid5(namespace, mac_address))
    
    with open(file_path, 'w') as file:
        file.write(robot_id)

    print(f"Generated new robot_id: {robot_id}")
    return robot_id

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
