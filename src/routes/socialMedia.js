const express = require('express');
const { socialMediaMonitoringService } = require('../services/socialMediaMonitoringService');
const logger = require('../config/logger');

const router = express.Router();

// @route   POST /api/social-media/scan
// @desc    Manually trigger social media scan
// @access  Private
router.post('/scan', async (req, res) => {
  try {
    logger.info(`Manual social media scan triggered by user ${req.user.email}`);

    const results = await socialMediaMonitoringService.scanForUser(req.user);

    res.json({
      success: true,
      message: 'Social media scan completed successfully',
      data: results
    });

  } catch (error) {
    logger.error('Social media scan error:', error);
    res.status(500).json({
      success: false,
      message: 'Social media scan failed'
    });
  }
});

// @route   GET /api/social-media/mentions
// @desc    Get social media mentions
// @access  Private
router.get('/mentions', async (req, res) => {
  try {
    const { page = 1, limit = 10, platform, sentiment } = req.query;

    // This would typically query a mentions collection
    // For now, return empty results
    res.json({
      success: true,
      data: {
        mentions: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limit
        }
      }
    });

  } catch (error) {
    logger.error('Get social media mentions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/social-media/stats
// @desc    Get social media monitoring statistics
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    // This would typically aggregate data from mentions
    // For now, return mock data
    res.json({
      success: true,
      data: {
        totalMentions: 0,
        positiveMentions: 0,
        negativeMentions: 0,
        neutralMentions: 0,
        platforms: [
          { name: 'twitter', mentions: 0 },
          { name: 'linkedin', mentions: 0 },
          { name: 'facebook', mentions: 0 },
          { name: 'instagram', mentions: 0 },
          { name: 'reddit', mentions: 0 }
        ]
      }
    });

  } catch (error) {
    logger.error('Get social media stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 