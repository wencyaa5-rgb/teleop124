# TELEOP - 机器人远程操作系统

## 📖 项目概述

TELEOP是一个基于WebRTC的机器人远程操作系统，允许用户通过Web浏览器实时控制机器人，包括：
- **实时视频流传输**：通过WebRTC传输机器人摄像头画面
- **远程控制**：通过键盘或游戏手柄控制机器人运动
- **设备管理**：通过Web界面管理多个机器人设备

## 🏗️ 系统架构

### 核心组件

系统由三个主要组件组成：

1. **机器人客户端（Robot Client）** - `gstreamer_webrtc.py`
   - 运行在机器人端（Docker容器内）
   - 负责捕获摄像头视频并通过WebRTC发送到前端
   - 使用GStreamer处理视频流

2. **机器人控制端（Robot Control）** - `joystick_webrtc.js`
   - 运行在机器人端（Docker容器内）
   - 接收前端控制信号并通过ROS2发布到机器人
   - 处理WebRTC数据通道通信

3. **React前端（Frontend）** - `react-frontend/`
   - 运行在用户机器上（不在容器内）
   - 提供Web界面，显示视频流并发送控制命令
   - 包含设备管理功能

### 数据流

```
┌─────────────────┐
│  React Frontend │
│   (Browser)     │
└────────┬────────┘
         │
         │ WebRTC (Video + Data Channel)
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────────┐
│Video  │ │Control    │
│Stream │ │Signals    │
└───┬───┘ └──┬────────┘
    │        │
┌───▼────────▼───┐
│  Robot Side    │
│  (Docker)      │
│                │
│ gstreamer_     │ joystick_
│ webrtc.py      │ webrtc.js
└───┬────────┬───┘
    │        │
    │        │ ROS2 Topics
    │        │
┌───▼────────▼───┐
│   Robot        │
│   Hardware     │
└────────────────┘
```

## 🚀 快速开始

### 前置要求

- Docker 和 Docker Compose
- Node.js (用于React前端)
- MongoDB (用于设备管理，可选)
- ROS2 Humble (在Docker容器内)

### 1. 启动Docker容器

```bash
cd ~/teleop/teleop
docker compose up -d
```

### 2. 启动机器人客户端

```bash
# 在容器内
docker exec -it teleop /bin/bash
source /opt/ros/humble/setup.bash
source ros2_ws/install/setup.bash
python gstreamer_webrtc.py
```

### 3. 启动机器人控制端

```bash
# 在另一个终端，容器内
docker exec -it teleop /bin/bash
source /opt/ros/humble/setup.bash
source ros2_ws/install/setup.bash
node joystick_webrtc.js
```

### 4. 启动React前端

```bash
# 在本地机器（不在容器内）
cd ~/teleop/teleop/react-frontend
npm install  # 首次运行需要
npm start
```

### 5. 连接

1. 打开浏览器访问 `http://localhost:3000`
2. 选择或添加机器人设备
3. 点击 "Start" 按钮
4. 等待视频流连接建立

## 📁 项目结构

```
teleop/
├── docker-compose.yml          # Docker容器配置
├── Dockerfile                  # Docker镜像构建文件
├── gstreamer_webrtc.py         # 机器人视频流客户端
├── joystick_webrtc.js          # 机器人控制端
├── util.py                     # 工具函数（摄像头配置等）
├── requirements.txt            # Python依赖
├── package.json                # Node.js依赖
├── react-frontend/             # React前端应用
│   ├── src/
│   │   ├── components/         # React组件
│   │   │   ├── VideoPlayer.js  # 视频播放器
│   │   │   ├── ControlPanel.js # 控制面板
│   │   │   └── DeviceList.js   # 设备列表
│   │   ├── hooks/
│   │   │   ├── useWebRTC.js    # WebRTC连接逻辑
│   │   │   └── useJoystick.js  # 手柄/键盘输入处理
│   │   └── App.js              # 主应用组件
│   └── backend/                # 后端API服务器
│       ├── server.js           # Express服务器
│       ├── models/             # MongoDB模型
│       └── routes/             # API路由
└── ros2_ws/                    # ROS2工作空间
```

## 🔧 配置

### 摄像头配置

