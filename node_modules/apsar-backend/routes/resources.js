const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');
const auth = require('../middleware/auth').auth;
const authorize = require('../middleware/auth').authorize;
const upload = require('../middleware/upload');
const { body, validationResult } = require('express-validator');

// @route   GET /api/resources
// @desc    Get all resources (filtered by type, category, tags)
// @access  Private - all authenticated users
router.get('/', auth, async (req, res) => {
  try {
    const { type, category, tag, search } = req.query;
    const query = { isActive: true };

    if (type) {
      query.type = type;
    }

    if (category) {
      query.category = category;
    }

    if (tag) {
      query.tags = tag;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const resources = await Resource.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(resources);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/resources/:id
// @desc    Get a single resource
// @access  Private - all authenticated users
router.get('/:id', auth, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('views.user', 'firstName lastName');

    if (!resource) {
      return res.status(404).json({ msg: 'Resource not found' });
    }

    // Track view
    const userId = req.user.id || req.user._id;
    const hasViewed = resource.views.some(
      view => view.user && (view.user._id.toString() === userId.toString() || view.user.toString() === userId.toString())
    );

    if (!hasViewed) {
      resource.views.push({ user: userId });
      await resource.save();
    }

    res.json(resource);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/resources
// @desc    Create a new resource
// @access  Private - Admin only
router.post('/', [
  auth,
  authorize('admin'),
  upload.single('file'),
  body('title').notEmpty().trim().withMessage('Title is required'),
  body('type').isIn(['video', 'form', 'list', 'map']).withMessage('Type must be video, form, list, or map')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, type, videoUrl, mapUrl, coordinates, listItems, category, tags } = req.body;

    const resourceData = {
      title,
      description,
      type,
      createdBy: req.user.id || req.user._id
    };

    // Handle file upload
    if (req.file) {
      resourceData.file = {
        name: req.file.originalname,
        url: req.file.path,
        size: req.file.size,
        mimeType: req.file.mimetype
      };
    }

    // Handle video URL
    if (type === 'video' && videoUrl) {
      resourceData.videoUrl = videoUrl;
    }

    // Handle map URL
    if (type === 'map' && mapUrl) {
      resourceData.mapUrl = mapUrl;
    }

    // Handle map coordinates
    if (type === 'map' && coordinates) {
      try {
        const coords = typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates;
        if (coords.lat && coords.lng) {
          resourceData.coordinates = {
            lat: parseFloat(coords.lat),
            lng: parseFloat(coords.lng)
          };
        }
      } catch (e) {
        // If coordinates parsing fails, ignore it
      }
    }

    // Handle list items
    if (type === 'list' && listItems) {
      try {
        const items = typeof listItems === 'string' ? JSON.parse(listItems) : listItems;
        resourceData.listItems = items.map((item, index) => ({
          text: item.text || item,
          order: item.order !== undefined ? item.order : index
        }));
      } catch (e) {
        return res.status(400).json({ msg: 'Invalid list items format' });
      }
    }

    if (category) {
      resourceData.category = category;
    }

    if (tags) {
      try {
        resourceData.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        resourceData.tags = tags.split(',').map(t => t.trim());
      }
    }

    const resource = new Resource(resourceData);
    await resource.save();

    const populatedResource = await Resource.findById(resource._id)
      .populate('createdBy', 'firstName lastName');

    res.status(201).json(populatedResource);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/resources/:id
// @desc    Update a resource
// @access  Private - Admin only
router.put('/:id', [
  auth,
  authorize('admin'),
  upload.single('file'),
  body('title').optional().notEmpty().trim().withMessage('Title cannot be empty'),
  body('type').optional().isIn(['video', 'form', 'list', 'map']).withMessage('Type must be video, form, list, or map')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ msg: 'Resource not found' });
    }

    const { title, description, type, videoUrl, mapUrl, coordinates, listItems, category, tags, isActive } = req.body;

    if (title !== undefined) resource.title = title;
    if (description !== undefined) resource.description = description;
    if (type !== undefined) resource.type = type;
    if (isActive !== undefined) resource.isActive = isActive;

    // Handle file upload
    if (req.file) {
      resource.file = {
        name: req.file.originalname,
        url: req.file.path,
        size: req.file.size,
        mimeType: req.file.mimetype
      };
    }

    // Handle video URL
    if (type === 'video' && videoUrl !== undefined) {
      resource.videoUrl = videoUrl;
    }

    // Handle map URL
    if (type === 'map' && mapUrl !== undefined) {
      resource.mapUrl = mapUrl;
    }

    // Handle map coordinates
    if (type === 'map' && coordinates !== undefined) {
      try {
        const coords = typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates;
        if (coords && coords.lat && coords.lng) {
          resource.coordinates = {
            lat: parseFloat(coords.lat),
            lng: parseFloat(coords.lng)
          };
        } else if (coords === null || coords === '') {
          resource.coordinates = undefined;
        }
      } catch (e) {
        // If coordinates parsing fails, ignore it
      }
    }

    // Handle list items
    if (type === 'list' && listItems !== undefined) {
      try {
        const items = typeof listItems === 'string' ? JSON.parse(listItems) : listItems;
        resource.listItems = items.map((item, index) => ({
          text: item.text || item,
          order: item.order !== undefined ? item.order : index
        }));
      } catch (e) {
        return res.status(400).json({ msg: 'Invalid list items format' });
      }
    }

    if (category !== undefined) resource.category = category;

    if (tags !== undefined) {
      try {
        resource.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        resource.tags = tags.split(',').map(t => t.trim());
      }
    }

    await resource.save();

    const updatedResource = await Resource.findById(resource._id)
      .populate('createdBy', 'firstName lastName');

    res.json(updatedResource);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/resources/:id
// @desc    Delete a resource
// @access  Private - Admin only
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ msg: 'Resource not found' });
    }

    await Resource.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Resource deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/resources/stats/categories
// @desc    Get resource categories
// @access  Private - all authenticated users
router.get('/stats/categories', auth, async (req, res) => {
  try {
    const categories = await Resource.distinct('category', { isActive: true });
    res.json(categories.filter(c => c));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;

