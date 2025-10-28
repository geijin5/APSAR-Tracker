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
  const debugInfo = {
    nodeEnv: process.env.NODE_ENV,
    currentDir: __dirname,
    workingDir: process.cwd(),
    frontendPath: path.join(__dirname, '../frontend/dist'),
    backendPath: __dirname,
  };
  
  try {
    // Check if frontend dist exists
    debugInfo.frontendExists = fs.existsSync(path.join(__dirname, '../frontend/dist'));
    debugInfo.frontendIndexExists = fs.existsSync(path.join(__dirname, '../frontend/dist/index.html'));
    
    // List files in current directory
    debugInfo.currentDirFiles = fs.readdirSync(process.cwd());
    
    // Try to list frontend dist contents
    if (debugInfo.frontendExists) {
      debugInfo.frontendFiles = fs.readdirSync(path.join(__dirname, '../frontend/dist'));
    }
  } catch (error) {
    debugInfo.error = error.message;
  }
  
  res.json(debugInfo);
});

// Serve static files from the React build
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  
  // Try multiple possible paths for the frontend dist
  const possiblePaths = [
    path.join(__dirname, '../frontend/dist'),      // Standard path
    path.join(process.cwd(), 'frontend/dist'),     // From container root
    path.join(__dirname, '../../frontend/dist'),   // In case of nested structure
    path.join(process.cwd(), 'dist'),              // Direct dist folder
    path.join(__dirname, 'public'),                // Public folder in backend
    path.join(process.cwd(), 'public')             // Public folder in root
  ];
  
  let frontendPath = null;
  let indexPath = null;
  
  // Find the correct path
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath) && fs.existsSync(path.join(testPath, 'index.html'))) {
      frontendPath = testPath;
      indexPath = path.join(testPath, 'index.html');
      console.log(`✅ Frontend found at: ${frontendPath}`);
      break;
    }
  }
  
  if (frontendPath && indexPath) {
    // Serve static files from frontend build
    app.use(express.static(frontendPath));
    
    // Handle React routing - send all non-API requests to index.html
    app.get('*', (req, res) => {
      res.sendFile(indexPath);
    });
  } else {
    console.log('❌ Frontend dist not found in any of the expected paths');
    // Fallback route
    app.get('*', (req, res) => {
      res.status(404).send(`
        <h1>Frontend Not Found</h1>
        <p>The frontend build files could not be located.</p>
        <p>Please check the build process and file paths.</p>
        <p><a href="/api/debug">View Debug Info</a></p>
        <p><a href="/api/health">API Health Check</a></p>
      `);
    });
  }
} else {
  // Development mode - show message
  app.get('*', (req, res) => {
    res.send(`
      <h1>APSAR Tracker - Development Mode</h1>
      <p>Backend is running on port ${process.env.PORT || 5000}</p>
      <p>Frontend should be running separately on port 3000</p>
      <p><a href="/api/health">API Health Check</a></p>
      <p><a href="/api/debug">Debug Info</a></p>
    `);
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
