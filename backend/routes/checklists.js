const express = require('express');
const router = express.Router();
const ChecklistTemplate = require('../models/ChecklistTemplate');
const { auth, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// @route   GET /api/checklists/templates
// @desc    Get all checklist templates
// @access  Private
router.get('/templates', auth, async (req, res) => {
  try {
    const { type, category } = req.query;
    const query = { isActive: true };

    if (type) query.type = type;
    if (category) query.category = category;

    const templates = await ChecklistTemplate.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ name: 1 });

    res.json(templates);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/checklists/templates/:id
// @desc    Get single checklist template
// @access  Private
router.get('/templates/:id', auth, async (req, res) => {
  try {
    const template = await ChecklistTemplate.findById(req.params.id)
      .populate('createdBy', 'firstName lastName');

    if (!template) {
      return res.status(404).json({ msg: 'Checklist template not found' });
    }

    res.json(template);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/checklists/templates
// @desc    Create new checklist template
// @access  Private - requires operator role or higher
router.post('/templates', auth, authorize('admin', 'operator'), [
  body('name', 'Name is required').not().isEmpty(),
  body('type', 'Type is required').isIn(['callout', 'maintenance', 'vehicle_inspection', 'general']),
  body('items', 'Items array is required').isArray({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const templateData = {
      ...req.body,
      createdBy: req.user.id
    };

    const template = new ChecklistTemplate(templateData);
    await template.save();

    res.status(201).json(template);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/checklists/templates/:id
// @desc    Update checklist template
// @access  Private - requires operator role or higher
router.put('/templates/:id', auth, authorize('admin', 'operator'), async (req, res) => {
  try {
    const template = await ChecklistTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ msg: 'Checklist template not found' });
    }

    Object.assign(template, req.body);
    await template.save();

    res.json(template);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/checklists/templates/:id
// @desc    Delete checklist template (soft delete)
// @access  Private - admin only
router.delete('/templates/:id', auth, authorize('admin'), async (req, res) => {
  try {
    await ChecklistTemplate.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ msg: 'Checklist template deactivated' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/checklists/types
// @desc    Get available checklist types for different categories
// @access  Private
router.get('/types', auth, async (req, res) => {
  try {
    const types = [
      {
        type: 'callout',
        name: 'Callout Equipment Check',
        description: 'Pre-deployment equipment verification for emergency response',
        categories: ['communications', 'medical', 'climbing', 'navigation', 'specialized', 'general']
      },
      {
        type: 'maintenance',
        name: 'Regular Maintenance',
        description: 'Scheduled maintenance procedures for equipment and vehicles',
        categories: ['vehicle_ground', 'vehicle_air', 'vehicle_marine', 'communications', 'medical', 'climbing', 'navigation', 'specialized']
      },
      {
        type: 'vehicle_inspection',
        name: 'Vehicle Inspection',
        description: 'Pre-use vehicle safety and operational checks',
        categories: ['vehicle_ground', 'vehicle_air', 'vehicle_marine']
      },
      {
        type: 'general',
        name: 'General Checklist',
        description: 'Custom checklist for various purposes',
        categories: ['general']
      }
    ];

    res.json(types);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
