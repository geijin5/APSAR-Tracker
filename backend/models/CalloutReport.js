const mongoose = require('mongoose');

const calloutReportSchema = new mongoose.Schema({
  callout: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Callout',
    required: true
  },
  reportNumber: {
    type: String,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  reportType: {
    type: String,
    enum: ['incident', 'after_action', 'safety', 'equipment', 'personnel', 'other'],
    default: 'incident'
  },
  // Report sections for structured documentation
  sections: {
    summary: {
      type: String,
      trim: true
    },
    timeline: {
      type: String,
      trim: true
    },
    actionsTaken: {
      type: String,
      trim: true
    },
    personnel: {
      type: String,
      trim: true
    },
    equipment: {
      type: String,
      trim: true
    },
    weather: {
      type: String,
      trim: true
    },
    terrain: {
      type: String,
      trim: true
    },
    hazards: {
      type: String,
      trim: true
    },
    outcomes: {
      type: String,
      trim: true
    },
    recommendations: {
      type: String,
      trim: true
    },
    lessonsLearned: {
      type: String,
      trim: true
    }
  },
  // Free-form report content
  content: {
    type: String,
    required: true,
    trim: true
  },
  // Report status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'reviewed', 'approved', 'archived'],
    default: 'draft'
  },
  // Who wrote the report
  writtenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Review and approval
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  // Attachments specific to this report
  attachments: [{
    name: String,
    url: String,
    type: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Legal/audit fields
  isLegalDocument: {
    type: Boolean,
    default: true // All reports are legal documents
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  modificationHistory: [{
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modifiedAt: {
      type: Date,
      default: Date.now
    },
    changes: String,
    reason: String
  }]
}, {
  timestamps: true
});

// Generate report number before saving
calloutReportSchema.pre('save', async function(next) {
  if (!this.reportNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('CalloutReport').countDocuments({
      reportNumber: new RegExp(`^RPT-${year}-`)
    });
    this.reportNumber = `RPT-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Track modifications
calloutReportSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    if (!this.modificationHistory) {
      this.modificationHistory = [];
    }
    // Note: In a real implementation, you'd want to track specific field changes
    this.modificationHistory.push({
      modifiedBy: this.lastModifiedBy || this.writtenBy,
      modifiedAt: new Date(),
      changes: 'Report updated',
      reason: 'Document modification'
    });
  }
  next();
});

// Indexes
calloutReportSchema.index({ callout: 1, createdAt: -1 });
calloutReportSchema.index({ reportNumber: 1 });
calloutReportSchema.index({ writtenBy: 1 });
calloutReportSchema.index({ status: 1 });
calloutReportSchema.index({ reportType: 1 });

module.exports = mongoose.model('CalloutReport', calloutReportSchema);

