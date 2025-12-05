# WebRTC问题深度排查步骤

## ✅ 已确认的信息

1. **代码已同步**：宿主机和容器内文件MD5值完全一致
   - `gstreamer_webrtc.py`: `b8ab7899218ef40d090a85a568eb3505`
   - `joystick_webrtc.js`: `aceb64f6c527b00b9ab9eea3d1ac7774`

2. **robot_id.txt存在且正确**：`e07112f2-74f0-5535-812f-1ae53c16c3f0`

3. **步骤1已尝试**：清理signaling server会话后问题仍然存在

## 🔍 深度排查步骤

### 步骤1：检查前端是否正确处理ERROR消息

**问题**：前端收到`{type: 'ERROR', message: 'Session already established'}`，但代码中可能没有处理这个错误类型。

**操作**：检查前端代码是否正确处理ERROR消息

在SSH终端运行：
```bash
ssh unloader@unloader1
cat ~/teleop/teleop/react-frontend/src/hooks/useWebRTC.js | grep -A 10 -B 5 "ERROR\|error"
```

**预期**：应该看到处理ERROR消息的代码。如果没有，需要添加错误处理。

### 步骤2：检查是否有残留的WebSocket连接

**问题**：可能有多个WebSocket连接同时存在，导致会话冲突。

**操作**：检查容器内是否有残留进程

在SSH终端运行：
```bash
ssh unloader@unloader1
docker exec teleop ps aux | grep -E "python|node|gstreamer|joystick"
```

**预期**：应该只看到当前运行的进程。如果看到多个进程，需要先停止所有进程。

### 步骤3：检查前端是否正确清理旧的PeerConnection

**问题**：前端可能没有正确清理旧的PeerConnection，导致多个连接尝试。

**操作**：检查前端代码中的清理逻辑

查看`useWebRTC.js`中的`initializeSignaling`函数，确认：
1. 是否在创建新连接前关闭旧连接
2. 是否清理旧的PeerConnection引用

### 步骤4：检查启动顺序和时机

**问题**：启动顺序或时机不对可能导致会话冲突。

**操作**：严格按照以下顺序和时机启动

#### 4.1 完全清理所有连接

**在SSH终端1（机器人客户端）**：
```bash
# 如果进程正在运行，按 Ctrl+C 停止
# 确认进程已停止
```

**在SSH终端2（远程控制端）**：
```bash
# 如果进程正在运行，按 Ctrl+C 停止
# 确认进程已停止
```

**在前端浏览器**：
```bash
# 点击 Stop 按钮
# 或者关闭浏览器标签页
# 等待5秒后重新打开页面
```

#### 4.2 等待足够长的时间

**重要**：等待**至少60秒**，让signaling server完全清理会话。

#### 4.3 按顺序启动（关键！）

**第一步：启动机器人客户端（SSH终端1）**

```bash
ssh unloader@unloader1
docker exec -it teleop /bin/bash
source /opt/ros/humble/setup.bash
source ros2_ws/install/setup.bash
python gstreamer_webrtc.py
```

**等待看到以下日志**（不要继续下一步，直到看到这些）：
```
INFO:root:Connected to signaling server
INFO:root:Sent join-room message with roomId: e07112f2-74f0-5535-812f-1ae53c16c3f0
INFO:root:Starting pipeline
INFO:root:Pipeline started successfully
INFO:root:Negotiation needed
INFO:root:Sending offer:
```

**第二步：启动远程控制端（SSH终端2）**

```bash
ssh unloader@unloader1
docker exec -it teleop /bin/bash
source /opt/ros/humble/setup.bash
source ros2_ws/install/setup.bash
node joystick_webrtc.js
```

**等待看到以下日志**（不要继续下一步，直到看到这些）：
```
Connected to the signaling server
Sent join-room message with roomId: e07112f2-74f0-5535-812f-1ae53c16c3f0
```

**第三步：在前端点击Start按钮**

**观察前端Console**，应该看到：
```
Connected to the signaling server
Websocket received message {type: 'offer', sdp: ...}
Received SDP Offer: ...
```

**不应该看到**：
```
{type: 'ERROR', message: 'Session already established'}
```

### 步骤5：检查前端是否正确处理多个Offer

**问题**：从日志看，前端收到了两个offer（一个视频流，一个数据通道），可能导致冲突。

**操作**：检查前端代码如何处理多个offer

查看`useWebRTC.js`中的`handleOffer`函数，确认：
1. 是否每次收到offer都创建新的PeerConnection（错误）
2. 还是复用同一个PeerConnection（正确）

**预期行为**：
- 第一个offer（视频流）应该创建PeerConnection
- 第二个offer（数据通道）应该复用同一个PeerConnection

### 步骤6：检查前端PeerConnection的创建时机

**问题**：前端可能在收到offer之前就创建了PeerConnection，导致冲突。

**操作**：检查前端代码逻辑

查看`useWebRTC.js`，确认：
1. PeerConnection是在`handleOffer`中创建的（正确）
2. 还是在`initializeSignaling`中创建的（可能有问题）

**预期**：PeerConnection应该在收到第一个offer时创建，而不是在连接signaling server时创建。

### 步骤7：检查前端是否正确处理ICE候选

**问题**：ICE候选的处理顺序可能有问题。

**操作**：检查前端代码中的ICE候选处理逻辑

