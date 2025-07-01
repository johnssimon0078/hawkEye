const express = require('express');
const router = express.Router();
const Domain = require('../models/Domain');
const Alert = require('../models/Alert');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const moment = require('moment');
const Joi = require('joi');
const logger = require('../config/logger');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Get comprehensive security report
router.get('/security', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, domainId } = req.query;
    
    const query = { userId };
    if (domainId) query.domainId = domainId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const alerts = await Alert.find(query).populate('domainId');
    const domains = await Domain.find({ userId });

    // Calculate statistics
    const totalAlerts = alerts.length;
    const highRiskAlerts = alerts.filter(alert => alert.severity === 'high').length;
    const mediumRiskAlerts = alerts.filter(alert => alert.severity === 'medium').length;
    const lowRiskAlerts = alerts.filter(alert => alert.severity === 'low').length;

    const alertTypes = {
      domain: alerts.filter(alert => alert.type === 'domain').length,
      darkWeb: alerts.filter(alert => alert.type === 'dark_web').length,
      socialMedia: alerts.filter(alert => alert.type === 'social_media').length,
      pastebin: alerts.filter(alert => alert.type === 'pastebin').length,
      passwordStore: alerts.filter(alert => alert.type === 'password_store').length
    };

    const monthlyTrends = {};
    alerts.forEach(alert => {
      const month = moment(alert.createdAt).format('YYYY-MM');
      monthlyTrends[month] = (monthlyTrends[month] || 0) + 1;
    });

    const report = {
      summary: {
        totalAlerts,
        highRiskAlerts,
        mediumRiskAlerts,
        lowRiskAlerts,
        totalDomains: domains.length,
        period: {
          start: startDate || moment().subtract(30, 'days').format('YYYY-MM-DD'),
          end: endDate || moment().format('YYYY-MM-DD')
        }
      },
      alertTypes,
      monthlyTrends,
      topThreats: alerts
        .filter(alert => alert.severity === 'high')
        .slice(0, 10)
        .map(alert => ({
          id: alert._id,
          title: alert.title,
          severity: alert.severity,
          type: alert.type,
          createdAt: alert.createdAt,
          domain: alert.domainId?.name || 'N/A'
        })),
      domainSecurity: domains.map(domain => ({
        id: domain._id,
        name: domain.name,
        riskScore: domain.riskScore,
        lastScan: domain.lastScan,
        totalAlerts: alerts.filter(alert => alert.domainId?.toString() === domain._id.toString()).length
      }))
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate security report',
      error: error.message
    });
  }
});

// Get domain monitoring report
router.get('/domains', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { domainId, startDate, endDate } = req.query;

    const query = { userId };
    if (domainId) query._id = domainId;

    const domains = await Domain.find(query);
    const domainIds = domains.map(d => d._id);

    const alertQuery = { domainId: { $in: domainIds } };
    if (startDate || endDate) {
      alertQuery.createdAt = {};
      if (startDate) alertQuery.createdAt.$gte = new Date(startDate);
      if (endDate) alertQuery.createdAt.$lte = new Date(endDate);
    }

    const alerts = await Alert.find(alertQuery);

    const domainReports = domains.map(domain => {
      const domainAlerts = alerts.filter(alert => 
        alert.domainId?.toString() === domain._id.toString()
      );

      return {
        id: domain._id,
        name: domain.name,
        status: domain.status,
        riskScore: domain.riskScore,
        lastScan: domain.lastScan,
        nextScan: domain.nextScan,
        totalAlerts: domainAlerts.length,
        alertsBySeverity: {
          high: domainAlerts.filter(a => a.severity === 'high').length,
          medium: domainAlerts.filter(a => a.severity === 'medium').length,
          low: domainAlerts.filter(a => a.severity === 'low').length
        },
        alertsByType: {
          domain: domainAlerts.filter(a => a.type === 'domain').length,
          darkWeb: domainAlerts.filter(a => a.type === 'dark_web').length,
          socialMedia: domainAlerts.filter(a => a.type === 'social_media').length,
          pastebin: domainAlerts.filter(a => a.type === 'pastebin').length,
          passwordStore: domainAlerts.filter(a => a.type === 'password_store').length
        },
        recentAlerts: domainAlerts
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
          .map(alert => ({
            id: alert._id,
            title: alert.title,
            severity: alert.severity,
            type: alert.type,
            createdAt: alert.createdAt
          }))
      };
    });

    res.json({
      success: true,
      data: domainReports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate domain report',
      error: error.message
    });
  }
});

