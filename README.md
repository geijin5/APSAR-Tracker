# APSAR Tracker

Asset Management System for Anaconda Pintler Search and Rescue

## Features

### Asset Management and Inventory
- Comprehensive equipment register with detailed profiles
- Location tracking for assets
- Barcode/RFID scanning support
- Certification and expiration tracking with automatic alerts
- Document and photo attachments

### Maintenance Scheduling and Tracking
- Preventative maintenance scheduling
- Work order creation and assignment
- Maintenance history logging
- Checklist-driven inspections
- Parts and labor tracking

### Reporting and Analytics
- Real-time status dashboard
- Failure analysis tracking
- Compliance reports
- Cost tracking for repairs and maintenance

### Communication and Collaboration
- Alerts and notifications
- Photo and document attachments
- Offline capability support
- Role-based access control

### Usability and Security
- User-friendly interface
- Mobile-first design
- Role-based access control (Admin, Technician, Operator, Viewer)
- Data security and backup

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Authentication**: JWT

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd APSAR-Tracker
```

2. Install dependencies
```bash
npm run install:all
```

3. Setup environment variables

Create a `.env` file in the `backend` directory:

**For Local MongoDB:**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/apsar_tracker
JWT_SECRET=your_secret_jwt_key_here
NODE_ENV=development
```

**For MongoDB Atlas (AWS/Cloud):**
```
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/apsar_tracker?retryWrites=true&w=majority
JWT_SECRET=your_secret_jwt_key_here
NODE_ENV=development
```

**Steps to get MongoDB Atlas connection string:**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account or sign in
3. Create a new cluster (or use existing)
4. Click "Connect" on your cluster
5. Choose "Connect your application"
6. Copy the connection string
7. Replace `<password>` with your database password
8. Replace `<database>` with your database name (e.g., `apsar_tracker`)

4. Start the development servers
```bash
npm run dev
```

This will start:
- Backend API on http://localhost:5000
- Frontend on http://localhost:3000

### Seed Test Data

To populate the database with test users and sample assets:

```bash
cd backend
npm run seed
```

This will create:
- **4 test users** with different roles
- **6 sample assets** across different categories

### Test Credentials

After running the seed script, you can use these credentials to log in:

| Role       | Email              | Password    |
|------------|--------------------|-------------|
| Admin      | admin@apsar.org    | password123 |
| Technician | tech@apsar.org     | password123 |
| Operator   | operator@apsar.org | password123 |
| Viewer     | viewer@apsar.org   | password123 |

## Project Structure

```
APSAR-Tracker/
├── backend/
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Auth and upload middleware
│   └── server.js        # Express server
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── contexts/    # React contexts
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   └── App.jsx      # Main App component
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user

### Assets
- GET `/api/assets` - Get all assets
- GET `/api/assets/:id` - Get single asset
- POST `/api/assets` - Create asset
- PUT `/api/assets/:id` - Update asset
- DELETE `/api/assets/:id` - Delete asset

### Maintenance
- GET `/api/maintenance` - Get all maintenance records
- GET `/api/maintenance/overdue` - Get overdue maintenance
- POST `/api/maintenance` - Create maintenance record
- PUT `/api/maintenance/:id` - Update maintenance record

### Work Orders
- GET `/api/workorders` - Get all work orders
- GET `/api/workorders/:id` - Get single work order
- POST `/api/workorders` - Create work order
- PUT `/api/workorders/:id` - Update work order

### Dashboard
- GET `/api/dashboard/stats` - Get dashboard statistics

### Reports
- GET `/api/reports/maintenance-cost` - Maintenance cost report
- GET `/api/reports/asset-status` - Asset status report
- GET `/api/reports/work-order-summary` - Work order summary

## Development

### Backend
```bash
cd backend
npm run dev
```

### Frontend
```bash
cd frontend
npm run dev
```

## Production Build

### Frontend
```bash
cd frontend
npm run build
```

### Backend
```bash
cd backend
npm start
```

## License

Private - Anaconda Pintler Search and Rescue
