const axios = require('axios');
const logger = require('../config/logger');
const Alert = require('../models/Alert');

class PastebinMonitoringService {
  constructor() {
    this.sources = [
      'pastebin.com',
      'ghostbin.co',
      'rentry.co',
      'paste.ee',
      'paste2.org'
    ];
  }

  async scanForUser(user) {
    try {
      logger.info(`Starting pastebin scan for user: ${user.email}`);

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
          logger.error(`Pastebin scan failed for source ${source}:`, error);
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

      logger.info(`Pastebin scan completed for user ${user.email}. Found ${results.summary.totalFindings} findings`);
      return results;

    } catch (error) {
      logger.error(`Pastebin scan failed for user ${user.email}:`, error);
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
      terms.push(user.company);
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
        case 'pastebin.com':
          findings.push(...await this.scanPastebin(searchTerms, user));
          break;
        case 'ghostbin.co':
          findings.push(...await this.scanGhostbin(searchTerms, user));
          break;
        case 'rentry.co':
          findings.push(...await this.scanRentry(searchTerms, user));
          break;
        case 'paste.ee':
          findings.push(...await this.scanPasteEe(searchTerms, user));
          break;
        case 'paste2.org':
          findings.push(...await this.scanPaste2(searchTerms, user));
          break;
        default:
          logger.warn(`Unknown pastebin source: ${source}`);
      }
    } catch (error) {
      logger.error(`Error scanning source ${source}:`, error);
    }

