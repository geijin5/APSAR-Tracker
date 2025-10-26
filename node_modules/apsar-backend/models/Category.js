const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['asset', 'workorder', 'maintenance'],
    required: true
  },
  color: {
    type: String,
    default: '#3B82F6' // Default blue color
  },
  description: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster lookups
categorySchema.index({ type: 1 });

module.exports = mongoose.model('Category', categorySchema);
