const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { auth, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// @route   GET /api/categories
// @desc    Get all categories by type
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { type } = req.query;
    const query = type ? { type } : {};

    const categories = await Category.find(query).sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/categories
// @desc    Create a new category
// @access  Private - requires operator role or higher
router.post('/', auth, authorize('admin', 'officer'), [
  body('name').notEmpty().trim(),
  body('type').isIn(['asset', 'workorder', 'maintenance'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, type, color, description } = req.body;

    // Check if category already exists
    const existingCategory = await Category.findOne({ name, type });
    if (existingCategory) {
      return res.status(400).json({ msg: 'Category already exists' });
    }

    const category = new Category({
      name,
      type,
      color: color || '#3B82F6',
      description,
      createdBy: req.user.id
    });

    await category.save();
    res.status(201).json(category);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/categories/:id
// @desc    Delete a category
// @access  Private - admin only
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Category deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;





