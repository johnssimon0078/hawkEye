const axios = require('axios');
const { MongoClient } = require('mongodb');
require('dotenv').config();

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USER = {
  firstName: 'Test',
  lastName: 'User',
  email: 'testuser@hawkeye-demo.com',
  password: 'TestPassword123!',
  telegramChatId: process.env.TEST_TELEGRAM_CHAT_ID || '123456789'
};

const TEST_DOMAIN = 'suspicious-example.com';
let authToken = '';
let userId = '';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper functions
async function makeRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: { 'Content-Type': 'application/json' }
    };

    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (data) config.data = data;

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

function wait(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// Test steps
async function testUserRegistration() {
  log('\n📋 STEP 1: User Registration', 'cyan');
  
  const result = await makeRequest('POST', '/api/auth/register', {
    firstName: TEST_USER.firstName,
    lastName: TEST_USER.lastName,
    email: TEST_USER.email,
    password: TEST_USER.password,
    company: 'HawkEye Test Company',
    role: 'user'
  });

  if (result.success) {
    log(`✅ User registered: ${TEST_USER.email}`, 'green');
    userId = result.data.data.user._id;
    return true;
  } else {
    log(`❌ Registration failed: ${JSON.stringify(result.error)}`, 'red');
    return false;
  }
}

async function testUserLogin() {
  log('\n📋 STEP 2: User Login', 'cyan');
  
  const result = await makeRequest('POST', '/api/auth/login', {
    email: TEST_USER.email,
    password: TEST_USER.password
  });

  if (result.success && result.data.data.token) {
    authToken = result.data.data.token;
    log('✅ User logged in successfully', 'green');
    return true;
  } else {
    log(`❌ Login failed: ${JSON.stringify(result.error)}`, 'red');
    return false;
  }
}

async function updateUserPreferences() {
  log('\n📋 STEP 3: Update User Preferences', 'cyan');
  
  const result = await makeRequest('PUT', '/api/auth/profile', {
    preferences: {
      emailNotifications: true,
      alertFrequency: 'immediate'
    }
  }, authToken);

  if (result.success) {
    log('✅ User preferences updated', 'green');
    return true;
  } else {
    log(`❌ Failed to update preferences: ${JSON.stringify(result.error)}`, 'red');
    return false;
  }
}

async function configureUserTelegram() {
  log('\n📋 STEP 4: Configure Telegram', 'cyan');
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    await db.collection('users').updateOne(
      { email: TEST_USER.email },
      {
        $set: {
          telegramChatId: TEST_USER.telegramChatId,
          'preferences.telegramNotifications': true
        }
      }
    );
    
    await client.close();
    log(`✅ Telegram configured: ${TEST_USER.telegramChatId}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Telegram config failed: ${error.message}`, 'red');
    return false;
  }
}

async function testAddDomain() {
  log('\n📋 STEP 5: Add Domain for Monitoring', 'cyan');
  
  const result = await makeRequest('POST', '/api/domains', {
    domain: TEST_DOMAIN,
    monitoringType: 'all',
    tags: ['test', 'suspicious'],
    notes: 'Test domain for end-to-end workflow verification'
  }, authToken);

  if (result.success) {
    log(`✅ Domain added: ${TEST_DOMAIN}`, 'green');
    return result.data.data.domain._id;
  } else {
    log(`❌ Failed to add domain: ${JSON.stringify(result.error)}`, 'red');
    return null;
  }
}

async function createTestAlert() {
  log('\n📋 STEP 6: Create Test Alert', 'cyan');
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    
    const testAlert = {
      userId: new (require('mongodb').ObjectId)(userId),
      type: 'threat_detected',
      severity: 'high',
      title: 'HawkEye E2E Test Alert',
      message: `🚨 Test threat detected on ${TEST_DOMAIN}! This is an automated end-to-end test to verify HawkEye is working correctly.`,
      source: 'E2E Test Suite',
      sourceUrl: `http://${TEST_DOMAIN}`,
      metadata: {
        domain: TEST_DOMAIN,
        confidence: 95,
        tags: ['test', 'verification', 'e2e']
      },
      status: 'new',
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const insertResult = await db.collection('alerts').insertOne(testAlert);
    await client.close();
    
    log(`✅ Test alert created: ${insertResult.insertedId}`, 'green');
    return insertResult.insertedId;
  } catch (error) {
    log(`❌ Failed to create alert: ${error.message}`, 'red');
    return null;
  }
}

