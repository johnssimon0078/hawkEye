# Telegram Setup Guide for HawkEye E2E Testing

This guide will help you set up Telegram notifications so you can test the complete end-to-end workflow.

## 📱 Step 1: Create a Telegram Bot

1. **Open Telegram** and search for `@BotFather`
2. **Start a chat** with BotFather
3. **Send the command**: `/newbot`
4. **Choose a name** for your bot (e.g., "HawkEye Test Bot")
5. **Choose a username** for your bot (must end with 'bot', e.g., "hawkeye_test_bot")
6. **Copy the bot token** - it looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

## 🆔 Step 2: Get Your Chat ID

### Method 1: Using the get-telegram-chat-id.js script

1. **Add your bot token** to your `.env` file:
   ```bash
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```

2. **Run the chat ID script**:
   ```bash
   node get-telegram-chat-id.js
   ```

3. **Send a message** to your bot in Telegram (any message)

4. **Check the script output** - it will show your chat ID

### Method 2: Manual method

1. **Send a message** to your bot in Telegram
2. **Visit this URL** in your browser (replace `YOUR_BOT_TOKEN`):
   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
3. **Look for the chat ID** in the JSON response under `message.chat.id`

## ⚙️ Step 3: Configure Environment Variables

Add these to your `.env` file:

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# For E2E Testing
TEST_TELEGRAM_CHAT_ID=987654321
```

## 🧪 Step 4: Run the End-to-End Test

```bash
node test-end-to-end-workflow.js
```

## 📋 What the Test Does

1. **Creates a test user** with Telegram notifications enabled
2. **Registers and logs in** the user
3. **Adds a domain** for monitoring
4. **Creates a test alert** with high severity
5. **Sends the alert** to your Telegram chat
6. **Verifies** the notification was sent

## 🔔 Expected Telegram Message

You should receive a message like this:

```
🚨 HawkEye Alert - HIGH SEVERITY

📧 Title: HawkEye E2E Test Alert
🔍 Type: threat_detected
📊 Severity: HIGH
🌐 Domain: suspicious-example.com
📍 Source: E2E Test Suite

💬 Message: 🚨 Test threat detected on suspicious-example.com! This is an automated end-to-end test to verify HawkEye is working correctly.

🕒 Created: [timestamp]
🆔 Alert ID: [alert_id]
```

## 🛠️ Troubleshooting

### Bot Token Issues
- Make sure the token is correct and complete
- Ensure there are no extra spaces in your `.env` file
- The bot token should be exactly as provided by BotFather

### Chat ID Issues
- Send at least one message to your bot before getting the chat ID
- Chat IDs are usually large numbers (positive or negative)
- Make sure you're using YOUR chat ID, not someone else's

### Permission Issues
- Make sure your bot can send messages to you
- If you've blocked the bot, unblock it
- Try sending `/start` to your bot

### Environment Variables
- Restart your server after updating `.env`
- Make sure `.env` is in the project root directory
- Check that `dotenv` is properly loading your variables

## 🎯 Success Indicators

✅ **Test passes** if you see:
- "Alert processed and notifications sent!"
- "CHECK YOUR TELEGRAM NOW!" message
- Actual alert message in your Telegram chat

❌ **Test fails** if:
- "TELEGRAM_BOT_TOKEN not configured"
- "Alert not processed yet or notifications not configured"
- No message received in Telegram

## 🔍 Debug Tips

1. **Check server logs** for Telegram API errors
2. **Verify bot token** by visiting: `https://api.telegram.org/botYOUR_TOKEN/getMe`
3. **Test manually** by sending a message to your bot
4. **Check MongoDB** to see if alerts are being created
5. **Monitor the alert processing** in the server logs

## 📞 Additional Help

If you're still having issues:

1. **Check the main server logs** for error messages
2. **Verify all environment variables** are set correctly
3. **Test the bot independently** using the Telegram API
4. **Ensure the HawkEye server** is running and connected to MongoDB

The end-to-end test is designed to verify that the entire HawkEye system is working correctly, from user registration to alert notifications. A successful test means your brand protection system is ready to use! 