import { useState, useEffect, useRef, useCallback } from 'react';

export const useWebRTC = (robotId) => {
  const [connectionState, setConnectionState] = useState('disconnected');
  const [dataChannelState, setDataChannelState] = useState('closed');
  const [videos, setVideos] = useState({
    receivedVideo1: null,
    receivedVideo2: null,
    receivedVideo3: null,
    receivedVideo4: null,
    receivedAudio: null
  });

  const signalingSocketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const iceCandidateQueueRef = useRef([]);
  const remoteDescriptionSetRef = useRef(false);

  const ROLE = 'browser';
  const SIGNALING_SERVER_URL = 'wss://application.intuitivemotion.ai:8443';

  // Function to send data if peerConnection and dataChannel are open
  const sendData = useCallback((data) => {
    if (peerConnectionRef.current && peerConnectionRef.current.connectionState === 'connected') {
      if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
        console.log("sending data", data);
        dataChannelRef.current.send(JSON.stringify(data));
        return true;
      } else {
        console.warn('Data channel is not open');
        return false;
      }
    } else {
      console.warn('Peer connection is not established');
      return false;
    }
  }, []);

  // Initialize signaling connection
  const initializeSignaling = useCallback(() => {
    if (signalingSocketRef.current) {
      signalingSocketRef.current.close();
    }
    //WebRTC Step 1: Connect to the signaling server
    signalingSocketRef.current = new WebSocket(SIGNALING_SERVER_URL);

    signalingSocketRef.current.onmessage = async (message) => {
      const data = JSON.parse(message.data);
      console.log('Websocket received message', data);

      if (data.type === 'offer') {
        await handleOffer(data.sdp);
      } else if (data.type === 'ice-candidate') {
        handleIceCandidate(data.candidate);
      } else if (data.type === 'SESSION_OK') {
        handleSessionOK();
      }
    };

    signalingSocketRef.current.onopen = () => {
      console.log('Connected to the signaling server');
      setConnectionState('connecting');
      signalingSocketRef.current.send(JSON.stringify({
        type: 'join-room',
        role: ROLE,
        roomId: robotId
      }));
    };

    signalingSocketRef.current.onerror = (error) => {
      console.error('Signaling server error:', error);
      setConnectionState('error');
    };

    signalingSocketRef.current.onclose = () => {
      console.log('Signaling server connection closed');
      setConnectionState('disconnected');
    };
  }, [robotId]);

  //WebRTC Step 2: Receive SDP Offer and Create Answer
  // Handle SDP offer
  const handleOffer = useCallback(async (sdp) => {
    console.log('Received SDP Offer:', sdp);

    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: 'turn:turn.application.intuitivemotion.ai:3478',
        username: 'robot',
        credential: 'intuitivemotion2024',
      }
    ];
    const configuration = { iceServers };

    peerConnectionRef.current = new RTCPeerConnection(configuration);

    peerConnectionRef.current.onicecandidate = async (event) => {
      if (event.candidate) {
        signalingSocketRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate
        }));
      }
    };

    peerConnectionRef.current.oniceconnectionstatechange = function() {
      console.log('ICE connection state:', peerConnectionRef.current.iceConnectionState);
      if (peerConnectionRef.current.iceConnectionState === 'connected') {
        setConnectionState('connected');
      }
    };

    peerConnectionRef.current.onsignalingstatechange = function() {
      console.log('Signaling state:', peerConnectionRef.current.signalingState);
    };

    //RemoteControl Step1: Establish Data Channel
    peerConnectionRef.current.ondatachannel = (event) => {
      // Only use 'dataChannel' for control signals, ignore 'bboxChannel'
      if (event.channel.label === 'dataChannel') {
        dataChannelRef.current = event.channel;
        dataChannelRef.current.onopen = () => {
          console.log('Data channel is open');
          setDataChannelState('open');
        };
        dataChannelRef.current.onclose = () => {
          console.log('Data channel is closed');
          setDataChannelState('closed');
        };
        dataChannelRef.current.onerror = (error) => {
          console.error('Data channel error:', error);
        };
        dataChannelRef.current.onmessage = (event) => {
          handleDataChannelMessage(JSON.parse(event.data));
        };
      } else if (event.channel.label === 'bboxChannel') {
        // bboxChannel is only for receiving bounding boxes, not for sending control signals
        event.channel.onmessage = (event) => {
          handleDataChannelMessage(JSON.parse(event.data));
        };
      }
    };

    //WebRTC Step 3: Receive Video Stream
    peerConnectionRef.current.ontrack = (event) => {
      if (event.track.kind === 'video') {
        setVideos(prevVideos => {
          const newVideos = { ...prevVideos };
          if (!newVideos.receivedVideo1) {
            newVideos.receivedVideo1 = new MediaStream([event.track]);
          } else if (!newVideos.receivedVideo2) {
            newVideos.receivedVideo2 = new MediaStream([event.track]);
          } else if (!newVideos.receivedVideo3) {
            newVideos.receivedVideo3 = new MediaStream([event.track]);
          } else if (!newVideos.receivedVideo4) {
            newVideos.receivedVideo4 = new MediaStream([event.track]);
          }
          return newVideos;
        });
      } else if (event.track.kind === 'audio') {
        console.log("Audio track added");
        setVideos(prevVideos => ({
          ...prevVideos,
          receivedAudio: new MediaStream([event.track])
        }));
      }
    };

    //Set Remote Description and Create Answer
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: sdp }));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      //Send the Answer back to the signaling server
      signalingSocketRef.current.send(JSON.stringify({
        type: 'answer',
        sdp: peerConnectionRef.current.localDescription.sdp
      }));
      processIceCandidateQueue();
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }, []);

  // Handle ICE candidates
  const handleIceCandidate = useCallback((candidate) => {
    if (!peerConnectionRef.current || !peerConnectionRef.current.remoteDescription || !peerConnectionRef.current.remoteDescription.type) {
      iceCandidateQueueRef.current.push(candidate);
    } else {
      addIceCandidate(candidate);
    }
  }, []);

  const addIceCandidate = useCallback(async (candidate) => {
    try {
      await peerConnectionRef.current.addIceCandidate(candidate);
    } catch (error) {
      console.error('Error adding received ICE candidate:', error);
    }
  }, []);

  const processIceCandidateQueue = useCallback(() => {
    while (iceCandidateQueueRef.current.length > 0) {
      const candidate = iceCandidateQueueRef.current.shift();
      addIceCandidate(candidate);
    }
  }, [addIceCandidate]);

  const handleSessionOK = useCallback(() => {
    console.log('Session OK received');
  }, []);

  // Handle data channel messages
  const handleDataChannelMessage = useCallback((data) => {
    console.log('Data channel message:', data);
    // Handle different message types here
    switch (data.type) {
      case 'bounding-box':
        // Handle bounding box data
        break;
      case 'point-cloud':
        // Handle point cloud data
        break;
      default:
        console.log("Unhandled data type:", data.type);
    }
  }, []);

  // Start connection
  const startConnection = useCallback(() => {
    if (robotId) {
      initializeSignaling();
    }
  }, [robotId, initializeSignaling]);

  // Stop connection
  const stopConnection = useCallback(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (signalingSocketRef.current) {
      signalingSocketRef.current.close();
    }
    setConnectionState('disconnected');
    setDataChannelState('closed');
    console.log('Connection closed');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopConnection();
    };
  }, [stopConnection]);

  return {
    connectionState,
    dataChannelState,
    videos,
    startConnection,
    stopConnection,
    sendData
  };
};
