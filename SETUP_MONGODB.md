# Setting Up MongoDB Atlas for APSAR Tracker

## Quick Setup Guide

### Step 1: Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Try Free" and sign up for a free account
3. Verify your email address

### Step 2: Create a Cluster
1. After logging in, click "Build a Database"
2. Select the **FREE (M0) Shared** tier
3. Choose your preferred cloud provider and region (e.g., AWS, US East)
4. Give your cluster a name (e.g., "apsar-cluster")
5. Click "Create Cluster"

### Step 3: Create Database User
1. Create a database username and password
   - Username: (choose something memorable like `apsar_admin`)
   - Password: (create a strong password and **save it**)
2. Click "Create Database User"
3. Click "Finish and Close"

### Step 4: Configure Network Access
1. In the "Network Access" section, click "Add IP Address"
2. Click "Allow Access from Anywhere" (for development)
   - Or add your specific IP address for production
3. Click "Confirm"

### Step 5: Get Connection String
1. Click "Connect" on your cluster
2. Select "Connect your application"
3. Choose "Driver" as "Node.js" and version "5.5 or later"
4. Copy the connection string (it looks like this):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 6: Update Your .env File
1. Open `backend/.env` file
2. Replace the MONGODB_URI with your connection string from Step 5
3. Replace `<username>` with your database username
4. Replace `<password>` with your database password
5. Optionally add your database name after the hostname

Example:
```env
MONGODB_URI=mongodb+srv://apsar_admin:yourpassword@cluster0.xxxxx.mongodb.net/apsar_tracker?retryWrites=true&w=majority
```

### Step 7: Test the Connection
1. Make sure your `.env` file is properly configured
2. Start your application:
   ```bash
   npm run dev
   ```
3. If you see "MongoDB connected" in the console, you're all set!

## Troubleshooting

### Common Issues

**Connection Timeout:**
- Make sure you've added your IP address in Network Access
- Try using "Allow Access from Anywhere" for testing

**Authentication Failed:**
- Double-check your username and password
- Make sure special characters in password are URL-encoded (e.g., `@` becomes `%40`)

**Connection Refused:**
- Wait a few minutes after creating the cluster (initialization takes time)
- Verify your connection string is correct

## Using Local MongoDB Instead

If you prefer to run MongoDB locally:

1. Install MongoDB Community Edition from https://www.mongodb.com/try/download/community
2. Update your `.env` file:
   ```env
   MONGODB_URI=mongodb://localhost:27017/apsar_tracker
   ```

## Security Notes

- **Never commit your `.env` file to version control**
- The `.env` file is already in `.gitignore` for safety
- Change your database password if it's ever exposed
- In production, use environment-specific user accounts with minimal permissions

## Free Tier Limits (M0)

MongoDB Atlas free tier includes:
- 512 MB storage
- Shared RAM and vCPU
- Suitable for development and small applications
- Enough for testing APSAR Tracker
