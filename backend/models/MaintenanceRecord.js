const mongoose = require('mongoose');

const maintenanceRecordSchema = new mongoose.Schema({
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true
  },
  type: {
    type: String,
    enum: ['preventive', 'corrective', 'inspection', 'calibration', 'certification'],
    required: true
  },
  scheduledDate: Date,
  dueDate: Date,
  completedDate: Date,
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'overdue', 'cancelled'],
    default: 'scheduled'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdByName: {
    type: String,
    trim: true
  },
  workOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkOrder'
  },
  checklist: [{
    item: String,
    completed: Boolean,
    notes: String,
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
  checklistTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChecklistTemplate'
  },
  partsUsed: [{
    name: String,
    partNumber: String,
    quantity: Number,
    unitCost: Number,
    totalCost: Number
  }],
  laborHours: Number,
  laborCost: Number,
  totalCost: Number,
  vendor: String,
  invoiceNumber: String,
  notes: String,
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  nextMaintenanceDate: Date,
  nextMaintenanceHours: Number,
  nextMaintenanceMiles: Number
}, {
  timestamps: true
});

// Indexes
maintenanceRecordSchema.index({ asset: 1 });
maintenanceRecordSchema.index({ status: 1 });
maintenanceRecordSchema.index({ scheduledDate: 1 });
maintenanceRecordSchema.index({ completedDate: 1 });

module.exports = mongoose.model('MaintenanceRecord', maintenanceRecordSchema);

