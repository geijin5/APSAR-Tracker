const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Asset = require('./models/Asset');
const Category = require('./models/Category');
const ChecklistTemplate = require('./models/ChecklistTemplate');
const Appointment = require('./models/Appointment');
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
    await ChecklistTemplate.deleteMany({});
    await Appointment.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user only - no test users
    const adminUser = new User({
      firstName: 'Admin',
      lastName: 'User',
      username: 'myusername',        // ← Your custom username
      password: 'mypassword123',     // ← Your custom password
      role: 'admin'
    });
    await adminUser.save();

    console.log('Created admin user');

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

    // Create checklist templates
    const checklistTemplates = await ChecklistTemplate.insertMany([
      {
        name: 'Emergency Callout Equipment Check',
        type: 'callout',
        category: 'general',
        description: 'Pre-deployment verification checklist for emergency response',
        items: [
          { title: 'Radio communication check', description: 'Test all radio frequencies and backup channels', category: 'communication', required: true, order: 1 },
          { title: 'GPS device functionality', description: 'Verify GPS signal and battery level', category: 'equipment', required: true, order: 2 },
          { title: 'Medical kit inventory', description: 'Check expiry dates and completeness of medical supplies', category: 'safety', required: true, order: 3 },
          { title: 'Personal protective equipment', description: 'Verify helmet, harness, and safety gear', category: 'safety', required: true, order: 4 },
          { title: 'Emergency contact list', description: 'Confirm contact information is current', category: 'documentation', required: true, order: 5 },
          { title: 'Weather conditions review', description: 'Check current and forecast weather conditions', category: 'operational', required: true, order: 6 },
          { title: 'Vehicle fuel level', description: 'Ensure adequate fuel for mission duration', category: 'operational', required: true, order: 7 },
          { title: 'Backup equipment verification', description: 'Confirm backup batteries, flashlights, and emergency supplies', category: 'equipment', required: false, order: 8 }
        ],
        createdBy: adminUser._id
      },
      {
        name: 'Communications Equipment Callout Check',
        type: 'callout',
        category: 'communications',
        description: 'Pre-deployment check for communication equipment',
        items: [
          { title: 'Primary radio functionality', description: 'Test main communication device on all channels', category: 'communication', required: true, order: 1 },
          { title: 'Backup radio check', description: 'Verify secondary communication device', category: 'communication', required: true, order: 2 },
          { title: 'Satellite phone test', description: 'Confirm satellite communication capability', category: 'communication', required: false, order: 3 },
          { title: 'Battery levels', description: 'Check all communication device battery levels', category: 'equipment', required: true, order: 4 },
          { title: 'Antenna inspection', description: 'Verify antenna condition and connections', category: 'equipment', required: true, order: 5 },
          { title: 'Emergency frequencies programmed', description: 'Confirm emergency channel programming', category: 'operational', required: true, order: 6 }
        ],
        createdBy: adminUser._id
      },
      {
        name: 'Medical Equipment Callout Check',
        type: 'callout',
        category: 'medical',
        description: 'Pre-deployment verification for medical response equipment',
        items: [
          { title: 'Trauma kit inventory', description: 'Verify all trauma supplies are present and unexpired', category: 'safety', required: true, order: 1 },
          { title: 'Oxygen equipment check', description: 'Test oxygen delivery systems and tank levels', category: 'equipment', required: true, order: 2 },
          { title: 'Medications expiry check', description: 'Verify all medications are within expiry dates', category: 'safety', required: true, order: 3 },
          { title: 'Defibrillator test', description: 'Perform daily test on AED/defibrillator', category: 'equipment', required: true, order: 4 },
          { title: 'Immobilization devices', description: 'Check condition of backboards, splints, and cervical collars', category: 'equipment', required: true, order: 5 },
          { title: 'IV supplies check', description: 'Verify IV fluids and supplies are complete', category: 'safety', required: true, order: 6 },
          { title: 'Biohazard cleanup kit', description: 'Confirm cleanup materials are available', category: 'safety', required: false, order: 7 }
        ],
        createdBy: adminUser._id
      },
      {
        name: 'General Equipment Maintenance',
        type: 'maintenance',
        category: 'general',
        description: 'Standard maintenance procedures for general equipment',
        items: [
          { title: 'Visual inspection', description: 'Inspect for damage, wear, or deterioration', category: 'operational', required: true, order: 1 },
          { title: 'Functional test', description: 'Test all operational features and controls', category: 'operational', required: true, order: 2 },
          { title: 'Clean and sanitize', description: 'Thoroughly clean and disinfect equipment', category: 'operational', required: true, order: 3 },
          { title: 'Lubrication check', description: 'Apply lubrication to moving parts as needed', category: 'operational', required: false, order: 4 },
          { title: 'Calibration verification', description: 'Check and adjust calibration if applicable', category: 'operational', required: false, order: 5 },
          { title: 'Battery maintenance', description: 'Check battery condition and charge level', category: 'equipment', required: true, order: 6 },
          { title: 'Documentation update', description: 'Update maintenance logs and service records', category: 'documentation', required: true, order: 7 },
          { title: 'Parts replacement', description: 'Replace worn or damaged components', category: 'operational', required: false, order: 8 }
        ],
        createdBy: adminUser._id
      },
      {
        name: 'Communications Equipment Maintenance',
        type: 'maintenance',
        category: 'communications',
        description: 'Maintenance procedures for radio and communication equipment',
        items: [
          { title: 'Frequency alignment check', description: 'Verify frequency accuracy and stability', category: 'operational', required: true, order: 1 },
          { title: 'Antenna system inspection', description: 'Check antenna, cables, and connections', category: 'equipment', required: true, order: 2 },
          { title: 'Power output test', description: 'Measure transmitter power output', category: 'operational', required: true, order: 3 },
          { title: 'Battery cycle test', description: 'Perform full discharge/charge cycle on batteries', category: 'equipment', required: true, order: 4 },
          { title: 'Audio quality check', description: 'Test microphone and speaker functionality', category: 'operational', required: true, order: 5 },
          { title: 'Waterproofing inspection', description: 'Verify seals and gaskets are intact', category: 'equipment', required: true, order: 6 },
          { title: 'Software/firmware update', description: 'Install latest software updates if available', category: 'operational', required: false, order: 7 }
        ],
        createdBy: adminUser._id
      },
      {
        name: 'Ground Vehicle Pre-Use Inspection',
        type: 'vehicle_inspection',
        category: 'vehicle_ground',
        description: 'Safety and operational check for ground vehicles',
        items: [
          { title: 'Exterior visual inspection', description: 'Check for damage, leaks, and tire condition', category: 'safety', required: true, order: 1 },
          { title: 'Fluid levels check', description: 'Verify engine oil, coolant, brake fluid, and washer fluid', category: 'operational', required: true, order: 2 },
          { title: 'Lights and signals test', description: 'Test all lights, flashers, and warning devices', category: 'safety', required: true, order: 3 },
          { title: 'Brake system check', description: 'Test brake pedal feel and parking brake', category: 'safety', required: true, order: 4 },
          { title: 'Steering and suspension', description: 'Check for proper steering response and unusual noises', category: 'safety', required: true, order: 5 },
          { title: 'Emergency equipment inventory', description: 'Verify first aid kit, fire extinguisher, and tools', category: 'safety', required: true, order: 6 },
          { title: 'Communication equipment test', description: 'Test radio and GPS systems', category: 'communication', required: true, order: 7 },
          { title: 'Fuel level verification', description: 'Ensure adequate fuel for planned operations', category: 'operational', required: true, order: 8 },
          { title: 'Documentation check', description: 'Verify registration, insurance, and inspection certificates', category: 'documentation', required: true, order: 9 }
        ],
        createdBy: adminUser._id
      },
      {
        name: 'Aircraft Pre-Flight Inspection',
        type: 'vehicle_inspection',
        category: 'vehicle_air',
        description: 'Pre-flight safety check for aircraft and drones',
        items: [
          { title: 'Weather conditions assessment', description: 'Check current weather and forecast conditions', category: 'safety', required: true, order: 1 },
          { title: 'Visual airframe inspection', description: 'Inspect fuselage, wings, and control surfaces', category: 'safety', required: true, order: 2 },
          { title: 'Propeller/rotor inspection', description: 'Check propeller or rotor condition and security', category: 'safety', required: true, order: 3 },
          { title: 'Battery system check', description: 'Verify battery charge level and connections', category: 'equipment', required: true, order: 4 },
          { title: 'Control system test', description: 'Test all flight controls and responses', category: 'operational', required: true, order: 5 },
          { title: 'Navigation systems check', description: 'Test GPS, compass, and navigation equipment', category: 'operational', required: true, order: 6 },
          { title: 'Camera/payload inspection', description: 'Verify camera and sensor functionality', category: 'equipment', required: false, order: 7 },
          { title: 'Emergency procedures review', description: 'Review emergency landing and recovery procedures', category: 'safety', required: true, order: 8 },
          { title: 'Flight plan verification', description: 'Confirm flight path and operational parameters', category: 'documentation', required: true, order: 9 }
        ],
        createdBy: adminUser._id
      },
      {
        name: 'Marine Vehicle Inspection',
        type: 'vehicle_inspection',
        category: 'vehicle_marine',
        description: 'Pre-deployment check for marine vessels',
        items: [
          { title: 'Hull and deck inspection', description: 'Check for damage, leaks, and structural integrity', category: 'safety', required: true, order: 1 },
          { title: 'Engine system check', description: 'Test engine start, idle, and cooling system', category: 'operational', required: true, order: 2 },
          { title: 'Fuel system inspection', description: 'Check fuel levels, lines, and connections', category: 'operational', required: true, order: 3 },
          { title: 'Safety equipment inventory', description: 'Verify life jackets, flares, and emergency equipment', category: 'safety', required: true, order: 4 },
          { title: 'Navigation equipment test', description: 'Test GPS, compass, and depth finder', category: 'operational', required: true, order: 5 },
          { title: 'Communication systems check', description: 'Test marine radio and emergency frequencies', category: 'communication', required: true, order: 6 },
          { title: 'Anchor and mooring gear', description: 'Inspect anchor, chain, and mooring equipment', category: 'equipment', required: true, order: 7 },
          { title: 'Weather and sea conditions', description: 'Check marine weather forecast and sea state', category: 'safety', required: true, order: 8 }
        ],
        createdBy: adminUser._id
      }
    ]);
    console.log('Created checklist templates');

    // Create sample appointments
    const today = new Date();
    const appointments = await Appointment.insertMany([
      {
        title: 'Monthly Team Meeting',
        description: 'Regular monthly meeting to discuss operations and upcoming missions',
        startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 10, 0), // 3 days from now at 10:00 AM
        endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 11, 30), // Same day at 11:30 AM
        location: 'Conference Room A',
        type: 'meeting',
        priority: 'medium',
        status: 'scheduled',
        attendees: [
          { user: adminUser._id, status: 'accepted' },
          { user: operatorUser._id, status: 'invited' },
          { user: techUser._id, status: 'invited' }
        ],
        createdBy: adminUser._id,
        tags: ['operations', 'monthly']
      },
      {
        title: 'Equipment Maintenance Training',
        description: 'Training session on new maintenance procedures for rescue equipment',
        startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 9, 0), // 1 week from now at 9:00 AM
        endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 17, 0), // Same day at 5:00 PM
        allDay: false,
        location: 'Training Center',
        type: 'training',
        priority: 'high',
        status: 'confirmed',
        attendees: [
          { user: techUser._id, status: 'accepted' },
          { user: operatorUser._id, status: 'accepted' }
        ],
        createdBy: adminUser._id,
        tags: ['training', 'maintenance', 'equipment']
      },
      {
        title: 'Vehicle Inspection',
        description: 'Annual safety inspection for rescue vehicle fleet',
        startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 8, 0), // 5 days from now at 8:00 AM
        endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 16, 0), // Same day at 4:00 PM
        location: 'Vehicle Bay',
        type: 'inspection',
        priority: 'urgent',
        status: 'scheduled',
        relatedAsset: assets[0]._id, // Reference the search and rescue vehicle
        attendees: [
          { user: techUser._id, status: 'accepted' }
        ],
        createdBy: operatorUser._id,
        tags: ['inspection', 'vehicles', 'annual']
      },
      {
        title: 'Community Safety Event',
        description: 'Public awareness event about search and rescue operations',
        startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14, 10, 0), // 2 weeks from now at 10:00 AM
        endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14, 15, 0), // Same day at 3:00 PM
        location: 'Community Center',
        type: 'event',
        priority: 'medium',
        status: 'scheduled',
        attendees: [
          { user: adminUser._id, status: 'accepted' },
          { user: operatorUser._id, status: 'accepted' },
          { user: viewerUser._id, status: 'tentative' }
        ],
        createdBy: adminUser._id,
        tags: ['community', 'outreach', 'public']
      },
      {
        title: 'Quarterly Equipment Review',
        description: 'Review and assessment of all rescue equipment condition and needs',
        startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 13, 0), // 10 days from now at 1:00 PM
        endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 16, 0), // Same day at 4:00 PM
        location: 'Equipment Storage',
        type: 'inspection',
        priority: 'medium',
        status: 'scheduled',
        attendees: [
          { user: techUser._id, status: 'accepted' },
          { user: adminUser._id, status: 'invited' }
        ],
        createdBy: techUser._id,
        tags: ['equipment', 'quarterly', 'review']
      },
      {
        title: 'Medical Equipment Calibration',
        description: 'Scheduled calibration and testing of medical response equipment',
        startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 21, 9, 0), // 3 weeks from now at 9:00 AM
        endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 21, 12, 0), // Same day at 12:00 PM
        location: 'Medical Bay',
        type: 'maintenance',
        priority: 'high',
        status: 'scheduled',
        relatedAsset: assets[1]._id, // Reference the medical kit
        attendees: [
          { user: techUser._id, status: 'accepted' }
        ],
        createdBy: adminUser._id,
        tags: ['medical', 'calibration', 'maintenance']
      }
    ]);
    console.log('Created sample appointments');

    console.log('\n✅ Database seeded successfully!');
    console.log('\nAdmin Credentials (Username / Password):');
    console.log('=======================================');
    console.log('Admin:      myusername / mypassword123');
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
