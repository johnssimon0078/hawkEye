const axios = require('axios');
const crypto = require('crypto');
const Alert = require('../models/Alert');
const logger = require('../config/logger');

class PasswordStoreMonitoringService {
  constructor() {
    this.sources = [
      'haveibeenpwned',
      'dehashed',
      'leakcheck',
      'intelx',
      'snusbase'
    ];
  }

  async scanForUser(user) {
    try {
      logger.info(`Starting password store scan for user: ${user.email}`);

      const results = {
        scanTime: new Date(),
        breaches: [],
        sources: [],
        summary: {
          totalBreaches: 0,
          highRiskBreaches: 0,
          criticalBreaches: 0
        }
      };

      // Get user's domains and company info
      const userDomains = await this.getUserDomains(user._id);
      const searchTerms = this.buildSearchTerms(user, userDomains);

      // Scan each source
      for (const source of this.sources) {
        try {
          const sourceResults = await this.scanSource(source, searchTerms, user);
          results.breaches.push(...sourceResults);
          results.sources.push({
            name: source,
            status: 'completed',
            breaches: sourceResults.length
          });
        } catch (error) {
          logger.error(`Password store scan failed for source ${source}:`, error);
          results.sources.push({
            name: source,
            status: 'failed',
            error: error.message
          });
        }
      }

      // Analyze breaches and create alerts
      await this.analyzeBreaches(results.breaches, user);

      // Update summary
      results.summary.totalBreaches = results.breaches.length;
      results.summary.highRiskBreaches = results.breaches.filter(b => b.riskLevel === 'high').length;
      results.summary.criticalBreaches = results.breaches.filter(b => b.riskLevel === 'critical').length;

      logger.info(`Password store scan completed for user ${user.email}. Found ${results.summary.totalBreaches} breaches`);
      return results;

    } catch (error) {
      logger.error(`Password store scan failed for user ${user.email}:`, error);
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

    // Add email
    terms.push(user.email);
    terms.push(user.email.toLowerCase());

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
    const breaches = [];

    try {
      switch (source) {
        case 'haveibeenpwned':
          breaches.push(...await this.scanHaveIBeenPwned(searchTerms, user));
          break;
        case 'dehashed':
          breaches.push(...await this.scanDehashed(searchTerms, user));
          break;
        case 'leakcheck':
          breaches.push(...await this.scanLeakCheck(searchTerms, user));
          break;
        case 'intelx':
          breaches.push(...await this.scanIntelX(searchTerms, user));
          break;
        case 'snusbase':
          breaches.push(...await this.scanSnusbase(searchTerms, user));
          break;
        default:
          logger.warn(`Unknown password store source: ${source}`);
      }
    } catch (error) {
      logger.error(`Error scanning source ${source}:`, error);
    }

    return breaches;
  }

  async scanHaveIBeenPwned(searchTerms, user) {
    const breaches = [];

    try {
      for (const term of searchTerms) {
        // HaveIBeenPwned API requires k-anonymity (SHA1 hash prefix)
        const sha1Hash = crypto.createHash('sha1').update(term).digest('hex').toUpperCase();
        const prefix = sha1Hash.substring(0, 5);
        const suffix = sha1Hash.substring(5);

        const response = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`, {
          timeout: 10000,
          headers: {
            'User-Agent': 'HawkEye/1.0'
          }
        });

        const results = this.parseHaveIBeenPwnedResults(response.data, suffix, term);
        breaches.push(...results);
      }
    } catch (error) {
      logger.error('HaveIBeenPwned scan failed:', error);
    }

    return breaches;
  }

  async scanDehashed(searchTerms, user) {
    const breaches = [];

    try {
      // Dehashed requires API key and paid subscription
      // This is a simplified implementation
      for (const term of searchTerms) {
        // Simulate Dehashed search
        const results = this.parseDehashedResults([], term);
        breaches.push(...results);
      }
    } catch (error) {
      logger.error('Dehashed scan failed:', error);
    }

    return breaches;
  }

  async scanLeakCheck(searchTerms, user) {
    const breaches = [];

    try {
      // LeakCheck requires API key
      // This is a simplified implementation
      for (const term of searchTerms) {
        // Simulate LeakCheck search
        const results = this.parseLeakCheckResults([], term);
        breaches.push(...results);
      }
    } catch (error) {
      logger.error('LeakCheck scan failed:', error);
    }

    return breaches;
  }

  async scanIntelX(searchTerms, user) {
    const breaches = [];

    try {
      // IntelX requires API key
      // This is a simplified implementation
      for (const term of searchTerms) {
        // Simulate IntelX search
        const results = this.parseIntelXResults([], term);
        breaches.push(...results);
      }
    } catch (error) {
      logger.error('IntelX scan failed:', error);
    }

    return breaches;
  }

  async scanSnusbase(searchTerms, user) {
    const breaches = [];

    try {
      // Snusbase requires API key
      // This is a simplified implementation
      for (const term of searchTerms) {
        // Simulate Snusbase search
        const results = this.parseSnusbaseResults([], term);
        breaches.push(...results);
      }
    } catch (error) {
      logger.error('Snusbase scan failed:', error);
    }

    return breaches;
  }

  parseHaveIBeenPwnedResults(data, suffix, searchTerm) {
    const breaches = [];

    const lines = data.split('\n');
    for (const line of lines) {
      const [hash, count] = line.split(':');
      if (hash === suffix) {
        breaches.push({
          source: 'haveibeenpwned',
          searchTerm,
          breachName: 'Password Breach',
          count: parseInt(count),
          riskLevel: this.assessBreachRisk(parseInt(count)),
          detectedAt: new Date(),
          metadata: {
            source: 'haveibeenpwned',
            searchTerm,
            hash: hash
          }
        });
        break;
      }
    }

    return breaches;
  }

  parseDehashedResults(data, searchTerm) {
    const breaches = [];

    // Simplified Dehashed parsing
    data.forEach(breach => {
      breaches.push({
        source: 'dehashed',
        searchTerm,
        breachName: breach.breach_name || 'Unknown Breach',
        count: breach.count || 1,
        riskLevel: this.assessBreachRisk(breach.count || 1),
        detectedAt: new Date(breach.date || Date.now()),
        metadata: {
          source: 'dehashed',
          searchTerm
        }
      });
    });

    return breaches;
  }

  parseLeakCheckResults(data, searchTerm) {
    const breaches = [];

    // Simplified LeakCheck parsing
    data.forEach(breach => {
      breaches.push({
        source: 'leakcheck',
        searchTerm,
        breachName: breach.breach_name || 'Unknown Breach',
        count: breach.count || 1,
        riskLevel: this.assessBreachRisk(breach.count || 1),
        detectedAt: new Date(breach.date || Date.now()),
        metadata: {
          source: 'leakcheck',
          searchTerm
        }
      });
    });

    return breaches;
  }

  parseIntelXResults(data, searchTerm) {
    const breaches = [];

    // Simplified IntelX parsing
    data.forEach(breach => {
      breaches.push({
        source: 'intelx',
        searchTerm,
        breachName: breach.breach_name || 'Unknown Breach',
        count: breach.count || 1,
        riskLevel: this.assessBreachRisk(breach.count || 1),
        detectedAt: new Date(breach.date || Date.now()),
        metadata: {
          source: 'intelx',
          searchTerm
        }
      });
    });

    return breaches;
  }

  parseSnusbaseResults(data, searchTerm) {
    const breaches = [];

    // Simplified Snusbase parsing
    data.forEach(breach => {
      breaches.push({
        source: 'snusbase',
        searchTerm,
        breachName: breach.breach_name || 'Unknown Breach',
        count: breach.count || 1,
        riskLevel: this.assessBreachRisk(breach.count || 1),
        detectedAt: new Date(breach.date || Date.now()),
        metadata: {
          source: 'snusbase',
          searchTerm
        }
      });
    });

    return breaches;
  }

  assessBreachRisk(count) {
    if (count > 1000000) return 'critical';
    if (count > 100000) return 'high';
    if (count > 10000) return 'medium';
    return 'low';
  }

  async analyzeBreaches(breaches, user) {
    const alerts = [];

    for (const breach of breaches) {
      if (breach.riskLevel === 'critical' || breach.riskLevel === 'high') {
        alerts.push({
          userId: user._id,
          type: 'password_breach',
          severity: breach.riskLevel,
          title: `Password Breach: ${breach.searchTerm}`,
          message: `Found ${breach.count} instances of "${breach.searchTerm}" in ${breach.breachName} breach`,
          source: 'Password Store Monitoring',
          sourceUrl: `https://haveibeenpwned.com/PwnedWebsites`,
          metadata: {
            searchTerm: breach.searchTerm,
            source: breach.source,
            breachName: breach.breachName,
            count: breach.count,
            detectedAt: breach.detectedAt,
            riskLevel: breach.riskLevel
          }
        });
      }
    }

    // Create alerts
    for (const alertData of alerts) {
      try {
        await Alert.createAlert(alertData);
      } catch (error) {
        logger.error('Failed to create password breach alert:', error);
      }
    }

    logger.info(`Created ${alerts.length} password breach alerts for user ${user.email}`);
  }
}

const passwordStoreMonitoringService = new PasswordStoreMonitoringService();

module.exports = { passwordStoreMonitoringService }; 