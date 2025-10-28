const express = require('express');
const router = express.Router();
const MaintenanceQuote = require('../models/MaintenanceQuote');
const { auth, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');

// @route   GET /api/quotes
// @desc    Get all maintenance quotes
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, assetId } = req.query;
    const query = {};

    if (status) query.status = status;
    if (assetId) query.asset = assetId;

    const quotes = await MaintenanceQuote.find(query)
      .populate('asset', 'name assetNumber')
      .populate('maintenanceRecord', 'title')
      .populate('workOrder', 'title')
      .populate('requestedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(quotes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/quotes/:id
// @desc    Get single quote
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const quote = await MaintenanceQuote.findById(req.params.id)
      .populate('asset')
      .populate('maintenanceRecord')
      .populate('workOrder')
      .populate('requestedBy')
      .populate('approvedBy');

    if (!quote) {
      return res.status(404).json({ msg: 'Quote not found' });
    }

    res.json(quote);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/quotes
// @desc    Create new maintenance quote
// @access  Private - requires operator role or higher
router.post('/', auth, authorize('admin', 'operator', 'technician'), upload.array('attachments', 5), async (req, res) => {
  try {
    const quoteData = {
      ...req.body,
      requestedBy: req.user.id
    };

    // Handle uploaded attachments
    if (req.files && req.files.length > 0) {
      quoteData.attachments = req.files.map(file => ({
        name: file.originalname,
        url: `/uploads/${file.filename}`,
        type: path.extname(file.originalname)
      }));
    }

    const quote = new MaintenanceQuote(quoteData);
    await quote.save();

    res.status(201).json(quote);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/quotes/:id
// @desc    Update maintenance quote
// @access  Private - requires operator role or higher
router.put('/:id', auth, authorize('admin', 'operator', 'technician'), upload.array('attachments', 5), async (req, res) => {
  try {
    const quote = await MaintenanceQuote.findById(req.params.id);
    if (!quote) {
      return res.status(404).json({ msg: 'Quote not found' });
    }

    const updateData = { ...req.body };

    // Handle uploaded attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        name: file.originalname,
        url: `/uploads/${file.filename}`,
        type: path.extname(file.originalname)
      }));
      updateData.attachments = [...(quote.attachments || []), ...newAttachments];
    }

    Object.assign(quote, updateData);
    await quote.save();

    res.json(quote);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PATCH /api/quotes/:id/approve
// @desc    Approve or reject a quote
// @access  Private - requires admin role
router.patch('/:id/approve', auth, authorize('admin'), async (req, res) => {
  try {
    const quote = await MaintenanceQuote.findById(req.params.id);
    if (!quote) {
      return res.status(404).json({ msg: 'Quote not found' });
    }

    quote.status = req.body.status; // 'approved' or 'rejected'
    quote.approvedBy = req.user.id;
    quote.approvedDate = new Date();

    await quote.save();

    res.json(quote);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/quotes/:id
// @desc    Delete maintenance quote
// @access  Private - admin only
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    await MaintenanceQuote.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Quote deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;

