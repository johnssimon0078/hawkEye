const nodemailer = require('nodemailer');
const axios = require('axios');
const Alert = require('../models/Alert');
const User = require('../models/User');
const Domain = require('../models/Domain');
const logger = require('../config/logger');

let alertServiceInstance = null;

class AlertService {
  constructor() {
    this.emailTransporter = null;
    // Only setup email transporter if environment variables are available
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.setupEmailTransporter();
    }
  }

  setupEmailTransporter() {
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async processPendingAlerts() {
    try {
      logger.info('Processing pending alerts...');

      // Get unprocessed alerts
      const pendingAlerts = await Alert.find({
        status: 'new',
        isRead: false
      }).populate('userId', 'email firstName lastName preferences');

      logger.info(`Found ${pendingAlerts.length} pending alerts`);

      for (const alert of pendingAlerts) {
        try {
          await this.processAlert(alert);
        } catch (error) {
          logger.error(`Failed to process alert ${alert._id}:`, error);
        }
      }

      logger.info('Alert processing completed');
    } catch (error) {
      logger.error('Alert processing failed:', error);
      throw error;
    }
  }

  async processAlert(alert) {
    try {
      // Fetch the user from the database
      const user = await User.findById(alert.userId);
      if (!user) {
        logger.warn(`Alert ${alert._id} has no associated user`);
        return;
      }

      // Check user preferences for alert frequency
      const shouldSend = this.shouldSendAlert(user, alert);
      if (!shouldSend) {
        logger.info(`Skipping alert ${alert._id} due to user preferences`);
        return;
      }

      // Send notifications based on user preferences
      const notifications = [];

      if (user.preferences?.emailNotifications && this.emailTransporter) {
        try {
          await this.sendEmailAlert(user, alert);
          notifications.push('email');
        } catch (error) {
          logger.error(`Failed to send email alert:`, error);
        }
      }

      if (user.preferences?.slackNotifications && process.env.ALERT_SLACK_WEBHOOK_URL) {
        try {
          await this.sendSlackAlert(user, alert);
          notifications.push('slack');
        } catch (error) {
          logger.error(`Failed to send Slack alert:`, error);
        }
      }

      if (user.preferences?.discordNotifications && process.env.ALERT_DISCORD_WEBHOOK_URL) {
        try {
          await this.sendDiscordAlert(user, alert);
          notifications.push('discord');
        } catch (error) {
          logger.error(`Failed to send Discord alert:`, error);
        }
      }

      if (user.preferences?.telegramNotifications && user.telegramChatId && process.env.TELEGRAM_BOT_TOKEN) {
        try {
          await this.sendTelegramAlert(user, alert);
          notifications.push('telegram');
        } catch (error) {
          logger.error(`Failed to send Telegram alert:`, error);
        }
      }

      // Update alert status
      if (notifications.length > 0) {
        await alert.addAction('notifications_sent', `Sent via: ${notifications.join(', ')}`, user._id);
        logger.info(`Alert ${alert._id} processed successfully. Sent via: ${notifications.join(', ')}`);
      } else {
        logger.warn(`Alert ${alert._id} processed but no notifications were sent`);
      }

    } catch (error) {
      logger.error(`Failed to process alert ${alert._id}:`, error);
      throw error;
    }
  }

  shouldSendAlert(user, alert) {
    const frequency = user.preferences?.alertFrequency || 'immediate';
    
    switch (frequency) {
      case 'immediate':
        return true;
      case 'hourly':
        // Check if we've sent an alert in the last hour
        const lastHour = new Date(Date.now() - 60 * 60 * 1000);
        return !user.lastAlertSent || user.lastAlertSent < lastHour;
      case 'daily':
        // Check if we've sent an alert today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return !user.lastAlertSent || user.lastAlertSent < today;
      default:
        return true;
    }
  }

  async sendEmailAlert(user, alert) {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@hawkeye.com',
      to: user.email,
      subject: `[HawkEye Alert] ${alert.title}`,
      html: this.generateEmailTemplate(user, alert)
    };

    await this.emailTransporter.sendMail(mailOptions);
    logger.info(`Email alert sent to ${user.email} for alert ${alert._id}`);
  }

  async sendSlackAlert(user, alert) {
    const webhookUrl = process.env.ALERT_SLACK_WEBHOOK_URL;
    const message = this.generateSlackMessage(user, alert);

    await axios.post(webhookUrl, message, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    logger.info(`Slack alert sent for user ${user.email} for alert ${alert._id}`);
  }

  async sendDiscordAlert(user, alert) {
    const webhookUrl = process.env.ALERT_DISCORD_WEBHOOK_URL;
    const message = this.generateDiscordMessage(user, alert);

    await axios.post(webhookUrl, message, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    logger.info(`Discord alert sent for user ${user.email} for alert ${alert._id}`);
  }

  async sendTelegramAlert(user, alert) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = user.telegramChatId;
    const message = this.generateTelegramMessage(user, alert);

    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
      // Send the text message first
      await axios.post(telegramApiUrl, {
        chat_id: chatId,
        text: message.text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });

      logger.info(`Telegram alert sent to chat ${chatId} for user ${user.email} for alert ${alert._id}`);

      // Send screenshot if available
      if (alert.metadata && alert.metadata.screenshotPath && alert.metadata.hasScreenshot) {
        try {
          const fs = require('fs');
          const FormData = require('form-data');
          
          // Check if screenshot file exists
          if (fs.existsSync(alert.metadata.screenshotPath)) {
            const form = new FormData();
            form.append('chat_id', chatId);
            form.append('photo', fs.createReadStream(alert.metadata.screenshotPath));
            form.append('caption', `📸 Screenshot of suspicious domain: ${alert.metadata.domain}`);
            form.append('parse_mode', 'HTML');

            await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, form, {
              headers: form.getHeaders()
            });

            logger.info(`Screenshot sent via Telegram for alert ${alert._id}: ${alert.metadata.screenshotPath}`);
          } else {
            logger.warn(`Screenshot file not found: ${alert.metadata.screenshotPath}`);
          }
        } catch (screenshotError) {
          logger.error(`Failed to send screenshot via Telegram for alert ${alert._id}:`, screenshotError);
        }
      }

    } catch (error) {
      logger.error(`Failed to send Telegram alert for user ${user.email} for alert ${alert._id}:`, error);
      throw error;
    }
  }

  generateEmailTemplate(user, alert) {
    const severityColors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      critical: '#dc3545'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>HawkEye Alert</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${severityColors[alert.severity]}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .alert-details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${severityColors[alert.severity]}; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 10px 20px; background: ${severityColors[alert.severity]}; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 HawkEye Security Alert</h1>
            <p>Severity: ${alert.severity.toUpperCase()}</p>
          </div>
          
          <div class="content">
            <h2>${alert.title}</h2>
            <p>Hello ${user.firstName},</p>
            <p>We've detected a security issue that requires your attention:</p>
            
            <div class="alert-details">
              <h3>Alert Details</h3>
              <p><strong>Message:</strong> ${alert.message}</p>
              <p><strong>Source:</strong> ${alert.source}</p>
              <p><strong>Detected:</strong> ${alert.createdAt.toLocaleString()}</p>
              ${alert.sourceUrl ? `<p><strong>Source URL:</strong> <a href="${alert.sourceUrl}">${alert.sourceUrl}</a></p>` : ''}
            </div>
            
            <p>Please review this alert and take appropriate action if necessary.</p>
            
            <p style="text-align: center;">
                              <a href="${process.env.BASE_URL || 'http://localhost:3000'}/alerts/${alert._id}" class="button">
                View Alert Details
              </a>
            </p>
          </div>
          
          <div class="footer">
            <p>This is an automated alert from HawkEye Brand Protection Platform.</p>
            <p>If you have any questions, please contact your security team.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateSlackMessage(user, alert) {
    const severityEmoji = {
      low: ':white_check_mark:',
      medium: ':warning:',
      high: ':rotating_light:',
      critical: ':fire:'
    };

    return {
      text: `HawkEye Security Alert for ${user.firstName} ${user.lastName}`,
      attachments: [
        {
          color: this.getSeverityColor(alert.severity),
          title: `${severityEmoji[alert.severity]} ${alert.title}`,
          text: alert.message,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Source',
              value: alert.source,
              short: true
            },
            {
              title: 'Detected',
              value: alert.createdAt.toLocaleString(),
              short: true
            }
          ],
          actions: [
            {
              type: 'button',
              text: 'View Details',
              url: `${process.env.BASE_URL || 'http://localhost:3000'}/alerts/${alert._id}`
            }
          ],
          footer: 'HawkEye Brand Protection Platform'
        }
      ]
    };
  }

  generateDiscordMessage(user, alert) {
    const severityEmoji = {
      low: '✅',
      medium: '⚠️',
      high: '🚨',
      critical: '🔥'
    };

    return {
      embeds: [
        {
          title: `${severityEmoji[alert.severity]} ${alert.title}`,
          description: alert.message,
          color: this.getDiscordColor(alert.severity),
          fields: [
            {
              name: 'Severity',
              value: alert.severity.toUpperCase(),
              inline: true
            },
            {
              name: 'Source',
              value: alert.source,
              inline: true
            },
            {
              name: 'Detected',
              value: alert.createdAt.toLocaleString(),
              inline: true
            }
          ],
          url: `${process.env.BASE_URL || 'http://localhost:3000'}/alerts/${alert._id}`,
          footer: {
            text: 'HawkEye Brand Protection Platform'
          },
          timestamp: alert.createdAt.toISOString()
        }
      ]
    };
  }

  generateTelegramMessage(user, alert) {
    const severityEmoji = {
      low: '✅',
      medium: '⚠️',
      high: '🚨',
      critical: '🔥'
    };

    const severityColor = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };

    const text = `
<b>${severityEmoji[alert.severity]} HawkEye Security Alert</b>

<b>${alert.title}</b>

${alert.message}

<b>Details:</b>
• Severity: ${severityColor[alert.severity]} ${alert.severity.toUpperCase()}
• Source: ${alert.source}
• Detected: ${alert.createdAt.toLocaleString()}
${alert.sourceUrl ? `• Source URL: ${alert.sourceUrl}` : ''}

<i>HawkEye Brand Protection Platform</i>
    `.trim();

    return { text };
  }

  getSeverityColor(severity) {
    const colors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      critical: '#dc3545'
    };
    return colors[severity] || '#6c757d';
  }

  getDiscordColor(severity) {
    const colors = {
      low: 0x28a745,
      medium: 0xffc107,
      high: 0xfd7e14,
      critical: 0xdc3545
    };
    return colors[severity] || 0x6c757d;
  }

  async getAlertStats(userId) {
    try {
      const stats = await Alert.aggregate([
        { $match: { userId: userId } },
        {
          $group: {
            _id: null,
            totalAlerts: { $sum: 1 },
            unreadAlerts: {
              $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
            },
            criticalAlerts: {
              $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
            },
            highAlerts: {
              $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
            }
          }
        }
      ]);

      const typeStats = await Alert.aggregate([
        { $match: { userId: userId } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]);

      // Get total domains count for the user
      const totalDomains = await Domain.countDocuments({ userId: userId });

      return {
        overview: {
          ...(stats[0] || {
            totalAlerts: 0,
            unreadAlerts: 0,
            criticalAlerts: 0,
            highAlerts: 0
          }),
          totalDomains: totalDomains
        },
        byType: typeStats
      };
    } catch (error) {
      logger.error('Failed to get alert stats:', error);
      throw error;
    }
  }
}

const getAlertService = () => {
  if (!alertServiceInstance) {
    alertServiceInstance = new AlertService();
  }
  return alertServiceInstance;
};

module.exports = { getAlertService }; 