# Use the official Ubuntu base image
# ROS2 Humble supports 22.04
FROM ubuntu:22.04

# Set environment variables
ENV PYTHONUNBUFFERED=1

# this is to avoid getting stuck at step such as geographic config
# example
#  => [ 3/15] RUN apt-get update &&     grep -vE "^\s*#" /app/apt-requirements.txt | xargs apt-get install -y &&     apt-get clean                                                                                                           647.9s
#  => => # questions will narrow this down by presenting a list of cities, representing
#  => => # the time zones in which they are located.
#  => => #   1. Africa      4. Australia  7. Atlantic  10. Pacific  13. Etc
#  => => #   2. America     5. Arctic     8. Europe    11. SystemV
#  => => #   3. Antarctica  6. Asia       9. Indian    12. US
#  => => # Geographic area:
ENV DEBIAN_FRONTEND noninteractive

ENV NVM_DIR /usr/local/nvm
# without mkdir $NVM_DIR, you will see this error
# You have $NVM_DIR set to "/usr/local/nvm", but that directory does not exist. Check your profile files and environment
RUN mkdir $NVM_DIR
ENV NODE_VERSION 20.15.1


# Install necessary dependencies
COPY apt-requirements.txt /app/apt-requirements.txt
RUN apt-get update && \
    grep -vE "^\s*#" /app/apt-requirements.txt | xargs apt-get install -y && \
    apt-get clean
RUN apt-get install -y libgirepository1.0-dev libgstreamer-plugins-bad1.0-dev

# # Install necessary dependencies
# RUN apt-get update && \
#     apt-get install -y software-properties-common && \
#     add-apt-repository ppa:deadsnakes/ppa && \
#     apt-get update && \
#     apt-get install -y \
#     curl \
#     python3.8 \
#     python3.8-venv \
#     python3-pip \
#     git \
#     autoconf \
#     automake \
#     libtool \
#     gstreamer1.0 \
#     gstreamer1.0-tools \
#     gstreamer1.0-x \
#     gstreamer1.0-alsa \
#     gstreamer1.0-gl \
#     gstreamer1.0-gtk3 \
#     gstreamer1.0-qt5 \
#     gstreamer1.0-pulseaudio \
#     libgstreamer1.0-dev \
#     libgstreamer-plugins-base1.0-dev \
#     gstreamer1.0-plugins-base \
#     gstreamer1.0-plugins-good \
#     gstreamer1.0-plugins-bad \
#     gstreamer1.0-plugins-ugly \
#     gstreamer1.0-libav \
#     libgirepository1.0-dev \
#     libcairo2-dev \
#     gir1.2-gstreamer-1.0 \
#     python3-gi \
#     python-gi-dev \
#     pkg-config \
#     supervisor \
#     && apt-get clean


RUN apt-get install -y supervisor
RUN mkdir -p /var/log/supervisor

# installs nvm (Node Version Manager)
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash \
    # need to run .sh file manually to avoid restarting terminal in docker
    && . $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

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
COPY package*.json /opt/app/

# Install Node.js dependencies
RUN npm install -g node-pre-gyp \
    && npm install

# Copy the rest of the application code
COPY . /opt/app/

# Copy the supervisor configuration file
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose ports if needed
EXPOSE 8765 8443

# Run supervisord to start the services
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]