const { domainMonitoringService } = require('./src/services/domainMonitoringService');
const logger = require('./src/config/logger');

async function testDomainMonitoringDirect() {
  try {
    console.log('🔍 Testing Domain Monitoring Service Directly...\n');
    
    // Test domains
    const testDomains = [
      'example.com',
      'google.com',
      'github.com',
      'rapyd.net'
    ];
    
    console.log(`📊 Testing ${testDomains.length} domains...\n`);
    
    for (const domainName of testDomains) {
      console.log(`\n📡 Monitoring domain: ${domainName}`);
      
      try {
        // Create a mock domain object
        const mockDomain = {
          name: domainName,
          domain: domainName, // Add this for compatibility
          userId: '507f1f77bcf86cd799439011', // Mock ObjectId
          status: 'active',
          monitoringEnabled: true,
          scanFrequency: '6h',
          addMonitoringRecord: async (status, timestamp) => {
            console.log(`   - Monitoring record: ${status} at ${timestamp}`);
          },
          addAlert: async (type, message, severity) => {
            console.log(`   - Alert: ${type} - ${message} (${severity})`);
          }
        };
        
        // Test the monitoring function
        const results = await domainMonitoringService.analyzeDomain(mockDomain);
        
        console.log(`✅ Monitoring completed for ${domainName}`);
        console.log(`   - WHOIS Data: ${results.whois ? 'Retrieved' : 'Failed'}`);
        console.log(`   - DNS Data: ${results.dns ? 'Retrieved' : 'Failed'}`);
        console.log(`   - Threat Intelligence: ${results.threat ? results.threat.length : 0} threats found`);
        console.log(`   - Content Analysis: ${results.content ? 'Completed' : 'Failed'}`);
        console.log(`   - SSL Certificate: ${results.ssl ? 'Checked' : 'Failed'}`);
        
        // Show detailed results
        if (results.whois) {
          console.log(`   - Registrar: ${results.whois.registrar || 'Unknown'}`);
          console.log(`   - Expiration: ${results.whois.expirationDate || 'Unknown'}`);
        }
        
        if (results.dns) {
          console.log(`   - A Records: ${results.dns.aRecords.length}`);
          console.log(`   - MX Records: ${results.dns.mxRecords.length}`);
          console.log(`   - TXT Records: ${results.dns.txtRecords.length}`);
        }
        
        if (results.threat && results.threat.length > 0) {
          console.log(`   - Threats Found:`);
          results.threat.forEach(threat => {
            console.log(`     * ${threat.type}: ${threat.description} (${threat.confidence}% confidence)`);
          });
        }
        
        if (results.content) {
          console.log(`   - Title: ${results.content.title || 'None'}`);
          console.log(`   - Brand Mentions: ${results.content.hasBrandMentions ? 'Yes' : 'No'}`);
          console.log(`   - Suspicious Content: ${results.content.hasSuspiciousContent ? 'Yes' : 'No'}`);
        }
        
        if (results.ssl) {
          console.log(`   - SSL Valid: ${results.ssl.isValid ? 'Yes' : 'No'}`);
          console.log(`   - SSL Issuer: ${results.ssl.issuer || 'Unknown'}`);
        }
        
      } catch (error) {
        console.log(`❌ Error monitoring ${domainName}: ${error.message}`);
        console.log(`   Stack: ${error.stack}`);
      }
    }
    
    // Test individual monitoring functions
    console.log('\n🔧 Testing individual monitoring functions...');
    
    try {
      console.log('\n📡 Testing DNS lookup...');
      const dnsResults = await domainMonitoringService.getDnsData('example.com');
      console.log(`   - DNS check completed: ${dnsResults ? 'Success' : 'Failed'}`);
      if (dnsResults) {
        console.log(`   - A Records: ${dnsResults.aRecords.length}`);
        console.log(`   - MX Records: ${dnsResults.mxRecords.length}`);
      }
      
      console.log('\n🔒 Testing SSL certificate...');
      const sslResults = await domainMonitoringService.checkSSL('example.com');
      console.log(`   - SSL check completed: ${sslResults ? 'Success' : 'Failed'}`);
      if (sslResults) {
        console.log(`   - SSL Valid: ${sslResults.isValid}`);
      }
      
      console.log('\n🌐 Testing WHOIS lookup...');
      const whoisResults = await domainMonitoringService.getWhoisData('example.com');
      console.log(`   - WHOIS check completed: ${whoisResults ? 'Success' : 'Failed'}`);
      if (whoisResults) {
        console.log(`   - Registrar: ${whoisResults.registrar || 'Unknown'}`);
      }
      
    } catch (error) {
      console.log(`❌ Error in individual tests: ${error.message}`);
    }
    
    console.log('\n🎉 Direct domain monitoring test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testDomainMonitoringDirect(); 