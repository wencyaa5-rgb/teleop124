require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Device = require('../models/Device');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/teleop';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const importCSV = async () => {
  try {
    await connectDB();
    
    // Read CSV file
    const csvPath = path.join(__dirname, '../../../data.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // Skip header row
    const dataLines = lines.slice(1);
    
    // Clear existing devices
    await Device.deleteMany({});
    console.log('Cleared existing devices');
    
    // Insert devices
    const devices = [];
    for (const line of dataLines) {
      if (!line.trim()) continue;
      
      const [robot_id, ip, site, place, status] = line.split(',');
      
      if (robot_id && ip && site) {
        devices.push({
          robot_id: robot_id.trim(),
          ip: ip.trim(),
          site: site.trim(),
          place: place ? place.trim() : '',
          status: (status || 'active').trim(),
        });
      }
    }
    
    if (devices.length > 0) {
      await Device.insertMany(devices);
      console.log(`Successfully imported ${devices.length} devices`);
    } else {
      console.log('No devices to import');
    }
    
    await mongoose.connection.close();
    console.log('Import completed');
  } catch (error) {
    console.error('Import error:', error);
    process.exit(1);
  }
};

importCSV();

