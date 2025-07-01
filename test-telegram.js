const axios = require('axios');
require('dotenv').config();

async function sendMockTelegramAlert() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || '123456789'; // Replace with actual chat ID
  
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not found in environment variables');
    return;
  }
  
  const message = `🚨 **Mock Security Alert** 🚨

**Domain:** example.com
**Threat Type:** Dark Web Exposure
**Severity:** High
**Description:** Test alert to verify Telegram notifications are working

**Details:**
- Found on: Dark Web Marketplace
- Risk Level: Critical
- Timestamp: ${new Date().toISOString()}

This is a test alert to verify that Telegram notifications are properly configured and working.`;

  try {
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    });
    
    console.log('✅ Mock Telegram alert sent successfully!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('❌ Failed to send mock Telegram alert:');
    console.error('Error:', error.response?.data || error.message);
  }
}

// Run the test
sendMockTelegramAlert(); 