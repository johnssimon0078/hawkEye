const mongoose = require('mongoose');
require('dotenv').config();

// Import services and models
const { domainMonitoringService } = require('./src/services/domainMonitoringService');
const { getAlertService } = require('./src/services/alertService');
const User = require('./src/models/User');
const Domain = require('./src/models/Domain');
const Alert = require('./src/models/Alert');

async function testScreenshotIntegration() {
  try {
    console.log('🔧 Testing Screenshot Integration with Brand Abuse Detection\n');
    
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
    
    // Test domains that are likely to trigger brand abuse detection
    const testDomains = [
      'paypal-login-secure.com',
      'amaz0n-support.com',
      'google-login-verify.net',
      'facebook-login-secure.com',
      'apple-id-verify.net'
    ];
    
    console.log(`\n📊 Testing ${testDomains.length} suspicious domains...\n`);
    
    for (const domainName of testDomains) {
      console.log(`\n🔍 Testing domain: ${domainName}`);
      
      try {
        // Create a mock domain object for testing
        const mockDomain = {
          _id: new mongoose.Types.ObjectId(),
          domain: domainName,
          userId: user._id,
          status: 'active',
          monitoringEnabled: true,
          addMonitoringRecord: async (status, timestamp) => {
            console.log(`   - Monitoring record: ${status} at ${timestamp}`);
          },
          addAlert: async (type, message, severity) => {
            console.log(`   - Alert: ${type} - ${message} (${severity})`);
          }
        };
        
        // Test the domain monitoring with screenshot capture
        const results = await domainMonitoringService.analyzeDomain(mockDomain);
        
        console.log(`✅ Analysis completed for ${domainName}`);
        console.log(`   - WHOIS Data: ${results.whois ? 'Retrieved' : 'Failed'}`);
        console.log(`   - DNS Data: ${results.dns ? 'Retrieved' : 'Failed'}`);
        console.log(`   - Threat Intelligence: ${results.threat ? results.threat.length : 0} threats found`);
        console.log(`   - Content Analysis: ${results.content ? 'Completed' : 'Failed'}`);
        console.log(`   - SSL Certificate: ${results.ssl ? 'Checked' : 'Failed'}`);
        
        // Check if brand abuse was detected
        if (results.threat && results.threat.length > 0) {
          const brandAbuseThreats = results.threat.filter(t => t.type === 'brand_abuse');
          if (brandAbuseThreats.length > 0) {
            console.log(`   🚨 Brand abuse detected: ${brandAbuseThreats.length} threats`);
            
            // Test screenshot capture
            console.log(`   📸 Capturing screenshot...`);
            const screenshotPath = await domainMonitoringService.captureScreenshot(domainName, 'brand_abuse');
            
            if (screenshotPath) {
              console.log(`   ✅ Screenshot captured: ${screenshotPath}`);
              
              // Create a test alert with screenshot
              const testAlert = new Alert({
                userId: user._id,
                type: 'brand_abuse',
                severity: 'high',
                title: `Brand Abuse Detected: ${domainName}`,
                message: `Suspicious domain detected that may be masquerading as a legitimate brand`,
                source: 'Domain Monitoring',
                sourceUrl: `http://${domainName}`,
                metadata: {
                  domain: domainName,
                  detectedAt: new Date(),
                  screenshotPath: screenshotPath,
                  hasScreenshot: true,
                  threatType: 'brand_abuse',
                  threatDescription: 'Domain appears to be masquerading as a legitimate brand'
                }
              });
              
              await testAlert.save();
              console.log(`   ✅ Test alert created with screenshot metadata`);
              
              // Process the alert to send Telegram notification with screenshot
              console.log(`   📱 Sending Telegram alert with screenshot...`);
              await alertService.processAlert(testAlert);
              console.log(`   ✅ Telegram alert with screenshot sent`);
              
            } else {
              console.log(`   ❌ Screenshot capture failed`);
            }
          } else {
            console.log(`   ✅ No brand abuse detected`);
          }
        } else {
          console.log(`   ✅ No threats detected`);
        }
        
      } catch (error) {
        console.log(`❌ Error testing ${domainName}: ${error.message}`);
      }
    }
    
    // Test 2: Manual screenshot capture test
    console.log('\n📸 Test 2: Manual Screenshot Capture Test');
    try {
      const testDomain = 'example.com';
      console.log(`   Capturing screenshot of ${testDomain}...`);
      
      const screenshotPath = await domainMonitoringService.captureScreenshot(testDomain, 'test');
      
      if (screenshotPath) {
        console.log(`   ✅ Manual screenshot captured: ${screenshotPath}`);
        
        // Create test alert with manual screenshot
        const manualAlert = new Alert({
          userId: user._id,
          type: 'test_screenshot',
          severity: 'medium',
          title: `Test Screenshot: ${testDomain}`,
          message: `This is a test alert with manual screenshot capture`,
          source: 'Manual Test',
          sourceUrl: `http://${testDomain}`,
          metadata: {
            domain: testDomain,
            detectedAt: new Date(),
            screenshotPath: screenshotPath,
            hasScreenshot: true,
            testType: 'manual_screenshot'
          }
        });
        
        await manualAlert.save();
        console.log(`   ✅ Manual test alert created`);
        
        // Send via Telegram
        console.log(`   📱 Sending manual test via Telegram...`);
        await alertService.processAlert(manualAlert);
        console.log(`   ✅ Manual test sent via Telegram`);
        
      } else {
        console.log(`   ❌ Manual screenshot capture failed`);
      }
      
    } catch (error) {
      console.error(`❌ Manual screenshot test failed:`, error.message);
    }
    
    console.log('\n🎉 Screenshot integration test completed!');
    console.log('\n📱 Check your Telegram for notifications:');
    console.log('- You should have received alerts with screenshots');
    console.log('- Each alert should include a photo attachment');
    console.log('- The screenshots should show the suspicious domains');
    
    console.log('\n📁 Check the ./screenshots/ directory for captured images');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Close browser if it was opened
    if (domainMonitoringService.browser) {
      await domainMonitoringService.browser.close();
      console.log('🌐 Browser closed');
    }
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testScreenshotIntegration().catch(console.error); 