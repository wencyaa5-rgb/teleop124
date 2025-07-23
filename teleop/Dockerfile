# ─────────────────────────  BASE IMAGE  ──────────────────────────
# Ubuntu 22.04 + ROS Humble
FROM osrf/ros:humble-desktop

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# ─────────────────────────  SYSTEM DEPS  ─────────────────────────
# Install necessary dependencies
COPY apt-requirements.txt /app/apt-requirements.txt
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        # ── python / build tools ───────────────────────────────
        python3-venv build-essential cmake pkg-config \
        python3-gi python3-gi-cairo supervisor \
        # ── gstreamer core & plugins ───────────────────────────
        libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev \
        gir1.2-gstreamer-1.0 gir1.2-gst-plugins-base-1.0 \
        gstreamer1.0-plugins-good gstreamer1.0-plugins-bad \
        gstreamer1.0-tools \
        # ── WebRTC & ICE extras ────────────────────────────────
        libgstreamer-plugins-bad1.0-0         \
        gir1.2-gst-plugins-bad-1.0            \
        gstreamer1.0-nice libnice10 gir1.2-nice-0.1 \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /var/log/supervisor

# ─────────────────────  NODE (if you still need it)  ─────────────
ENV NVM_DIR=/usr/local/nvm  NODE_VERSION=20.15.1
RUN mkdir -p $NVM_DIR && \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && \
    . $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm alias default $NODE_VERSION
ENV PATH=$NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

# ───────────────────────  COPY ENTIRE REPO  ──────────────────────
# build context is repo root
WORKDIR /opt/app
COPY requirements.txt .


# ───── virtual-env + dependency upgrades (done once) ──
ENV VIRTUAL_ENV=/opt/app/venv
RUN python3 -m venv --system-site-packages $VIRTUAL_ENV && \
    $VIRTUAL_ENV/bin/pip install --upgrade pip setuptools wheel packaging && \
    $VIRTUAL_ENV/bin/pip install --no-cache-dir -r requirements.txt
ENV PATH=$VIRTUAL_ENV/bin:$PATH

# copy the ENTIRE repo (incl. ros‑gst‑bridge submodule) last
COPY . .

COPY ./package*.json ./

RUN npm install -g @mapbox/node-pre-gyp && \
    npm install --omit=dev

    
# ─────────────────────────  GST BRIDGE PATH  ─────────────────────
# gst_bridge installs its plugin here after colcon build
ENV GST_PLUGIN_PATH=/opt/app/ros2_ws/install/gst_bridge/lib/gst_bridge:$GST_PLUGIN_PATH

# ───────────────────────  BUILD ROS 2 WORKSPACE  ─────────────────
WORKDIR /opt/app/ros2_ws
RUN . /opt/ros/$ROS_DISTRO/setup.sh && \
    colcon build --symlink-install && \
    . install/setup.sh

# ─────────────────────────  SUPERVISOR ETC  ──────────────────────
WORKDIR /opt/app
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY ros2_entrypoint.sh /opt/app/ros2_entrypoint.sh
RUN chmod +x /opt/app/ros2_entrypoint.sh

EXPOSE 8765 8443 9090
ENTRYPOINT ["/opt/app/ros2_entrypoint.sh"]