    return findings;
  }

  async scanPastebin(searchTerms, user) {
    const findings = [];

    try {
      // Pastebin has rate limits and requires API key for full access
      // This is a simplified implementation
      for (const term of searchTerms) {
        const response = await axios.get(`https://scrape.pastebin.com/api_scrape.php`, {
          params: { api_limit: 100 },
          timeout: 10000,
          headers: {
            'User-Agent': 'HawkEye/1.0'
          }
        });

        const results = this.parsePastebinResults(response.data, term);
        findings.push(...results);
      }
    } catch (error) {
      logger.error('Pastebin scan failed:', error);
    }

    return findings;
  }

  async scanGhostbin(searchTerms, user) {
    const findings = [];

    try {
      // Ghostbin doesn't have a public API, so we simulate
      for (const term of searchTerms) {
        // Simulate Ghostbin search
        const results = this.parseGhostbinResults([], term);
        findings.push(...results);
      }
    } catch (error) {
      logger.error('Ghostbin scan failed:', error);
    }

    return findings;
  }

  async scanRentry(searchTerms, user) {
    const findings = [];

    try {
      // Rentry.co has a simple API
      for (const term of searchTerms) {
        const response = await axios.get(`https://rentry.co/api/search`, {
          params: { q: term },
          timeout: 10000
        });

        const results = this.parseRentryResults(response.data, term);
        findings.push(...results);
      }
    } catch (error) {
      logger.error('Rentry scan failed:', error);
    }

    return findings;
  }

  async scanPasteEe(searchTerms, user) {
    const findings = [];

    try {
      // Paste.ee has a public API
      for (const term of searchTerms) {
        const response = await axios.get(`https://paste.ee/api`, {
          params: { q: term, limit: 100 },
          timeout: 10000
        });

        const results = this.parsePasteEeResults(response.data, term);
        findings.push(...results);
      }
    } catch (error) {
      logger.error('Paste.ee scan failed:', error);
    }

    return findings;
  }

  async scanPaste2(searchTerms, user) {
    const findings = [];

    try {
      // Paste2.org doesn't have a public API
      for (const term of searchTerms) {
        // Simulate Paste2 search
        const results = this.parsePaste2Results([], term);
        findings.push(...results);
      }
    } catch (error) {
      logger.error('Paste2 scan failed:', error);
    }

    return findings;
  }

  parsePastebinResults(data, searchTerm) {
    const findings = [];

    if (Array.isArray(data)) {
      data.forEach(paste => {
        if (paste.content && paste.content.toLowerCase().includes(searchTerm.toLowerCase())) {
          findings.push({
            source: 'pastebin.com',
            id: paste.key,
            title: paste.title || 'Untitled',
            content: paste.content.substring(0, 500) + '...',
            url: `https://pastebin.com/${paste.key}`,
            searchTerm,
            riskLevel: this.assessRiskLevel(paste.content),
            detectedAt: new Date(paste.date),
            metadata: {
              source: 'pastebin.com',
              searchTerm,
              pasteId: paste.key
            }
          });
        }
      });
    }

    return findings;
  }

  parseGhostbinResults(data, searchTerm) {
    const findings = [];

    // Simplified Ghostbin parsing
    data.forEach(paste => {
      findings.push({
        source: 'ghostbin.co',
        id: paste.id,
        title: paste.title || 'Untitled',
        content: paste.content.substring(0, 500) + '...',
        url: `https://ghostbin.co/${paste.id}`,
        searchTerm,
        riskLevel: this.assessRiskLevel(paste.content),
        detectedAt: new Date(paste.createdAt),
        metadata: {
          source: 'ghostbin.co',
          searchTerm
        }
      });
    });

    return findings;
  }

  parseRentryResults(data, searchTerm) {
    const findings = [];

    if (data.results) {
      data.results.forEach(paste => {
        findings.push({
          source: 'rentry.co',
          id: paste.id,
          title: paste.title || 'Untitled',
          content: paste.content.substring(0, 500) + '...',
          url: `https://rentry.co/${paste.id}`,
          searchTerm,
          riskLevel: this.assessRiskLevel(paste.content),
          detectedAt: new Date(paste.createdAt),
          metadata: {
            source: 'rentry.co',
            searchTerm
          }
        });
      });
    }

    return findings;
  }

  parsePasteEeResults(data, searchTerm) {
    const findings = [];

    if (data.pastes) {
      data.pastes.forEach(paste => {
        findings.push({
          source: 'paste.ee',
          id: paste.id,
          title: paste.title || 'Untitled',
          content: paste.content.substring(0, 500) + '...',
          url: `https://paste.ee/p/${paste.id}`,
          searchTerm,
          riskLevel: this.assessRiskLevel(paste.content),
          detectedAt: new Date(paste.created),
          metadata: {
            source: 'paste.ee',
            searchTerm
          }
        });
      });
    }

    return findings;
  }

  parsePaste2Results(data, searchTerm) {
    const findings = [];

    // Simplified Paste2 parsing
    data.forEach(paste => {
      findings.push({
        source: 'paste2.org',
        id: paste.id,
        title: paste.title || 'Untitled',
        content: paste.content.substring(0, 500) + '...',
        url: `https://paste2.org/${paste.id}`,
        searchTerm,
        riskLevel: this.assessRiskLevel(paste.content),
        detectedAt: new Date(paste.createdAt),
        metadata: {
          source: 'paste2.org',
          searchTerm
        }
      });
    });

    return findings;
  }

  assessRiskLevel(content) {
    const lowerContent = content.toLowerCase();

    // Critical risk indicators
    const criticalTerms = ['password', 'credential', 'api_key', 'secret', 'token', 'private_key'];
    if (criticalTerms.some(term => lowerContent.includes(term))) {
      return 'critical';
    }

    // High risk indicators
    const highTerms = ['email', 'username', 'login', 'config', 'database', 'connection'];
    if (highTerms.some(term => lowerContent.includes(term))) {
      return 'high';
    }

    // Medium risk indicators
    const mediumTerms = ['domain', 'url', 'link', 'address', 'contact'];
    if (mediumTerms.some(term => lowerContent.includes(term))) {
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
          type: 'pastebin_mention',
          severity: finding.riskLevel,
          title: `Pastebin Mention: ${finding.searchTerm}`,
          message: `Found mention of "${finding.searchTerm}" on ${finding.source}: ${finding.title}`,
          source: 'Pastebin Monitoring',
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
        logger.error('Failed to create pastebin alert:', error);
      }
    }

    logger.info(`Created ${alerts.length} pastebin alerts for user ${user.email}`);
  }
}

const pastebinMonitoringService = new PastebinMonitoringService();

module.exports = { pastebinMonitoringService }; 