const express = require('express');
const router = express.Router();
const Message = require('../models/Chat');
const ChatGroup = require('../models/ChatGroup');
const crypto = require('crypto');

// ADLC Integration Configuration
// Set these in environment variables:
// ADLC_WEBHOOK_SECRET - Secret key for webhook authentication
// ADLC_TARGET_GROUP - Which group to send messages to (default: 'callout')

const ADLC_WEBHOOK_SECRET = process.env.ADLC_WEBHOOK_SECRET || 'your-secret-key-change-this';
const ADLC_TARGET_GROUP = process.env.ADLC_TARGET_GROUP || 'callout';

// Verify webhook signature (if ADLC provides one)
const verifyWebhookSignature = (req, secret) => {
  // If ADLC provides a signature header, verify it here
  // This is a placeholder - adjust based on ADLC's actual authentication method
  const signature = req.headers['x-adlc-signature'] || req.headers['x-signature'];
  
  if (!signature) {
    // If no signature is provided, you might want to require API key instead
    return false;
  }

  // Create HMAC hash
  const hmac = crypto.createHmac('sha256', secret);
  const payload = JSON.stringify(req.body);
  hmac.update(payload);
  const calculatedSignature = hmac.digest('hex');

  // Compare signatures (use timing-safe comparison in production)
  return signature === calculatedSignature;
};

// @route   POST /api/adlc/webhook
// @desc    Receive messages from ADLC Emergency app
// @access  Public (but authenticated via webhook secret)
router.post('/webhook', async (req, res) => {
  try {
    // Verify webhook authentication
    // Option 1: Signature verification
    if (process.env.ADLC_USE_SIGNATURE === 'true') {
      if (!verifyWebhookSignature(req, ADLC_WEBHOOK_SECRET)) {
        return res.status(401).json({ message: 'Invalid webhook signature' });
      }
    }
    // Option 2: API key in header
    else {
      const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
      if (apiKey !== ADLC_WEBHOOK_SECRET) {
        return res.status(401).json({ message: 'Invalid API key' });
      }
    }

    // Parse ADLC message format
    // Adjust these fields based on actual ADLC payload structure
    const {
      message,
      content,
      text, // Alternative field names
      sender,
      senderName,
      senderId,
      source, // 'dispatch', 'fire', 'ems', 'police'
      department,
      timestamp,
      attachments,
      metadata
    } = req.body;

    // Extract message content
    const messageContent = message || content || text;
    if (!messageContent) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Determine source type
    let externalSource = 'adlc';
    if (source) {
      externalSource = source.toLowerCase();
    } else if (department) {
      const dept = department.toLowerCase();
      if (['dispatch', 'fire', 'ems', 'police'].includes(dept)) {
        externalSource = dept;
      }
    }

    // Get sender information
    const externalSenderName = senderName || sender || department || 'ADLC Emergency';
    const externalSenderId = senderId || sender || 'adlc-system';

    // Ensure target group exists
    await ChatGroup.findOneAndUpdate(
      { type: ADLC_TARGET_GROUP },
      { type: ADLC_TARGET_GROUP, name: ADLC_TARGET_GROUP.charAt(0).toUpperCase() + ADLC_TARGET_GROUP.slice(1) },
      { upsert: true, setDefaultsOnInsert: true }
    );

    // Create message in target group
    const messageData = {
      sender: null, // No internal user sender for external messages
      groupType: ADLC_TARGET_GROUP,
      content: `[${externalSenderName}] ${messageContent}`,
      isExternal: true,
      externalSource: externalSource,
      externalSenderName: externalSenderName,
      externalSenderId: externalSenderId,
      externalMetadata: {
        originalTimestamp: timestamp || new Date(),
        department: department,
        ...metadata
      }
    };

    // Handle attachments if provided
    if (attachments && Array.isArray(attachments)) {
      messageData.attachments = attachments.map(att => ({
        name: att.name || att.filename || 'attachment',
        url: att.url || att.link,
        type: att.type || att.mimeType || 'application/octet-stream'
      }));
    }

    const newMessage = new Message(messageData);
    await newMessage.save();

    // Populate and return
    const populated = await Message.findById(newMessage._id)
      .populate('sender', 'firstName lastName username');

    console.log(`ADLC message received from ${externalSenderName} and posted to ${ADLC_TARGET_GROUP} group`);

    res.status(201).json({
      success: true,
      message: 'Message received and posted',
      messageId: populated._id,
      group: ADLC_TARGET_GROUP
    });
  } catch (err) {
    console.error('ADLC webhook error:', err.message);
    res.status(500).json({ message: 'Server error processing webhook', error: err.message });
  }
});

// @route   GET /api/adlc/status
// @desc    Check ADLC integration status
// @access  Private (for admin testing)
router.get('/status', async (req, res) => {
  try {
    // Get recent external messages
    const recentMessages = await Message.find({
      isExternal: true
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('externalSource externalSenderName content createdAt groupType');

    // Get target group info
    const targetGroup = await ChatGroup.findOne({ type: ADLC_TARGET_GROUP });

    res.json({
      enabled: true,
      targetGroup: ADLC_TARGET_GROUP,
      targetGroupExists: !!targetGroup,
      webhookSecretConfigured: !!ADLC_WEBHOOK_SECRET && ADLC_WEBHOOK_SECRET !== 'your-secret-key-change-this',
      recentMessages: recentMessages,
      webhookUrl: `${req.protocol}://${req.get('host')}/api/adlc/webhook`
    });
  } catch (err) {
    console.error('ADLC status error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   POST /api/adlc/test
// @desc    Test endpoint to simulate ADLC message (for testing)
// @access  Private (should be protected in production)
router.post('/test', async (req, res) => {
  try {
    const { message, source, senderName } = req.body;

    // Ensure target group exists
    await ChatGroup.findOneAndUpdate(
      { type: ADLC_TARGET_GROUP },
      { type: ADLC_TARGET_GROUP, name: ADLC_TARGET_GROUP.charAt(0).toUpperCase() + ADLC_TARGET_GROUP.slice(1) },
      { upsert: true, setDefaultsOnInsert: true }
    );

    const messageData = {
      groupType: ADLC_TARGET_GROUP,
      content: message || 'Test message from ADLC integration',
      isExternal: true,
      externalSource: source || 'adlc',
      externalSenderName: senderName || 'Test Sender',
      externalSenderId: 'test-sender',
      externalMetadata: {
        test: true,
        originalTimestamp: new Date()
      }
    };

    const newMessage = new Message(messageData);
    await newMessage.save();

    res.status(201).json({
      success: true,
      message: 'Test message created',
      messageId: newMessage._id
    });
  } catch (err) {
    console.error('ADLC test error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;

