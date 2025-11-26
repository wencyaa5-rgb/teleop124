# TELEOP React Frontend


This is the React frontend for the TELEOP robot remote control system, replacing the original Bubble frontend.


## Project Structure

```
react-frontend/
├── backend/                    # Backend API Server (Express + MongoDB)
│   ├── config/
│   │   └── database.js         # MongoDB connection configuration
│   ├── models/
│   │   └── Device.js           # Device data model (Mongoose schema)
│   ├── routes/
│   │   └── devices.js          # Device API routes (CRUD operations)
│   ├── scripts/
│   │   └── importCSV.js        # CSV data import script
│   ├── server.js               # Express backend server (port 3001)
│   └── README.md               # Backend documentation
├── public/
│   └── index.html              # HTML template
├── src/
│   ├── components/
│   │   ├── ControlPanel.js     # Control panel component (buttons, inputs)
│   │   ├── ControlPanel.css
│   │   ├── DeviceList.js        # Device list page component
│   │   ├── DeviceList.css
│   │   ├── VideoPlayer.js       # WebRTC video player component
│   │   └── VideoPlayer.css
│   ├── hooks/
│   │   ├── useJoystick.js       # Joystick/keyboard input handling
│   │   └── useWebRTC.js         # WebRTC connection and data channel logic
│   ├── utils/                  # Utility functions (currently empty)
│   ├── App.js                  # Main router component (React Router)
│   ├── App.css                 # Global application styles
│   ├── Control.js              # Robot control page (video + controls)
│   ├── index.js                # React application entry point
│   └── index.css               # Global styles
├── package.json                # Dependencies and scripts
├── server.js                   # Static file server for production builds
└── README.md                   # This file
```


## WebRTC Quick Test Procedure

###  Video Stream Test

These steps verify the core WebRTC video connection.

1.  **Robot Backend Started:**
    * Ensure the robot programs (`gstreamer_webrtc.py` and `joystick_webrtc.js`) are running on the robot machine.
2.  **React Frontend Started:**
    * Ensure the React web application is running and accessible in the browser.
3.  **Initiate Connection:**
    * Click the **"Start"** button on the frontend page.
4.  **Restart Backend (if needed):**
    * Re-run the robot backend programs to establish a fresh connection.

---

# Data Channel Quick Test Procedure

##  Prerequisites

1.  **WebRTC Video Connection Established:** Video stream is successfully playing.
2.  **Robot Backend Running:** Both (`gstreamer_webrtc.py` and `joystick_webrtc.js`) are confirmed to be running.
3.  **React Frontend Running:** The frontend is visible and displaying the video feed.

##  Test Steps

1.  **Ensure the Page Has Focus:** Click anywhere on the webpage.
2.  **Press the Right Arrow Key (→)**
3.  **Check the Browser Console Output:** You should see data being sent:
    ```
    sending data {axes: [0.6, 0, 0, 0], buttons: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
    ```
4.  **Test Other Keys and Confirm Button Indexing:**
    * Press **SPACEBAR** → Should show `buttons[0] = 1`
    * Press **P Key** → Should show `buttons[1] = 1`
    * Press **H Key** → Should show `buttons[16] = 1`


### 📝 Key & Button Control Mapping

| Key Press | Function | Console Output Example |
| :--- | :--- | :--- |
| **↑ (Up Arrow)** | Move Forward | `axes: [0, -0.6, 0, 0]` |
| **↓ (Down Arrow)** | Move Backward | `axes: [0, 0.6, 0, 0]` |
| **← (Left Arrow)** | Turn Left | `axes: [-0.6, 0, 0, 0]` |
| **→ (Right Arrow)** | Turn Right | `axes: [0.6, 0, 0, 0]` |
| **Spacebar** | A Button (Release) | `buttons[0] = 1` |
| **P Key** | B Button (Grasp) | `buttons[1] = 1` |
| **X Key** | X Button | `buttons[2] = 1` |
| **Y Key** | Y Button | `buttons[3] = 1` |
| **H Key** | Home Button | `buttons[16] = 1` |
| **] Key** | Right Trigger | `buttons[7] = 0.15` |
| **[ Key** | Left Trigger | `buttons[6] = 0.4` |

### Gamepad Control Mapping

| Gamepad Input | Function | Data Channel Output (Index) |
| :--- | :--- | :--- |
| **Left Stick X-Axis** | Lateral Movement (L/R) | `axes[0]` |
| **Left Stick Y-Axis**** | Longitudinal Movement (Fwd/Back) | `axes[1]` |
| **Right Stick X-Axis** | Rotation | `axes[2]` |
| **Right Stick Y-Axis** | Pitch/Tilt | `axes[3]` |
| **A Button** | Release | `buttons[0]` |
| **B Button** | Grasp | `buttons[1]` |
| **X Button** | X Function | `buttons[2]` |
| **Y Button** | Y Function | `buttons[3]` |
| **Left Trigger** | Left Trigger | `buttons[6]` |
| **Right Trigger** | Right Trigger | `buttons[7]` |
| **Home Button** | Return to Home Position | `buttons[16]` |