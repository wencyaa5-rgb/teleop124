# WebRTC连接问题诊断与解决方案

## 📋 问题概述

停电后WebRTC无法正常连接，虽然ICE连接状态显示"connected"和"completed"，但视频流没有播放。

## 🔍 问题分析

### 1. 关键错误信息

从日志中发现以下关键问题：

#### 前端Console日志（第652行）：
```
useWebRTC.js:50 Websocket received message {type: 'ERROR', message: 'Session already established'}
```

**问题说明**：Signaling server认为会话已经存在，拒绝建立新连接。这通常发生在：
- 停电前没有正确关闭连接
- Signaling server保留了旧的会话状态
- 多个客户端尝试连接到同一个roomId

#### 数据通道状态（第526-570行）：
```
Data channel is open
Low-priority bounding box channel is open
...
Data channel is closed
Low-priority bounding box channel is closed
```

**问题说明**：数据通道打开后立即关闭，表明WebRTC连接不稳定。

#### ICE连接状态（第202、285行）：
```
INFO:root:ICE connection state changed: connected
INFO:root:ICE connection state changed: completed
```

**问题说明**：虽然ICE连接完成，但视频流没有显示，可能是：
- SDP协商有问题
- 视频轨道没有正确添加
- 前端没有正确接收视频流

### 2. 可能的原因

#### 原因1：Signaling Server会话残留（最可能）
- **症状**：前端收到"Session already established"错误
- **原因**：停电时连接没有正确关闭，signaling server保留了旧的会话状态
- **影响**：阻止新会话建立

#### 原因2：容器内代码未同步
- **症状**：虽然ICE连接完成，但视频流不显示
- **原因**：停电前修改的代码可能没有正确复制到容器内
- **影响**：代码版本不一致导致功能异常

#### 原因3：多个Offer/Answer交换冲突
- **症状**：日志显示多次offer/answer交换
- **原因**：机器人端和远程控制端都发送offer，导致会话冲突
- **影响**：WebRTC协商失败

## 🛠️ 解决方案

### 方案1：清理Signaling Server会话（优先尝试）

#### 步骤1：完全停止所有进程

**在机器人客户端终端**（运行`gstreamer_webrtc.py`的终端）：
```bash
# 按 Ctrl+C 停止进程
# 如果进程已经停止，跳过此步
```

**在远程控制端终端**（运行`joystick_webrtc.js`的终端）：
```bash
# 按 Ctrl+C 停止进程
# 如果进程已经停止，跳过此步
```

**在前端浏览器**：
```bash
# 点击页面上的 "Stop" 按钮
# 或者关闭浏览器标签页
```

#### 步骤2：等待30-60秒

让signaling server自动清理旧的会话状态。

#### 步骤3：重新启动所有进程

**启动顺序很重要！**

1. **首先启动机器人客户端**（在SSH终端1）：
```bash
ssh unloader@unloader1
docker ps
docker exec -it teleop /bin/bash
source /opt/ros/humble/setup.bash
source ros2_ws/install/setup.bash
python gstreamer_webrtc.py
```

2. **然后启动远程控制端**（在SSH终端2）：
```bash
ssh unloader@unloader1
docker exec -it teleop /bin/bash
source /opt/ros/humble/setup.bash
source ros2_ws/install/setup.bash
node joystick_webrtc.js
```

3. **最后在前端点击Start按钮**

**重要**：必须按照这个顺序启动，否则会出现会话冲突。

### 方案2：验证容器内代码同步

#### 步骤1：检查容器内文件是否存在

在SSH终端运行：
```bash
ssh unloader@unloader1
docker exec teleop ls -la /opt/app/gstreamer_webrtc.py
docker exec teleop ls -la /opt/app/joystick_webrtc.js
docker exec teleop cat /opt/app/robot_id.txt
```

#### 步骤2：比较文件MD5值

**在本地机器**（你的开发机器）：
```bash
md5sum /home/unloader/teleop/teleop/gstreamer_webrtc.py
md5sum /home/unloader/teleop/teleop/joystick_webrtc.js
```

**在远程主机**（SSH到unloader1）：
```bash
ssh unloader@unloader1
docker exec teleop md5sum /opt/app/gstreamer_webrtc.py
docker exec teleop md5sum /opt/app/joystick_webrtc.js
```

**如果MD5值不一致**，说明容器内代码没有同步，需要重新复制文件。

#### 步骤3：同步文件到容器（如果需要）

**方法A：通过docker cp复制文件**

在SSH终端运行：
```bash
ssh unloader@unloader1
cd ~/teleop/teleop

# 复制gstreamer_webrtc.py
docker cp gstreamer_webrtc.py teleop:/opt/app/gstreamer_webrtc.py

# 复制joystick_webrtc.js
docker cp joystick_webrtc.js teleop:/opt/app/joystick_webrtc.js

# 复制robot_id.txt（如果存在）
docker cp robot_id.txt teleop:/opt/app/robot_id.txt
```

**方法B：重新构建镜像**（如果文件很多）

```bash
ssh unloader@unloader1
cd ~/teleop/teleop
docker compose down
docker compose build
docker compose up -d
```

**注意**：根据你的要求，不要使用`--no-cache`参数。

### 方案3：检查robot_id.txt文件

#### 步骤1：确认robot_id.txt存在且内容正确

在SSH终端运行：
```bash
ssh unloader@unloader1
docker exec teleop cat /opt/app/robot_id.txt
```

**应该看到**：
```
e07112f2-74f0-5535-812f-1ae53c16c3f0
```

#### 步骤2：如果文件不存在或内容错误

