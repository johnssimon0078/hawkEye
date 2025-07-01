const express = require('express');
const Joi = require('joi');
const Alert = require('../models/Alert');
const { getAlertService } = require('../services/alertService');
const logger = require('../config/logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const updateAlertSchema = Joi.object({
  status: Joi.string().valid('new', 'acknowledged', 'investigating', 'resolved', 'false_positive').optional(),
  assignedTo: Joi.string().optional(),
  notes: Joi.string().optional()
});

// @route   GET /api/alerts
// @desc    Get all alerts for the user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      severity,
      type,
      isRead,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { userId: req.user._id };

    // Apply filters
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (type) query.type = type;
    if (isRead !== undefined) query.isRead = isRead === 'true';
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { source: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const alerts = await Alert.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('assignedTo', 'firstName lastName email')
      .exec();

    const total = await Alert.countDocuments(query);

    res.json({
      success: true,
      data: {
        alerts,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });

  } catch (error) {
    logger.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/alerts/:id
// @desc    Get specific alert details
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('assignedTo', 'firstName lastName email')
      .populate('notes.author', 'firstName lastName email');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.json({
      success: true,
      data: { alert }
    });

  } catch (error) {
    logger.error('Get alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   PUT /api/alerts/:id
// @desc    Update alert
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { error, value } = updateAlertSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const alert = await Alert.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Update fields
    if (value.status) {
      await alert.updateStatus(value.status, req.user._id);
    }

    if (value.assignedTo) {
      alert.assignedTo = value.assignedTo;
    }

    if (value.notes) {
      await alert.addNote(value.notes, req.user._id);
    }

    await alert.save();

    logger.info(`Alert updated: ${alert._id} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Alert updated successfully',
      data: { alert }
    });

  } catch (error) {
    logger.error('Update alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/alerts/:id/read
// @desc    Mark alert as read
// @access  Private
router.post('/:id/read', async (req, res) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    await alert.markAsRead();

    res.json({
      success: true,
      message: 'Alert marked as read successfully'
    });

  } catch (error) {
    logger.error('Mark alert as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/alerts/:id/notes
// @desc    Add note to alert
// @access  Private
router.post('/:id/notes', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    const alert = await Alert.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    await alert.addNote(content, req.user._id);

    logger.info(`Note added to alert: ${alert._id} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Note added successfully'
    });

  } catch (error) {
    logger.error('Add note error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/alerts/bulk-read
// @desc    Mark multiple alerts as read
// @access  Private
router.post('/bulk-read', async (req, res) => {
  try {
    const { alertIds } = req.body;

    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Alert IDs array is required'
      });
    }

    const result = await Alert.updateMany(
      {
        _id: { $in: alertIds },
        userId: req.user._id
      },
      {
        $set: { isRead: true }
      }
    );

    logger.info(`Bulk marked ${result.modifiedCount} alerts as read by user ${req.user.email}`);

    res.json({
      success: true,
      message: `${result.modifiedCount} alerts marked as read successfully`
    });

  } catch (error) {
    logger.error('Bulk mark alerts as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/alerts/stats/overview
// @desc    Get alert statistics
// @access  Private
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await getAlertService().getAlertStats(req.user._id);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Get alert stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/alerts/stats/recent
// @desc    Get recent alert activity
// @access  Private
router.get('/stats/recent', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const recentAlerts = await Alert.aggregate([
      {
        $match: {
          userId: req.user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            severity: '$severity'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          severities: {
            $push: {
              severity: '$_id.severity',
              count: '$count'
            }
          },
          totalCount: { $sum: '$count' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        recentAlerts,
        period: `${days} days`
      }
    });

  } catch (error) {
    logger.error('Get recent alert stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 