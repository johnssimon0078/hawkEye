const { RateLimiterRedis } = require('rate-limiter-flexible');
const logger = require('../config/logger');

let rateLimiter = null;
let authRateLimiter = null;

const getRateLimiter = () => {
  if (!rateLimiter) {
    const { getRedisClient } = require('../config/redis');
    rateLimiter = new RateLimiterRedis({
      storeClient: getRedisClient(),
      keyPrefix: 'middleware',
      points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
      blockDuration: 60, // 1 minute block
    });
  }
  return rateLimiter;
};

const getAuthRateLimiter = () => {
  if (!authRateLimiter) {
    const { getRedisClient } = require('../config/redis');
    authRateLimiter = new RateLimiterRedis({
      storeClient: getRedisClient(),
      keyPrefix: 'auth',
      points: 5, // 5 attempts
      duration: 300, // 5 minutes
      blockDuration: 300, // 5 minutes block
    });
  }
  return authRateLimiter;
};

const rateLimiterMiddleware = async (req, res, next) => {
  try {
    const limiter = getRateLimiter();
    const key = String(req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown');
    await limiter.consume(key);
    next();
  } catch (rejRes) {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.round(rejRes.msBeforeNext / 1000)
    });
  }
};

const authRateLimiterMiddleware = async (req, res, next) => {
  try {
    const limiter = getAuthRateLimiter();
    const key = String(req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown');
    await limiter.consume(key);
    next();
  } catch (rejRes) {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again later.',
      retryAfter: Math.round(rejRes.msBeforeNext / 1000)
    });
  }
};

module.exports = { rateLimiterMiddleware, authRateLimiterMiddleware }; 