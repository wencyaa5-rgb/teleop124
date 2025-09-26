import os
import socket
import uuid
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# TODO: enable separation of dev and live environment
# Bubble API endpoint URLs
# BUBBLE_API_GET_TIMESTAMP_URL = 'https://service.intuitivemotion.ai/version-test/api/1.1/wf/last_robot_connection_request_time'  # New endpoint
# BUBBLE_API_POST_STATUS_URL = 'https://service.intuitivemotion.ai/version-test/api/1.1/wf/robots'

BUBBLE_API_GET_TIMESTAMP_URL = 'https://service.intuitivemotion.ai/api/1.1/wf/last_robot_connection_request_time'  # New endpoint
BUBBLE_API_POST_STATUS_URL = 'https://service.intuitivemotion.ai/api/1.1/wf/robots'
BUBBLE_API_GET_ROBOT_URL = 'https://service.intuitivemotion.ai/api/1.1/obj'

# GStreamer pipeline description
# PIPELINE_DESC = '''
# v4l2src device=/dev/video4 ! videoconvert ! vp8enc target-bitrate=500000 deadline=1 cpu-used=5 ! rtpvp8pay ! application/x-rtp,media=video,encoding-name=VP8,payload=96 ! webrtcbin name=sendrecv stun-server=stun://stun.l.google.com:19302 latency=100 turn-server=turn://your.turn.server:3478?transport=udp
# '''

# PIPELINE_DESC = '''
# webrtcbin name=sendrecv stun-server=stun://stun.l.google.com:19302 turn-server=turn://your.turn.server:3478?transport=udp latency=100 
# v4l2src device=/dev/video5 ! videoconvert ! queue ! vp8enc target-bitrate=500000 deadline=1 cpu-used=5 ! rtpvp8pay ! application/x-rtp,media=video,encoding-name=VP8,payload=96 ! sendrecv.
# v4l2src device=/dev/video14 ! videoconvert ! queue ! vp8enc target-bitrate=500000 deadline=1 cpu-used=5 ! rtpvp8pay ! application/x-rtp,media=video,encoding-name=VP8,payload=97 ! sendrecv.
# '''
# Camera configuration defaults
CAMERA_DEFAULTS = {
    'primary_device': '/dev/video6',
    'secondary_device': '/dev/video14',
    'width': 640,
    'height': 360,
    'target_bitrate': 300000,
    'cpu_used': 8,
    'num_streams': 1
}

def get_camera_config():
    """Get camera configuration from environment variables with fallback to defaults."""
    config = {}
    config['primary_device'] = os.getenv('CAMERA_PRIMARY_DEVICE', CAMERA_DEFAULTS['primary_device'])
    config['secondary_device'] = os.getenv('CAMERA_SECONDARY_DEVICE', CAMERA_DEFAULTS['secondary_device'])
    config['width'] = int(os.getenv('CAMERA_WIDTH', CAMERA_DEFAULTS['width']))
    config['height'] = int(os.getenv('CAMERA_HEIGHT', CAMERA_DEFAULTS['height']))
    config['target_bitrate'] = int(os.getenv('CAMERA_TARGET_BITRATE', CAMERA_DEFAULTS['target_bitrate']))
    config['cpu_used'] = int(os.getenv('CAMERA_CPU_USED', CAMERA_DEFAULTS['cpu_used']))
    config['num_streams'] = int(os.getenv('CAMERA_NUM_STREAMS', CAMERA_DEFAULTS['num_streams']))

    # Support for ROS image sources
    config['ros_topic_1'] = os.getenv('CAMERA_ROS_TOPIC_1', '/camera/camera_1/color/image_raw')
    config['ros_topic_2'] = os.getenv('CAMERA_ROS_TOPIC_2', '/camera/camera_2/color/image_raw')
    config['ros_topic_3'] = os.getenv('CAMERA_ROS_TOPIC_3', '/camera/camera_3/color/image_raw')

    # Camera mode: 'v4l2', 'ros', or 'mixed'
    config['camera_mode'] = os.getenv('CAMERA_MODE', 'v4l2')

    return config

