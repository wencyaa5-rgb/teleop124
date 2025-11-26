import React, { useRef, useEffect, useState } from 'react';
import './VideoPlayer.css';

const VideoPlayer = ({ 
  id, 
  stream, 
  onVideoClick, 
  showClickPoints = false, 
  clickPoints = [],
  showBoundingBox = false,
  boundingBox = null,
  showPolygon = false,
  polygonPoints = [],
  interactionMode = 'control',
  onDragStart,
  onDragEnd,
  isMainVideo = false,
  isDragging = false
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });

  // Handle stream changes - this is critical for drag-and-drop to work correctly
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Only update if the stream reference has actually changed
    if (videoElement.srcObject !== stream) {
      videoElement.srcObject = stream;
      // If stream is null, ensure video is cleared
      if (!stream) {
        videoElement.pause();
        videoElement.removeAttribute('src');
        videoElement.load();
      }
    }
  }, [stream, id]); // Depend on both stream and id to catch all changes

  useEffect(() => {
    const updateDimensions = () => {
      if (videoRef.current) {
        setVideoDimensions({
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight
        });
      }
    };

    const video = videoRef.current;
    if (video) {
      video.addEventListener('loadedmetadata', updateDimensions);
      video.addEventListener('resize', updateDimensions);
    }

    return () => {
      if (video) {
        video.removeEventListener('loadedmetadata', updateDimensions);
        video.removeEventListener('resize', updateDimensions);
      }
    };
  }, []);

  const handleVideoClick = (event) => {
    // Disable click in drag mode
    if (interactionMode !== 'control' || !onVideoClick || !videoRef.current) return;

    const rect = videoRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Normalize coordinates to match the original video resolution
    const normalizedX = Math.round((x / rect.width) * videoRef.current.videoWidth);
    const normalizedY = Math.round((y / rect.height) * videoRef.current.videoHeight);

    onVideoClick(id, normalizedX, normalizedY, x, y);
  };
  
  const handleDragStartEvent = (event) => {
    if (interactionMode !== 'drag' || !onDragStart) return;
    onDragStart(id);
    // Set drag image to a transparent image to hide the default drag image
    const dragImage = new Image();
    dragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    event.dataTransfer.setDragImage(dragImage, 0, 0);
    event.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragEndEvent = () => {
    if (interactionMode !== 'drag' || !onDragEnd) return;
    onDragEnd();
  };

  const renderClickPoints = () => {
    if (!showClickPoints || !clickPoints.length) return null;

    return clickPoints.map((point, index) => (
      <div
        key={index}
        className="click-point"
        style={{
          left: `${point.x - 6}px`,
          top: `${point.y - 6}px`
        }}
      />
    ));
  };

  const renderBoundingBox = () => {
    if (!showBoundingBox || !boundingBox || !videoRef.current) return null;

    const rect = videoRef.current.getBoundingClientRect();
    const scaleX = rect.width / videoRef.current.videoWidth;
    const scaleY = rect.height / videoRef.current.videoHeight;

    const [x, y, w, h] = boundingBox;

    return (
      <div
        className="bounding-box"
        style={{
          left: `${x * scaleX}px`,
          top: `${y * scaleY}px`,
          width: `${w * scaleX}px`,
          height: `${h * scaleY}px`
        }}
      />
    );
  };

  const renderPolygon = () => {
    if (!showPolygon || !polygonPoints.length) return null;

    const pointsString = polygonPoints
      .map(pt => `${pt.x},${pt.y}`)
      .join(' ');

    return (
      <svg className="user-polygon-svg">
        <polygon points={pointsString} />
      </svg>
    );
  };

  const isDragMode = interactionMode === 'drag';
  const cursorStyle = isDragMode ? 'grab' : 'crosshair';
  const cursorStyleActive = isDragMode ? 'grabbing' : 'crosshair';
  
  return (
    <div 
      className={`video-container ${isDragging ? 'dragging' : ''} ${isDragMode ? 'drag-mode' : ''}`}
      ref={containerRef}
      draggable={isDragMode}
      onDragStart={handleDragStartEvent}
      onDragEnd={handleDragEndEvent}
      style={{ cursor: isDragging ? cursorStyleActive : cursorStyle }}
    >
      <video
        ref={videoRef}
        id={id}
        controls={!isDragMode && stream}
        autoPlay={!!stream}
        playsInline
        onClick={handleVideoClick}
        className={`video-player ${isDragging ? 'dragging' : ''} ${!stream ? 'no-stream' : ''}`}
        style={{ 
          pointerEvents: isDragMode ? 'none' : 'auto',
          display: stream ? 'block' : 'none'
        }}
      />
      {!stream && (
        <div className="video-placeholder">
          <span>No video stream</span>
        </div>
      )}
      {isDragMode && (
        <div className="drag-overlay">
          <span className="drag-hint">
            {isMainVideo ? 'Main Video - Drag to swap' : 'Drag to swap position'}
          </span>
        </div>
      )}
      {stream && renderClickPoints()}
      {stream && renderBoundingBox()}
      {stream && renderPolygon()}
    </div>
  );
};

export default VideoPlayer;
