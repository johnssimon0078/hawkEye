const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

// Get bot info and setup instructions
router.get('/bot-info', authMiddleware, async (req, res) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;

    if (!botToken) {
      return res.status(400).json({
        success: false,
        message: 'Telegram bot token not configured'
      });
    }

    // Get bot info from Telegram API
    const botInfoResponse = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`);
    const botInfo = botInfoResponse.data.result;

    res.json({
      success: true,
      data: {
        botInfo,
        setupInstructions: {
          step1: `Start a conversation with @${botInfo.username}`,
          step2: 'Send /start to the bot',
          step3: 'The bot will provide you with a unique chat ID',
          step4: 'Use that chat ID to configure your notifications'
        }
      }
    });
  } catch (error) {
    logger.error('Error getting bot info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bot information'
    });
  }
});

// Set user's Telegram chat ID
router.post('/set-chat-id', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.body;
    const userId = req.user.id;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID is required'
      });
    }

    // Verify the chat ID is valid by sending a test message
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(400).json({
        success: false,
        message: 'Telegram bot token not configured'
      });
    }

    try {
      // Send a test message to verify the chat ID
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: '✅ Your Telegram notifications are now connected to HawkEye! You will receive security alerts here.',
        parse_mode: 'HTML'
      });
    } catch (error) {
      logger.error('Error sending test message:', error);
      return res.status(400).json({
        success: false,
        message: 'Invalid chat ID or bot not authorized. Please make sure you have started a conversation with the bot.'
      });
    }

    // Update user's Telegram chat ID
    await User.findByIdAndUpdate(userId, {
      telegramChatId: chatId,
      'preferences.telegramNotifications': true
    });

    res.json({
      success: true,
      message: 'Telegram chat ID set successfully. You will now receive alerts via Telegram.'
    });
  } catch (error) {
    logger.error('Error setting chat ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set chat ID'
    });
  }
});

// Toggle Telegram notifications
router.post('/toggle-notifications', authMiddleware, async (req, res) => {
  try {
    const { enabled } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user.telegramChatId) {
      return res.status(400).json({
        success: false,
        message: 'Please set up your Telegram chat ID first'
      });
    }

    await User.findByIdAndUpdate(userId, {
      'preferences.telegramNotifications': enabled
    });

    res.json({
      success: true,
      message: `Telegram notifications ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    logger.error('Error toggling notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle notifications'
    });
  }
});

// Get user's Telegram settings
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('telegramChatId preferences.telegramNotifications');

    res.json({
      success: true,
      data: {
        chatId: user.telegramChatId,
        notificationsEnabled: user.preferences?.telegramNotifications || false,
        isConfigured: !!user.telegramChatId
      }
    });
  } catch (error) {
    logger.error('Error getting Telegram settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Telegram settings'
    });
  }
});

// Remove Telegram integration
router.delete('/remove', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    await User.findByIdAndUpdate(userId, {
      telegramChatId: null,
      'preferences.telegramNotifications': false
    });

    res.json({
      success: true,
      message: 'Telegram integration removed successfully'
    });
  } catch (error) {
    logger.error('Error removing Telegram integration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove Telegram integration'
    });
  }
});

// Webhook endpoint for bot commands (optional - for future enhancements)
router.post('/webhook', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(200).json({ ok: true });
    }

    const { chat, text } = message;
    const chatId = chat.id;

    if (text === '/start') {
      const welcomeMessage = `
🦅 <b>Welcome to HawkEye Brand Protection Bot!</b>

This bot will send you security alerts from your HawkEye monitoring platform.

<b>To connect this chat to your HawkEye account:</b>
1. Log into your HawkEye dashboard
2. Go to Settings > Notifications
3. Enter this Chat ID: <code>${chatId}</code>
4. Enable Telegram notifications

<b>Commands:</b>
/start - Show this message
/help - Show help information
/status - Check connection status

<i>HawkEye Brand Protection Platform</i>
      `.trim();

      await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: welcomeMessage,
        parse_mode: 'HTML'
      });
    } else if (text === '/help') {
      const helpMessage = `
<b>HawkEye Bot Help</b>

This bot sends security alerts from your HawkEye monitoring platform.

<b>Setup:</b>
1. Use /start to get your Chat ID
2. Configure in your HawkEye dashboard
3. Enable Telegram notifications

<b>Features:</b>
• Real-time security alerts
• Severity-based notifications
• Domain monitoring alerts
• Dark web monitoring alerts

<i>For support, contact your HawkEye administrator</i>
      `.trim();

      await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: helpMessage,
        parse_mode: 'HTML'
      });
    } else if (text === '/status') {
      // Check if this chat ID is connected to any user
      const user = await User.findOne({ telegramChatId: chatId.toString() });
      
      if (user) {
        const statusMessage = `
<b>Connection Status: ✅ Connected</b>

Connected to: ${user.email}
Notifications: ${user.preferences?.telegramNotifications ? 'Enabled' : 'Disabled'}

<i>HawkEye Brand Protection Platform</i>
        `.trim();

        await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          chat_id: chatId,
          text: statusMessage,
          parse_mode: 'HTML'
        });
      } else {
        const statusMessage = `
<b>Connection Status: ❌ Not Connected</b>

This chat is not connected to any HawkEye account.

To connect:
1. Log into your HawkEye dashboard
2. Go to Settings > Notifications
3. Enter this Chat ID: <code>${chatId}</code>

<i>HawkEye Brand Protection Platform</i>
        `.trim();

        await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          chat_id: chatId,
          text: statusMessage,
          parse_mode: 'HTML'
        });
      }
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(200).json({ ok: true }); // Always return 200 to Telegram
  }
});

module.exports = router; 