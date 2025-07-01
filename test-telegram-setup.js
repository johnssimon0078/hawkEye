const axios = require('axios');
require('dotenv').config();

async function testTelegramSetup() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  console.log('🔧 Telegram Bot Setup Test\n');
  
  if (!botToken) {
    console.log('❌ TELEGRAM_BOT_TOKEN not found in environment variables');
    console.log('\n📝 To set up Telegram notifications:');
    console.log('1. Create a bot with @BotFather on Telegram');
    console.log('2. Get your bot token');
    console.log('3. Add TELEGRAM_BOT_TOKEN=your-bot-token to your .env file');
    console.log('4. Start a chat with your bot');
    console.log('5. Send /start to your bot');
    console.log('6. Get your chat ID using the method below');
    return;
  }
  
  console.log('✅ TELEGRAM_BOT_TOKEN found');
  
  // Test bot info
  try {
    const botInfo = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`);
    console.log('✅ Bot info retrieved successfully');
    console.log(`   Bot name: ${botInfo.data.result.first_name}`);
    console.log(`   Bot username: @${botInfo.data.result.username}`);
    console.log(`   Bot ID: ${botInfo.data.result.id}`);
  } catch (error) {
    console.log('❌ Failed to get bot info');
    console.log('   Error:', error.response?.data || error.message);
    return;
  }
  
  // Test getting updates (to find chat ID)
  try {
    const updates = await axios.get(`https://api.telegram.org/bot${botToken}/getUpdates`);
    console.log('\n📋 Recent bot interactions:');
    
    if (updates.data.result.length === 0) {
      console.log('   No recent interactions found');
      console.log('\n📝 To get your chat ID:');
      console.log('1. Start a chat with your bot (@your-bot-username)');
      console.log('2. Send /start to your bot');
      console.log('3. Run this test again to see your chat ID');
    } else {
      updates.data.result.forEach((update, index) => {
        if (update.message) {
          console.log(`   ${index + 1}. Chat ID: ${update.message.chat.id}`);
          console.log(`      From: ${update.message.from.first_name} (@${update.message.from.username || 'no username'})`);
          console.log(`      Message: ${update.message.text}`);
          console.log(`      Date: ${new Date(update.message.date * 1000).toLocaleString()}`);
          console.log('');
        }
      });
      
      // Use the first chat ID for testing
      const firstChatId = updates.data.result[0]?.message?.chat?.id;
      if (firstChatId) {
        console.log(`🎯 Using chat ID ${firstChatId} for test message`);
        
        const testMessage = `🧪 **Test Message** 🧪

This is a test message to verify that your Telegram bot is working correctly.

**Bot Setup Status:**
✅ Bot token configured
✅ Bot is active
✅ Chat connection established

**Next Steps:**
1. Add TELEGRAM_CHAT_ID=${firstChatId} to your .env file
2. Test alerts through the HawkEye dashboard

Timestamp: ${new Date().toISOString()}`;

        try {
          const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: firstChatId,
            text: testMessage,
            parse_mode: 'Markdown'
          });
          
          console.log('✅ Test message sent successfully!');
          console.log('📱 Check your Telegram chat for the test message');
          
        } catch (error) {
          console.log('❌ Failed to send test message');
          console.log('   Error:', error.response?.data || error.message);
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Failed to get bot updates');
    console.log('   Error:', error.response?.data || error.message);
  }
  
  console.log('\n📝 Environment Setup:');
  console.log('Add these to your .env file:');
  console.log(`TELEGRAM_BOT_TOKEN=${botToken}`);
  console.log('TELEGRAM_CHAT_ID=your-chat-id-from-above');
}

// Run the test
testTelegramSetup(); 