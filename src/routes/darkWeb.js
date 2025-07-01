const express = require('express');
const { darkWebMonitoringService } = require('../services/darkWebMonitoringService');
const logger = require('../config/logger');

const router = express.Router();

// @route   POST /api/dark-web/scan
// @desc    Manually trigger dark web scan
// @access  Private
router.post('/scan', async (req, res) => {
  try {
    logger.info(`Manual dark web scan triggered by user ${req.user.email}`);

    const results = await darkWebMonitoringService.scanForUser(req.user);

    res.json({
      success: true,
      message: 'Dark web scan completed successfully',
      data: results
    });

  } catch (error) {
    logger.error('Dark web scan error:', error);
    res.status(500).json({
      success: false,
      message: 'Dark web scan failed'
    });
  }
});

// @route   GET /api/dark-web/history
// @desc    Get dark web scan history
// @access  Private
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // This would typically query a scan history collection
    // For now, return empty results
    res.json({
      success: true,
      data: {
        scans: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limit
        }
      }
    });

  } catch (error) {
    logger.error('Get dark web history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/dark-web/stats
// @desc    Get dark web monitoring statistics
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    // This would typically aggregate data from scan results
    // For now, return mock data
    res.json({
      success: true,
      data: {
        totalScans: 0,
        totalFindings: 0,
        highRiskFindings: 0,
        criticalFindings: 0,
        lastScan: null,
        sources: []
      }
    });

  } catch (error) {
    logger.error('Get dark web stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 