import { useState, useEffect, useCallback, useRef } from 'react';

export const useJoystick = (sendData) => {
  const [gamepadIndex, setGamepadIndex] = useState(null);
  const [keyboardState, setKeyboardState] = useState({
    rightTriggerPressed: false,
    leftTriggerPressed: false,
    aPressed: false,
    bPressed: false,
    xPressed: false,
    yPressed: false,
    upPressed: false,
    downPressed: false,
    rightPressed: false,
    leftPressed: false,
    homePressed: false
  });

  const animationFrameRef = useRef(null);

  //RemoteControl Step 2: Process Keyboard/Joystick Input
  // Keyboard event handlers
  const handleKeyDown = useCallback((event) => {
    switch (event.code) {
      case 'BracketRight':
        setKeyboardState(prev => ({ ...prev, rightTriggerPressed: true }));
        event.preventDefault();
        break;
      case 'BracketLeft':
        setKeyboardState(prev => ({ ...prev, leftTriggerPressed: true }));
        event.preventDefault();
        break;
      case 'Space':
        setKeyboardState(prev => ({ ...prev, aPressed: true }));
        break;
      case 'KeyP':
        setKeyboardState(prev => ({ ...prev, bPressed: true }));
        break;
      case 'KeyX':
        setKeyboardState(prev => ({ ...prev, xPressed: true }));
        break;
      case 'KeyY':
        setKeyboardState(prev => ({ ...prev, yPressed: true }));
        break;
      case 'ArrowUp':
        setKeyboardState(prev => ({ ...prev, upPressed: true }));
        break;
      case 'ArrowDown':
        setKeyboardState(prev => ({ ...prev, downPressed: true }));
        break;
      case 'ArrowRight':
        setKeyboardState(prev => ({ ...prev, rightPressed: true }));
        break;
      case 'ArrowLeft':
        setKeyboardState(prev => ({ ...prev, leftPressed: true }));
        break;
      case 'KeyH':
        setKeyboardState(prev => ({ ...prev, homePressed: true }));
        break;
      default:
        break;
    }
  }, []);

  const handleKeyUp = useCallback((event) => {
    switch (event.code) {
      case 'BracketRight':
        setKeyboardState(prev => ({ ...prev, rightTriggerPressed: false }));
        event.preventDefault();
        break;
      case 'BracketLeft':
        setKeyboardState(prev => ({ ...prev, leftTriggerPressed: false }));
        event.preventDefault();
        break;
      case 'Space':
        setKeyboardState(prev => ({ ...prev, aPressed: false }));
        break;
      case 'KeyP':
        setKeyboardState(prev => ({ ...prev, bPressed: false }));
        break;
      case 'KeyX':
        setKeyboardState(prev => ({ ...prev, xPressed: false }));
        break;
      case 'KeyY':
        setKeyboardState(prev => ({ ...prev, yPressed: false }));
        break;
      case 'ArrowUp':
        setKeyboardState(prev => ({ ...prev, upPressed: false }));
        break;
      case 'ArrowDown':
        setKeyboardState(prev => ({ ...prev, downPressed: false }));
        break;
      case 'ArrowRight':
        setKeyboardState(prev => ({ ...prev, rightPressed: false }));
        break;
      case 'ArrowLeft':
        setKeyboardState(prev => ({ ...prev, leftPressed: false }));
        break;
      default:
        break;
    }
  }, []);

  // Gamepad event handlers
  const handleGamepadConnected = useCallback((event) => {
    setGamepadIndex(event.gamepad.index);
    console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
      event.gamepad.index, event.gamepad.id,
      event.gamepad.buttons.length, event.gamepad.axes.length);
  }, []);

  const handleGamepadDisconnected = useCallback((event) => {
    console.log("Gamepad disconnected from index %d: %s",
      event.gamepad.index, event.gamepad.id);
    setGamepadIndex(null);
  }, []);

  //RemoteControl Step 3: Send Control Data
  // Poll gamepad data
  const pollGamepad = useCallback(() => {
    const gamepad = navigator.getGamepads()[gamepadIndex];

    const command = {
      axes: [0, 0, 0, 0],
      buttons: Array(17).fill(0)
    };

    if (gamepad) {
      command.axes = [...gamepad.axes];
      command.buttons = gamepad.buttons.map(button => button.value);
    }

    // Add keyboard input simulation
    if (keyboardState.rightTriggerPressed) {
      command.buttons[7] = 0.15;
    }
    if (keyboardState.leftTriggerPressed) {
      command.buttons[6] = 0.4;
    }
    if (keyboardState.xPressed) {
      command.buttons[2] = 1;
    }
    if (keyboardState.yPressed) {
      command.buttons[3] = 1;
    }
    if (keyboardState.aPressed) {
      command.buttons[0] = 1;
    }
    if (keyboardState.bPressed) {
      command.buttons[1] = 1;
    }

    // Map arrow keys to joystick axes
    if (keyboardState.upPressed) {
      command.axes[1] = -0.6;
    }
    if (keyboardState.downPressed) {
      command.axes[1] = 0.6;
    }
    if (keyboardState.rightPressed) {
      command.axes[0] = 0.6;
    }
    if (keyboardState.leftPressed) {
      command.axes[0] = -0.6;
    }

    if (keyboardState.homePressed) {
      command.buttons[16] = 1;
    }

    // Check if all values are below threshold
    const isBelowThreshold = command.axes.every(axis => Math.abs(axis) < 0.1) &&
                             command.buttons.every(button => button < 0.1);

    // Only send data if at least one value is above the threshold
    if (!isBelowThreshold && sendData) {
      sendData(command);
    }

    // Reset single-press buttons
    if (keyboardState.aPressed) {
      setKeyboardState(prev => ({ ...prev, aPressed: false }));
    }
    if (keyboardState.bPressed) {
      setKeyboardState(prev => ({ ...prev, bPressed: false }));
    }
    if (keyboardState.homePressed) {
      setKeyboardState(prev => ({ ...prev, homePressed: false }));
    }

    animationFrameRef.current = requestAnimationFrame(pollGamepad);
  }, [gamepadIndex, keyboardState, sendData]);

  // Setup event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    // Start polling
    pollGamepad();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [handleKeyDown, handleKeyUp, handleGamepadConnected, handleGamepadDisconnected, pollGamepad]);

  // Send specific commands
  const sendClickCoordinates = useCallback((videoId, coordinates) => {
    const message = {
      type: 'click-coordinates',
      videoId: videoId,
      coordinates: coordinates
    };
    sendData(message);
  }, [sendData]);

  const sendMoveToBin = useCallback((binId) => {
    const message = {
      type: 'move_to_bin',
      id: binId
    };
    sendData(message);
  }, [sendData]);

  const sendConveyorControl = useCallback((command) => {
    const message = {
      type: 'conveyor_control',
      command: command
    };
    sendData(message);
  }, [sendData]);

  const sendVideoManager = useCallback((command) => {
    const message = {
      type: 'video_manager',
      command: command
    };
    sendData(message);
  }, [sendData]);

  return {
    gamepadIndex,
    keyboardState,
    sendClickCoordinates,
    sendMoveToBin,
    sendConveyorControl,
    sendVideoManager
  };
};
