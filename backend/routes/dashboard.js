const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const MaintenanceRecord = require('../models/MaintenanceRecord');
const WorkOrder = require('../models/WorkOrder');
const Appointment = require('../models/Appointment');
const { auth } = require('../middleware/auth');

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    // Asset statistics
    const totalAssets = await Asset.countDocuments();
    const operationalAssets = await Asset.countDocuments({ status: 'operational' });
    const maintenanceAssets = await Asset.countDocuments({ status: 'maintenance' });
    const repairAssets = await Asset.countDocuments({ status: 'repair' });

    // Asset status breakdown
    const assetsByStatus = await Asset.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Asset category breakdown
    const assetsByCategory = await Asset.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Maintenance statistics
    const scheduledMaintenance = await MaintenanceRecord.countDocuments({ 
      status: { $in: ['scheduled', 'in_progress'] } 
    });
    const overdueMaintenance = await MaintenanceRecord.countDocuments({ 
      status: { $in: ['scheduled', 'in_progress'] },
      dueDate: { $lt: new Date() }
    });
    const completedMaintenance = await MaintenanceRecord.countDocuments({ 
      status: 'completed' 
    });
    
    // Work order statistics
    const openWorkOrders = await WorkOrder.countDocuments({ 
      status: { $in: ['open', 'assigned', 'in_progress'] } 
    });
    const criticalWorkOrders = await WorkOrder.countDocuments({ 
      status: { $in: ['open', 'assigned', 'in_progress'] },
      priority: 'critical'
    });
    const completedWorkOrders = await WorkOrder.countDocuments({ 
      status: 'completed' 
    });

    // Upcoming maintenance
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingMaintenance = await MaintenanceRecord.find({
      status: 'scheduled',
      dueDate: { $lte: nextWeek, $gte: new Date() }
    })
      .populate('asset', 'name assetNumber')
      .sort({ dueDate: 1 })
      .limit(10);

    // Expiring certifications
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const expiringSoon = await Asset.find({
      'certifications.expiryDate': { $lte: nextMonth, $gte: new Date() }
    })
      .populate('certifications')
      .limit(20);

    // Recent activity
    const recentMaintenance = await MaintenanceRecord.find()
      .populate('asset', 'name assetNumber')
      .populate('performedBy', 'firstName lastName')
      .sort({ completedDate: -1 })
      .limit(10);

    // Calendar events - get maintenance and work orders for next 90 days
    const calendarStart = new Date();
    const calendarEnd = new Date();
    calendarEnd.setDate(calendarEnd.getDate() + 90);

    const calendarMaintenance = await MaintenanceRecord.find({
      dueDate: { $gte: calendarStart, $lte: calendarEnd },
      status: { $in: ['scheduled', 'in_progress'] }
    })
      .populate('asset', 'name')
      .select('dueDate title asset');

    const calendarWorkOrders = await WorkOrder.find({
      scheduledStartDate: { $gte: calendarStart, $lte: calendarEnd },
      status: { $in: ['open', 'assigned', 'in_progress'] }
    })
      .populate('asset', 'name')
      .select('scheduledStartDate title asset');

    const calendarAppointments = await Appointment.find({
      $or: [
        {
          startDate: { $gte: calendarStart, $lte: calendarEnd }
        },
        {
          endDate: { $gte: calendarStart, $lte: calendarEnd }
        }
      ],
      status: { $in: ['scheduled', 'confirmed', 'in_progress'] }
    })
      .populate('createdBy', 'firstName lastName')
      .populate('relatedAsset', 'name')
      .select('startDate endDate title type priority location relatedAsset createdBy');

    res.json({
      assets: {
        total: totalAssets,
        operational: operationalAssets,
        maintenance: maintenanceAssets,
        repair: repairAssets,
        byStatus: assetsByStatus,
        byCategory: assetsByCategory
      },
      maintenance: {
        scheduled: scheduledMaintenance,
        overdue: overdueMaintenance,
        completed: completedMaintenance,
        upcoming: upcomingMaintenance
      },
      workOrders: {
        open: openWorkOrders,
        critical: criticalWorkOrders,
        completed: completedWorkOrders
      },
      expiring: expiringSoon,
      recentActivity: recentMaintenance,
      calendar: {
        maintenance: calendarMaintenance,
        workOrders: calendarWorkOrders,
        appointments: calendarAppointments
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
