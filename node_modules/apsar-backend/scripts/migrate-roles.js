#!/usr/bin/env node

/**
 * Migration script to convert from 5-role system to 3-role system
 * 
 * Mapping:
 * - admin → admin (unchanged)
 * - technician, operator, trainer → officer
 * - viewer → member
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const roleMapping = {
  'admin': 'admin',
  'technician': 'officer',
  'operator': 'officer',
  'trainer': 'officer',
  'viewer': 'member'
};

async function migrateRoles() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/apsar_tracker';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get all users
    const users = await User.find({});
    console.log(`\n📋 Found ${users.length} users to migrate\n`);

    let migrated = 0;
    for (const user of users) {
      const oldRole = user.role;
      const newRole = roleMapping[oldRole];
      
      if (newRole && newRole !== oldRole) {
        console.log(`  Migrating ${user.username} (${user.firstName} ${user.lastName}): ${oldRole} → ${newRole}`);
        user.role = newRole;
        await user.save();
        migrated++;
      } else if (newRole === oldRole) {
        console.log(`  Skipping ${user.username}: already ${oldRole}`);
      } else {
        console.log(`  ⚠️  Unknown role for ${user.username}: ${oldRole} (setting to member)`);
        user.role = 'member';
        await user.save();
        migrated++;
      }
    }

    console.log(`\n✅ Migration complete! Migrated ${migrated} users\n`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run migration
migrateRoles();
