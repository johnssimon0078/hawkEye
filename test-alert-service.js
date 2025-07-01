const mongoose = require('mongoose');
require('dotenv').config();

// Import the AlertService
const { getAlertService } = require('./src/services/alertService');
const User = require('./src/models/User');
const Domain = require('./src/models/Domain');
const Alert = require('./src/models/Alert');

async function testAlertService() {
  try {
    console.log('🔧 Testing AlertService with Telegram Integration\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hawkeye_brand_protection');
    console.log('✅ Connected to MongoDB');
    
    // Get the AlertService instance
    const alertService = getAlertService();
    console.log('✅ AlertService initialized');
    
    // Find a user (or create one if needed)
    let user = await User.findOne({ email: 'johnsons@rapyd.net' });
    if (!user) {
      console.log('❌ User not found. Please create a user first through the dashboard.');
      return;
    }
    
    console.log(`✅ Found user: ${user.email}`);
    
    // Check if user has Telegram configured
    if (!user.telegramChatId) {
      console.log('⚠️  User does not have Telegram chat ID configured');
      console.log('   Please configure Telegram in the dashboard first');
      return;
    }
    
    console.log(`✅ User has Telegram chat ID: ${user.telegramChatId}`);
    
    // Create a mock alert with valid fields
    const mockAlert = new Alert({
      userId: user._id,
      type: 'dark_web_mention',
      severity: 'high',
      title: 'Mock Dark Web Exposure Detected',
      message: 'This is a test alert to verify Telegram notifications are working properly.',
      source: 'Dark Web Marketplace',
      sourceUrl: 'https://darkweb.example.com/listing/123',
      metadata: {
        domain: 'example.com',
        riskLevel: 'Critical',
        detectedAt: new Date(),
        tags: ['test', 'telegram', 'alert']
      },
      status: 'new',
      createdAt: new Date()
    });
    
    await mockAlert.save();
    console.log('✅ Mock alert created in database');
    
    // Process the alert (this should trigger Telegram notification)
    console.log('📤 Sending alert through AlertService...');
    await alertService.processAlert(mockAlert);
    
    console.log('✅ Alert processing completed');
    console.log('📱 Check your Telegram chat for the notification');
    
    // Clean up the test alert
    await Alert.findByIdAndDelete(mockAlert._id);
    console.log('🧹 Test alert cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testAlertService(); 