## Docker managed through VSCode + DevContainer
* .devcontainer/ contains the `devcontainer.json` file that defines things like the postRunCommand that ensures
ros2 workspace is installed with necessary dependencies such as MoveIt, built and sourced proiperly
*  `./teleop` directory contains everything that goes into the teleoperation services, which sets up WebRTC peer2peer connection between robot and the end user's browser over internet


## Starting Docker Container
* Ensure there's a `.env` file like the following that names the robot, which the container uses for generating a hashed 1:1 mapped robot id. For example,
```
unloader@unloader-alienware-2:~/teleop$ cat .env
ROBOT_ID=unloader-alienware-2
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