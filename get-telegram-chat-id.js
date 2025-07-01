const axios = require('axios');
require('dotenv').config();

async function getTelegramChatId() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  console.log('🔧 Getting Telegram Chat ID\n');
  
  if (!botToken) {
    console.log('❌ TELEGRAM_BOT_TOKEN not found in environment variables');
    console.log('Please add your bot token to the .env file first');
    return;
  }
  
  console.log('✅ Bot token found');
  console.log('\n📋 Instructions:');
  console.log('1. Start a chat with your bot on Telegram');
  console.log('2. Send /start to your bot');
  console.log('3. Send any message to your bot');
  console.log('4. This script will show your chat ID');
  console.log('\n⏳ Waiting for messages... (Press Ctrl+C to stop)\n');
  
  let lastUpdateId = 0;
  
  while (true) {
    try {
      const response = await axios.get(`https://api.telegram.org/bot${botToken}/getUpdates`, {
        params: {
          offset: lastUpdateId + 1,
          timeout: 30
        }
      });
      
      if (response.data.ok && response.data.result.length > 0) {
        for (const update of response.data.result) {
          if (update.message) {
            const chatId = update.message.chat.id;
            const username = update.message.chat.username || update.message.chat.first_name || 'Unknown';
            const messageText = update.message.text || 'No text';
            
            console.log('📱 New message received:');
            console.log(`   From: ${username}`);
            console.log(`   Chat ID: ${chatId}`);
            console.log(`   Message: ${messageText}`);
            console.log('\n🎉 Your Chat ID is:', chatId);
            console.log('\n📝 Add this to your .env file:');
            console.log(`TELEGRAM_CHAT_ID=${chatId}`);
            console.log('\n✅ You can now run the monitoring tests!');
            
            return;
          }
          lastUpdateId = update.update_id;
        }
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('❌ Error getting updates:', error.message);
      break;
    }
  }
}

getTelegramChatId(); 