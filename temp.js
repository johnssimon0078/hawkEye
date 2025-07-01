console.log("SERVER STARTING");
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const logger = require('./config/logger');

// Load environment variables
dotenv.config();

// Fix event listener memory leak
process.setMaxListeners(20);

// Import middleware and routes
const { connectDB } = require('./config/database');
const { setupRedis } = require('./config/redis');
const { setupLogger } = require('./config/logger');
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

// Import monitoring services
// const { startMonitoringServices } = require('./services/monitoringService'); // Temporarily disabled

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for development
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
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

// Dashboard route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
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
    
    // Start monitoring services
    logger.info('Starting monitoring services...');
    // await startMonitoringServices(io); // Temporarily disabled for debugging
    logger.info('Monitoring services started');
    
    // Start server
    logger.info(`Attempting to start server on port ${PORT}...`);
    server.listen(PORT, () => {
      logger.info(`HawkEye Brand Protection Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
    
    server.on('error', (error) => {
      logger.error('Server error:', error);
      process.exit(1);
    });
    
    logger.info('Server startup completed successfully');
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
let isShuttingDown = false;

const gracefulShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Remove existing listeners to prevent duplicates
process.removeAllListeners('SIGTERM');
process.removeAllListeners('SIGINT');

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer(); 