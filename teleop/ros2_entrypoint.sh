#!/bin/bash

# Source the ROS 2 setup script
source /opt/ros/humble/setup.bash
source /opt/ros/humble/share/ros_environment/local_setup.bash

# source ros2 workspace used for installing rosimagesrc
source /opt/app/ros2_ws/install/setup.bash

# Start the rosbridge server
# ros2 launch rosbridge_server rosbridge_websocket_launch.xml