const mongoose = require('mongoose');

const workOrderSchema = new mongoose.Schema({
  workOrderNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled'],
    default: 'open'
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  scheduledStartDate: Date,
  scheduledEndDate: Date,
  actualStartDate: Date,
  actualEndDate: Date,
  estimatedCost: Number,
  actualCost: Number,
  category: {
    type: String,
    default: 'repair'
  },
  tags: [String],
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  notes: [{
    text: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: Date
  }],
  completedNotes: String
}, {
  timestamps: true
});

// Indexes
// Note: workOrderNumber already has an index from unique: true
workOrderSchema.index({ asset: 1 });
workOrderSchema.index({ status: 1 });
workOrderSchema.index({ assignedTo: 1 });

module.exports = mongoose.model('WorkOrder', workOrderSchema);