def generate_pipeline_desc():
    """Generate GStreamer pipeline description based on camera configuration."""
    config = get_camera_config()

    pipeline_base = '''webrtcbin name=sendrecv stun-server=stun://stun.l.google.com:19302 turn-server=turn://your.turn.server:3478?transport=udp latency=100 '''

    streams = []

    if config['camera_mode'] == 'v4l2':
        # V4L2 camera sources
        for i in range(config['num_streams']):
            device = config['primary_device'] if i == 0 else config['secondary_device']
            payload = 96 + i
            stream = f'''v4l2src device={device} ! videoconvert ! videoscale ! video/x-raw,width={config['width']},height={config['height']} ! queue ! vp8enc target-bitrate={config['target_bitrate']} deadline=1 cpu-used={config['cpu_used']} ! rtpvp8pay ! application/x-rtp,media=video,encoding-name=VP8,payload={payload} ! sendrecv.'''
            streams.append(stream)

    elif config['camera_mode'] == 'ros':
        # ROS image topic sources
        topics = [config['ros_topic_1'], config['ros_topic_2'], config['ros_topic_3']]
        for i in range(min(config['num_streams'], len(topics))):
            payload = 97 + i
            stream = f'''rosimagesrc ros-topic="{topics[i]}" ! videoconvert ! queue ! vp8enc target-bitrate={config['target_bitrate']} deadline=1 cpu-used={config['cpu_used']} ! rtpvp8pay ! application/x-rtp,media=video,encoding-name=VP8,payload={payload} ! sendrecv.'''
            streams.append(stream)

    elif config['camera_mode'] == 'mixed':
        # Mixed: primary v4l2 + secondary ROS topics
        # Primary v4l2 stream
        stream = f'''v4l2src device={config['primary_device']} ! videoconvert ! videoscale ! video/x-raw,width={config['width']},height={config['height']} ! queue ! vp8enc target-bitrate={config['target_bitrate']} deadline=1 cpu-used={config['cpu_used']} ! rtpvp8pay ! application/x-rtp,media=video,encoding-name=VP8,payload=96 ! sendrecv.'''
        streams.append(stream)

        # Additional ROS streams
        topics = [config['ros_topic_1'], config['ros_topic_2'], config['ros_topic_3']]
        for i in range(min(config['num_streams'] - 1, len(topics))):
            payload = 97 + i
            stream = f'''rosimagesrc ros-topic="{topics[i]}" ! videoconvert ! queue ! vp8enc target-bitrate={config['target_bitrate']} deadline=1 cpu-used={config['cpu_used']} ! rtpvp8pay ! application/x-rtp,media=video,encoding-name=VP8,payload={payload} ! sendrecv.'''
            streams.append(stream)

    pipeline_desc = pipeline_base + ' \\\n'.join(streams)
    logger.info(f"Generated pipeline with {len(streams)} stream(s) in '{config['camera_mode']}' mode")
    return pipeline_desc

# Generate pipeline description on import
PIPELINE_DESC = generate_pipeline_desc()
# PIPELINE_DESC = '''
# webrtcbin name=sendrecv stun-server=stun://stun.l.google.com:19302 turn-server=turn://your.turn.server:3478?transport=udp latency=100 
# v4l2src device=/dev/video6 ! videoconvert ! videoscale ! video/x-raw,width=640,height=360 ! queue ! vp8enc target-bitrate=300000 deadline=1 cpu-used=8 ! rtpvp8pay ! application/x-rtp,media=video,encoding-name=VP8,payload=96 ! sendrecv. \
# rosimagesrc ros-topic="/camera/camera_1/color/image_raw" ! videoconvert ! queue ! vp8enc target-bitrate=500000 deadline=1 cpu-used=8 ! rtpvp8pay ! application/x-rtp,media=video,encoding-name=VP8,payload=97 ! sendrecv. \
# rosimagesrc ros-topic="/camera/camera_2/color/image_raw" ! videoconvert ! queue ! vp8enc target-bitrate=500000 deadline=1 cpu-used=8 ! rtpvp8pay ! application/x-rtp,media=video,encoding-name=VP8,payload=98 ! sendrecv. \
# rosimagesrc ros-topic="/camera/camera_3/color/image_raw" ! videoconvert ! queue ! vp8enc target-bitrate=500000 deadline=1 cpu-used=8 ! rtpvp8pay ! application/x-rtp,media=video,encoding-name=VP8,payload=99 ! sendrecv. \
# '''
# v4l2src device=/dev/video18 ! videoconvert ! videoscale ! video/x-raw,width=640,height=480,framerate=30/1 ! queue ! vp8enc target-bitrate=300000 deadline=1 cpu-used=8 ! rtpvp8pay ! application/x-rtp,media=video,encoding-name=VP8,payload=99 ! sendrecv.

# keep your fixed namespace constant:
_NAMESPACE = uuid.UUID("12345678-1234-5678-1234-567812345678")
_ROBOT_FILE = Path(__file__).with_name("robot_id.txt")

def generate_robot_id() -> str:
    """
    Deterministically derive a UUID‑v5 from the ROBOT_ID env‑var.
    If robot_id.txt exists, return its content (cached value).
    Otherwise create the file with the computed UUID.
    """
    # 1) Return cached value if present
    if _ROBOT_FILE.exists():
        robot_id = _ROBOT_FILE.read_text().strip()
        logging.info("Using cached robot_id: %s", robot_id)
        return robot_id

    # 2) Compute the UUID from the env variable
    name = os.getenv("ROBOT_ID")
    if not name:
        raise RuntimeError("ROBOT_ID environment variable is not set")

    robot_id = str(uuid.uuid5(_NAMESPACE, name))
    logging.info("Generated new robot_id: %s", robot_id)

    # 3) Persist for the next container start
    try:
        _ROBOT_FILE.write_text(robot_id)
    except Exception as e:
        logging.warning("Could not write robot_id.txt: %s", e)

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
