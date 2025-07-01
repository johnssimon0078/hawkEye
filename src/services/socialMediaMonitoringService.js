const axios = require('axios');
const Alert = require('../models/Alert');
const logger = require('../config/logger');

class SocialMediaMonitoringService {
  constructor() {
    this.platforms = ['twitter', 'linkedin', 'facebook', 'instagram', 'reddit'];
    this.twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;
    this.linkedinClientId = process.env.LINKEDIN_CLIENT_ID;
    this.linkedinClientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  }

  async scanForUser(user) {
    try {
      logger.info(`Starting social media scan for user: ${user.email}`);

      const results = {
        scanTime: new Date(),
        mentions: [],
        platforms: [],
        summary: {
          totalMentions: 0,
          positiveMentions: 0,
          negativeMentions: 0,
          neutralMentions: 0
        }
      };

      // Get user's domains and company info
      const userDomains = await this.getUserDomains(user._id);
      const searchTerms = this.buildSearchTerms(user, userDomains);

      // Scan each platform
      for (const platform of this.platforms) {
        try {
          const platformResults = await this.scanPlatform(platform, searchTerms, user);
          results.mentions.push(...platformResults);
          results.platforms.push({
            name: platform,
            status: 'completed',
            mentions: platformResults.length
          });
        } catch (error) {
          logger.error(`Social media scan failed for platform ${platform}:`, error);
          results.platforms.push({
            name: platform,
            status: 'failed',
            error: error.message
          });
        }
      }

      // Analyze mentions and create alerts
      await this.analyzeMentions(results.mentions, user);

      // Update summary
      results.summary.totalMentions = results.mentions.length;
      results.summary.positiveMentions = results.mentions.filter(m => m.sentiment === 'positive').length;
      results.summary.negativeMentions = results.mentions.filter(m => m.sentiment === 'negative').length;
      results.summary.neutralMentions = results.mentions.filter(m => m.sentiment === 'neutral').length;

      logger.info(`Social media scan completed for user ${user.email}. Found ${results.summary.totalMentions} mentions`);
      return results;

    } catch (error) {
      logger.error(`Social media scan failed for user ${user.email}:`, error);
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

  async scanPlatform(platform, searchTerms, user) {
    const mentions = [];

    try {
      switch (platform) {
        case 'twitter':
          mentions.push(...await this.scanTwitter(searchTerms, user));
          break;
        case 'linkedin':
          mentions.push(...await this.scanLinkedIn(searchTerms, user));
          break;
        case 'facebook':
          mentions.push(...await this.scanFacebook(searchTerms, user));
          break;
        case 'instagram':
          mentions.push(...await this.scanInstagram(searchTerms, user));
          break;
        case 'reddit':
          mentions.push(...await this.scanReddit(searchTerms, user));
          break;
        default:
          logger.warn(`Unknown social media platform: ${platform}`);
      }
    } catch (error) {
      logger.error(`Error scanning platform ${platform}:`, error);
    }

    return mentions;
  }

  async scanTwitter(searchTerms, user) {
    const mentions = [];

    try {
      if (!this.twitterBearerToken) {
        logger.warn('Twitter Bearer Token not configured');
        return mentions;
      }

      for (const term of searchTerms) {
        const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
          headers: {
            'Authorization': `Bearer ${this.twitterBearerToken}`
          },
          params: {
            query: term,
            max_results: 100,
            'tweet.fields': 'created_at,author_id,public_metrics,context_annotations'
          }
        });

        const results = this.parseTwitterResults(response.data, term);
        mentions.push(...results);
      }
    } catch (error) {
      logger.error('Twitter scan failed:', error);
    }

    return mentions;
  }

  async scanLinkedIn(searchTerms, user) {
    const mentions = [];

    try {
      // LinkedIn API requires OAuth 2.0 authentication
      // This is a simplified implementation
      for (const term of searchTerms) {
        // Simulate LinkedIn search
        const results = this.parseLinkedInResults([], term);
        mentions.push(...results);
      }
    } catch (error) {
      logger.error('LinkedIn scan failed:', error);
    }

    return mentions;
  }

  async scanFacebook(searchTerms, user) {
    const mentions = [];

    try {
      // Facebook API requires app review and permissions
      // This is a simplified implementation
      for (const term of searchTerms) {
        // Simulate Facebook search
        const results = this.parseFacebookResults([], term);
        mentions.push(...results);
      }
    } catch (error) {
      logger.error('Facebook scan failed:', error);
    }

    return mentions;
  }

  async scanInstagram(searchTerms, user) {
    const mentions = [];

    try {
      // Instagram API requires app review and permissions
      // This is a simplified implementation
      for (const term of searchTerms) {
        // Simulate Instagram search
        const results = this.parseInstagramResults([], term);
        mentions.push(...results);
      }
    } catch (error) {
      logger.error('Instagram scan failed:', error);
    }

    return mentions;
  }

