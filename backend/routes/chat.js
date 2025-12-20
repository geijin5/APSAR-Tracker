const express = require('express');
const router = express.Router();
const Message = require('../models/Chat');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   GET /api/chat/conversations
// @desc    Get all conversations for current user
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    // Get all unique users the current user has messaged or received messages from
    const sentMessages = await Message.find({ sender: req.user.id })
      .select('recipient')
      .distinct('recipient');

    const receivedMessages = await Message.find({ recipient: req.user.id })
      .select('sender')
      .distinct('sender');

    const allUserIds = [...new Set([...sentMessages, ...receivedMessages])];

    // Get latest message for each conversation
    const conversations = await Promise.all(
      allUserIds.map(async (userId) => {
        const latestMessage = await Message.findOne({
          $or: [
            { sender: req.user.id, recipient: userId },
            { sender: userId, recipient: req.user.id }
          ]
        })
          .sort({ createdAt: -1 })
          .populate('sender', 'firstName lastName')
          .populate('recipient', 'firstName lastName');

        const unreadCount = await Message.countDocuments({
          sender: userId,
          recipient: req.user.id,
          read: false
        });

        const otherUser = await User.findById(userId).select('firstName lastName username');

        return {
          user: otherUser,
          latestMessage,
          unreadCount
        };
      })
    );

    // Sort by latest message time
    conversations.sort((a, b) => {
      if (!a.latestMessage) return 1;
      if (!b.latestMessage) return -1;
      return b.latestMessage.createdAt - a.latestMessage.createdAt;
    });

    res.json(conversations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/chat/messages/:userId
// @desc    Get messages between current user and another user
// @access  Private
router.get('/messages/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, before } = req.query;

    const query = {
      $or: [
        { sender: req.user.id, recipient: userId },
        { sender: userId, recipient: req.user.id }
      ]
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('sender', 'firstName lastName username')
      .populate('recipient', 'firstName lastName username')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Mark messages as read
    await Message.updateMany(
      { sender: userId, recipient: req.user.id, read: false },
      { read: true, readAt: new Date() }
    );

    res.json(messages.reverse());
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/chat/messages
// @desc    Send a message
// @access  Private
router.post('/messages', auth, upload.array('attachments', 5), async (req, res) => {
  try {
    const { recipient, content, isBroadcast } = req.body;

    if (!content || (!recipient && !isBroadcast)) {
      return res.status(400).json({ message: 'Content and recipient are required' });
    }

    const messageData = {
      sender: req.user.id,
      content,
      isBroadcast: isBroadcast === 'true' || isBroadcast === true
    };

    if (!messageData.isBroadcast) {
      messageData.recipient = recipient;
    }

    // Handle attachments
    if (req.files && req.files.length > 0) {
      messageData.attachments = req.files.map(file => ({
        name: file.originalname,
        url: `/uploads/${file.filename}`,
        type: file.mimetype
      }));
    }

    const message = new Message(messageData);
    await message.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'firstName lastName username')
      .populate('recipient', 'firstName lastName username');

    res.status(201).json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/chat/messages/:id/read
// @desc    Mark message as read
// @access  Private
router.put('/messages/:id/read', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only recipient can mark as read
    if (message.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    message.read = true;
    message.readAt = new Date();
    await message.save();

    res.json(message);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/chat/unread
// @desc    Get unread message count
// @access  Private
router.get('/unread', auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user.id,
      read: false
    });

    res.json({ unreadCount: count });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/chat/users
// @desc    Get all users for chat (excluding current user)
// @access  Private
router.get('/users', auth, async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user.id },
      isActive: true
    })
      .select('firstName lastName username role')
      .sort({ firstName: 1, lastName: 1 });

    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;

