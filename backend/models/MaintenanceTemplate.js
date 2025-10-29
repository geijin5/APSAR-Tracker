const mongoose = require('mongoose');

const maintenanceTemplateSchema = new mongoose.Schema({
  name: {
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
    enum: ['preventive', 'corrective', 'inspection', 'calibration', 'certification'],
    required: true
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
  frequency: {
    type: {
      type: String,
      enum: ['hours', 'days', 'weeks', 'months', 'years', 'miles', 'cycles'],
      required: true
    },
    interval: {
      type: Number,
      required: true
    }
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
  checklistTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChecklistTemplate'
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
maintenanceTemplateSchema.index({ name: 1 });
maintenanceTemplateSchema.index({ type: 1 });
maintenanceTemplateSchema.index({ category: 1 });
maintenanceTemplateSchema.index({ isActive: 1 });
maintenanceTemplateSchema.index({ createdBy: 1 });

module.exports = mongoose.model('MaintenanceTemplate', maintenanceTemplateSchema);