通过环境变量配置（在 `docker-compose.yml` 中设置）：

```yaml
environment:
  - CAMERA_MODE=v4l2                    # v4l2, ros, 或 mixed
  - CAMERA_PRIMARY_DEVICE=/dev/video0   # 主摄像头设备
  - CAMERA_NUM_STREAMS=1                # 视频流数量
  - CAMERA_WIDTH=640                     # 视频宽度
  - CAMERA_HEIGHT=360                    # 视频高度
  - CAMERA_TARGET_BITRATE=300000        # 目标比特率
```

### WebRTC配置

- **Signaling Server**: `wss://application.intuitivemotion.ai:8443`
- **STUN Server**: `stun:stun.l.google.com:19302`
- **TURN Server**: 配置在代码中（如需要）

## 📚 详细文档

### React前端部分

#### 1. WebRTC连接 (`useWebRTC.js`)

**功能：**
- 管理与机器人端的WebRTC连接
- 处理视频流接收
- 管理数据通道（控制信号传输）

**关键流程：**

1. **连接建立**
   ```javascript
   startConnection(robotId)  // 连接到signaling server
   ```

2. **视频流接收**
   - 通过 `ontrack` 事件接收视频流
   - 自动分配到 `receivedVideo1-4`

3. **数据通道**
   - 主数据通道：`dataChannel` - 用于控制信号
   - 辅助通道：`bboxChannel` - 用于边界框数据

**主要方法：**
- `startConnection(robotId)` - 开始连接
- `stopConnection()` - 停止连接
- `sendData(data)` - 发送数据到机器人

#### 2. 遥感控制 (`useJoystick.js`)

**功能：**
- 处理键盘输入
- 处理游戏手柄输入
- 将输入转换为控制命令并发送

**键盘映射：**

| 按键 | 功能 | ROS值 |
|------|------|-------|
| ↑ | 前进 | `axes[1] = 0.6` |
| ↓ | 后退 | `axes[1] = -0.6` |
| → | 右转 | `axes[0] = -0.6` |
| ← | 左转 | `axes[0] = 0.6` |
| 空格 | A按钮（释放） | `buttons[0] = 1` |
| P | B按钮（抓取） | `buttons[1] = 1` |
| H | Home（回初始位置） | `buttons[16] = 1` |

**游戏手柄支持：**
- 自动检测连接的Xbox 360兼容手柄
- 左摇杆：移动控制
- 右摇杆：旋转/俯仰控制
- 按钮：对应ROS按钮索引

**数据格式：**
```javascript
{
  axes: [0.0, 0.0, 0.0, 0.0],      // 4个轴（左摇杆XY，右摇杆XY）
  buttons: [0, 0, 0, ...]          // 17个按钮
}
```

#### 3. 数据库管理 (`backend/`)

**功能：**
- 管理机器人设备信息
- 提供RESTful API
- 使用MongoDB存储数据

**数据模型：**
```javascript
{
  robot_id: String,    // 机器人唯一ID
  ip: String,          // IP地址
  site: String,        // 站点
  place: String,       // 位置
  status: String      // 状态：active/inactive/maintenance
}
```

**API端点：**
- `GET /api/devices` - 获取所有设备
- `GET /api/devices/robot-ids` - 获取所有robot_id
- `GET /api/devices/robot/:robotId` - 按robot_id获取设备
- `POST /api/devices` - 创建新设备
- `PUT /api/devices/:id` - 更新设备
- `DELETE /api/devices/:id` - 删除设备

**使用流程：**

1. **启动后端服务器**
   ```bash
   cd react-frontend
   npm run backend
   ```

2. **导入设备数据（可选）**
   ```bash
   npm run import-csv
   ```

3. **前端自动连接**
   - 前端通过proxy自动连接到后端
   - 设备列表页面显示所有设备
   - 可以添加、编辑、删除设备

### 机器人端部分

#### 1. 视频流客户端 (`gstreamer_webrtc.py`)

**功能：**
- 使用GStreamer捕获摄像头视频
- 通过WebRTC发送视频流到前端
- 处理WebRTC信令和ICE连接

**工作流程：**

1. **初始化**
   - 连接到signaling server
   - 生成或读取robot_id
   - 创建GStreamer pipeline

