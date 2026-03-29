// ─── cache.js ────────────────────────────────────────────────
const { redis } = require('../config/redis');

module.exports = function cache(ttlSeconds = 60) {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();

    const key = `cache:${req.originalUrl}:${req.user?.id || 'anon'}`;

    try {
      const cached = await redis.get(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(JSON.parse(cached));
      }

      const originalJson = res.json.bind(res);
      res.json = async (data) => {
        await redis.setex(key, ttlSeconds, JSON.stringify(data));
        res.setHeader('X-Cache', 'MISS');
        originalJson(data);
      };

      next();
    } catch {
      next(); // Redis failure should not break the request
    }
  };
};