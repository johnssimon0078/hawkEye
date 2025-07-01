// Pure logic test for domain monitoring service
const fs = require('fs');
const path = require('path');

// Import the service instance (not the class)
const { domainMonitoringService } = require('./src/services/domainMonitoringService');

console.log('--- Pure Logic Test: Domain Monitoring Service ---');

// 1. Test detectBasicThreats
const testDomains = [
  'paypal-login-secure.com',
  'amaz0n-support.com',
  'thisisaverylongdomainnamethatisprobablyfake.com',
  'google.com',
  'rapyd.net'
];
console.log('\n[detectBasicThreats]');
testDomains.forEach(domain => {
  const threats = domainMonitoringService.detectBasicThreats(domain);
  console.log(`Domain: ${domain}`);
  console.log('Threats:', threats);
});

// 2. Test HTML content analysis helpers
const sampleHtml = `
<html>
<head>
  <title>Test Brand - Login</title>
  <meta name="description" content="This is a test login page for Brand.">
  <meta name="keywords" content="login,brand,secure,account">
</head>
<body>
  <h1>Welcome to Brand</h1>
  <p>Please enter your password to access your account.</p>
  <p>Never share your credit card or SSN.</p>
</body>
</html>
`;

console.log('\n[extractTitle]');
console.log('Title:', domainMonitoringService.extractTitle(sampleHtml));

console.log('\n[extractDescription]');
console.log('Description:', domainMonitoringService.extractDescription(sampleHtml));

console.log('\n[extractKeywords]');
console.log('Keywords:', domainMonitoringService.extractKeywords(sampleHtml));

console.log('\n[checkBrandMentions]');
console.log('Has brand mentions:', domainMonitoringService.checkBrandMentions(sampleHtml));

console.log('\n[checkSuspiciousContent]');
console.log('Has suspicious content:', domainMonitoringService.checkSuspiciousContent(sampleHtml));

console.log('\n--- End of Pure Logic Test ---'); 