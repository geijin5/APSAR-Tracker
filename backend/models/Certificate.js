const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  certificateNumber: {
    type: String,
    trim: true
  },
  issuingAuthority: {
    type: String,
    required: true,
    trim: true
  },
  issuedDate: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  fileUrl: {
    type: String
  },
  fileName: {
    type: String
  },
  fileType: {
    type: String
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'expiring_soon', 'renewed'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
certificateSchema.index({ user: 1, expiryDate: 1 });
certificateSchema.index({ expiryDate: 1 });
certificateSchema.index({ status: 1 });

// Virtual for days until expiration
certificateSchema.virtual('daysUntilExpiry').get(function() {
  const today = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Method to check if expiring soon (within 30 days)
certificateSchema.methods.isExpiringSoon = function() {
  const today = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 30 && diffDays > 0;
};

// Method to check if expired
certificateSchema.methods.isExpired = function() {
  const today = new Date();
  const expiry = new Date(this.expiryDate);
  return expiry < today;
};

// Update status before saving
certificateSchema.pre('save', function(next) {
  if (this.isExpired()) {
    this.status = 'expired';
  } else if (this.isExpiringSoon()) {
    this.status = 'expiring_soon';
  } else {
    this.status = 'active';
  }
  next();
});

module.exports = mongoose.model('Certificate', certificateSchema);

