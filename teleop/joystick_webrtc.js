const WebSocket = require('ws');
const wrtc = require('wrtc');
const rclnodejs = require('rclnodejs');
const JoyMessage = rclnodejs.require('sensor_msgs/msg/Joy');
const PointCloud2 = rclnodejs.require('sensor_msgs/msg/PointCloud2');
const PointStamped = rclnodejs.require('geometry_msgs/msg/PointStamped');
let JamConveyor, ReleaseConveyor;
try {
  JamConveyor = rclnodejs.require('move_program_interfaces/action/JamConveyor');
  ReleaseConveyor = rclnodejs.require('move_program_interfaces/action/ReleaseConveyor');
  console.log("Successfully loaded action types for JamConveyor and ReleaseConveyor.");
} catch (error) {
  console.error("Error loading action types:", error);
}

const Int32 = rclnodejs.require('std_msgs/msg/Int32');
const fs = require('fs');
const path = require('path');

const XBOX360_WIRELESS_CONTROLLER_AXIS = {
  LEFT_STICK_LR: 0,
  LEFT_STICK_FB: 1,
  RIGHT_STICK_LR: 2,
  RIGHT_STICK_FB: 3,
  LEFT_TRIGGER: 6,
  RIGHT_TRIGGER: 7,
  CROSS_KEY_L: 14,
  CROSS_KEY_R: 15,
  CROSS_KEY_F: 12,
  CROSS_KEY_B: 13
};
const { LEFT_TRIGGER, RIGHT_TRIGGER, CROSS_KEY_L, CROSS_KEY_R, CROSS_KEY_F, CROSS_KEY_B } = XBOX360_WIRELESS_CONTROLLER_AXIS;

