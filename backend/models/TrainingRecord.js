const mongoose = require('mongoose');

const trainingRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  type: {
    type: String,
    enum: ['certification', 'training', 'orientation', 'refresher', 'specialized', 'other'],
    required: true
  },
  category: {
    type: String,
    trim: true
  },
  trainingDate: {
    type: Date,
    required: true
  },
  expiryDate: Date,
  hours: Number,
  instructor: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['completed', 'in_progress', 'scheduled', 'cancelled', 'pending_approval', 'approved', 'rejected'],
    default: 'completed'
  },
  // Officer/Admin approval workflow
  requiresApproval: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedDate: Date,
  approvalNotes: String,
  // Links to certificate if this training resulted in certification
  certificate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Certificate'
  },
  // Attachments (certificates, completion documents, etc.)
  attachments: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: Date
  }],
  notes: String,
  // Assigned by (for training assignments)
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedDate: Date,
  completedDate: Date
}, {
  timestamps: true
});

// Indexes for efficient queries
trainingRecordSchema.index({ user: 1, trainingDate: -1 });
trainingRecordSchema.index({ status: 1 });
trainingRecordSchema.index({ type: 1 });
trainingRecordSchema.index({ expiryDate: 1 });
trainingRecordSchema.index({ requiresApproval: 1, status: 1 });

module.exports = mongoose.model('TrainingRecord', trainingRecordSchema);

