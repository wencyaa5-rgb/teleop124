#!/usr/bin/env node

const WebSocket = require('ws');
const wrtc = require('wrtc');
const rclnodejs = require('rclnodejs');
const JoyMessage = rclnodejs.require('sensor_msgs/msg/Joy');

const signalingServerUrl = 'wss://application.intuitivemotion.ai:8443';
const signalingSocket = new WebSocket(signalingServerUrl);
const JOYSTICK_SENSITIVITY_THRESHOLD = 0.09;

let peerConnection;
let dataChannel;
let remoteDescriptionSet = false;
let pendingCandidates = [];
let publisher;
let clock;

// // Connect to the Python WebSocket server for arm control
// const pythonWebSocket = new WebSocket('ws://localhost:8765');

// pythonWebSocket.on('open', () => {
//   console.log('Connected to the Python WebSocket server');
// });

// pythonWebSocket.on('error', (error) => {
//   console.error('Python WebSocket server error:', error);
// });

// pythonWebSocket.on('close', () => {
//   console.log('Python WebSocket server connection closed');
// });
    
// Handle incoming messages from the signaling server

// Function to publish joystick messages
function publishJoyMessage(jointCommand) {
  const axes = jointCommand.axes || [0.0, 1.0, 0.0, -1.0];
  const buttons = jointCommand.buttons || [0, 1, 0, 1];

  const allAxesBelowThreshold = axes.every(value => Math.abs(value) < JOYSTICK_SENSITIVITY_THRESHOLD);
  const allButtonsZero = buttons.every(value => value === 0);

  if (allAxesBelowThreshold && allButtonsZero) {
    // console.log('Axes values are below threshold and buttons are all zero. Not publishing.');
    return;
  }

  const msg = new JoyMessage();
  msg.header.stamp = clock.now();
  msg.axes = axes;
  msg.buttons = buttons;
  publisher.publish(msg);
  // console.log('Published a joy message');
}

signalingSocket.on('open', async () => {
  console.log('Connected to the signaling server');
  initializePeerConnection();
});

signalingSocket.on('error', (error) => {
  console.error('Signaling server error:', error);
});

signalingSocket.on('close', () => {
  console.log('Signaling server connection closed');
});

signalingSocket.on('message', async (message) => {
  const dataString = message.toString(); // Convert Buffer to string
  const data = JSON.parse(dataString); // Parse string to JSON
  console.log('Received message:', data);

  if (data.type === 'answer') {
    await handleAnswer(data.sdp);
  } else if(data.type == 'offer') {
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
    // Send a message to the Python WebSocket server when the data channel is open
    // pythonWebSocket.send(JSON.stringify(1));
  };

  dataChannel.onclose = () => {
    console.log('Data channel is closed');
  };

  dataChannel.onmessage = (event) => {
    console.log('Received message:', event.data);
    const jointCommand = JSON.parse(event.data);
    // send command through local websocket to control gripper
    // pythonWebSocket.send(JSON.stringify(jointCommand));

    // Parse the jointCommand and publish a joy message
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

  // Create an offer and send it to the signaling server
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

// // Handler for receiving messages from the Python WebSocket server
// pythonWebSocket.on('message', (message) => {
//   console.log('Received message from Python WebSocket server:', message);
  
//   // Forward the received message "1" through the WebRTC data channel
//   if (dataChannel && dataChannel.readyState === 'open') {
//     dataChannel.send(message);
//   }
// });

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

// Handle incoming answer SDP
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

// Handle incoming ICE candidate
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

  // Create a publisher for the 'joy' topic
  publisher = node.createPublisher('sensor_msgs/msg/Joy', 'joy');

  rclnodejs.spin(node);
}).catch((err) => {
  console.error(err);
});
