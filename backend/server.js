const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/apsar_tracker')
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/workorders', require('./routes/workOrders'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/quotes', require('./routes/quotes'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/checklists', require('./routes/checklists'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/work-order-templates', require('./routes/workOrderTemplates'));
app.use('/api/maintenance-templates', require('./routes/maintenanceTemplates'));
app.use('/api/completed-checklists', require('./routes/completedChecklists'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/adlc', require('./routes/adlcIntegration'));
app.use('/api/callouts', require('./routes/callouts'));
app.use('/api/callout-reports', require('./routes/calloutReports'));

// Health check endpoint (must come before catch-all route)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'APSAR Tracker API is running' });
});

// Database and auth check endpoint
app.get('/api/check-db', async (req, res) => {
  try {
    const User = require('./models/User');
    
    const dbStatus = {
      mongoConnected: mongoose.connection.readyState === 1,
      mongoState: mongoose.connection.readyState,
      dbName: mongoose.connection.name,
      hasJwtSecret: !!process.env.JWT_SECRET,
      jwtSecretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
    };
    
    // Try to count users
    try {
      dbStatus.userCount = await User.countDocuments();
      dbStatus.hasUsers = dbStatus.userCount > 0;
      
      // Check if admin user exists
      const adminUser = await User.findOne({ username: 'myusername' });
      dbStatus.hasAdminUser = !!adminUser;
      
      if (adminUser) {
        dbStatus.adminUserInfo = {
          id: adminUser._id,
          username: adminUser.username,
          role: adminUser.role,
          isActive: adminUser.isActive,
          hasPassword: !!adminUser.password
        };
      }
    } catch (dbError) {
      dbStatus.dbError = dbError.message;
    }
    
    res.json(dbStatus);
  } catch (error) {
    res.status(500).json({ 
      error: 'Database check failed', 
      message: error.message 
    });
  }
});

// Emergency user creation endpoint (both GET and POST for convenience)
const createAdminHandler = async (req, res) => {
  try {
    const User = require('./models/User');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'myusername' });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin user already exists' });
    }
    
    // Create admin user
    const adminUser = new User({
      firstName: 'Admin',
      lastName: 'User',
      username: 'myusername',        // ← Your custom username
      password: 'mypassword123',     // ← Your custom password
      role: 'admin',
      isActive: true
    });
    
    await adminUser.save();
    
    res.json({ 
      message: 'Admin user created successfully',
      username: 'myusername',
      password: 'mypassword123',
      note: 'Please change the password after first login'
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to create admin user',
      message: error.message 
    });
  }
};

app.get('/api/create-admin', createAdminHandler);
app.post('/api/create-admin', createAdminHandler);