查看`useWebRTC.js`中的`handleIceCandidate`和`addIceCandidate`函数，确认：
1. 是否在设置remote description之前缓存ICE候选
2. 是否在设置remote description之后处理缓存的候选

### 步骤8：检查视频流的接收

**问题**：虽然ICE连接完成，但视频流没有显示。

**操作**：检查前端是否正确接收视频流

查看`useWebRTC.js`中的`ontrack`事件处理，确认：
1. 是否正确设置视频流的state
2. 是否正确绑定到video元素

**检查前端页面**：
1. 打开浏览器开发者工具（F12）
2. 查看Console标签
3. 查看是否有"ontrack"相关的日志
4. 查看Network标签，确认是否有视频流传输

### 步骤9：检查摄像头设备

**问题**：摄像头设备可能没有正确映射或不可用。

**操作**：检查摄像头设备

在SSH终端运行：
```bash
ssh unloader@unloader1

# 检查宿主机上的摄像头设备
ls -l /dev/video*

# 检查docker-compose.yml中的设备映射
cat ~/teleop/teleop/docker-compose.yml | grep -A 3 devices

# 检查容器内是否能访问摄像头
docker exec teleop ls -l /dev/video*

# 检查容器内摄像头权限
docker exec teleop ls -l /dev/video4
```

**预期**：
- 宿主机上应该有`/dev/video4`（或你使用的设备）
- docker-compose.yml中应该映射了正确的设备
- 容器内应该能看到映射的设备
- 设备应该有正确的权限（crw-rw----）

### 步骤10：检查GStreamer管道

**问题**：GStreamer管道可能有问题，导致视频流无法生成。

**操作**：检查GStreamer管道配置

在SSH终端运行：
```bash
ssh unloader@unloader1
docker exec teleop python -c "from util import PIPELINE_DESC; print(PIPELINE_DESC)"
```

**检查**：
1. 管道中使用的设备路径是否正确（应该是`/dev/video4`）
2. 编码器配置是否合理
3. 是否有语法错误

### 步骤11：检查网络连接

**问题**：网络问题可能导致WebRTC连接失败。

**操作**：检查网络连接

在SSH终端运行：
```bash
ssh unloader@unloader1

# 检查容器网络
docker exec teleop ping -c 3 application.intuitivemotion.ai

# 检查端口是否开放
docker exec teleop nc -zv application.intuitivemotion.ai 8443

# 检查STUN服务器
docker exec teleop nc -zv stun.l.google.com 19302
```

**预期**：所有连接都应该成功。

### 步骤12：检查前端错误处理

**问题**：前端可能没有正确处理某些错误，导致连接失败但不显示错误。

**操作**：检查前端代码中的错误处理

查看`useWebRTC.js`，确认：
1. 是否有try-catch块捕获所有错误
2. 是否有错误日志输出
3. 是否有错误状态设置

### 步骤13：检查浏览器兼容性

**问题**：浏览器可能不支持某些WebRTC功能。

**操作**：检查浏览器支持

在前端浏览器Console运行：
```javascript
// 检查WebRTC支持
console.log('RTCPeerConnection:', typeof RTCPeerConnection);
console.log('getUserMedia:', navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

// 检查WebSocket支持
console.log('WebSocket:', typeof WebSocket);
```

**预期**：所有都应该有值，不是undefined。

### 步骤14：检查前端日志中的详细信息

**问题**：可能需要更详细的日志来诊断问题。

**操作**：启用详细日志

在前端浏览器Console运行：
```javascript
// 启用WebRTC详细日志
localStorage.setItem('webrtc_debug', 'true');
```

然后刷新页面，查看更详细的日志。

## 🎯 推荐的排查顺序

1. **步骤4**：严格按照顺序启动（最重要！）
2. **步骤5**：检查前端如何处理多个offer
3. **步骤6**：检查前端PeerConnection的创建时机
4. **步骤9**：检查摄像头设备
5. **步骤10**：检查GStreamer管道

## 📝 需要收集的信息

如果问题仍然存在，请提供：

1. **完整的启动日志**（三个终端的完整输出）
2. **前端Console的完整输出**（包括所有错误、警告和信息）
3. **Network标签的截图**（显示WebSocket和WebRTC连接）
4. **步骤9的输出**（摄像头设备检查结果）
5. **步骤10的输出**（GStreamer管道配置）

## 💡 可能的根本原因

基于日志分析，最可能的原因是：

1. **前端没有正确处理ERROR消息**：收到"Session already established"错误后，前端可能没有正确清理和重试
2. **多个PeerConnection被创建**：前端可能为每个offer创建了新的PeerConnection，导致冲突
3. **启动顺序问题**：虽然按照顺序启动，但时机不对（没有等待足够的时间）

## 🔧 临时解决方案

如果以上步骤都无法解决问题，可以尝试：

1. **重启容器**：
```bash
ssh unloader@unloader1
cd ~/teleop/teleop
docker compose restart
```

2. **清除浏览器缓存**：
   - 清除浏览器缓存和Cookie
   - 使用无痕模式重新打开页面

3. **使用不同的robot_id**（临时测试）：
```bash
ssh unloader@unloader1
docker exec teleop bash -c "echo 'test-robot-id-$(date +%s)' > /opt/app/robot_id.txt"
```

然后重新启动所有进程，看看是否能连接。如果能连接，说明是robot_id相关的会话问题。

