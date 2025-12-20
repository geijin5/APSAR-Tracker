const express = require('express');
const router = express.Router();
const CalloutReport = require('../models/CalloutReport');
const Callout = require('../models/Callout');
const { auth } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

// @route   GET /api/callout-reports
// @desc    Get all callout reports
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { calloutId, status, reportType, writtenBy } = req.query;
    const query = {};

    if (calloutId) query.callout = calloutId;
    if (status) query.status = status;
    if (reportType) query.reportType = reportType;
    if (writtenBy) query.writtenBy = writtenBy;

    const reports = await CalloutReport.find(query)
      .populate('callout', 'calloutNumber title startDate location')
      .populate('writtenBy', 'firstName lastName username')
      .populate('reviewedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/callout-reports/:id
// @desc    Get single callout report
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const report = await CalloutReport.findById(req.params.id)
      .populate('callout', 'calloutNumber title startDate location respondingMembers')
      .populate('writtenBy', 'firstName lastName username')
      .populate('reviewedBy', 'firstName lastName username')
      .populate('approvedBy', 'firstName lastName username')
      .populate('modificationHistory.modifiedBy', 'firstName lastName username')
      .populate('attachments.uploadedBy', 'firstName lastName');

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json(report);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/callout-reports
// @desc    Create new callout report
// @access  Private
router.post('/', auth, upload.array('attachments', 10), async (req, res) => {
  try {
    const { callout, title, reportType, content, sections } = req.body;

    if (!callout || !title || !content) {
      return res.status(400).json({ message: 'Callout, title, and content are required' });
    }

    // Verify callout exists
    const calloutExists = await Callout.findById(callout);
    if (!calloutExists) {
      return res.status(404).json({ message: 'Callout not found' });
    }

    const reportData = {
      callout,
      title,
      reportType: reportType || 'incident',
      content,
      writtenBy: req.user.id,
      status: 'draft'
    };

    // Parse sections if provided as JSON string
    if (sections) {
      reportData.sections = typeof sections === 'string' ? JSON.parse(sections) : sections;
    }

    // Handle uploaded attachments
    if (req.files && req.files.length > 0) {
      reportData.attachments = req.files.map(file => ({
        name: file.originalname,
        url: `/uploads/${file.filename}`,
        type: file.mimetype,
        uploadedBy: req.user.id
      }));
    }

    const report = new CalloutReport(reportData);
    await report.save();

    const populated = await CalloutReport.findById(report._id)
      .populate('callout', 'calloutNumber title')
      .populate('writtenBy', 'firstName lastName username');

    res.status(201).json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/callout-reports/:id
// @desc    Update callout report
// @access  Private (author can edit, admin/operator can edit any)
router.put('/:id', auth, upload.array('attachments', 10), async (req, res) => {
  try {
    const report = await CalloutReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check permissions
    const isAuthor = report.writtenBy.toString() === req.user.id;
    const isAdminOrOperator = ['admin', 'operator'].includes(req.user.role);

    if (!isAuthor && !isAdminOrOperator) {
      return res.status(403).json({ message: 'You can only edit your own reports' });
    }

    // Don't allow editing approved reports without admin permission
    if (report.status === 'approved' && !isAdminOrOperator) {
      return res.status(403).json({ message: 'Approved reports can only be edited by admins/operators' });
    }

    const updateData = { ...req.body };
    updateData.lastModifiedBy = req.user.id;

    // Parse sections if provided
    if (updateData.sections) {
      updateData.sections = typeof updateData.sections === 'string' 
        ? JSON.parse(updateData.sections) 
        : updateData.sections;
    }

    // Handle new attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        name: file.originalname,
        url: `/uploads/${file.filename}`,
        type: file.mimetype,
        uploadedBy: req.user.id
      }));
      updateData.attachments = [...(report.attachments || []), ...newAttachments];
    }

    Object.assign(report, updateData);
    await report.save();

    const populated = await CalloutReport.findById(report._id)
      .populate('callout', 'calloutNumber title')
      .populate('writtenBy', 'firstName lastName username')
      .populate('lastModifiedBy', 'firstName lastName username');

    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/callout-reports/:id/submit
// @desc    Submit report for review
// @access  Private
router.put('/:id/submit', auth, async (req, res) => {
  try {
    const report = await CalloutReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Only author can submit
    if (report.writtenBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the author can submit the report' });
    }

    report.status = 'submitted';
    await report.save();

    const populated = await CalloutReport.findById(report._id)
      .populate('writtenBy', 'firstName lastName username');

    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/callout-reports/:id/review
// @desc    Review report (Admin/Operator only)
// @access  Private - Admin/Operator
router.put('/:id/review', auth, authorize('admin', 'operator'), async (req, res) => {
  try {
    const report = await CalloutReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    report.status = 'reviewed';
    report.reviewedBy = req.user.id;
    report.reviewedAt = new Date();
    await report.save();

    const populated = await CalloutReport.findById(report._id)
      .populate('reviewedBy', 'firstName lastName username');

    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/callout-reports/:id/approve
// @desc    Approve report (Admin/Operator only)
// @access  Private - Admin/Operator
router.put('/:id/approve', auth, authorize('admin', 'operator'), async (req, res) => {
  try {
    const report = await CalloutReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    report.status = 'approved';
    report.approvedBy = req.user.id;
    report.approvedAt = new Date();
    await report.save();

    // Automatically attach to callout if not already attached
    const callout = await Callout.findById(report.callout);
    if (callout && !callout.reports.includes(report._id)) {
      callout.reports.push(report._id);
      await callout.save();
    }

    const populated = await CalloutReport.findById(report._id)
      .populate('approvedBy', 'firstName lastName username')
      .populate('callout', 'calloutNumber title');

    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/callout-reports/:id
// @desc    Delete callout report (Admin/Operator only)
// @access  Private - Admin/Operator
router.delete('/:id', auth, authorize('admin', 'operator'), async (req, res) => {
  try {
    const report = await CalloutReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Delete associated files
    if (report.attachments && report.attachments.length > 0) {
      report.attachments.forEach(att => {
        const filePath = path.join(__dirname, '..', att.url.replace('/uploads/', 'uploads/'));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    // Remove from callout if attached
    await Callout.updateMany(
      { reports: report._id },
      { $pull: { reports: report._id } }
    );

    await report.deleteOne();

    res.json({ message: 'Report deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;

