# Use the official Ubuntu base image
# ROS2 Humble supports 22.04
FROM osrf/ros:humble-desktop

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 20.15.1

# Install necessary dependencies
COPY apt-requirements.txt /app/apt-requirements.txt
RUN apt-get update && \
    grep -vE "^\s*#" /app/apt-requirements.txt | xargs apt-get install -y && \
    apt-get install -y libgirepository1.0-dev libgstreamer-plugins-bad1.0-dev supervisor && \
    apt-get clean

RUN mkdir -p /var/log/supervisor

# installs nvm (Node Version Manager)
RUN mkdir $NVM_DIR && \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && \
    . $NVM_DIR/nvm.sh && \
    nvm install $NODE_VERSION && \
    nvm alias default $NODE_VERSION && \
    nvm use default

ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

# Set the working directory
WORKDIR /opt/app

# Create a virtual environment
RUN python3.10 -m venv /opt/app/venv
# Activate the virtual environment
ENV VIRTUAL_ENV /env
ENV PATH="/opt/app/venv/bin:$PATH"

# Copy the requirements file and install dependencies
COPY requirements.txt /opt/app/requirements.txt
RUN pip install --upgrade wheel pip setuptools
RUN pip install -r /opt/app/requirements.txt

# Copy the package.json and package-lock.json files
COPY . /opt/app/

# Run the entry point script to set up the environment and install Node.js dependencies
RUN . /opt/ros/${ROS_DISTRO}/setup.sh && \
    npm install -g node-pre-gyp && \
    npm install

# Build the ROS2 workspace and source it
WORKDIR /opt/app/ros2_ws
RUN . /opt/ros/${ROS_DISTRO}/setup.sh && colcon build && . /opt/app/ros2_ws/install/setup.sh
RUN . /opt/ros/${ROS_DISTRO}/setup.sh && colcon build && . /opt/app/ros2_ws/install/setup.sh >> ~/.bashrc
# ENV GST_PLUGIN_PATH=/opt/app/ros2_ws/install/gst_bridge/lib/gst_bridge:$GST_PLUGIN_PATH

# Set the working directory back to /opt/app
WORKDIR /opt/app

# Copy the ros2_entrypoint.sh script into the container
COPY ros2_entrypoint.sh /opt/app/ros2_entrypoint.sh

# Make it executable
RUN chmod +x /opt/app/ros2_entrypoint.sh

# Copy the supervisor configuration file
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose ports if needed
EXPOSE 8765 8443 9090

# Use the new script as the entry point
# CMD ["/opt/app/ros2_entrypoint.sh"]

ENTRYPOINT ["/opt/app/ros2_entrypoint.sh"]

