const mongoose = require('mongoose');
const { getAlertService } = require('./src/services/alertService');
const logger = require('./src/config/logger');
require('dotenv').config();

async function testAlertProcessingWithConnection() {
  console.log('🔄 Testing alert processing with proper MongoDB connection...');
  
  try {
    // Connect to MongoDB first
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Now test alert processing
    console.log('🔄 Processing pending alerts...');
    const alertService = getAlertService();
    await alertService.processPendingAlerts();
    console.log('✅ Alert processing completed successfully');

    // Check if any alerts were processed
    const Alert = require('./src/models/Alert');
    const processedAlerts = await Alert.find({
      title: 'HawkEye E2E Test Alert',
      'actions.action': 'notifications_sent'
    });

    if (processedAlerts.length > 0) {
      console.log('🎉 Found processed alerts with notifications sent!');
      processedAlerts.forEach(alert => {
        const notificationAction = alert.actions.find(action => 
          action.action === 'notifications_sent'
        );
        if (notificationAction) {
          console.log(`📧 Notifications sent via: ${notificationAction.description}`);
        }
      });
    } else {
      console.log('⚠️  No alerts were processed yet');
    }

  } catch (error) {
    console.error('❌ Alert processing failed:', error.message);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the test
testAlertProcessingWithConnection(); 