// Get threat intelligence report
router.get('/threats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const query = { userId };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const alerts = await Alert.find(query).populate('domainId');

    // Group threats by source
    const threatsBySource = {
      darkWeb: alerts.filter(alert => alert.type === 'dark_web'),
      socialMedia: alerts.filter(alert => alert.type === 'social_media'),
      pastebin: alerts.filter(alert => alert.type === 'pastebin'),
      passwordStore: alerts.filter(alert => alert.type === 'password_store'),
      domain: alerts.filter(alert => alert.type === 'domain')
    };

    // Calculate threat trends
    const threatTrends = {};
    Object.keys(threatsBySource).forEach(source => {
      const sourceAlerts = threatsBySource[source];
      const trends = {};
      sourceAlerts.forEach(alert => {
        const date = moment(alert.createdAt).format('YYYY-MM-DD');
        trends[date] = (trends[date] || 0) + 1;
      });
      threatTrends[source] = trends;
    });

    // Get top threat sources
    const topThreatSources = Object.keys(threatsBySource)
      .map(source => ({
        source,
        count: threatsBySource[source].length,
        highRisk: threatsBySource[source].filter(a => a.severity === 'high').length
      }))
      .sort((a, b) => b.count - a.count);

    // Get emerging threats (alerts from last 7 days)
    const sevenDaysAgo = moment().subtract(7, 'days').toDate();
    const emergingThreats = alerts
      .filter(alert => alert.createdAt >= sevenDaysAgo)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);

    const report = {
      summary: {
        totalThreats: alerts.length,
        threatsBySource: Object.keys(threatsBySource).reduce((acc, source) => {
          acc[source] = threatsBySource[source].length;
          return acc;
        }, {}),
        highRiskThreats: alerts.filter(alert => alert.severity === 'high').length,
        period: {
          start: startDate || moment().subtract(30, 'days').format('YYYY-MM-DD'),
          end: endDate || moment().format('YYYY-MM-DD')
        }
      },
      threatTrends,
      topThreatSources,
      emergingThreats: emergingThreats.map(alert => ({
        id: alert._id,
        title: alert.title,
        severity: alert.severity,
        type: alert.type,
        source: alert.source,
        createdAt: alert.createdAt,
        domain: alert.domainId?.name || 'N/A'
      })),
      threatDistribution: {
        bySeverity: {
          high: alerts.filter(a => a.severity === 'high').length,
          medium: alerts.filter(a => a.severity === 'medium').length,
          low: alerts.filter(a => a.severity === 'low').length
        },
        byType: {
          domain: alerts.filter(a => a.type === 'domain').length,
          darkWeb: alerts.filter(a => a.type === 'dark_web').length,
          socialMedia: alerts.filter(a => a.type === 'social_media').length,
          pastebin: alerts.filter(a => a.type === 'pastebin').length,
          passwordStore: alerts.filter(a => a.type === 'password_store').length
        }
      }
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate threat intelligence report',
      error: error.message
    });
  }
});

