const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Simple threat detection logic (copied from domain monitoring service)
function detectBasicThreats(domain) {
  const threats = [];
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /login|secure|verify|support|account|id|premium|free/i,
    /[0-9]/g, // Numbers replacing letters
    /.{30,}/, // Very long domain names
    /google|facebook|paypal|amazon|apple|microsoft|netflix|spotify|instagram|twitter/i
  ];
  
  // Check for typosquatting patterns
  const commonBrands = ['google', 'facebook', 'paypal', 'amazon', 'apple', 'microsoft', 'netflix', 'spotify', 'instagram', 'twitter'];
  
  for (const brand of commonBrands) {
    if (domain.toLowerCase().includes(brand)) {
      threats.push('brand_abuse');
      break;
    }
  }
  
  // Check for suspicious keywords
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(domain)) {
      threats.push('suspicious_pattern');
      break;
    }
  }
  
  return threats;
}

async function captureDomainScreenshots() {
  console.log('🔍 Starting Simple Domain Screenshot Capture...\n');
  
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
    'twitter-verify-blue.com',
    'rapyd.net', // Your legitimate domain for comparison
    'example.com' // Another legitimate domain
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
    
    console.log(`📊 Testing ${testDomains.length} domains...\n`);
    
    for (let i = 0; i < testDomains.length; i++) {
      const domain = testDomains[i];
      console.log(`\n📸 [${i + 1}/${testDomains.length}] Processing: ${domain}`);
      
      try {
        // Test threat detection
        const threats = detectBasicThreats(domain);
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
        
        // Try to get some basic page content
        try {
          const bodyText = await page.evaluate(() => {
            return document.body ? document.body.innerText.substring(0, 200) : 'No body content';
          });
          console.log(`   Content preview: ${bodyText.substring(0, 100)}...`);
        } catch (e) {
          console.log(`   Content preview: Unable to extract`);
        }
        
        await page.close();
        
      } catch (error) {
        console.log(`   ❌ Failed to process ${domain}: ${error.message}`);
        
        // Still try to take a screenshot of the error page
        try {
          const page = await browser.newPage();
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
          
          await page.goto(`http://${domain}`, { 
            waitUntil: 'domcontentloaded',
            timeout: 10000 
          });
          
          const screenshotPath = `./screenshots/${domain.replace(/[^a-zA-Z0-9]/g, '_')}_error.png`;
          await page.screenshot({ 
            path: screenshotPath,
            fullPage: true 
          });
          
          console.log(`   📸 Error screenshot saved: ${screenshotPath}`);
          await page.close();
        } catch (screenshotError) {
          console.log(`   ❌ Could not capture error screenshot: ${screenshotError.message}`);
        }
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
if (!fs.existsSync('./screenshots')) {
  fs.mkdirSync('./screenshots');
  console.log('📁 Created screenshots directory');
}

// Run the test
captureDomainScreenshots().catch(console.error); 