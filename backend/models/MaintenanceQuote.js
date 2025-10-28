const mongoose = require('mongoose');

const maintenanceQuoteSchema = new mongoose.Schema({
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true
  },
  maintenanceRecord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MaintenanceRecord'
  },
  workOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkOrder'
  },
  vendorName: {
    type: String,
    required: true,
    trim: true
  },
  vendorContact: {
    name: String,
    phone: String,
    email: String,
    address: String
  },
  quoteNumber: {
    type: String,
    trim: true
  },
  quoteDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: Date,
  description: String,
  laborCost: Number,
  partsCost: Number,
  materialsCost: Number,
  totalCost: {
    type: Number,
    required: true
  },
  estimatedHours: Number,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'accepted', 'expired'],
    default: 'pending'
  },
  notes: String,
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedDate: Date
}, {
  timestamps: true
});

// Indexes
maintenanceQuoteSchema.index({ asset: 1 });
maintenanceQuoteSchema.index({ maintenanceRecord: 1 });
maintenanceQuoteSchema.index({ workOrder: 1 });
maintenanceQuoteSchema.index({ status: 1 });

module.exports = mongoose.model('MaintenanceQuote', maintenanceQuoteSchema);

