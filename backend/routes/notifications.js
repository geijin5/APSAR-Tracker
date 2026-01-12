const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// @route   GET /api/notifications
// @desc    Get user's notifications
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { read, type, limit = 50, skip = 0 } = req.query;
    const query = { user: req.user.id };

    if (read !== undefined) {
      query.read = read === 'true';
    }

    if (type) {
      query.type = type;
    }

    // Don't return expired notifications
    query.$or = [
      { expiryDate: { $exists: false } },
      { expiryDate: null },
      { expiryDate: { $gt: new Date() } }
    ];

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      read: false,
      $or: [
        { expiryDate: { $exists: false } },
        { expiryDate: null },
        { expiryDate: { $gt: new Date() } }
      ]
    });

    res.json({
      notifications,
      unreadCount,
      total: notifications.length
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user.id,
      read: false,
      $or: [
        { expiryDate: { $exists: false } },
        { expiryDate: null },
        { expiryDate: { $gt: new Date() } }
      ]
    });

    res.json({ count });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/notifications/:id
// @desc    Get single notification
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }

    // Users can only view their own notifications
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    res.json(notification);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }

    // Users can only mark their own notifications as read
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    res.json(notification);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all user notifications as read
// @access  Private
router.put('/read-all', auth, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user.id, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({ 
      message: 'All notifications marked as read',
      updated: result.modifiedCount
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/notifications
// @desc    Create notification (internal use - for system notifications)
// @access  Private - Admin/Officer (for manual notifications)
router.post('/', auth, [
  body('userId').optional().isMongoId(),
  body('type').isIn([
    'maintenance_due',
    'maintenance_overdue',
    'equipment_inspection',
    'training_expiration',
    'certification_expiration',
    'callout_new',
    'checklist_assigned',
    'chat_message',
    'report_approved',
    'report_rejected',
    'training_approved',
    'training_rejected',
    'general'
  ]),
  body('title').notEmpty().trim(),
  body('message').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, type, title, message, relatedEntity, actionUrl, priority, expiryDate, metadata } = req.body;

    // If userId is provided, only admin/officer can create notifications for others
    // Otherwise, create for current user
    const targetUserId = userId && (req.user.role === 'admin' || req.user.role === 'officer')
      ? userId
      : req.user.id;

    const notificationData = {
      user: targetUserId,
      type,
      title,
      message,
      priority: priority || 'medium'
    };

    if (relatedEntity) {
      notificationData.relatedEntity = relatedEntity;
    }

    if (actionUrl) {
      notificationData.actionUrl = actionUrl;
    }

    if (expiryDate) {
      notificationData.expiryDate = new Date(expiryDate);
    }

    if (metadata) {
      notificationData.metadata = metadata;
    }

    const notification = new Notification(notificationData);
    await notification.save();

    res.status(201).json(notification);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }

    // Users can only delete their own notifications
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    await notification.deleteOne();
    res.json({ msg: 'Notification deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/notifications/read/all
// @desc    Delete all read notifications for user
// @access  Private
router.delete('/read/all', auth, async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      user: req.user.id,
      read: true
    });

    res.json({ 
      message: 'All read notifications deleted',
      deleted: result.deletedCount
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/notifications/register-token
// @desc    Register FCM token for push notifications
// @access  Private
router.post('/register-token', auth, [
  body('token').notEmpty().trim().withMessage('FCM token is required'),
  body('deviceInfo').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, deviceInfo } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if token already exists
    const existingTokenIndex = user.fcmTokens.findIndex(
      t => t.token === token
    );

    if (existingTokenIndex >= 0) {
      // Update existing token with new device info
      user.fcmTokens[existingTokenIndex].deviceInfo = deviceInfo || {};
      user.fcmTokens[existingTokenIndex].registeredAt = new Date();
    } else {
      // Add new token
      user.fcmTokens.push({
        token,
        deviceInfo: deviceInfo || {
          userAgent: req.headers['user-agent'],
          platform: 'web'
        },
        registeredAt: new Date()
      });
    }

    await user.save();

    res.json({
      message: 'FCM token registered successfully',
      tokenCount: user.fcmTokens.length
    });
  } catch (err) {
    console.error('Error registering FCM token:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/notifications/unregister-token
// @desc    Unregister FCM token
// @access  Private
router.delete('/unregister-token', auth, [
  body('token').notEmpty().trim().withMessage('FCM token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Remove token
    user.fcmTokens = user.fcmTokens.filter(t => t.token !== token);
    await user.save();

    res.json({
      message: 'FCM token unregistered successfully',
      tokenCount: user.fcmTokens.length
    });
  } catch (err) {
    console.error('Error unregistering FCM token:', err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;




