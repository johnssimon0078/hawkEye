const express = require('express');
const router = express.Router();
const Domain = require('../models/Domain');
const { domainMonitoringService } = require('../services/domainMonitoringService');
const { darkWebMonitoringService } = require('../services/darkWebMonitoringService');
const { socialMediaMonitoringService } = require('../services/socialMediaMonitoringService');
const { pastebinMonitoringService } = require('../services/pastebinMonitoringService');
const { passwordStoreMonitoringService } = require('../services/passwordStoreMonitoringService');
const { getAlertService } = require('../services/alertService');
const logger = require('../config/logger');

// Manual domain scan
router.post('/scan/domain', async (req, res) => {
    try {
        const { domainId } = req.body;
        const userId = req.user.userId;

        if (!domainId) {
            return res.status(400).json({
                success: false,
                message: 'Domain ID is required'
            });
        }

        // Find the domain
        const domain = await Domain.findOne({ _id: domainId, userId });
        if (!domain) {
            return res.status(404).json({
                success: false,
                message: 'Domain not found'
            });
        }

        logger.info(`Manual domain scan initiated for ${domain.domain} by user ${userId}`);

        // Perform domain monitoring
        const results = await domainMonitoringService.monitorDomain(domain.domain, userId);
        
        // Create alerts for any findings
        if (results.threats && results.threats.length > 0) {
            for (const threat of results.threats) {
                await getAlertService().createAlert({
                    userId,
                    type: 'domain_threat',
                    severity: threat.severity || 'medium',
                    title: `Domain Threat Detected: ${domain.domain}`,
                    message: threat.description,
                    metadata: {
                        domain: domain.domain,
                        threatType: threat.type,
                        details: threat
                    }
                });
            }
        }

        res.json({
            success: true,
            message: 'Domain scan completed successfully',
            data: {
                domain: domain.domain,
                results: results
            }
        });

    } catch (error) {
        logger.error('Error in manual domain scan:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Manual dark web scan
router.post('/scan/dark-web', async (req, res) => {
    try {
        const { domainId } = req.body;
        const userId = req.user.userId;

        if (!domainId) {
            return res.status(400).json({
                success: false,
                message: 'Domain ID is required'
            });
        }

        const domain = await Domain.findOne({ _id: domainId, userId });
        if (!domain) {
            return res.status(404).json({
                success: false,
                message: 'Domain not found'
            });
        }

        logger.info(`Manual dark web scan initiated for ${domain.domain} by user ${userId}`);

        const results = await darkWebMonitoringService.scanDomain(domain.domain, userId);

        res.json({
            success: true,
            message: 'Dark web scan completed successfully',
            data: {
                domain: domain.domain,
                results: results
            }
        });

    } catch (error) {
        logger.error('Error in manual dark web scan:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Manual social media scan
router.post('/scan/social-media', async (req, res) => {
    try {
        const { domainId } = req.body;
        const userId = req.user.userId;

        if (!domainId) {
            return res.status(400).json({
                success: false,
                message: 'Domain ID is required'
            });
        }

        const domain = await Domain.findOne({ _id: domainId, userId });
        if (!domain) {
            return res.status(404).json({
                success: false,
                message: 'Domain not found'
            });
        }

        logger.info(`Manual social media scan initiated for ${domain.domain} by user ${userId}`);

        const results = await socialMediaMonitoringService.scanDomain(domain.domain, userId);

        res.json({
            success: true,
            message: 'Social media scan completed successfully',
            data: {
                domain: domain.domain,
                results: results
            }
        });

    } catch (error) {
        logger.error('Error in manual social media scan:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Manual pastebin scan
router.post('/scan/pastebin', async (req, res) => {
    try {
        const { domainId } = req.body;
        const userId = req.user.userId;

        if (!domainId) {
            return res.status(400).json({
                success: false,
                message: 'Domain ID is required'
            });
        }

        const domain = await Domain.findOne({ _id: domainId, userId });
        if (!domain) {
            return res.status(404).json({
                success: false,
                message: 'Domain not found'
            });
        }

        logger.info(`Manual pastebin scan initiated for ${domain.domain} by user ${userId}`);

        const results = await pastebinMonitoringService.scanDomain(domain.domain, userId);

        res.json({
            success: true,
            message: 'Pastebin scan completed successfully',
            data: {
                domain: domain.domain,
                results: results
            }
        });

    } catch (error) {
        logger.error('Error in manual pastebin scan:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Manual password store scan
router.post('/scan/password-store', async (req, res) => {
    try {
        const { domainId } = req.body;
        const userId = req.user.userId;

        if (!domainId) {
            return res.status(400).json({
                success: false,
                message: 'Domain ID is required'
            });
        }

        const domain = await Domain.findOne({ _id: domainId, userId });
        if (!domain) {
            return res.status(404).json({
                success: false,
                message: 'Domain not found'
            });
        }

        logger.info(`Manual password store scan initiated for ${domain.domain} by user ${userId}`);

        const results = await passwordStoreMonitoringService.scanDomain(domain.domain, userId);

        res.json({
            success: true,
            message: 'Password store scan completed successfully',
            data: {
                domain: domain.domain,
                results: results
            }
        });

    } catch (error) {
        logger.error('Error in manual password store scan:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router; 