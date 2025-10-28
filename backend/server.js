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

// Health check endpoint (must come before catch-all route)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'APSAR Tracker API is running' });
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
