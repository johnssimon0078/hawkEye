# HawkEye Brand Protection Platform

A comprehensive brand protection and monitoring platform similar to CybelAngel, built with Node.js. This platform provides real-time monitoring of domains, dark web, social media, pastebin, and password stores to protect your brand from various threats.

## 🚀 Features

### Core Monitoring Capabilities
- **Domain Monitoring**: WHOIS, DNS, SSL certificate analysis, threat intelligence integration
- **Dark Web Monitoring**: Automated scanning of dark web marketplaces and forums
- **Social Media Monitoring**: Twitter, LinkedIn, and other social platforms monitoring
- **Pastebin Monitoring**: Real-time scanning of pastebin and similar platforms
- **Password Store Monitoring**: Monitoring of leaked password databases

### Security & Intelligence
- **Threat Intelligence**: Integration with VirusTotal, Shodan, and Censys
- **Risk Assessment**: Automated risk scoring and threat classification
- **Real-time Alerting**: Email, Slack, and Discord notifications
- **Compliance Reporting**: Comprehensive compliance and security reports

### Platform Features
- **Real-time Dashboard**: Live monitoring with Socket.IO
- **User Management**: Multi-user support with role-based access
- **API Integration**: RESTful API for external integrations
- **Scalable Architecture**: Built for enterprise-scale deployments

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (with Mongoose ODM)
- **Cache**: Redis
- **Real-time**: Socket.IO
- **Authentication**: JWT
- **Monitoring**: Winston logging
- **Task Queue**: Bull (Redis-based)
- **Security**: Helmet, CORS, Rate limiting

## 📋 Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 5.0
- Redis >= 6.0
- npm or yarn

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HawkEye
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   - Database connection strings
   - API keys for external services
   - Email configuration
   - Security settings

4. **Database Setup**
   ```bash
   # Start MongoDB (if not running)
   mongod
   
   # Start Redis (if not running)
   redis-server
   ```

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 🔧 Configuration

### Required API Keys

You'll need to obtain API keys from the following services:

- **VirusTotal**: For threat intelligence
- **Shodan**: For internet-wide scanning
- **Censys**: For certificate and domain intelligence
- **Twitter**: For social media monitoring
- **LinkedIn**: For professional network monitoring

### Environment Variables

Key configuration options in `.env`:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/hawkeye_brand_protection
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-super-secret-jwt-key
BCRYPT_ROUNDS=12

# Monitoring Intervals
SCAN_INTERVAL_MINUTES=30
DARK_WEB_SCAN_INTERVAL_HOURS=2
SOCIAL_MEDIA_SCAN_INTERVAL_HOURS=1

# Alert Configuration
ALERT_EMAIL_ENABLED=true
ALERT_SLACK_WEBHOOK_URL=your-slack-webhook
ALERT_DISCORD_WEBHOOK_URL=your-discord-webhook
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/change-password` - Change password

### Domain Monitoring
- `GET /api/domains` - List monitored domains
- `POST /api/domains` - Add new domain
- `GET /api/domains/:id` - Get domain details
- `PUT /api/domains/:id` - Update domain
- `DELETE /api/domains/:id` - Remove domain
- `POST /api/domains/:id/analyze` - Manual analysis

### Alerts
- `GET /api/alerts` - List alerts
- `GET /api/alerts/:id` - Get alert details
- `PUT /api/alerts/:id` - Update alert status
- `DELETE /api/alerts/:id` - Delete alert

### Reports
- `GET /api/reports/security` - Security report
- `GET /api/reports/domains` - Domain monitoring report
- `GET /api/reports/threats` - Threat intelligence report
- `GET /api/reports/compliance` - Compliance report
- `POST /api/reports/export` - Export reports

### Dashboard
- `GET /api/dashboard/overview` - Dashboard overview
- `GET /api/dashboard/statistics` - Key metrics
- `GET /api/dashboard/recent-alerts` - Recent alerts

## 🔍 Monitoring Services

### Domain Monitoring Service
- WHOIS information analysis
- DNS record monitoring
- SSL certificate validation
- Threat intelligence integration
- Content analysis and risk scoring

### Dark Web Monitoring Service
- Automated dark web marketplace scanning
- Forum and chat monitoring
- Credential leak detection
- Brand mention tracking

### Social Media Monitoring Service
- Twitter mention monitoring
- LinkedIn company page monitoring
- Hashtag and keyword tracking
- Sentiment analysis

### Pastebin Monitoring Service
- Real-time pastebin scanning
- Keyword and pattern matching
- Duplicate detection
- Risk assessment

### Password Store Monitoring Service
- Leaked database monitoring
- Credential validation
- Password strength analysis
- Breach notification

## 🚨 Alert System

The platform provides comprehensive alerting capabilities:

- **Email Notifications**: SMTP-based email alerts
- **Slack Integration**: Real-time Slack notifications
- **Discord Integration**: Discord webhook alerts
- **Custom Webhooks**: HTTP webhook support
- **Alert Prioritization**: High, medium, low severity levels
- **Alert Management**: Status tracking and resolution

## 📈 Reporting

### Security Reports
- Comprehensive security overview
- Threat trends and patterns
- Risk assessment metrics
- Incident response statistics

### Compliance Reports
- Regulatory compliance status
- Security posture assessment
- Remediation recommendations
- Audit trail documentation

### Threat Intelligence Reports
- Emerging threat analysis
- Threat source identification
- Risk correlation analysis
- Predictive threat modeling

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API rate limiting protection
- **Input Validation**: Comprehensive input sanitization
- **CORS Protection**: Cross-origin resource sharing controls
- **Helmet Security**: Security headers middleware
- **Password Hashing**: bcrypt password encryption

## 🏗️ Architecture

```
src/
├── config/          # Configuration files
├── middleware/      # Express middleware
├── models/          # MongoDB models
├── routes/          # API routes
├── services/        # Business logic services
└── server.js        # Main application file
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint
```

## 📦 Deployment

### Docker Deployment
```bash
# Build Docker image
docker build -t hawkeye-brand-protection .

# Run with Docker Compose
docker-compose up -d
```

### Production Considerations
- Use environment-specific configurations
- Set up proper logging and monitoring
- Configure SSL/TLS certificates
- Set up database backups
- Implement proper error handling
- Use PM2 or similar process manager

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔮 Roadmap

- [ ] Machine learning threat detection
- [ ] Advanced analytics dashboard
- [ ] Mobile application
- [ ] Third-party integrations
- [ ] Advanced reporting features
- [ ] API rate limiting improvements
- [ ] Enhanced security features

---

**HawkEye Brand Protection** - Protecting your brand in the digital age. 