在SSH终端运行：
```bash
ssh unloader@unloader1
docker exec teleop bash -c "echo 'e07112f2-74f0-5535-812f-1ae53c16c3f0' > /opt/app/robot_id.txt"
docker exec teleop cat /opt/app/robot_id.txt
```

### 方案4：检查摄像头设备

#### 步骤1：确认摄像头设备存在

在SSH终端运行：
```bash
ssh unloader@unloader1
ls -l /dev/video*
```

#### 步骤2：检查docker-compose.yml中的设备映射

查看`/home/unloader/teleop/teleop/docker-compose.yml`，确认设备映射正确：
```yaml
devices:
  - "/dev/video4:/dev/video4"
```

**注意**：根据你的docker-compose.yml，容器映射的是`/dev/video4`，但日志中显示检查的是`/dev/video0`。请确认：
1. 实际使用的摄像头设备是哪个（`/dev/video0`还是`/dev/video4`）
2. docker-compose.yml中的映射是否正确

### 方案5：重启容器（如果以上方案都不行）

#### 步骤1：停止容器

```bash
ssh unloader@unloader1
cd ~/teleop/teleop
docker compose down
```

#### 步骤2：重新启动容器

```bash
docker compose up -d
```

#### 步骤3：重新启动所有进程

按照"方案1"中的步骤3重新启动所有进程。

## 📝 详细操作步骤（推荐流程）

### 完整重启流程

1. **停止所有进程**
   - 机器人客户端：Ctrl+C
   - 远程控制端：Ctrl+C
   - 前端：点击Stop按钮

2. **等待30秒**（让signaling server清理会话）

3. **验证容器内代码**（可选但推荐）
   ```bash
   ssh unloader@unloader1
   docker exec teleop cat /opt/app/robot_id.txt
   ```

4. **启动机器人客户端**（SSH终端1）
   ```bash
   ssh unloader@unloader1
   docker exec -it teleop /bin/bash
   source /opt/ros/humble/setup.bash
   source ros2_ws/install/setup.bash
   python gstreamer_webrtc.py
   ```
   
   **等待看到**：
   ```
   INFO:root:Connected to signaling server
   INFO:root:Sent join-room message with roomId: e07112f2-74f0-5535-812f-1ae53c16c3f0
   INFO:root:Starting pipeline
   INFO:root:Pipeline started successfully
   ```

5. **启动远程控制端**（SSH终端2）
   ```bash
   ssh unloader@unloader1
   docker exec -it teleop /bin/bash
   source /opt/ros/humble/setup.bash
   source ros2_ws/install/setup.bash
   node joystick_webrtc.js
   ```
   
   **等待看到**：
   ```
   Connected to the signaling server
   Sent join-room message with roomId: e07112f2-74f0-5535-812f-1ae53c16c3f0
   ```

6. **在前端点击Start按钮**

7. **观察日志**

   **机器人客户端应该显示**：
   ```
   INFO:root:ICE connection state changed: connected
   INFO:root:ICE connection state changed: completed
   ```

   **远程控制端应该显示**：
   ```
   Data channel is open
   Low-priority bounding box channel is open
   ```

   **前端Console应该显示**：
   ```
   ICE connection state: connected
   Data channel is open
   ```

8. **检查视频流**

   前端应该显示视频播放。如果没有，检查：
   - 浏览器Console是否有错误
   - 机器人客户端日志是否有错误
   - 摄像头设备是否正确映射

## ⚠️ 关于代码同步的说明

### 停电不会导致已保存的文件丢失

**重要**：停电**不会**导致已经保存到磁盘的文件丢失。如果文件已经保存到：
- 本地文件系统（`/home/unloader/teleop/teleop/`）
- Git仓库
- 其他持久化存储

那么文件不会因为停电而丢失。

### 但是容器内的文件可能不同步

**问题**：Docker容器内的文件是**独立的文件系统**。如果你修改了宿主机上的文件，但没有：
1. 重新构建镜像
2. 使用`docker cp`复制文件
3. 使用volume挂载

那么容器内的文件**不会自动更新**。

### 如何确认代码是否同步

使用MD5值比较（见"方案2"），这是最可靠的方法。

## 🔧 故障排查检查清单

- [ ] 所有进程都已停止（机器人客户端、远程控制端、前端）
- [ ] 等待30-60秒让signaling server清理会话
- [ ] robot_id.txt文件存在且内容正确
- [ ] 容器内代码与宿主机代码一致（MD5值相同）
- [ ] 摄像头设备正确映射（检查docker-compose.yml）
- [ ] 按照正确顺序启动进程（机器人客户端 → 远程控制端 → 前端）
- [ ] 没有"Session already established"错误
- [ ] ICE连接状态为"connected"或"completed"
- [ ] 数据通道状态为"open"
- [ ] 视频流正常播放

## 📞 如果问题仍然存在

如果按照以上步骤操作后问题仍然存在，请提供：

1. **最新的完整日志**（三个终端的完整输出）
2. **前端Console的完整输出**（包括所有错误和警告）
3. **容器内文件的MD5值**（用于确认代码同步）
4. **docker-compose.yml的内容**（确认设备映射）
5. **摄像头设备列表**（`ls -l /dev/video*`的输出）

## 💡 预防措施

为了避免将来再次出现类似问题：

1. **使用Git版本控制**：确保所有代码修改都提交到Git
2. **使用Volume挂载**：在docker-compose.yml中使用volume挂载代码目录，这样修改会自动同步
3. **正确关闭连接**：测试完成后，按照正确顺序关闭所有进程
4. **定期备份**：定期备份重要配置文件和代码


