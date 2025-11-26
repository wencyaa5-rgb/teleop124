import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DeviceList.css';

function DeviceList() {
  const [devices, setDevices] = useState([]);
  const [robotIds, setRobotIds] = useState([]);
  const [selectedRobotId, setSelectedRobotId] = useState('');
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDevice, setNewDevice] = useState({
    robot_id: '',
    ip: '',
    site: '',
    place: '',
    status: 'active'
  });
  const [addDeviceError, setAddDeviceError] = useState(null);
  const [addDeviceSuccess, setAddDeviceSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDevices();
    fetchRobotIds();
  }, []);

  useEffect(() => {
    if (selectedRobotId) {
      setFilteredDevices(devices.filter(device => device.robot_id === selectedRobotId));
    } else {
      setFilteredDevices(devices);
    }
  }, [selectedRobotId, devices]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/devices');
      if (!response.ok) {
        throw new Error('Failed to fetch devices');
      }
      const data = await response.json();
      setDevices(data);
      setFilteredDevices(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError('Failed to load devices. Please make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRobotIds = async () => {
    try {
      const response = await fetch('/api/devices/robot-ids');
      if (!response.ok) {
        throw new Error('Failed to fetch robot IDs');
      }
      const data = await response.json();
      setRobotIds(data);
    } catch (err) {
      console.error('Error fetching robot IDs:', err);
    }
  };

  const handleDeviceClick = async (device) => {
    try {
      // Update robot_id.txt file before navigating
      const response = await fetch('/api/devices/update-robot-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ robot_id: device.robot_id }),
      });
      
      if (!response.ok) {
        console.warn('Failed to update robot_id.txt, but continuing...');
      }
      
      // Navigate to control page
      navigate(`/control?robot_id=${device.robot_id}`);
    } catch (err) {
      console.error('Error updating robot_id:', err);
      // Still navigate even if update fails
      navigate(`/control?robot_id=${device.robot_id}`);
    }
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    setAddDeviceError(null);
    setAddDeviceSuccess(false);

    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDevice),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add device');
      }

      const savedDevice = await response.json();
      console.log('Device added successfully:', savedDevice);
      
      // Reset form
      setNewDevice({
        robot_id: '',
        ip: '',
        site: '',
        place: '',
        status: 'active'
      });
      setShowAddForm(false);
      setAddDeviceSuccess(true);
      
      // Refresh device list
      await fetchDevices();
      await fetchRobotIds();
      
      // Clear success message after 3 seconds
      setTimeout(() => setAddDeviceSuccess(false), 3000);
    } catch (err) {
      console.error('Error adding device:', err);
      setAddDeviceError(err.message || 'Failed to add device. Please check your input.');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return 'status-badge active';
      case 'inactive':
        return 'status-badge inactive';
      case 'maintenance':
        return 'status-badge maintenance';
      default:
        return 'status-badge';
    }
  };

  if (loading) {
    return (
      <div className="device-list-container">
        <div className="loading">Loading devices...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="device-list-container">
        <div className="error">{error}</div>
        <button onClick={fetchDevices} className="retry-button">Retry</button>
      </div>
    );
  }

  return (
    <div className="device-list-container">
      <header className="device-list-header">
        <h1>TELEOP - Device List</h1>
        <p>Select a device to connect</p>
      </header>

      <div className="device-list-controls">
        <div className="filter-section">
          <label htmlFor="robot-id-select">Filter by Robot ID:</label>
          <select
            id="robot-id-select"
            value={selectedRobotId}
            onChange={(e) => setSelectedRobotId(e.target.value)}
            className="robot-id-select"
          >
            <option value="">All Devices</option>
            {robotIds.map((robotId) => (
              <option key={robotId} value={robotId}>
                {robotId}
              </option>
            ))}
          </select>
        </div>
        <div className="control-buttons">
          <button 
            onClick={() => setShowAddForm(!showAddForm)} 
            className="add-device-button"
          >
            {showAddForm ? 'Cancel' : '+ Add New Device'}
          </button>
          <button onClick={fetchDevices} className="refresh-button">
            Refresh
          </button>
        </div>
      </div>

      {/* Success Message */}
      {addDeviceSuccess && (
        <div className="success-message">
          Device added successfully!
        </div>
      )}

      {/* Add Device Form */}
      {showAddForm && (
        <div className="add-device-form-container">
          <form onSubmit={handleAddDevice} className="add-device-form">
            <h2>Add New Device</h2>
            
            {addDeviceError && (
              <div className="form-error">{addDeviceError}</div>
            )}

            <div className="form-group">
              <label htmlFor="robot_id">Robot ID *</label>
              <input
                type="text"
                id="robot_id"
                value={newDevice.robot_id}
                onChange={(e) => setNewDevice({ ...newDevice, robot_id: e.target.value })}
                placeholder="e.g., e07112f2-74f0-5535-812f-1ae53c16c3f0"
                required
              />
              <small className="form-hint">
                Get this from the robot's robot_id.txt file or util.py generate_robot_id()
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="ip">IP Address *</label>
              <input
                type="text"
                id="ip"
                value={newDevice.ip}
                onChange={(e) => setNewDevice({ ...newDevice, ip: e.target.value })}
                placeholder="e.g., 172.18.0.2"
                required
              />
              <small className="form-hint">
                The IP address of the robot
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="place">Place *</label>
              <input
                type="text"
                id="place"
                value={newDevice.place}
                onChange={(e) => setNewDevice({ ...newDevice, place: e.target.value })}
                placeholder="e.g., boston-unloader-unloader1"
                required
              />
              <small className="form-hint">
                Place identifier for the robot location
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="site">Site *</label>
              <input
                type="text"
                id="site"
                value={newDevice.site}
                onChange={(e) => setNewDevice({ ...newDevice, site: e.target.value })}
                placeholder="e.g., 1720904844326x838139993909442300"
                required
              />
              <small className="form-hint">
                Site identifier for the robot location
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="status">Status *</label>
              <select
                id="status"
                value={newDevice.status}
                onChange={(e) => setNewDevice({ ...newDevice, status: e.target.value })}
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-button">
                Add Device
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowAddForm(false);
                  setAddDeviceError(null);
                  setNewDevice({ robot_id: '', ip: '', site: '', place: '', status: 'active' });
                }}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="device-cards-grid">
        {filteredDevices.length === 0 ? (
          <div className="no-devices">No devices found</div>
        ) : (
          filteredDevices.map((device) => (
            <div
              key={device._id}
              className="device-card"
              onClick={() => handleDeviceClick(device)}
            >
              <div className="device-card-header">
                <h3 className="device-place">{device.place || 'N/A'}</h3>
                <span className={getStatusBadgeClass(device.status)}>
                  {device.status}
                </span>
              </div>
              <div className="device-card-body">
                <div className="device-info-item">
                  <span className="device-info-label">IP Address:</span>
                  <span className="device-info-value">{device.ip}</span>
                </div>
                <div className="device-info-item">
                  <span className="device-info-label">Robot ID:</span>
                  <span className="device-info-value">{device.robot_id}</span>
                </div>
                <div className="device-info-item">
                  <span className="device-info-label">Site:</span>
                  <span className="device-info-value">{device.site}</span>
                </div>
              </div>
              <div className="device-card-footer">
                <button className="connect-button">Connect</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default DeviceList;



