#!/usr/bin/env node

const WebSocket = require('ws');
const wrtc = require('wrtc');
const rclnodejs = require('rclnodejs');
const JoyMessage = rclnodejs.require('sensor_msgs/msg/Joy');
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
// by default the xarm assumes there are 8 axes, and 11 buttons.
const defaultAxes = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to read the robot_id from a file in the current directory with infinite retry logic
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
  const robotId = await getRobotId(); // Get robot_id (used as roomId)
  console.log(`Robot ID: ${robotId}`);

  const signalingServerUrl = 'wss://application.intuitivemotion.ai:8443';
  const signalingSocket = new WebSocket(signalingServerUrl);
  const JOYSTICK_SENSITIVITY_THRESHOLD = 0.09;

  let peerConnection;
  let dataChannel;
  let remoteDescriptionSet = false;
  let pendingCandidates = [];
  let publisher;
  let clock;

  signalingSocket.on('open', async () => {
    console.log('Connected to the signaling server');
    
    // Send the join-room message with the robot_id as roomId
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

    dataChannel.onmessage = (event) => {
      const jointCommand = JSON.parse(event.data);
      publishJoyMessage(jointCommand);
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

    publisher = node.createPublisher('sensor_msgs/msg/Joy', 'joy');

    rclnodejs.spin(node);
  }).catch((err) => {
    console.error(err);
  });

  // Function to normalize joystick input to 8 axes and 11 buttons and publish joystick command to ROS2 /joy
  function publishJoyMessage(jointCommand) {
    const msg = new JoyMessage();
    msg.header.stamp = clock.now(); 

    msg.axes = jointCommand.axes ? jointCommand.axes.concat(defaultAxes).slice(0, 8) : defaultAxes;
    msg.axes[2] = msg.axes[4];
    msg.axes[4] = jointCommand.buttons[LEFT_TRIGGER];
    msg.axes[5] = jointCommand.buttons[RIGHT_TRIGGER];
    msg.axes[6] = jointCommand.buttons[CROSS_KEY_L] - jointCommand.buttons[CROSS_KEY_R];
    msg.axes[7] = jointCommand.buttons[CROSS_KEY_F] - jointCommand.buttons[CROSS_KEY_B];

    msg.buttons = buttonIndices.map(i => jointCommand.buttons[i] !== undefined ? jointCommand.buttons[i] : 0);

    if (msg.axes.every(axis => Math.abs(axis) < JOYSTICK_SENSITIVITY_THRESHOLD) && msg.buttons.every(button => button === 0)) {
      console.log('Joystick input is in neutral position, not publishing.');
      return;
    }

    publisher.publish(msg);
    console.log('Published a joy message');
  }
}

// Start the main function
main();
