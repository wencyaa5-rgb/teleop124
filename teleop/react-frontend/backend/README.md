# Backend Server for TELEOP

This backend service manages device information using MongoDB.

## Setup

1. **Install MongoDB** (if not already installed)
   - Ubuntu/Debian: `sudo apt-get install mongodb`
   - Or use Docker: `docker run -d -p 27017:27017 mongo`

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env` (if needed)
   - Default MongoDB URI: `mongodb://localhost:27017/teleop`

3. **Import Device Data from CSV**
   ```bash
   npm run import-csv
   ```
   This will import devices from `/home/unloader/teleop/teleop/data.csv`

4. **Start the Backend Server**
   ```bash
   npm run backend
   ```
   The server will run on port 3001 by default.

## API Endpoints

- `GET /api/devices` - Get all devices
- `GET /api/devices/robot-ids` - Get unique robot IDs (for dropdown)
- `GET /api/devices/robot/:robotId` - Get devices by robot_id
- `POST /api/devices` - Create a new device
- `PUT /api/devices/:id` - Update a device
- `DELETE /api/devices/:id` - Delete a device

## Development

The backend server runs on port 3001 and the React app proxies requests to it (configured in `package.json`).


## Adding a New Device

### Method 1: Via the Web Browser Interface

1.  **Open the Device List Page**
      * In your web browser, navigate to: `http://localhost:5000`
2.  **Access the Add Device Form**
      * Click the **"+ Add New Device"** button.
3.  **Fill Out the Form**
      * Complete the required fields (e.g., `robot_id`, `ip`, `site`, `status`) and submit the form.


### Method 2: Using the Command Line (cURL)

```bash
curl -X POST http://localhost:3001/api/devices \
  -H "Content-Type: application/json" \
  -d '{"robot_id":"xxx","ip":"xxx","site":"xxx","status":"active"}'
```

### Method 3: change the  /home/unloader/teleop/teleop/data.csv

then npm run import-csv