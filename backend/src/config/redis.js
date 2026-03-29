// ─── src/config/redis.js ────────────────────────────────────
const Redis = require('ioredis');
const logger = require('../utils/logger');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryStrategy: (times) => Math.min(times * 100, 3000),
  enableReadyCheck: true,
  maxRetriesPerRequest: 3
};

const redis = new Redis(redisConfig);
const redisSub = new Redis(redisConfig);  // for pub/sub

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error:', err));

async function connectRedis() {
  await redis.ping();
  logger.info('Redis ready');
}

module.exports = { redis, redisSub, connectRedis };
