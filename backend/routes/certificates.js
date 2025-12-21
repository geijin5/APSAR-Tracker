const express = require('express');
const router = express.Router();
const Certificate = require('../models/Certificate');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

// @route   GET /api/certificates
// @desc    Get all certificates (with filters)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { userId, status, expiringSoon } = req.query;
    const query = {};

    // Filter by user if specified
    if (userId) {
      query.user = userId;
    } else if (!['admin', 'operator', 'trainer'].includes(req.user.role)) {
      // Admin, operator, and trainer can see all certificates
      // Others only see their own certificates
      query.user = req.user.id;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter for expiring soon (within 30 days)
    if (expiringSoon === 'true') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      query.expiryDate = { $lte: thirtyDaysFromNow, $gte: new Date() };
    }

    const certificates = await Certificate.find(query)
      .populate('user', 'firstName lastName username')
      .populate('createdBy', 'firstName lastName')
      .sort({ expiryDate: 1 });

    res.json(certificates);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/certificates/:id
// @desc    Get single certificate
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('user', 'firstName lastName username')
      .populate('createdBy', 'firstName lastName');

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    // Check if user has permission (own certificate or admin/operator/trainer)
    if (certificate.user._id.toString() !== req.user.id && !['admin', 'operator', 'trainer'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(certificate);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/certificates
// @desc    Create new certificate
// @access  Private
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    const certificateData = {
      ...req.body,
      createdBy: req.user.id
    };

    // Set user - admin, operator, and trainer can set for others, others can only set for themselves
    if (['admin', 'operator', 'trainer'].includes(req.user.role) && req.body.userId) {
      certificateData.user = req.body.userId;
    } else {
      certificateData.user = req.user.id;
    }

    // Handle uploaded file
    if (req.file) {
      certificateData.fileUrl = `/uploads/${req.file.filename}`;
      certificateData.fileName = req.file.originalname;
      certificateData.fileType = req.file.mimetype;
    }

    // Parse dates
    if (certificateData.issuedDate) {
      certificateData.issuedDate = new Date(certificateData.issuedDate);
    }
    if (certificateData.expiryDate) {
      certificateData.expiryDate = new Date(certificateData.expiryDate);
    }

    const certificate = new Certificate(certificateData);
    await certificate.save();

    const populated = await Certificate.findById(certificate._id)
      .populate('user', 'firstName lastName username')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/certificates/:id
// @desc    Update certificate
// @access  Private
router.put('/:id', auth, upload.single('file'), async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    // Check permissions - admin, operator, and trainer can edit any certificate
    if (certificate.user.toString() !== req.user.id && !['admin', 'operator', 'trainer'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updateData = { ...req.body };

    // Handle file update
    if (req.file) {
      // Delete old file if exists
      if (certificate.fileUrl) {
        const oldFilePath = path.join(__dirname, '..', certificate.fileUrl.replace('/uploads/', 'uploads/'));
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      updateData.fileUrl = `/uploads/${req.file.filename}`;
      updateData.fileName = req.file.originalname;
      updateData.fileType = req.file.mimetype;
    }

    // Parse dates
    if (updateData.issuedDate) {
      updateData.issuedDate = new Date(updateData.issuedDate);
    }
    if (updateData.expiryDate) {
      updateData.expiryDate = new Date(updateData.expiryDate);
    }

    Object.assign(certificate, updateData);
    await certificate.save();

    const populated = await Certificate.findById(certificate._id)
      .populate('user', 'firstName lastName username')
      .populate('createdBy', 'firstName lastName');

    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/certificates/:id
// @desc    Delete certificate
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    // Check permissions - admin, operator, and trainer can edit any certificate
    if (certificate.user.toString() !== req.user.id && !['admin', 'operator', 'trainer'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete associated file
    if (certificate.fileUrl) {
      const filePath = path.join(__dirname, '..', certificate.fileUrl.replace('/uploads/', 'uploads/'));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await certificate.deleteOne();
    res.json({ message: 'Certificate deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/certificates/stats/expiring
// @desc    Get certificates expiring soon
// @access  Private
router.get('/stats/expiring', auth, async (req, res) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const query = {
      expiryDate: { $lte: thirtyDaysFromNow, $gte: new Date() }
    };

    // Admin, operator, and trainer can see all expiring certificates
    if (!['admin', 'operator', 'trainer'].includes(req.user.role)) {
      query.user = req.user.id;
    }

    const expiring = await Certificate.find(query)
      .populate('user', 'firstName lastName username')
      .sort({ expiryDate: 1 });

    res.json(expiring);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;

