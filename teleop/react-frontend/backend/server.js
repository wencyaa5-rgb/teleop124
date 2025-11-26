require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const deviceRoutes = require('./routes/devices');

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/devices', deviceRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend server is running' });
});

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});







