#!/bin/bash

# HawkEye Brand Protection Platform Startup Script

echo "🚀 Starting HawkEye Brand Protection Platform..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your configuration before starting the application."
    echo "   Key items to configure:"
    echo "   - API keys for external services (VirusTotal, Shodan, etc.)"
    echo "   - Email configuration for alerts"
    echo "   - Database credentials"
    echo ""
    read -p "Press Enter to continue after configuring .env file..."
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs uploads

# Start the application
echo "🐳 Starting HawkEye with Docker Compose..."
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
echo "🔍 Checking service status..."
if docker-compose ps | grep -q "Up"; then
    echo "✅ HawkEye Brand Protection Platform is running!"
    echo ""
    echo "🌐 Access the application at: http://localhost:3000"
    echo "📊 API documentation available at: http://localhost:3000/api"
    echo ""
    echo "🔑 Default admin credentials:"
    echo "   Email: admin@hawkeye.com"
    echo "   Password: admin123"
    echo ""
    echo "📋 Useful commands:"
    echo "   View logs: docker-compose logs -f"
    echo "   Stop services: docker-compose down"
    echo "   Restart services: docker-compose restart"
    echo "   Update application: docker-compose pull && docker-compose up -d"
else
    echo "❌ Failed to start HawkEye services. Check logs with: docker-compose logs"
    exit 1
fi 