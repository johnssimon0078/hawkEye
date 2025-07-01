const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

console.log('Environment loaded');

const { connectDB } = require('./src/config/database');
const { setupRedis } = require('./src/config/redis');
const { setupLogger } = require('./src/config/logger');

console.log('Modules imported');

const app = express();
const logger = setupLogger();

console.log('Logger setup complete');

async function startDebugServer() {
  try {
    console.log('Starting debug server...');
    
    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected');
    
    console.log('Setting up Redis...');
    await setupRedis();
    console.log('Redis connected');
    
    console.log('Starting HTTP server...');
    app.listen(3002, () => {
      console.log('Debug server running on port 3002');
    });
    
  } catch (error) {
    console.error('Debug server error:', error);
    process.exit(1);
  }
}

startDebugServer(); 