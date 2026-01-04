const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'maintenance_due',
      'maintenance_overdue',
      'equipment_inspection',
      'training_expiration',
      'certification_expiration',
      'callout_new',
      'checklist_assigned',
      'chat_message',
      'report_approved',
      'report_rejected',
      'training_approved',
      'training_rejected',
      'general'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: Date,
  // Link to related entity
  relatedEntity: {
    type: {
      type: String,
      enum: ['asset', 'maintenance', 'training', 'certificate', 'callout', 'checklist', 'chat', 'report']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  // Action link (URL to navigate to)
  actionUrl: String,
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  // Expiry date (for time-sensitive notifications)
  expiryDate: Date,
  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ expiryDate: 1 });

// Auto-expire old read notifications (cleanup can be done via TTL index or scheduled job)
// Unread notifications should not expire

module.exports = mongoose.model('Notification', notificationSchema);

