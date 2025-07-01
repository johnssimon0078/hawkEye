const mongoose = require('mongoose');
const { getAlertService } = require('./src/services/alertService');
const logger = require('./src/config/logger');
require('dotenv').config();

async function testProductionAlertProcessing() {
  console.log('🔄 Testing alert processing on production environment...');
  console.log('🌐 Production URL: http://142.93.220.233:3000');
  
  try {
    // Connect to production MongoDB
    console.log('🔌 Connecting to production MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to production MongoDB');

    // Check current alerts
    const Alert = require('./src/models/Alert');
    const pendingAlerts = await Alert.find({ status: 'new' }).limit(5);
    console.log(`📊 Found ${pendingAlerts.length} pending alerts`);

    if (pendingAlerts.length > 0) {
      console.log('📋 Sample pending alerts:');
      pendingAlerts.forEach((alert, index) => {
        console.log(`  ${index + 1}. ${alert.title} (${alert.severity}) - ${alert.createdAt}`);
      });
    }

    // Process pending alerts
    console.log('\n🔄 Processing pending alerts...');
    const alertService = getAlertService();
    await alertService.processPendingAlerts();
    console.log('✅ Alert processing completed successfully');

    // Check processed alerts
    const processedAlerts = await Alert.find({
      'actions.action': 'notifications_sent'
    }).limit(5).sort({ updatedAt: -1 });

    if (processedAlerts.length > 0) {
      console.log('\n🎉 Recently processed alerts with notifications:');
      processedAlerts.forEach((alert, index) => {
        const notificationAction = alert.actions.find(action => 
          action.action === 'notifications_sent'
        );
        if (notificationAction) {
          console.log(`  ${index + 1}. ${alert.title}`);
          console.log(`     📧 Sent via: ${notificationAction.description}`);
          console.log(`     🕐 Processed: ${notificationAction.timestamp}`);
        }
      });
    } else {
      console.log('⚠️  No alerts have been processed with notifications yet');
    }

    // Check user configurations
    const User = require('./src/models/User');
    const usersWithTelegram = await User.find({
      telegramChatId: { $exists: true, $ne: null }
    }).select('email telegramChatId preferences.telegramNotifications');

    console.log('\n👥 Users with Telegram configuration:');
    usersWithTelegram.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email}`);
      console.log(`     📱 Chat ID: ${user.telegramChatId}`);
      console.log(`     🔔 Notifications: ${user.preferences?.telegramNotifications ? 'ON' : 'OFF'}`);
    });

  } catch (error) {
    console.error('❌ Production alert processing failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the production test
testProductionAlertProcessing(); 