// Get compliance report
router.get('/compliance', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const domains = await Domain.find({ userId });
    const domainIds = domains.map(d => d._id);

    const query = { domainId: { $in: domainIds } };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const alerts = await Alert.find(query);

    // Compliance metrics
    const complianceMetrics = {
      totalDomains: domains.length,
      monitoredDomains: domains.filter(d => d.status === 'active').length,
      domainsWithIssues: domains.filter(d => d.riskScore > 50).length,
      totalIncidents: alerts.length,
      resolvedIncidents: alerts.filter(a => a.status === 'resolved').length,
      openIncidents: alerts.filter(a => a.status === 'open').length,
      averageResponseTime: calculateAverageResponseTime(alerts),
      complianceScore: calculateComplianceScore(domains, alerts)
    };

    // Domain compliance status
    const domainCompliance = domains.map(domain => {
      const domainAlerts = alerts.filter(alert => 
        alert.domainId?.toString() === domain._id.toString()
      );
      
      return {
        id: domain._id,
        name: domain.name,
        status: domain.status,
        riskScore: domain.riskScore,
        complianceStatus: getComplianceStatus(domain.riskScore),
        lastScan: domain.lastScan,
        totalIncidents: domainAlerts.length,
        openIncidents: domainAlerts.filter(a => a.status === 'open').length,
        resolvedIncidents: domainAlerts.filter(a => a.status === 'resolved').length
      };
    });

    const report = {
      summary: complianceMetrics,
      domainCompliance,
      recommendations: generateComplianceRecommendations(domains, alerts),
      period: {
        start: startDate || moment().subtract(30, 'days').format('YYYY-MM-DD'),
        end: endDate || moment().format('YYYY-MM-DD')
      }
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate compliance report',
      error: error.message
    });
  }
});

// Export report as PDF/CSV
router.post('/export', authMiddleware, async (req, res) => {
  try {
    const { reportType, format, filters } = req.body;
    const userId = req.user.id;

    // This would typically integrate with a PDF/CSV generation service
    // For now, we'll return a placeholder response
    const exportData = {
      reportType,
      format,
      filters,
      userId,
      generatedAt: new Date(),
      downloadUrl: `/api/reports/download/${reportType}-${Date.now()}.${format}`
    };

    res.json({
      success: true,
      message: 'Report export initiated',
      data: exportData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export report',
      error: error.message
    });
  }
});

// Helper functions
function calculateAverageResponseTime(alerts) {
  const resolvedAlerts = alerts.filter(a => a.resolvedAt && a.createdAt);
  if (resolvedAlerts.length === 0) return 0;
  
  const totalTime = resolvedAlerts.reduce((sum, alert) => {
    return sum + (new Date(alert.resolvedAt) - new Date(alert.createdAt));
  }, 0);
  
  return Math.round(totalTime / resolvedAlerts.length / (1000 * 60 * 60)); // hours
}

function calculateComplianceScore(domains, alerts) {
  if (domains.length === 0) return 100;
  
  const domainScores = domains.map(domain => {
    const domainAlerts = alerts.filter(alert => 
      alert.domainId?.toString() === domain._id.toString()
    );
    const highRiskAlerts = domainAlerts.filter(a => a.severity === 'high').length;
    const baseScore = Math.max(0, 100 - (domain.riskScore / 10));
    const alertPenalty = highRiskAlerts * 5;
    return Math.max(0, baseScore - alertPenalty);
  });
  
  return Math.round(domainScores.reduce((sum, score) => sum + score, 0) / domains.length);
}

function getComplianceStatus(riskScore) {
  if (riskScore <= 20) return 'compliant';
  if (riskScore <= 50) return 'warning';
  return 'non-compliant';
}

function generateComplianceRecommendations(domains, alerts) {
  const recommendations = [];
  
  const highRiskDomains = domains.filter(d => d.riskScore > 70);
  if (highRiskDomains.length > 0) {
    recommendations.push({
      type: 'high_risk_domains',
      priority: 'high',
      message: `${highRiskDomains.length} domains have high risk scores. Consider immediate action.`,
      domains: highRiskDomains.map(d => d.name)
    });
  }
  
  const openHighRiskAlerts = alerts.filter(a => a.severity === 'high' && a.status === 'open');
  if (openHighRiskAlerts.length > 0) {
    recommendations.push({
      type: 'open_high_risk_alerts',
      priority: 'high',
      message: `${openHighRiskAlerts.length} high-risk alerts are still open. Prioritize resolution.`
    });
  }
  
  const inactiveDomains = domains.filter(d => d.status !== 'active');
  if (inactiveDomains.length > 0) {
    recommendations.push({
      type: 'inactive_monitoring',
      priority: 'medium',
      message: `${inactiveDomains.length} domains are not actively monitored. Enable monitoring for better protection.`,
      domains: inactiveDomains.map(d => d.name)
    });
  }
  
  return recommendations;
}

module.exports = router; 