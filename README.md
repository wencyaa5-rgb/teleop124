## Docker managed through VSCode + DevContainer
* .devcontainer/ contains the `devcontainer.json` file that defines things like the postRunCommand that ensures
ros2 workspace is installed with necessary dependencies such as MoveIt, built and sourced proiperly
*  `./teleop` directory contains everything that goes into the teleoperation services, which sets up WebRTC peer2peer connection between robot and the end user's browser over internet


## Starting Docker Container
* Ensure there's a `.env` file that configures the robot and cameras. The container uses ROBOT_ID for generating a hashed 1:1 mapped robot id. For example,
```bash
# Copy and customize the example configuration
cp .env.example .env

# Example .env file:
ROBOT_ID=unloader-alienware-2
CAMERA_MODE=v4l2
CAMERA_PRIMARY_DEVICE=/dev/video0
CAMERA_NUM_STREAMS=1
```

* **Camera Configuration**: The system now supports flexible camera configuration through environment variables:
  - `CAMERA_MODE`: Choose between `v4l2` (webcams), `ros` (ROS topics), or `mixed`
  - `CAMERA_PRIMARY_DEVICE`: Primary video device (e.g., `/dev/video0`)
  - `CAMERA_NUM_STREAMS`: Number of video streams (1-4)
  - See `.env.example` for all available camera options

* **Detect Available Cameras**: Use the detection script to find your camera devices:
```bash
cd teleop
python detect_cameras.py
```

* To start the container,
```
docker compose build teleop
docker compose up -d teleop
```

# Systemd setup
`sudo nano /etc/systemd/system/docker-compose-robot.service` and paste in the content under `systemd/docker-compose-robot.service`. Make sure to replace "cecilia" with the actual name of the user. *TODO: in the future make a quickstart script to do this automatically on a new machine*

Helpful commands to check for errors,

```
docker exec -it teleop_service /bin/bash
sudo journalctl -u docker-compose-robot.service -n 20 -f
```

# Manual start
navigate into `intuitivemotion/robot` directory and run `docker-compose build --no-cache && docker-compose down && docker-compose up`


## Troubleshooting

If you see Permission denied for accessing /dev/video* devices in ros2_service, run `sudo chmod a+rw /dev/video*` 