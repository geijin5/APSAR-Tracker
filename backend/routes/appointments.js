const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const { auth, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// @route   GET /api/appointments
// @desc    Get all appointments (with filters)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      type, 
      status, 
      userId,
      limit = 50,
      offset = 0
    } = req.query;

    // Build filter object
    let filter = {};

    // Date range filter
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) {
        filter.startDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.startDate.$lte = new Date(endDate);
      }
    }

    // Type filter
    if (type) {
      filter.type = type;
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // User filter (for attendees or created by)
    if (userId) {
      filter.$or = [
        { createdBy: userId },
        { 'attendees.user': userId }
      ];
    }

    const appointments = await Appointment.find(filter)
      .populate('createdBy', 'firstName lastName username')
      .populate('attendees.user', 'firstName lastName username')
      .populate('relatedAsset', 'name assetNumber')
      .populate('relatedWorkOrder', 'title')
      .sort({ startDate: 1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET /api/appointments/:id
// @desc    Get appointment by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('createdBy', 'firstName lastName username')
      .populate('attendees.user', 'firstName lastName username')
      .populate('relatedAsset', 'name assetNumber')
      .populate('relatedWorkOrder', 'title');

    if (!appointment) {
      return res.status(404).json({ msg: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Appointment not found' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST /api/appointments
// @desc    Create new appointment
// @access  Private - all authenticated users
router.post('/', [
  auth,
  body('title').notEmpty().trim().withMessage('Title is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  body('type').optional().isIn(['meeting', 'training', 'inspection', 'maintenance', 'event', 'other']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('status').optional().isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      startDate,
      endDate,
      allDay,
      location,
      type,
      priority,
      status,
      attendees,
      reminders,
      relatedAsset,
      relatedWorkOrder,
      isRecurring,
      recurringPattern,
      tags
    } = req.body;

    // Validate date range (skip for all-day appointments without endDate)
    if (endDate && !allDay && new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ msg: 'End date must be after start date' });
    }
    
    // For all-day appointments without endDate, set endDate to end of startDate
    let finalEndDate = endDate;
    if (allDay && !endDate) {
      const startDateObj = new Date(startDate);
      finalEndDate = new Date(startDateObj);
      finalEndDate.setHours(23, 59, 59, 999); // End of the same day
    } else if (endDate) {
      finalEndDate = endDate;
    } else {
      // If no endDate provided and not all-day, default to 1 hour after start
      const startDateObj = new Date(startDate);
      finalEndDate = new Date(startDateObj.getTime() + 60 * 60 * 1000);
    }

    const appointment = new Appointment({
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(finalEndDate),
      allDay: allDay || false,
      location,
      type: type || 'meeting',
      priority: priority || 'medium',
      status: status || 'scheduled',
      attendees: attendees || [],
      reminders: reminders || [{ type: 'system', minutes: 15 }],
      relatedAsset,
      relatedWorkOrder,
      isRecurring: isRecurring || false,
      recurringPattern,
      tags: tags || [],
      createdBy: req.user.id
    });

    await appointment.save();

    // Populate the response
    await appointment.populate([
      { path: 'createdBy', select: 'firstName lastName username' },
      { path: 'attendees.user', select: 'firstName lastName username' },
      { path: 'relatedAsset', select: 'name assetNumber' },
      { path: 'relatedWorkOrder', select: 'title' }
    ]);

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   PUT /api/appointments/:id
// @desc    Update appointment
// @access  Private - Admin, Operator, Technician, or Creator
router.put('/:id', [
  auth,
  body('title').optional().notEmpty().trim(),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('type').optional().isIn(['meeting', 'training', 'inspection', 'maintenance', 'event', 'other']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('status').optional().isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ msg: 'Appointment not found' });
    }

    // Check permissions
    const canEdit = req.user.role === 'admin' || 
                   req.user.role === 'operator' || 
                   req.user.role === 'technician' ||
                   appointment.createdBy.toString() === req.user.id;

    if (!canEdit) {
      return res.status(403).json({ msg: 'Not authorized to update this appointment' });
    }

    const {
      title,
      description,
      startDate,
      endDate,
      allDay,
      location,
      type,
      priority,
      status,
      attendees,
      reminders,
      relatedAsset,
      relatedWorkOrder,
      isRecurring,
      recurringPattern,
      tags
    } = req.body;

    // Validate date range if both dates are provided
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ msg: 'End date must be after start date' });
    }

    // Update appointment
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (allDay !== undefined) updateData.allDay = allDay;
    if (location !== undefined) updateData.location = location;
    if (type !== undefined) updateData.type = type;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (attendees !== undefined) updateData.attendees = attendees;
    if (reminders !== undefined) updateData.reminders = reminders;
    if (relatedAsset !== undefined) updateData.relatedAsset = relatedAsset;
    if (relatedWorkOrder !== undefined) updateData.relatedWorkOrder = relatedWorkOrder;
    if (isRecurring !== undefined) updateData.isRecurring = isRecurring;
    if (recurringPattern !== undefined) updateData.recurringPattern = recurringPattern;
    if (tags !== undefined) updateData.tags = tags;

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'createdBy', select: 'firstName lastName username' },
      { path: 'attendees.user', select: 'firstName lastName username' },
      { path: 'relatedAsset', select: 'name assetNumber' },
      { path: 'relatedWorkOrder', select: 'title' }
    ]);

    res.json(updatedAppointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Appointment not found' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   DELETE /api/appointments/:id
// @desc    Delete appointment
// @access  Private - Admin, Operator, or Creator
router.delete('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ msg: 'Appointment not found' });
    }

    // Check permissions
    const canDelete = req.user.role === 'admin' || 
                     req.user.role === 'operator' ||
                     appointment.createdBy.toString() === req.user.id;

    if (!canDelete) {
      return res.status(403).json({ msg: 'Not authorized to delete this appointment' });
    }

    await Appointment.findByIdAndDelete(req.params.id);

    res.json({ msg: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Appointment not found' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET /api/appointments/calendar/:year/:month
// @desc    Get appointments for calendar view
// @access  Private
router.get('/calendar/:year/:month', auth, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month) - 1; // JavaScript months are 0-indexed

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // Last day of the month

    const appointments = await Appointment.find({
      $or: [
        { 
          startDate: { 
            $gte: startDate, 
            $lte: endDate 
          } 
        },
        { 
          endDate: { 
            $gte: startDate, 
            $lte: endDate 
          } 
        },
        {
          $and: [
            { startDate: { $lt: startDate } },
            { endDate: { $gt: endDate } }
          ]
        }
      ]
    })
    .populate('createdBy', 'firstName lastName username')
    .populate('relatedAsset', 'name assetNumber')
    .sort({ startDate: 1 });

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching calendar appointments:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
