const express = require('express');
const Joi = require('joi');
const Domain = require('../models/Domain');
const { domainMonitoringService } = require('../services/domainMonitoringService');
const logger = require('../config/logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const addDomainSchema = Joi.object({
  domain: Joi.string().required().trim(),
  monitoringType: Joi.string().valid('typosquatting', 'brand_abuse', 'phishing', 'malware', 'all').default('all'),
  tags: Joi.array().items(Joi.string()).optional(),
  notes: Joi.string().optional()
});

const updateDomainSchema = Joi.object({
  monitoringType: Joi.string().valid('typosquatting', 'brand_abuse', 'phishing', 'malware', 'all').optional(),
  status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  notes: Joi.string().optional()
});

// @route   POST /api/domains
// @desc    Add a new domain for monitoring
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { error, value } = addDomainSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { domain, monitoringType, tags, notes } = value;

    // Check if domain already exists for this user
    const existingDomain = await Domain.findOne({
      domain: domain.toLowerCase(),
      userId: req.user._id
    });

    if (existingDomain) {
      return res.status(400).json({
        success: false,
        message: 'Domain is already being monitored'
      });
    }

    // Create new domain
    const newDomain = new Domain({
      domain: domain.toLowerCase(),
      userId: req.user._id,
      monitoringType,
      tags: tags || [],
      notes
    });

    await newDomain.save();

    // Start initial domain analysis
    try {
      await domainMonitoringService.analyzeDomain(newDomain);
    } catch (analysisError) {
      logger.error(`Domain analysis failed for ${domain}:`, analysisError);
    }

    logger.info(`New domain added for monitoring: ${domain} by user ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Domain added for monitoring successfully',
      data: { domain: newDomain }
    });

  } catch (error) {
    logger.error('Add domain error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/domains
// @desc    Get all domains for the user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      riskLevel,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { userId: req.user._id };

    // Apply filters
    if (status) query.status = status;
    if (riskLevel) query.riskLevel = riskLevel;
    if (search) {
      query.$or = [
        { domain: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const domains = await Domain.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('alerts', 'type severity createdAt isRead')
      .exec();

    const total = await Domain.countDocuments(query);

    res.json({
      success: true,
      data: {
        domains,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });

  } catch (error) {
    logger.error('Get domains error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/domains/:id
// @desc    Get specific domain details
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const domain = await Domain.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('alerts');

    if (!domain) {
      return res.status(404).json({
        success: false,
        message: 'Domain not found'
      });
    }

    res.json({
      success: true,
      data: { domain }
    });

  } catch (error) {
    logger.error('Get domain error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   PUT /api/domains/:id
// @desc    Update domain monitoring settings
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const { error, value } = updateDomainSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const domain = await Domain.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!domain) {
      return res.status(404).json({
        success: false,
        message: 'Domain not found'
      });
    }

    // Update fields
    Object.keys(value).forEach(key => {
      domain[key] = value[key];
    });

    await domain.save();

    logger.info(`Domain updated: ${domain.domain} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Domain updated successfully',
      data: { domain }
    });

  } catch (error) {
    logger.error('Update domain error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   DELETE /api/domains/:id
// @desc    Remove domain from monitoring
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const domain = await Domain.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!domain) {
      return res.status(404).json({
        success: false,
        message: 'Domain not found'
      });
    }

    await Domain.findByIdAndDelete(req.params.id);

    logger.info(`Domain removed from monitoring: ${domain.domain} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Domain removed from monitoring successfully'
    });

  } catch (error) {
    logger.error('Delete domain error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   POST /api/domains/:id/analyze
// @desc    Manually trigger domain analysis
// @access  Private
router.post('/:id/analyze', async (req, res) => {
  try {
    const domain = await Domain.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!domain) {
      return res.status(404).json({
        success: false,
        message: 'Domain not found'
      });
    }

    // Trigger analysis
    await domainMonitoringService.analyzeDomain(domain);

    logger.info(`Manual domain analysis triggered: ${domain.domain} by user ${req.user.email}`);

    res.json({
      success: true,
      message: 'Domain analysis completed successfully'
    });

  } catch (error) {
    logger.error('Domain analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Domain analysis failed'
    });
  }
});

// @route   POST /api/domains/:id/alerts/read
// @desc    Mark domain alerts as read
// @access  Private
router.post('/:id/alerts/read', async (req, res) => {
  try {
    const domain = await Domain.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!domain) {
      return res.status(404).json({
        success: false,
        message: 'Domain not found'
      });
    }

    await domain.markAlertsAsRead();

    res.json({
      success: true,
      message: 'Alerts marked as read successfully'
    });

  } catch (error) {
    logger.error('Mark alerts as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @route   GET /api/domains/stats/overview
// @desc    Get domain monitoring statistics
// @access  Private
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Domain.aggregate([
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
          },
          totalAlerts: { $sum: { $size: '$alerts' } },
          unreadAlerts: {
            $sum: {
              $size: {
                $filter: {
                  input: '$alerts',
                  cond: { $eq: ['$$this.isRead', false] }
                }
              }
            }
          }
        }
      }
    ]);

    const riskLevelStats = await Domain.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$riskLevel',
          count: { $sum: 1 }
        }
      }
    ]);

    const monitoringTypeStats = await Domain.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$monitoringType',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalDomains: 0,
          activeDomains: 0,
          highRiskDomains: 0,
          criticalRiskDomains: 0,
          totalAlerts: 0,
          unreadAlerts: 0
        },
        riskLevels: riskLevelStats,
        monitoringTypes: monitoringTypeStats
      }
    });

  } catch (error) {
    logger.error('Get domain stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 