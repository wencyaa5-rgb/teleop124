# when adding a new script
1. add python dependencies to requirements.txt and apt dependencies to apt-requirements.txt
2. add script config to supervisord.conf to be started automatically by docker

# Camera Configuration

The teleop system now supports configurable cameras through environment variables. No more manual editing of code files!

## Quick Setup

1. **Detect available cameras:**
   ```bash
   python detect_cameras.py
   ```

2. **Configure cameras in your .env file:**
   ```bash
   # Copy example configuration
   cp .env.example .env

   # Edit with your camera settings
   nano .env
   ```

## Camera Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CAMERA_MODE` | `v4l2` | Camera mode: `v4l2`, `ros`, or `mixed` |
| `CAMERA_PRIMARY_DEVICE` | `/dev/video6` | Primary webcam device |
| `CAMERA_SECONDARY_DEVICE` | `/dev/video14` | Secondary webcam device |
| `CAMERA_WIDTH` | `640` | Video stream width |
| `CAMERA_HEIGHT` | `360` | Video stream height |
| `CAMERA_TARGET_BITRATE` | `300000` | Target bitrate for encoding |
| `CAMERA_CPU_USED` | `8` | VP8 encoder CPU usage (0=slow, 16=fast) |
| `CAMERA_NUM_STREAMS` | `1` | Number of video streams (1-4) |
| `CAMERA_ROS_TOPIC_1` | `/camera/camera_1/color/image_raw` | First ROS image topic |
| `CAMERA_ROS_TOPIC_2` | `/camera/camera_2/color/image_raw` | Second ROS image topic |
| `CAMERA_ROS_TOPIC_3` | `/camera/camera_3/color/image_raw` | Third ROS image topic |

### Camera Modes

- **`v4l2`**: Use USB webcams or V4L2 compatible devices
- **`ros`**: Use ROS image topics (requires ros-gst-bridge)
- **`mixed`**: Primary webcam + additional ROS image topics

## Example Configurations

### Single Webcam
```bash
CAMERA_MODE=v4l2
CAMERA_PRIMARY_DEVICE=/dev/video0
CAMERA_NUM_STREAMS=1
```

### Dual Webcam Setup
```bash
CAMERA_MODE=v4l2
CAMERA_PRIMARY_DEVICE=/dev/video0
CAMERA_SECONDARY_DEVICE=/dev/video2
CAMERA_NUM_STREAMS=2
```

### ROS Camera Setup
```bash
CAMERA_MODE=ros
CAMERA_NUM_STREAMS=3
CAMERA_ROS_TOPIC_1=/camera/front/color/image_raw
CAMERA_ROS_TOPIC_2=/camera/wrist/color/image_raw
CAMERA_ROS_TOPIC_3=/camera/overhead/color/image_raw
```

### Mixed Setup (Webcam + ROS)
```bash
CAMERA_MODE=mixed
CAMERA_PRIMARY_DEVICE=/dev/video0
CAMERA_NUM_STREAMS=3
CAMERA_ROS_TOPIC_1=/camera/wrist/color/image_raw
CAMERA_ROS_TOPIC_2=/camera/overhead/color/image_raw
```

# Troubleshooting guide

## Camera Issues

1. **Camera detection:** Use `python detect_cameras.py` to find available video devices

2. **Permission issues:** If cameras aren't accessible, run:
   ```bash
   sudo chmod a+rw /dev/video*
   ```

3. **Device changes:** When hardware changes, update your `.env` file instead of editing code

4. **Testing configuration:** Check logs during startup to see generated GStreamer pipeline
