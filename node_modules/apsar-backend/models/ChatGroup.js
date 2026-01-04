const mongoose = require('mongoose');

const chatGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['main', 'parade', 'training', 'callout', 'custom'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // For auto-clear functionality
  lastCleared: {
    type: Date,
    default: Date.now
  },
  autoClearEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
chatGroupSchema.index({ type: 1 });
chatGroupSchema.index({ name: 1 });

module.exports = mongoose.model('ChatGroup', chatGroupSchema);

