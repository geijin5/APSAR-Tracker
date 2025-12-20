const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return !this.isExternal; // Sender not required for external messages
    }
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Group chat type: 'main', 'parade', 'training', 'callout', or custom group name
  groupType: {
    type: String,
    enum: ['main', 'parade', 'training', 'callout', 'custom'],
    default: null
  },
  // For custom groups, store the group name
  groupName: {
    type: String,
    trim: true
  },
  // For group chats or broadcasts
  isBroadcast: {
    type: Boolean,
    default: false
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  // Track which users have read this message (for group chats)
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  // External integration fields (for ADLC Emergency app)
  isExternal: {
    type: Boolean,
    default: false
  },
  externalSource: {
    type: String,
    enum: ['adlc', 'dispatch', 'fire', 'ems', 'police', null],
    default: null
  },
  externalSenderName: {
    type: String,
    trim: true
  },
  externalSenderId: {
    type: String,
    trim: true
  },
  externalMetadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for efficient queries
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, read: 1, createdAt: -1 });
messageSchema.index({ groupType: 1, createdAt: -1 });
messageSchema.index({ groupName: 1, createdAt: -1 });
messageSchema.index({ isBroadcast: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 }); // For monthly clearing

module.exports = mongoose.model('Message', messageSchema);

