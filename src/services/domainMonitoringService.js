const axios = require('axios');
const dns = require('dns').promises;
const whois = require('whois');
const { promisify } = require('util');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const Domain = require('../models/Domain');
const Alert = require('../models/Alert');
const logger = require('../config/logger');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const whoisLookup = promisify(whois.lookup);

class DomainMonitoringService {
  constructor() {
    this.virusTotalApiKey = process.env.VIRUSTOTAL_API_KEY;
    this.shodanApiKey = process.env.SHODAN_API_KEY;
    this.browser = null;
    this.screenshotsDir = path.join(process.cwd(), 'screenshots');
  }

  async initializeBrowser() {
    if (!this.browser) {
      try {
        this.browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        });
        logger.info('Puppeteer browser initialized for screenshot capture');
      } catch (error) {
        logger.error('Failed to initialize Puppeteer browser:', error);
      }
    }
    return this.browser;
  }

  async captureScreenshot(domain, type = 'general') {
    try {
      if (!this.browser) {
        this.browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
      }

      const page = await this.browser.newPage();
      
      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Set timeout
      page.setDefaultTimeout(30000);
      
      // Try HTTPS first, then HTTP
      let url = `https://${domain}`;
      let success = false;
      
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
        success = true;
      } catch (error) {
        logger.warn(`HTTPS failed for ${domain}, trying HTTP: ${error.message}`);
        try {
          url = `http://${domain}`;
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
          success = true;
        } catch (httpError) {
          logger.warn(`HTTP also failed for ${domain}: ${httpError.message}`);
          throw new Error(`Failed to load ${domain}: ${httpError.message}`);
        }
      }
      
      if (!success) {
        throw new Error(`Failed to load ${domain}`);
      }
      
      // Wait a bit for any dynamic content
      await page.waitForTimeout(2000);
      
      // Create screenshots directory if it doesn't exist
      await fs.mkdir(this.screenshotsDir, { recursive: true });
      
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${domain.replace(/[^a-zA-Z0-9.-]/g, '_')}_${type}_${timestamp}.png`;
      const filepath = path.join(this.screenshotsDir, filename);
      
      // Take screenshot - remove quality parameter for PNG
      await page.screenshot({
        path: filepath,
        fullPage: true,
        type: 'png'
      });
      
      await page.close();
      
      logger.info(`Screenshot captured for ${domain}: ${filepath}`);
      return filepath;
      
    } catch (error) {
      logger.error(`Screenshot capture failed for ${domain}:`, error);
      throw error;
    }
  }

  async analyzeDomain(domain) {
    try {
      logger.info(`Starting analysis for domain: ${domain.domain}`);

      const analysisResults = {
        whois: await this.getWhoisData(domain.domain),
        dns: await this.getDnsData(domain.domain),
        threat: await this.checkThreatIntelligence(domain.domain),
        content: await this.analyzeContent(domain.domain),
        ssl: await this.checkSSL(domain.domain)
      };

      // Update domain with analysis results
      await this.updateDomainWithAnalysis(domain, analysisResults);

      // Check for threats and create alerts
      await this.checkForThreats(domain, analysisResults);

      // Add monitoring record
      await domain.addMonitoringRecord('online', Date.now());

      logger.info(`Analysis completed for domain: ${domain.domain}`);
      return analysisResults;

    } catch (error) {
      logger.error(`Domain analysis failed for ${domain.domain}:`, error);
      await domain.addMonitoringRecord('error', null);
      throw error;
    }
  }

  async getWhoisData(domainName) {
    try {
      const whoisData = await whoisLookup(domainName);
      
      // Parse WHOIS data
      const parsed = this.parseWhoisData(whoisData);
      
      return {
        registrar: parsed.registrar,
        registrationDate: parsed.creationDate,
        expirationDate: parsed.expirationDate,
        nameServers: parsed.nameServers,
        status: parsed.status
      };
    } catch (error) {
      logger.error(`WHOIS lookup failed for ${domainName}:`, error);
      return null;
    }
  }

  parseWhoisData(whoisData) {
    const lines = whoisData.split('\n');
    const parsed = {};

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      if (key && value) {
        const cleanKey = key.trim().toLowerCase();
        
        switch (cleanKey) {
          case 'registrar':
            parsed.registrar = value;
            break;
          case 'creation date':
          case 'created':
            parsed.creationDate = new Date(value);
            break;
          case 'expiration date':
          case 'expires':
            parsed.expirationDate = new Date(value);
            break;
          case 'name server':
          case 'nserver':
            if (!parsed.nameServers) parsed.nameServers = [];
            parsed.nameServers.push(value);
            break;
          case 'status':
            if (!parsed.status) parsed.status = [];
            parsed.status.push(value);
            break;
        }
      }
    }

    return parsed;
  }

  async getDnsData(domainName) {
    try {
      const [aRecords, mxRecords, txtRecords, cnameRecords] = await Promise.allSettled([
        dns.resolve4(domainName),
        dns.resolveMx(domainName),
        dns.resolveTxt(domainName),
        dns.resolveCname(domainName)
      ]);

      return {
        aRecords: aRecords.status === 'fulfilled' ? aRecords.value : [],
        mxRecords: mxRecords.status === 'fulfilled' ? mxRecords.value : [],
        txtRecords: txtRecords.status === 'fulfilled' ? txtRecords.value : [],
        cnameRecords: cnameRecords.status === 'fulfilled' ? cnameRecords.value : []
      };
    } catch (error) {
      logger.error(`DNS resolution failed for ${domainName}:`, error);
      return null;
    }
  }

  async checkThreatIntelligence(domainName) {
    const threats = [];

    try {
      // Check VirusTotal
      if (this.virusTotalApiKey) {
        const vtThreats = await this.checkVirusTotal(domainName);
        threats.push(...vtThreats);
      }

      // Check Shodan
      if (this.shodanApiKey) {
        const shodanThreats = await this.checkShodan(domainName);
        threats.push(...shodanThreats);
      }

      // Basic threat detection
      const basicThreats = this.detectBasicThreats(domainName);
      threats.push(...basicThreats);

    } catch (error) {
      logger.error(`Threat intelligence check failed for ${domainName}:`, error);
    }

    return threats;
  }

  async checkVirusTotal(domainName) {
    try {
      const response = await axios.get(`https://www.virustotal.com/vtapi/v2/domain/report`, {
        params: {
          apikey: this.virusTotalApiKey,
          domain: domainName
        }
      });

      const threats = [];
      const data = response.data;

      if (data.positives > 0) {
        threats.push({
          type: 'malware',
          description: `VirusTotal detected ${data.positives} positive results`,
          confidence: Math.min(data.positives * 10, 100),
          source: 'VirusTotal'
        });
      }

      return threats;
    } catch (error) {
      logger.error(`VirusTotal check failed for ${domainName}:`, error);
      return [];
    }
  }

  async checkShodan(domainName) {
    try {
      const response = await axios.get(`https://api.shodan.io/shodan/host/search`, {
        params: {
          key: this.shodanApiKey,
          query: `hostname:${domainName}`
        }
      });

      const threats = [];
      const data = response.data;

      if (data.total > 0) {
        // Check for suspicious ports/services
        const suspiciousPorts = [22, 23, 3389, 1433, 3306, 5432];
        const foundSuspicious = data.matches.some(match => 
          suspiciousPorts.includes(match.port)
        );

        if (foundSuspicious) {
          threats.push({
            type: 'suspicious_redirect',
            description: 'Suspicious ports/services detected via Shodan',
            confidence: 70,
            source: 'Shodan'
          });
        }
      }

      return threats;
    } catch (error) {
      logger.error(`Shodan check failed for ${domainName}:`, error);
      return [];
    }
  }

  detectBasicThreats(domainName) {
    const threats = [];

    // Check for typosquatting patterns
    const suspiciousPatterns = [
      /[0-9]+/, // Contains numbers
      /[a-z]{20,}/, // Very long domain
      /(login|signin|secure|account|banking|paypal|amazon|google|facebook|twitter)/i // Common brand names
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(domainName)) {
        threats.push({
          type: 'brand_abuse',
          description: `Suspicious domain pattern detected: ${pattern.source}`,
          confidence: 60,
          source: 'Pattern Analysis'
        });
      }
    }

    return threats;
  }

  async analyzeContent(domainName) {
    try {
      const response = await axios.get(`http://${domainName}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HawkEye/1.0)'
        }
      });

      const html = response.data;
      const title = this.extractTitle(html);
      const description = this.extractDescription(html);
      const keywords = this.extractKeywords(html);

      return {
        title,
        description,
        keywords,
        hasBrandMentions: this.checkBrandMentions(html),
        hasSuspiciousContent: this.checkSuspiciousContent(html),
        lastAnalyzed: new Date()
      };
    } catch (error) {
      logger.error(`Content analysis failed for ${domainName}:`, error);
      return {
        title: null,
        description: null,
        keywords: [],
        hasBrandMentions: false,
        hasSuspiciousContent: false,
        lastAnalyzed: new Date()
      };
    }
  }

  extractTitle(html) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : null;
  }

  extractDescription(html) {
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    return descMatch ? descMatch[1].trim() : null;
  }

  extractKeywords(html) {
    const keywordMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i);
    return keywordMatch ? keywordMatch[1].split(',').map(k => k.trim()) : [];
  }

  checkBrandMentions(html) {
    const brandKeywords = ['login', 'signin', 'secure', 'bank', 'paypal', 'amazon', 'google'];
    const lowerHtml = html.toLowerCase();
    return brandKeywords.some(keyword => lowerHtml.includes(keyword));
  }

  checkSuspiciousContent(html) {
    const suspiciousPatterns = [
      /password/i,
      /credit.?card/i,
      /ssn|social.?security/i,
      /bank.?account/i
    ];
    return suspiciousPatterns.some(pattern => pattern.test(html));
  }

  async checkSSL(domainName) {
    try {
      const response = await axios.get(`https://${domainName}`, {
        timeout: 5000,
        validateStatus: () => true
      });

      return {
        isValid: response.status === 200,
        issuer: response.headers['server'] || 'Unknown',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Assume 1 year
      };
    } catch (error) {
      return {
        isValid: false,
        issuer: null,
        validFrom: null,
        validTo: null
      };
    }
  }

  async updateDomainWithAnalysis(domain, analysisResults) {
    const updateData = {};

    if (analysisResults.whois) {
      updateData.registrar = analysisResults.whois.registrar;
      updateData.registrationDate = analysisResults.whois.registrationDate;
      updateData.expirationDate = analysisResults.whois.expirationDate;
      updateData.nameServers = analysisResults.whois.nameServers || [];
    }

    if (analysisResults.dns && analysisResults.dns.aRecords.length > 0) {
      updateData.ipAddress = analysisResults.dns.aRecords[0];
    }

    if (analysisResults.content) {
      updateData.contentAnalysis = analysisResults.content;
    }

    if (analysisResults.ssl) {
      updateData.sslCertificate = analysisResults.ssl;
    }

    // Update threat indicators
    if (analysisResults.threat && analysisResults.threat.length > 0) {
      updateData.threatIndicators = analysisResults.threat;
      
      // Update risk level based on threats
      const maxConfidence = Math.max(...analysisResults.threat.map(t => t.confidence));
      if (maxConfidence >= 90) updateData.riskLevel = 'critical';
      else if (maxConfidence >= 70) updateData.riskLevel = 'high';
      else if (maxConfidence >= 50) updateData.riskLevel = 'medium';
      else updateData.riskLevel = 'low';
    }

    // Use findOneAndUpdate to avoid version conflicts
    await Domain.findOneAndUpdate(
      { _id: domain._id },
      updateData,
      { new: true }
    );
  }

  async checkForThreats(domain, analysisResults) {
    const alerts = [];

    // Check for new threats
    if (analysisResults.threat && analysisResults.threat.length > 0) {
      for (const threat of analysisResults.threat) {
        if (threat.confidence >= 50) {
          alerts.push({
            type: 'threat_detected',
            message: `Threat detected: ${threat.description}`,
            severity: threat.confidence >= 90 ? 'critical' : threat.confidence >= 70 ? 'high' : 'medium'
          });
        }
      }
    }

    // Check for SSL expiry
    if (analysisResults.ssl && analysisResults.ssl.validTo) {
      const daysUntilExpiry = Math.floor((analysisResults.ssl.validTo - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 30) {
        alerts.push({
          type: 'ssl_expiry',
          message: `SSL certificate expires in ${daysUntilExpiry} days`,
          severity: daysUntilExpiry <= 7 ? 'critical' : daysUntilExpiry <= 14 ? 'high' : 'medium'
        });
      }
    }

    // Check for domain expiry
    if (analysisResults.whois && analysisResults.whois.expirationDate) {
      const daysUntilExpiry = Math.floor((analysisResults.whois.expirationDate - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 30) {
        alerts.push({
          type: 'domain_expiry',
          message: `Domain expires in ${daysUntilExpiry} days`,
          severity: daysUntilExpiry <= 7 ? 'critical' : daysUntilExpiry <= 14 ? 'high' : 'medium'
        });
      }
    }

    // Add alerts to domain
    for (const alert of alerts) {
      await domain.addAlert(alert.type, alert.message, alert.severity);
    }

    // Create global alerts if critical or high severity
    for (const alert of alerts) {
      if (alert.severity === 'critical' || alert.severity === 'high') {
        let screenshotPath = null;
        
        // Capture screenshot for brand abuse threats
        if (alert.type === 'threat_detected' && alert.message.includes('brand abuse')) {
          try {
            screenshotPath = await this.captureScreenshot(domain.domain, 'brand_abuse');
            logger.info(`Screenshot captured for brand abuse threat: ${screenshotPath}`);
          } catch (screenshotError) {
            logger.error(`Failed to capture screenshot for ${domain.domain}:`, screenshotError);
          }
        }

        const alertMetadata = {
          domain: domain.domain,
          detectedAt: new Date(),
          threatType: alert.type,
          threatDescription: alert.message
        };

        // Add screenshot path to metadata if available
        if (screenshotPath) {
          alertMetadata.screenshotPath = screenshotPath;
          alertMetadata.hasScreenshot = true;
        }

        await Alert.createAlert({
          userId: domain.userId,
          type: alert.type,
          severity: alert.severity,
          title: `Domain Alert: ${domain.domain}`,
          message: alert.message,
          source: 'Domain Monitoring',
          sourceUrl: `http://${domain.domain}`,
          metadata: alertMetadata
        });
      }
    }
  }
}

const domainMonitoringService = new DomainMonitoringService();

module.exports = { domainMonitoringService }; 