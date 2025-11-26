import React, { useState, useEffect } from 'react';
import { useWebRTC } from './hooks/useWebRTC';
import { useJoystick } from './hooks/useJoystick';
import VideoPlayer from './components/VideoPlayer';
import ControlPanel from './components/ControlPanel';
import './App.css';

function Control() {
  const [robotId, setRobotId] = useState('');
  const [clickedVideoId, setClickedVideoId] = useState('');
  const [clickedVideoX, setClickedVideoX] = useState('');
  const [clickedVideoY, setClickedVideoY] = useState('');
  const [regionPoints, setRegionPoints] = useState('');
  const [clickPoints, setClickPoints] = useState([]);
  const [boundingBox, setBoundingBox] = useState(null);
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [mode, setMode] = useState('click');
  const [interactionMode, setInteractionMode] = useState('control'); // 'control' or 'drag'
  
  // Video layout: tracks which video ID is in which position
  // Position 0 is the main (large) video, positions 1-3 are secondary (small) videos
  const [videoLayout, setVideoLayout] = useState([
    'receivedVideo1', // Main video
    'receivedVideo2', // Secondary video 1
    'receivedVideo3', // Secondary video 2
    'receivedVideo4'  // Secondary video 3
  ]);
  
  const [draggedVideoId, setDraggedVideoId] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState(null);

  // Get robot ID from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const robotIdFromUrl = urlParams.get('robot_id');
    if (robotIdFromUrl) {
      setRobotId(robotIdFromUrl);
    } else {
      // If no robot_id in URL, redirect to device list
      // This ensures the page always has a valid robot_id
      window.location.href = '/';
    }
  }, []);

  const {
    connectionState,
    dataChannelState,
    videos,
    startConnection,
    stopConnection,
    sendData
  } = useWebRTC(robotId);

  const {
    sendClickCoordinates,
    sendMoveToBin,
    sendConveyorControl,
    sendVideoManager
  } = useJoystick(sendData);

  // Handle video click (only in control mode)
  const handleVideoClick = (videoId, normalizedX, normalizedY, displayX, displayY) => {
    if (interactionMode !== 'control') return;
    
    setClickedVideoId(videoId);
    setClickedVideoX(normalizedX);
    setClickedVideoY(normalizedY);

    // Add click point for display
    setClickPoints([{ x: displayX, y: displayY }]);

    // Send coordinates via WebRTC
    sendClickCoordinates(videoId, { x: normalizedX, y: normalizedY, z: 0 });
  };
  
  // Handle drag start
  const handleDragStart = (videoId) => {
    if (interactionMode !== 'drag') return;
    setDraggedVideoId(videoId);
  };
  
  // Handle drag over
  const handleDragOver = (e, position) => {
    if (interactionMode !== 'drag' || !draggedVideoId) return;
    e.preventDefault();
    setDragOverPosition(position);
  };
  
  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverPosition(null);
  };
  
  // Handle drop - swap videos
  const handleDrop = (e, targetPosition) => {
    if (interactionMode !== 'drag' || !draggedVideoId) return;
    e.preventDefault();
    
    const draggedIndex = videoLayout.indexOf(draggedVideoId);
    const targetIndex = targetPosition;
    
    if (draggedIndex !== -1 && draggedIndex !== targetIndex) {
      const newLayout = [...videoLayout];
      // Swap the videos
      [newLayout[draggedIndex], newLayout[targetIndex]] = [newLayout[targetIndex], newLayout[draggedIndex]];
      setVideoLayout(newLayout);
    }
    
    setDraggedVideoId(null);
    setDragOverPosition(null);
  };
  
  // Handle drag end
  const handleDragEnd = () => {
    setDraggedVideoId(null);
    setDragOverPosition(null);
  };

  // Handle move to pose
  const handleMoveToPose = (videoId, x, y) => {
    sendClickCoordinates(videoId, { x: parseInt(x), y: parseInt(y), z: 0 });
  };

  // Handle clear selection
  const handleClearSelection = () => {
    setClickPoints([]);
    setPolygonPoints([]);
    setBoundingBox(null);
    setClickedVideoId('');
    setClickedVideoX('');
    setClickedVideoY('');
    setRegionPoints('');
  };

  // Handle bin movement
  const handleMoveToBin = (binId) => {
    if (binId === 'home') {
      // Handle home button
      console.log('Home button pressed');
    } else {
      sendMoveToBin(parseInt(binId));
    }
  };

  // Handle conveyor control
  const handleConveyorControl = (command) => {
    sendConveyorControl(command);
  };

  // Handle video manager
  const handleVideoManager = (command) => {
    sendVideoManager(command);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>TELEOP - Robot Remote Control</h1>
        <p>Robot ID: {robotId}</p>
      </header>

      <main className="App-main">
        {/* Interaction Mode Toggle - Moved here */}
        <div className="mode-section">
          <ControlPanel
            connectionState={connectionState}
            dataChannelState={dataChannelState}
            onStartConnection={startConnection}
            onStopConnection={stopConnection}
            onMoveToBin={handleMoveToBin}
            onConveyorControl={handleConveyorControl}
            onVideoManager={handleVideoManager}
            onClearSelection={handleClearSelection}
            onMoveToPose={handleMoveToPose}
            clickedVideoId={clickedVideoId}
            clickedVideoX={clickedVideoX}
            clickedVideoY={clickedVideoY}
            regionPoints={regionPoints}
            interactionMode={interactionMode}
            onInteractionModeChange={setInteractionMode}
            showModeOnly={true}
          />
        </div>

        {/* Video Players Section */}
        <div className="video-section">
          <div className="video-grid">
            {/* Main Video Player */}
            <div 
              className={`main-video ${dragOverPosition === 0 ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, 0)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 0)}
            >
              <VideoPlayer
                key={`video-${videoLayout[0]}-main`}
                id={videoLayout[0]}
                stream={videos[videoLayout[0]]}
                onVideoClick={handleVideoClick}
                showClickPoints={true}
                clickPoints={clickPoints}
                showBoundingBox={true}
                boundingBox={boundingBox}
                interactionMode={interactionMode}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                isMainVideo={true}
                isDragging={draggedVideoId === videoLayout[0]}
              />
            </div>

            {/* Secondary Video Players */}
            <div className="secondary-videos">
              <div
                className={`secondary-video-wrapper ${dragOverPosition === 1 ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, 1)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 1)}
              >
                <VideoPlayer
                  key={`video-${videoLayout[1]}-secondary-1`}
                  id={videoLayout[1]}
                  stream={videos[videoLayout[1]]}
                  onVideoClick={handleVideoClick}
                  showClickPoints={true}
                  clickPoints={clickPoints}
                  showBoundingBox={true}
                  boundingBox={boundingBox}
                  showPolygon={true}
                  polygonPoints={polygonPoints}
                  interactionMode={interactionMode}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  isMainVideo={false}
                  isDragging={draggedVideoId === videoLayout[1]}
                />
              </div>
              
              <div
                className={`secondary-video-wrapper ${dragOverPosition === 2 ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, 2)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 2)}
              >
                <VideoPlayer
                  key={`video-${videoLayout[2]}-secondary-2`}
                  id={videoLayout[2]}
                  stream={videos[videoLayout[2]]}
                  onVideoClick={handleVideoClick}
                  showClickPoints={true}
                  clickPoints={clickPoints}
                  interactionMode={interactionMode}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  isMainVideo={false}
                  isDragging={draggedVideoId === videoLayout[2]}
                />
              </div>
              
              <div
                className={`secondary-video-wrapper ${dragOverPosition === 3 ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, 3)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 3)}
              >
                <VideoPlayer
                  key={`video-${videoLayout[3]}-secondary-3`}
                  id={videoLayout[3]}
                  stream={videos[videoLayout[3]]}
                  onVideoClick={handleVideoClick}
                  showClickPoints={true}
                  clickPoints={clickPoints}
                  interactionMode={interactionMode}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  isMainVideo={false}
                  isDragging={draggedVideoId === videoLayout[3]}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="control-section">
          <ControlPanel
            connectionState={connectionState}
            dataChannelState={dataChannelState}
            onStartConnection={startConnection}
            onStopConnection={stopConnection}
            onMoveToBin={handleMoveToBin}
            onConveyorControl={handleConveyorControl}
            onVideoManager={handleVideoManager}
            onClearSelection={handleClearSelection}
            onMoveToPose={handleMoveToPose}
            clickedVideoId={clickedVideoId}
            clickedVideoX={clickedVideoX}
            clickedVideoY={clickedVideoY}
            regionPoints={regionPoints}
            interactionMode={interactionMode}
            onInteractionModeChange={setInteractionMode}
            showModeOnly={false}
          />
        </div>
      </main>

      {/* Audio Player (hidden) */}
      {videos.receivedAudio && (
        <audio
          src={videos.receivedAudio}
          autoPlay
          controls
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
}

export default Control;
