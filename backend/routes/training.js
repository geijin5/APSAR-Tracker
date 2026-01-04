const express = require('express');
const router = express.Router();
const TrainingRecord = require('../models/TrainingRecord');
const Certificate = require('../models/Certificate');
const { auth, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { body, validationResult } = require('express-validator');

// @route   GET /api/training
// @desc    Get all training records (filtered by user, type, status)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { userId, type, status, requiresApproval } = req.query;
    const query = {};

    // Members can only see their own training, officers/admin can see all
    if (req.user.role === 'member') {
      query.user = req.user.id;
    } else if (userId) {
      query.user = userId;
    }

    if (type) query.type = type;
    if (status) query.status = status;
    if (requiresApproval !== undefined) {
      query.requiresApproval = requiresApproval === 'true';
    }

    const records = await TrainingRecord.find(query)
      .populate('user', 'firstName lastName username')
      .populate('approvedBy', 'firstName lastName username')
      .populate('assignedBy', 'firstName lastName username')
      .populate('certificate')
      .sort({ trainingDate: -1 });

    res.json(records);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/training/:id
// @desc    Get single training record
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const record = await TrainingRecord.findById(req.params.id)
      .populate('user', 'firstName lastName username')
      .populate('approvedBy', 'firstName lastName username')
      .populate('assignedBy', 'firstName lastName username')
      .populate('certificate');

    if (!record) {
      return res.status(404).json({ msg: 'Training record not found' });
    }

    // Members can only view their own records
    if (req.user.role === 'member' && record.user._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    res.json(record);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/training
// @desc    Create training record (or submit for approval)
// @access  Private - all authenticated users
router.post('/', auth, upload.array('attachments', 5), [
  body('title').notEmpty().trim().withMessage('Title is required'),
  body('type').isIn(['certification', 'training', 'orientation', 'refresher', 'specialized', 'other'])
    .withMessage('Invalid training type'),
  body('trainingDate').isISO8601().withMessage('Training date is required'),
  body('userId').optional().isMongoId().withMessage('Invalid user ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, title, description, type, trainingDate, expiryDate, hours, 
            instructor, location, status, requiresApproval, notes } = req.body;

    // Officers/Admin can assign training to others, members can only create their own
    const targetUserId = (req.user.role === 'admin' || req.user.role === 'officer') && userId 
      ? userId 
      : req.user.id;

    const recordData = {
      user: targetUserId,
      title,
      description,
      type,
      trainingDate: new Date(trainingDate),
      status: status || (requiresApproval === 'true' ? 'pending_approval' : 'completed'),
      requiresApproval: requiresApproval === 'true'
    };

    if (expiryDate) recordData.expiryDate = new Date(expiryDate);
    if (hours) recordData.hours = parseFloat(hours);
    if (instructor) recordData.instructor = instructor;
    if (location) recordData.location = location;
    if (notes) recordData.notes = notes;

    // If officer/admin is assigning, track assignment
    if ((req.user.role === 'admin' || req.user.role === 'officer') && userId) {
      recordData.assignedBy = req.user.id;
      recordData.assignedDate = new Date();
      recordData.requiresApproval = true;
      recordData.status = 'scheduled';
    }

    // Handle uploaded attachments
    if (req.files && req.files.length > 0) {
      recordData.attachments = req.files.map(file => ({
        name: file.originalname,
        url: `/uploads/${file.filename}`,
        type: file.mimetype,
        uploadedAt: new Date()
      }));
    }

    const record = new TrainingRecord(recordData);
    await record.save();

    const populated = await TrainingRecord.findById(record._id)
      .populate('user', 'firstName lastName username')
      .populate('assignedBy', 'firstName lastName username');

    res.status(201).json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/training/:id
// @desc    Update training record
// @access  Private - owner can update, officers/admin can update any
router.put('/:id', auth, upload.array('attachments', 5), async (req, res) => {
  try {
    const record = await TrainingRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ msg: 'Training record not found' });
    }

    // Check permissions
    const isOwner = record.user.toString() === req.user.id;
    const isOfficerOrAdmin = req.user.role === 'admin' || req.user.role === 'officer';
    
    if (!isOwner && !isOfficerOrAdmin) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const updateData = { ...req.body };
    
    // Parse dates
    if (updateData.trainingDate) updateData.trainingDate = new Date(updateData.trainingDate);
    if (updateData.expiryDate) updateData.expiryDate = new Date(updateData.expiryDate);
    if (updateData.completedDate) updateData.completedDate = new Date(updateData.completedDate);

    // Handle uploaded attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        name: file.originalname,
        url: `/uploads/${file.filename}`,
        type: file.mimetype,
        uploadedAt: new Date()
      }));
      updateData.attachments = [...(record.attachments || []), ...newAttachments];
    }

    Object.assign(record, updateData);
    await record.save();

    const populated = await TrainingRecord.findById(record._id)
      .populate('user', 'firstName lastName username')
      .populate('approvedBy', 'firstName lastName username')
      .populate('assignedBy', 'firstName lastName username');

    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/training/:id/approve
// @desc    Approve training record (Officer/Admin only)
// @access  Private - Officer/Admin
router.put('/:id/approve', auth, authorize('admin', 'officer'), [
  body('approved').isBoolean().withMessage('Approved must be boolean'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const record = await TrainingRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ msg: 'Training record not found' });
    }

    const { approved, notes } = req.body;

    if (approved) {
      record.status = 'approved';
      record.approvedBy = req.user.id;
      record.approvedDate = new Date();
      if (notes) record.approvalNotes = notes;
      
      // If training is completed and has expiry, optionally create certificate
      if (record.status === 'completed' && record.expiryDate && !record.certificate) {
        // Optionally create certificate here
      }
    } else {
      record.status = 'rejected';
      record.approvedBy = req.user.id;
      record.approvedDate = new Date();
      if (notes) record.approvalNotes = notes;
    }

    await record.save();

    const populated = await TrainingRecord.findById(record._id)
      .populate('user', 'firstName lastName username')
      .populate('approvedBy', 'firstName lastName username');

    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/training/user/:userId
// @desc    Get training history for a user
// @access  Private - members can only see their own, officers/admin can see any
router.get('/user/:userId', auth, async (req, res) => {
  try {
    // Members can only view their own training history
    if (req.user.role === 'member' && req.params.userId !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const records = await TrainingRecord.find({ user: req.params.userId })
      .populate('approvedBy', 'firstName lastName username')
      .populate('assignedBy', 'firstName lastName username')
      .populate('certificate')
      .sort({ trainingDate: -1 });

    res.json(records);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/training/:id
// @desc    Delete training record
// @access  Private - Officer/Admin only
router.delete('/:id', auth, authorize('admin', 'officer'), async (req, res) => {
  try {
    const record = await TrainingRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ msg: 'Training record not found' });
    }

    await record.deleteOne();
    res.json({ msg: 'Training record deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;

