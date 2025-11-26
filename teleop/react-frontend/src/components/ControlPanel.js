import React, { useState } from 'react';
import './ControlPanel.css';

const ControlPanel = ({
  connectionState,
  dataChannelState,
  onStartConnection,
  onStopConnection,
  onMoveToBin,
  onConveyorControl,
  onVideoManager,
  onClearSelection,
  onMoveToPose,
  clickedVideoId,
  clickedVideoX,
  clickedVideoY,
  regionPoints,
  interactionMode,
  onInteractionModeChange,
  showModeOnly = false
}) => {
  const [mode, setMode] = useState('click');

  const handleStart = () => {
    onStartConnection();
  };

  const handleStop = () => {
    onStopConnection();
  };

  const handleMoveToBin = (binId) => {
    onMoveToBin(binId);
  };

  const handleConveyorJam = () => {
    onConveyorControl('jam');
  };

  const handleConveyorRelease = () => {
    onConveyorControl('release');
  };

  const handleStartRecording = () => {
    onVideoManager('start');
  };

  const handleStopRecording = () => {
    onVideoManager('stop');
  };

  const handleMoveToPose = () => {
    if (clickedVideoId && clickedVideoX && clickedVideoY) {
      onMoveToPose(clickedVideoId, clickedVideoX, clickedVideoY);
    }
  };

  return (
    <div className={`control-panel ${showModeOnly ? 'mode-only' : ''}`}>
      {/* Interaction Mode Toggle - Only show when showModeOnly is true */}
      {showModeOnly && (
        <div className="mode-controls">
          {/* <label className="mode-label">Interaction Mode:</label> */}
          <div className="mode-toggle">
            <button
              className={`mode-button ${interactionMode === 'control' ? 'active' : ''}`}
              onClick={() => onInteractionModeChange('control')}
            >
              Control Mode (Joystick/Click)
            </button>
            <button
              className={`mode-button ${interactionMode === 'drag' ? 'active' : ''}`}
              onClick={() => onInteractionModeChange('drag')}
            >
              Drag Mode (Rearrange Videos)
            </button>
          </div>
        </div>
      )}

      {!showModeOnly && (
        <>
          {/* Connection Status */}
          <div className="connection-status">
            <div className={`status-indicator ${connectionState}`}>
              Connection: {connectionState}
            </div>
            <div className={`status-indicator ${dataChannelState}`}>
              Data Channel: {dataChannelState}
            </div>
          </div>

          {/* Main Control Buttons */}
          <div className="main-controls">
            <button 
              className="control-button home-button"
              onClick={() => handleMoveToBin('home')}
            >
              HOME
            </button>
            
            <div className="recording-controls">
              <button 
                className="control-button start-recording"
                onClick={handleStartRecording}
              >
                Start Recording
              </button>
              <button 
                className="control-button stop-recording"
                onClick={handleStopRecording}
              >
                Stop Recording
              </button>
            </div>
          </div>

          {/* Input Fields */}
          <div className="input-section">
            <div className="input-group">
              {/* <label>User Defined Bounding Box Value</label> */}
              <input 
                type="text" 
                value={regionPoints || ''} 
                readOnly 
                className="input-field"
                placeholder="User Defined Bounding Box Value"
              />
            </div>

            <div className="coordinate-inputs">
              <div className="input-group">
                {/* <label>Clicked Video ID</label> */}
                <input 
                  type="text" 
                  value={clickedVideoId || ''} 
                  readOnly 
                  className="input-field"
                  placeholder="Clicked Video ID"
                />
              </div>
              
              <div className="input-group">
                {/* <label>Clicked Video X</label> */}
                <input 
                  type="text" 
                  value={clickedVideoX || ''} 
                  readOnly 
                  className="input-field"
                  placeholder="Clicked Video X"
                />
              </div>
              
              <div className="input-group">
                {/* <label>Clicked Video Y</label> */}
                <input 
                  type="text" 
                  value={clickedVideoY || ''} 
                  readOnly 
                  className="input-field"
                  placeholder="Clicked Video Y"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button 
              className="control-button start-button"
              onClick={handleStart}
            >
              Start
            </button>
            
            <button 
              className="control-button stop-button"
              onClick={handleStop}
            >
              Stop
            </button>
            
            <button 
              className="control-button move-to-pose-button"
              onClick={handleMoveToPose}
            >
              Move to Pose
            </button>
            
            <button 
              className="control-button clear-selection-button"
              onClick={onClearSelection}
            >
              Clear Selection
            </button>
          </div>
        </>
      )}



      {/* Bin Controls, maybe will need to put the defect bowl*/}
      {/* <div className="bin-controls">
        <h3>Bin Controls</h3>
        <div className="bin-buttons">
          {Array.from({ length: 8 }, (_, i) => (
            <button
              key={i}
              className="control-button bin-button"
              onClick={() => handleMoveToBin(i)}
            >
              Bin {i + 1}
            </button>
          ))}
        </div>
      </div> */}


      {/* Conveyor Controls,maybe will need later */}
      {/* <div className="conveyor-controls">
        <h3>Conveyor Controls</h3>
        <button 
          className="control-button jam-button"
          onClick={handleConveyorJam}
        >
          Jam Conveyor
        </button>
        <button 
          className="control-button release-button"
          onClick={handleConveyorRelease}
        >
          Release Conveyor
        </button>
      </div> */}



    </div>
  );
};


export default ControlPanel;