// List all users (for debugging)
app.get('/api/list-users', async (req, res) => {
  try {
    const User = require('./models/User');
    const users = await User.find({}, 'username role isActive createdAt').limit(20);
    
    res.json({
      message: 'Found users in database',
      count: users.length,
      users: users.map(user => ({
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to list users',
      message: error.message 
    });
  }
});

// Find existing admin users (for login help)
app.get('/api/find-admin', async (req, res) => {
  try {
    const User = require('./models/User');
    const adminUsers = await User.find({ role: 'admin' }, 'username role isActive createdAt');
    
    res.json({
      message: 'Found admin users',
      count: adminUsers.length,
      adminUsers: adminUsers.map(user => ({
        username: user.username,
        isActive: user.isActive,
        note: 'Try logging in with this username'
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to find admin users',
      message: error.message 
    });
  }
});

// Fix database indexes (remove old email index)
app.get('/api/fix-db-indexes', async (req, res) => {
  try {
    const User = require('./models/User');
    
    // Get current indexes
    const indexes = await User.collection.getIndexes();
    console.log('Current indexes:', Object.keys(indexes));
    
    let results = {
      message: 'Database index fix completed',
      indexes: Object.keys(indexes),
      actions: []
    };
    
    // Drop email index if it exists
    if (indexes.email_1) {
      try {
        await User.collection.dropIndex('email_1');
        results.actions.push('Dropped email_1 index');
        console.log('✅ Dropped email_1 index');
      } catch (dropError) {
        results.actions.push(`Failed to drop email_1 index: ${dropError.message}`);
        console.log('❌ Failed to drop email_1 index:', dropError.message);
      }
    } else {
      results.actions.push('email_1 index not found (already removed)');
    }
    
    // Get indexes after cleanup
    const newIndexes = await User.collection.getIndexes();
    results.indexesAfter = Object.keys(newIndexes);
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fix database indexes',
      message: error.message 
    });
  }
});

// Remove test users (keep only admin)
app.get('/api/clean-test-users', async (req, res) => {
  try {
    const User = require('./models/User');
    
    // Find test users (exclude the custom admin)
    const testUsers = await User.find({ 
      username: { $in: ['tech', 'operator', 'viewer'] }
    });
    
    let results = {
      message: 'Test user cleanup completed',
      actions: [],
      removedUsers: []
    };
    
    if (testUsers.length > 0) {
      for (const testUser of testUsers) {
        results.removedUsers.push({
          username: testUser.username,
          role: testUser.role,
          name: `${testUser.firstName} ${testUser.lastName}`
        });
      }
      
      // Delete test users
      await User.deleteMany({ 
        username: { $in: ['tech', 'operator', 'viewer'] }
      });
      
      results.actions.push(`Removed ${testUsers.length} test users`);
      console.log(`✅ Removed ${testUsers.length} test users:`, results.removedUsers);
    } else {
      results.actions.push('No test users found to remove');
    }
    
    // Get remaining user count
    const remainingUsers = await User.countDocuments();
    results.remainingUserCount = remainingUsers;
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to clean test users',
      message: error.message 
    });
  }
});

// Debug endpoint to check file paths and environment
app.get('/api/debug', (req, res) => {
  const fs = require('fs');
  const frontendPath = path.join(process.cwd(), 'frontend/dist');
  
  const debugInfo = {
    nodeEnv: process.env.NODE_ENV || 'undefined',
    port: process.env.PORT || 'undefined',
    currentDir: __dirname,
    workingDir: process.cwd(),
    frontendPath: frontendPath,
    backendPath: __dirname,
    timestamp: new Date().toISOString()
  };
  
  try {
    // Check if frontend dist exists
    debugInfo.frontendExists = fs.existsSync(frontendPath);
    debugInfo.frontendIndexExists = fs.existsSync(path.join(frontendPath, 'index.html'));
    
    // List files in working directory
    debugInfo.currentDirFiles = fs.readdirSync(process.cwd());
    
    // Try to list frontend dist contents
    if (debugInfo.frontendExists) {
      debugInfo.frontendFiles = fs.readdirSync(frontendPath);
    }
    
    // Check if we can read index.html
    if (debugInfo.frontendIndexExists) {
      const indexContent = fs.readFileSync(path.join(frontendPath, 'index.html'), 'utf8');
      debugInfo.indexFileSize = indexContent.length;
      debugInfo.hasReactRoot = indexContent.includes('root');
    }
    
  } catch (error) {
    debugInfo.error = error.message;
  }
  
  res.json(debugInfo);
});

// Always serve frontend in deployed environments (regardless of NODE_ENV)
const fs = require('fs');

// Based on debug info, frontend is at /app/frontend/dist
const frontendPath = path.join(process.cwd(), 'frontend/dist');
const indexPath = path.join(frontendPath, 'index.html');

console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`📂 Current working directory: ${process.cwd()}`);
console.log(`🎯 Frontend path: ${frontendPath}`);
console.log(`📄 Index path: ${indexPath}`);
console.log(`✅ Frontend directory exists: ${fs.existsSync(frontendPath)}`);
console.log(`✅ Index.html exists: ${fs.existsSync(indexPath)}`);

if (fs.existsSync(frontendPath) && fs.existsSync(indexPath)) {
  console.log(`🚀 Configuring Express to serve React app...`);
  
  // Serve static files (JS, CSS, images, etc.)
  app.use(express.static(frontendPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    setHeaders: (res, path) => {
      console.log(`📦 Serving static file: ${path}`);
    }
  }));
  
  console.log(`✅ Static file middleware configured for: ${frontendPath}`);
  
  // Catch-all handler: send back React's index.html file for any non-API routes
  app.get('*', (req, res) => {
    console.log(`🔍 Catch-all route hit for: ${req.path}`);
    
    // Skip if it's an API route (shouldn't happen, but just in case)
    if (req.path.startsWith('/api/')) {
      console.log(`❌ API route ${req.path} not found`);
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    console.log(`📤 Sending index.html for: ${req.path}`);
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error(`❌ Error serving index.html for ${req.path}:`, err);
        res.status(500).send(`
          <h1>Error Loading Application</h1>
          <p>Failed to serve index.html</p>
          <p>Error: ${err.message}</p>
          <p><a href="/api/debug">Debug Info</a></p>
        `);
      } else {
        console.log(`✅ Successfully served index.html for: ${req.path}`);
      }
    });
  });
  
  console.log(`🎉 Frontend serving setup complete!`);
} else {
  console.log(`❌ Frontend files not found at ${frontendPath}`);
  
  // Fallback if frontend files don't exist
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    res.status(500).send(`
      <h1>Frontend Files Not Found</h1>
      <p><strong>Expected path:</strong> ${frontendPath}</p>
      <p><strong>Index file:</strong> ${indexPath}</p>
      <p><strong>Directory exists:</strong> ${fs.existsSync(frontendPath)}</p>
      <p><strong>Index exists:</strong> ${fs.existsSync(indexPath)}</p>
      <p><strong>Working directory:</strong> ${process.cwd()}</p>
      <hr>
      <p><a href="/api/debug">Full Debug Info</a> | <a href="/api/health">API Health</a></p>
    `);
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
