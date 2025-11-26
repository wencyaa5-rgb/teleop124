const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Device = require('../models/Device');

// Get all devices
router.get('/', async (req, res) => {
  try {
    const devices = await Device.find().sort({ robot_id: 1, ip: 1 });
    res.json(devices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get unique robot IDs (for dropdown)
router.get('/robot-ids', async (req, res) => {
  try {
    const robotIds = await Device.distinct('robot_id');
    res.json(robotIds);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get devices by robot_id
router.get('/robot/:robotId', async (req, res) => {
  try {
    const devices = await Device.find({ robot_id: req.params.robotId });
    res.json(devices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new device
router.post('/', async (req, res) => {
  try {
    const device = new Device(req.body);
    const savedDevice = await device.save();
    res.status(201).json(savedDevice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a device
router.put('/:id', async (req, res) => {
  try {
    const device = await Device.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    res.json(device);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a device
router.delete('/:id', async (req, res) => {
  try {
    const device = await Device.findByIdAndDelete(req.params.id);
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update robot_id.txt file
router.post('/update-robot-id', async (req, res) => {
  try {
    const { robot_id } = req.body;
    
    if (!robot_id) {
      return res.status(400).json({ message: 'robot_id is required' });
    }

    // Path to robot_id.txt file (in the parent directory of react-frontend)
    // react-frontend is at: /home/unloader/teleop/teleop/react-frontend
    // robot_id.txt is at: /home/unloader/teleop/teleop/robot_id.txt
    const robotIdFilePath = path.join(__dirname, '../../../robot_id.txt');

    // Write the robot_id to the file
    fs.writeFileSync(robotIdFilePath, robot_id.trim() + '\n', 'utf8');
    
    console.log(`Updated robot_id.txt with: ${robot_id}`);
    res.json({ 
      message: 'robot_id.txt updated successfully', 
      robot_id: robot_id 
    });
  } catch (error) {
    console.error('Error updating robot_id.txt:', error);
    res.status(500).json({ 
      message: 'Failed to update robot_id.txt', 
      error: error.message 
    });
  }
});

module.exports = router;



