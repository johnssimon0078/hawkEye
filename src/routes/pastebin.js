const express = require('express');
const { pastebinMonitoringService } = require('../services/pastebinMonitoringService');
const logger = require('../config/logger');

const router = express.Router();

// @route   POST /api/pastebin/scan
// @desc    Manually trigger pastebin scan
// @access  Private
router.post('/scan', async (req, res) => {
  try {
    logger.info(`Manual pastebin scan triggered by user ${req.user.email}`);

    const results = await pastebinMonitoringService.scanForUser(req.user);

    res.json({
      success: true,
      message: 'Pastebin scan completed successfully',
      data: results
    });

  } catch (error) {
    logger.error('Pastebin scan error:', error);
    res.status(500).json({
      success: false,
      message: 'Pastebin scan failed'
    });
  }
});

// @route   GET /api/pastebin/findings
// @desc    Get pastebin findings
// @access  Private
router.get('/findings', async (req, res) => {
  try {
    const { page = 1, limit = 10, source, riskLevel } = req.query;

    // This would typically query a findings collection
    // For now, return empty results
    res.json({
      success: true,
      data: {
        findings: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limit
        }
      }
    });

  } catch (error) {
    logger.error('Get pastebin findings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/pastebin/stats
// @desc    Get pastebin monitoring statistics
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    // This would typically aggregate data from findings
    // For now, return mock data
    res.json({
      success: true,
      data: {
        totalFindings: 0,
        highRiskFindings: 0,
        criticalFindings: 0,
        sources: [
          { name: 'pastebin.com', findings: 0 },
          { name: 'ghostbin.co', findings: 0 },
          { name: 'rentry.co', findings: 0 },
          { name: 'paste.ee', findings: 0 },
          { name: 'paste2.org', findings: 0 }
        ]
      }
    });

  } catch (error) {
    logger.error('Get pastebin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 