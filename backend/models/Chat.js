const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // For group chats
  groupChat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupChat'
  },
  // For group chats or broadcasts (legacy support)
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
  }]
}, {
  timestamps: true
});

// Index for efficient queries
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, read: 1, createdAt: -1 });
messageSchema.index({ isBroadcast: 1, createdAt: -1 });
messageSchema.index({ groupChat: 1, createdAt: -1 });

const groupChatSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['main', 'parade', 'training', 'callout', 'custom'],
    default: 'custom'
  },
  description: {
    type: String,
    trim: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastClearedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
groupChatSchema.index({ type: 1 });
groupChatSchema.index({ members: 1 });

module.exports = {
  Message: mongoose.model('Message', messageSchema),
  GroupChat: mongoose.model('GroupChat', groupChatSchema)
};

