const mongoose = require('mongoose');

const completedChecklistSchema = new mongoose.Schema({
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChecklistTemplate',
    required: true
  },
  templateName: {
    type: String,
    required: true,
    trim: true
  },
  templateType: {
    type: String,
    enum: ['callout', 'maintenance', 'vehicle_inspection', 'general'],
    required: true
  },
  templateCategory: {
    type: String,
    trim: true
  },
  items: [{
    item: {
      type: String,
      required: true,
      trim: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      trim: true
    },
    required: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      default: 0
    },
    description: {
      type: String,
      trim: true
    }
  }],
  completedBy: {
    type: String,
    required: true,
    trim: true
  },
  completedDate: {
    type: String,
    required: true
  },
  completedTime: {
    type: String,
    required: true
  },
  completedDateTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  },
  completedByUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['completed', 'partial'],
    default: 'completed'
  },
  completionPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  totalItems: {
    type: Number,
    required: true
  },
  completedItems: {
    type: Number,
    required: true
  },
  requiredItems: {
    type: Number,
    default: 0
  },
  completedRequiredItems: {
    type: Number,
    default: 0
  },
  // Associated with a specific asset, work order, or maintenance record if applicable
  relatedAsset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset'
  },
  relatedWorkOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkOrder'
  },
  relatedMaintenanceRecord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MaintenanceRecord'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
completedChecklistSchema.index({ completedDateTime: -1 });
completedChecklistSchema.index({ completedByUser: 1 });
completedChecklistSchema.index({ template: 1 });
completedChecklistSchema.index({ templateType: 1 });
completedChecklistSchema.index({ status: 1 });
completedChecklistSchema.index({ createdAt: -1 });

// Calculate completion percentage before saving
completedChecklistSchema.pre('save', function(next) {
  const totalItems = this.items.length;
  const completedItems = this.items.filter(item => item.completed).length;
  const requiredItems = this.items.filter(item => item.required).length;
  const completedRequiredItems = this.items.filter(item => item.required && item.completed).length;
  
  this.totalItems = totalItems;
  this.completedItems = completedItems;
  this.requiredItems = requiredItems;
  this.completedRequiredItems = completedRequiredItems;
  this.completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  
  // Determine status based on completion
  if (requiredItems > 0) {
    this.status = completedRequiredItems === requiredItems ? 'completed' : 'partial';
  } else {
    this.status = completedItems === totalItems ? 'completed' : 'partial';
  }
  
  next();
});

module.exports = mongoose.model('CompletedChecklist', completedChecklistSchema);
