# APSAR Tracker - Deployment Guide

## Quick Deploy to Production

### Prerequisites
- MongoDB database (MongoDB Atlas recommended)
- Environment variables configured
- Domain name (optional but recommended)

## Option 1: Deploy to Render (Recommended)

### Step 1: Prepare for Production

1. **Create production environment file**
```bash
# In backend folder, create .env.production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/apsar_tracker
PORT=5000
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret-here
```

2. **Update backend package.json**
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "seed": "node seed.js"
  }
}
```

3. **Create build script for frontend**
```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### Step 2: Database Setup (MongoDB Atlas)

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create free cluster
3. Create database user
4. Whitelist IP addresses (0.0.0.0/0 for public access)
5. Get connection string

### Step 3: Deploy Backend to Render

1. Go to [Render.com](https://render.com)
2. Connect GitHub repository
3. Create new **Web Service**
4. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Add your environment variables

### Step 4: Deploy Frontend to Render

1. Create new **Static Site**
2. Configure:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`

## Option 2: Deploy to Vercel + Railway

### Backend (Railway)
1. Go to [Railway.app](https://railway.app)
2. Connect repository
3. Deploy backend folder
4. Add MongoDB service
5. Configure environment variables

### Frontend (Vercel)
1. Go to [Vercel.com](https://vercel.com)
2. Import repository
3. Set root directory to `frontend`
4. Deploy

## Option 3: Self-Hosted (VPS)

### Requirements
- Ubuntu/CentOS server
- Node.js 18+
- MongoDB
- Nginx (reverse proxy)
- SSL certificate

### Steps
1. **Setup server**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
# Follow MongoDB installation guide for your OS

# Install PM2 for process management
npm install -g pm2
```

2. **Deploy application**
```bash
# Clone repository
git clone [your-repository-url]
cd apsar-tracker

# Install dependencies
cd backend && npm install
cd ../frontend && npm install && npm run build

# Start backend with PM2
cd backend
pm2 start server.js --name "apsar-backend"

# Setup Nginx
sudo apt install nginx
# Configure Nginx to serve frontend and proxy API calls
```

3. **Nginx Configuration**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Serve frontend
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Production Checklist

### Security
- [ ] Environment variables secured
- [ ] JWT secret is strong and unique
- [ ] MongoDB connection secured
- [ ] HTTPS enabled
- [ ] CORS configured properly

### Performance
- [ ] Frontend assets minified
- [ ] Images optimized
- [ ] Database indexes created
- [ ] CDN configured (optional)

### Monitoring
- [ ] Error logging setup
- [ ] Uptime monitoring
- [ ] Database backups configured

## Environment Variables

### Backend (.env)
```
MONGODB_URI=mongodb+srv://...
PORT=5000
NODE_ENV=production
JWT_SECRET=your-jwt-secret
```

### Frontend (if needed)
```
VITE_API_URL=https://your-backend-domain.com/api
```

## Post-Deployment Steps

1. **Seed the database**
```bash
# Run once after deployment
node backend/seed.js
```

2. **Test the application**
- Login with test credentials
- Create a checklist
- Test printing functionality
- Verify all pages work

3. **Setup SSL Certificate** (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Maintenance

### Backups
- Database: Setup automated backups in MongoDB Atlas
- Files: Regular git commits and pushes

### Updates
```bash
# Pull latest changes
git pull origin main

# Update dependencies
cd backend && npm install
cd ../frontend && npm install && npm run build

# Restart services
pm2 restart apsar-backend
```

## Troubleshooting

### Common Issues
1. **MongoDB connection fails**: Check connection string and IP whitelist
2. **Frontend can't reach API**: Verify CORS and API URL configuration
3. **Print functionality doesn't work**: Ensure popup blockers are disabled
4. **Upload issues**: Check file size limits and directory permissions

### Logs
```bash
# Backend logs (if using PM2)
pm2 logs apsar-backend

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

## Support

For deployment assistance:
1. Check deployment platform documentation
2. Review application logs
3. Test locally first with production environment
4. Ensure all environment variables are set correctly
