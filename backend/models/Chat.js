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
  }
}, {
  timestamps: true
});

// Index for efficient queries
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, read: 1, createdAt: -1 });
messageSchema.index({ isBroadcast: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);

