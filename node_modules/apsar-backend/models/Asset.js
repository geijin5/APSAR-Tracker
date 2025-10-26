const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  assetNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  rfid: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['vehicle_ground', 'vehicle_air', 'vehicle_marine', 'communications', 
           'medical', 'climbing', 'navigation', 'specialized', 'other']
  },
  type: {
    type: String,
    required: true,
    trim: true
  },
  manufacturer: {
    type: String,
    trim: true
  },
  model: {
    type: String,
    trim: true
  },
  serialNumber: {
    type: String,
    trim: true
  },
  purchaseDate: Date,
  purchaseCost: Number,
  currentLocation: {
    type: String,
    trim: true
  },
  assignedUnit: {
    type: String,
    trim: true
  },
  assignedTeam: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['operational', 'maintenance', 'repair', 'retired', 'lost'],
    default: 'operational'
  },
  specifications: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  images: [{
    url: String,
    caption: String,
    uploadedAt: Date
  }],
  documents: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: Date
  }],
  certifications: [{
    name: String,
    issuedDate: Date,
    expiryDate: Date,
    issuingAuthority: String,
    documentUrl: String
  }],
  expiryItems: [{
    name: String,
    expiryDate: Date,
    daysUntilExpiry: Number,
    status: {
      type: String,
      enum: ['valid', 'expiring_soon', 'expired'],
      default: 'valid'
    }
  }],
  notes: [{
    text: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: Date
  }],
  lastMaintenanceDate: Date,
  nextMaintenanceDate: Date,
  totalHours: Number,
  totalMiles: Number,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster searches
// Note: assetNumber, barcode, and rfid already have indexes from unique: true
assetSchema.index({ status: 1 });
assetSchema.index({ category: 1 });

module.exports = mongoose.model('Asset', assetSchema);
