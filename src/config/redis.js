const Redis = require('redis');
const logger = require('./logger');

let redisClient = null;

const setupRedis = async () => {
  try {
    redisClient = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis Client Ready');
    });

    redisClient.on('end', () => {
      logger.warn('Redis Client Disconnected');
    });

    await redisClient.connect();
    
  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

// TODO: Fix or replace Redis Lua script for rate limiting. Disabled for now.

module.exports = { setupRedis, getRedisClient }; 