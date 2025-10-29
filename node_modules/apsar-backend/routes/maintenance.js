const express = require('express');
const router = express.Router();
const MaintenanceRecord = require('../models/MaintenanceRecord');
const Asset = require('../models/Asset');
const ChecklistTemplate = require('../models/ChecklistTemplate');
const { auth, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const upload = require('../middleware/upload');
const path = require('path'); // Added missing import for path

// @route   GET /api/maintenance
// @desc    Get all maintenance records
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, assetId, type } = req.query;
    const query = {};

    if (status) query.status = status;
    if (assetId) query.asset = assetId;
    if (type) query.type = type;

    const records = await MaintenanceRecord.find(query)
      .populate('asset', 'name assetNumber status category')
      .populate('performedBy', 'firstName lastName')
      .populate('workOrder')
      .populate('checklistTemplate', 'name type')
      .sort({ scheduledDate: -1 });

    res.json(records);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/maintenance/overdue
// @desc    Get overdue maintenance records
// @access  Private
router.get('/overdue', auth, async (req, res) => {
  try {
    const now = new Date();
    const records = await MaintenanceRecord.find({
      status: { $in: ['scheduled', 'in_progress'] },
      dueDate: { $lt: now }
    })
      .populate('asset', 'name assetNumber status')
      .populate('performedBy', 'firstName lastName')
      .sort({ dueDate: 1 });

    res.json(records);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/maintenance/:id
// @desc    Get single maintenance record
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const record = await MaintenanceRecord.findById(req.params.id)
      .populate('asset')
      .populate('performedBy')
      .populate('workOrder')
      .populate('checklistTemplate');

    if (!record) {
      return res.status(404).json({ msg: 'Maintenance record not found' });
    }

    res.json(record);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/maintenance
// @desc    Create new maintenance record
// @access  Private - all authenticated users
router.post('/', auth, 
  upload.array('attachments', 5), async (req, res) => {
  try {
    const recordData = { ...req.body };
    
    if (recordData.checklist && typeof recordData.checklist === 'string') {
      recordData.checklist = JSON.parse(recordData.checklist);
    }
    if (recordData.partsUsed && typeof recordData.partsUsed === 'string') {
      recordData.partsUsed = JSON.parse(recordData.partsUsed);
    }

    // Handle uploaded attachments
    if (req.files && req.files.length > 0) {
      recordData.attachments = req.files.map(file => ({
        name: file.originalname,
        url: `/uploads/${file.filename}`,
        type: path.extname(file.originalname)
      }));
    }

    const record = new MaintenanceRecord(recordData);
    await record.save();

    // Update asset next maintenance date if provided
    if (recordData.nextMaintenanceDate || recordData.nextMaintenanceHours || recordData.nextMaintenanceMiles) {
      await Asset.findByIdAndUpdate(recordData.asset, {
        lastMaintenanceDate: recordData.completedDate || new Date(),
        nextMaintenanceDate: recordData.nextMaintenanceDate,
        ...(recordData.nextMaintenanceHours && { nextMaintenanceHours: recordData.nextMaintenanceHours }),
        ...(recordData.nextMaintenanceMiles && { nextMaintenanceMiles: recordData.nextMaintenanceMiles })
      });
    }

    res.status(201).json(record);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/maintenance/:id
// @desc    Update maintenance record
// @access  Private - requires operator role or higher
router.put('/:id', auth, authorize('admin', 'operator', 'technician'), 
  upload.array('attachments', 5), async (req, res) => {
  try {
    const record = await MaintenanceRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ msg: 'Maintenance record not found' });
    }

    const updateData = { ...req.body };
    
    if (updateData.checklist && typeof updateData.checklist === 'string') {
      updateData.checklist = JSON.parse(updateData.checklist);
    }
    if (updateData.partsUsed && typeof updateData.partsUsed === 'string') {
      updateData.partsUsed = JSON.parse(updateData.partsUsed);
    }

    // Handle uploaded attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        name: file.originalname,
        url: `/uploads/${file.filename}`,
        type: path.extname(file.originalname)
      }));
      updateData.attachments = [...(record.attachments || []), ...newAttachments];
    }

    Object.assign(record, updateData);
    await record.save();

    // Update asset if maintenance is completed
    if (updateData.status === 'completed' && updateData.completedDate) {
      await Asset.findByIdAndUpdate(record.asset, {
        lastMaintenanceDate: updateData.completedDate,
        nextMaintenanceDate: updateData.nextMaintenanceDate,
        status: 'operational'
      });
    }

    res.json(record);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/maintenance/:id
// @desc    Delete maintenance record
// @access  Private - admin only
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    await MaintenanceRecord.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Maintenance record deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PATCH /api/maintenance/:id/complete
// @desc    Mark maintenance record as completed
// @access  Private - requires operator role or higher
router.patch('/:id/complete', auth, authorize('admin', 'operator', 'technician'), async (req, res) => {
  try {
    const record = await MaintenanceRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ msg: 'Maintenance record not found' });
    }

    record.status = 'completed';
    record.completedDate = new Date();
    record.performedBy = req.user.id;
    
    await record.save();

    // Update asset
    await Asset.findByIdAndUpdate(record.asset, {
      lastMaintenanceDate: record.completedDate,
      status: 'operational'
    });
    
    res.json(record);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
