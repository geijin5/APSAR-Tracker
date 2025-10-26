const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Asset = require('./models/Asset');
const Category = require('./models/Category');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/apsar_tracker');
    console.log('MongoDB connected for seeding');

    // Clear existing data
    await User.deleteMany({});
    await Asset.deleteMany({});
    await Category.deleteMany({});
    console.log('Cleared existing data');

    // Create users - using save() to trigger password hashing
    const adminUser = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@apsar.org',
      password: 'password123',
      role: 'admin',
      unit: 'Command'
    });
    await adminUser.save();

    const techUser = new User({
      firstName: 'John',
      lastName: 'Technician',
      email: 'tech@apsar.org',
      password: 'password123',
      role: 'technician',
      unit: 'Technical'
    });
    await techUser.save();

    const operatorUser = new User({
      firstName: 'Sarah',
      lastName: 'Operator',
      email: 'operator@apsar.org',
      password: 'password123',
      role: 'operator',
      unit: 'Operations'
    });
    await operatorUser.save();

    const viewerUser = new User({
      firstName: 'Mike',
      lastName: 'Viewer',
      email: 'viewer@apsar.org',
      password: 'password123',
      role: 'viewer',
      unit: 'General'
    });
    await viewerUser.save();

    const users = [adminUser, techUser, operatorUser, viewerUser];
    console.log('Created users');

    // Create default categories for work orders
    const categories = await Category.insertMany([
      { name: 'Repair', type: 'workorder', description: 'General repair work' },
      { name: 'Maintenance', type: 'workorder', description: 'Routine maintenance tasks' },
      { name: 'Inspection', type: 'workorder', description: 'Safety and compliance inspections' },
      { name: 'Upgrade', type: 'workorder', description: 'Equipment upgrades and improvements' },
      { name: 'Installation', type: 'workorder', description: 'New equipment installation' },
      { name: 'Other', type: 'workorder', description: 'Other work order types' }
    ]);
    console.log('Created default categories');

    // Create sample assets
    const assets = await Asset.insertMany([
      {
        assetNumber: 'AST-001',
        name: 'Search and Rescue Vehicle - Unit 1',
        category: 'vehicle_ground',
        type: '4WD Truck',
        manufacturer: 'Ford',
        model: 'F-250',
        serialNumber: 'F250-2020-001',
        currentLocation: 'Station 1',
        assignedUnit: 'Unit 1',
        status: 'operational',
        totalMiles: 45230,
        createdBy: users[0]._id
      },
      {
        assetNumber: 'AST-002',
        name: 'Medical Kit - Trauma',
        category: 'medical',
        type: 'Trauma Kit',
        manufacturer: 'North American Rescue',
        model: 'TACMED',
        currentLocation: 'Vehicle Unit 1',
        assignedUnit: 'Unit 1',
        status: 'operational',
        expiryItems: [
          {
            name: 'Surgical Gloves',
            expiryDate: new Date('2025-06-01'),
            daysUntilExpiry: 218,
            status: 'valid'
          },
          {
            name: 'IV Fluids',
            expiryDate: new Date('2024-12-15'),
            daysUntilExpiry: -36,
            status: 'expired'
          }
        ],
        createdBy: users[0]._id
      },
      {
        assetNumber: 'AST-003',
        name: 'Handheld Radio Unit',
        category: 'communications',
        type: 'Two-Way Radio',
        manufacturer: 'Motorola',
        model: 'DP3400',
        serialNumber: 'MOTO-2021-145',
        currentLocation: 'Equipment Room',
        assignedUnit: 'Unit 2',
        status: 'operational',
        createdBy: users[0]._id
      },
      {
        assetNumber: 'AST-004',
        name: 'Climbing Rope - 60m',
        category: 'climbing',
        type: 'Dynamic Rope',
        manufacturer: 'Petzl',
        model: 'Contact',
        serialNumber: 'PTZ-2022-089',
        currentLocation: 'Climbing Equipment Cache',
        assignedUnit: 'Technical Team',
        status: 'operational',
        certifications: [
          {
            name: 'UIAA Certification',
            issuedDate: new Date('2022-01-15'),
            expiryDate: new Date('2027-01-15'),
            issuingAuthority: 'UIAA',
            status: 'valid'
          }
        ],
        createdBy: users[1]._id
      },
      {
        assetNumber: 'AST-005',
        name: 'GPS Navigation Device',
        category: 'navigation',
        type: 'Handheld GPS',
        manufacturer: 'Garmin',
        model: 'GPSMAP 66sr',
        serialNumber: 'GRM-2023-0234',
        currentLocation: 'Control Center',
        assignedUnit: 'Navigation Team',
        status: 'maintenance',
        lastMaintenanceDate: new Date('2024-10-01'),
        nextMaintenanceDate: new Date('2025-01-01'),
        createdBy: users[0]._id
      },
      {
        assetNumber: 'AST-006',
        name: 'Search Drone - DJI Mavic',
        category: 'vehicle_air',
        type: 'UAV',
        manufacturer: 'DJI',
        model: 'Mavic 2 Enterprise',
        serialNumber: 'DJI-2023-456',
        currentLocation: 'Hangar',
        assignedUnit: 'Air Support Unit',
        status: 'operational',
        certifications: [
          {
            name: 'FAA Part 107 License',
            issuedDate: new Date('2023-03-01'),
            expiryDate: new Date('2025-03-01'),
            issuingAuthority: 'FAA'
          }
        ],
        createdBy: users[0]._id
      }
    ]);
    console.log('Created sample assets');

    console.log('\n✅ Database seeded successfully!');
    console.log('\nTest Credentials:');
    console.log('==================');
    console.log('Admin:     admin@apsar.org / password123');
    console.log('Technician: tech@apsar.org / password123');
    console.log('Operator:   operator@apsar.org / password123');
    console.log('Viewer:     viewer@apsar.org / password123');
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
