const mongoose = require('mongoose');
const Domain = require('./src/models/Domain');
const User = require('./src/models/User');
const DomainMonitoringService = require('./src/services/domainMonitoringService');
const logger = require('./src/config/logger');

async function testDomainMonitoringWithSetup() {
  try {
    console.log('🔍 Testing Domain Monitoring Service with Setup...\n');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost/hawkeye');
    console.log('✅ Connected to MongoDB');
    
    // Find or create a test user
    let user = await User.findOne({ email: 'johnsons@rapyd.net' });
    if (!user) {
      console.log('❌ Test user not found. Please register first.');
      return;
    }
    console.log(`✅ Found test user: ${user.email}`);
    
    // Add test domains
    const testDomains = [
      { name: 'example.com', status: 'active' },
      { name: 'google.com', status: 'active' },
      { name: 'github.com', status: 'active' }
    ];
    
    console.log('\n📝 Adding test domains...');
    const addedDomains = [];
    
    for (const testDomain of testDomains) {
      try {
        // Check if domain already exists
        let domain = await Domain.findOne({ name: testDomain.name });
        
        if (!domain) {
          domain = new Domain({
            name: testDomain.name,
            userId: user._id,
            status: testDomain.status,
            monitoringEnabled: true,
            lastScanned: null,
            scanFrequency: '6h'
          });
          await domain.save();
          console.log(`✅ Added domain: ${testDomain.name}`);
        } else {
          console.log(`ℹ️  Domain already exists: ${testDomain.name}`);
        }
        
        addedDomains.push(domain);
      } catch (error) {
        console.log(`❌ Error adding domain ${testDomain.name}: ${error.message}`);
      }
    }
    
    if (addedDomains.length === 0) {
      console.log('❌ No domains available for testing.');
      return;
    }
    
    console.log(`\n📊 Total domains available: ${addedDomains.length}`);
    
    // Test domain monitoring service
    console.log('\n🔍 Testing domain monitoring for each domain...\n');
    
    const domainMonitoringService = new DomainMonitoringService();
    
    for (const domain of addedDomains) {
      console.log(`\n📡 Monitoring domain: ${domain.name}`);
      
      try {
        // Test the monitoring function
        const results = await domainMonitoringService.monitorDomain(domain);
        
        console.log(`✅ Monitoring completed for ${domain.name}`);
        console.log(`   - DNS Records: ${results.dnsRecords ? results.dnsRecords.length : 0} found`);
        console.log(`   - SSL Certificate: ${results.sslCertificate ? 'Valid' : 'Invalid/None'}`);
        console.log(`   - WHOIS Info: ${results.whoisInfo ? 'Retrieved' : 'Failed'}`);
        console.log(`   - IP Address: ${results.ipAddress || 'N/A'}`);
        console.log(`   - Status: ${results.status || 'Unknown'}`);
        
        if (results.alerts && results.alerts.length > 0) {
          console.log(`   - Alerts Generated: ${results.alerts.length}`);
          results.alerts.forEach(alert => {
            console.log(`     * ${alert.type}: ${alert.description}`);
          });
        } else {
          console.log(`   - Alerts Generated: 0`);
        }
        
        // Update domain with scan results
        domain.lastScanned = new Date();
        domain.lastScanResults = results;
        await domain.save();
        console.log(`   - Domain updated with scan results`);
        
      } catch (error) {
        console.log(`❌ Error monitoring ${domain.name}: ${error.message}`);
      }
    }
    
    // Test bulk monitoring
    console.log('\n🔄 Testing bulk domain monitoring...');
    try {
      const bulkResults = await domainMonitoringService.monitorAllDomains();
      console.log(`✅ Bulk monitoring completed`);
      console.log(`   - Domains processed: ${bulkResults.length}`);
      console.log(`   - Successful: ${bulkResults.filter(r => !r.error).length}`);
      console.log(`   - Failed: ${bulkResults.filter(r => r.error).length}`);
    } catch (error) {
      console.log(`❌ Bulk monitoring error: ${error.message}`);
    }
    
    // Show final domain status
    console.log('\n📊 Final domain status:');
    const finalDomains = await Domain.find({ userId: user._id });
    finalDomains.forEach(domain => {
      console.log(`   - ${domain.name}: ${domain.status} (Last scanned: ${domain.lastScanned ? domain.lastScanned.toISOString() : 'Never'})`);
    });
    
    console.log('\n🎉 Domain monitoring test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the test
testDomainMonitoringWithSetup(); 