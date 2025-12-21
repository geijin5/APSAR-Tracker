const express = require('express');
const router = express.Router();
const Message = require('../models/Chat');
const ChatGroup = require('../models/ChatGroup');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Predefined group types
const PREDEFINED_GROUPS = ['main', 'parade', 'training', 'callout'];

// Initialize predefined groups on first use
const initializeGroups = async () => {
  for (const groupType of PREDEFINED_GROUPS) {
    const groupName = groupType.charAt(0).toUpperCase() + groupType.slice(1);
    const existing = await ChatGroup.findOne({ type: groupType });
    if (!existing) {
      // Get all active users for main group, empty for others
      const allUsers = groupType === 'main' 
        ? await User.find({ isActive: true }).select('_id')
        : [];
      
      await ChatGroup.create({
        name: groupName,
        type: groupType,
        description: `${groupName} group chat`,
        createdBy: null, // System created
        members: allUsers.map(u => u._id),
        autoClearEnabled: true
      });
    }
  }
};

// @route   GET /api/chat/groups
// @desc    Get all chat groups
// @access  Private
router.get('/groups', auth, async (req, res) => {
  try {
    await initializeGroups();
    
    const groups = await ChatGroup.find()
      .populate('createdBy', 'firstName lastName')
      .populate('members', 'firstName lastName username')
      .sort({ type: 1, name: 1 });

    res.json(groups);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/chat/groups
// @desc    Create a new group chat
// @access  Private
router.post('/groups', auth, async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    // Check if name already exists
    const existing = await ChatGroup.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: 'Group name already exists' });
    }

    const group = new ChatGroup({
      name: name.trim(),
      type: 'custom',
      description: description || '',
      createdBy: req.user.id,
      members: memberIds || [],
      autoClearEnabled: true
    });

    await group.save();

    const populated = await ChatGroup.findById(group._id)
      .populate('createdBy', 'firstName lastName')
      .populate('members', 'firstName lastName username');

    res.status(201).json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/chat/conversations
// @desc    Get all conversations (1-on-1 and groups)
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    // Initialize groups if they don't exist
    try {
      await initializeGroups();
    } catch (initError) {
      console.error('Error initializing groups:', initError);
      // Continue anyway - groups might already exist
    }

    // Get 1-on-1 conversations
    const sentMessages = await Message.find({ 
      sender: req.user.id,
      groupType: null,
      recipient: { $ne: null }
    })
      .select('recipient')
      .distinct('recipient');

    const receivedMessages = await Message.find({ 
      recipient: req.user.id,
      groupType: null
    })
      .select('sender')
      .distinct('sender');

    const allUserIds = [...new Set([...sentMessages, ...receivedMessages])];

    const oneOnOneConversations = await Promise.all(
      allUserIds.map(async (userId) => {
        const latestMessage = await Message.findOne({
          $or: [
            { sender: req.user.id, recipient: userId, groupType: null },
            { sender: userId, recipient: req.user.id, groupType: null }
          ]
        })
          .sort({ createdAt: -1 })
          .populate('sender', 'firstName lastName')
          .populate('recipient', 'firstName lastName');

        const unreadCount = await Message.countDocuments({
          sender: userId,
          recipient: req.user.id,
          read: false,
          groupType: null
        });

        const otherUser = await User.findById(userId).select('firstName lastName username');

        return {
          type: 'user',
          user: otherUser,
          latestMessage,
          unreadCount
        };
      })
    );

    // Get group conversations - always return groups even if empty
    let groups = await ChatGroup.find().lean();
    
    // If no groups exist, ensure at least the predefined ones are created
    if (!groups || groups.length === 0) {
      console.log('No groups found, initializing...');
      try {
        await initializeGroups();
        groups = await ChatGroup.find().lean();
      } catch (initError) {
        console.error('Error initializing groups on second attempt:', initError);
      }
    }
    
    const groupConversations = await Promise.all(
      groups.map(async (group) => {
        const latestMessage = await Message.findOne({
          $or: [
            { groupType: group.type, groupName: null },
            { groupName: group.name }
          ]
        })
          .sort({ createdAt: -1 })
          .populate('sender', 'firstName lastName username');

        // Count unread messages (messages not read by current user)
        const unreadCount = await Message.countDocuments({
          $or: [
            { groupType: group.type, groupName: null },
            { groupName: group.name }
          ],
          sender: { $ne: req.user.id },
          readBy: { $ne: req.user.id }
        });

        return {
          type: 'group',
          group: {
            _id: group._id,
            name: group.name,
            type: group.type,
            description: group.description
          },
          latestMessage,
          unreadCount
        };
      })
    );

    const allConversations = [...oneOnOneConversations, ...groupConversations];

    // Sort by latest message time, but prioritize groups without messages
    // Groups should always be visible even if they have no messages
    allConversations.sort((a, b) => {
      // If both are groups, sort by type priority (main, parade, training, callout, then custom)
      if (a.type === 'group' && b.type === 'group') {
        const typeOrder = { main: 1, parade: 2, training: 3, callout: 4, custom: 5 };
        const aOrder = typeOrder[a.group?.type] || 99;
        const bOrder = typeOrder[b.group?.type] || 99;
        if (aOrder !== bOrder) return aOrder - bOrder;
      }
      
      // If one is a group and one is user, groups come first
      if (a.type === 'group' && b.type === 'user') return -1;
      if (a.type === 'user' && b.type === 'group') return 1;
      
      // Within same type, sort by latest message time
      if (!a.latestMessage && !b.latestMessage) return 0;
      if (!a.latestMessage) return 1;
      if (!b.latestMessage) return -1;
      return b.latestMessage.createdAt - a.latestMessage.createdAt;
    });

    res.json(allConversations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/chat/messages/group/:groupType
// @route   GET /api/chat/messages/group/custom/:groupName
// @route   GET /api/chat/messages/:userId
// @desc    Get messages for a group or 1-on-1 conversation
// @access  Private
router.get('/messages/group/:groupType', auth, async (req, res) => {
  try {
    const { groupType } = req.params;
    const { limit = 50, before } = req.query;

    const query = { groupType };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('sender', 'firstName lastName username')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Mark messages as read by current user
    const messageIds = messages.map(m => m._id);
    await Message.updateMany(
      { _id: { $in: messageIds }, 'readBy.user': { $ne: req.user.id } },
      { $push: { readBy: { user: req.user.id, readAt: new Date() } } }
    );

    res.json(messages.reverse());
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.get('/messages/group/custom/:groupName', auth, async (req, res) => {
  try {
    const { groupName } = req.params;
    const { limit = 50, before } = req.query;

    const query = { groupName };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('sender', 'firstName lastName username')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Mark messages as read by current user
    const messageIds = messages.map(m => m._id);
    await Message.updateMany(
      { _id: { $in: messageIds }, 'readBy.user': { $ne: req.user.id } },
      { $push: { readBy: { user: req.user.id, readAt: new Date() } } }
    );

    res.json(messages.reverse());
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.get('/messages/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, before } = req.query;

    const query = {
      $or: [
        { sender: req.user.id, recipient: userId, groupType: null },
        { sender: userId, recipient: req.user.id, groupType: null }
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
      { sender: userId, recipient: req.user.id, read: false, groupType: null },
      { read: true, readAt: new Date() }
    );

    res.json(messages.reverse());
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/chat/messages
// @desc    Send a message (to user or group)
// @access  Private
router.post('/messages', auth, upload.array('attachments', 5), async (req, res) => {
  try {
    const { recipient, groupType, groupName, content } = req.body;

    if (!content || (!recipient && !groupType && !groupName)) {
      return res.status(400).json({ message: 'Content and recipient/group are required' });
    }

    const messageData = {
      sender: req.user.id,
      content
    };

    if (groupType) {
      messageData.groupType = groupType;
    } else if (groupName) {
      messageData.groupType = 'custom';
      messageData.groupName = groupName;
    } else {
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

// @route   DELETE /api/chat/clear/:groupType
// @route   DELETE /api/chat/clear/custom/:groupName
// @desc    Clear all messages from a group (admin/operator for callout, anyone for others)
// @access  Private
router.delete('/clear/:groupType', auth, async (req, res) => {
  try {
    const { groupType } = req.params;

    // For callout, only admin and operator can clear
    if (groupType === 'callout' && !['admin', 'operator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admins and operators can clear callout chat' });
    }

    const result = await Message.deleteMany({ groupType });
    
    // Update last cleared time
    await ChatGroup.findOneAndUpdate(
      { type: groupType },
      { lastCleared: new Date() },
      { upsert: true }
    );

    res.json({ message: `Cleared ${result.deletedCount} messages`, deletedCount: result.deletedCount });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.delete('/clear/custom/:groupName', auth, async (req, res) => {
  try {
    const { groupName } = req.params;

    const result = await Message.deleteMany({ groupName });
    
    // Update last cleared time
    await ChatGroup.findOneAndUpdate(
      { name: groupName },
      { lastCleared: new Date() },
      { upsert: true }
    );

    res.json({ message: `Cleared ${result.deletedCount} messages`, deletedCount: result.deletedCount });
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
    // Count 1-on-1 unread
    const oneOnOneUnread = await Message.countDocuments({
      recipient: req.user.id,
      read: false,
      groupType: null
    });

    // Count group unread (messages not read by current user)
    const groupUnread = await Message.countDocuments({
      groupType: { $ne: null },
      sender: { $ne: req.user.id },
      readBy: { $ne: req.user.id }
    });

    res.json({ unreadCount: oneOnOneUnread + groupUnread });
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

// Auto-clear function (should be called monthly via cron or scheduled task)
router.post('/auto-clear-monthly', async (req, res) => {
  try {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Clear all group chats that have auto-clear enabled
    const groups = await ChatGroup.find({ autoClearEnabled: true });
    let totalCleared = 0;

    for (const group of groups) {
      let query;
      if (group.type === 'custom') {
        query = { groupName: group.name };
      } else {
        query = { groupType: group.type };
      }

      const result = await Message.deleteMany({
        ...query,
        createdAt: { $lt: firstOfMonth }
      });

      totalCleared += result.deletedCount;
      group.lastCleared = new Date();
      await group.save();
    }

    res.json({ message: `Auto-cleared ${totalCleared} messages`, clearedCount: totalCleared });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
