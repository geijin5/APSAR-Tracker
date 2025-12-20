const mongoose = require('mongoose');

const calloutSchema = new mongoose.Schema({
  calloutNumber: {
    type: String,
    unique: true,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['search', 'rescue', 'recovery', 'assist', 'training', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  location: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    description: String
  },
  incidentDescription: {
    type: String,
    trim: true
  },
  requestingAgency: {
    type: String,
    trim: true
  },
  contactPerson: {
    name: String,
    phone: String,
    agency: String
  },
  // Members who responded to the callout
  respondingMembers: [{
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    checkInTime: Date,
    checkOutTime: Date,
    role: String,
    notes: String
  }],
  // Attached reports
  reports: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CalloutReport'
  }],
  // Attachments (photos, documents, etc.)
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Generate callout number before saving
calloutSchema.pre('save', async function(next) {
  if (!this.calloutNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Callout').countDocuments({
      calloutNumber: new RegExp(`^CO-${year}-`)
    });
    this.calloutNumber = `CO-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Indexes
calloutSchema.index({ calloutNumber: 1 });
calloutSchema.index({ status: 1, startDate: -1 });
calloutSchema.index({ type: 1 });
calloutSchema.index({ 'respondingMembers.member': 1 });

module.exports = mongoose.model('Callout', calloutSchema);

