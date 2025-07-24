#!/bin/bash

# Source the ROS 2 setup script
source /opt/ros/humble/setup.bash
source /opt/ros/humble/share/ros_environment/local_setup.bash

# Navigate to the workspace directory
cd /opt/app/ros2_ws

echo "================="
echo "Building ros2 workspace"
colcon build
echo "Finished build"
echo "================="

# source ros2 workspace used for installing rosimagesrc
source /opt/app/ros2_ws/install/setup.bash

cd /opt/app/
npx generate-ros-messages

# Start the rosbridge server
# ros2 launch rosbridge_server rosbridge_websocket_launch.xml

# Start supervisord
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf