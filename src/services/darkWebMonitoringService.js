const axios = require('axios');
const logger = require('../config/logger');
const Alert = require('../models/Alert');

class DarkWebMonitoringService {
  constructor() {
    this.sources = [
      'torch',
      'ahmia',
      'dark.fail',
      'recon',
      'onionland'
    ];
    
    this.searchTerms = [
      'brand',
      'company',
      'domain',
      'email',
      'password',
      'credential',
      'breach',
      'leak'
    ];
  }

  async scanForUser(user) {
    try {
      logger.info(`Starting dark web scan for user: ${user.email}`);

      const results = {
        scanTime: new Date(),
        findings: [],
        sources: [],
        summary: {
          totalFindings: 0,
          highRiskFindings: 0,
          criticalFindings: 0
        }
      };

      // Get user's domains and company info
      const userDomains = await this.getUserDomains(user._id);
      const searchTerms = this.buildSearchTerms(user, userDomains);

      // Scan each source
      for (const source of this.sources) {
        try {
          const sourceResults = await this.scanSource(source, searchTerms, user);
          results.findings.push(...sourceResults);
          results.sources.push({
            name: source,
            status: 'completed',
            findings: sourceResults.length
          });
        } catch (error) {
          logger.error(`Dark web scan failed for source ${source}:`, error);
          results.sources.push({
            name: source,
            status: 'failed',
            error: error.message
          });
        }
      }

      // Analyze findings and create alerts
      await this.analyzeFindings(results.findings, user);

      // Update summary
      results.summary.totalFindings = results.findings.length;
      results.summary.highRiskFindings = results.findings.filter(f => f.riskLevel === 'high').length;
      results.summary.criticalFindings = results.findings.filter(f => f.riskLevel === 'critical').length;

      logger.info(`Dark web scan completed for user ${user.email}. Found ${results.summary.totalFindings} findings`);
      return results;

    } catch (error) {
      logger.error(`Dark web scan failed for user ${user.email}:`, error);
      throw error;
    }
  }

  async getUserDomains(userId) {
    try {
      const Domain = require('../models/Domain');
      const domains = await Domain.find({ userId, status: 'active' });
      return domains.map(d => d.domain);
    } catch (error) {
      logger.error('Failed to get user domains:', error);
      return [];
    }
  }

  buildSearchTerms(user, domains) {
    const terms = [];

    // Add company name
    if (user.company) {
      terms.push(user.company.toLowerCase());
      terms.push(user.company.toLowerCase().replace(/\s+/g, ''));
    }

    // Add domain names
    domains.forEach(domain => {
      const cleanDomain = domain.replace(/\./g, '');
      terms.push(domain);
      terms.push(cleanDomain);
    });

    // Add email domain
    const emailDomain = user.email.split('@')[1];
    if (emailDomain) {
      terms.push(emailDomain);
      terms.push(emailDomain.replace(/\./g, ''));
    }

    return [...new Set(terms)]; // Remove duplicates
  }

  async scanSource(source, searchTerms, user) {
    const findings = [];

    try {
      switch (source) {
        case 'torch':
          findings.push(...await this.scanTorch(searchTerms, user));
          break;
        case 'ahmia':
          findings.push(...await this.scanAhmia(searchTerms, user));
          break;
        case 'dark.fail':
          findings.push(...await this.scanDarkFail(searchTerms, user));
          break;
        case 'recon':
          findings.push(...await this.scanRecon(searchTerms, user));
          break;
        case 'onionland':
          findings.push(...await this.scanOnionland(searchTerms, user));
          break;
        default:
          logger.warn(`Unknown dark web source: ${source}`);
      }
    } catch (error) {
      logger.error(`Error scanning source ${source}:`, error);
    }

    return findings;
  }

  async scanTorch(searchTerms, user) {
    const findings = [];

    try {
      // Simulate Torch search (in real implementation, you'd use Tor proxy)
      for (const term of searchTerms) {
        const response = await axios.get(`http://xmh57jrzrnw6insl.onion/`, {
          params: { q: term },
          timeout: 10000,
          proxy: {
            host: '127.0.0.1',
            port: 9050,
            protocol: 'socks5'
          }
        });

        const results = this.parseTorchResults(response.data, term);
        findings.push(...results);
      }
    } catch (error) {
      logger.error('Torch scan failed:', error);
    }

    return findings;
  }

  async scanAhmia(searchTerms, user) {
    const findings = [];

    try {
      // Simulate Ahmia search
      for (const term of searchTerms) {
        const response = await axios.get(`https://ahmia.fi/search/`, {
          params: { q: term },
          timeout: 10000
        });

        const results = this.parseAhmiaResults(response.data, term);
        findings.push(...results);
      }
    } catch (error) {
      logger.error('Ahmia scan failed:', error);
    }

    return findings;
  }

  async scanDarkFail(searchTerms, user) {
    const findings = [];

    try {
      // Simulate dark.fail search
      for (const term of searchTerms) {
        const response = await axios.get(`https://dark.fail/`, {
          params: { q: term },
          timeout: 10000
        });

        const results = this.parseDarkFailResults(response.data, term);
        findings.push(...results);
      }
    } catch (error) {
      logger.error('Dark.fail scan failed:', error);
    }

    return findings;
  }

  async scanRecon(searchTerms, user) {
    const findings = [];

    try {
      // Simulate Recon search
      for (const term of searchTerms) {
        const response = await axios.get(`https://recon.darknetlive.com/`, {
          params: { q: term },
          timeout: 10000
        });

        const results = this.parseReconResults(response.data, term);
        findings.push(...results);
      }
    } catch (error) {
      logger.error('Recon scan failed:', error);
    }

    return findings;
  }

  async scanOnionland(searchTerms, user) {
    const findings = [];

    try {
      // Simulate Onionland search
      for (const term of searchTerms) {
        const response = await axios.get(`https://onionlandsearchengine.com/`, {
          params: { q: term },
          timeout: 10000
        });

        const results = this.parseOnionlandResults(response.data, term);
        findings.push(...results);
      }
    } catch (error) {
      logger.error('Onionland scan failed:', error);
    }

    return findings;
  }

  parseTorchResults(html, searchTerm) {
    const findings = [];
    
    // Parse HTML for results (simplified)
    const matches = html.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g);
    