2. **视频流处理**
   - 从摄像头读取视频（v4l2或ROS topic）
   - 编码为VP8格式
   - 通过WebRTC发送

3. **连接管理**
   - 处理SDP offer/answer交换
   - 处理ICE候选者交换
   - 自动重连机制

**配置：**
- 通过环境变量配置摄像头（见上方配置部分）
- Pipeline自动生成基于配置

#### 2. 控制端 (`joystick_webrtc.js`)

**功能：**
- 接收前端控制信号
- 转换为ROS2消息
- 发布到 `/joy` topic

**工作流程：**

1. **ROS2初始化**
   - 初始化ROS2节点
   - 创建publisher和subscriber
   - 处理可选的服务和动作

2. **WebRTC连接**
   - 连接到signaling server
   - 创建数据通道
   - 接收控制数据

3. **消息处理**
   - 解析JSON控制数据
   - 转换为ROS2 `sensor_msgs/msg/Joy` 消息
   - 应用阈值过滤（避免微小抖动）
   - 发布到ROS2 topic

**消息格式转换：**

前端发送：
```javascript
{
  axes: [0.6, 0, 0, 0],
  buttons: [0, 0, 0, ...]
}
```

转换为ROS2：
```python
sensor_msgs/msg/Joy {
  axes: [8个值],      # 包括反转的axes[0]和axes[1]
  buttons: [17个值]
}
```

## 🔍 故障排查

### 视频流无法显示

1. **检查容器状态**
   ```bash
   docker ps
   docker logs teleop --tail 50
   ```

2. **检查摄像头设备**
   ```bash
   ls -l /dev/video0
   docker exec teleop ls -l /dev/video0
   ```

3. **检查环境变量**
   ```bash
   docker exec teleop env | grep CAMERA
   ```

4. **检查GStreamer pipeline**
   - 查看 `gstreamer_webrtc.py` 输出
   - 确认pipeline启动成功

### 控制信号无法到达机器人

1. **检查数据通道状态**
   - 前端console应该显示 "Data channel is open"
   - 机器人端应该显示 "Data channel is open"

2. **检查ROS2 topic**
   ```bash
   # 在容器内
   ros2 topic echo /joy
   ```

3. **检查消息过滤**
   - 确认控制信号超过阈值（默认0.09）
   - 查看机器人端日志

### 前端无法连接

1. **检查后端服务器**
   ```bash
   # 确认后端运行在3001端口
   curl http://localhost:3001/api/devices
   ```

2. **检查MongoDB**
   ```bash
   # 确认MongoDB运行
   docker ps | grep mongo
   ```

3. **检查浏览器console**
   - 查看是否有错误消息
   - 检查WebRTC连接状态

## 🛠️ 开发指南

### 添加新功能

1. **修改机器人端代码**
   - 编辑 `.py` 或 `.js` 文件
   - 使用 `docker cp` 复制到容器
   - 重启相关进程

2. **修改前端代码**
   - 编辑React组件
   - 前端会自动热重载（开发模式）

3. **修改配置**
   - 修改 `docker-compose.yml` 后重启容器
   - 修改 `Dockerfile` 后需要重新build

### 测试

1. **视频流测试**
   - 启动所有组件
   - 点击前端 "Start" 按钮
   - 确认视频流显示

2. **控制信号测试**
   - 按键盘箭头键
   - 查看前端console输出
   - 查看机器人端日志
   - 使用 `ros2 topic echo /joy` 验证

## 📝 维护说明

### 日常维护

1. **定期检查容器状态**
2. **监控日志文件**
3. **备份设备数据库**

### 更新流程

1. **代码更新**
   ```bash
   git pull
   docker cp <文件> teleop:/opt/app/
   ```

2. **配置更新**
   ```bash
   # 修改docker-compose.yml
   docker compose down
   docker compose up -d
   ```

3. **依赖更新**
   ```bash
   # 修改requirements.txt或package.json后
   docker compose build
   docker compose up -d
   ```

## 📞 支持

如有问题，请检查：
1. 项目启动注意事项文档
2. 故障排查部分
3. 日志文件

## 📄 许可证

[根据项目实际情况填写]

