const axios = require('axios');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function setupTelegramBot() {
  console.log('🤖 HawkEye Telegram Bot Setup');
  console.log('═'.repeat(40));
  
  console.log('\n📋 Steps to create a Telegram bot:');
  console.log('1. Open Telegram and search for @BotFather');
  console.log('2. Send /newbot to BotFather');
  console.log('3. Choose a name for your bot (e.g., "HawkEye Security Bot")');
  console.log('4. Choose a username ending with "bot" (e.g., "hawkeye_security_bot")');
  console.log('5. Copy the bot token that BotFather gives you');
  
  console.log('\n⚠️  Current bot token in .env appears invalid');
  console.log('Current token:', process.env.TELEGRAM_BOT_TOKEN ? 
    process.env.TELEGRAM_BOT_TOKEN.substring(0, 10) + '...' : 'Not set');
  
  const newToken = await question('\n🔑 Enter your new bot token: ');
  
  if (!newToken || newToken.length < 20) {
    console.log('❌ Invalid token. Please try again with a proper bot token.');
    rl.close();
    return;
  }
  
  console.log('\n🧪 Testing bot token...');
  
  try {
    // Test the bot token
    const botInfo = await axios.get(`https://api.telegram.org/bot${newToken}/getMe`);
    
    if (botInfo.data.ok) {
      console.log('✅ Bot token is valid!');
      console.log(`🤖 Bot name: ${botInfo.data.result.first_name}`);
      console.log(`📝 Bot username: @${botInfo.data.result.username}`);
      
      // Update .env file
      const fs = require('fs');
      let envContent = fs.readFileSync('.env', 'utf8');
      
      // Replace or add TELEGRAM_BOT_TOKEN
      if (envContent.includes('TELEGRAM_BOT_TOKEN=')) {
        envContent = envContent.replace(/TELEGRAM_BOT_TOKEN=.*/, `TELEGRAM_BOT_TOKEN=${newToken}`);
      } else {
        envContent += `\nTELEGRAM_BOT_TOKEN=${newToken}`;
      }
      
      fs.writeFileSync('.env', envContent);
      console.log('✅ Updated .env file with new bot token');
      
      // Get chat ID
      console.log('\n📱 Now we need your chat ID:');
      console.log('1. Send any message to your bot in Telegram');
      console.log(`2. Go to: https://t.me/${botInfo.data.result.username}`);
      console.log('3. Send any message (like "hello")');
      
      await question('\nPress Enter after you\'ve sent a message to your bot...');
      
      // Try to get chat ID
      try {
        const updates = await axios.get(`https://api.telegram.org/bot${newToken}/getUpdates`);
        
        if (updates.data.result && updates.data.result.length > 0) {
          const latestUpdate = updates.data.result[updates.data.result.length - 1];
          const chatId = latestUpdate.message.chat.id;
          
          console.log(`✅ Found your chat ID: ${chatId}`);
          
          // Update .env with chat ID
          if (envContent.includes('TEST_TELEGRAM_CHAT_ID=')) {
            envContent = envContent.replace(/TEST_TELEGRAM_CHAT_ID=.*/, `TEST_TELEGRAM_CHAT_ID=${chatId}`);
          } else {
            envContent += `\nTEST_TELEGRAM_CHAT_ID=${chatId}`;
          }
          
          fs.writeFileSync('.env', envContent);
          console.log('✅ Updated .env file with your chat ID');
          
          // Send test message
          console.log('\n🧪 Sending test message...');
          await axios.post(`https://api.telegram.org/bot${newToken}/sendMessage`, {
            chat_id: chatId,
            text: '🎉 HawkEye Telegram bot is now configured!\n\n✅ Your bot is ready to send security alerts.',
            parse_mode: 'HTML'
          });
          
          console.log('✅ Test message sent! Check your Telegram.');
          
        } else {
          console.log('⚠️  No messages found. Please send a message to your bot first.');
          console.log('You can manually add your chat ID to .env as TEST_TELEGRAM_CHAT_ID=your_chat_id');
        }
        
      } catch (error) {
        console.log('⚠️  Could not automatically get chat ID.');
        console.log('Please manually add your chat ID to .env as TEST_TELEGRAM_CHAT_ID=your_chat_id');
      }
      
      console.log('\n🎉 Telegram bot setup complete!');
      console.log('You can now run the end-to-end test again.');
      
    } else {
      console.log('❌ Bot token test failed:', botInfo.data);
    }
    
  } catch (error) {
    console.log('❌ Bot token is invalid:', error.response?.data?.description || error.message);
    console.log('Please check your token and try again.');
  }
  
  rl.close();
}

// Run setup
setupTelegramBot().catch(console.error); 