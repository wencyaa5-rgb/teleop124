const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  robot_id: {
    type: String,
    required: true,
    index: true,
  },
  ip: {
    type: String,
    required: true,
  },
  site: {
    type: String,
    required: true,
  },
  place: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active',
  },
}, {
  timestamps: true,
});

// Create compound index for better query performance
deviceSchema.index({ robot_id: 1, ip: 1 });

module.exports = mongoose.model('Device', deviceSchema);