    if (matches) {
      matches.forEach(match => {
        const urlMatch = match.match(/href="([^"]*)"/);
        const titleMatch = match.match(/>([^<]*)</);
        
        if (urlMatch && titleMatch) {
          findings.push({
            source: 'torch',
            url: urlMatch[1],
            title: titleMatch[1],
            searchTerm,
            riskLevel: this.assessRiskLevel(titleMatch[1], urlMatch[1]),
            detectedAt: new Date(),
            metadata: {
              source: 'torch',
              searchTerm
            }
          });
        }
      });
    }

    return findings;
  }

  parseAhmiaResults(html, searchTerm) {
    const findings = [];
    
    // Parse Ahmia results (simplified)
    const matches = html.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g);
    
    if (matches) {
      matches.forEach(match => {
        const urlMatch = match.match(/href="([^"]*)"/);
        const titleMatch = match.match(/>([^<]*)</);
        
        if (urlMatch && titleMatch) {
          findings.push({
            source: 'ahmia',
            url: urlMatch[1],
            title: titleMatch[1],
            searchTerm,
            riskLevel: this.assessRiskLevel(titleMatch[1], urlMatch[1]),
            detectedAt: new Date(),
            metadata: {
              source: 'ahmia',
              searchTerm
            }
          });
        }
      });
    }

    return findings;
  }

  parseDarkFailResults(html, searchTerm) {
    const findings = [];
    
    // Parse dark.fail results (simplified)
    const matches = html.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g);
    
    if (matches) {
      matches.forEach(match => {
        const urlMatch = match.match(/href="([^"]*)"/);
        const titleMatch = match.match(/>([^<]*)</);
        
        if (urlMatch && titleMatch) {
          findings.push({
            source: 'dark.fail',
            url: urlMatch[1],
            title: titleMatch[1],
            searchTerm,
            riskLevel: this.assessRiskLevel(titleMatch[1], urlMatch[1]),
            detectedAt: new Date(),
            metadata: {
              source: 'dark.fail',
              searchTerm
            }
          });
        }
      });
    }

    return findings;
  }

  parseReconResults(html, searchTerm) {
    const findings = [];
    
    // Parse Recon results (simplified)
    const matches = html.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g);
    
    if (matches) {
      matches.forEach(match => {
        const urlMatch = match.match(/href="([^"]*)"/);
        const titleMatch = match.match(/>([^<]*)</);
        
        if (urlMatch && titleMatch) {
          findings.push({
            source: 'recon',
            url: urlMatch[1],
            title: titleMatch[1],
            searchTerm,
            riskLevel: this.assessRiskLevel(titleMatch[1], urlMatch[1]),
            detectedAt: new Date(),
            metadata: {
              source: 'recon',
              searchTerm
            }
          });
        }
      });
    }

    return findings;
  }

  parseOnionlandResults(html, searchTerm) {
    const findings = [];
    
    // Parse Onionland results (simplified)
    const matches = html.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g);
    
    if (matches) {
      matches.forEach(match => {
        const urlMatch = match.match(/href="([^"]*)"/);
        const titleMatch = match.match(/>([^<]*)</);
        
        if (urlMatch && titleMatch) {
          findings.push({
            source: 'onionland',
            url: urlMatch[1],
            title: titleMatch[1],
            searchTerm,
            riskLevel: this.assessRiskLevel(titleMatch[1], urlMatch[1]),
            detectedAt: new Date(),
            metadata: {
              source: 'onionland',
              searchTerm
            }
          });
        }
      });
    }

    return findings;
  }

  assessRiskLevel(title, url) {
    const titleLower = title.toLowerCase();
    const urlLower = url.toLowerCase();

    // Critical risk indicators
    const criticalTerms = ['password', 'credential', 'breach', 'leak', 'dump', 'hack'];
    if (criticalTerms.some(term => titleLower.includes(term) || urlLower.includes(term))) {
      return 'critical';
    }

    // High risk indicators
    const highTerms = ['login', 'signin', 'account', 'bank', 'paypal', 'amazon'];
    if (highTerms.some(term => titleLower.includes(term) || urlLower.includes(term))) {
      return 'high';
    }

    // Medium risk indicators
    const mediumTerms = ['market', 'shop', 'store', 'buy', 'sell'];
    if (mediumTerms.some(term => titleLower.includes(term) || urlLower.includes(term))) {
      return 'medium';
    }

    return 'low';
  }

  async analyzeFindings(findings, user) {
    const alerts = [];

    for (const finding of findings) {
      if (finding.riskLevel === 'critical' || finding.riskLevel === 'high') {
        alerts.push({
          userId: user._id,
          type: 'dark_web_mention',
          severity: finding.riskLevel,
          title: `Dark Web Mention: ${finding.searchTerm}`,
          message: `Found mention of "${finding.searchTerm}" on ${finding.source}: ${finding.title}`,
          source: 'Dark Web Monitoring',
          sourceUrl: finding.url,
          metadata: {
            searchTerm: finding.searchTerm,
            source: finding.source,
            detectedAt: finding.detectedAt,
            riskLevel: finding.riskLevel
          }
        });
      }
    }

    // Create alerts
    for (const alertData of alerts) {
      try {
        await Alert.createAlert(alertData);
      } catch (error) {
        logger.error('Failed to create dark web alert:', error);
      }
    }

    logger.info(`Created ${alerts.length} dark web alerts for user ${user.email}`);
  }
}

const darkWebMonitoringService = new DarkWebMonitoringService();

module.exports = { darkWebMonitoringService }; 