const XBOX360_CONTROLLER_BUTTON = {
  XBOX360_BTN_A: 0,
  XBOX360_BTN_B: 1,
  XBOX360_BTN_X: 2,
  XBOX360_BTN_Y: 3,
  XBOX360_BTN_LB: 4,
  XBOX360_BTN_RB: 5,
  XBOX360_BTN_BACK: 8,
  XBOX360_BTN_START: 9,
  XBOX360_BTN_POWER: 16,
  XBOX360_BTN_STICK_LEFT: 10,
  XBOX360_BTN_STICK_RIGHT: 11,
};
const buttonIndices = Object.values(XBOX360_CONTROLLER_BUTTON);
const defaultAxes = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getRobotId(delay = 1000) {
  const filePath = path.join(__dirname, 'robot_id.txt');

  while (true) {
    try {
      const robotId = fs.readFileSync(filePath, 'utf8').trim();
      return robotId;
    } catch (err) {
      console.error('Error reading robot_id from file:', err);
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}

async function main() {
  const robotId = await getRobotId();
  console.log(`Robot ID: ${robotId}`);

  const signalingServerUrl = 'wss://application.intuitivemotion.ai:8443';
  const signalingSocket = new WebSocket(signalingServerUrl);
  const JOYSTICK_SENSITIVITY_THRESHOLD = 0.09;

  let peerConnection;
  let dataChannel;
  let remoteDescriptionSet = false;
  let pendingCandidates = [];
  let joyPublisher, pointPublisher, binPublisher, pointCloudSubscriber;
  let jamConveyorClient, releaseConveyorClient;
  let clock;

  signalingSocket.on('open', async () => {
    console.log('Connected to the signaling server');
    
    signalingSocket.send(JSON.stringify({
      type: 'join-room',
      roomId: robotId,
      role: 'workstation'
    }));
    console.log(`Sent join-room message with roomId: ${robotId}`);

    initializePeerConnection();
  });

  signalingSocket.on('error', (error) => {
    console.error('Signaling server error:', error);
  });

  signalingSocket.on('close', () => {
    console.log('Signaling server connection closed');
  });

  signalingSocket.on('message', async (message) => {
    const dataString = message.toString();
    const data = JSON.parse(dataString);
    console.log('Received message:', data);

    if (data.type === 'answer') {
      await handleAnswer(data.sdp);
    } else if (data.type === 'offer') {
      await handleOffer(data.sdp);
    } else if (data.type === 'ice-candidate') {
      handleIceCandidate(data.candidate);
    }
  });

  function initializePeerConnection() {
    const configuration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    peerConnection = new wrtc.RTCPeerConnection(configuration);
    dataChannel = peerConnection.createDataChannel('dataChannel');

    dataChannel.onopen = () => {
      console.log('Data channel is open');
    };

    dataChannel.onclose = () => {
      console.log('Data channel is closed');
    };

    dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
    };

    dataChannel.onmessage = (event) => {
      const data = JSON.parse(event.data);
    
      if (data.type === 'click-coordinates') {
        publishPointMessage(data.videoId, data.coordinates);
      } else if (data.type === 'move_to_bin') {
        console.log("RECEIVED BIN REQUEST");
        publishMoveToBinMessage(data.id);
      } else if (data.type === 'conveyor_control') {
        // Handle conveyor control commands
        if (data.command === 'jam') {
          (async () => { await callJamConveyorAction(); })();  // Fire and forget
        } else if (data.command === 'release') {
          (async () => { await callReleaseConveyorAction(); })();  // Fire and forget
        }
      } else {
        publishJoyMessage(data);
      }
    };
    
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        signalingSocket.send(JSON.stringify({
          type: 'ice-candidate', 
          candidate: event.candidate
        }));
      }
    };

    createAndSendOffer();
  }

  async function createAndSendOffer() {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    signalingSocket.send(JSON.stringify({
      type: 'offer',
      sdp: peerConnection.localDescription.sdp
    }));
  }

  async function handleOffer(sdp) {
    if (!peerConnection) {
      initializePeerConnection();
    }

    try {
      console.log('Received SDP:', sdp);

      await peerConnection.setRemoteDescription(new wrtc.RTCSessionDescription({ type: 'offer', sdp: sdp }));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      signalingSocket.send(JSON.stringify({
        type: 'answer',
        sdp: peerConnection.localDescription.sdp
      }));
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  async function handleAnswer(sdp) {
    try {
      console.log('Received SDP:', sdp);

      const sdpFull = { type: 'answer', sdp: sdp };
      await peerConnection.setRemoteDescription(new wrtc.RTCSessionDescription(sdpFull));

      remoteDescriptionSet = true;
      pendingCandidates.forEach(async candidate => {
        await peerConnection.addIceCandidate(new wrtc.RTCIceCandidate(candidate));
      });
      pendingCandidates = [];
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  function handleIceCandidate(candidate) {
    if (remoteDescriptionSet) {
      addIceCandidate(candidate);
    } else {
      pendingCandidates.push(candidate);
    }
  }

  async function addIceCandidate(candidate) {
    try {
      console.log('Adding ICE candidate:', candidate);
      await peerConnection.addIceCandidate(new wrtc.RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding received ICE candidate:', error);
    }
  }

  // Initialize the ROS2 node
  rclnodejs.init().then(() => {
    const node = new rclnodejs.Node('joy_publisher');
    clock = node.getClock();

    joyPublisher = node.createPublisher('sensor_msgs/msg/Joy', 'joy');
    pointPublisher = node.createPublisher('geometry_msgs/msg/PointStamped', '/user_send_goal');
    binPublisher = node.createPublisher('std_msgs/msg/Int32', '/user_send_bin');

    // Create action clients for jam and release conveyor actions
    jamConveyorClient = new rclnodejs.ActionClient(node, 'move_program_interfaces/action/JamConveyor', 'jam_conveyor');
    releaseConveyorClient = new rclnodejs.ActionClient(node, 'move_program_interfaces/action/ReleaseConveyor', 'release_conveyor');

    // Subscribe to the point cloud topic
    pointCloudSubscriber = node.createSubscription(PointCloud2, '/camera/downsampled_points', (msg) => {
      sendPointCloudOverWebRTC(msg);
    });

    rclnodejs.spin(node);
    console.log("Joy Publisher Node Fully Initialized");
  }).catch((err) => {
    console.error(err);
  });

  // Function to normalize joystick input to 8 axes and 11 buttons and publish joystick command to ROS2 /joy
  function publishJoyMessage(jointCommand) {
    if (!clock) {
      console.log("Clock not initialized.")
      return
    }
    const msg = new JoyMessage();
    msg.header.stamp = clock.now(); 
    msg.header.frame_id = '';  // Ensure frame_id is a string

    msg.axes = jointCommand.axes ? jointCommand.axes.concat(defaultAxes).slice(0, 8) : defaultAxes;
    msg.axes[0] = -msg.axes[0];
    msg.axes[1] = -msg.axes[1];

    msg.axes[4] = jointCommand.buttons[LEFT_TRIGGER];
    msg.axes[5] = jointCommand.buttons[RIGHT_TRIGGER];
    msg.axes[6] = jointCommand.buttons[CROSS_KEY_L] - jointCommand.buttons[CROSS_KEY_R];
    msg.axes[7] = jointCommand.buttons[CROSS_KEY_F] - jointCommand.buttons[CROSS_KEY_B];

    msg.buttons = buttonIndices.map(i => jointCommand.buttons[i] !== undefined ? jointCommand.buttons[i] : 0);

    if (msg.axes.every(axis => Math.abs(axis) < JOYSTICK_SENSITIVITY_THRESHOLD) && msg.buttons.every(button => button === 0)) {
      return;
    }

    joyPublisher.publish(msg);
    console.log('Published a joy message');
  }

  // Function to publish (x, y, z) coordinates to ROS2 topic /user_send_goal
  function publishPointMessage(videoId, coordinates) {
    const msg = new PointStamped();
    msg.header.stamp = clock.now();
    msg.header.frame_id = videoId ;  // this is a hack, we just use videoId to differentiate the two streams
    msg.point.x = coordinates.x;
    msg.point.y = coordinates.y;
    msg.point.z = coordinates.z;  // Set a default z value if necessary

    pointPublisher.publish(msg);
    console.log(`Published point message: (${coordinates.x}, ${coordinates.y}, ${coordinates.z})`);
  }

  function publishMoveToBinMessage(bin_id) {
    // Create a message with the bin_id
    const binMessage = new Int32();
    binMessage.data = bin_id;
  
    // Publish the message to the /user_send_bin topic
    binPublisher.publish(binMessage);
    console.log(`Published bin ID ${bin_id} to /user_send_bin`);
  }

  // Function to send sampled point cloud data over WebRTC
  function sendPointCloudOverWebRTC(pointCloud) {
    if (dataChannel.readyState === 'open') {
      const pointCloudData = serializeAndSamplePointCloud(pointCloud);
      const jsonString = JSON.stringify({
        type: 'point-cloud',
        data: pointCloudData
      });

      dataChannel.send(jsonString);
      console.log('Sampled point cloud data sent successfully');
    } else {
      console.debug('Data channel is not open');
    }
  }

  // Function to serialize and sample point cloud data
  function serializeAndSamplePointCloud(pointCloud) {
    const serialized = {
      header: {
        stamp: {
          sec: pointCloud.header.stamp.sec,
          nanosec: pointCloud.header.stamp.nanosec
        },
        frame_id: pointCloud.header.frame_id
      },
      height: pointCloud.height,
      width: pointCloud.width,
      fields: pointCloud.fields.map(field => ({
        name: field.name,
        offset: field.offset,
        datatype: field.datatype,
        count: field.count
      })),
      is_bigendian: pointCloud.is_bigendian,
      point_step: pointCloud.point_step,
      row_step: pointCloud.row_step,
      is_dense: pointCloud.is_dense,
      data: pointCloud.data
    };

    return serialized;
  }

  // Function to call jam conveyor action
  async function callJamConveyorAction() {
    const goalMsg = new JamConveyor.Goal();
    console.log('Sending jam conveyor goal...');
    const goalHandle = await jamConveyorClient.sendGoal(goalMsg);
    const result = await goalHandle.getResult();
    console.log(`Jam conveyor action result: ${result.success ? 'Success' : 'Failed'}`);
  }

  // Function to call release conveyor action
  async function callReleaseConveyorAction() {
    const goalMsg = new ReleaseConveyor.Goal();
    console.log('Sending release conveyor goal...');
    const goalHandle = await releaseConveyorClient.sendGoal(goalMsg);
    const result = await goalHandle.getResult();
    console.log(`Release conveyor action result: ${result.success ? 'Success' : 'Failed'}`);
  }
}


// Start the main function
main();
