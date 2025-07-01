const express = require('express');
const { passwordStoreMonitoringService } = require('../services/passwordStoreMonitoringService');
const logger = require('../config/logger');

const router = express.Router();

// @route   POST /api/password-store/scan
// @desc    Manually trigger password store scan
// @access  Private
router.post('/scan', async (req, res) => {
  try {
    logger.info(`Manual password store scan triggered by user ${req.user.email}`);

    const results = await passwordStoreMonitoringService.scanForUser(req.user);

    res.json({
      success: true,
      message: 'Password store scan completed successfully',
      data: results
    });

  } catch (error) {
    logger.error('Password store scan error:', error);
    res.status(500).json({
      success: false,
      message: 'Password store scan failed'
    });
  }
});

// @route   GET /api/password-store/breaches
// @desc    Get password breach data
// @access  Private
router.get('/breaches', async (req, res) => {
  try {
    const { page = 1, limit = 10, source, riskLevel } = req.query;

    // This would typically query a breaches collection
    // For now, return empty results
    res.json({
      success: true,
      data: {
        breaches: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limit
        }
      }
    });

  } catch (error) {
    logger.error('Get password breaches error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/password-store/stats
// @desc    Get password store monitoring statistics
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    // This would typically aggregate data from breaches
    // For now, return mock data
    res.json({
      success: true,
      data: {
        totalBreaches: 0,
        highRiskBreaches: 0,
        criticalBreaches: 0,
        sources: [
          { name: 'haveibeenpwned', breaches: 0 },
          { name: 'dehashed', breaches: 0 },
          { name: 'leakcheck', breaches: 0 },
          { name: 'intelx', breaches: 0 },
          { name: 'snusbase', breaches: 0 }
        ]
      }
    });

  } catch (error) {
    logger.error('Get password store stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 