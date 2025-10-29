const express = require('express');
const router = express.Router();
const WorkOrderTemplate = require('../models/WorkOrderTemplate');
const { auth, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// @route   GET /api/work-order-templates
// @desc    Get all work order templates
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { category } = req.query;
    const query = { isActive: true };

    if (category) query.category = category;

    const templates = await WorkOrderTemplate.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ name: 1 });

    res.json(templates);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/work-order-templates/:id
// @desc    Get single work order template
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const template = await WorkOrderTemplate.findById(req.params.id)
      .populate('createdBy', 'firstName lastName');

    if (!template) {
      return res.status(404).json({ msg: 'Work order template not found' });
    }

    res.json(template);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/work-order-templates
// @desc    Create new work order template
// @access  Private - requires operator role or higher
router.post('/', auth, authorize('admin', 'operator', 'technician'), [
  body('name', 'Name is required').not().isEmpty(),
  body('category', 'Category is required').not().isEmpty(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical'])
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

    const template = new WorkOrderTemplate(templateData);
    await template.save();

    res.status(201).json(template);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/work-order-templates/:id
// @desc    Update work order template
// @access  Private - requires operator role or higher
router.put('/:id', auth, authorize('admin', 'operator', 'technician'), async (req, res) => {
  try {
    const template = await WorkOrderTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ msg: 'Work order template not found' });
    }

    Object.assign(template, req.body);
    await template.save();

    res.json(template);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/work-order-templates/:id
// @desc    Delete work order template (soft delete)
// @access  Private - admin only
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    await WorkOrderTemplate.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ msg: 'Work order template deactivated' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/work-order-templates/:id/use
// @desc    Mark template as used (increment usage counter)
// @access  Private
router.post('/:id/use', auth, async (req, res) => {
  try {
    const template = await WorkOrderTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ msg: 'Work order template not found' });
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
