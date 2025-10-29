const express = require('express');
const router = express.Router();
const CompletedChecklist = require('../models/CompletedChecklist');
const ChecklistTemplate = require('../models/ChecklistTemplate');
const { auth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// @route   GET /api/completed-checklists
// @desc    Get all completed checklists
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      templateType, 
      status, 
      completedBy, 
      dateFrom, 
      dateTo,
      sortBy = 'completedDateTime',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    // Filter by template type
    if (templateType && templateType !== 'all') {
      query.templateType = templateType;
    }
    
    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Filter by completed by (name)
    if (completedBy) {
      query.completedBy = { $regex: completedBy, $options: 'i' };
    }
    
    // Filter by date range
    if (dateFrom || dateTo) {
      query.completedDateTime = {};
      if (dateFrom) {
        query.completedDateTime.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999); // End of day
        query.completedDateTime.$lte = endDate;
      }
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const completedChecklists = await CompletedChecklist.find(query)
      .populate('template', 'name description')
      .populate('completedByUser', 'firstName lastName')
      .populate('relatedAsset', 'name assetNumber')
      .populate('relatedWorkOrder', 'workOrderNumber title')
      .populate('relatedMaintenanceRecord', 'title')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await CompletedChecklist.countDocuments(query);

    res.json({
      completedChecklists,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/completed-checklists/stats
// @desc    Get completed checklists statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const totalCompleted = await CompletedChecklist.countDocuments();
    const completedToday = await CompletedChecklist.countDocuments({
      completedDateTime: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lte: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });
    
    // Get completion stats by type
    const byType = await CompletedChecklist.aggregate([
      {
        $group: {
          _id: '$templateType',
          count: { $sum: 1 },
          avgCompletionPercentage: { $avg: '$completionPercentage' }
        }
      }
    ]);

    // Get completion stats by status
    const byStatus = await CompletedChecklist.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Most active users (by completed checklists)
    const topUsers = await CompletedChecklist.aggregate([
      {
        $group: {
          _id: '$completedBy',
          count: { $sum: 1 },
          userId: { $first: '$completedByUser' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Most used templates
    const topTemplates = await CompletedChecklist.aggregate([
      {
        $group: {
          _id: '$template',
          templateName: { $first: '$templateName' },
          count: { $sum: 1 },
          avgCompletionPercentage: { $avg: '$completionPercentage' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      totalCompleted,
      completedToday,
      byType,
      byStatus,
      topUsers,
      topTemplates
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/completed-checklists/:id
// @desc    Get single completed checklist
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const completedChecklist = await CompletedChecklist.findById(req.params.id)
      .populate('template', 'name description')
      .populate('completedByUser', 'firstName lastName')
      .populate('relatedAsset', 'name assetNumber')
      .populate('relatedWorkOrder', 'workOrderNumber title')
      .populate('relatedMaintenanceRecord', 'title');

    if (!completedChecklist) {
      return res.status(404).json({ msg: 'Completed checklist not found' });
    }

    res.json(completedChecklist);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/completed-checklists
// @desc    Save a completed checklist
// @access  Private
router.post('/', auth, [
  body('template', 'Template ID is required').not().isEmpty(),
  body('templateName', 'Template name is required').not().isEmpty(),
  body('templateType', 'Template type is required').isIn(['callout', 'maintenance', 'vehicle_inspection', 'general']),
  body('items', 'Items array is required').isArray({ min: 1 }),
  body('completedBy', 'Completed by name is required').not().isEmpty(),
  body('completedDate', 'Completed date is required').not().isEmpty(),
  body('completedTime', 'Completed time is required').not().isEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verify the template exists
    const template = await ChecklistTemplate.findById(req.body.template);
    if (!template) {
      return res.status(404).json({ msg: 'Checklist template not found' });
    }

    const completedChecklistData = {
      ...req.body,
      completedByUser: req.user.id,
      completedDateTime: new Date()
    };

    const completedChecklist = new CompletedChecklist(completedChecklistData);
    await completedChecklist.save();

    // Populate the response
    await completedChecklist.populate('template', 'name description');
    await completedChecklist.populate('completedByUser', 'firstName lastName');

    res.status(201).json(completedChecklist);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/completed-checklists/:id
// @desc    Delete completed checklist
// @access  Private - Admin only
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied. Admin only.' });
    }

    const completedChecklist = await CompletedChecklist.findById(req.params.id);
    if (!completedChecklist) {
      return res.status(404).json({ msg: 'Completed checklist not found' });
    }

    await CompletedChecklist.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Completed checklist deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
