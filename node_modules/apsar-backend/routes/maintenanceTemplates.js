const express = require('express');
const router = express.Router();
const MaintenanceTemplate = require('../models/MaintenanceTemplate');
const { auth, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// @route   GET /api/maintenance-templates
// @desc    Get all maintenance templates
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { type, category } = req.query;
    const query = { isActive: true };

    if (type) query.type = type;
    if (category) query.category = category;

    const templates = await MaintenanceTemplate.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('checklistTemplate', 'name')
      .sort({ name: 1 });

    res.json(templates);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/maintenance-templates/:id
// @desc    Get single maintenance template
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const template = await MaintenanceTemplate.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('checklistTemplate');

    if (!template) {
      return res.status(404).json({ msg: 'Maintenance template not found' });
    }

    res.json(template);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/maintenance-templates
// @desc    Create new maintenance template
// @access  Private - requires operator role or higher
router.post('/', auth, authorize('admin', 'operator', 'technician'), [
  body('name', 'Name is required').not().isEmpty(),
  body('type', 'Type is required').isIn(['preventive', 'corrective', 'inspection', 'calibration', 'certification']),
  body('category', 'Category is required').not().isEmpty(),
  body('frequency.type', 'Frequency type is required').isIn(['hours', 'days', 'weeks', 'months', 'years', 'miles', 'cycles']),
  body('frequency.interval', 'Frequency interval is required').isInt({ min: 1 })
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

    const template = new MaintenanceTemplate(templateData);
    await template.save();

    res.status(201).json(template);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/maintenance-templates/:id
// @desc    Update maintenance template
// @access  Private - requires operator role or higher
router.put('/:id', auth, authorize('admin', 'operator', 'technician'), async (req, res) => {
  try {
    const template = await MaintenanceTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ msg: 'Maintenance template not found' });
    }

    Object.assign(template, req.body);
    await template.save();

    res.json(template);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/maintenance-templates/:id
// @desc    Delete maintenance template (soft delete)
// @access  Private - admin only
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    await MaintenanceTemplate.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ msg: 'Maintenance template deactivated' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/maintenance-templates/:id/use
// @desc    Mark template as used (increment usage counter)
// @access  Private
router.post('/:id/use', auth, async (req, res) => {
  try {
    const template = await MaintenanceTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ msg: 'Maintenance template not found' });
    }

    template.usage.count += 1;
    template.usage.lastUsed = new Date();
    await template.save();

    res.json({ msg: 'Template usage recorded' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