  async scanReddit(searchTerms, user) {
    const mentions = [];

    try {
      for (const term of searchTerms) {
        const response = await axios.get(`https://www.reddit.com/search.json`, {
          params: {
            q: term,
            sort: 'new',
            t: 'day'
          },
          headers: {
            'User-Agent': 'HawkEye/1.0'
          }
        });

        const results = this.parseRedditResults(response.data, term);
        mentions.push(...results);
      }
    } catch (error) {
      logger.error('Reddit scan failed:', error);
    }

    return mentions;
  }

  parseTwitterResults(data, searchTerm) {
    const mentions = [];

    if (data.data) {
      data.data.forEach(tweet => {
        mentions.push({
          platform: 'twitter',
          id: tweet.id,
          content: tweet.text,
          author: tweet.author_id,
          url: `https://twitter.com/user/status/${tweet.id}`,
          searchTerm,
          sentiment: this.analyzeSentiment(tweet.text),
          engagement: tweet.public_metrics || {},
          createdAt: new Date(tweet.created_at),
          metadata: {
            platform: 'twitter',
            searchTerm,
            tweetId: tweet.id
          }
        });
      });
    }

    return mentions;
  }

  parseLinkedInResults(data, searchTerm) {
    const mentions = [];

    // Simplified LinkedIn parsing
    data.forEach(post => {
      mentions.push({
        platform: 'linkedin',
        id: post.id,
        content: post.content,
        author: post.author,
        url: post.url,
        searchTerm,
        sentiment: this.analyzeSentiment(post.content),
        engagement: post.engagement || {},
        createdAt: new Date(post.createdAt),
        metadata: {
          platform: 'linkedin',
          searchTerm
        }
      });
    });

    return mentions;
  }

  parseFacebookResults(data, searchTerm) {
    const mentions = [];

    // Simplified Facebook parsing
    data.forEach(post => {
      mentions.push({
        platform: 'facebook',
        id: post.id,
        content: post.content,
        author: post.author,
        url: post.url,
        searchTerm,
        sentiment: this.analyzeSentiment(post.content),
        engagement: post.engagement || {},
        createdAt: new Date(post.createdAt),
        metadata: {
          platform: 'facebook',
          searchTerm
        }
      });
    });

    return mentions;
  }

  parseInstagramResults(data, searchTerm) {
    const mentions = [];

    // Simplified Instagram parsing
    data.forEach(post => {
      mentions.push({
        platform: 'instagram',
        id: post.id,
        content: post.caption,
        author: post.author,
        url: post.url,
        searchTerm,
        sentiment: this.analyzeSentiment(post.caption),
        engagement: post.engagement || {},
        createdAt: new Date(post.createdAt),
        metadata: {
          platform: 'instagram',
          searchTerm
        }
      });
    });

    return mentions;
  }

  parseRedditResults(data, searchTerm) {
    const mentions = [];

    if (data.data && data.data.children) {
      data.data.children.forEach(child => {
        const post = child.data;
        mentions.push({
          platform: 'reddit',
          id: post.id,
          content: post.title + ' ' + (post.selftext || ''),
          author: post.author,
          url: `https://reddit.com${post.permalink}`,
          searchTerm,
          sentiment: this.analyzeSentiment(post.title + ' ' + (post.selftext || '')),
          engagement: {
            upvotes: post.ups,
            downvotes: post.downs,
            comments: post.num_comments
          },
          createdAt: new Date(post.created_utc * 1000),
          metadata: {
            platform: 'reddit',
            searchTerm,
            subreddit: post.subreddit
          }
        });
      });
    }

    return mentions;
  }

  analyzeSentiment(text) {
    const lowerText = text.toLowerCase();

    // Positive sentiment indicators
    const positiveTerms = ['good', 'great', 'excellent', 'amazing', 'love', 'like', 'best', 'awesome'];
    const positiveCount = positiveTerms.filter(term => lowerText.includes(term)).length;

    // Negative sentiment indicators
    const negativeTerms = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'dislike', 'problem'];
    const negativeCount = negativeTerms.filter(term => lowerText.includes(term)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  async analyzeMentions(mentions, user) {
    const alerts = [];

    for (const mention of mentions) {
      // Create alerts for negative mentions or high engagement
      if (mention.sentiment === 'negative' || 
          (mention.engagement.retweet_count > 100) ||
          (mention.engagement.like_count > 500)) {
        
        alerts.push({
          userId: user._id,
          type: 'social_media_mention',
          severity: mention.sentiment === 'negative' ? 'high' : 'medium',
          title: `Social Media Mention: ${mention.searchTerm}`,
          message: `Found ${mention.sentiment} mention of "${mention.searchTerm}" on ${mention.platform}`,
          source: 'Social Media Monitoring',
          sourceUrl: mention.url,
          metadata: {
            platform: mention.platform,
            searchTerm: mention.searchTerm,
            sentiment: mention.sentiment,
            engagement: mention.engagement,
            detectedAt: mention.createdAt
          }
        });
      }
    }

    // Create alerts
    for (const alertData of alerts) {
      try {
        await Alert.createAlert(alertData);
      } catch (error) {
        logger.error('Failed to create social media alert:', error);
      }
    }

    logger.info(`Created ${alerts.length} social media alerts for user ${user.email}`);
  }
}

const socialMediaMonitoringService = new SocialMediaMonitoringService();

module.exports = { socialMediaMonitoringService }; 