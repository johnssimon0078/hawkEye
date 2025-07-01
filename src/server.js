const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const logger = require('./config/logger');

// Load environment variables
dotenv.config();

// Global event listener management - prevent multiple registrations
if (!global._hawkeyeEventListenersInitialized) {
  // Increase max listeners to prevent warnings
  process.setMaxListeners(50);
  
  // Remove any existing listeners to prevent duplicates
  process.removeAllListeners('uncaughtException');
  process.removeAllListeners('unhandledRejection');
  
  // Add global error handlers only once
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
  
  global._hawkeyeEventListenersInitialized = true;
  logger.info('Global event listeners initialized');
}

// Import middleware and routes
const { connectDB } = require('./config/database');
const { setupRedis } = require('./config/redis');
const { rateLimiterMiddleware } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const domainRoutes = require('./routes/domains');
const darkWebRoutes = require('./routes/darkWeb');
const socialMediaRoutes = require('./routes/socialMedia');
const pastebinRoutes = require('./routes/pastebin');
const passwordStoreRoutes = require('./routes/passwordStore');
const alertRoutes = require('./routes/alerts');
const reportRoutes = require('./routes/reports');
const dashboardRoutes = require('./routes/dashboard');
const monitoringRoutes = require('./routes/monitoring');
const telegramRoutes = require('./routes/telegram');

// Import services
const { startMonitoringServices } = require('./services/monitoringService');

// Singleton pattern to prevent multiple server instances
let serverInstance = null;

function createServerInstance() {
  if (serverInstance) {
    logger.warn('Server instance already exists, returning existing instance');
    return serverInstance;
  }

  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.BASE_URL || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  // Middleware
  app.use(helmet({
    contentSecurityPolicy: false // Disable CSP for development
  }));
  app.use(cors({
    origin: process.env.BASE_URL || "http://localhost:3000",
    credentials: true
  }));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  // app.use(rateLimiterMiddleware); // Temporarily disabled due to Redis issues

  // Serve static files
  app.use(express.static(path.join(__dirname, 'public')));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV
    });
  });

  // Helper function to inject API base URL
  const injectApiBase = (filePath) => {
    let html = fs.readFileSync(filePath, 'utf8');
    const apiBase = `'${process.env.BASE_URL || 'http://localhost:3000'}/api'`;
    html = html.replace('window.location.origin + \'/api\'', apiBase);
    return html;
  };

  // Dashboard route with dynamic API base URL injection
  app.get('/', (req, res) => {
    const html = injectApiBase(path.join(__dirname, 'public', 'index.html'));
    res.send(html);
  });

  app.get('/dashboard', (req, res) => {
    const html = injectApiBase(path.join(__dirname, 'public', 'index.html'));
    res.send(html);
  });

  app.get('/register', (req, res) => {
    const html = injectApiBase(path.join(__dirname, 'public', 'register.html'));
    res.send(html);
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/domains', authMiddleware, domainRoutes);
  app.use('/api/dark-web', authMiddleware, darkWebRoutes);
  app.use('/api/social-media', authMiddleware, socialMediaRoutes);
  app.use('/api/pastebin', authMiddleware, pastebinRoutes);
  app.use('/api/password-store', authMiddleware, passwordStoreRoutes);
  app.use('/api/alerts', authMiddleware, alertRoutes);
  app.use('/api/reports', authMiddleware, reportRoutes);
  app.use('/api/dashboard', authMiddleware, dashboardRoutes);
  app.use('/api/monitoring', authMiddleware, monitoringRoutes);
  app.use('/api/telegram', telegramRoutes);

  // Socket.IO for real-time updates
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    socket.on('join-dashboard', (userId) => {
      socket.join(`user-${userId}`);
      logger.info(`User ${userId} joined dashboard`);
    });
    
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  // Make io available to routes
  app.set('io', io);

  // Error handling middleware
  app.use(errorHandler);

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found'
    });
  });

  serverInstance = { app, server, io };
  return serverInstance;
}

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    logger.info('Starting server initialization...');
    
    // Connect to database
    logger.info('Connecting to database...');
    await connectDB();
    logger.info('Connected to MongoDB');
    
    // Setup Redis
    logger.info('Setting up Redis...');
    await setupRedis();
    logger.info('Connected to Redis');
    
    // Create server instance
    const { server, io } = createServerInstance();
    
    // Start monitoring services
    logger.info('Starting monitoring services...');
    await startMonitoringServices(io);
    logger.info('Monitoring services started');
    
    // Start server
    logger.info(`Attempting to start server on port ${PORT}...`);
    
    return new Promise((resolve, reject) => {
      server.listen(PORT, () => {
        logger.info(`HawkEye Brand Protection Server running on port ${PORT}`);
        logger.info(`Environment: ${process.env.NODE_ENV}`);
        resolve();
      });
      
      server.on('error', (error) => {
        logger.error('Server error:', error);
        reject(error);
      });
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    throw error;
  }
}

// Graceful shutdown
let isShuttingDown = false;

const gracefulShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info(`${signal} received, shutting down gracefully`);
  
  if (serverInstance && serverInstance.server) {
    serverInstance.server.close(() => {
      logger.info('Process terminated');
      process.exit(0);
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
if (require.main === module) {
  startServer().catch((error) => {
    logger.error('Server startup failed:', error);
    process.exit(1);
  });
}

module.exports = { startServer, createServerInstance }; 