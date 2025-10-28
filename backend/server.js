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

// Serve static files from the React build in production
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  
  // Based on debug info, we know the frontend is at /app/frontend/dist
  const frontendPath = path.join(process.cwd(), 'frontend/dist');
  const indexPath = path.join(frontendPath, 'index.html');
  
  console.log(`🔍 Checking frontend path: ${frontendPath}`);
  console.log(`🔍 Index file path: ${indexPath}`);
  console.log(`📁 Frontend exists: ${fs.existsSync(frontendPath)}`);
  console.log(`📄 Index exists: ${fs.existsSync(indexPath)}`);
  
  if (fs.existsSync(frontendPath) && fs.existsSync(indexPath)) {
    console.log(`✅ Setting up static file serving from: ${frontendPath}`);
    
    // Serve static files from frontend build  
    app.use(express.static(frontendPath, {
      maxAge: '1d', // Cache static assets for 1 day
      index: false  // Don't automatically serve index.html for directory requests
    }));
    
    // Handle React routing - send all non-API requests to index.html
    app.get('*', (req, res) => {
      console.log(`📝 Serving index.html for route: ${req.path}`);
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('❌ Error serving index.html:', err);
          res.status(500).send('Error loading application');
        }
      });
    });
    
    console.log(`🚀 Frontend serving configured successfully`);
  } else {
    console.log('❌ Frontend files not found, serving error page');
    app.get('*', (req, res) => {
      res.status(404).send(`
        <h1>Frontend Build Not Found</h1>
        <p>Expected location: ${frontendPath}</p>
        <p>Index file: ${indexPath}</p>
        <p>Frontend exists: ${fs.existsSync(frontendPath)}</p>
        <p>Index exists: ${fs.existsSync(indexPath)}</p>
        <p><a href="/api/debug">View Debug Info</a></p>
        <p><a href="/api/health">API Health Check</a></p>
      `);
    });
  }
} else {
  // Development mode
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
