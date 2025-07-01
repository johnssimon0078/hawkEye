const cron = require('node-cron');
const { domainMonitoringService } = require('./domainMonitoringService');
const { darkWebMonitoringService } = require('./darkWebMonitoringService');
const { socialMediaMonitoringService } = require('./socialMediaMonitoringService');
const { pastebinMonitoringService } = require('./pastebinMonitoringService');
const { passwordStoreMonitoringService } = require('./passwordStoreMonitoringService');
const { getAlertService } = require('./alertService');
const Domain = require('../models/Domain');
const User = require('../models/User');
const logger = require('../config/logger');

class MonitoringService {
  constructor() {
    if (MonitoringService.instance) {
      return MonitoringService.instance;
    }
    
    this.isRunning = false;
    this.jobs = new Map();
    this.io = null;
    
    MonitoringService.instance = this;
  }

  async startMonitoringServices(io) {
    if (this.isRunning) {
      logger.warn('Monitoring services are already running');
      return;
    }

    this.io = io;
    this.isRunning = true;

    logger.info('Starting monitoring services...');

    // Start domain monitoring
    this.startDomainMonitoring();

    // Start dark web monitoring
    this.startDarkWebMonitoring();

    // Start social media monitoring
    this.startSocialMediaMonitoring();

    // Start pastebin monitoring
    this.startPastebinMonitoring();

    // Start password store monitoring
    this.startPasswordStoreMonitoring();

    // Start alert processing
    this.startAlertProcessing();

    logger.info('All monitoring services started successfully');
  }

