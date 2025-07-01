const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

// Import services and models
const { getAlertService } = require('./src/services/alertService');
const { startMonitoringServices } = require('./src/services/monitoringService');
const User = require('./src/models/User');
const Domain = require('./src/models/Domain');
const Alert = require('./src/models/Alert');

async function testMonitoringAndTelegram() {
  try {
    console.log('🔧 Testing Monitoring Service and Telegram Integration\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hawkeye_brand_protection');
    console.log('✅ Connected to MongoDB');
    
    // Get the AlertService instance
    const alertService = getAlertService();
    console.log('✅ AlertService initialized');
    
    // Find or create test user
    let user = await User.findOne({ email: 'johnsons@rapyd.net' });
    if (!user) {
      console.log('❌ Test user not found. Please create a user first.');
      return;
    }
    
    // Enable Telegram notifications for the user
    user.preferences = user.preferences || {};
    user.preferences.telegramNotifications = true;
    
    // Use environment chat ID or the user's actual chat ID
    const chatId = process.env.TELEGRAM_CHAT_ID || user.telegramChatId || '5583934084';
    user.telegramChatId = chatId;
    await user.save();
    console.log('✅ User Telegram notifications enabled');
    console.log(`📱 Using chat ID: ${chatId}`);
    
    if (!process.env.TELEGRAM_CHAT_ID) {
      console.log('⚠️  Warning: TELEGRAM_CHAT_ID not set in environment');
      console.log('   Run "node get-telegram-chat-id.js" to get your chat ID');
      console.log('   Then add it to your .env file');
    } else {
      console.log('✅ TELEGRAM_CHAT_ID found in environment');
    }
    
    // Find or create test domain
    let domain = await Domain.findOne({ domain: 'test-example.com', userId: user._id });
    if (!domain) {
      domain = new Domain({
        domain: 'test-example.com',
        userId: user._id,
        status: 'active',
        monitoringType: 'all',
        riskLevel: 'medium'
      });
      await domain.save();
      console.log('✅ Test domain created');
    } else {
      console.log('✅ Test domain found');
    }
    
    // Test 1: Direct Telegram Alert
    console.log('\n📱 Test 1: Direct Telegram Alert');
    try {
      const testAlert = new Alert({
        userId: user._id,
        domainId: domain._id,
        type: 'dark_web_mention',
        severity: 'high',
        title: 'Test Dark Web Alert',
        message: 'Test alert: Domain found on dark web marketplace',
        source: 'Dark Web Marketplace',
        metadata: {
          domain: domain.domain,
          url: 'http://test-darkweb-marketplace.com',
          price: '$500',
          description: 'Test listing for brand protection testing'
        }
      });
      
      await testAlert.save();
      console.log('✅ Test alert created');
      
      // Process the alert
      await alertService.processAlert(testAlert);
      console.log('✅ Alert processed');
      
    } catch (error) {
      console.error('❌ Direct Telegram test failed:', error.message);
    }
    
    // Test 2: Mock Dark Web Monitoring
    console.log('\n🌐 Test 2: Mock Dark Web Monitoring');
    try {
      const mockDarkWebResult = {
        domain: domain.domain,
        source: 'Dark Web Forum',
        url: 'http://darkweb-forum.test/thread/123',
        description: 'Test brand exposure found on dark web forum',
        severity: 'medium',
        timestamp: new Date()
      };
      
      // Create alert from mock result
      const darkWebAlert = new Alert({
        userId: user._id,
        domainId: domain._id,
        type: 'dark_web_mention',
        severity: mockDarkWebResult.severity,
        title: 'Mock Dark Web Mention',
        message: `Domain found on ${mockDarkWebResult.source}: ${mockDarkWebResult.description}`,
        source: mockDarkWebResult.source,
        metadata: {
          domain: mockDarkWebResult.domain,
          url: mockDarkWebResult.url,
          timestamp: mockDarkWebResult.timestamp
        }
      });
      
      await darkWebAlert.save();
      await alertService.processAlert(darkWebAlert);
      console.log('✅ Dark web monitoring test completed');
      
    } catch (error) {
      console.error('❌ Dark web monitoring test failed:', error.message);
    }
    
    // Test 3: Mock Social Media Monitoring
    console.log('\n📱 Test 3: Mock Social Media Monitoring');
    try {
      const mockSocialResult = {
        domain: domain.domain,
        platform: 'Twitter',
        url: 'https://twitter.com/testuser/status/123456',
        content: 'Test brand mention on social media',
        sentiment: 'negative',
        severity: 'low',
        timestamp: new Date()
      };
      
      const socialAlert = new Alert({
        userId: user._id,
        domainId: domain._id,
        type: 'social_media_mention',
        severity: mockSocialResult.severity,
        title: 'Mock Social Media Mention',
        message: `Brand mentioned on ${mockSocialResult.platform}: ${mockSocialResult.content}`,
        source: mockSocialResult.platform,
        metadata: {
          domain: mockSocialResult.domain,
          url: mockSocialResult.url,
          sentiment: mockSocialResult.sentiment,
          timestamp: mockSocialResult.timestamp
        }
      });
      
      await socialAlert.save();
      await alertService.processAlert(socialAlert);
      console.log('✅ Social media monitoring test completed');
      
    } catch (error) {
      console.error('❌ Social media monitoring test failed:', error.message);
    }
    
    // Test 4: Mock Pastebin Monitoring
    console.log('\n📄 Test 4: Mock Pastebin Monitoring');
    try {
      const mockPastebinResult = {
        domain: domain.domain,
        pasteId: 'abc123',
        url: 'https://pastebin.com/abc123',
        content: 'Test data leak containing domain information',
        severity: 'critical',
        timestamp: new Date()
      };
      
      const pastebinAlert = new Alert({
        userId: user._id,
        domainId: domain._id,
        type: 'pastebin_mention',
        severity: mockPastebinResult.severity,
        title: 'Mock Pastebin Mention',
        message: `Domain found in Pastebin: ${mockPastebinResult.content}`,
        source: 'Pastebin',
        metadata: {
          domain: mockPastebinResult.domain,
          url: mockPastebinResult.url,
          pasteId: mockPastebinResult.pasteId,
          timestamp: mockPastebinResult.timestamp
        }
      });
      
      await pastebinAlert.save();
      await alertService.processAlert(pastebinAlert);
      console.log('✅ Pastebin monitoring test completed');
      
    } catch (error) {
      console.error('❌ Pastebin monitoring test failed:', error.message);
    }
    
    // Test 5: Mock Password Store Monitoring
    console.log('\n🔐 Test 5: Mock Password Store Monitoring');
    try {
      const mockPasswordResult = {
        domain: domain.domain,
        source: 'HaveIBeenPwned',
        breach: 'Test Data Breach 2024',
        records: 1000,
        severity: 'high',
        timestamp: new Date()
      };
      
      const passwordAlert = new Alert({
        userId: user._id,
        domainId: domain._id,
        type: 'password_breach',
        severity: mockPasswordResult.severity,
        title: 'Mock Password Breach',
        message: `Domain found in data breach: ${mockPasswordResult.breach}`,
        source: mockPasswordResult.source,
        metadata: {
          domain: mockPasswordResult.domain,
          breach: mockPasswordResult.breach,
          records: mockPasswordResult.records,
          timestamp: mockPasswordResult.timestamp
        }
      });
      
      await passwordAlert.save();
      await alertService.processAlert(passwordAlert);
      console.log('✅ Password store monitoring test completed');
      
    } catch (error) {
      console.error('❌ Password store monitoring test failed:', error.message);
    }
    
    // Test 6: Check Alert Statistics
    console.log('\n📊 Test 6: Alert Statistics');
    try {
      const stats = await alertService.getAlertStats(user._id);
      console.log('✅ Alert statistics:', {
        total: stats.total,
        new: stats.new,
        acknowledged: stats.acknowledged,
        resolved: stats.resolved
      });
    } catch (error) {
      console.error('❌ Alert statistics test failed:', error.message);
    }
    
    console.log('\n🎉 All tests completed!');
    console.log('\n📱 Check your Telegram for notifications:');
    console.log('- You should have received 5 test alerts');
    console.log('- Each alert should have different severity levels');
    console.log('- Alerts should include detailed information');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the test
testMonitoringAndTelegram(); 