async function verifyTelegramNotification() {
  log('\n📋 STEP 7: Verify Telegram Notification', 'cyan');
  
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    log('⚠️  TELEGRAM_BOT_TOKEN not configured', 'yellow');
    return false;
  }
  
  log('ℹ️  Waiting for alert processing...', 'blue');
  await wait(35); // Wait for alert processing
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    const processedAlert = await db.collection('alerts').findOne({
      userId: new (require('mongodb').ObjectId)(userId),
      title: 'HawkEye E2E Test Alert',
      'actions.action': 'notifications_sent'
    });
    
    await client.close();
    
    if (processedAlert) {
      log('✅ Alert processed and notifications sent!', 'green');
      
      const notificationAction = processedAlert.actions.find(action => 
        action.action === 'notifications_sent'
      );
      
      if (notificationAction) {
        log(`ℹ️  Channels: ${notificationAction.description}`, 'blue');
      }
      
      log('\n🔔 CHECK YOUR TELEGRAM NOW!', 'bright');
      log('You should see a message with:', 'bright');
      log('  • Title: HawkEye E2E Test Alert', 'blue');
      log('  • Severity: HIGH', 'blue');
      log(`  • Domain: ${TEST_DOMAIN}`, 'blue');
      log('  • Source: E2E Test Suite', 'blue');
      
      return true;
    } else {
      log('⚠️  Alert not processed yet or notifications not configured', 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Verification failed: ${error.message}`, 'red');
    return false;
  }
}

async function verifyDashboard() {
  log('\n📋 STEP 8: Verify Dashboard', 'cyan');
  
  try {
    const result = await makeRequest('GET', '/api/dashboard/overview', null, authToken);
    
    if (result.success) {
      const data = result.data.data;
      log('✅ Dashboard accessible', 'green');
      log(`ℹ️  Domains: ${data.domains.totalDomains || 0}`, 'blue');
      log(`ℹ️  Alerts: ${data.alerts.totalAlerts || 0}`, 'blue');
      log(`ℹ️  Critical: ${data.alerts.criticalAlerts || 0}`, 'blue');
      
      log('\n🌐 Dashboard URLs:', 'bright');
      log(`   ${BASE_URL}/dashboard`, 'blue');
      
      return true;
    } else {
      log(`❌ Dashboard failed: ${JSON.stringify(result.error)}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Dashboard error: ${error.message}`, 'red');
    return false;
  }
}

async function cleanupTestData() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    const user = await db.collection('users').findOne({ email: TEST_USER.email });
    
    if (user) {
      await db.collection('domains').deleteMany({ userId: user._id });
      await db.collection('alerts').deleteMany({ userId: user._id });
      await db.collection('users').deleteOne({ _id: user._id });
    }
    
    await client.close();
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Main test execution
async function runEndToEndTest() {
  log('\n🚀 HawkEye End-to-End Test', 'bright');
  log('═'.repeat(50), 'cyan');
  
  log('\n⚠️  PREREQUISITES:', 'yellow');
  log('1. HawkEye server running on localhost:3000', 'yellow');
  log('2. MongoDB and Redis accessible', 'yellow');
  log('3. TELEGRAM_BOT_TOKEN configured in .env', 'yellow');
  log('4. TEST_TELEGRAM_CHAT_ID set in .env', 'yellow');
  
  log('\nStarting in 3 seconds... (Ctrl+C to cancel)', 'blue');
  await wait(3);
  
  const results = {};
  
  try {
    // Cleanup first
    await cleanupTestData();
    
    // Run tests
    results.registration = await testUserRegistration();
    if (!results.registration) throw new Error('Registration failed');
    
    results.login = await testUserLogin();
    if (!results.login) throw new Error('Login failed');
    
    results.preferences = await updateUserPreferences();
    
    results.telegram = await configureUserTelegram();
    
    const domainId = await testAddDomain();
    results.domain = !!domainId;
    
    const alertId = await createTestAlert();
    results.alert = !!alertId;
    
    results.notification = await verifyTelegramNotification();
    results.dashboard = await verifyDashboard();
    
  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red');
  }
  
  // Results summary
  log('\n📊 RESULTS SUMMARY', 'cyan');
  log('═'.repeat(50), 'cyan');
  
  const tests = [
    { name: 'User Registration', result: results.registration },
    { name: 'User Login', result: results.login },
    { name: 'User Preferences', result: results.preferences },
    { name: 'Telegram Config', result: results.telegram },
    { name: 'Domain Addition', result: results.domain },
    { name: 'Alert Creation', result: results.alert },
    { name: 'Telegram Notification', result: results.notification },
    { name: 'Dashboard Access', result: results.dashboard }
  ];
  
  let passed = 0;
  tests.forEach((test, i) => {
    const status = test.result ? '✅ PASS' : '❌ FAIL';
    const color = test.result ? 'green' : 'red';
    log(`${i + 1}. ${test.name.padEnd(20)} ${status}`, color);
    if (test.result) passed++;
  });
  
  log('\n' + '═'.repeat(50), 'cyan');
  
  const score = `${passed}/${tests.length}`;
  if (passed === tests.length) {
    log(`🎉 ALL TESTS PASSED! (${score})`, 'green');
    log('HawkEye is working perfectly!', 'green');
  } else if (passed >= 6) {
    log(`⚠️  MOSTLY WORKING (${score})`, 'yellow');
  } else {
    log(`❌ MULTIPLE FAILURES (${score})`, 'red');
  }
  
  if (results.notification) {
    log('\n🔔 Don\'t forget to check your Telegram!', 'bright');
  }
  
  log('\n🏁 End-to-End Test Complete!', 'bright');
}

// Run if called directly
if (require.main === module) {
  runEndToEndTest().catch(error => {
    log(`\n💥 Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runEndToEndTest, TEST_USER, TEST_DOMAIN }; 