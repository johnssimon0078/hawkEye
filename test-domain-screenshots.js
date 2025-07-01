const puppeteer = require('puppeteer');
const { domainMonitoringService } = require('./src/services/domainMonitoringService');
const logger = require('./src/config/logger');

async function captureDomainScreenshots() {
  console.log('🔍 Starting Domain Screenshot Capture...\n');
  
  // Test domains that might be suspicious
  const testDomains = [
    'paypal-login-secure.com',
    'amaz0n-support.com',
    'google-login-secure.net',
    'facebook-login-verify.com',
    'apple-id-verify.net',
    'microsoft-support-secure.com',
    'netflix-login-verify.net',
    'spotify-premium-free.com',
    'instagram-verify-account.net',
    'twitter-verify-blue.com'
  ];
  
  let browser;
  
  try {
    // Launch browser
    console.log('🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: false, // Set to true for production
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log(`📊 Testing ${testDomains.length} suspicious domains...\n`);
    
    for (let i = 0; i < testDomains.length; i++) {
      const domain = testDomains[i];
      console.log(`\n📸 [${i + 1}/${testDomains.length}] Processing: ${domain}`);
      
      try {
        // Test domain monitoring logic
        const threats = domainMonitoringService.detectBasicThreats(domain);
        console.log(`   Threats detected: ${threats.length > 0 ? threats.join(', ') : 'None'}`);
        
        // Try to capture screenshot
        const page = await browser.newPage();
        
        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Set timeout
        page.setDefaultTimeout(30000);
        
        // Navigate to domain
        console.log(`   Navigating to http://${domain}...`);
        await page.goto(`http://${domain}`, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        // Wait a bit for any dynamic content
        await page.waitForTimeout(2000);
        
        // Take screenshot
        const screenshotPath = `./screenshots/${domain.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        await page.screenshot({ 
          path: screenshotPath,
          fullPage: true 
        });
        
        console.log(`   ✅ Screenshot saved: ${screenshotPath}`);
        
        // Get page title and basic info
        const title = await page.title();
        const url = page.url();
        console.log(`   Title: ${title}`);
        console.log(`   Final URL: ${url}`);
        
        await page.close();
        
      } catch (error) {
        console.log(`   ❌ Failed to process ${domain}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Domain screenshot capture completed!');
    console.log('📁 Check the ./screenshots/ directory for captured images');
    
  } catch (error) {
    console.error('❌ Error during screenshot capture:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🌐 Browser closed');
    }
  }
}

// Create screenshots directory if it doesn't exist
const fs = require('fs');
const path = require('path');

if (!fs.existsSync('./screenshots')) {
  fs.mkdirSync('./screenshots');
  console.log('📁 Created screenshots directory');
}

// Run the test
captureDomainScreenshots().catch(console.error); 