  startDomainMonitoring() {
    // Stop existing job if running
    if (this.jobs.has('domain')) {
      this.jobs.get('domain').stop();
      this.jobs.delete('domain');
    }
    
    const interval = parseInt(process.env.DOMAIN_MONITORING_INTERVAL_HOURS) || 6;
    
    const job = cron.schedule(`0 */${interval} * * *`, async () => {
      try {
        logger.info('Starting scheduled domain monitoring...');
        await this.runDomainMonitoring();
        logger.info('Scheduled domain monitoring completed');
      } catch (error) {
        logger.error('Scheduled domain monitoring failed:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('domain', job);
    job.start();
    logger.info(`Domain monitoring scheduled every ${interval} hours`);
  }

  startDarkWebMonitoring() {
    // Stop existing job if running
    if (this.jobs.has('darkWeb')) {
      this.jobs.get('darkWeb').stop();
      this.jobs.delete('darkWeb');
    }
    
    const interval = parseInt(process.env.DARK_WEB_SCAN_INTERVAL_HOURS) || 2;
    
    const job = cron.schedule(`0 */${interval} * * *`, async () => {
      try {
        logger.info('Starting scheduled dark web monitoring...');
        await this.runDarkWebMonitoring();
        logger.info('Scheduled dark web monitoring completed');
      } catch (error) {
        logger.error('Scheduled dark web monitoring failed:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('darkWeb', job);
    job.start();
    logger.info(`Dark web monitoring scheduled every ${interval} hours`);
  }

  startSocialMediaMonitoring() {
    // Stop existing job if running
    if (this.jobs.has('socialMedia')) {
      this.jobs.get('socialMedia').stop();
      this.jobs.delete('socialMedia');
    }
    
    const interval = parseInt(process.env.SOCIAL_MEDIA_SCAN_INTERVAL_HOURS) || 1;
    
    const job = cron.schedule(`0 */${interval} * * *`, async () => {
      try {
        logger.info('Starting scheduled social media monitoring...');
        await this.runSocialMediaMonitoring();
        logger.info('Scheduled social media monitoring completed');
      } catch (error) {
        logger.error('Scheduled social media monitoring failed:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('socialMedia', job);
    job.start();
    logger.info(`Social media monitoring scheduled every ${interval} hours`);
  }

  startPastebinMonitoring() {
    // Stop existing job if running
    if (this.jobs.has('pastebin')) {
      this.jobs.get('pastebin').stop();
      this.jobs.delete('pastebin');
    }
    
    const interval = parseInt(process.env.SCAN_INTERVAL_MINUTES) || 30;
    
    const job = cron.schedule(`*/${interval} * * * *`, async () => {
      try {
        logger.info('Starting scheduled pastebin monitoring...');
        await this.runPastebinMonitoring();
        logger.info('Scheduled pastebin monitoring completed');
      } catch (error) {
        logger.error('Scheduled pastebin monitoring failed:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('pastebin', job);
    job.start();
    logger.info(`Pastebin monitoring scheduled every ${interval} minutes`);
  }

  startPasswordStoreMonitoring() {
    // Stop existing job if running
    if (this.jobs.has('passwordStore')) {
      this.jobs.get('passwordStore').stop();
      this.jobs.delete('passwordStore');
    }
    
    const interval = parseInt(process.env.SCAN_INTERVAL_MINUTES) || 30;
    
    const job = cron.schedule(`*/${interval} * * * *`, async () => {
      try {
        logger.info('Starting scheduled password store monitoring...');
        await this.runPasswordStoreMonitoring();
        logger.info('Scheduled password store monitoring completed');
      } catch (error) {
        logger.error('Scheduled password store monitoring failed:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('passwordStore', job);
    job.start();
    logger.info(`Password store monitoring scheduled every ${interval} minutes`);
  }

  startAlertProcessing() {
    // Stop existing job if running
    if (this.jobs.has('alerts')) {
      this.jobs.get('alerts').stop();
      this.jobs.delete('alerts');
    }
    
    const job = cron.schedule('*/5 * * * *', async () => {
      try {
        await this.processAlerts();
      } catch (error) {
        logger.error('Alert processing failed:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('alerts', job);
    job.start();
    logger.info('Alert processing scheduled every 5 minutes');
  }

  async runDomainMonitoring() {
    try {
      const domains = await Domain.find({ status: 'active' });
      logger.info(`Running domain monitoring for ${domains.length} domains`);

      const results = [];
      for (const domain of domains) {
        try {
          const result = await domainMonitoringService.analyzeDomain(domain);
          results.push({ domain: domain.domain, success: true, result });
          
          // Send real-time update
          this.sendRealTimeUpdate(domain.userId, 'domain_update', {
            domainId: domain._id,
            domain: domain.domain,
            riskLevel: domain.riskLevel,
            alerts: domain.alerts.filter(a => !a.isRead).length
          });
        } catch (error) {
          logger.error(`Domain monitoring failed for ${domain.domain}:`, error);
          results.push({ domain: domain.domain, success: false, error: error.message });
        }
      }

      logger.info(`Domain monitoring completed. ${results.filter(r => r.success).length}/${results.length} successful`);
      return results;
    } catch (error) {
      logger.error('Domain monitoring failed:', error);
      throw error;
    }
  }

  async runDarkWebMonitoring() {
    try {
      const users = await User.find({ isActive: true });
      logger.info(`Running dark web monitoring for ${users.length} users`);

      const results = [];
      for (const user of users) {
        try {
          const result = await darkWebMonitoringService.scanForUser(user);
          results.push({ userId: user._id, success: true, result });
          
          // Send real-time update
          this.sendRealTimeUpdate(user._id, 'dark_web_update', {
            scanTime: new Date(),
            findings: result.findings?.length || 0
          });
        } catch (error) {
          logger.error(`Dark web monitoring failed for user ${user._id}:`, error);
          results.push({ userId: user._id, success: false, error: error.message });
        }
      }

      logger.info(`Dark web monitoring completed. ${results.filter(r => r.success).length}/${results.length} successful`);
      return results;
    } catch (error) {
      logger.error('Dark web monitoring failed:', error);
      throw error;
    }
  }

  async runSocialMediaMonitoring() {
    try {
      const users = await User.find({ isActive: true });
      logger.info(`Running social media monitoring for ${users.length} users`);

      const results = [];
      for (const user of users) {
        try {
          const result = await socialMediaMonitoringService.scanForUser(user);
          results.push({ userId: user._id, success: true, result });
          
          // Send real-time update
          this.sendRealTimeUpdate(user._id, 'social_media_update', {
            scanTime: new Date(),
            mentions: result.mentions?.length || 0
          });
        } catch (error) {
          logger.error(`Social media monitoring failed for user ${user._id}:`, error);
          results.push({ userId: user._id, success: false, error: error.message });
        }
      }

      logger.info(`Social media monitoring completed. ${results.filter(r => r.success).length}/${results.length} successful`);
      return results;
    } catch (error) {
      logger.error('Social media monitoring failed:', error);
      throw error;
    }
  }

  async runPastebinMonitoring() {
    try {
      const users = await User.find({ isActive: true });
      logger.info(`Running pastebin monitoring for ${users.length} users`);

      const results = [];
      for (const user of users) {
        try {
          const result = await pastebinMonitoringService.scanForUser(user);
          results.push({ userId: user._id, success: true, result });
          
          // Send real-time update
          this.sendRealTimeUpdate(user._id, 'pastebin_update', {
            scanTime: new Date(),
            findings: result.findings?.length || 0
          });
        } catch (error) {
          logger.error(`Pastebin monitoring failed for user ${user._id}:`, error);
          results.push({ userId: user._id, success: false, error: error.message });
        }
      }

      logger.info(`Pastebin monitoring completed. ${results.filter(r => r.success).length}/${results.length} successful`);
      return results;
    } catch (error) {
      logger.error('Pastebin monitoring failed:', error);
      throw error;
    }
  }

  async runPasswordStoreMonitoring() {
    try {
      const users = await User.find({ isActive: true });
      logger.info(`Running password store monitoring for ${users.length} users`);

      const results = [];
      for (const user of users) {
        try {
          const result = await passwordStoreMonitoringService.scanForUser(user);
          results.push({ userId: user._id, success: true, result });
          
          // Send real-time update
          this.sendRealTimeUpdate(user._id, 'password_store_update', {
            scanTime: new Date(),
            breaches: result.breaches?.length || 0
          });
        } catch (error) {
          logger.error(`Password store monitoring failed for user ${user._id}:`, error);
          results.push({ userId: user._id, success: false, error: error.message });
        }
      }

      logger.info(`Password store monitoring completed. ${results.filter(r => r.success).length}/${results.length} successful`);
      return results;
    } catch (error) {
      logger.error('Password store monitoring failed:', error);
      throw error;
    }
  }

  async processAlerts() {
    try {
      await getAlertService().processPendingAlerts();
    } catch (error) {
      logger.error('Alert processing failed:', error);
      throw error;
    }
  }

  sendRealTimeUpdate(userId, event, data) {
    if (this.io) {
      this.io.to(`user-${userId}`).emit(event, {
        timestamp: new Date(),
        ...data
      });
    }
  }

  async stopMonitoringServices() {
    if (!this.isRunning) {
      logger.warn('Monitoring services are not running');
      return;
    }

    logger.info('Stopping monitoring services...');

    // Stop all cron jobs
    for (const [name, job] of this.jobs) {
      job.stop();
      logger.info(`Stopped ${name} monitoring job`);
    }

    this.jobs.clear();
    this.isRunning = false;
    logger.info('All monitoring services stopped');
  }

  async runManualScan(userId, scanType) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      logger.info(`Running manual ${scanType} scan for user ${userId}`);

      let result;
      switch (scanType) {
        case 'domain':
          const domains = await Domain.find({ userId, status: 'active' });
          result = await Promise.all(
            domains.map(domain => domainMonitoringService.analyzeDomain(domain))
          );
          break;
        case 'dark_web':
          result = await darkWebMonitoringService.scanForUser(user);
          break;
        case 'social_media':
          result = await socialMediaMonitoringService.scanForUser(user);
          break;
        case 'pastebin':
          result = await pastebinMonitoringService.scanForUser(user);
          break;
        case 'password_store':
          result = await passwordStoreMonitoringService.scanForUser(user);
          break;
        default:
          throw new Error(`Unknown scan type: ${scanType}`);
      }

      logger.info(`Manual ${scanType} scan completed for user ${userId}`);
      return result;
    } catch (error) {
      logger.error(`Manual ${scanType} scan failed for user ${userId}:`, error);
      throw error;
    }
  }

  getServiceStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      jobCount: this.jobs.size
    };
  }
}

const monitoringService = new MonitoringService();

module.exports = { startMonitoringServices: monitoringService.startMonitoringServices.bind(monitoringService) }; 