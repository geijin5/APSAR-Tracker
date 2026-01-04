/**
 * Auto-clear chat messages script
 * This script should be run monthly (e.g., via cron job on the 1st of each month)
 * 
 * Example cron job (runs at midnight on the 1st of each month):
 * 0 0 1 * * node backend/scripts/autoClearChats.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Message = require('../models/Chat');
const ChatGroup = require('../models/ChatGroup');

const runAutoClear = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/apsar_tracker');
    console.log('MongoDB connected');

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

      // Only clear messages from before the current month
      const result = await Message.deleteMany({
        ...query,
        createdAt: { $lt: firstOfMonth }
      });

      totalCleared += result.deletedCount;
      group.lastCleared = new Date();
      await group.save();
      
      console.log(`Cleared ${result.deletedCount} messages from ${group.name}`);
    }

    console.log(`Auto-clear completed. Total messages cleared: ${totalCleared}`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error in auto-clear script:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  runAutoClear();
}

module.exports = runAutoClear;

