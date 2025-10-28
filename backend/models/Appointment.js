const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  allDay: {
    type: Boolean,
    default: false
  },
  location: {
    type: String,
    trim: true,
    maxlength: 200
  },
  type: {
    type: String,
    enum: ['meeting', 'training', 'inspection', 'maintenance', 'event', 'other'],
    default: 'meeting'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['invited', 'accepted', 'declined', 'tentative'],
      default: 'invited'
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'system'],
      default: 'system'
    },
    minutes: {
      type: Number,
      default: 15 // 15 minutes before
    }
  }],
  relatedAsset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset'
  },
  relatedWorkOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkOrder'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    interval: {
      type: Number,
      min: 1,
      default: 1
    },
    endType: {
      type: String,
      enum: ['never', 'date', 'count']
    },
    endDate: Date,
    endCount: Number,
    daysOfWeek: [Number] // 0-6, where 0 is Sunday
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
appointmentSchema.index({ startDate: 1 });
appointmentSchema.index({ endDate: 1 });
appointmentSchema.index({ createdBy: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ type: 1 });

// Virtual for duration in minutes
appointmentSchema.virtual('duration').get(function() {
  if (this.startDate && this.endDate) {
    return Math.round((this.endDate - this.startDate) / (1000 * 60));
  }
  return 0;
});

// Pre-save validation
appointmentSchema.pre('save', function(next) {
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    next(new Error('End date must be after start date'));
  }
  next();
});

// Methods
appointmentSchema.methods.isOverdue = function() {
  return this.status !== 'completed' && this.status !== 'cancelled' && this.endDate < new Date();
};

appointmentSchema.methods.getColorClass = function() {
  switch (this.type) {
    case 'meeting':
      return 'bg-blue-100 text-blue-800 border-blue-400';
    case 'training':
      return 'bg-green-100 text-green-800 border-green-400';
    case 'inspection':
      return 'bg-purple-100 text-purple-800 border-purple-400';
    case 'maintenance':
      return 'bg-orange-100 text-orange-800 border-orange-400';
    case 'event':
      return 'bg-pink-100 text-pink-800 border-pink-400';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-400';
  }
};

module.exports = mongoose.model('Appointment', appointmentSchema);
