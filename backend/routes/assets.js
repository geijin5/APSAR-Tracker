const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const { auth, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const upload = require('../middleware/upload');
const path = require('path');

// @route   GET /api/assets
// @desc    Get all assets
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, category, search, location } = req.query;
    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (location) query.currentLocation = { $regex: location, $options: 'i' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { assetNumber: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { rfid: { $regex: search, $options: 'i' } }
      ];
    }

    const assets = await Asset.find(query).populate('createdBy', 'firstName lastName email').sort({ createdAt: -1 });
    res.json(assets);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/assets/:id
// @desc    Get single asset
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id).populate('notes.author', 'firstName lastName');
    if (!asset) {
      return res.status(404).json({ msg: 'Asset not found' });
    }
    res.json(asset);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/assets
// @desc    Create new asset
// @access  Private - requires operator role or higher
router.post('/', auth, authorize('admin', 'operator'), upload.array('images', 10), async (req, res) => {
  try {
    const assetData = { ...req.body };
    
    if (assetData.specifications && typeof assetData.specifications === 'string') {
      assetData.specifications = JSON.parse(assetData.specifications);
    }
    
    assetData.createdBy = req.user.id;

    // Handle uploaded images
    if (req.files && req.files.length > 0) {
      assetData.images = req.files.map(file => ({
        url: `/uploads/${file.filename}`,
        caption: '',
        uploadedAt: new Date()
      }));
    }

    const asset = new Asset(assetData);
    await asset.save();
    res.status(201).json(asset);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/assets/:id
// @desc    Update asset
// @access  Private - requires operator role or higher
router.put('/:id', auth, authorize('admin', 'operator'), upload.array('images', 10), async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ msg: 'Asset not found' });
    }

    const updateData = { ...req.body };
    
    if (updateData.specifications && typeof updateData.specifications === 'string') {
      updateData.specifications = JSON.parse(updateData.specifications);
    }

    // Handle uploaded images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => ({
        url: `/uploads/${file.filename}`,
        caption: '',
        uploadedAt: new Date()
      }));
      updateData.images = [...(asset.images || []), ...newImages];
    }

    Object.assign(asset, updateData);
    await asset.save();
    res.json(asset);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/assets/:id
// @desc    Delete asset
// @access  Private - admin only
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    await Asset.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Asset deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/assets/:id/notes
// @desc    Add note to asset
// @access  Private
router.post('/:id/notes', auth, [
  body('text').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ msg: 'Asset not found' });
    }

    asset.notes.push({
      text: req.body.text,
      author: req.user.id,
      createdAt: new Date()
    });

    await asset.save();
    res.json(asset.notes[asset.notes.length - 1]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/assets/search/barcode/:barcode
// @desc    Search asset by barcode
// @access  Private
router.get('/search/barcode/:barcode', auth, async (req, res) => {
  try {
    const asset = await Asset.findOne({ barcode: req.params.barcode });
    if (!asset) {
      return res.status(404).json({ msg: 'Asset not found' });
    }
    res.json(asset);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;

