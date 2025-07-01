const express = require('express');
const User = require('../models/User');
const Domain = require('../models/Domain');
const Alert = require('../models/Alert');
const { getAlertService } = require('../services/alertService');
const logger = require('../config/logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview statistics
// @access  Private
router.get('/overview', async (req, res) => {
  try {
    // Get domain statistics
    const domainStats = await Domain.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: null,
          totalDomains: { $sum: 1 },
          activeDomains: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          highRiskDomains: {
            $sum: { $cond: [{ $eq: ['$riskLevel', 'high'] }, 1, 0] }
          },
          criticalRiskDomains: {
            $sum: { $cond: [{ $eq: ['$riskLevel', 'critical'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get alert statistics
    const alertStats = await getAlertService().getAlertStats(req.user._id);

    // Get recent activity
    const recentAlerts = await Alert.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title severity type createdAt');

    const recentDomains = await Domain.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('domain riskLevel status updatedAt');

    res.json({
      success: true,
      data: {
        domains: domainStats[0] || {
          totalDomains: 0,
          activeDomains: 0,
          highRiskDomains: 0,
          criticalRiskDomains: 0
        },
        alerts: alertStats.overview,
        recentActivity: {
          alerts: recentAlerts,
          domains: recentDomains
        }
      }
    });

  } catch (error) {
    logger.error('Get dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/dashboard/charts
// @desc    Get chart data for dashboard
// @access  Private
router.get('/charts', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Alert trends over time
    const alertTrends = await Alert.aggregate([
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

    // Domain risk distribution
    const domainRiskDistribution = await Domain.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$riskLevel',
          count: { $sum: 1 }
        }
      }
    ]);

    // Alert type distribution
    const alertTypeDistribution = await Alert.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        alertTrends,
        domainRiskDistribution,
        alertTypeDistribution
      }
    });

  } catch (error) {
    logger.error('Get dashboard charts error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/dashboard/activity
// @desc    Get recent activity feed
// @access  Private
router.get('/activity', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // Get recent alerts
    const recentAlerts = await Alert.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('title severity type createdAt source')
      .populate('assignedTo', 'firstName lastName');

    // Get domain changes (simplified - would need a separate activity log)
    const domainActivity = await Domain.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('domain riskLevel status updatedAt');

    const totalAlerts = await Alert.countDocuments({ userId: req.user._id });

    res.json({
      success: true,
      data: {
        alerts: recentAlerts,
        domainActivity,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalAlerts / limit),
          totalItems: totalAlerts,
          itemsPerPage: limit
        }
      }
    });

  } catch (error) {
    logger.error('Get dashboard activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/dashboard/quick-stats
// @desc    Get quick statistics for dashboard widgets
// @access  Private
router.get('/quick-stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's alerts
    const todayAlerts = await Alert.countDocuments({
      userId: req.user._id,
      createdAt: { $gte: today }
    });

    // Critical alerts today
    const criticalAlertsToday = await Alert.countDocuments({
      userId: req.user._id,
      severity: 'critical',
      createdAt: { $gte: today }
    });

    // Domains expiring soon (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringDomains = await Domain.countDocuments({
      userId: req.user._id,
      expirationDate: {
        $gte: new Date(),
        $lte: thirtyDaysFromNow
      }
    });

    // SSL certificates expiring soon (next 30 days)
    const expiringSSL = await Domain.countDocuments({
      userId: req.user._id,
      'sslCertificate.validTo': {
        $gte: new Date(),
        $lte: thirtyDaysFromNow
      }
    });

    res.json({
      success: true,
      data: {
        todayAlerts,
        criticalAlertsToday,
        expiringDomains,
        expiringSSL
      }
    });

  } catch (error) {
    logger.error('Get quick stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 