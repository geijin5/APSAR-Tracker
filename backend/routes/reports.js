const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const MaintenanceRecord = require('../models/MaintenanceRecord');
const WorkOrder = require('../models/WorkOrder');
const { auth } = require('../middleware/auth');

// @route   GET /api/reports/maintenance-cost
// @desc    Get maintenance cost report
// @access  Private
router.get('/maintenance-cost', auth, async (req, res) => {
  try {
    const { startDate, endDate, assetId } = req.query;
    const query = { status: 'completed' };

    if (startDate && endDate) {
      query.completedDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (assetId) {
      query.asset = assetId;
    }

    const maintenanceRecords = await MaintenanceRecord.find(query)
      .populate('asset', 'name assetNumber category')
      .populate('performedBy', 'firstName lastName');

    const totalCost = maintenanceRecords.reduce((sum, record) => sum + (record.totalCost || 0), 0);
    const totalLaborHours = maintenanceRecords.reduce((sum, record) => sum + (record.laborHours || 0), 0);

    // Cost by asset
    const costByAsset = maintenanceRecords.reduce((acc, record) => {
      const assetId = record.asset._id.toString();
      if (!acc[assetId]) {
        acc[assetId] = {
          asset: record.asset,
          count: 0,
          totalCost: 0,
          totalHours: 0
        };
      }
      acc[assetId].count++;
      acc[assetId].totalCost += record.totalCost || 0;
      acc[assetId].totalHours += record.laborHours || 0;
      return acc;
    }, {});

    res.json({
      summary: {
        totalRecords: maintenanceRecords.length,
        totalCost,
        totalLaborHours,
        averageCostPerRecord: totalCost / maintenanceRecords.length || 0
      },
      costByAsset: Object.values(costByAsset),
      records: maintenanceRecords
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/reports/asset-status
// @desc    Get asset status report
// @access  Private
router.get('/asset-status', auth, async (req, res) => {
  try {
    const { category } = req.query;
    const query = {};

    if (category) {
      query.category = category;
    }

    const assets = await Asset.find(query).populate('createdBy', 'firstName lastName');

    const statusBreakdown = await Asset.aggregate([
      ...(category ? [{ $match: { category } }] : []),
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const categoryBreakdown = await Asset.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Assets needing maintenance - find assets with upcoming or overdue maintenance
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const upcomingMaintenanceRecords = await MaintenanceRecord.find({
      status: { $in: ['scheduled', 'in_progress'] },
      dueDate: { $lte: thirtyDaysFromNow }
    })
      .populate('asset', 'name assetNumber')
      .sort({ dueDate: 1 })
      .limit(10);

    res.json({
      summary: {
        totalAssets: assets.length,
        statusBreakdown,
        categoryBreakdown
      },
      needingMaintenance: upcomingMaintenanceRecords,
      assets
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/reports/work-order-summary
// @desc    Get work order summary report
// @access  Private
router.get('/work-order-summary', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const workOrders = await WorkOrder.find(query)
      .populate('asset', 'name assetNumber')
      .populate('requestedBy', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName');

    const statusBreakdown = await WorkOrder.aggregate([
      ...(startDate && endDate ? [{
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      }] : []),
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const priorityBreakdown = await WorkOrder.aggregate([
      ...(startDate && endDate ? [{
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      }] : []),
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalEstimatedCost = workOrders.reduce((sum, wo) => sum + (wo.estimatedCost || 0), 0);
    const totalActualCost = workOrders.reduce((sum, wo) => sum + (wo.actualCost || 0), 0);

    res.json({
      summary: {
        totalWorkOrders: workOrders.length,
        totalEstimatedCost,
        totalActualCost,
        statusBreakdown,
        priorityBreakdown
      },
      workOrders
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
