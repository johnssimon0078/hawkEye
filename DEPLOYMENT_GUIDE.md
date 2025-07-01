# 🚀 HawkEye Deployment Guide

## 📋 Overview
This guide covers deploying HawkEye Brand Protection Platform in different environments with proper configuration management.

## 🌍 Environment Configuration

### Quick Setup with Presets

**For Development:**
```bash
npm run config
# Select option 1: Development (localhost:3000)
```

**For Production:**
```bash
npm run config
# Select option 2: Production (142.93.220.233:3000)
```

**For Custom Environment:**
```bash
npm run config
# Select option 3: Custom configuration
# Enter your specific BASE_URL and settings
```

### Manual Configuration

1. **Copy environment template:**
   ```bash
   cp env.example .env
   ```

2. **Edit .env file with your settings:**
   ```bash
   # Server Configuration
   PORT=3000
   NODE_ENV=production
   BASE_URL=http://142.93.220.233:3000  # Your production URL
   
   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/hawkeye_brand_protection
   REDIS_URL=redis://localhost:6379
   
   # Add your API keys and tokens...
   ```

## 🏗️ Deployment Environments

### Development Environment
- **URL**: `http://localhost:3000`
- **Purpose**: Local development and testing
- **Configuration**: 
  ```bash
  NODE_ENV=development
  BASE_URL=http://localhost:3000
  ```

### Production Environment
- **URL**: `http://142.93.220.233:3000`
- **Purpose**: Live production deployment
- **Configuration**:
  ```bash
  NODE_ENV=production
  BASE_URL=http://142.93.220.233:3000
  ```

## 🔧 Setup Steps

### 1. Environment Configuration
```bash
# Interactive configuration
npm run config

# Or manually edit .env file
nano .env
```

### 2. Telegram Bot Setup
```bash
# Setup Telegram notifications
npm run setup:telegram
```

### 3. Database Setup
```bash
# Ensure MongoDB is running
# Ensure Redis is running
npm run migrate  # If you have migrations
```

### 4. Start the Application
```bash
# Development
npm run dev

# Production
npm start
```

## 🧪 Testing

### End-to-End Testing
```bash
# Test complete workflow (uses BASE_URL from .env)
npm run test:e2e
```

### Production Testing
```bash
# Test production alert processing
npm run test:production
```

## 📊 Environment Variables Reference

### Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `BASE_URL` | Application base URL | `http://142.93.220.233:3000` |
| `NODE_ENV` | Environment type | `production` |
| `PORT` | Server port | `3000` |
| `MONGODB_URI` | MongoDB connection | `mongodb://localhost:27017/hawkeye` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |

### Optional Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | None |
| `VIRUSTOTAL_API_KEY` | VirusTotal API key | None |
| `SMTP_HOST` | Email SMTP host | `smtp.gmail.com` |
| `LOG_LEVEL` | Logging level | `info` |

## 🔄 Environment Switching

### Switch to Development
```bash
npm run config
# Select option 1
```

### Switch to Production
```bash
npm run config
# Select option 2
```

### Verify Current Configuration
```bash
node -e "require('dotenv').config(); console.log('BASE_URL:', process.env.BASE_URL); console.log('NODE_ENV:', process.env.NODE_ENV);"
```

## 🐳 Docker Deployment (Optional)

### Build Docker Image
```bash
docker build -t hawkeye-brand-protection .
```

### Run with Environment Variables
```bash
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e BASE_URL=http://142.93.220.233:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/hawkeye \
  hawkeye-brand-protection
```

## 🔍 Troubleshooting

### Common Issues

1. **Wrong BASE_URL in tests:**
   ```bash
   # Check current configuration
   node configure-environment.js
   # Select correct environment preset
   ```

2. **Environment variables not loading:**
   ```bash
   # Verify .env file exists
   ls -la .env
   
   # Check .env content
   cat .env | grep BASE_URL
   ```

3. **Tests failing with connection errors:**
   ```bash
   # Verify BASE_URL is accessible
   curl $BASE_URL/api/health
   
   # Check server is running
   ps aux | grep node
   ```

## 📝 Deployment Checklist

### Pre-Deployment
- [ ] Configure environment variables
- [ ] Set up Telegram bot (optional)
- [ ] Configure email SMTP (optional)
- [ ] Test database connections
- [ ] Run end-to-end tests

### Deployment
- [ ] Set NODE_ENV=production
- [ ] Set correct BASE_URL
- [ ] Start application
- [ ] Verify health endpoints
- [ ] Test alert processing

### Post-Deployment
- [ ] Monitor logs
- [ ] Test key functionality
- [ ] Verify monitoring services
- [ ] Check alert notifications

## 🚨 Security Notes

- Never commit `.env` files to version control
- Use strong JWT secrets in production
- Enable HTTPS in production environments
- Regularly rotate API keys and tokens
- Monitor for unauthorized access

## 📞 Support

For deployment issues:
1. Check logs: `tail -f logs/hawkeye.log`
2. Verify configuration: `npm run config`
3. Test connectivity: `npm run test:production`
4. Review this guide and troubleshooting section

---

**Happy Deploying! 🚀** 