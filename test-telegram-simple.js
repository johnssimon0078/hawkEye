const axios = require('axios');
require('dotenv').config();

async function testTelegramSimple() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  console.log('🔧 Simple Telegram Test\n');
  
  if (!botToken) {
    console.log('❌ TELEGRAM_BOT_TOKEN not found in environment variables');
    console.log('Please add your bot token to the .env file');
    return;
  }
  
  if (!chatId) {
    console.log('❌ TELEGRAM_CHAT_ID not found in environment variables');
    console.log('Please add your chat ID to the .env file');
    return;
  }
  
  console.log('✅ Bot token found');
  console.log('✅ Chat ID found');
  
  const testMessage = `🚨 **HawkEye Test Alert** 🚨

**Domain:** test-example.com
**Threat Type:** Test Alert
**Severity:** High
**Description:** This is a test alert to verify Telegram notifications are working

**Details:**
- Test Time: ${new Date().toISOString()}
- Test Type: Simple Verification
- Status: Testing

If you receive this message, Telegram integration is working correctly! 🎉`;

  try {
    console.log('📤 Sending test message...');
    
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: testMessage,
      parse_mode: 'Markdown'
    });
    
    if (response.data.ok) {
      console.log('✅ Test message sent successfully!');
      console.log('📱 Check your Telegram for the test message');
    } else {
      console.log('❌ Failed to send message:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Error sending Telegram message:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testTelegramSimple(); 