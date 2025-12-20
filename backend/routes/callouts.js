const express = require('express');
const router = express.Router();
const Callout = require('../models/Callout');
const CalloutReport = require('../models/CalloutReport');
const { auth } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

// @route   GET /api/callouts
// @desc    Get all callouts
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, type, startDate, endDate } = req.query;
    const query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const callouts = await Callout.find(query)
      .populate('createdBy', 'firstName lastName username')
      .populate('respondingMembers.member', 'firstName lastName username')
      .populate('reports', 'title reportNumber status writtenBy createdAt')
      .sort({ startDate: -1 });

    res.json(callouts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/callouts/:id
// @desc    Get single callout
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const callout = await Callout.findById(req.params.id)
      .populate('createdBy', 'firstName lastName username')
      .populate('respondingMembers.member', 'firstName lastName username role')
      .populate('reports', 'title reportNumber status writtenBy createdAt')
      .populate('attachments.uploadedBy', 'firstName lastName');

    if (!callout) {
      return res.status(404).json({ message: 'Callout not found' });
    }

    res.json(callout);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/callouts
// @desc    Create new callout
// @access  Private - Admin/Operator
router.post('/', auth, authorize('admin', 'operator'), upload.array('attachments', 10), async (req, res) => {
  try {
    const calloutData = {
      ...req.body,
      createdBy: req.user.id
    };

    // Parse dates
    if (calloutData.startDate) {
      calloutData.startDate = new Date(calloutData.startDate);
    }
    if (calloutData.endDate) {
      calloutData.endDate = new Date(calloutData.endDate);
    }

    // Parse location if provided as JSON string
    if (typeof calloutData.location === 'string') {
      calloutData.location = JSON.parse(calloutData.location);
    }

    // Handle uploaded attachments
    if (req.files && req.files.length > 0) {
      calloutData.attachments = req.files.map(file => ({
        name: file.originalname,
        url: `/uploads/${file.filename}`,
        type: file.mimetype,
        uploadedBy: req.user.id
      }));
    }

    const callout = new Callout(calloutData);
    await callout.save();

    const populated = await Callout.findById(callout._id)
      .populate('createdBy', 'firstName lastName username')
      .populate('respondingMembers.member', 'firstName lastName username');

    res.status(201).json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/callouts/:id
// @desc    Update callout
// @access  Private - Admin/Operator
router.put('/:id', auth, authorize('admin', 'operator'), upload.array('attachments', 10), async (req, res) => {
  try {
    const callout = await Callout.findById(req.params.id);

    if (!callout) {
      return res.status(404).json({ message: 'Callout not found' });
    }

    const updateData = { ...req.body };

    // Parse dates
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }

    // Parse location if provided
    if (typeof updateData.location === 'string') {
      updateData.location = JSON.parse(updateData.location);
    }

    // Handle new attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        name: file.originalname,
        url: `/uploads/${file.filename}`,
        type: file.mimetype,
        uploadedBy: req.user.id
      }));
      updateData.attachments = [...(callout.attachments || []), ...newAttachments];
    }

    Object.assign(callout, updateData);
    await callout.save();

    const populated = await Callout.findById(callout._id)
      .populate('createdBy', 'firstName lastName username')
      .populate('respondingMembers.member', 'firstName lastName username')
      .populate('reports', 'title reportNumber status');

    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/callouts/:id/checkin
// @desc    Check in a member to callout
// @access  Private
router.post('/:id/checkin', auth, async (req, res) => {
  try {
    const callout = await Callout.findById(req.params.id);

    if (!callout) {
      return res.status(404).json({ message: 'Callout not found' });
    }

    const { role, notes } = req.body;

    // Check if member already checked in
    const existingCheckIn = callout.respondingMembers.find(
      m => m.member.toString() === req.user.id
    );

    if (existingCheckIn) {
      return res.status(400).json({ message: 'Member already checked in' });
    }

    callout.respondingMembers.push({
      member: req.user.id,
      checkInTime: new Date(),
      role: role || 'member',
      notes: notes || ''
    });

    await callout.save();

    const populated = await Callout.findById(callout._id)
      .populate('respondingMembers.member', 'firstName lastName username');

    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/callouts/:id/checkout
// @desc    Check out a member from callout
// @access  Private
router.post('/:id/checkout', auth, async (req, res) => {
  try {
    const callout = await Callout.findById(req.params.id);

    if (!callout) {
      return res.status(404).json({ message: 'Callout not found' });
    }

    const memberCheckIn = callout.respondingMembers.find(
      m => m.member.toString() === req.user.id && !m.checkOutTime
    );

    if (!memberCheckIn) {
      return res.status(400).json({ message: 'Member not checked in' });
    }

    memberCheckIn.checkOutTime = new Date();
    await callout.save();

    const populated = await Callout.findById(callout._id)
      .populate('respondingMembers.member', 'firstName lastName username');

    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/callouts/:id/attach-report/:reportId
// @desc    Attach a report to a callout (Admin/Operator only)
// @access  Private - Admin/Operator
router.post('/:id/attach-report/:reportId', auth, authorize('admin', 'operator'), async (req, res) => {
  try {
    const callout = await Callout.findById(req.params.id);
    const report = await CalloutReport.findById(req.params.reportId);

    if (!callout) {
      return res.status(404).json({ message: 'Callout not found' });
    }

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check if report is already attached
    if (callout.reports.includes(report._id)) {
      return res.status(400).json({ message: 'Report already attached to this callout' });
    }

    // Verify report is for this callout
    if (report.callout.toString() !== callout._id.toString()) {
      return res.status(400).json({ message: 'Report does not belong to this callout' });
    }

    callout.reports.push(report._id);
    await callout.save();

    const populated = await Callout.findById(callout._id)
      .populate('reports', 'title reportNumber status writtenBy createdAt');

    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;

