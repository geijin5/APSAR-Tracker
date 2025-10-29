const mongoose = require('mongoose');

const workOrderTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  estimatedDuration: {
    type: Number, // in hours
    default: 1
  },
  estimatedCost: {
    type: Number,
    default: 0
  },
  instructions: {
    type: String,
    trim: true
  },
  requiredSkills: [{
    type: String,
    trim: true
  }],
  requiredParts: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      default: 1
    },
    estimatedCost: {
      type: Number,
      default: 0
    }
  }],
  safetyNotes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  usage: {
    count: {
      type: Number,
      default: 0
    },
    lastUsed: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
workOrderTemplateSchema.index({ name: 1 });
workOrderTemplateSchema.index({ category: 1 });
workOrderTemplateSchema.index({ isActive: 1 });
workOrderTemplateSchema.index({ createdBy: 1 });

module.exports = mongoose.model('WorkOrderTemplate', workOrderTemplateSchema);
