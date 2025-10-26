const express = require('express');
const router = express.Router();
const WorkOrder = require('../models/WorkOrder');
const { auth, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const upload = require('../middleware/upload');
const { v4: uuidv4 } = require('uuid');

// @route   GET /api/workorders
// @desc    Get all work orders
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, assetId, assignedTo } = req.query;
    const query = {};

    if (status) query.status = status;
    if (assetId) query.asset = assetId;
    if (assignedTo) query.assignedTo = assignedTo;

    const workOrders = await WorkOrder.find(query)
      .populate('asset', 'name assetNumber status')
      .populate('requestedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json(workOrders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/workorders/:id
// @desc    Get single work order
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const workOrder = await WorkOrder.findById(req.params.id)
      .populate('asset')
      .populate('requestedBy')
      .populate('assignedTo')
      .populate('notes.author');

    if (!workOrder) {
      return res.status(404).json({ msg: 'Work order not found' });
    }

    res.json(workOrder);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/workorders
// @desc    Create new work order
// @access  Private
router.post('/', auth, upload.array('attachments', 5), async (req, res) => {
  try {
    const workOrderData = {
      ...req.body,
      workOrderNumber: `WO-${Date.now()}-${uuidv4().substring(0, 8)}`,
      requestedBy: req.user.id
    };

    // Handle uploaded attachments
    if (req.files && req.files.length > 0) {
      workOrderData.attachments = req.files.map(file => ({
        name: file.originalname,
        url: `/uploads/${file.filename}`,
        type: file.mimetype
      }));
    }

    const workOrder = new WorkOrder(workOrderData);
    await workOrder.save();

    res.status(201).json(workOrder);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/workorders/:id
// @desc    Update work order
// @access  Private
router.put('/:id', auth, upload.array('attachments', 5), async (req, res) => {
  try {
    const workOrder = await WorkOrder.findById(req.params.id);
    if (!workOrder) {
      return res.status(404).json({ msg: 'Work order not found' });
    }

    const updateData = { ...req.body };

    // Handle uploaded attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        name: file.originalname,
        url: `/uploads/${file.filename}`,
        type: file.mimetype
      }));
      updateData.attachments = [...(workOrder.attachments || []), ...newAttachments];
    }

    Object.assign(workOrder, updateData);
    await workOrder.save();

    res.json(workOrder);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/workorders/:id
// @desc    Delete work order
// @access  Private - admin only
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    await WorkOrder.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Work order deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/workorders/:id/notes
// @desc    Add note to work order
// @access  Private
router.post('/:id/notes', auth, [
  body('text').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const workOrder = await WorkOrder.findById(req.params.id);
    if (!workOrder) {
      return res.status(404).json({ msg: 'Work order not found' });
    }

    workOrder.notes.push({
      text: req.body.text,
      author: req.user.id,
      createdAt: new Date()
    });

    await workOrder.save();
    res.json(workOrder.notes[workOrder.notes.length - 1]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PATCH /api/workorders/:id/complete
// @desc    Mark work order as completed
// @access  Private - requires operator role or higher
router.patch('/:id/complete', auth, authorize('admin', 'operator', 'technician'), async (req, res) => {
  try {
    const workOrder = await WorkOrder.findById(req.params.id);
    if (!workOrder) {
      return res.status(404).json({ msg: 'Work order not found' });
    }

    workOrder.status = 'completed';
    workOrder.actualEndDate = new Date();
    workOrder.completedNotes = req.body.completedNotes || '';
    
    await workOrder.save();
    
    res.json(workOrder);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
