const mongoose = require('mongoose');

const checklistTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['callout', 'maintenance', 'vehicle_inspection', 'general'],
    index: true
  },
  category: {
    type: String,
    enum: ['vehicle_ground', 'vehicle_air', 'vehicle_marine', 'communications', 
           'medical', 'climbing', 'navigation', 'specialized', 'other', 'general'],
    default: 'general'
  },
  description: {
    type: String,
    trim: true
  },
  items: [{
    title: {
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
      enum: ['safety', 'operational', 'documentation', 'communication', 'equipment'],
      default: 'operational'
    },
    required: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient querying
checklistTemplateSchema.index({ type: 1, category: 1 });
checklistTemplateSchema.index({ isActive: 1 });

module.exports = mongoose.model('ChecklistTemplate', checklistTemplateSchema);
