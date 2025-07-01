#!/usr/bin/env node

const axios = require('axios');
const { MongoClient } = require('mongodb');
const Redis = require('redis');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

console.log('🔍 Testing HawkEye Brand Protection Platform Installation...\n');

async function testDatabaseConnection() {
  console.log('📊 Testing MongoDB connection...');
  try {
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/hawkeye_brand_protection');
    await client.connect();
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log('✅ MongoDB connection successful');
    console.log(`   Collections found: ${collections.map(c => c.name).join(', ')}`);
    await client.close();
    return true;
  } catch (error) {
    console.log('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

async function testRedisConnection() {
  console.log('🔴 Testing Redis connection...');
  try {
    const client = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    await client.connect();
    await client.ping();
    console.log('✅ Redis connection successful');
    await client.disconnect();
    return true;
  } catch (error) {
    console.log('❌ Redis connection failed:', error.message);
    return false;
  }
}

async function testAPIServer() {
  console.log('🌐 Testing API server...');
  try {
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    if (response.status === 200) {
      console.log('✅ API server is running');
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Environment: ${response.data.environment}`);
      console.log(`   Uptime: ${Math.round(response.data.uptime)}s`);
      return true;
    } else {
      console.log('❌ API server returned unexpected status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ API server connection failed:', error.message);
    return false;
  }
}

async function testAuthentication() {
  console.log('🔐 Testing authentication endpoints...');
  try {
    // Test registration
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      username: 'testuser',
      email: 'test@hawkeye.com',
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User'
    });
    
    if (registerResponse.data.success) {
      console.log('✅ User registration successful');
      
      // Test login
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'test@hawkeye.com',
        password: 'testpassword123'
      });
      
      if (loginResponse.data.success) {
        console.log('✅ User login successful');
        return true;
      } else {
        console.log('❌ User login failed');
        return false;
      }
    } else {
      console.log('❌ User registration failed');
      return false;
    }
  } catch (error) {
    if (error.response && error.response.status === 409) {
      console.log('⚠️  Test user already exists, testing login...');
      try {
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
          email: 'test@hawkeye.com',
          password: 'testpassword123'
        });
        
        if (loginResponse.data.success) {
          console.log('✅ User login successful');
          return true;
        } else {
          console.log('❌ User login failed');
          return false;
        }
      } catch (loginError) {
        console.log('❌ User login failed:', loginError.message);
        return false;
      }
    } else {
      console.log('❌ Authentication test failed:', error.message);
      return false;
    }
  }
}

async function testProtectedEndpoints() {
  console.log('🛡️  Testing protected endpoints...');
  try {
    // First login to get token
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'test@hawkeye.com',
      password: 'testpassword123'
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed for protected endpoint test');
      return false;
    }
    
    const token = loginResponse.data.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    
    // Test dashboard endpoint
    const dashboardResponse = await axios.get(`${BASE_URL}/api/dashboard/overview`, { headers });
    if (dashboardResponse.data.success) {
      console.log('✅ Dashboard endpoint accessible');
    } else {
      console.log('❌ Dashboard endpoint failed');
      return false;
    }
    
    // Test domains endpoint
    const domainsResponse = await axios.get(`${BASE_URL}/api/domains`, { headers });
    if (domainsResponse.data.success) {
      console.log('✅ Domains endpoint accessible');
    } else {
      console.log('❌ Domains endpoint failed');
      return false;
    }
    
    // Test alerts endpoint
    const alertsResponse = await axios.get(`${BASE_URL}/api/alerts`, { headers });
    if (alertsResponse.data.success) {
      console.log('✅ Alerts endpoint accessible');
    } else {
      console.log('❌ Alerts endpoint failed');
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('❌ Protected endpoints test failed:', error.message);
    return false;
  }
}

async function runTests() {
  const results = {
    database: await testDatabaseConnection(),
    redis: await testRedisConnection(),
    api: await testAPIServer(),
    auth: await testAuthentication(),
    protected: false
  };
  
  // Only test protected endpoints if auth works
  if (results.auth) {
    results.protected = await testProtectedEndpoints();
  }
  
  console.log('\n📋 Test Results Summary:');
  console.log('========================');
  console.log(`Database Connection: ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Redis Connection: ${results.redis ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`API Server: ${results.api ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Authentication: ${results.auth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Protected Endpoints: ${results.protected ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! HawkEye is ready to use.');
    console.log('\n📖 Next steps:');
    console.log('   1. Access the API at: http://localhost:3000/api');
    console.log('   2. Use the default admin account: admin@hawkeye.com / admin123');
    console.log('   3. Check the API documentation: API_DOCUMENTATION.md');
    console.log('   4. Review the README for more information');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the configuration:');
    console.log('   1. Ensure MongoDB is running');
    console.log('   2. Ensure Redis is running');
    console.log('   3. Check the .env file configuration');
    console.log('   4. Verify the application is started');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

runTests(); 