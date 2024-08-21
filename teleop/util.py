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
PIPELINE_DESC = '''
v4l2src device=/dev/video4 ! videoconvert ! vp8enc target-bitrate=500000 deadline=1 cpu-used=5 ! rtpvp8pay ! application/x-rtp,media=video,encoding-name=VP8,payload=96 ! webrtcbin name=sendrecv stun-server=stun://stun.l.google.com:19302 latency=100 turn-server=turn://your.turn.server:3478?transport=udp
'''

def get_mac_address():
    try:
        mac = open('/sys/class/net/eth0/address').readline()
    except:
        mac = open('/sys/class/net/wlan0/address').readline()
    return mac.strip()

def generate_robot_id(mac_address):
    namespace = uuid.UUID('12345678-1234-5678-1234-567812345678')  # Example namespace UUID
    return str(uuid.uuid5(namespace, mac_address))

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
