const mongoose = require('mongoose');
const Domain = require('./src/models/Domain');
const DomainMonitoringService = require('./src/services/domainMonitoringService');
const logger = require('./src/config/logger');

async function testDomainMonitoring() {
  try {
    console.log('🔍 Testing Domain Monitoring Service...\n');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost/hawkeye');
    console.log('✅ Connected to MongoDB');
    
    // Get all active domains
    const domains = await Domain.find({ status: 'active' });
    console.log(`📊 Found ${domains.length} active domains for monitoring`);
    
    if (domains.length === 0) {
      console.log('❌ No active domains found. Please add some domains first.');
      return;
    }
    
    // Display domains
    domains.forEach((domain, index) => {
      console.log(`${index + 1}. ${domain.name} (${domain.status})`);
    });
    
    // Test domain monitoring service
    console.log('\n🔍 Testing domain monitoring for each domain...\n');
    
    const domainMonitoringService = new DomainMonitoringService();
    
    for (const domain of domains) {
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
    
    console.log('\n🎉 Domain monitoring test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the test
testDomainMonitoring(); 