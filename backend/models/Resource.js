const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: {
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
    enum: ['video', 'form', 'list'],
    required: true
  },
  file: {
    name: String,
    url: String,
    size: Number,
    mimeType: String
  },
  // For videos, can store YouTube/Vimeo URL
  videoUrl: {
    type: String,
    trim: true
  },
  // For lists, store items as array
  listItems: [{
    text: String,
    order: Number
  }],
  category: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Track who has viewed/downloaded
  views: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for efficient queries
resourceSchema.index({ type: 1, isActive: 1 });
resourceSchema.index({ category: 1 });
resourceSchema.index({ tags: 1 });

module.exports = mongoose.model('Resource', resourceSchema);

