#!/bin/bash

# HawkEye End-to-End Test Runner
# This script helps you run the complete workflow test

echo "🚀 HawkEye End-to-End Test Runner"
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one with your configuration."
    echo "📋 Required variables:"
    echo "   - MONGODB_URI"
    echo "   - TELEGRAM_BOT_TOKEN"
    echo "   - TEST_TELEGRAM_CHAT_ID"
    exit 1
fi

# Check if server is running
echo "🔍 Checking if HawkEye server is running..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Server is running on localhost:3000"
else
    echo "❌ Server is not running on localhost:3000"
    echo "💡 Please start the server first:"
    echo "   npm start"
    echo "   or"
    echo "   node src/server.js"
    exit 1
fi

# Check if required environment variables are set
echo "🔍 Checking environment variables..."

# Source the .env file to check variables
set -a
source .env
set +a

if [ -z "$MONGODB_URI" ]; then
    echo "❌ MONGODB_URI not set in .env file"
    exit 1
fi

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "⚠️  TELEGRAM_BOT_TOKEN not set - Telegram notifications will be skipped"
fi

if [ -z "$TEST_TELEGRAM_CHAT_ID" ]; then
    echo "⚠️  TEST_TELEGRAM_CHAT_ID not set - using default value"
fi

echo "✅ Environment variables checked"

# Check if test file exists
if [ ! -f test-end-to-end-workflow.js ]; then
    echo "❌ test-end-to-end-workflow.js not found"
    exit 1
fi

# Show test information
echo ""
echo "📋 Test Information:"
echo "   • Test User: testuser@hawkeye-demo.com"
echo "   • Test Domain: suspicious-example.com"
echo "   • Server URL: http://localhost:3000"
if [ -n "$TEST_TELEGRAM_CHAT_ID" ]; then
    echo "   • Telegram Chat ID: $TEST_TELEGRAM_CHAT_ID"
fi

echo ""
echo "🎯 This test will verify:"
echo "   1. User Registration"
echo "   2. User Login"
echo "   3. User Preferences"
echo "   4. Telegram Configuration"
echo "   5. Domain Addition"
echo "   6. Alert Creation"
echo "   7. Telegram Notification"
echo "   8. Dashboard Access"

echo ""
echo "⏱️  Expected duration: 1-2 minutes"
echo ""

# Ask for confirmation
read -p "🤔 Ready to run the test? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Test cancelled"
    exit 0
fi

echo ""
echo "🏃 Running end-to-end test..."
echo "=================================="

# Run the test
node test-end-to-end-workflow.js

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Test completed successfully!"
    echo ""
    echo "📱 If Telegram is configured, check your chat for the test alert!"
    echo "🌐 You can also check the dashboard at: http://localhost:3000/dashboard"
else
    echo ""
    echo "❌ Test failed. Check the output above for details."
    echo ""
    echo "🔍 Common issues:"
    echo "   • Server not running"
    echo "   • Database connection issues"
    echo "   • Missing environment variables"
    echo "   • Telegram configuration problems"
    echo ""
    echo "📖 See TELEGRAM_SETUP_GUIDE.md for help with Telegram setup"
fi 